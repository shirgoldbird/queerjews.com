#!/usr/bin/env node

import { google } from 'googleapis';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;
const CREDENTIALS_FILE = process.env.GOOGLE_CREDENTIALS_FILE || 'google_credentials.json';
const OUTPUT_FILE = path.join(__dirname, '../../src/data/personals.json');

// Support for environment variable credentials
const GOOGLE_SHEETS_CREDENTIALS = process.env.GOOGLE_SHEETS_CREDENTIALS;

// Google Sheets API setup
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];

class ContentSyncError extends Error {
  constructor(message, code = 'UNKNOWN_ERROR') {
    super(message);
    this.name = 'ContentSyncError';
    this.code = code;
  }
}

async function loadCredentials() {
  try {
    let credentials;
    
    // Try environment variables first, then fall back to files
    if (GOOGLE_SHEETS_CREDENTIALS) {
      credentials = JSON.parse(GOOGLE_SHEETS_CREDENTIALS);
    } else {
      credentials = JSON.parse(await fs.readFile(CREDENTIALS_FILE, 'utf8'));
    }
    
    // Check if this is a service account (recommended for automation)
    if (credentials.type === 'service_account') {
      console.log('🔐 Using service account authentication');
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: SCOPES
      });
      return auth.getClient();
    }
    
    // Handle OAuth2 credentials (for development/testing)
    if (credentials.installed || credentials.web) {
      console.log('🔐 Using OAuth2 authentication');
      const credentialType = credentials.installed ? 'installed' : 'web';
      
      // For OAuth2, we'll use application default credentials
      // This works with gcloud auth application-default login
      const auth = new google.auth.GoogleAuth({
        scopes: SCOPES
      });
      
      return auth.getClient();
    }
    
    throw new ContentSyncError(
      'Invalid credentials format. Expected service account or OAuth2 credentials.',
      'INVALID_CREDENTIALS'
    );
    
  } catch (error) {
    throw new ContentSyncError(
      `Failed to load credentials: ${error.message}`,
      'CREDENTIALS_ERROR'
    );
  }
}

async function fetchSheetData(auth, range = 'Mirror!A:O') {
  try {
    const sheets = google.sheets({ version: 'v4', auth });
    
    // Fetch data from the specified range, including calculated values
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range,
      valueRenderOption: 'FORMATTED_VALUE', // Include calculated/formula values
    });
    
    if (!response.data.values || response.data.values.length === 0) {
      throw new ContentSyncError('No data found in spreadsheet', 'NO_DATA');
    }
    
    return response.data.values;
  } catch (error) {
    if (error.code === 429) {
      throw new ContentSyncError('API rate limit exceeded', 'RATE_LIMIT');
    }
    throw new ContentSyncError(
      `Failed to fetch sheet data: ${error.message}`,
      'API_ERROR'
    );
  }
}

async function getSpreadsheetMetadata(auth) {
  try {
    const sheets = google.sheets({ version: 'v4', auth });
    
    const response = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
      ranges: [],
      includeGridData: false
    });
    
    return response.data.properties;
  } catch (error) {
    throw new ContentSyncError(
      `Failed to fetch spreadsheet metadata: ${error.message}`,
      'API_ERROR'
    );
  }
}

