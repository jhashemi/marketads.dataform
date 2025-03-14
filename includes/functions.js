/**
 * Common utility functions for Dataform
 * 
 * This module provides shared functionality used across the project.
 */

/**
 * Checks if a value is null or undefined
 * @param {*} value - The value to check
 * @returns {boolean} True if null or undefined
 */
function isNullOrUndefined(value) {
  return value === null || value === undefined;
}

/**
 * Safe string comparison that handles null values
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {boolean} True if strings match
 */
function safeStringEquals(str1, str2) {
  if (isNullOrUndefined(str1) || isNullOrUndefined(str2)) {
    return false;
  }
  return String(str1).trim() === String(str2).trim();
}

/**
 * Generates a SQL expression for standardizing a string field
 * @param {string} fieldName - The field name to standardize
 * @returns {string} SQL expression
 */
function standardizeString(fieldName) {
  return `TRIM(UPPER(${fieldName}))`;
}

/**
 * Generates a SQL fragment for fuzzy matching
 * @param {string} field1 - First field name
 * @param {string} field2 - Second field name
 * @param {number} threshold - Similarity threshold (0-1)
 * @returns {string} SQL condition for fuzzy matching
 */
function fuzzyMatch(field1, field2, threshold = 0.8) {
  return `(
    -- First check for exact match
    (${standardizeString(field1)} = ${standardizeString(field2)})
    OR
    -- Then try fuzzy matching with Levenshtein distance
    (
      ${field1} IS NOT NULL AND ${field2} IS NOT NULL
      AND LENGTH(${field1}) > 0 AND LENGTH(${field2}) > 0
      AND (1 - (CAST(LEVENSHTEIN(${standardizeString(field1)}, ${standardizeString(field2)}) AS FLOAT64) 
           / GREATEST(LENGTH(${standardizeString(field1)}), LENGTH(${standardizeString(field2)})))) >= ${threshold}
    )
  )`;
}

/**
 * Creates a debug SQL statement that returns a row with the current values
 * @param {Object} values - Key-value pairs to debug
 * @returns {string} SQL SELECT statement with debug info
 */
function debug(values) {
  const selectExpressions = Object.entries(values)
    .map(([key, value]) => `${value} AS ${key}`)
    .join(',\n    ');
  
  return `
    -- Debug information
    SELECT
      ${selectExpressions}
  `;
}

// Export all functions
module.exports = {
  isNullOrUndefined,
  safeStringEquals,
  standardizeString,
  fuzzyMatch,
  debug
}; 