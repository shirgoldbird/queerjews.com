/**
 * Dynamic Form Generator for Google Sheets
 * Triggers when "APPROVED?" checkbox is checked
 */

// Configuration - Update these based on your sheet structure
const CONFIG = {
  // Column header mappings for Mirror tab (case-insensitive fuzzy matching)
  MIRROR_COLUMN_MAPPINGS: {
    TITLE: ["title", "title of your personal"],
    BODY: ["body", "body of your personal"],
    APPROVED: ["approved"],
    FORM_EDITOR_URL: ["form editor url", "editor url"],
    FORM_RESPONSE_URL: ["form response url", "response url"],
  },

  // Column header mappings for Form Responses 1 tab (case-insensitive fuzzy matching)
  FORM_COLUMN_MAPPINGS: {
    EMAIL: ["email", "email address"],
    TITLE: ["title", "title of your personal"],
    BODY: ["body", "body of your personal"],
    TIMESTAMP: ["timestamp"],
  },

  // Form template settings
  FORM_TITLE_TEMPLATE: 'Respond to "{TITLE}" | Queer Jews',
  FORM_DESCRIPTION_TEMPLATE: "{TITLE}. {BODY}",

  // Form fields - customize these as needed
  FORM_FIELDS: [
    {
      type: "TEXT",
      title: "Name",
      required: true,
    },
    {
      type: "TEXT",
      title: "Age",
      required: true,
    },
    {
      type: "TEXT",
      title: "Gender",
      required: false,
    },
    {
      type: "EMAIL",
      title: "Email",
      required: true,
    },
    {
      type: "TEXT",
      title: "Social Media Link",
      description:
        "This helps the person you're writing to verify you're real!",
      required: false,
    },
    {
      type: "PARAGRAPH_TEXT",
      title: "Your response to the personal ad.",
      required: true,
    },
    {
      type: "MULTIPLE_CHOICE",
      title: "How would you prefer to be contacted?",
      choices: ["Email", "Social Media"],
      hasOtherOption: true,
      required: true,
    },
  ],
};

// Cache for column indices to avoid repeated header parsing
let MIRROR_COLUMN_INDICES = null;
let FORM_COLUMN_INDICES = null;

/**
 * Helper function to find column indices based on header names
 */
function getColumnIndices(sheet, mappings) {
  try {
    const headers = sheet
      .getRange(1, 1, 1, sheet.getLastColumn())
      .getValues()[0];
    const indices = {};

    console.log("=== Parsing column headers ===");

    // Helper function for fuzzy matching
    const fuzzyMatch = (header, searchTerms) => {
      const headerLower = header.toLowerCase().trim();
      return searchTerms.some(
        (term) =>
          headerLower.includes(term.toLowerCase()) ||
          term.toLowerCase().includes(headerLower)
      );
    };

    // Find each required column
    Object.keys(mappings).forEach((key) => {
      const searchTerms = mappings[key];
      const foundIndex = headers.findIndex((header) =>
        fuzzyMatch(header, searchTerms)
      );

      if (foundIndex !== -1) {
        indices[key] = foundIndex;
        console.log(
          `✅ Found ${key}: Column ${getColumnLetter(
            foundIndex
          )} (index ${foundIndex}) - "${headers[foundIndex]}"`
        );
      } else {
        console.warn(
          `❌ Could not find column for ${key}. Searched for: ${searchTerms.join(
            ", "
          )}`
        );
      }
    });

    return indices;
  } catch (error) {
    console.error("Error parsing column headers:", error);
    throw error;
  }
}

/**
 * Helper function to get Mirror tab column indices
 */
function getMirrorColumnIndices() {
  if (MIRROR_COLUMN_INDICES !== null) {
    return MIRROR_COLUMN_INDICES;
  }

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Mirror");
  if (!sheet) {
    throw new Error("Mirror sheet not found");
  }

  const indices = getColumnIndices(sheet, CONFIG.MIRROR_COLUMN_MAPPINGS);

  // Validate that we found all required columns for Mirror tab
  const requiredColumns = ["TITLE", "APPROVED", "FORM_EDITOR_URL", "FORM_RESPONSE_URL"];
  const missingColumns = requiredColumns.filter(
    (col) => indices[col] === undefined
  );

  if (missingColumns.length > 0) {
    throw new Error(`Missing required columns in Mirror tab: ${missingColumns.join(", ")}`);
  }

  MIRROR_COLUMN_INDICES = indices;
  return indices;
}

