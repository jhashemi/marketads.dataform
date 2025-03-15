/**
 * Multi-Table Waterfall Strategy Validators
 * 
 * This module provides validation functions for testing the multi-table waterfall
 * matching strategy. Each validator checks specific aspects of the generated SQL
 * to ensure it meets the requirements.
 */

const { validateSQL } = require('../../includes/validation/sql_validators');

/**
 * Validates the basic structure of multi-table waterfall SQL
 * @param {string} sql - Generated SQL to validate
 * @param {Object} params - Test parameters
 * @returns {Object} Validation result
 */
function validateBasicMultiTableStructure(sql, params) {
  try {
    // First validate that SQL is valid
    const sqlValidation = validateSQL(sql);
    if (!sqlValidation.success) {
      return sqlValidation;
    }

    // Check for required components
    const requiredComponents = [
      // CTEs for each reference table
      ...params.referenceTables.map(rt => `WITH ${rt.id}`),
      // Joins for each reference table
      ...params.referenceTables.map(rt => `JOIN ${rt.table}`),
      // Priority-based ordering
      'ORDER BY priority',
      // Basic match scoring
      'match_score',
      // Source table reference
      params.sourceTable
    ];

    const missingComponents = requiredComponents.filter(component => 
      !sql.toLowerCase().includes(component.toLowerCase())
    );

    if (missingComponents.length > 0) {
      return {
        success: false,
        message: `Missing required SQL components: ${missingComponents.join(', ')}`,
        missingComponents
      };
    }

    return {
      success: true,
      message: 'Basic multi-table structure validation passed'
    };
  } catch (error) {
    return {
      success: false,
      message: `Basic structure validation failed: ${error.message}`,
      error
    };
  }
}

/**
 * Validates field mapping in multi-table waterfall SQL
 * @param {string} sql - Generated SQL to validate
 * @param {Object} params - Test parameters
 * @returns {Object} Validation result
 */
function validateFieldMapping(sql, params) {
  try {
    // First validate basic structure
    const basicValidation = validateBasicMultiTableStructure(sql, params);
    if (!basicValidation.success) {
      return basicValidation;
    }

    // Check for field mappings
    const { fieldMappings } = params;
    if (!fieldMappings) {
      return {
        success: true,
        message: 'No field mappings to validate'
      };
    }

    const missingMappings = [];

    // Check each table's field mappings
    Object.entries(fieldMappings).forEach(([tableId, mappings]) => {
      mappings.forEach(mapping => {
        const { sourceField, targetField } = mapping;
        // Look for both fields in SQL
        if (!sql.toLowerCase().includes(sourceField.toLowerCase()) ||
            !sql.toLowerCase().includes(targetField.toLowerCase())) {
          missingMappings.push(`${tableId}: ${sourceField} -> ${targetField}`);
        }
      });
    });

    if (missingMappings.length > 0) {
      return {
        success: false,
        message: `Missing field mappings in SQL: ${missingMappings.join(', ')}`,
        missingMappings
      };
    }

    return {
      success: true,
      message: 'Field mapping validation passed'
    };
  } catch (error) {
    return {
      success: false,
      message: `Field mapping validation failed: ${error.message}`,
      error
    };
  }
}

/**
 * Validates confidence multipliers in multi-table waterfall SQL
 * @param {string} sql - Generated SQL to validate
 * @param {Object} params - Test parameters
 * @returns {Object} Validation result
 */
function validateConfidenceMultipliers(sql, params) {
  try {
    // First validate basic structure
    const basicValidation = validateBasicMultiTableStructure(sql, params);
    if (!basicValidation.success) {
      return basicValidation;
    }

    const { confidenceMultipliers } = params;
    if (!confidenceMultipliers) {
      return {
        success: true,
        message: 'No confidence multipliers to validate'
      };
    }

    const missingMultipliers = [];

    // Check each table's confidence multiplier
    Object.entries(confidenceMultipliers).forEach(([tableId, multiplier]) => {
      // Look for multiplier value in SQL
      if (!sql.includes(multiplier.toString())) {
        missingMultipliers.push(`${tableId}: ${multiplier}`);
      }
    });

    if (missingMultipliers.length > 0) {
      return {
        success: false,
        message: `Missing confidence multipliers in SQL: ${missingMultipliers.join(', ')}`,
        missingMultipliers
      };
    }

    return {
      success: true,
      message: 'Confidence multipliers validation passed'
    };
  } catch (error) {
    return {
      success: false,
      message: `Confidence multipliers validation failed: ${error.message}`,
      error
    };
  }
}

