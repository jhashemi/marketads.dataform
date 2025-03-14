/**
 * Field Standardization Library
 * 
 * SQL templates for standardizing different field types
 * to ensure consistent comparison in BigQuery.
 */

/**
 * Generate SQL for standardizing a string field
 * @param {string} field - Field name to standardize
 * @param {Object} options - Standardization options
 * @returns {string} SQL expression
 */
function standardizeString(field, options = {}) {
  const {
    trim = true,
    uppercase = false,
    lowercase = false,
    removeNonAlpha = false,
    removeNonAlphaNumeric = false,
    removeWhitespace = false
  } = options;
  
  let sql = `IFNULL(${field}, '')`;
  
  if (trim) {
    sql = `TRIM(${sql})`;
  }
  
  if (uppercase) {
    sql = `UPPER(${sql})`;
  }
  
  if (lowercase) {
    sql = `LOWER(${sql})`;
  }
  
  if (removeNonAlpha) {
    sql = `REGEXP_REPLACE(${sql}, '[^a-zA-Z]', '')`;
  }
  
  if (removeNonAlphaNumeric) {
    sql = `REGEXP_REPLACE(${sql}, '[^a-zA-Z0-9]', '')`;
  }
  
  if (removeWhitespace) {
    sql = `REGEXP_REPLACE(${sql}, '\\s+', '')`;
  }
  
  return sql;
}

/**
 * Generate SQL for standardizing a name field
 * @param {string} field - Field name to standardize
 * @param {Object} options - Standardization options
 * @returns {string} SQL expression
 */
function standardizeName(field, options = {}) {
  const {
    removePrefix = true,
    removeSuffix = true
  } = options;
  
  let sql = standardizeString(field, {
    trim: true,
    uppercase: true,
    removeNonAlpha: false
  });
  
  if (removePrefix) {
    // Remove common name prefixes (Mr, Mrs, Dr, etc.)
    sql = `REGEXP_REPLACE(${sql}, '^(MR|MRS|MS|DR|PROF)\\.?\\s+', '')`;
  }
  
  if (removeSuffix) {
    // Remove common name suffixes (Jr, Sr, III, etc.)
    sql = `REGEXP_REPLACE(${sql}, '\\s+(JR|SR|I|II|III|IV|V)\\.?$', '')`;
  }
  
  return sql;
}

/**
 * Generate SQL for standardizing an email field
 * @param {string} field - Field name to standardize
 * @param {Object} options - Standardization options
 * @returns {string} SQL expression
 */
function standardizeEmail(field, options = {}) {
  // Emails should be lowercase and trimmed
  return standardizeString(field, {
    trim: true,
    lowercase: true
  });
}

/**
 * Generate SQL for standardizing a phone field
 * @param {string} field - Field name to standardize
 * @param {Object} options - Standardization options
 * @returns {string} SQL expression
 */
function standardizePhone(field, options = {}) {
  const {
    digitsOnly = true,
    lastFourOnly = false
  } = options;
  
  let sql = standardizeString(field, { trim: true });
  
  if (digitsOnly) {
    // Remove all non-digit characters
    sql = `REGEXP_REPLACE(${sql}, '[^0-9]', '')`;
  }
  
  if (lastFourOnly) {
    // Get only the last 4 digits
    sql = `RIGHT(REGEXP_REPLACE(${sql}, '[^0-9]', ''), 4)`;
  }
  
  return sql;
}

/**
 * Generate SQL for standardizing an address field
 * @param {string} field - Field name to standardize
 * @param {Object} options - Standardization options
 * @returns {string} SQL expression
 */
function standardizeAddress(field, options = {}) {
  const {
    standardizeStreetTypes = true,
    standardizeDirectionals = true,
    removeApartment = false,
    uppercase = true
  } = options;
  
  let sql = standardizeString(field, {
    trim: true,
    uppercase: uppercase
  });
  
  if (standardizeStreetTypes) {
    // Standardize common street types
    const streetTypeReplacements = [
      {pattern: '\\bAVENUE\\b|\\bAVE\\b', replacement: 'AVE'},
      {pattern: '\\bBOULEVARD\\b|\\bBLVD\\b', replacement: 'BLVD'},
      {pattern: '\\bCIRCLE\\b|\\bCIR\\b', replacement: 'CIR'},
      {pattern: '\\bCOURT\\b|\\bCT\\b', replacement: 'CT'},
      {pattern: '\\bDRIVE\\b|\\bDR\\b', replacement: 'DR'},
      {pattern: '\\bEXPRESSWAY\\b|\\bEXPY\\b', replacement: 'EXPY'},
      {pattern: '\\bHIGHWAY\\b|\\bHWY\\b', replacement: 'HWY'},
      {pattern: '\\bLANE\\b|\\bLN\\b', replacement: 'LN'},
      {pattern: '\\bPARKWAY\\b|\\bPKWY\\b', replacement: 'PKWY'},
      {pattern: '\\bPLACE\\b|\\bPL\\b', replacement: 'PL'},
      {pattern: '\\bROAD\\b|\\bRD\\b', replacement: 'RD'},
      {pattern: '\\bSQUARE\\b|\\bSQ\\b', replacement: 'SQ'},
      {pattern: '\\bSTREET\\b|\\bST\\b', replacement: 'ST'},
      {pattern: '\\bTERRACE\\b|\\bTERR\\b', replacement: 'TER'},
      {pattern: '\\bTRAIL\\b|\\bTRL\\b', replacement: 'TRL'},
      {pattern: '\\bWAY\\b', replacement: 'WAY'}
    ];
    
    for (const {pattern, replacement} of streetTypeReplacements) {
      sql = `REGEXP_REPLACE(${sql}, '${pattern}', '${replacement}')`;
    }
  }
  
  if (standardizeDirectionals) {
    // Standardize directionals
    const directionalReplacements = [
      {pattern: '\\bNORTH\\b', replacement: 'N'},
      {pattern: '\\bSOUTH\\b', replacement: 'S'},
      {pattern: '\\bEAST\\b', replacement: 'E'},
      {pattern: '\\bWEST\\b', replacement: 'W'},
      {pattern: '\\bNORTHEAST\\b|\\bNORTH EAST\\b', replacement: 'NE'},
      {pattern: '\\bNORTHWEST\\b|\\bNORTH WEST\\b', replacement: 'NW'},
      {pattern: '\\bSOUTHEAST\\b|\\bSOUTH EAST\\b', replacement: 'SE'},
      {pattern: '\\bSOUTHWEST\\b|\\bSOUTH WEST\\b', replacement: 'SW'}
    ];
    
    for (const {pattern, replacement} of directionalReplacements) {
      sql = `REGEXP_REPLACE(${sql}, '${pattern}', '${replacement}')`;
    }
  }
  
  if (removeApartment) {
    // Remove apartment, unit, suite, etc.
    sql = `REGEXP_REPLACE(${sql}, '\\s+(?:APT|APARTMENT|UNIT|#|STE|SUITE|BLDG|BUILDING)\\s*[A-Z0-9-]+', '')`;
  }
  
  return sql;
}

