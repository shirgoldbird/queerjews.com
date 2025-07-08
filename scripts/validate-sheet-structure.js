#!/usr/bin/env node

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import functions from the main sync script
import { validateSpreadsheetStructure, loadCredentials } from '../.github/scripts/sync-content.js';

async function validateSheetStructure() {
  try {
    console.log('🔍 Validating Google Sheets Structure...\n');
    
    // Check for required environment variables
    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
    if (!spreadsheetId) {
      throw new Error('GOOGLE_SPREADSHEET_ID environment variable is required. Please set it in your .env file.');
    }
    
    console.log(`📊 Validating spreadsheet: ${spreadsheetId}\n`);
    
    // Load credentials
    console.log('🔐 Loading Google Sheets credentials...');
    const auth = await loadCredentials();
    console.log('✅ Google authentication successful\n');
    
    // Run validation
    const isValid = await validateSpreadsheetStructure(auth);
    
    if (isValid) {
      console.log('\n🎉 Sheet structure validation passed!');
      console.log('✅ Your Google Sheets is properly configured for the content management system.');
      console.log('\n💡 Next steps:');
      console.log('1. Create a Google Form linked to your spreadsheet');
      console.log('2. Add some test submissions');
      console.log('3. Mark submissions as approved in the "Approved" column');
      console.log('4. Test the sync process');
    } else {
      console.log('\n❌ Sheet structure validation failed!');
      console.log('Please fix the issues above and run the validation again.');
    }
    process.exit(1);

  } catch (error) {
    console.error('❌ Validation failed:', error.message);
    
    if (error.message.includes('GOOGLE_SPREADSHEET_ID')) {
      console.log('\n💡 To fix this:');
      console.log('1. Create a .env file in your project root');
      console.log('2. Add: GOOGLE_SPREADSHEET_ID=your_spreadsheet_id_here');
      console.log('3. Get your spreadsheet ID from the URL: https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit');
    }
    
    process.exit(1);
  }
}

// Run the validation
validateSheetStructure(); 