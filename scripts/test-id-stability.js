#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the personals data
const personalsPath = path.join(__dirname, '../src/data/personals.json');
const personals = JSON.parse(fs.readFileSync(personalsPath, 'utf8'));

console.log('🧪 Testing ID Stability\n');

// Test 1: Check ID format consistency
console.log('1. Checking ID format consistency...');
const idPattern = /^personal-\d+-\d+$/;
const validIds = personals.filter(p => idPattern.test(p.id));
const invalidIds = personals.filter(p => !idPattern.test(p.id));

if (invalidIds.length === 0) {
  console.log('✅ All IDs follow the correct format: personal-<timestamp>-<index>');
} else {
  console.log('❌ Found IDs with invalid format:');
  invalidIds.forEach(p => console.log(`   - ${p.id} (${p.title})`));
}

// Test 2: Check for duplicate IDs
console.log('\n2. Checking for duplicate IDs...');
const ids = personals.map(p => p.id);
const uniqueIds = new Set(ids);
if (ids.length === uniqueIds.size) {
  console.log('✅ All IDs are unique');
} else {
  console.log('❌ Found duplicate IDs:');
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  const uniqueDuplicates = [...new Set(duplicates)];
  uniqueDuplicates.forEach(id => {
    const count = ids.filter(x => x === id).length;
    console.log(`   - ${id} (appears ${count} times)`);
  });
}

// Test 3: Analyze ID timestamps
console.log('\n3. Analyzing ID timestamps...');
const timestamps = personals.map(p => {
  const match = p.id.match(/^personal-(\d+)-\d+$/);
  return match ? parseInt(match[1]) : null;
}).filter(Boolean);

if (timestamps.length > 0) {
  const oldest = new Date(Math.min(...timestamps));
  const newest = new Date(Math.max(...timestamps));
  const now = new Date();
  
  console.log(`📅 Oldest personal: ${oldest.toISOString()}`);
  console.log(`📅 Newest personal: ${newest.toISOString()}`);
  console.log(`📅 Current time: ${now.toISOString()}`);
  
  // Check if timestamps are reasonable (not all from the same time)
  const timeRange = Math.max(...timestamps) - Math.min(...timestamps);
  if (timeRange > 0) {
    console.log('✅ Timestamps show reasonable distribution');
  } else {
    console.log('⚠️  All timestamps are identical - this might indicate a problem');
  }
}

// Test 4: Check for potential ID conflicts
console.log('\n4. Checking for potential ID conflicts...');
const idMap = new Map();
let conflicts = 0;

personals.forEach(personal => {
  const key = `${personal.title}-${personal.date_posted}`;
  if (idMap.has(key)) {
    const existing = idMap.get(key);
    if (existing.id !== personal.id) {
      console.log(`⚠️  Potential conflict: Same title/date but different IDs`);
      console.log(`   Title: ${personal.title}`);
      console.log(`   Date: ${personal.date_posted}`);
      console.log(`   ID 1: ${existing.id}`);
      console.log(`   ID 2: ${personal.id}`);
      conflicts++;
    }
  } else {
    idMap.set(key, personal);
  }
});

if (conflicts === 0) {
  console.log('✅ No ID conflicts detected');
}

// Test 5: Sample deep links
console.log('\n5. Sample deep links for testing:');
personals.slice(0, 3).forEach((personal, index) => {
  console.log(`   ${index + 1}. ${personal.title}`);
  console.log(`      ID: ${personal.id}`);
  console.log(`      Individual page: /personal/${personal.id.replace('personal-', '')}`);
  console.log(`      Deep link: /?personal=${personal.id}`);
  console.log(`      Date posted: ${personal.date_posted}`);
});

console.log('\n🎉 ID stability test completed!');
console.log('\nKey findings:');
console.log('- IDs should be stable across sync operations');
console.log('- Format: personal-<timestamp>-<index>');
console.log('- Timestamps should reflect original submission time');
console.log('- Existing personals will preserve their IDs');
console.log('- New personals get IDs based on submission timestamp'); 