async function validateSpreadsheetStructure(auth) {
  try {
    console.log('🔍 Validating spreadsheet structure...');
    
    // Get metadata
    const metadata = await getSpreadsheetMetadata(auth);
    console.log(`📊 Connected to spreadsheet: "${metadata.title}"`);
    
    // Fetch headers
    const headers = await fetchSheetData(auth, 'Mirror!A1:O1');
    const headerRow = headers[0];
    
    console.log('📋 Found headers:', headerRow);
    console.log('');
    
    // Define required and optional columns
    const requiredColumns = [
      { name: 'timestamp', patterns: ['timestamp'] },
      { name: 'title', patterns: ['title'] },
      { name: 'body', patterns: ['body'] },
      { name: 'approved', patterns: ['approved'] }
    ];
    
    const optionalColumns = [
      { name: 'id', patterns: ['id'] },
      { name: 'formResponseUrl', patterns: ['form response url'] },
      { name: 'location', patterns: ['where'] },
      { name: 'category', patterns: ['kind'] }
    ];
    
    // Check required columns
    console.log('✅ Checking required columns:');
    const missingColumns = [];
    
    for (const column of requiredColumns) {
      const found = headerRow.some(header => 
        column.patterns.some(pattern => 
          header.toLowerCase().includes(pattern)
        )
      );
      
      if (found) {
        console.log(`   ✅ ${column.name}`);
      } else {
        console.log(`   ❌ ${column.name} - MISSING`);
        missingColumns.push(column.name);
      }
    }
    
    // Check optional columns
    console.log('\n📝 Checking optional columns:');
    for (const column of optionalColumns) {
      const found = headerRow.some(header => 
        column.patterns.some(pattern => 
          header.toLowerCase().includes(pattern)
        )
      );
      
      if (found) {
        console.log(`   ✅ ${column.name}`);
      } else {
        console.log(`   ⚠️  ${column.name} - Optional, not found`);
      }
    }
    
    // Summary
    console.log('\n📊 Summary:');
    if (missingColumns.length === 0) {
      console.log('✅ All required columns are present!');
      console.log('✅ Sheet structure is valid for the content management system.');
      return true;
    } else {
      console.log('❌ Missing required columns:');
      missingColumns.forEach(col => console.log(`   - ${col}`));
      console.log('\nPlease add the missing columns to your Google Sheets.');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Validation failed:', error.message);
    return false;
  }
}

function parseSheetData(rows) {
  if (rows.length < 2) {
    throw new ContentSyncError('Insufficient data in spreadsheet', 'INSUFFICIENT_DATA');
  }
  
  const headers = rows[0];
  const dataRows = rows.slice(1);
  
  console.log('🔍 Debug: Found headers:', headers);
  console.log('🔍 Debug: Header details:');
  headers.forEach((header, index) => {
    console.log(`   ${index}: "${header}"`);
  });
  
  // Updated column mapping with robust patterns
  const columnMap = {
    timestamp: headers.findIndex(h => h.toLowerCase().includes('timestamp')),
    title: headers.findIndex(h => h.toLowerCase().includes('title')),
    body: headers.findIndex(h => h.toLowerCase().includes('body')),
    approved: headers.findIndex(h => h.toLowerCase().includes('approved')),
    id: headers.findIndex(h => h.toLowerCase() === 'id'),
    formResponseUrl: headers.findIndex(h => h.toLowerCase().includes('form response url')),
    location: headers.findIndex(h => {
      const l = h.toLowerCase();
      return l.includes('location') || l.includes('where are you seeking connections');
    }),
    category: headers.findIndex(h => {
      const l = h.toLowerCase();
      return l.includes('category') || l.includes('what kind of connections are you seeking?');
    })
  };
  
  // console.log('🔍 Debug: Column mapping:', columnMap);
  
  // Validate required columns
  const requiredColumns = ['approved', 'title', 'body'];
  for (const col of requiredColumns) {
    if (columnMap[col] === -1) {
      throw new ContentSyncError(
        `Missing required column: ${col}`,
        'MISSING_COLUMN'
      );
    }
  }
  
  return { headers, dataRows, columnMap };
}

function validatePersonal(row, columnMap, rowIndex) {
  const errors = [];

  // console.log('🔍 Debug: Processing row:', row);
  // console.log('🔍 Debug: Column map:', columnMap);
  
  // Check if approved
  const approved = row[columnMap.approved]?.toString().toLowerCase().trim();
  console.log(`🔍 Debug: Row ${rowIndex} approval status: "${approved}" (column index: ${columnMap.approved})`);
  if (approved !== 'yes' && approved !== 'true' && approved !== '1') {
    console.log(`🔍 Debug: Row ${rowIndex} rejected - not approved`);
    return { valid: false, reason: 'Not approved' };
  }
  console.log(`🔍 Debug: Row ${rowIndex} approved`);
  
  // Validate required fields
  const title = row[columnMap.title]?.toString().trim();
  const body = row[columnMap.body]?.toString().trim();
  
  if (!title) {
    errors.push('Title missing');
  }
  
  if (!body) {
    errors.push('Body missing');
  }
  
  // Validate Form Response URL is present
  const formResponseUrl = row[columnMap.formResponseUrl]?.toString().trim();
  if (!formResponseUrl) {
    errors.push('Form Response URL is required');
  }

  // Extract location and category with debug info
  const location = row[columnMap.location]?.toString().trim();
  const category = row[columnMap.category]?.toString().trim();
  
  console.log('🔍 Debug: Extracted location:', location, '(column index:', columnMap.location, ')');
  console.log('🔍 Debug: Extracted category:', category, '(column index:', columnMap.category, ')');

  return {
    valid: errors.length === 0,
    errors,
    data: {
      title,
      body,
      timestamp: row[columnMap.timestamp]?.toString().trim(),
      id: row[columnMap.id]?.toString().trim(),
      formResponseUrl,
      location,
      category
    }
  };
}

function processPersonals(dataRows, columnMap) {
  const processed = [];
  const errors = [];
  
  dataRows.forEach((row, index) => {
    try {
      const validation = validatePersonal(row, columnMap, index + 2);
      
      if (!validation.valid) {
        if (validation.reason !== 'Not approved') {
          errors.push(`Row ${index + 2}: ${validation.errors.join(', ')}`);
        }
        return;
      }
      
      const data = validation.data;
      
      // Use ID from the "ID" column if present, otherwise auto-generate
      const id = data.id || `personal-${Date.now()}-${index}`;
      
      // Parse date from timestamp
      let datePosted = new Date().toISOString().split('T')[0];
      if (data.timestamp) {
        try {
          const timestamp = new Date(data.timestamp);
          if (!isNaN(timestamp.getTime())) {
            datePosted = timestamp.toISOString().split('T')[0];
          }
        } catch (e) {
          console.warn(`Invalid timestamp in row ${index + 2}: ${data.timestamp}`);
        }
      }
      
      const personal = {
        id,
        title: data.title,
        personal: data.body,
        contact: data.formResponseUrl,
        date_posted: datePosted,
        categories: parseCategories(data.category),
        locations: parseLocations(data.location)
      };
      
      processed.push(personal);
      
    } catch (error) {
      errors.push(`Row ${index + 2}: ${error.message}`);
    }
  });
  
  if (errors.length > 0) {
    console.warn('Validation errors found:', errors);
  }
  
  return processed;
}

function parseCategories(categoryString) {
  if (!categoryString) return [];
  
  // Split by comma, semicolon, or pipe, then trim whitespace
  return categoryString
    .split(/[,;|]/)
    .map(cat => cat.trim())
    .filter(cat => cat.length > 0);
}

function normalizeLocation(location) {
  if (!location) return '';
  
  // Convert to lowercase and trim
  let normalized = location.toLowerCase().trim();
  
  // Common location normalizations
  const locationMap = {
    'nyc': 'New York City',
    'new york city': 'New York City',
    'new york': 'New York City',
    'la': 'Los Angeles',
    'los angeles': 'Los Angeles',
    'sf': 'San Francisco',
    'san francisco': 'San Francisco',
    'dc': 'Washington DC',
    'washington dc': 'Washington DC',
    'washington d.c.': 'Washington DC',
    'chicago': 'Chicago',
    'atlanta': 'Atlanta',
    'boston': 'Boston',
    'seattle': 'Seattle',
    'portland': 'Portland',
    'denver': 'Denver',
    'austin': 'Austin',
    'miami': 'Miami',
    'philadelphia': 'Philadelphia',
    'philly': 'Philadelphia'
  };
  
  // Check if we have a direct match
  if (locationMap[normalized]) {
    return locationMap[normalized];
  }
  
  // Check for partial matches
  for (const [key, value] of Object.entries(locationMap)) {
    if (normalized.includes(key)) {
      return value;
    }
  }
  
  // If no match found, capitalize first letter of each word
  return location
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function parseLocations(locationString) {
  if (!locationString) return [];
  
  // Split by comma and clean up each location
  return locationString
    .split(',')
    .map(loc => normalizeLocation(loc.trim()))
    .filter(loc => loc.length > 0); // Remove empty locations
}

async function loadExistingPersonals() {
  try {
    const content = await fs.readFile(OUTPUT_FILE, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // File doesn't exist yet, return empty array
      return [];
    }
    throw new ContentSyncError(
      `Failed to load existing personals: ${error.message}`,
      'LOAD_ERROR'
    );
  }
}

async function mergePersonals(newPersonals, existingPersonals) {
  console.log('🔍 Debug: New personals IDs:', newPersonals.map(p => p.id));
  console.log('🔍 Debug: Existing personals IDs:', existingPersonals.map(p => p.id));
  
  // Create a map of existing personals by ID for quick lookup
  const existingMap = new Map();
  existingPersonals.forEach(personal => {
    existingMap.set(personal.id, personal);
  });
  
  // Create a map of new personals by ID
  const newMap = new Map();
  newPersonals.forEach(personal => {
    newMap.set(personal.id, personal);
  });
  
  // Find personals to remove (in existing but not in new)
  const toRemove = existingPersonals.filter(personal => !newMap.has(personal.id));
  
  // Find personals to add or update (in new)
  const toAddOrUpdate = newPersonals;
  
  console.log('🔍 Debug: Personals to remove:', toRemove.map(p => p.id));
  console.log('🔍 Debug: Personals to add/update:', toAddOrUpdate.map(p => p.id));
  
  // Log changes
  if (toRemove.length > 0) {
    console.log(`🗑️  Removing ${toRemove.length} un-approved personals:`);
    toRemove.forEach(personal => {
      console.log(`   - ${personal.title} (ID: ${personal.id})`);
    });
  }
  
  if (toAddOrUpdate.length > 0) {
    console.log(`✅ Adding/updating ${toAddOrUpdate.length} approved personals:`);
    toAddOrUpdate.forEach(personal => {
      const action = existingMap.has(personal.id) ? 'updating' : 'adding';
      console.log(`   - ${action}: ${personal.title} (ID: ${personal.id})`);
    });
  }
  
  // Return the merged result (only new/updated personals)
  return toAddOrUpdate;
}

async function savePersonals(personals) {
  try {
    const outputDir = path.dirname(OUTPUT_FILE);
    await fs.mkdir(outputDir, { recursive: true });
    
    const jsonContent = JSON.stringify(personals, null, 2);
    await fs.writeFile(OUTPUT_FILE, jsonContent, 'utf8');
    
    console.log(`✅ Successfully saved ${personals.length} personals to ${OUTPUT_FILE}`);
  } catch (error) {
    throw new ContentSyncError(
      `Failed to save personals: ${error.message}`,
      'SAVE_ERROR'
    );
  }
}

async function main(testMode = false) {
  try {
    if (testMode) {
      console.log('🧪 Testing real sync with Google Sheets...');
      console.log('');
    } else {
      console.log('🚀 Starting content sync from Google Sheets...');
    }
    
    // Validate environment
    if (!SPREADSHEET_ID) {
      throw new ContentSyncError('SPREADSHEET_ID environment variable is required', 'MISSING_CONFIG');
    }
    
    if (testMode) {
      console.log(`📊 Using spreadsheet ID: ${SPREADSHEET_ID}`);
      console.log('');
    }
    
    // Load credentials
    console.log('🔐 Loading Google Sheets credentials...');
    const auth = await loadCredentials();
    console.log('✅ Google authentication successful');
    
    if (testMode) {
      console.log('');
    }
    
    // Validate spreadsheet structure
    if (testMode) {
      console.log('🔍 Testing spreadsheet structure validation...');
    }
    const isValid = await validateSpreadsheetStructure(auth);
    if (!isValid) {
      throw new ContentSyncError('Spreadsheet structure validation failed', 'VALIDATION_ERROR');
    }
    
    if (testMode) {
      console.log('');
    }
    
    // Fetch data
    if (testMode) {
      console.log('📥 Testing data fetching...');
    } else {
      console.log('📥 Fetching data from Google Sheets...');
    }
    const rows = await fetchSheetData(auth);
    console.log(`📊 ${testMode ? 'Successfully fetched' : 'Fetched'} ${rows.length} rows from spreadsheet`);
    
    if (testMode) {
      console.log('');
    }
    
    // Parse and validate data
    if (testMode) {
      console.log('🔍 Testing data parsing...');
    } else {
      console.log('🔍 Parsing and validating data...');
    }
    const { dataRows, columnMap } = parseSheetData(rows);
    
    if (testMode) {
      console.log(`📋 Found ${dataRows.length} data rows`);
      console.log('📋 Column mapping:', columnMap);
      console.log('');
    }
    
    // Process personals
    if (testMode) {
      console.log('⚙️  Testing personal processing...');
    } else {
      console.log('⚙️  Processing personals...');
    }
    const newPersonals = processPersonals(dataRows, columnMap);
    console.log(`✅ ${testMode ? 'Successfully processed' : 'Processed'} ${newPersonals.length} valid personals`);
    
    if (testMode) {
      console.log('');
      
      // Display sample results for test mode
      if (newPersonals.length > 0) {
        console.log('📝 Sample processed personals:');
        newPersonals.slice(0, 3).forEach((personal, index) => {
          console.log(`\n--- Personal ${index + 1} ---`);
          console.log(`ID: ${personal.id}`);
          console.log(`Title: ${personal.title}`);
          console.log(`Contact: ${personal.contact}`);
          console.log(`Locations: ${personal.locations.join(', ')}`);
          console.log(`Categories: ${personal.categories.join(', ')}`);
          console.log(`Date Posted: ${personal.date_posted}`);
        });
      }
      
      console.log('\n🎉 All tests passed! The sync system is working correctly.');
      return;
    }
    
    // Load existing personals and merge (production mode only)
    console.log('🔄 Loading existing personals...');
    const existingPersonals = await loadExistingPersonals();
    console.log(`📊 Found ${existingPersonals.length} existing personals`);
    
    // Merge and handle removals
    console.log('🔄 Merging personals...');
    const finalPersonals = await mergePersonals(newPersonals, existingPersonals);
    
    // Save to file
    console.log('💾 Saving personals to JSON file...');
    await savePersonals(finalPersonals);
    
    console.log('🎉 Content sync completed successfully!');
    
  } catch (error) {
    console.error(`❌ ${testMode ? 'Test' : 'Content sync'} failed: ${error.message}`);
    console.error(`Error code: ${error.code}`);
    process.exit(1);
  }
}

// Export functions for testing
export { 
  parseSheetData, 
  processPersonals, 
  validatePersonal, 
  normalizeLocation, 
  parseCategories,
  parseLocations,
  validateSpreadsheetStructure,
  fetchSheetData,
  loadCredentials
};

// Only run the script if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const testMode = process.argv.includes('--test');
  main(testMode);
}
