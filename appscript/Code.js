/**
 * Dynamic Form Generator for Google Sheets
 * Triggers when "APPROVED?" checkbox is checked
 */

// Configuration - Update these based on your sheet structure
const CONFIG = {
  // Column indices (0-based) - update these to match your sheet columns
  EMAIL_COLUMN: 1,        // Column B (index 1) - email to share form with
  TITLE_COLUMN: 7,        // Column H (index 7) - title for form customization
  BODY_COLUMN: 8,         // Column I (index 8) - body for form customization
  APPROVED_COLUMN: 10,     // Column K (index 10) - "APPROVED?" checkbox column
  FORM_EDITOR_URL_COLUMN: 11,    // Column L (index 11) - where to store the generated form URL
  FORM_RESPONSE_URL_COLUMN: 12,
  
  // Form template settings
  FORM_TITLE_TEMPLATE: "Respond to \"{TITLE}\" | Queer Jews",
  FORM_DESCRIPTION_TEMPLATE: "{TITLE}. {BODY}",
  
  // Form fields - customize these as needed
  FORM_FIELDS: [
    {
      type: 'TEXT',
      title: 'Name',
      required: true
    },
    {
      type: 'TEXT',
      title: 'Age',
      required: true
    },
    {
      type: 'TEXT',
      title: 'Gender',
      required: false
    },
    {
      type: 'EMAIL',
      title: 'Email',
      required: true
    },
    {
      type: 'TEXT',
      title: 'Social Media Link',
      description: "This helps the person you\'re writing to verify you\'re real!",
      required: false
    },
    {
      type: 'PARAGRAPH_TEXT',
      title: 'Your response to the personal ad.',
      required: true
    },
    {
      type: 'MULTIPLE_CHOICE',
      title: 'How would you prefer to be contacted?',
      choices: ['Email', 'Social Media'],
      hasOtherOption: true,
      required: true
    }
  ]
};

/**
 * Helper function to extract data from row
 */
function extractRowData(rowData) {
  const data = {
    email: rowData[CONFIG.EMAIL_COLUMN],
    title: rowData[CONFIG.TITLE_COLUMN],
    body: rowData[CONFIG.BODY_COLUMN],
    approved: rowData[CONFIG.APPROVED_COLUMN],
    existingEditUrl: rowData[CONFIG.FORM_EDITOR_URL_COLUMN],
    existingResponseUrl: rowData[CONFIG.FORM_RESPONSE_URL_COLUMN]
  };
  
  console.log('Extracted row data:', {
    email: data.email ? `${data.email.substring(0, 10)}...` : 'MISSING',
    title: data.title ? `"${data.title.substring(0, 30)}..."` : 'MISSING',
    body: data.body ? `${data.body.length} chars` : 'MISSING',
    approved: data.approved,
    hasExistingUrls: !!(data.existingEditUrl || data.existingResponseUrl)
  });
  
  return data;
}

/**
 * Helper function to validate required data
 */
function validateRowData(data) {
  const errors = [];
  
  if (!data.email || typeof data.email !== 'string' || data.email.trim() === '') {
    errors.push('Email is missing or invalid');
  }
  
  if (!data.title || typeof data.title !== 'string' || data.title.trim() === '') {
    errors.push('Title is missing or invalid');
  }
  
  if (data.body && typeof data.body !== 'string') {
    errors.push('Body must be a string');
  }
  
  return errors;
}

/**
 * Main function that triggers on edit
 * Set this as an onEdit trigger in the Apps Script GUI
 */
