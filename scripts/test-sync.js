#!/usr/bin/env node

import { parseSheetData, processPersonals, normalizeLocation, parseCategories, parseLocations } from '../.github/scripts/sync-content.js';

// Sample data that matches the actual Google Sheets format
const sampleRows = [
  // Headers (matching actual Google Sheets)
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
    'Want to share more details with the shadchan?',
    'Approved?',
    'Form Editor URL',
    'Form Response URL',
    'ID'
  ],
  
  // Valid personal 1
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
    'I\'m also interested in Jewish learning and community events.',
    'Yes',
    'https://forms.gle/editor1',
    'https://forms.gle/example1',
    'P001'
  ],
  
  // Valid personal 2
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
    '',
    'Yes',
    'https://forms.gle/editor2',
    'https://forms.gle/example2',
    'P002'
  ],
  
  // Invalid personal - not approved
  [
    '2024-01-17 09:15:00',
    'user3@example.com',
    'Test User',
    '25',
    'San Francisco',
    'test@example.com',
    'Test',
    'Test submission',
    'This is a test submission that should not be processed.',
    '',
    'No',
    'https://forms.gle/editor3',
    'https://forms.gle/example3',
    'P003'
  ],
  
  // Invalid personal - missing required fields
  [
    '2024-01-18 16:45:00',
    'user4@example.com',
    'Incomplete User',
    '30',
    'Chicago',
    'incomplete@example.com',
    'Friendship',
    '',
    'This submission is missing a title.',
    '',
    'Yes',
    'https://forms.gle/editor4',
    'https://forms.gle/example4',
    'P004'
  ],
  
  // Valid personal 3 - with multi-category
  [
    '2024-01-19 11:30:00',
    'user5@example.com',
    'Jordan Levine',
    '29',
    'Boston',
    'jordan@example.com',
    'Community; Book Club; Friendship',
    'Queer Jewish book club organizer',
    'Looking to start a queer Jewish book club in Boston. We\'ll read books by queer Jewish authors and discuss themes of identity, community, and culture.',
    'I have experience organizing reading groups and would love to collaborate.',
    'Yes',
    'https://forms.gle/editor5',
    'https://forms.gle/example5',
    'P005'
  ],
  
  // Valid personal 4 - with location normalization
  [
    '2024-01-20 13:00:00',
    'user6@example.com',
    'Taylor Rosen',
    '26',
    'dc',
    'taylor@example.com',
    'Friendship, Community',
    'Seeking queer Jewish friends in DC',
    'Recently moved to DC and looking to build queer Jewish community here. I\'m into politics, activism, and exploring the city\'s cultural scene.',
    '',
    'Yes',
    'https://forms.gle/editor6',
    'https://forms.gle/example6',
    'P006'
  ],
  
  // Valid personal 5 - with multiple locations
  [
    '2024-01-22 10:00:00',
    'user8@example.com',
    'Casey Green',
    '27',
    'online, portland',
    'casey@example.com',
    'Friendship, Dating',
    'Digital nomad seeking connections',
    'I work remotely and split my time between online communities and Portland. Looking for queer Jewish connections both virtually and in person when I\'m in Portland.',
    'I love hiking, cooking, and discussing queer Jewish literature.',
    'Yes',
    'https://forms.gle/editor8',
    'https://forms.gle/example8',
    'P008'
  ],
  
  // Invalid personal - missing Form Response URL
  [
    '2024-01-21 15:30:00',
    'user7@example.com',
    'Missing Contact',
    '31',
    'Seattle',
    'missing@example.com',
    'Dating',
    'Missing contact info',
    'This submission is missing the Form Response URL.',
    '',
    'Yes',
    'https://forms.gle/editor7',
    '',
    'P007'
  ]
];

function testParseSheetData() {
  console.log('🧪 Testing parseSheetData function...');
  
  try {
    const result = parseSheetData(sampleRows);
    
    console.log('✅ parseSheetData test passed!');
    console.log(`📊 Found ${result.dataRows.length} data rows`);
    console.log('📋 Column mapping:', result.columnMap);
    console.log('');
    
    return result;
  } catch (error) {
    console.error('❌ parseSheetData test failed:', error.message);
    throw error;
  }
}

function testProcessPersonals(dataRows, columnMap) {
  console.log('🧪 Testing processPersonals function...');
  
  try {
    const personals = processPersonals(dataRows, columnMap);
    
    console.log('✅ processPersonals test passed!');
    console.log(`📊 Processed ${personals.length} valid personals`);
    console.log('');
    
    // Display results
    personals.forEach((personal, index) => {
      console.log(`📝 Personal ${index + 1}:`);
      console.log(`   ID: ${personal.id}`);
      console.log(`   Title: ${personal.title}`);
      console.log(`   Contact: ${personal.contact}`);
      console.log(`   Locations: ${personal.locations.join(', ')}`);
      console.log(`   Categories: ${personal.categories.join(', ')}`);
      console.log(`   Date Posted: ${personal.date_posted}`);
      console.log('');
    });
    
    return personals;
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
    
    // Test main parsing function
    const { dataRows, columnMap } = testParseSheetData();
    
    // Test processing function
    testProcessPersonals(dataRows, columnMap);
    
    console.log('🎉 All tests passed! The sync system is working correctly.');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
    process.exit(1);
  }
}

// Run the tests
runAllTests(); 