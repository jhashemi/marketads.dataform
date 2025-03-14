/**
 * Multi-Table Waterfall Strategy SQL Validators
 * 
 * This module provides specialized validator functions for multi-table waterfall strategy tests.
 * It contains functions to validate different aspects of the generated SQL.
 */

const { validateSQL } = require('../../includes/validation/sql_validators');

/**
 * Validate basic multi-table waterfall SQL structure
 * @param {string} sql - Generated SQL
 * @param {Object} parameters - Test parameters
 * @returns {Object} Validation result
 */
function validateBasicMultiTableStructure(sql, parameters) {
  // Basic SQL validation
  validateSQL(sql);
  
  // Check that SQL has CTE for source data
  expect(sql).not.toBeNull();
  expect(sql.includes('WITH source_data AS')).toBe(true);
  
  // Check for multi-table waterfall comment
  expect(sql.includes('Multi-table waterfall match strategy')).toBe(true);
  
  // Check that SQL has source table
  expect(sql.includes(`FROM ${parameters.sourceTable}`)).toBe(true);
  
  // Check that SQL has CTEs for all reference tables
  for (const refTable of parameters.referenceTables) {
    expect(sql.includes(`FROM ${refTable.table}`)).toBe(true);
  }
  
  // Check for priority-based ranking
  expect(sql.includes('table_priority')).toBe(true);
  expect(sql.includes('match_priority')).toBe(true);
  expect(sql.includes('match_score')).toBe(true);
  
  // Check for final ranking
  expect(sql.includes('ranked_matches')).toBe(true);
  expect(sql.includes('ROW_NUMBER()')).toBe(true);
  
  return {
    success: true,
    message: 'Basic multi-table waterfall structure validation passed'
  };
}

/**
 * Validate field mapping in multi-table waterfall SQL
 * @param {string} sql - Generated SQL
 * @param {Object} parameters - Test parameters
 * @returns {Object} Validation result
 */
function validateFieldMapping(sql, parameters) {
  // Basic validation first
  validateBasicMultiTableStructure(sql, parameters);
  
  // Check for field mappings
  if (parameters.fieldMappings) {
    for (const [tableId, mappings] of Object.entries(parameters.fieldMappings)) {
      for (const mapping of mappings) {
        expect(sql.includes(mapping.targetField)).toBe(true);
      }
    }
  }
  
  return {
    success: true,
    message: 'Field mapping validation passed'
  };
}

/**
 * Validate confidence multipliers in multi-table waterfall SQL
 * @param {string} sql - Generated SQL
 * @param {Object} parameters - Test parameters
 * @returns {Object} Validation result
 */
function validateConfidenceMultipliers(sql, parameters) {
  // Basic validation first
  validateBasicMultiTableStructure(sql, parameters);
  
  // Check for confidence multipliers
  if (parameters.confidenceMultipliers) {
    for (const [tableId, multiplier] of Object.entries(parameters.confidenceMultipliers)) {
      expect(sql.includes(`* ${multiplier}`)).toBe(true);
    }
  }
  
  return {
    success: true,
    message: 'Confidence multipliers validation passed'
  };
}

/**
 * Validate required fields in multi-table waterfall SQL
 * @param {string} sql - Generated SQL
 * @param {Object} parameters - Test parameters
 * @returns {Object} Validation result
 */
function validateRequiredFields(sql, parameters) {
  // Basic validation first
  validateBasicMultiTableStructure(sql, parameters);
  
  // Check for required fields
  if (parameters.requiredFields) {
    for (const [tableId, fields] of Object.entries(parameters.requiredFields)) {
      for (const field of fields) {
        expect(sql.includes(field)).toBe(true);
      }
    }
  }
  
  return {
    success: true,
    message: 'Required fields validation passed'
  };
}

/**
 * Validate multiple matches in multi-table waterfall SQL
 * @param {string} sql - Generated SQL
 * @param {Object} parameters - Test parameters
 * @returns {Object} Validation result
 */
function validateMultipleMatches(sql, parameters) {
  // Basic validation first
  validateBasicMultiTableStructure(sql, parameters);
  
  // Check for multiple matches logic
  if (parameters.allowMultipleMatches && parameters.maxMatches > 1) {
    expect(sql.includes(`match_rank <= ${parameters.maxMatches}`)).toBe(true);
  } else {
    expect(sql.includes('match_rank = 1')).toBe(true);
  }
  
  return {
    success: true,
    message: 'Multiple matches validation passed'
  };
}

/**
 * Comprehensive validation of multi-table waterfall SQL
 * Checks all aspects of the generated SQL
 * @param {string} sql - Generated SQL
 * @param {Object} parameters - Test parameters
 * @returns {Object} Validation result
 */
function validateComprehensive(sql, parameters) {
  // Run all validations
  validateBasicMultiTableStructure(sql, parameters);
  validateFieldMapping(sql, parameters);
  validateConfidenceMultipliers(sql, parameters);
  validateRequiredFields(sql, parameters);
  validateMultipleMatches(sql, parameters);
  
  // Check for source data CTE
  expect(sql.includes('source_data AS (')).toBe(true);
  
  // Check for all reference tables
  parameters.referenceTables.forEach((refTable, index) => {
    expect(sql.includes(`matches_${index + 1} AS (`)).toBe(true);
    expect(sql.includes(`${refTable.table} AS`)).toBe(true);
  });
  
  // Check for match confidence levels
  expect(sql.includes('CASE')).toBe(true);
  expect(sql.includes(`>= ${parameters.thresholds.high} THEN 'HIGH'`)).toBe(true);
  expect(sql.includes(`>= ${parameters.thresholds.medium} THEN 'MEDIUM'`)).toBe(true);
  expect(sql.includes(`>= ${parameters.thresholds.low} THEN 'LOW'`)).toBe(true);
  
  // Check for union of reference table matches
  expect(sql.includes('UNION ALL')).toBe(true);
  
  // Check for ranking logic
  expect(sql.includes('ORDER BY')).toBe(true);
  expect(sql.includes('table_priority')).toBe(true);
  
  return {
    success: true,
    message: 'Comprehensive validation passed'
  };
}

// Export all validator functions
module.exports = {
  validateBasicMultiTableStructure,
  validateFieldMapping,
  validateConfidenceMultipliers,
  validateRequiredFields,
  validateMultipleMatches,
  validateComprehensive
}; 