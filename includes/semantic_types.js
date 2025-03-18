/**
 * Semantic Types Module
 * 
 * This module handles semantic type mapping, detection, and validation.
 * It provides utilities to automatically detect semantic types from field names
 * and implement consistent type checking across the codebase.
 */

const { projectConfig } = dataform || { projectConfig: { vars: {} } };

// Import error logger
const errorLogger = require('./error_logger');

// Semantic type definitions with pattern matching
const SEMANTIC_TYPES = {
  // Person identifiers
  EMAIL: {
    name: "EMAIL",
    description: "Email address",
    patterns: [
      /^email$/i,
      /^e[-_]?mail[-_]?addr(ess)?$/i,
      /^contact[-_]?email$/i
    ],
    validation: (value) => typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  },
  
  PHONE: {
    name: "PHONE",
    description: "Phone number",
    patterns: [
      /^phone([-_]?number)?$/i,
      /^contact[-_]?phone$/i,
      /^mobile([-_]?number)?$/i,
      /^cell([-_]?phone)?$/i,
      /^telephone$/i
    ],
    validation: (value) => typeof value === 'string' && 
      (/^\+?[0-9]{10,15}$/.test(value.replace(/[\s\-\(\)\.]/g, '')) || 
       /^[0-9]{3}[-\.\s][0-9]{3}[-\.\s][0-9]{4}$/.test(value))
  },
  
  FIRST_NAME: {
    name: "FIRST_NAME",
    description: "First name",
    patterns: [
      /^first[-_]?name$/i,
      /^fname$/i,
      /^given[-_]?name$/i,
      /^person[-_]?first[-_]?name$/i
    ],
    validation: (value) => typeof value === 'string' && value.length > 0
  },
  
  LAST_NAME: {
    name: "LAST_NAME",
    description: "Last name/surname",
    patterns: [
      /^last[-_]?name$/i,
      /^lname$/i,
      /^surname$/i,
      /^family[-_]?name$/i,
      /^person[-_]?last[-_]?name$/i
    ],
    validation: (value) => typeof value === 'string' && value.length > 0
  },
  
  FULL_NAME: {
    name: "FULL_NAME",
    description: "Full name (combined first and last)",
    patterns: [
      /^full[-_]?name$/i,
      /^name$/i,
      /^customer[-_]?name$/i,
      /^person[-_]?name$/i
    ],
    validation: (value) => typeof value === 'string' && value.length > 0 && value.includes(' ')
  },
  
  DATE_OF_BIRTH: {
    name: "DATE_OF_BIRTH",
    description: "Date of birth",
    patterns: [
      /^dob$/i,
      /^birth[-_]?date$/i,
      /^date[-_]?of[-_]?birth$/i,
      /^birth[-_]?day$/i
    ],
    validation: (value) => {
      if (value instanceof Date) return true;
      if (typeof value !== 'string') return false;
      
      // Check common date formats
      return /^\d{4}-\d{2}-\d{2}$/.test(value) || // YYYY-MM-DD
             /^\d{2}\/\d{2}\/\d{4}$/.test(value) || // MM/DD/YYYY
             /^\d{2}-\d{2}-\d{4}$/.test(value); // MM-DD-YYYY
    }
  },
  
  SSN: {
    name: "SSN",
    description: "Social Security Number",
    patterns: [
      /^ssn$/i,
      /^social[-_]?security$/i,
      /^social[-_]?security[-_]?(num|number)$/i,
      /^tax[-_]?id$/i
    ],
    validation: (value) => {
      if (typeof value !== 'string') return false;
      const cleaned = value.replace(/[^0-9]/g, '');
      return cleaned.length === 9 && !/^0{9}$|^9{9}$/.test(cleaned);
    }
  },
  
  // Address components
  ADDRESS: {
    name: "ADDRESS",
    description: "Full street address",
    patterns: [
      /^address$/i,
      /^street[-_]?address$/i,
      /^mailing[-_]?address$/i,
      /^addr$/i,
      /^full[-_]?address$/i
    ],
    validation: (value) => typeof value === 'string' && value.length > 5
  },
  
  ADDRESS_LINE_1: {
    name: "ADDRESS_LINE_1",
    description: "First line of street address",
    patterns: [
      /^addr(ess)?[-_]?line[-_]?1$/i,
      /^addr(ess)?[-_]?1$/i,
      /^addr(ess)?[-_]?line$/i,
      /^street[-_]?addr(ess)?$/i
    ],
    validation: (value) => typeof value === 'string' && value.length > 0
  },
  
  ZIP_CODE: {
    name: "ZIP_CODE",
    description: "ZIP/Postal code",
    patterns: [
      /^zip$/i,
      /^zip[-_]?code$/i,
      /^postal[-_]?code$/i,
      /^post[-_]?code$/i
    ],
    validation: (value) => {
      if (typeof value !== 'string' && typeof value !== 'number') return false;
      const strValue = String(value);
      // US 5-digit ZIP or ZIP+4
      return /^\d{5}(-\d{4})?$/.test(strValue) || 
        // Common international formats (looser validation)
        /^[A-Z0-9]{3,10}$/i.test(strValue.replace(/\s/g, ''));
    }
  },
  
  CITY: {
    name: "CITY",
    description: "City name",
    patterns: [
      /^city$/i,
      /^city[-_]?name$/i,
      /^town$/i,
      /^municipality$/i
    ],
    validation: (value) => typeof value === 'string' && value.length > 0
  },
  
  STATE: {
    name: "STATE",
    description: "State/Province",
    patterns: [
      /^state$/i,
      /^province$/i,
      /^state[-_]?code$/i,
      /^state[-_]?province$/i,
      /^prov$/i
    ],
    validation: (value) => typeof value === 'string' && value.length > 0
  },
  
  // Additional identifiers
  DEVICE_ID: {
    name: "DEVICE_ID",
    description: "Device identifier",
    patterns: [
      /^device[-_]?id$/i,
      /^device[-_]?identifier$/i,
      /^did$/i,
      /^device[-_]?token$/i
    ],
    validation: (value) => typeof value === 'string' && value.length > 0
  },
  
  USER_ID: {
    name: "USER_ID",
    description: "User identifier",
    patterns: [
      /^user[-_]?id$/i,
      /^uid$/i,
      /^user[-_]?identifier$/i,
      /^customer[-_]?id$/i,
      /^cid$/i
    ],
    validation: (value) => (typeof value === 'string' || typeof value === 'number') && value !== ''
  }
};

