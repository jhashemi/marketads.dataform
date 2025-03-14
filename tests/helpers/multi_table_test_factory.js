/**
 * Multi-Table Test Factory
 * 
 * This module provides a factory for creating multi-table waterfall strategy tests
 * with consistent structure and validation. It encapsulates the common test setup
 * and validation logic, making it easier to create and maintain tests.
 */

const { MatchStrategyFactory } = require('../../includes/match_strategy_factory');
const { validateSQL } = require('../../includes/validation/sql_validators');
const { withErrorHandling } = require('../../includes/validation/test_helpers');

// Create a strategy factory instance
const matchStrategyFactory = new MatchStrategyFactory();

/**
 * Default test parameters for multi-table waterfall tests
 * These can be overridden by the test-specific parameters
 */
const DEFAULT_TEST_PARAMETERS = {
  sourceTable: "test_customer_data",
  thresholds: {
    high: 0.85,
    medium: 0.7,
    low: 0.55
  },
  referenceTables: [
    {
      id: "verified_customers",
      table: "verified_customers",
      name: "Verified Customers",
      keyField: "customer_id",
      priority: 1
    },
    {
      id: "crm_customers",
      table: "crm_customers",
      name: "CRM Customers",
      keyField: "customer_id",
      priority: 2
    }
  ],
  matchingRules: {
    verified_customers: {
      blocking: [
        {
          sourceField: "postal_code",
          targetField: "postal_code",
          exact: true
        }
      ],
      scoring: [
        {
          sourceField: "first_name",
          targetField: "first_name",
          method: "jaro_winkler",
          weight: 1.5
        },
        {
          sourceField: "last_name",
          targetField: "last_name",
          method: "jaro_winkler",
          weight: 2
        },
        {
          sourceField: "email",
          targetField: "email",
          method: "exact",
          weight: 3
        }
      ]
    },
    crm_customers: {
      blocking: [
        {
          sourceField: "postal_code",
          targetField: "zip",
          exact: true
        }
      ],
      scoring: [
        {
          sourceField: "first_name",
          targetField: "fname",
          method: "jaro_winkler",
          weight: 1.5
        },
        {
          sourceField: "last_name",
          targetField: "lname",
          method: "jaro_winkler",
          weight: 2
        },
        {
          sourceField: "phone",
          targetField: "phone_number",
          method: "exact",
          weight: 2.5
        }
      ]
    }
  },
  fieldMappings: {
    verified_customers: [
      {
        sourceField: "first_name",
        targetField: "first_name_mapped"
      },
      {
        sourceField: "last_name",
        targetField: "last_name_mapped"
      },
      {
        sourceField: "email",
        targetField: "email_mapped"
      }
    ],
    crm_customers: [
      {
        sourceField: "fname",
        targetField: "first_name_mapped"
      },
      {
        sourceField: "lname",
        targetField: "last_name_mapped"
      },
      {
        sourceField: "phone_number",
        targetField: "phone_mapped"
      }
    ]
  },
  requiredFields: {
    verified_customers: [
      "email"
    ],
    crm_customers: [
      "phone"
    ]
  },
  confidenceMultipliers: {
    verified_customers: 1.2,
    crm_customers: 0.9
  }
};

/**
 * Multi-Table Test Factory class
 */
class MultiTableTestFactory {
  /**
   * Create a new MultiTableTestFactory
   * @param {Object} defaultParameters - Default parameters for tests
   */
  constructor(defaultParameters = DEFAULT_TEST_PARAMETERS) {
    this.defaultParameters = defaultParameters;
  }