function onApprovalEdit(e) {
  try {
    console.log('=== Edit event triggered ===');
    
    // Basic event validation
    if (!e || !e.range) {
      console.log('No edit event or range found, exiting');
      return;
    }
    
    const sheet = e.range.getSheet();
    const row = e.range.getRow();
    const column = e.range.getColumn();
    
    console.log(`Edit detected: Sheet="${sheet.getName()}", Row=${row}, Column=${column}`);
    
    // Only process edits on the "Mirror" sheet
    if (sheet.getName() !== 'Mirror') {
      console.log('Edit not on Mirror sheet, exiting');
      return;
    }
    
    // Only process if this is row 2 or higher (assuming row 1 has headers)
    // and if the edit was made to the APPROVED column
    if (row < 2) {
      console.log('Edit in header row, exiting');
      return;
    }
    
    if (column !== (CONFIG.APPROVED_COLUMN + 1)) {
      console.log(`Edit not in APPROVED column (expected: ${CONFIG.APPROVED_COLUMN + 1}, got: ${column}), exiting`);
      return;
    }
    
    // Check if the checkbox was checked (set to TRUE)
    const approvedValue = e.range.getValue();
    console.log(`Approval value: ${approvedValue} (type: ${typeof approvedValue})`);
    
    if (approvedValue !== true) {
      console.log('Approval not set to true, exiting');
      return;
    }
    
    console.log(`Processing approval for row ${row}...`);
    
    // Get data from the row on the Mirror sheet
    let rowData;
    try {
      rowData = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
      console.log(`Retrieved ${rowData.length} columns of data from row ${row}`);
    } catch (error) {
      console.error('Error retrieving row data:', error);
      return;
    }
    
    // Extract and validate data
    const data = extractRowData(rowData);
    const validationErrors = validateRowData(data);
    
    if (validationErrors.length > 0) {
      console.error('Validation errors:', validationErrors);
      throw new Error(`Data validation failed: ${validationErrors.join(', ')}`);
    }
    
    // Check if a form has already been generated for this row
    if (data.existingEditUrl && data.existingEditUrl.trim() !== '') {
      console.log(`Form already exists for row ${row}: ${data.existingEditUrl}`);
      return;
    }
    
    console.log(`Generating form for: "${data.title}"`);
    
    // Generate the form
    const result = generateCustomForm(data);
    
    if (result && result.formEditUrl) {
      try {
        sheet.getRange(row, CONFIG.FORM_EDITOR_URL_COLUMN + 1).setValue(result.formEditUrl);
        sheet.getRange(row, CONFIG.FORM_RESPONSE_URL_COLUMN + 1).setValue(result.formResponseUrl);
        console.log(`✅ Form created successfully and URLs saved to row ${row}`);
      } catch (error) {
        console.error('Error saving URLs to sheet:', error);
        throw error;
      }
      try {
        sendApprovalNotificationEmail(data, result.formEditUrl);
      } catch (error) {
        console.error('Error sending approval email:', error);
        throw error;
      }
    } else {
      throw new Error('Form generation failed - no URLs returned');
    }
    
  } catch (error) {
    console.error('❌ Error in onApprovalEdit:', error);
    
    // Optional: You could send an email notification here
    // GmailApp.sendEmail('admin@example.com', 'Form Generation Error', 
    //   `Error processing row ${e.range.getRow()}: ${error.toString()}`);
  }
}

/**
 * Creates a new Google Form customized with data from the sheet row
 */