/**
 * Helper function to get Form Responses 1 tab column indices
 */
function getFormColumnIndices() {
  if (FORM_COLUMN_INDICES !== null) {
    return FORM_COLUMN_INDICES;
  }

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Form Responses 1");
  if (!sheet) {
    throw new Error("Form Responses 1 sheet not found");
  }

  const indices = getColumnIndices(sheet, CONFIG.FORM_COLUMN_MAPPINGS);

  // Validate that we found all required columns for Form Responses 1 tab
  const requiredColumns = ["EMAIL", "TITLE", "TIMESTAMP"];
  const missingColumns = requiredColumns.filter(
    (col) => indices[col] === undefined
  );

  if (missingColumns.length > 0) {
    throw new Error(`Missing required columns in Form Responses 1 tab: ${missingColumns.join(", ")}`);
  }

  FORM_COLUMN_INDICES = indices;
  return indices;
}

/**
 * Helper function to find matching form response by title
 */
function findMatchingFormResponse(title) {
  try {
    const formSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Form Responses 1");
    if (!formSheet) {
      throw new Error("Form Responses 1 sheet not found");
    }

    const formIndices = getFormColumnIndices();
    const formHeaders = formSheet.getRange(1, 1, 1, formSheet.getLastColumn()).getValues()[0];
    const formData = formSheet.getRange(2, 1, formSheet.getLastRow() - 1, formSheet.getLastColumn()).getValues();

    console.log(`Looking for form response with title: "${title}"`);

    // Find the matching form response by title
    for (let i = 0; i < formData.length; i++) {
      const row = formData[i];
      const formTitle = row[formIndices.TITLE];
      
      if (formTitle && formTitle.toString().trim().toLowerCase() === title.toString().trim().toLowerCase()) {
        console.log(`✅ Found matching form response at row ${i + 2}`);
        
        return {
          email: row[formIndices.EMAIL],
          title: row[formIndices.TITLE],
          body: row[formIndices.BODY] || "",
          timestamp: row[formIndices.TIMESTAMP],
          rowIndex: i + 2
        };
      }
    }

    console.log(`❌ No matching form response found for title: "${title}"`);
    return null;
  } catch (error) {
    console.error("Error finding matching form response:", error);
    throw error;
  }
}

/**
 * Helper function to extract data from Mirror tab row
 */
function extractMirrorRowData(rowData, columnIndices) {
  const data = {
    title: rowData[columnIndices.TITLE],
    body: rowData[columnIndices.BODY] || "", // Body is optional
    approved: rowData[columnIndices.APPROVED],
    existingEditUrl: rowData[columnIndices.FORM_EDITOR_URL],
    existingResponseUrl: rowData[columnIndices.FORM_RESPONSE_URL],
  };

  console.log("Extracted Mirror row data:", {
    title: data.title ? `"${data.title.substring(0, 30)}..."` : "MISSING",
    body: data.body ? `${data.body.length} chars` : "EMPTY",
    approved: data.approved,
    hasExistingUrls: !!(data.existingEditUrl || data.existingResponseUrl),
  });

  return data;
}

/**
 * Helper function to validate required data
 */
function validateRowData(data) {
  const errors = [];

  if (
    !data.email ||
    typeof data.email !== "string" ||
    data.email.trim() === ""
  ) {
    errors.push("Email is missing or invalid");
  }

  if (
    !data.title ||
    typeof data.title !== "string" ||
    data.title.trim() === ""
  ) {
    errors.push("Title is missing or invalid");
  }

  if (data.body && typeof data.body !== "string") {
    errors.push("Body must be a string");
  }

  return errors;
}

/**
 * Main function that triggers on edit
 * Set this as an onEdit trigger in the Apps Script GUI
 */
