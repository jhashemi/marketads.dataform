/**
 * Multi-Table Validators
 * 
 * This module provides validation functions for the multi-table waterfall strategy tests.
 * Each function checks specific aspects of the generated SQL and returns a validation result.
 */

const { ValidationError } = require('../../includes/validation/validation_errors');

/**
 * Validates the basic structure of a multi-table waterfall SQL query
 * 
 * @param {string} sql - The generated SQL query
 * @param {object} params - The parameters used to generate the query
 * @returns {object} Validation result
 */
function validateBasicMultiTableStructure(sql, params) {
  try {
    // Check for required SQL components
    if (!sql.includes('WITH')) {
      throw new ValidationError('SQL must include WITH clause for CTEs');
    }
    
    if (!sql.includes('SELECT')) {
      throw new ValidationError('SQL must include SELECT statement');
    }
    
    if (!sql.includes('FROM')) {
      throw new ValidationError('SQL must include FROM clause');
    }
    
    if (!sql.includes('JOIN')) {
      throw new ValidationError('SQL must include at least one JOIN');
    }
    
    // Check for source table
    if (!sql.includes(params.sourceTable)) {
      throw new ValidationError(`SQL must reference source table: ${params.sourceTable}`);
    }
    
    // Check for waterfall strategy components
    if (!sql.includes('match_rank')) {
      throw new ValidationError('SQL must include match_rank for waterfall prioritization');
    }
    
    if (!sql.includes('confidence_score')) {
      throw new ValidationError('SQL must include confidence_score calculation');
    }
    
    // Check for comments
    if (!sql.includes('-- Multi-Table Waterfall Strategy')) {
      throw new ValidationError('SQL must include strategy comment');
    }
    
    return {
      success: true,
      message: 'Basic multi-table structure validation passed'
    };
  } catch (error) {
    return {
      success: false,
      message: error.message,
      error
    };
  }
}

/**
 * Validates field mapping functionality in the SQL query
 * 
 * @param {string} sql - The generated SQL query
 * @param {object} params - The parameters used to generate the query
 * @returns {object} Validation result
 */
function validateFieldMapping(sql, params) {
  try {
    // First validate basic structure
    const basicValidation = validateBasicMultiTableStructure(sql, params);
    if (!basicValidation.success) {
      return basicValidation;
    }
    
    // Check for field mappings in the SQL
    const { fieldMappings } = params;
    
    if (!fieldMappings) {
      throw new ValidationError('Field mappings parameter is required');
    }
    
    // Check each table's field mappings
    Object.entries(fieldMappings).forEach(([tableId, mappings]) => {
      mappings.forEach(mapping => {
        const { sourceField, targetField } = mapping;
        
        // Check for source field reference
        if (!sql.includes(sourceField)) {
          throw new ValidationError(`SQL must reference source field: ${sourceField}`);
        }
        
        // Check for target field reference
        if (!sql.includes(targetField)) {
          throw new ValidationError(`SQL must reference target field: ${targetField}`);
        }
        
        // Check for mapping in SELECT or JOIN
        const mappingPattern = new RegExp(`${sourceField}.*${targetField}|${targetField}.*${sourceField}`);
        if (!mappingPattern.test(sql)) {
          throw new ValidationError(`SQL must include mapping between ${sourceField} and ${targetField}`);
        }
      });
    });
    
    return {
      success: true,
      message: 'Field mapping validation passed'
    };
  } catch (error) {
    return {
      success: false,
      message: error.message,
      error
    };
  }
}

/**
 * Validates confidence multipliers in the SQL query
 * 
 * @param {string} sql - The generated SQL query
 * @param {object} params - The parameters used to generate the query
 * @returns {object} Validation result
 */
function validateConfidenceMultipliers(sql, params) {
  try {
    // First validate basic structure
    const basicValidation = validateBasicMultiTableStructure(sql, params);
    if (!basicValidation.success) {
      return basicValidation;
    }
    
    // Check for confidence multipliers in the SQL
    const { confidenceMultipliers } = params;
    
    if (!confidenceMultipliers) {
      throw new ValidationError('Confidence multipliers parameter is required');
    }
    
    // Check each table's confidence multiplier
    Object.entries(confidenceMultipliers).forEach(([tableId, multiplier]) => {
      // Convert multiplier to string for exact matching
      const multiplierStr = multiplier.toString();
      
      // Check for multiplier reference in SQL
      if (!sql.includes(multiplierStr)) {
        throw new ValidationError(`SQL must include confidence multiplier: ${multiplierStr} for table: ${tableId}`);
      }
      
      // Check for multiplier in confidence calculation
      const multiplierPattern = new RegExp(`confidence.*${multiplierStr}|${multiplierStr}.*confidence`);
      if (!multiplierPattern.test(sql)) {
        throw new ValidationError(`SQL must use multiplier ${multiplierStr} in confidence calculation for table: ${tableId}`);
      }
    });
    
    return {
      success: true,
      message: 'Confidence multipliers validation passed'
    };
  } catch (error) {
    return {
      success: false,
      message: error.message,
      error
    };
  }
}