function generateCustomForm(data) {
  try {
    console.log('Starting form generation...');
    
    // Create form title and description with personalization
    const formTitle = CONFIG.FORM_TITLE_TEMPLATE.replace('{TITLE}', data.title);
    const formDescription = CONFIG.FORM_DESCRIPTION_TEMPLATE
      .replace('{TITLE}', data.title.toUpperCase())
      .replace('{BODY}', data.body || '');
    
    console.log(`Creating form with title: "${formTitle}"`);
    
    // Create the new form
    let form;
    try {
      form = FormApp.create(formTitle);
      form.setDescription(formDescription);
      console.log(`Form created with ID: ${form.getId()}`);
    } catch (error) {
      console.error('Error creating form:', error);
      throw new Error(`Failed to create form: ${error.message}`);
    }
    
    // Configure form settings
    try {
      form.setCollectEmail(false);
      form.setAllowResponseEdits(true);
      form.setShowLinkToRespondAgain(false);
      console.log('Form settings configured');
    } catch (error) {
      console.error('Error configuring form settings:', error);
      // Non-critical, continue
    }
    
    // Add custom fields to the form
    try {
      addFormFields(form);
      console.log(`Added ${CONFIG.FORM_FIELDS.length} fields to form`);
    } catch (error) {
      console.error('Error adding form fields:', error);
      throw new Error(`Failed to add form fields: ${error.message}`);
    }
    
    // Share the form with the specified email
    try {
      shareFormWithUser(form, data.email);
      console.log(`Form shared with: ${data.email}`);
    } catch (error) {
      console.error('Error sharing form:', error);
      // Non-critical, continue
    }
    
    // Get the form URLs
    let formResponseUrl, formEditUrl;
    try {
      formResponseUrl = form.getPublishedUrl();
      formEditUrl = form.getEditUrl();
      console.log('Form URLs generated successfully');
    } catch (error) {
      console.error('Error getting form URLs:', error);
      throw new Error(`Failed to get form URLs: ${error.message}`);
    }
    
    return {
      formEditUrl, 
      formResponseUrl
    };
    
  } catch (error) {
    console.error('❌ Error generating custom form:', error);
    return null;
  }
}

/**
 * Adds fields to the form based on configuration
 */
function addFormFields(form) {
  let fieldsAdded = 0;
  
  CONFIG.FORM_FIELDS.forEach((field, index) => {
    try {
      let item;
      
      switch (field.type) {
        case 'TEXT':
          item = form.addTextItem();
          break;
          
        case 'EMAIL':
          item = form.addTextItem();
          item.setValidation(FormApp.createTextValidation()
            .setHelpText('Please enter a valid email address.')
            .requireTextIsEmail()
            .build());
          break;
          
        case 'PARAGRAPH_TEXT':
          item = form.addParagraphTextItem();
          break;
          
        case 'MULTIPLE_CHOICE':
          item = form.addMultipleChoiceItem();
          if (field.choices) {
            item.setChoices(field.choices.map(choice => item.createChoice(choice)));
          }
          if (field.hasOtherOption) {
            item.showOtherOption(true);
          }
          break;
          
        case 'CHECKBOX':
          item = form.addCheckboxItem();
          if (field.choices) {
            item.setChoices(field.choices.map(choice => item.createChoice(choice)));
          }
          break;
          
        case 'DATE':
          item = form.addDateItem();
          break;
          
        case 'SCALE':
          item = form.addScaleItem();
          item.setBounds(1, 5); // Default 1-5 scale
          break;
          
        default:
          console.warn(`Unknown field type: ${field.type} at index ${index}`);
          return;
      }
      
      // Set common properties
      if (item) {
        item.setTitle(field?.title || `Field ${index + 1}`);
        
        if (field.required) {
          item.setRequired(true);
        }
        
        if (field.description) {
          item.setHelpText(field.description);
        }
        
        fieldsAdded++;
      }
      
    } catch (error) {
      console.error(`Error adding field ${index} (${field.type}):`, error);
      // Continue with other fields
    }
  });
  
  console.log(`Successfully added ${fieldsAdded}/${CONFIG.FORM_FIELDS.length} fields`);
}

/**
 * Shares the form with a specific user
 */
function shareFormWithUser(form, email) {
  try {
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      throw new Error(`Invalid email address: ${email}`);
    }
    
    // Get the form file from Drive
    const formFile = DriveApp.getFileById(form.getId());
    
    // Share with edit access (change to 'view' if you only want view access)
    formFile.addEditor(email);
    
    console.log(`✅ Form shared with: ${email}`);
    
  } catch (error) {
    console.error(`❌ Error sharing form with ${email}:`, error);
    throw error;
  }
}

/**
 * Sends notification email to the person whose personal was approved
 */
