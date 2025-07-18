#!/usr/bin/env node

import dotenv from 'dotenv';
dotenv.config();

import { parseSheetData, processPersonals, validatePersonal, normalizeLocation, parseCategories, parseLocations } from '../.github/scripts/sync-content.js';
import { loadCredentials, fetchSheetData } from '../.github/scripts/sync-content.js';
import fs from 'fs/promises';
import path from 'path';

const OUTPUT_FILE = './src/data/personals.json';

class ContentSyncError extends Error {
  constructor(message, code = 'UNKNOWN_ERROR') {
    super(message);
    this.name = 'ContentSyncError';
    this.code = code;
  }
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

function processSpecificRow(row, columnMap, rowIndex) {
  console.log(`🔍 Processing row ${rowIndex} (spreadsheet row ${rowIndex + 1})...`);
  
  try {
    // Extract data from the specific row
    const data = {
      title: row[columnMap.title]?.toString().trim(),
      body: row[columnMap.body]?.toString().trim(),
      timestamp: row[columnMap.timestamp]?.toString().trim(),
      id: row[columnMap.id]?.toString().trim(),
      formResponseUrl: row[columnMap.formResponseUrl]?.toString().trim(),
      location: row[columnMap.location]?.toString().trim(),
      category: row[columnMap.category]?.toString().trim()
    };
    
    console.log('📋 Extracted data:');
    console.log(`   Title: ${data.title || 'MISSING'}`);
    console.log(`   Body: ${data.body ? `${data.body.length} chars` : 'MISSING'}`);
    console.log(`   Contact: ${data.formResponseUrl || 'MISSING'}`);
    console.log(`   Location: ${data.location || 'MISSING'}`);
    console.log(`   Category: ${data.category || 'MISSING'}`);
    console.log(`   ID: ${data.id || 'AUTO-GENERATE'}`);
    console.log(`   Timestamp: ${data.timestamp || 'CURRENT DATE'}`);
    
    // Validate required fields
    const errors = [];
    if (!data.title) errors.push('Title missing');
    if (!data.body) errors.push('Body missing');
    if (!data.formResponseUrl) errors.push('Form Response URL is required');
    
    if (errors.length > 0) {
      console.log('❌ Validation errors:');
      errors.forEach(error => console.log(`   - ${error}`));
      return null;
    }
    
    // Use ID from the "ID" column if present, otherwise auto-generate
    const id = data.id || `test-row-${rowIndex}-${Date.now()}`;
    
    // Parse date from timestamp
    let datePosted = new Date().toISOString().split('T')[0];
    if (data.timestamp) {
      try {
        const timestamp = new Date(data.timestamp);
        if (!isNaN(timestamp.getTime())) {
          datePosted = timestamp.toISOString().split('T')[0];
        }
      } catch (e) {
        console.warn(`⚠️  Invalid timestamp: ${data.timestamp}, using current date`);
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
    
    console.log('✅ Successfully processed personal:');
    console.log(`   ID: ${personal.id}`);
    console.log(`   Title: ${personal.title}`);
    console.log(`   Contact: ${personal.contact}`);
    console.log(`   Locations: ${personal.locations.join(', ')}`);
    console.log(`   Categories: ${personal.categories.join(', ')}`);
    console.log(`   Date Posted: ${personal.date_posted}`);
    
    return personal;
    
  } catch (error) {
    console.error(`❌ Error processing row ${rowIndex}:`, error.message);
    return null;
  }
}

async function main() {
  try {
    const rowArg = process.argv[2];
    
    if (!rowArg || !rowArg.startsWith('row:')) {
      console.error('❌ Usage: npm run test-specific-row row:N');
      console.error('   Where N is the spreadsheet row number (1-based)');
      console.error('   Example: npm run test-specific-row row:6');
      process.exit(1);
    }
    
    const rowNumber = parseInt(rowArg.replace('row:', ''));
    
    if (isNaN(rowNumber) || rowNumber < 1) {
      console.error('❌ Invalid row number. Please provide a positive integer.');
      process.exit(1);
    }
    
    console.log(`🧪 Testing sync for specific row ${rowNumber} from Google Sheets...`);
    console.log('');
    
    // Validate environment
    const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;
    if (!SPREADSHEET_ID) {
      throw new ContentSyncError('GOOGLE_SPREADSHEET_ID environment variable is required', 'MISSING_CONFIG');
    }
    
    console.log(`📊 Using spreadsheet ID: ${SPREADSHEET_ID}`);
    console.log('');
    
    // Load credentials
    console.log('🔐 Loading Google Sheets credentials...');
    const auth = await loadCredentials();
    console.log('✅ Google authentication successful');
    console.log('');
    
    // Fetch data
    console.log('📥 Fetching data from Google Sheets...');
    const rows = await fetchSheetData(auth);
    console.log(`📊 Fetched ${rows.length} rows from spreadsheet`);
    console.log('');
    
    // Check if row exists
    if (rowNumber > rows.length) {
      console.error(`❌ Row ${rowNumber} does not exist. Spreadsheet only has ${rows.length} rows.`);
      process.exit(1);
    }
    
    // Parse sheet data
    console.log('🔍 Parsing spreadsheet structure...');
    const { dataRows, columnMap } = parseSheetData(rows);
    console.log(`📋 Found ${dataRows.length} data rows`);
    console.log('📋 Column mapping:', columnMap);
    console.log('');
    
    // Calculate the actual row index in dataRows (accounting for header row)
    const dataRowIndex = rowNumber - 2; // -2 because: -1 for 0-based indexing, -1 for header row
    
    if (dataRowIndex < 0 || dataRowIndex >= dataRows.length) {
      console.error(`❌ Row ${rowNumber} is not a valid data row.`);
      console.error(`   Valid data rows are from 2 to ${dataRows.length + 1}`);
      process.exit(1);
    }
    
    // Process the specific row
    const personal = processSpecificRow(dataRows[dataRowIndex], columnMap, dataRowIndex);
    
    if (!personal) {
      console.error('❌ Failed to process the specified row.');
      process.exit(1);
    }
    
    console.log('');
    
    // Load existing personals
    console.log('📂 Loading existing personals...');
    const existingPersonals = await loadExistingPersonals();
    console.log(`📊 Found ${existingPersonals.length} existing personals`);
    
    // Check if personal with same ID already exists
    const existingIndex = existingPersonals.findIndex(p => p.id === personal.id);
    
    if (existingIndex !== -1) {
      console.log(`⚠️  Personal with ID "${personal.id}" already exists. Replacing it.`);
      existingPersonals[existingIndex] = personal;
    } else {
      console.log('➕ Adding new personal to existing data...');
      existingPersonals.push(personal);
    }
    
    // Save to file
    console.log('💾 Saving personals to JSON file...');
    await savePersonals(existingPersonals);
    
    console.log('');
    console.log('🎉 Successfully processed and saved the personal!');
    console.log(`📝 The personal is now available at: ${OUTPUT_FILE}`);
    console.log('');
    console.log('💡 You can view it on the website or check the JSON file directly.');
    
  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
    console.error(`Error code: ${error.code}`);
    process.exit(1);
  }
}

// Run the script
main(); 