/**
 * Detects the semantic type of a field based on its name
 * 
 * @param {string} fieldName - The name of the field to detect
 * @returns {Object|null} The detected semantic type object or null if not detected
 */
function detectSemanticType(fieldName) {
  if (!fieldName) return null;
  
  // Convert field name to lowercase for case-insensitive matching
  const normalizedFieldName = fieldName.trim().toLowerCase();
  
  // Try to match against patterns
  for (const [typeKey, typeObj] of Object.entries(SEMANTIC_TYPES)) {
    for (const pattern of typeObj.patterns) {
      if (pattern.test(normalizedFieldName)) {
        return { ...typeObj, key: typeKey };
      }
    }
  }
  
  // No match found
  return null;
}

/**
 * Validates a value against its semantic type
 * 
 * @param {string} semanticType - The semantic type key
 * @param {*} value - The value to validate
 * @returns {boolean} True if the value is valid for the semantic type
 */
function validateBySemanticType(semanticType, value) {
  const type = SEMANTIC_TYPES[semanticType];
  if (!type || !type.validation) return false;
  return type.validation(value);
}

/**
 * Gets standardized field name for a semantic type
 * 
 * @param {string} semanticType - The semantic type key
 * @returns {string} The standardized field name
 */
function getStandardFieldName(semanticType) {
  const customFieldNames = (projectConfig.vars || {}).standardized_field_names || {};
  const type = SEMANTIC_TYPES[semanticType];
  
  if (!type) return null;
  
  // First check if there's a custom name defined in project vars
  if (customFieldNames[semanticType]) {
    return customFieldNames[semanticType];
  }
  
  // Otherwise use default naming convention
  return type.name.toLowerCase();
}

/**
 * Returns SQL expression to standardize a field based on its semantic type
 * 
 * @param {string} fieldName - Field name
 * @param {string} semanticType - Semantic type key
 * @returns {string} SQL expression to standardize the field
 */