  /**
   * Create a multi-table waterfall test
   * @param {Object} testParameters - Test-specific parameters
   * @param {Function} validationFn - Function to validate the generated SQL
   * @returns {Function} Test function
   */
  createTest(testParameters, validationFn) {
    return withErrorHandling(async function(context) {
      // Merge default parameters with test-specific parameters
      const parameters = {
        ...DEFAULT_TEST_PARAMETERS,
        ...(context.parameters || {}),
        ...testParameters
      };
      
      // Validate required parameters
      this._validateParameters(parameters);
      
      // Create strategy
      const strategy = matchStrategyFactory.createMultiTableWaterfallStrategy({
        referenceTables: parameters.referenceTables,
        matchingRules: parameters.matchingRules,
        thresholds: parameters.thresholds,
        fieldMappings: parameters.fieldMappings,
        requiredFields: parameters.requiredFields,
        confidenceMultipliers: parameters.confidenceMultipliers,
        allowMultipleMatches: parameters.allowMultipleMatches,
        maxMatches: parameters.maxMatches,
        confidenceField: parameters.confidenceField
      });
      
      // Generate SQL
      const sql = strategy.generateSql({
        sourceTable: parameters.sourceTable,
        sourceAlias: parameters.sourceAlias || 's',
        targetAlias: parameters.targetAlias || 't',
        options: parameters.options || {}
      });
      
      // Validate SQL with provided validator function or default validation
      return validationFn ? validationFn(sql, parameters) : this._defaultValidation(sql, parameters);
    }.bind(this));
  }
  
  /**
   * Validate parameters for multi-table waterfall test
   * @private
   * @param {Object} parameters - Test parameters
   * @throws {Error} If required parameters are missing
   */
  _validateParameters(parameters) {
    // Check for required parameters
    if (!parameters.sourceTable) {
      throw new Error('Source table is required for multi-table waterfall test');
    }
    
    if (!parameters.referenceTables || !Array.isArray(parameters.referenceTables) || parameters.referenceTables.length === 0) {
      throw new Error('Reference tables are required for multi-table waterfall test');
    }
    
    // Validate reference tables
    parameters.referenceTables.forEach((refTable, index) => {
      if (!refTable.id) {
        throw new Error(`Reference table at index ${index} must have an id`);
      }
      
      if (!refTable.table) {
        throw new Error(`Reference table ${refTable.id} must have a table name`);
      }
    });
    
    // Validate matching rules
    if (!parameters.matchingRules) {
      throw new Error('Matching rules are required for multi-table waterfall test');
    }
    
    // Ensure there are matching rules for each reference table
    parameters.referenceTables.forEach(refTable => {
      if (!parameters.matchingRules[refTable.id]) {
        throw new Error(`Matching rules are required for reference table ${refTable.id}`);
      }
    });
  }
  
  /**
   * Default validation for multi-table waterfall SQL
   * @private
   * @param {string} sql - Generated SQL
   * @param {Object} parameters - Test parameters
   * @returns {Object} Validation result
   */
  _defaultValidation(sql, parameters) {
    // Basic SQL validation
    validateSQL(sql);
    
    // Check that SQL has CTE for source data
    expect(sql).not.toBeNull();
    expect(sql.includes('WITH source_data AS')).toBe(true);
    
    // Check that SQL has CTEs for all reference tables
    for (const refTable of parameters.referenceTables) {
      expect(sql.includes(`FROM ${refTable.table}`)).toBe(true);
    }
    
    // Check for required field conditions if specified
    if (parameters.requiredFields) {
      for (const [tableId, fields] of Object.entries(parameters.requiredFields)) {
        for (const field of fields) {
          expect(sql.includes(field)).toBe(true);
        }
      }
    }
    
    // Check for confidence multipliers if specified
    if (parameters.confidenceMultipliers) {
      for (const [tableId, multiplier] of Object.entries(parameters.confidenceMultipliers)) {
        expect(sql.includes(`* ${multiplier}`)).toBe(true);
      }
    }
    
    // Check for field mappings if specified
    if (parameters.fieldMappings) {
      for (const [tableId, mappings] of Object.entries(parameters.fieldMappings)) {
        for (const mapping of mappings) {
          expect(sql.includes(mapping.targetField)).toBe(true);
        }
      }
    }
    
    return {
      success: true,
      message: 'SQL validation passed'
    };
  }
}

// Export the factory class and default parameters
module.exports = {
  MultiTableTestFactory,
  DEFAULT_TEST_PARAMETERS
}; 