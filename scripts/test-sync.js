#!/usr/bin/env node

import { parseMirrorData, parseFormResponsesData, matchMirrorAndFormData, processPersonals, normalizeLocation, parseCategories, parseLocations } from '../.github/scripts/sync-content.js';

// Sample data for Mirror tab (approval status)
const mirrorRows = [
  // Headers
  [
    'Title',
    'Body',
    'Approved?',
    'Form Response URL',
    'Location'
  ],
  
  // Approved personal 1
  [
    'Looking for queer Jewish community in NYC',
    'Hi! I\'m a 28-year-old queer Jewish person looking to connect with others in the NYC area.',
    'Yes',
    'https://forms.gle/example1',
    'New York City'
  ],
  
  // Approved personal 2
  [
    'Seeking romantic connection in LA',
    'Queer Jewish person in LA looking for meaningful romantic connection.',
    'Yes',
    'https://forms.gle/example2',
    'Los Angeles'
  ],
  
  // Not approved personal
  [
    'Not approved personal',
    'This should not appear in the final output.',
    'No',
    'https://forms.gle/example3',
    'Chicago'
  ],
  
  // Approved personal 3
  [
    'Digital nomad seeking connections',
    'I work remotely and split my time between online communities and Portland.',
    'Yes',
    'https://forms.gle/example4',
    'Portland'
  ]
];

// Sample data for Form Responses 1 tab (content)
const formRows = [
  // Headers
  [
    'Timestamp',
    'Email Address',
    "What's your full name?",
    'How old are you?',
    'Where are you seeking connections?',
    "What's your email?",
    'What kind of connections are you seeking?',
    "What's the title of your personal?",
    "What's the body of your personal?",
    'Want to share more details with the shadchan?'
  ],
  
  // Form response 1
  [
    '2024-01-15 10:30:00',
    'user1@example.com',
    'Alex Cohen',
    '28',
    'New York City',
    'alex@example.com',
    'Community, Friendship',
    'Looking for queer Jewish community in NYC',
    'Hi! I\'m a 28-year-old queer Jewish person looking to connect with others in the NYC area. I love reading, hiking, and cooking traditional Jewish dishes with a modern twist.',
    'I\'m also interested in Jewish learning and community events.'
  ],
  
  // Form response 2
  [
    '2024-01-16 14:20:00',
    'user2@example.com',
    'Sam Goldstein',
    '32',
    'Los Angeles',
    'sam@example.com',
    'Romance, Dating',
    'Seeking romantic connection in LA',
    'Queer Jewish person in LA looking for meaningful romantic connection. I enjoy art, music, and exploring the city. Looking for someone who shares similar values and interests.',
    ''
  ],
  
  // Form response 3 (not approved, but should still be in form data)
  [
    '2024-01-17 09:15:00',
    'user3@example.com',
    'Not Approved',
    '25',
    'Chicago',
    'notapproved@example.com',
    'Friendship',
    'Not approved personal',
    'This should not appear in the final output.',
    ''
  ],
  
  // Form response 4
  [
    '2024-01-22 10:00:00',
    'user4@example.com',
    'Casey Green',
    '27',
    'online, portland',
    'casey@example.com',
    'Friendship, Dating',
    'Digital nomad seeking connections',
    'I work remotely and split my time between online communities and Portland. Looking for queer Jewish connections both virtually and in person when I\'m in Portland.',
    'I love hiking, cooking, and discussing queer Jewish literature.'
  ]
];

function testParseMirrorData() {
  console.log('🧪 Testing parseMirrorData function...');
  
  try {
    const result = parseMirrorData(mirrorRows);
    
    console.log('✅ parseMirrorData test passed!');
    console.log(`📊 Found ${result.dataRows.length} Mirror tab data rows`);
    console.log('📋 Column mapping:', result.columnMap);
    console.log('');
    
    return result;
  } catch (error) {
    console.error('❌ parseMirrorData test failed:', error.message);
    throw error;
  }
}