/**
 * Validates required fields in multi-table waterfall SQL
 * @param {string} sql - Generated SQL to validate
 * @param {Object} params - Test parameters
 * @returns {Object} Validation result
 */
function validateRequiredFields(sql, params) {
  try {
    // First validate basic structure
    const basicValidation = validateBasicMultiTableStructure(sql, params);
    if (!basicValidation.success) {
      return basicValidation;
    }

    const { requiredFields } = params;
    if (!requiredFields) {
      return {
        success: true,
        message: 'No required fields to validate'
      };
    }

    const missingFields = [];

    // Check each table's required fields
    Object.entries(requiredFields).forEach(([tableId, fields]) => {
      fields.forEach(field => {
        // Look for IS NOT NULL checks
        if (!sql.toLowerCase().includes(`${field.toLowerCase()} IS NOT NULL`)) {
          missingFields.push(`${tableId}: ${field}`);
        }
      });
    });

    if (missingFields.length > 0) {
      return {
        success: false,
        message: `Missing required field checks in SQL: ${missingFields.join(', ')}`,
        missingFields
      };
    }

    return {
      success: true,
      message: 'Required fields validation passed'
    };
  } catch (error) {
    return {
      success: false,
      message: `Required fields validation failed: ${error.message}`,
      error
    };
  }
}

/**
 * Validates multiple matches functionality in multi-table waterfall SQL
 * @param {string} sql - Generated SQL to validate
 * @param {Object} params - Test parameters
 * @returns {Object} Validation result
 */
function validateMultipleMatches(sql, params) {
  try {
    // First validate basic structure
    const basicValidation = validateBasicMultiTableStructure(sql, params);
    if (!basicValidation.success) {
      return basicValidation;
    }

    const { allowMultipleMatches, maxMatches } = params;
    if (!allowMultipleMatches) {
      return {
        success: true,
        message: 'Multiple matches not enabled'
      };
    }

    // Check for ROW_NUMBER() OVER (PARTITION BY source_id ORDER BY match_score DESC)
    if (!sql.toLowerCase().includes('row_number()') ||
        !sql.toLowerCase().includes('partition by') ||
        !sql.toLowerCase().includes('order by match_score desc')) {
      return {
        success: false,
        message: 'Missing row number partitioning for multiple matches'
      };
    }

    // Check for maxMatches limit
    if (maxMatches && !sql.toLowerCase().includes(`<= ${maxMatches}`)) {
      return {
        success: false,
        message: `Missing max matches limit (${maxMatches})`
      };
    }

    return {
      success: true,
      message: 'Multiple matches validation passed'
    };
  } catch (error) {
    return {
      success: false,
      message: `Multiple matches validation failed: ${error.message}`,
      error
    };
  }
}

/**
 * Comprehensive validation of multi-table waterfall SQL
 * @param {string} sql - Generated SQL to validate
 * @param {Object} params - Test parameters
 * @returns {Object} Validation result
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

    // Check for any failures
    const failures = validations.filter(v => !v.success);
    if (failures.length > 0) {
      return {
        success: false,
        message: 'Comprehensive validation failed',
        failures
      };
    }

    return {
      success: true,
      message: 'Comprehensive validation passed'
    };
  } catch (error) {
    return {
      success: false,
      message: `Comprehensive validation failed: ${error.message}`,
      error
    };
  }
}

module.exports = {
  validateBasicMultiTableStructure,
  validateFieldMapping,
  validateConfidenceMultipliers,
  validateRequiredFields,
  validateMultipleMatches,
  validateComprehensive
}; 