function getStandardizationExpression(fieldName, semanticType) {
  try {
    switch (semanticType.toLowerCase()) {
      case "email":
        return `LOWER(TRIM(${fieldName}))`;
      
      case "phone":
        return `
          REGEXP_REPLACE(
            REGEXP_REPLACE(
              REGEXP_REPLACE(${fieldName}, r'[\\s.-]', ''),
              r'^\\+?1', '+1'
            ),
            r'^([0-9]{10})$', '+1\\1'
          )
        `;
      
      case "name":
        return `LOWER(TRIM(${fieldName}))`;
      
      case "address":
        return `LOWER(TRIM(${fieldName}))`;
      
      case "postal_code":
        return `TRIM(${fieldName})`;
      
      case "city":
        return `LOWER(TRIM(${fieldName}))`;
      
      case "state_code":
        return `UPPER(TRIM(${fieldName}))`;
      
      case "date":
        return `
          CASE
            WHEN ${fieldName} IS NULL THEN NULL
            WHEN REGEXP_CONTAINS(${fieldName}, r'^\\d{4}-\\d{2}-\\d{2}$') THEN ${fieldName}
            WHEN REGEXP_CONTAINS(${fieldName}, r'^\\d{2}/\\d{2}/\\d{4}$') 
              THEN FORMAT_DATE('%Y-%m-%d', PARSE_DATE('%m/%d/%Y', ${fieldName}))
            ELSE ${fieldName}
          END
        `;
      
      case "ssn":
        return `
          CONCAT(
            'XXX-XX-',
            SUBSTR(
              REGEXP_REPLACE(${fieldName}, r'[^0-9]', ''),
              LENGTH(REGEXP_REPLACE(${fieldName}, r'[^0-9]', '')) - 4,
              4
            )
          )
        `;
      
      default:
        // Log unknown type but don't block operation
        errorLogger.logError(
          'semantic_types',
          errorLogger.ERROR_TYPES.STANDARDIZATION,
          {
            semanticType,
            fieldName,
            message: 'Unknown semantic type for standardization',
            sourceFile: 'semantic_types.js'
          },
          errorLogger.SEVERITY.INFO
        );
        
        // For unknown types, just return the field as is
        return fieldName;
    }
  } catch (error) {
    // Log the error
    errorLogger.logError(
      'semantic_types',
      errorLogger.ERROR_TYPES.STANDARDIZATION,
      {
        semanticType,
        fieldName,
        error: error.message,
        sourceFile: 'semantic_types.js'
      },
      errorLogger.SEVERITY.ERROR
    );
    
    // Return a safe fallback that won't break the pipeline
    return fieldName;
  }
}

/**
 * Analyzes a list of field names and returns their detected semantic types
 * 
 * @param {Array<string>} fieldNames - List of field names to analyze
 * @returns {Object} Mapping of field names to their semantic types
 */
function analyzeFields(fieldNames) {
  const results = {};
  
  for (const fieldName of fieldNames) {
    const detectedType = detectSemanticType(fieldName);
    if (detectedType) {
      results[fieldName] = detectedType;
    }
  }
  
  return results;
}

/**
 * Generates a SQL query to infer semantic types from a table
 * 
 * @param {string} projectId - BigQuery project ID
 * @param {string} datasetId - BigQuery dataset ID
 * @param {string} tableId - BigQuery table ID
 * @returns {string} SQL query that returns semantic type mappings
 */
function generateSemanticTypeMappingSql(projectId, datasetId, tableId) {
  const patternCases = [];
  
  // Build the pattern matching CASE statement for each semantic type
  Object.entries(SEMANTIC_TYPES).forEach(([typeKey, typeObj]) => {
    typeObj.patterns.forEach(pattern => {
      // Convert regex pattern to string and remove the regex delimiters and flags
      const patternStr = pattern.toString().replace(/^\/|\/i$/g, '');
      patternCases.push(`WHEN REGEXP_CONTAINS(LOWER(column_name), r'${patternStr}') THEN '${typeObj.name}'`);
    });
  });

  return `
    WITH column_info AS (
      SELECT 
        column_name,
        data_type
      FROM 
        \`${projectId}.${datasetId}\`.INFORMATION_SCHEMA.COLUMNS
      WHERE 
        table_name = '${tableId}'
    )
    
    SELECT
      column_name,
      data_type,
      CASE
        ${patternCases.join('\n        ')}
        ELSE NULL
      END AS semantic_type
    FROM column_info
    ORDER BY column_name
  `;
}

// US state codes for validation
const US_STATE_CODES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
  'DC', 'PR', 'VI', 'AS', 'GU', 'MP'
];

// Export both the semantic types and utility functions
module.exports = {
  SEMANTIC_TYPES,
  detectSemanticType,
  validateBySemanticType,
  getStandardFieldName,
  getStandardizationExpression,
  analyzeFields,
  generateSemanticTypeMappingSql
};