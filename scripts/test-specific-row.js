#!/usr/bin/env node

import dotenv from 'dotenv';
dotenv.config();

import { parseMirrorData, parseFormResponsesData, matchMirrorAndFormData, processPersonals, validatePersonal, normalizeLocation, parseCategories, parseLocations } from '../.github/scripts/sync-content.js';
import { loadCredentials, fetchMirrorData, fetchFormResponsesData } from '../.github/scripts/sync-content.js';
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

function processSpecificRow(mirrorRow, formRow, mirrorMap, formMap, mirrorIndex, formIndex) {
  try {
    console.log(`🔍 Processing Mirror row ${mirrorIndex} and Form row ${formIndex}...`);
    
    // Create combined data structure
    const combinedData = {
      mirrorRow,
      formRow,
      mirrorIndex,
      formIndex,
      mirrorMap,
      formMap
    };
    
    // Validate the personal
    const validation = validatePersonal(combinedData);
    
    if (!validation.valid) {
      console.log(`❌ Validation failed: ${validation.errors.join(', ')}`);
      return null;
    }
    
    const data = validation.data;
    
    // Generate ID
    const id = `personal-${Date.now()}-${mirrorIndex}`;
    
    // Parse date from timestamp
    let datePosted = new Date().toISOString().split('T')[0];
    if (data.timestamp) {
      try {
        const timestamp = new Date(data.timestamp);
        if (!isNaN(timestamp.getTime())) {
          datePosted = timestamp.toISOString().split('T')[0];
        }
      } catch (e) {
        console.warn(`Invalid timestamp in form row ${formIndex}: ${data.timestamp}`);
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
    console.error(`❌ Error processing Mirror row ${mirrorIndex}/Form row ${formIndex}:`, error.message);
    return null;
  }
}

async function main() {
  try {
    const rowArg = process.argv[2];
    
    if (!rowArg || !rowArg.startsWith('row:')) {
      console.error('❌ Usage: npm run test-specific-row row:N');
      console.error('   Where N is the Mirror tab row number (1-based)');
      console.error('   Example: npm run test-specific-row row:6');
      process.exit(1);
    }
    
    const rowNumber = parseInt(rowArg.replace('row:', ''));
    
    if (isNaN(rowNumber) || rowNumber < 1) {
      console.error('❌ Invalid row number. Please provide a positive integer.');
      process.exit(1);
    }
    
    console.log(`🧪 Testing sync for specific Mirror tab row ${rowNumber} from Google Sheets...`);
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
    
    // Fetch data from both tabs
    console.log('📥 Fetching data from both tabs...');
    const mirrorRows = await fetchMirrorData(auth);
    const formRows = await fetchFormResponsesData(auth);
    console.log(`📊 Fetched ${mirrorRows.length} rows from Mirror tab`);
    console.log(`📊 Fetched ${formRows.length} rows from Form Responses 1 tab`);
    console.log('');
    
    // Check if row exists in Mirror tab
    if (rowNumber > mirrorRows.length) {
      console.error(`❌ Row ${rowNumber} does not exist in Mirror tab. Tab only has ${mirrorRows.length} rows.`);
      process.exit(1);
    }
    
    // Parse both tabs
    console.log('🔍 Parsing spreadsheet structure...');
    const mirrorData = parseMirrorData(mirrorRows);
    const formData = parseFormResponsesData(formRows);
    console.log(`📋 Found ${mirrorData.dataRows.length} Mirror tab data rows`);
    console.log(`📋 Found ${formData.dataRows.length} Form Responses 1 tab data rows`);
    console.log('');
    
    // Calculate the actual row index in dataRows (accounting for header row)
    const mirrorRowIndex = rowNumber - 2; // -2 for 1-based indexing and header row
    
    if (mirrorRowIndex < 0 || mirrorRowIndex >= mirrorData.dataRows.length) {
      console.error(`❌ Row ${rowNumber} is out of range for data rows.`);
      process.exit(1);
    }
    
    const mirrorRow = mirrorData.dataRows[mirrorRowIndex];
    const mirrorTitle = mirrorRow[mirrorData.columnMap.title]?.toString().trim();
    const isApproved = mirrorRow[mirrorData.columnMap.approved]?.toString().toLowerCase().trim();
    
    console.log(`📋 Mirror row ${rowNumber} details:`);
    console.log(`   Title: "${mirrorTitle}"`);
    console.log(`   Approved: "${isApproved}"`);
    console.log('');
    
    // Check if approved
    if (isApproved !== 'yes' && isApproved !== 'true' && isApproved !== '1') {
      console.log('❌ This row is not approved, so it will not be processed.');
      process.exit(0);
    }
    
    // Find matching form response by title
    const titleKey = mirrorTitle.toLowerCase();
    let matchingFormRow = null;
    let matchingFormIndex = -1;
    
    for (let i = 0; i < formData.dataRows.length; i++) {
      const formRow = formData.dataRows[i];
      const formTitle = formRow[formData.columnMap.title]?.toString().trim();
      if (formTitle && formTitle.toLowerCase() === titleKey) {
        matchingFormRow = formRow;
        matchingFormIndex = i + 2; // +2 for 1-based indexing and header row
        break;
      }
    }
    
    if (!matchingFormRow) {
      console.error(`❌ No matching form response found for title: "${mirrorTitle}"`);
      console.log('Available form response titles:');
      formData.dataRows.forEach((row, index) => {
        const title = row[formData.columnMap.title]?.toString().trim();
        if (title) {
          console.log(`   ${index + 2}: "${title}"`);
        }
      });
      process.exit(1);
    }
    
    console.log(`✅ Found matching form response at row ${matchingFormIndex}`);
    console.log('');
    
    // Process the specific row
    const personal = processSpecificRow(
      mirrorRow,
      matchingFormRow,
      mirrorData.columnMap,
      formData.columnMap,
      rowNumber,
      matchingFormIndex
    );
    
    if (!personal) {
      console.log('❌ Failed to process the personal.');
      process.exit(1);
    }
    
    // Load existing personals and add the new one
    console.log('🔄 Loading existing personals...');
    const existingPersonals = await loadExistingPersonals();
    console.log(`📊 Found ${existingPersonals.length} existing personals`);
    
    // Check if this personal already exists (by title)
    const existingIndex = existingPersonals.findIndex(p => p.title === personal.title);
    if (existingIndex !== -1) {
      console.log('⚠️  Personal with this title already exists. Updating...');
      existingPersonals[existingIndex] = personal;
    } else {
      console.log('✅ Adding new personal...');
      existingPersonals.push(personal);
    }
    
    // Save to file
    console.log('💾 Saving personals to JSON file...');
    const outputDir = path.dirname(OUTPUT_FILE);
    await fs.mkdir(outputDir, { recursive: true });
    
    const jsonContent = JSON.stringify(existingPersonals, null, 2);
    await fs.writeFile(OUTPUT_FILE, jsonContent, 'utf8');
    
    console.log(`✅ Successfully saved ${existingPersonals.length} personals to ${OUTPUT_FILE}`);
    console.log('🎉 Specific row test completed successfully!');
    
  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
    console.error(`Error code: ${error.code}`);
    process.exit(1);
  }
}

// Run the script
main(); 