function onApprovalEdit(e) {
  try {
    console.log("=== Edit event triggered ===");

    // Basic event validation
    if (!e || !e.range) {
      console.log("No edit event or range found, exiting");
      return;
    }

    const sheet = e.range.getSheet();
    const row = e.range.getRow();
    const column = e.range.getColumn();

    console.log(
      `Edit detected: Sheet="${sheet.getName()}", Row=${row}, Column=${column}`
    );

    // Only process edits on the "Mirror" sheet
    if (sheet.getName() !== "Mirror") {
      console.log("Edit not on Mirror sheet, exiting");
      return;
    }

    // Only process if this is row 2 or higher (assuming row 1 has headers)
    if (row < 2) {
      console.log("Edit in header row, exiting");
      return;
    }

    // Get Mirror tab column indices
    const mirrorIndices = getMirrorColumnIndices();

    // Check if the edit was made to the APPROVED column
    if (column !== mirrorIndices.APPROVED + 1) {
      console.log(
        `Edit not in APPROVED column (expected: ${
          mirrorIndices.APPROVED + 1
        }, got: ${column}), exiting`
      );
      return;
    }

    // Check if the checkbox was checked (set to TRUE)
    const approvedValue = e.range.getValue();
    console.log(
      `Approval value: ${approvedValue} (type: ${typeof approvedValue})`
    );

    if (approvedValue !== true) {
      console.log("Approval not set to true, exiting");
      return;
    }

    console.log(`Processing approval for row ${row}...`);

    // Get data from the Mirror tab row
    let mirrorRowData;
    try {
      mirrorRowData = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
      console.log(
        `Retrieved ${mirrorRowData.length} columns of data from Mirror row ${row}`
      );
    } catch (error) {
      console.error("Error retrieving Mirror row data:", error);
      return;
    }

    // Extract data from Mirror tab
    const mirrorData = extractMirrorRowData(mirrorRowData, mirrorIndices);

    // Find matching form response in Form Responses 1 tab
    const formData = findMatchingFormResponse(mirrorData.title);
    if (!formData) {
      throw new Error(`No matching form response found for title: "${mirrorData.title}"`);
    }

    // Combine the data
    const combinedData = {
      email: formData.email,
      title: formData.title,
      body: formData.body,
      approved: mirrorData.approved,
      existingEditUrl: mirrorData.existingEditUrl,
      existingResponseUrl: mirrorData.existingResponseUrl,
    };

    // Validate combined data
    const validationErrors = validateRowData(combinedData);
    if (validationErrors.length > 0) {
      console.error("Validation errors:", validationErrors);
      throw new Error(`Data validation failed: ${validationErrors.join(", ")}`);
    }

    // Check if a form has already been generated for this row
    if (combinedData.existingEditUrl && combinedData.existingEditUrl.trim() !== "") {
      console.log(
        `Form already exists for row ${row}: ${combinedData.existingEditUrl}`
      );
      return;
    }

    console.log(`Generating form for: "${combinedData.title}"`);

    // Generate the form
    const result = generateCustomForm(combinedData);

    if (result && result.formEditUrl) {
      try {
        sheet
          .getRange(row, mirrorIndices.FORM_EDITOR_URL + 1)
          .setValue(result.formEditUrl);
        sheet
          .getRange(row, mirrorIndices.FORM_RESPONSE_URL + 1)
          .setValue(result.formResponseUrl);
        console.log(
          `✅ Form created successfully and URLs saved to Mirror row ${row}`
        );
      } catch (error) {
        console.error("Error saving URLs to sheet:", error);
        throw error;
      }
      try {
        sendApprovalNotificationEmail(combinedData, result.formEditUrl);
      } catch (error) {
        console.error("Error sending approval email:", error);
        throw error;
      }
    } else {
      throw new Error("Form generation failed - no URLs returned");
    }
  } catch (error) {
    console.error("❌ Error in onApprovalEdit:", error);

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
    console.log("Starting form generation...");

    // Create form title and description with personalization
    const formTitle = CONFIG.FORM_TITLE_TEMPLATE.replace("{TITLE}", data.title);
    const formDescription = CONFIG.FORM_DESCRIPTION_TEMPLATE.replace(
      "{TITLE}",
      data.title.toUpperCase()
    ).replace("{BODY}", data.body || "");

    console.log(`Creating form with title: "${formTitle}"`);

    // Create the new form
    let form;
    try {
      form = FormApp.create(formTitle);
      form.setDescription(formDescription);
      console.log(`Form created with ID: ${form.getId()}`);
    } catch (error) {
      console.error("Error creating form:", error);
      throw new Error(`Failed to create form: ${error.message}`);
    }

    // Configure form settings
    try {
      form.setCollectEmail(false);
      form.setAllowResponseEdits(true);
      form.setShowLinkToRespondAgain(false);
      console.log("Form settings configured");
    } catch (error) {
      console.error("Error configuring form settings:", error);
      // Non-critical, continue
    }

    // Add custom fields to the form
    try {
      addFormFields(form);
      console.log(`Added ${CONFIG.FORM_FIELDS.length} fields to form`);
    } catch (error) {
      console.error("Error adding form fields:", error);
      throw new Error(`Failed to add form fields: ${error.message}`);
    }

    // Share the form with the specified email
    try {
      shareFormWithUser(form, data.email);
      console.log(`Form shared with: ${data.email}`);
    } catch (error) {
      console.error("Error sharing form:", error);
      // Non-critical, continue
    }

    // Get the form URLs
    let formResponseUrl, formEditUrl;
    try {
      formResponseUrl = form.getPublishedUrl();
      formEditUrl = form.getEditUrl();
      console.log("Form URLs generated successfully");
    } catch (error) {
      console.error("Error getting form URLs:", error);
      throw new Error(`Failed to get form URLs: ${error.message}`);
    }

    return {
      formEditUrl,
      formResponseUrl,
    };
  } catch (error) {
    console.error("❌ Error generating custom form:", error);
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
        case "TEXT":
          item = form.addTextItem();
          break;

        case "EMAIL":
          item = form.addTextItem();
          item.setValidation(
            FormApp.createTextValidation()
              .setHelpText("Please enter a valid email address.")
              .requireTextIsEmail()
              .build()
          );
          break;

        case "PARAGRAPH_TEXT":
          item = form.addParagraphTextItem();
          break;

        case "MULTIPLE_CHOICE":
          item = form.addMultipleChoiceItem();
          if (field.choices) {
            item.setChoices(
              field.choices.map((choice) => item.createChoice(choice))
            );
          }
          if (field.hasOtherOption) {
            item.showOtherOption(true);
          }
          break;

        case "CHECKBOX":
          item = form.addCheckboxItem();
          if (field.choices) {
            item.setChoices(
              field.choices.map((choice) => item.createChoice(choice))
            );
          }
          break;

        case "DATE":
          item = form.addDateItem();
          break;

        case "SCALE":
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

  console.log(
    `Successfully added ${fieldsAdded}/${CONFIG.FORM_FIELDS.length} fields`
  );
}

/**
 * Shares the form with a specific user
 */
function shareFormWithUser(form, email) {
  try {
    if (!email || typeof email !== "string" || !email.includes("@")) {
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
    console.error(
      `❌ Error sending notification email to ${data.email}:`,
      error
    );
    // Non-critical error, don't throw
  }
}

/**
 * Test function to manually test form generation
 * Update the test data to match your sheet structure
 */
function testFormGeneration() {
  try {
    console.log("=== Starting test form generation ===");

    // Clear column indices cache to force re-parsing
    MIRROR_COLUMN_INDICES = null;
    FORM_COLUMN_INDICES = null;

    const mirrorSheet =
      SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Mirror");
    if (!mirrorSheet) {
      throw new Error("Mirror sheet not found");
    }

    const formSheet =
      SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Form Responses 1");
    if (!formSheet) {
      throw new Error("Form Responses 1 sheet not found");
    }

    // Get column indices
    const mirrorIndices = getMirrorColumnIndices();
    const formIndices = getFormColumnIndices();

    // Create test data for Mirror tab
    const testMirrorRowData = new Array(mirrorSheet.getLastColumn()).fill("");
    testMirrorRowData[mirrorIndices.TITLE] =
      "Creative professional seeking meaningful connection";
    testMirrorRowData[mirrorIndices.BODY] =
      "Artist and coffee enthusiast looking for someone who appreciates long walks, deep conversations, and Sunday morning farmers markets.";
    testMirrorRowData[mirrorIndices.APPROVED] = true;
    testMirrorRowData[mirrorIndices.FORM_EDITOR_URL] = "";
    testMirrorRowData[mirrorIndices.FORM_RESPONSE_URL] = "";

    // Create test data for Form Responses 1 tab
    const testFormRowData = new Array(formSheet.getLastColumn()).fill("");
    testFormRowData[formIndices.EMAIL] = "sarah.test@example.com";
    testFormRowData[formIndices.TITLE] =
      "Creative professional seeking meaningful connection";
    testFormRowData[formIndices.BODY] =
      "Artist and coffee enthusiast looking for someone who appreciates long walks, deep conversations, and Sunday morning farmers markets.";
    testFormRowData[formIndices.TIMESTAMP] = new Date().toISOString();

    // Extract data from Mirror tab
    const mirrorData = extractMirrorRowData(testMirrorRowData, mirrorIndices);

    // Create combined data structure
    const combinedData = {
      email: testFormRowData[formIndices.EMAIL],
      title: testFormRowData[formIndices.TITLE],
      body: testFormRowData[formIndices.BODY],
      approved: mirrorData.approved,
      existingEditUrl: mirrorData.existingEditUrl,
      existingResponseUrl: mirrorData.existingResponseUrl,
    };

    const validationErrors = validateRowData(combinedData);

    if (validationErrors.length > 0) {
      throw new Error(
        `Test data validation failed: ${validationErrors.join(", ")}`
      );
    }

    console.log(`Testing form generation for: "${combinedData.title}"`);

    const result = generateCustomForm(combinedData);

    if (result && result.formEditUrl) {
      console.log(`✅ Test successful! Form Edit URL: ${result.formEditUrl}`);
      console.log(`✅ Form Response URL: ${result.formResponseUrl}`);
      sendApprovalNotificationEmail(combinedData, result.formEditUrl);
      SpreadsheetApp.getUi().alert(
        "Test Successful",
        `Form created successfully!\n\nEdit URL: ${result.formEditUrl}\n\nResponse URL: ${result.formResponseUrl}`,
        SpreadsheetApp.getUi().ButtonSet.OK
      );
    } else {
      throw new Error("Test failed - no form URLs returned");
    }
  } catch (error) {
    console.error("❌ Test failed:", error);
    SpreadsheetApp.getUi().alert(
      "Test Failed",
      `Test failed with error: ${error.message}\n\nCheck the logs for more details.`,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
}

/**
 * Utility function to get column letters for easy reference
 */
function getColumnLetter(columnIndex) {
  let letter = "";
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
    const mirrorSheet =
      SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Mirror");
    const formSheet =
      SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Form Responses 1");

    if (!mirrorSheet) {
      throw new Error("Mirror sheet not found");
    }

    if (!formSheet) {
      throw new Error("Form Responses 1 sheet not found");
    }

    // Clear cache to force re-parsing
    MIRROR_COLUMN_INDICES = null;
    FORM_COLUMN_INDICES = null;

    const mirrorHeaders = mirrorSheet
      .getRange(1, 1, 1, mirrorSheet.getLastColumn())
      .getValues()[0];

    const formHeaders = formSheet
      .getRange(1, 1, 1, formSheet.getLastColumn())
      .getValues()[0];

    console.log("=== Mirror Sheet Structure Analysis ===");
    mirrorHeaders.forEach((header, index) => {
      console.log(
        `Column ${getColumnLetter(index)} (index ${index}): ${header}`
      );
    });

    console.log("=== Form Responses 1 Sheet Structure Analysis ===");
    formHeaders.forEach((header, index) => {
      console.log(
        `Column ${getColumnLetter(index)} (index ${index}): ${header}`
      );
    });

    // Also show the parsed column indices
    try {
      const mirrorIndices = getMirrorColumnIndices();
      const formIndices = getFormColumnIndices();
      console.log("=== Parsed Column Mappings ===");
      console.log("Mirror Tab:");
      Object.keys(mirrorIndices).forEach((key) => {
        const index = mirrorIndices[key];
        console.log(
          `${key}: Column ${getColumnLetter(index)} (index ${index}) - "${
            mirrorHeaders[index]
          }"`
        );
      });
      console.log("Form Responses 1 Tab:");
      Object.keys(formIndices).forEach((key) => {
        const index = formIndices[key];
        console.log(
          `${key}: Column ${getColumnLetter(index)} (index ${index}) - "${
            formHeaders[index]
          }"`
        );
      });
    } catch (error) {
      console.error("Error parsing column mappings:", error);
    }

    const ui = SpreadsheetApp.getUi();
    const mirrorHeaderList = mirrorHeaders
      .map(
        (header, index) =>
          `Column ${getColumnLetter(index)} (index ${index}): ${header}`
      )
      .join("\n");

    const formHeaderList = formHeaders
      .map(
        (header, index) =>
          `Column ${getColumnLetter(index)} (index ${index}): ${header}`
      )
      .join("\n");

    ui.alert("Sheet Structure - Mirror Tab", mirrorHeaderList, ui.ButtonSet.OK);
    ui.alert("Sheet Structure - Form Responses 1 Tab", formHeaderList, ui.ButtonSet.OK);
  } catch (error) {
    console.error("Error analyzing sheet structure:", error);
    SpreadsheetApp.getUi().alert(
      "Error",
      `Failed to analyze sheet structure: ${error.message}`,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
}

/**
 * Creates a custom menu in the Google Sheet when the file opens
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  
  ui.createMenu('🔧 Form Generator')
    .addItem('📊 Analyze Sheet Structure', 'analyzeSheetStructure')
    .addItem('🧪 Test Form Generation', 'testFormGeneration')
    .addSeparator()
    .addItem('🔄 Clear Column Cache', 'clearColumnCache')
    .addItem('📋 Show Current Config', 'showCurrentConfig')
    .addToUi();
}

/**
 * Helper function to clear the column indices cache
 */
function clearColumnCache() {
  MIRROR_COLUMN_INDICES = null;
  FORM_COLUMN_INDICES = null;
  console.log('Column indices cache cleared');
  SpreadsheetApp.getUi().alert('Cache Cleared', 'Column indices cache has been cleared. The script will re-parse headers on next use.', SpreadsheetApp.getUi().ButtonSet.OK);
}

/**
 * Helper function to show current configuration
 */
function showCurrentConfig() {
  try {
    const mirrorSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Mirror');
    const formSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Form Responses 1');
    
    if (!mirrorSheet) {
      throw new Error('Mirror sheet not found');
    }
    
    if (!formSheet) {
      throw new Error('Form Responses 1 sheet not found');
    }
    
    const mirrorIndices = getMirrorColumnIndices();
    const formIndices = getFormColumnIndices();
    const mirrorHeaders = mirrorSheet.getRange(1, 1, 1, mirrorSheet.getLastColumn()).getValues()[0];
    const formHeaders = formSheet.getRange(1, 1, 1, formSheet.getLastColumn()).getValues()[0];
    
    let configText = 'CURRENT CONFIGURATION:\n\n';
    configText += 'Mirror Tab Column Mappings:\n';
    
    Object.keys(mirrorIndices).forEach(key => {
      const index = mirrorIndices[key];
      configText += `• ${key}: Column ${getColumnLetter(index)} - "${mirrorHeaders[index]}"\n`;
    });
    
    configText += '\nForm Responses 1 Tab Column Mappings:\n';
    Object.keys(formIndices).forEach(key => {
      const index = formIndices[key];
      configText += `• ${key}: Column ${getColumnLetter(index)} - "${formHeaders[index]}"\n`;
    });
    
    configText += '\nForm Fields:\n';
    CONFIG.FORM_FIELDS.forEach((field, index) => {
      configText += `• ${field.title} (${field.type})${field.required ? ' *' : ''}\n`;
    });
    
    SpreadsheetApp.getUi().alert('Current Configuration', configText, SpreadsheetApp.getUi().ButtonSet.OK);
    
  } catch (error) {
    SpreadsheetApp.getUi().alert('Error', `Failed to show configuration: ${error.message}`, SpreadsheetApp.getUi().ButtonSet.OK);
  }
}