/**
 * Validates required fields functionality in the SQL query
 * 
 * @param {string} sql - The generated SQL query
 * @param {object} params - The parameters used to generate the query
 * @returns {object} Validation result
 */
function validateRequiredFields(sql, params) {
  try {
    // First validate basic structure
    const basicValidation = validateBasicMultiTableStructure(sql, params);
    if (!basicValidation.success) {
      return basicValidation;
    }
    
    // Check for required fields in the SQL
    const { requiredFields } = params;
    
    if (!requiredFields) {
      throw new ValidationError('Required fields parameter is required');
    }
    
    // Check each table's required fields
    Object.entries(requiredFields).forEach(([tableId, fields]) => {
      fields.forEach(field => {
        // Check for field reference in SQL
        if (!sql.includes(field)) {
          throw new ValidationError(`SQL must reference required field: ${field} for table: ${tableId}`);
        }
        
        // Check for field in WHERE or JOIN condition
        const fieldPattern = new RegExp(`WHERE.*${field}|JOIN.*${field}|AND.*${field}|OR.*${field}`);
        if (!fieldPattern.test(sql)) {
          throw new ValidationError(`SQL must use required field ${field} in filtering condition for table: ${tableId}`);
        }
      });
    });
    
    return {
      success: true,
      message: 'Required fields validation passed'
    };
  } catch (error) {
    return {
      success: false,
      message: error.message,
      error
    };
  }
}

/**
 * Validates multiple matches functionality in the SQL query
 * 
 * @param {string} sql - The generated SQL query
 * @param {object} params - The parameters used to generate the query
 * @returns {object} Validation result
 */
function validateMultipleMatches(sql, params) {
  try {
    // First validate basic structure
    const basicValidation = validateBasicMultiTableStructure(sql, params);
    if (!basicValidation.success) {
      return basicValidation;
    }
    
    // Check for multiple matches parameters
    const { allowMultipleMatches, maxMatches } = params;
    
    if (allowMultipleMatches !== true) {
      throw new ValidationError('allowMultipleMatches must be true');
    }
    
    if (!maxMatches || maxMatches < 1) {
      throw new ValidationError('maxMatches must be a positive integer');
    }
    
    // Check for multiple matches handling in SQL
    if (!sql.includes('ROW_NUMBER()')) {
      throw new ValidationError('SQL must use ROW_NUMBER() for multiple matches');
    }
    
    // Check for max matches limit
    const maxMatchesStr = maxMatches.toString();
    const maxMatchesPattern = new RegExp(`match_rank\\s*<=\\s*${maxMatchesStr}|match_rank\\s*<\\s*${parseInt(maxMatchesStr) + 1}`);
    if (!maxMatchesPattern.test(sql)) {
      throw new ValidationError(`SQL must limit matches to ${maxMatches}`);
    }
    
    return {
      success: true,
      message: 'Multiple matches validation passed'
    };
  } catch (error) {
    return {
      success: false,
      message: error.message,
      error
    };
  }
}

/**
 * Validates comprehensive functionality in the SQL query
 * 
 * @param {string} sql - The generated SQL query
 * @param {object} params - The parameters used to generate the query
 * @returns {object} Validation result
 */
function validateComprehensive(sql, params) {
  try {
    // Run all validations
    const validations = [
      validateBasicMultiTableStructure(sql, params),
      validateFieldMapping(sql, params),
      validateConfidenceMultipliers(sql, params),
      validateRequiredFields(sql, params),
      validateMultipleMatches(sql, params)
    ];
    
    // Check for any validation failures
    const failures = validations.filter(v => !v.success);
    if (failures.length > 0) {
      throw new ValidationError(`Comprehensive validation failed: ${failures.map(f => f.message).join(', ')}`);
    }
    
    // Additional comprehensive checks
    
    // Check for thresholds
    const { thresholds } = params;
    if (thresholds) {
      Object.entries(thresholds).forEach(([level, value]) => {
        if (!sql.includes(value.toString())) {
          throw new ValidationError(`SQL must include ${level} threshold: ${value}`);
        }
      });
    }
    
    // Check for complex SQL features
    const complexFeatures = [
      'WITH', 'PARTITION BY', 'ORDER BY', 'ROW_NUMBER()', 
      'CASE WHEN', 'COALESCE', 'JOIN', 'LEFT JOIN'
    ];
    
    complexFeatures.forEach(feature => {
      if (!sql.includes(feature)) {
        throw new ValidationError(`SQL must include complex feature: ${feature}`);
      }
    });
    
    return {
      success: true,
      message: 'Comprehensive validation passed'
    };
  } catch (error) {
    return {
      success: false,
      message: error.message,
      error
    };
  }
}

// Export validation functions
module.exports = {
  validateBasicMultiTableStructure,
  validateFieldMapping,
  validateConfidenceMultipliers,
  validateRequiredFields,
  validateMultipleMatches,
  validateComprehensive
}; 