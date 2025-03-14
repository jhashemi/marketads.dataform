/**
 * SQL Phonetic Algorithms Generator
 * 
 * This module provides SQL expression generators for phonetic algorithms
 * that use BigQuery's native SQL functions.
 */

/**
 * Generate SQL for Soundex algorithm
 * @param {string} fieldName - Field name or expression
 * @returns {string} SQL expression for Soundex
 */
function soundex(fieldName) {
  if (!fieldName || typeof fieldName !== 'string') return '';
  
  // Return BigQuery's native SOUNDEX function
  return `SOUNDEX(${fieldName})`;
}

/**
 * Generate SQL for Double Metaphone (approximated with SOUNDEX)
 * @param {string} fieldName - Field name or expression
 * @returns {Array<string>} Array of SQL expressions for primary and secondary codes
 */
function doubleMetaphone(fieldName) {
  if (!fieldName || typeof fieldName !== 'string') return ['', ''];
  
  // For BigQuery, we approximate with SOUNDEX since there's no native Double Metaphone
  const primary = `SOUNDEX(${fieldName})`;
  // Secondary could use a slightly different approach
  const secondary = `SOUNDEX(REVERSE(${fieldName}))`;
  
  return [primary, secondary];
}

/**
 * Generate SQL for NYSIIS (approximated with SOUNDEX)
 * @param {string} fieldName - Field name or expression
 * @returns {string} SQL expression for NYSIIS approximation
 */
function nysiis(fieldName) {
  if (!fieldName || typeof fieldName !== 'string') return '';
  
  // BigQuery doesn't have NYSIIS, so we approximate with SOUNDEX
  return `SOUNDEX(${fieldName})`;
}

/**
 * Generate SQL for Caverphone (approximated with SOUNDEX)
 * @param {string} fieldName - Field name or expression
 * @returns {string} SQL expression for Caverphone approximation
 */
function caverphone(fieldName) {
  if (!fieldName || typeof fieldName !== 'string') return '';
  
  // BigQuery doesn't have Caverphone, so we approximate with SOUNDEX
  return `SOUNDEX(${fieldName})`;
}

/**
 * Generate SQL for Levenshtein distance
 * @param {string} field1 - First field name or expression
 * @param {string} field2 - Second field name or expression
 * @returns {string} SQL expression for Levenshtein distance
 */
function levenshtein(field1, field2) {
  if (!field1 || !field2) return '';
  
  // Use BigQuery's native LEVENSHTEIN function
  return `LEVENSHTEIN(${field1}, ${field2})`;
}

/**
 * Generate SQL for Jaro-Winkler similarity (approximated)
 * @param {string} field1 - First field name or expression
 * @param {string} field2 - Second field name or expression
 * @returns {string} SQL expression for similarity
 */
function jaroWinkler(field1, field2) {
  if (!field1 || !field2) return '';
  
  // BigQuery doesn't have Jaro-Winkler, so we use an approximation
  // based on a combination of other similarity measures
  return `
    CASE 
      WHEN ${field1} = ${field2} THEN 1.0
      ELSE 1.0 - (CAST(LEVENSHTEIN(${field1}, ${field2}) AS FLOAT64) / 
                  GREATEST(LENGTH(${field1}), LENGTH(${field2})))
    END`;
}

module.exports = {
  soundex,
  doubleMetaphone,
  nysiis,
  caverphone,
  levenshtein,
  jaroWinkler
}; 