/**
 * Generate SQL for standardizing a zip code field
 * @param {string} field - Field name to standardize
 * @param {Object} options - Standardization options
 * @returns {string} SQL expression
 */
function standardizeZip(field, options = {}) {
  const {
    firstFiveOnly = true,
    digitsOnly = true
  } = options;
  
  let sql = standardizeString(field, { trim: true });
  
  if (digitsOnly) {
    // Remove all non-digit characters
    sql = `REGEXP_REPLACE(${sql}, '[^0-9]', '')`;
  }
  
  if (firstFiveOnly) {
    // Get only the first 5 digits (US ZIP format)
    sql = `LEFT(REGEXP_REPLACE(${sql}, '[^0-9]', ''), 5)`;
  }
  
  return sql;
}

/**
 * Generate SQL for standardizing a date field
 * @param {string} field - Field name to standardize
 * @param {Object} options - Standardization options
 * @returns {string} SQL expression
 */
function standardizeDate(field, options = {}) {
  const {
    format = 'DATE'  // 'DATE', 'TIMESTAMP', or 'STRING'
  } = options;
  
  // Try to parse the field as a date
  switch (format.toUpperCase()) {
    case 'DATE':
      return `
        CASE
          WHEN ${field} IS NULL THEN NULL
          WHEN SAFE_CAST(${field} AS DATE) IS NOT NULL THEN SAFE_CAST(${field} AS DATE)
          WHEN REGEXP_CONTAINS(${field}, '^\\d{4}-\\d{1,2}-\\d{1,2}$') 
            THEN SAFE.PARSE_DATE('%Y-%m-%d', ${field})
          WHEN REGEXP_CONTAINS(${field}, '^\\d{1,2}/\\d{1,2}/\\d{4}$') 
            THEN SAFE.PARSE_DATE('%m/%d/%Y', ${field})
          WHEN REGEXP_CONTAINS(${field}, '^\\d{1,2}/\\d{1,2}/\\d{2}$') 
            THEN SAFE.PARSE_DATE('%m/%d/%y', ${field})
          ELSE NULL
        END
      `;
    
    case 'TIMESTAMP':
      return `SAFE_CAST(${field} AS TIMESTAMP)`;
    
    case 'STRING':
      return `
        CASE
          WHEN ${field} IS NULL THEN NULL
          WHEN SAFE_CAST(${field} AS DATE) IS NOT NULL 
            THEN FORMAT_DATE('%Y-%m-%d', SAFE_CAST(${field} AS DATE))
          WHEN REGEXP_CONTAINS(${field}, '^\\d{4}-\\d{1,2}-\\d{1,2}$') THEN ${field}
          WHEN REGEXP_CONTAINS(${field}, '^\\d{1,2}/\\d{1,2}/\\d{4}$') 
            THEN FORMAT_DATE('%Y-%m-%d', SAFE.PARSE_DATE('%m/%d/%Y', ${field}))
          WHEN REGEXP_CONTAINS(${field}, '^\\d{1,2}/\\d{1,2}/\\d{2}$') 
            THEN FORMAT_DATE('%Y-%m-%d', SAFE.PARSE_DATE('%m/%d/%y', ${field}))
          ELSE NULL
        END
      `;
      
    default:
      return field;
  }
}

/**
 * Generate SQL for standardizing any field based on its type
 * @param {string} field - Field name to standardize
 * @param {string} fieldType - Type of the field
 * @param {Object} options - Standardization options
 * @returns {string} SQL expression
 */
function standardizeField(field, fieldType, options = {}) {
  switch (fieldType.toLowerCase()) {
    case 'first_name':
    case 'last_name':
    case 'name':
      return standardizeName(field, options);
      
    case 'email':
      return standardizeEmail(field, options);
      
    case 'phone':
      return standardizePhone(field, options);
      
    case 'address':
      return standardizeAddress(field, options);
      
    case 'zip':
    case 'postal_code':
      return standardizeZip(field, options);
      
    case 'date':
    case 'date_of_birth':
    case 'dob':
      return standardizeDate(field, options);
      
    case 'string':
    default:
      return standardizeString(field, options);
  }
}

module.exports = {
  standardizeString,
  standardizeName,
  standardizeEmail,
  standardizePhone,
  standardizeAddress,
  standardizeZip,
  standardizeDate,
  standardizeField
};
