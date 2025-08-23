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

async function fetchMirrorData(auth) {
  return await fetchSheetData(auth, 'Mirror!A:O');
}

async function fetchFormResponsesData(auth) {
  return await fetchSheetData(auth, 'Form Responses 1!A:Z');
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
    
    // Validate Mirror tab structure
    console.log('\n📋 Validating Mirror tab (for approval status)...');
    const mirrorHeaders = await fetchSheetData(auth, 'Mirror!A1:O1');
    const mirrorHeaderRow = mirrorHeaders[0];
    
    console.log('📋 Mirror tab headers:', mirrorHeaderRow);
    
    // Define required columns for Mirror tab
    const mirrorRequiredColumns = [
      { name: 'approved', patterns: ['approved'] },
      { name: 'formResponseUrl', patterns: ['form response url'] }
    ];
    
    const mirrorOptionalColumns = [
      { name: 'title', patterns: ['title'] },
      { name: 'location', patterns: ['where', 'location'] }
    ];
    
    // Check Mirror tab required columns
    console.log('✅ Checking Mirror tab required columns:');
    const mirrorMissingColumns = [];
    
    for (const column of mirrorRequiredColumns) {
      const found = mirrorHeaderRow.some(header => 
        column.patterns.some(pattern => 
          header.toLowerCase().includes(pattern)
        )
      );
      
      if (found) {
        console.log(`   ✅ ${column.name}`);
      } else {
        console.log(`   ❌ ${column.name} - MISSING`);
        mirrorMissingColumns.push(column.name);
      }
    }
    
    // Check Mirror tab optional columns
    console.log('\n📝 Checking Mirror tab optional columns:');
    for (const column of mirrorOptionalColumns) {
      const found = mirrorHeaderRow.some(header => 
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
    
    // Validate Form Responses 1 tab structure
    console.log('\n📋 Validating Form Responses 1 tab (for content)...');
    const formHeaders = await fetchSheetData(auth, 'Form Responses 1!A1:Z1');
    const formHeaderRow = formHeaders[0];
    
    console.log('📋 Form Responses 1 tab headers:', formHeaderRow);
    
    // Define required columns for Form Responses 1 tab
    const formRequiredColumns = [
      { name: 'timestamp', patterns: ['timestamp'] },
      { name: 'title', patterns: ['title'] },
      { name: 'body', patterns: ['body', 'description', 'content'] }
    ];
    
    const formOptionalColumns = [
      { name: 'location', patterns: ['where', 'location'] },
      { name: 'category', patterns: ['kind', 'category', 'type'] }
    ];
    
    // Check Form Responses 1 tab required columns
    console.log('✅ Checking Form Responses 1 tab required columns:');
    const formMissingColumns = [];
    
    for (const column of formRequiredColumns) {
      const found = formHeaderRow.some(header => 
        column.patterns.some(pattern => 
          header.toLowerCase().includes(pattern)
        )
      );
      
      if (found) {
        console.log(`   ✅ ${column.name}`);
      } else {
        console.log(`   ❌ ${column.name} - MISSING`);
        formMissingColumns.push(column.name);
      }
    }
    
    // Check Form Responses 1 tab optional columns
    console.log('\n📝 Checking Form Responses 1 tab optional columns:');
    for (const column of formOptionalColumns) {
      const found = formHeaderRow.some(header => 
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
    const allMissingColumns = [...mirrorMissingColumns, ...formMissingColumns];
    
    if (allMissingColumns.length === 0) {
      console.log('✅ All required columns are present in both tabs!');
      console.log('✅ Sheet structure is valid for the content management system.');
      return true;
    } else {
      console.log('❌ Missing required columns:');
      if (mirrorMissingColumns.length > 0) {
        console.log('   Mirror tab:');
        mirrorMissingColumns.forEach(col => console.log(`     - ${col}`));
      }
      if (formMissingColumns.length > 0) {
        console.log('   Form Responses 1 tab:');
        formMissingColumns.forEach(col => console.log(`     - ${col}`));
      }
      console.log('\nPlease add the missing columns to your Google Sheets.');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Validation failed:', error.message);
    return false;
  }
}

function parseMirrorData(rows) {
  if (rows.length < 2) {
    throw new ContentSyncError('Insufficient data in Mirror tab', 'INSUFFICIENT_DATA');
  }
  
  const headers = rows[0];
  const dataRows = rows.slice(1);
  
  console.log('🔍 Debug: Mirror tab headers:', headers);
  
  // Column mapping for Mirror tab
  const columnMap = {
    approved: headers.findIndex(h => h.toLowerCase().includes('approved')),
    formResponseUrl: headers.findIndex(h => h.toLowerCase().includes('form response url')),
    title: headers.findIndex(h => h.toLowerCase().includes('title')),
    location: headers.findIndex(h => {
      const l = h.toLowerCase();
      return l.includes('location') || l.includes('where');
    })
  };
  
  // Validate required columns for Mirror tab
  const requiredColumns = ['approved', 'formResponseUrl'];
  for (const col of requiredColumns) {
    if (columnMap[col] === -1) {
      throw new ContentSyncError(
        `Missing required column in Mirror tab: ${col}`,
        'MISSING_COLUMN'
      );
    }
  }
  
  return { headers, dataRows, columnMap };
}

function parseFormResponsesData(rows) {
  if (rows.length < 2) {
    throw new ContentSyncError('Insufficient data in Form Responses 1 tab', 'INSUFFICIENT_DATA');
  }
  
  const headers = rows[0];
  const dataRows = rows.slice(1);
  
  console.log('🔍 Debug: Form Responses 1 tab headers:', headers);
  
  // Column mapping for Form Responses 1 tab
  const columnMap = {
    timestamp: headers.findIndex(h => h.toLowerCase().includes('timestamp')),
    title: headers.findIndex(h => h.toLowerCase().includes('title')),
    body: headers.findIndex(h => {
      const l = h.toLowerCase();
      return l.includes('body') || l.includes('description') || l.includes('content');
    }),
    location: headers.findIndex(h => {
      const l = h.toLowerCase();
      return l.includes('location') || l.includes('where');
    }),
    category: headers.findIndex(h => {
      const l = h.toLowerCase();
      return l.includes('category') || l.includes('kind') || l.includes('type');
    })
  };
  
  // Validate required columns for Form Responses 1 tab
  const requiredColumns = ['timestamp', 'title', 'body'];
  for (const col of requiredColumns) {
    if (columnMap[col] === -1) {
      throw new ContentSyncError(
        `Missing required column in Form Responses 1 tab: ${col}`,
        'MISSING_COLUMN'
      );
    }
  }
  
  return { headers, dataRows, columnMap };
}

function matchMirrorAndFormData(mirrorData, formData) {
  console.log('🔍 Matching Mirror and Form Responses data...');
  
  const { dataRows: mirrorRows, columnMap: mirrorMap } = mirrorData;
  const { dataRows: formRows, columnMap: formMap } = formData;
  
  // Create a map of form responses by Form Response URL
  // We need to find the Form Response URL column in the form data
  const formResponseUrlColumn = formRows[0]?.findIndex(h => 
    h.toLowerCase().includes('form response url') || 
    h.toLowerCase().includes('response url') ||
    h.toLowerCase().includes('edit response')
  );
  
  if (formResponseUrlColumn === -1) {
    console.log('⚠️  Could not find Form Response URL column in Form Responses 1 tab');
    console.log('📋 Available columns:', formRows[0]);
    throw new ContentSyncError('Form Response URL column not found in Form Responses 1 tab', 'MISSING_COLUMN');
  }
  
  console.log(`📋 Found Form Response URL column at index ${formResponseUrlColumn}: "${formRows[0][formResponseUrlColumn]}"`);
  
  const formMapByUrl = new Map();
  formRows.slice(1).forEach((row, index) => {
    const formResponseUrl = row[formResponseUrlColumn]?.toString().trim();
    if (formResponseUrl) {
      formMapByUrl.set(formResponseUrl, { row, index: index + 2 }); // +2 for 1-based indexing and header row
    }
  });
  
  console.log(`📊 Found ${formMapByUrl.size} form responses to match`);
  
  const matchedData = [];
  const unmatchedMirror = [];
  
  mirrorRows.forEach((mirrorRow, mirrorIndex) => {
    const mirrorFormResponseUrl = mirrorRow[mirrorMap.formResponseUrl]?.toString().trim();
    const isApproved = mirrorRow[mirrorMap.approved]?.toString().toLowerCase().trim();
    
    console.log(`🔍 Debug: Mirror row ${mirrorIndex + 2} - Form URL: "${mirrorFormResponseUrl}", Approved: "${isApproved}"`);
    
    if (!mirrorFormResponseUrl) {
      console.log(`⚠️  Mirror row ${mirrorIndex + 2} has no Form Response URL`);
      unmatchedMirror.push({ row: mirrorRow, index: mirrorIndex + 2, reason: 'No Form Response URL' });
      return;
    }
    
    const formMatch = formMapByUrl.get(mirrorFormResponseUrl);
    if (!formMatch) {
      console.log(`⚠️  No form response found for Mirror row ${mirrorIndex + 2} with URL: ${mirrorFormResponseUrl}`);
      unmatchedMirror.push({ row: mirrorRow, index: mirrorIndex + 2, reason: 'No matching form response' });
      return;
    }
    
    // Check if approved
    if (isApproved !== 'yes' && isApproved !== 'true' && isApproved !== '1') {
      console.log(`🔍 Debug: Mirror row ${mirrorIndex + 2} not approved (${isApproved})`);
      return; // Skip unapproved entries
    }
    
    console.log(`✅ Matched Mirror row ${mirrorIndex + 2} with Form row ${formMatch.index}`);
    
    // Combine the data
    const combinedData = {
      mirrorRow,
      formRow: formMatch.row,
      mirrorIndex: mirrorIndex + 2,
      formIndex: formMatch.index,
      mirrorMap,
      formMap
    };
    
    matchedData.push(combinedData);
  });
  
  console.log(`📊 Successfully matched ${matchedData.length} approved entries`);
  if (unmatchedMirror.length > 0) {
    console.log(`⚠️  ${unmatchedMirror.length} mirror entries could not be matched:`);
    unmatchedMirror.forEach(item => {
      console.log(`   - Row ${item.index}: ${item.reason}`);
    });
  }
  
  return matchedData;
}

function validatePersonal(combinedData) {
  const errors = [];
  const { mirrorRow, formRow, mirrorIndex, formIndex, mirrorMap, formMap } = combinedData;

  // Approval status is already checked in matchMirrorAndFormData, but double-check
  const approved = mirrorRow[mirrorMap.approved]?.toString().toLowerCase().trim();
  if (approved !== 'yes' && approved !== 'true' && approved !== '1') {
    return { valid: false, reason: 'Not approved' };
  }
  
  // Validate required fields from form data
  const title = formRow[formMap.title]?.toString().trim();
  const body = formRow[formMap.body]?.toString().trim();
  
  if (!title) {
    errors.push('Title missing from form data');
  }
  
  if (!body) {
    errors.push('Body missing from form data');
  }
  
  // Validate Form Response URL is present in mirror data
  const formResponseUrl = mirrorRow[mirrorMap.formResponseUrl]?.toString().trim();
  if (!formResponseUrl) {
    errors.push('Form Response URL is required');
  }

  // Extract location and category from form data
  const location = formRow[formMap.location]?.toString().trim();
  const category = formRow[formMap.category]?.toString().trim();
  
  console.log(`🔍 Debug: Form row ${formIndex} - Title: "${title}", Location: "${location}", Category: "${category}"`);

  return {
    valid: errors.length === 0,
    errors,
    data: {
      title,
      body,
      timestamp: formRow[formMap.timestamp]?.toString().trim(),
      formResponseUrl,
      location,
      category
    }
  };
}

function processPersonals(matchedData) {
  const processed = [];
  const errors = [];
  
  matchedData.forEach((combinedData, index) => {
    try {
      const validation = validatePersonal(combinedData);
      
      if (!validation.valid) {
        if (validation.reason !== 'Not approved') {
          errors.push(`Mirror row ${combinedData.mirrorIndex}/Form row ${combinedData.formIndex}: ${validation.errors.join(', ')}`);
        }
        return;
      }
      
      const data = validation.data;
      
      // Generate ID based on timestamp and index
      const id = `personal-${Date.now()}-${index}`;
      
      // Parse date from timestamp
      let datePosted = new Date().toISOString().split('T')[0];
      if (data.timestamp) {
        try {
          const timestamp = new Date(data.timestamp);
          if (!isNaN(timestamp.getTime())) {
            datePosted = timestamp.toISOString().split('T')[0];
          }
        } catch (e) {
          console.warn(`Invalid timestamp in form row ${combinedData.formIndex}: ${data.timestamp}`);
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
      errors.push(`Mirror row ${combinedData.mirrorIndex}/Form row ${combinedData.formIndex}: ${error.message}`);
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
    
    // Fetch data from both tabs
    if (testMode) {
      console.log('📥 Testing data fetching from both tabs...');
    } else {
      console.log('📥 Fetching data from Google Sheets...');
    }
    
    // Fetch Mirror tab data (for approval status)
    const mirrorRows = await fetchMirrorData(auth);
    console.log(`📊 ${testMode ? 'Successfully fetched' : 'Fetched'} ${mirrorRows.length} rows from Mirror tab`);
    
    // Fetch Form Responses 1 tab data (for content)
    const formRows = await fetchFormResponsesData(auth);
    console.log(`📊 ${testMode ? 'Successfully fetched' : 'Fetched'} ${formRows.length} rows from Form Responses 1 tab`);
    
    if (testMode) {
      console.log('');
    }
    
    // Parse data from both tabs
    if (testMode) {
      console.log('🔍 Testing data parsing...');
    } else {
      console.log('🔍 Parsing data from both tabs...');
    }
    
    const mirrorData = parseMirrorData(mirrorRows);
    const formData = parseFormResponsesData(formRows);
    
    if (testMode) {
      console.log(`📋 Found ${mirrorData.dataRows.length} Mirror tab data rows`);
      console.log(`📋 Found ${formData.dataRows.length} Form Responses 1 tab data rows`);
      console.log('');
    }
    
    // Match data between tabs
    if (testMode) {
      console.log('🔍 Testing data matching...');
    } else {
      console.log('🔍 Matching data between tabs...');
    }
    const matchedData = matchMirrorAndFormData(mirrorData, formData);
    
    if (testMode) {
      console.log(`📊 Successfully matched ${matchedData.length} entries`);
      console.log('');
    }
    
    // Process personals
    if (testMode) {
      console.log('⚙️  Testing personal processing...');
    } else {
      console.log('⚙️  Processing personals...');
    }
    const newPersonals = processPersonals(matchedData);
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
  parseMirrorData,
  parseFormResponsesData,
  matchMirrorAndFormData,
  processPersonals, 
  validatePersonal, 
  normalizeLocation, 
  parseCategories,
  parseLocations,
  validateSpreadsheetStructure,
  fetchSheetData,
  fetchMirrorData,
  fetchFormResponsesData,
  loadCredentials
};

// Only run the script if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const testMode = process.argv.includes('--test');
  main(testMode);
}
