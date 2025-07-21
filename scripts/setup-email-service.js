#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function setupEmailService() {
  console.log('📧 Email Service Setup Guide\n');
  
  console.log('This script will help you set up email subscriptions for your queerjews.com site.\n');
  
  console.log('=== Step 1: Choose an Email Service ===');
  console.log('We recommend using Resend (free tier: 3,000 emails/month)');
  console.log('Alternative options:');
  console.log('- Mailgun (5,000 emails/month free)');
  console.log('- SendGrid (100 emails/day free)');
  console.log('- Brevo (300 emails/day free)\n');
  
  console.log('=== Step 2: Set up Resend ===');
  console.log('1. Go to https://resend.com');
  console.log('2. Sign up for a free account');
  console.log('3. Add and verify your domain (or use their sandbox domain)');
  console.log('4. Get your API key from the dashboard');
  console.log('5. Create a contact list:');
  console.log('   - Go to "Audiences" in the dashboard');
  console.log('   - Click "Create Audience"');
  console.log('   - Name it "Queer Jews Subscribers"');
  console.log('   - Copy the Audience ID');
  console.log('6. Add both the API key and Audience ID to your environment variables\n');
  
  console.log('=== Step 3: Export Your Data ===');
  console.log('Resend allows you to export your audience as CSV:');
  console.log('1. Go to "Audiences" in your Resend dashboard');
  console.log('2. Click on your "Queer Jews Subscribers" audience');
  console.log('3. Click "Export" to download as CSV');
  console.log('4. This gives you a backup of all subscribers\n');
  
  console.log('=== Step 4: Environment Variables ===');
  console.log('Add these to your .env file:');
  console.log('RESEND_API_KEY=your_resend_api_key_here');
  console.log('RESEND_CONTACT_LIST_ID=your_audience_id_here');
  console.log('FROM_EMAIL=noreply@yourdomain.com');
  console.log('');
  console.log('For GitHub Actions, add these secrets:');
  console.log('- RESEND_API_KEY');
  console.log('- RESEND_CONTACT_LIST_ID');
  console.log('- FROM_EMAIL\n');
  
  console.log('=== Step 5: Test the Setup ===');
  console.log('1. Run: npm run send-digest weekly');
  console.log('2. Check your email for the test digest');
  console.log('3. Verify the subscription form works on your site\n');
  
  console.log('=== Step 6: Automation ===');
  console.log('The GitHub Action will automatically send:');
  console.log('- Weekly digests every Sunday at 10 AM UTC');
  console.log('- Monthly digests on the 1st of each month at 10 AM UTC');
  console.log('You can also trigger manual digests from the GitHub Actions tab.\n');
  
  console.log('=== Cost Breakdown ===');
  console.log('✅ Resend: Free up to 3,000 emails/month');
  console.log('✅ GitHub Actions: Free for public repos');
  console.log('✅ Total cost: $0/month\n');
  
  console.log('=== Next Steps ===');
  console.log('1. Set up your email service');
  console.log('2. Add environment variables');
  console.log('3. Test the system');
  console.log('4. Deploy and enjoy! 🎉\n');
}

// Check if .env file exists and show current configuration
async function checkCurrentSetup() {
  try {
    const envPath = path.join(__dirname, '../.env');
    const envContent = await fs.readFile(envPath, 'utf8');
    
    console.log('=== Current Environment Configuration ===');
    const hasResendKey = envContent.includes('RESEND_API_KEY=');
    const hasFromEmail = envContent.includes('FROM_EMAIL=');
    
    console.log(`Resend API Key: ${hasResendKey ? '✅ Configured' : '❌ Missing'}`);
    console.log(`From Email: ${hasFromEmail ? '✅ Configured' : '❌ Missing'}`);
    console.log('');
    
  } catch (error) {
    console.log('❌ No .env file found. Please create one with your configuration.\n');
  }
}

async function main() {
  await checkCurrentSetup();
  await setupEmailService();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
} 