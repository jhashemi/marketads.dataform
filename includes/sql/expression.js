// includes/sql/expressions.js

/**
 * SQL Expression Generator
 * 
 * Utilities to generate optimized SQL expressions for various operations
 * in a type-safe, NULL-aware manner.
 */

/**
 * Generates SQL for safely standardizing a string field
 * @param {string} field - Field name to standardize
 * @param {Object} options - Standardization options
 * @returns {string} SQL expression
 */
function standardizeString(field, options = {}) {
  const {
    uppercase = false,
    lowercase = false,
    trim = true,
    removeNonAlpha = false,
    removeSpecialChars = false,
    maxLength = null
  } = options;
  
  let expr = `IFNULL(${field}, '')`;
  
  if (trim) {
    expr = `TRIM(${expr})`;
  }
  
  if (uppercase) {
    expr = `UPPER(${expr})`;
  }
  
  if (lowercase) {
    expr = `LOWER(${expr})`;
  }
  
  if (removeNonAlpha) {
    expr = `REGEXP_REPLACE(${expr}, '[^a-zA-Z]', '')`;
  }
  
  if (removeSpecialChars) {
    expr = `REGEXP_REPLACE(${expr}, '[^a-zA-Z0-9 ]', '')`;
  }
  
  if (maxLength) {
    expr = `LEFT(${expr}, ${maxLength})`;
  }
  
  return expr;
}

/**
 * Generates SQL for comparing two string fields with a specific algorithm
 * @param {string} field1 - First field name
 * @param {string} field2 - Second field name
 * @param {string} algorithm - Comparison algorithm to use
 * @param {Object} options - Additional options
 * @returns {string} SQL expression
 */
function compareStrings(field1, field2, algorithm = 'exact', options = {}) {
  const {
    standardizeFields = true,
    caseSensitive = false,
    standardizationOptions = {}
  } = options;
  
  // Standardize fields if requested
  let f1 = field1;
  let f2 = field2;
  
  if (standardizeFields) {
    f1 = standardizeString(field1, standardizationOptions);
    f2 = standardizeString(field2, standardizationOptions);
  }
  
  // Apply chosen comparison algorithm
  switch (algorithm.toLowerCase()) {
    case 'exact':
      return `(${f1} = ${f2})`;
      
    case 'levenshtein':
      return `(1.0 - SAFE_DIVIDE(LEVENSHTEIN(${f1}, ${f2}), GREATEST(LENGTH(${f1}), LENGTH(${f2}))))`;
      
    case 'jaro_winkler':
      // Note: BigQuery doesn't have built-in Jaro-Winkler
      // Would need to use UDF or approximate with other functions
      return `/* Would use Jaro-Winkler similarity */
        CASE 
          WHEN ${f1} = ${f2} THEN 1.0
          WHEN LEFT(${f1}, 1) = LEFT(${f2}, 1) THEN 
            0.7 * (1.0 - SAFE_DIVIDE(LEVENSHTEIN(${f1}, ${f2}), GREATEST(LENGTH(${f1}), LENGTH(${f2}))))
          ELSE 0.5 * (1.0 - SAFE_DIVIDE(LEVENSHTEIN(${f1}, ${f2}), GREATEST(LENGTH(${f1}), LENGTH(${f2}))))
        END`;
      
    case 'soundex':
      return `(SOUNDEX(${f1}) = SOUNDEX(${f2}))`;
      
    case 'contains':
      return `(STRPOS(${f1}, ${f2}) > 0 OR STRPOS(${f2}, ${f1}) > 0)`;
      
    default:
      return `(${f1} = ${f2})`;
  }
}

/**
 * Generates SQL for creating a blocking key from a field
 * @param {string} field - Field to create blocking key from
 * @param {string} strategy - Blocking strategy to use
 * @param {Object} options - Additional options
 * @returns {string} SQL expression
 */
function generateBlockingKey(field, strategy = 'exact', options = {}) {
  const {
    standardizeFirst = true,
    standardizationOptions = {}
  } = options;
  
  let fieldExpr = field;
  if (standardizeFirst) {
    fieldExpr = standardizeString(field, standardizationOptions);
  }
  
  switch (strategy.toLowerCase()) {
    case 'exact':
      return fieldExpr;
      
    case 'prefix':
      const prefixLength = options.length || 3;
      return `LEFT(${fieldExpr}, ${prefixLength})`;
      
    case 'soundex':
      return `SOUNDEX(${fieldExpr})`;
      
    case 'first_char_soundex':
      return `CONCAT(LEFT(${fieldExpr}, 1), SOUNDEX(${fieldExpr}))`;
      
    case 'ngram':
      const ngramSize = options.length || 3;
      // Note: BigQuery doesn't have built-in n-gram function
      // This is a simplified version that just takes the first n chars
      return `LEFT(${fieldExpr}, ${ngramSize})`;
      
    default:
      return fieldExpr;
  }
}

/**
 * Generates SQL for safely comparing numeric fields
 * @param {string} field1 - First numeric field
 * @param {string} field2 - Second numeric field
 * @param {string} operator - Comparison operator
 * @param {Object} options - Additional options
 * @returns {string} SQL expression
 */
function compareNumbers(field1, field2, operator = '=', options = {}) {
  const {
    tolerance = 0,
    nullEquals = false
  } = options;
  
  if (nullEquals) {
    return `((${field1} IS NULL AND ${field2} IS NULL) OR 
            (${field1} IS NOT NULL AND ${field2} IS NOT NULL AND 
             ABS(${field1} - ${field2}) <= ${tolerance}))`;
  }
  
  if (tolerance > 0) {
    return `(ABS(${field1} - ${field2}) <= ${tolerance})`;
  }
  
  return `(${field1} ${operator} ${field2})`;
}

// Export all functions
module.exports = {
  standardizeString,
  compareStrings,
  generateBlockingKey,
  compareNumbers
};