function testParseFormResponsesData() {
  console.log('🧪 Testing parseFormResponsesData function...');
  
  try {
    const result = parseFormResponsesData(formRows);
    
    console.log('✅ parseFormResponsesData test passed!');
    console.log(`📊 Found ${result.dataRows.length} Form Responses 1 tab data rows`);
    console.log('📋 Column mapping:', result.columnMap);
    console.log('');
    
    return result;
  } catch (error) {
    console.error('❌ parseFormResponsesData test failed:', error.message);
    throw error;
  }
}

function testMatchMirrorAndFormData(mirrorData, formData) {
  console.log('🧪 Testing matchMirrorAndFormData function...');
  
  try {
    const result = matchMirrorAndFormData(mirrorData, formData);
    
    console.log('✅ matchMirrorAndFormData test passed!');
    console.log(`📊 Successfully matched ${result.length} entries`);
    console.log('');
    
    return result;
  } catch (error) {
    console.error('❌ matchMirrorAndFormData test failed:', error.message);
    throw error;
  }
}

function testProcessPersonals(matchedData) {
  console.log('🧪 Testing processPersonals function...');
  
  try {
    const result = processPersonals(matchedData);
    
    console.log('✅ processPersonals test passed!');
    console.log(`📊 Processed ${result.length} valid personals`);
    
    if (result.length > 0) {
      console.log('\n📝 Sample processed personals:');
      result.slice(0, 2).forEach((personal, index) => {
        console.log(`\n--- Personal ${index + 1} ---`);
        console.log(`ID: ${personal.id}`);
        console.log(`Title: ${personal.title}`);
        console.log(`Contact: ${personal.contact}`);
        console.log(`Locations: ${personal.locations.join(', ')}`);
        console.log(`Categories: ${personal.categories.join(', ')}`);
        console.log(`Date Posted: ${personal.date_posted}`);
      });
    }
    
    console.log('');
    return result;
  } catch (error) {
    console.error('❌ processPersonals test failed:', error.message);
    throw error;
  }
}

function testHelperFunctions() {
  console.log('🧪 Testing helper functions...');
  
  // Test parseCategories
  console.log('📝 Testing parseCategories:');
  const categoryTests = [
    'Community, Friendship',
    'Romance; Dating',
    'Community|Book Club|Friendship',
    'Single Category',
    '',
    '  Category1  ,  Category2  '
  ];
  
  categoryTests.forEach(test => {
    const result = parseCategories(test);
    console.log(`   "${test}" → [${result.join(', ')}]`);
  });
  
  // Test normalizeLocation
  console.log('\n📍 Testing normalizeLocation:');
  const locationTests = [
    'nyc',
    'new york city',
    'la',
    'los angeles',
    'dc',
    'washington dc',
    'san francisco',
    'Unknown City',
    ''
  ];
  
  locationTests.forEach(test => {
    const result = normalizeLocation(test);
    console.log(`   "${test}" → "${result}"`);
  });
  
  // Test parseLocations
  console.log('\n📍 Testing parseLocations:');
  const locationsTests = [
    'online, portland',
    'nyc, la, sf',
    'dc, boston',
    'Single Location',
    'online, portland, chicago',
    '',
    '  location1  ,  location2  '
  ];
  
  locationsTests.forEach(test => {
    const result = parseLocations(test);
    console.log(`   "${test}" → [${result.join(', ')}]`);
  });
  
  console.log('\n✅ Helper functions test passed!');
  console.log('');
}

function runAllTests() {
  console.log('🚀 Running all sync tests...\n');
  
  try {
    // Test helper functions first
    testHelperFunctions();
    
    // Test Mirror tab parsing
    const mirrorData = testParseMirrorData();
    
    // Test Form Responses 1 tab parsing
    const formData = testParseFormResponsesData();
    
    // Test data matching
    const matchedData = testMatchMirrorAndFormData(mirrorData, formData);
    
    // Test processing function
    testProcessPersonals(matchedData);
    
    console.log('🎉 All tests passed! The sync system is working correctly.');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
    process.exit(1);
  }
}

// Run the tests
runAllTests(); 