#!/usr/bin/env node

import fs from 'fs/promises';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function setupGoogleAPI() {
  console.log('🔧 Google Sheets API Setup Guide\n');
  
  console.log('This script will help you set up Google Sheets API access for your content management system.\n');
  
  const useType = await question('What type of credentials do you want to use?\n1. Service Account (recommended for GitHub Actions/production)\n2. OAuth2 (for local development/testing)\nEnter 1 or 2: ');
  
  if (useType === '1') {
    await setupServiceAccount();
  } else if (useType === '2') {
    await setupOAuth2();
  } else {
    console.log('❌ Invalid choice. Please run the script again.');
    rl.close();
    return;
  }
  
  console.log('\n✅ Setup complete! You can now run the sync scripts.');
  rl.close();
}

async function setupServiceAccount() {
  console.log('\n🔐 Setting up Service Account (Recommended)\n');
  
  console.log('Service accounts are perfect for automated scripts and GitHub Actions.\n');
  
  console.log('📋 Steps to create a Service Account:');
  console.log('1. Go to https://console.cloud.google.com/');
  console.log('2. Create a new project or select an existing one');
  console.log('3. Enable the Google Sheets API');
  console.log('4. Go to "APIs & Services" > "Credentials"');
  console.log('5. Click "Create Credentials" > "Service Account"');
  console.log('6. Fill in the service account details');
  console.log('7. Click "Create and Continue"');
  console.log('8. Skip role assignment (click "Continue")');
  console.log('9. Click "Done"');
  console.log('10. Click on your new service account');
  console.log('11. Go to "Keys" tab');
  console.log('12. Click "Add Key" > "Create new key"');
  console.log('13. Choose "JSON" format');
  console.log('14. Download the JSON file\n');
  
  const hasFile = await question('Do you have the service account JSON file? (y/n): ');
  
  if (hasFile.toLowerCase() === 'y') {
    const filePath = await question('Enter the path to your service account JSON file: ');
    
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const credentials = JSON.parse(content);
      
      if (credentials.type !== 'service_account') {
        throw new Error('This is not a service account credentials file');
      }
      
      await fs.writeFile('google_credentials.json', content);
      console.log('✅ Service account credentials saved to google_credentials.json');
      
      console.log('\n📋 Next steps:');
      console.log('1. Share your Google Sheets with the service account email:');
      console.log(`   ${credentials.client_email}`);
      console.log('2. Give it "Editor" access');
      console.log('3. Set GOOGLE_SPREADSHEET_ID in your .env file');
      console.log('4. Test with: npm run test:real-sync');
      
    } catch (error) {
      console.error('❌ Error reading service account file:', error.message);
    }
  } else {
    console.log('\n📋 Please follow the steps above to create a service account, then run this script again.');
  }
}

async function setupOAuth2() {
  console.log('\n🔐 Setting up OAuth2 (For Local Development)\n');
  
  console.log('OAuth2 is good for local development and testing.\n');
  
  console.log('📋 Steps to create OAuth2 credentials:');
  console.log('1. Go to https://console.cloud.google.com/');
  console.log('2. Create a new project or select an existing one');
  console.log('3. Enable the Google Sheets API');
  console.log('4. Go to "APIs & Services" > "Credentials"');
  console.log('5. Click "Create Credentials" > "OAuth client ID"');
  console.log('6. Choose "Web application"');
  console.log('7. Add authorized redirect URIs:');
  console.log('   - http://localhost:3000');
  console.log('   - http://localhost:8080');
  console.log('8. Click "Create"');
  console.log('9. Download the JSON file\n');
  
  const hasFile = await question('Do you have the OAuth2 JSON file? (y/n): ');
  
  if (hasFile.toLowerCase() === 'y') {
    const filePath = await question('Enter the path to your OAuth2 JSON file: ');
    
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const credentials = JSON.parse(content);
      
      if (!credentials.web && !credentials.installed) {
        throw new Error('This is not a valid OAuth2 credentials file');
      }
      
      await fs.writeFile('google_credentials.json', content);
      console.log('✅ OAuth2 credentials saved to google_credentials.json');
      
      console.log('\n📋 Next steps:');
      console.log('1. Install Google Cloud CLI: https://cloud.google.com/sdk/docs/install');
      console.log('2. Run: gcloud auth application-default login');
      console.log('3. Set GOOGLE_SPREADSHEET_ID in your .env file');
      console.log('4. Test with: npm run test:real-sync');
      
    } catch (error) {
      console.error('❌ Error reading OAuth2 file:', error.message);
    }
  } else {
    console.log('\n📋 Please follow the steps above to create OAuth2 credentials, then run this script again.');
  }
}

// Run the setup
setupGoogleAPI(); 