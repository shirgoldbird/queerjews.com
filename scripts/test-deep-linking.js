#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the personals data
const personalsPath = path.join(__dirname, '../src/data/personals.json');
const personals = JSON.parse(fs.readFileSync(personalsPath, 'utf8'));

console.log('🧪 Testing Deep Linking Functionality\n');

// Test 1: Check if all personals have unique IDs
console.log('1. Checking for unique IDs...');
const ids = personals.map(p => p.id);
const uniqueIds = new Set(ids);
if (ids.length === uniqueIds.size) {
  console.log('✅ All personals have unique IDs');
} else {
  console.log('❌ Duplicate IDs found!');
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  console.log('Duplicate IDs:', duplicates);
}

// Test 2: Check if individual pages can be generated
console.log('\n2. Checking individual page generation...');
const firstPersonal = personals[0];
if (firstPersonal && firstPersonal.id) {
  console.log(`✅ Sample personal found: ${firstPersonal.title || 'Untitled'}`);
  console.log(`   ID: ${firstPersonal.id}`);
  console.log(`   URL: /personal/${firstPersonal.id.replace('personal-', '')}`);
  console.log(`   Deep link URL: /?personal=${firstPersonal.id}`);
} else {
  console.log('❌ No valid personal found for testing');
}

// Test 3: Check data structure
console.log('\n3. Checking data structure...');
const samplePersonal = personals[0];
const requiredFields = ['id', 'personal', 'contact', 'date_posted', 'categories', 'locations'];
const missingFields = requiredFields.filter(field => !samplePersonal[field]);

if (missingFields.length === 0) {
  console.log('✅ All required fields present');
} else {
  console.log('❌ Missing fields:', missingFields);
}

// Test 4: Generate sample deep links
console.log('\n4. Sample deep links for testing:');
personals.slice(0, 3).forEach((personal, index) => {
  console.log(`   ${index + 1}. ${personal.title || 'Untitled'}`);
  console.log(`      Individual page: /personal/${personal.id.replace('personal-', '')}`);
  console.log(`      Deep link: /?personal=${personal.id}`);
});

console.log('\n🎉 Deep linking test completed!');
console.log('\nTo test the functionality:');
console.log('1. Start the development server: npm run dev');
console.log('2. Visit a deep link URL like: http://localhost:4321/?personal=personal-1755990470542-0');
console.log('3. The personal should be highlighted and scrolled into view');
console.log('4. Click the link icon (top right) to go to the individual page');
console.log('5. Use the "Share Link" button to copy the direct URL'); 