function sendApprovalNotificationEmail(data, formEditUrl) {
  try {
    const subject = "Your personal is going live on queerjews.com!";
    
    const body = `Hi friend,

Your personal is about to be published on queerjews.com! 

You can view responses to your personal here: ${formEditUrl}#responses

It is STRONGLY recommended you turn on "Get email notifications for new responses". Just head to the form, click the "Responses" tab, and then the three vertical dots. This will ensure you don't miss anyone reaching out!

If you have any questions, hit "reply".

Hatzlacha!

-Shir`;

    GmailApp.sendEmail(data.email, subject, body);
    console.log(`✅ Notification email sent to: ${data.email}`);
    
  } catch (error) {
    console.error(`❌ Error sending notification email to ${data.email}:`, error);
    // Non-critical error, don't throw
  }
}

/**
 * Test function to manually test form generation
 * Update the test data to match your sheet structure
 */
function testFormGeneration() {
  try {
    console.log('=== Starting test form generation ===');
    
    // Test data - update these values to match your actual data structure
    const testRowData = [
      new Date().toISOString(), // Timestamp
      'sarah.test@example.com', // What's your email?
      'Sarah Johnson', // What's your full name?
      '28', // How old are you?
      'San Francisco, CA', // Where are you seeking connections?
      'Dating', // What kind of connections are you seeking?
      'Creative professional seeking meaningful connection', // What's the title of your personal?
      'Artist and coffee enthusiast looking for someone who appreciates long walks, deep conversations, and Sunday morning farmers markets. Love to laugh and explore new places together.', // What's the body of your personal?
      'I\'m particularly drawn to people who are passionate about their work and have a good sense of humor. I enjoy hiking, cooking together, and cozy movie nights. Looking for something serious but not rushing into anything.', // Want to share more details with the shadchan?
      true, // APPROVED? (set to true for testing)
      '', // Form Editor URL
      '' // Form Response URL
    ];
    
    const data = extractRowData(testRowData);
    const validationErrors = validateRowData(data);
    
    if (validationErrors.length > 0) {
      throw new Error(`Test data validation failed: ${validationErrors.join(', ')}`);
    }
    
    console.log(`Testing form generation for: "${data.title}"`);
    
    const result = generateCustomForm(data);
    
    if (result && result.formEditUrl) {
      console.log(`✅ Test successful! Form Edit URL: ${result.formEditUrl}`);
      console.log(`✅ Form Response URL: ${result.formResponseUrl}`);
      sendApprovalNotificationEmail(data, result.formEditUrl);
      SpreadsheetApp.getUi().alert('Test Successful', 
        `Form created successfully!\n\nEdit URL: ${result.formEditUrl}\n\nResponse URL: ${result.formResponseUrl}`, 
        SpreadsheetApp.getUi().ButtonSet.OK);
    } else {
      throw new Error('Test failed - no form URLs returned');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    SpreadsheetApp.getUi().alert('Test Failed', 
      `Test failed with error: ${error.message}\n\nCheck the logs for more details.`, 
      SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * Utility function to get column letters for easy reference
 */
function getColumnLetter(columnIndex) {
  let letter = '';
  while (columnIndex >= 0) {
    letter = String.fromCharCode(65 + (columnIndex % 26)) + letter;
    columnIndex = Math.floor(columnIndex / 26) - 1;
  }
  return letter;
}

/**
 * Function to help identify your sheet structure
 * Run this to see your current sheet headers and structure
 */
function analyzeSheetStructure() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Mirror');
    
    if (!sheet) {
      throw new Error('Mirror sheet not found');
    }
    
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    console.log('=== Sheet Structure Analysis ===');
    headers.forEach((header, index) => {
      console.log(`Column ${getColumnLetter(index)} (index ${index}): ${header}`);
    });
    
    const ui = SpreadsheetApp.getUi();
    const headerList = headers.map((header, index) => 
      `Column ${getColumnLetter(index)} (index ${index}): ${header}`
    ).join('\n');
    
    ui.alert('Sheet Structure - Mirror Tab', headerList, ui.ButtonSet.OK);
    
  } catch (error) {
    console.error('Error analyzing sheet structure:', error);
    SpreadsheetApp.getUi().alert('Error', 
      `Failed to analyze sheet structure: ${error.message}`, 
      SpreadsheetApp.getUi().ButtonSet.OK);
  }
}