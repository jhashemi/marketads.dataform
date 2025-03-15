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
const { validateParameters } = require('../../includes/validation/parameter_validator');

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
  },
  factoryOptions: {
    useClassBasedFactoryPattern: true
  }
};

/**
 * Multi-Table Test Factory class
 */
class MultiTableTestFactory {
  /**
   * Create a new MultiTableTestFactory
   * @param {Object} options - Factory options
   * @param {Object} options.defaultParameters - Default parameters for tests
   */
  constructor(options = {}) {
    this.defaultParameters = options.defaultParameters || DEFAULT_TEST_PARAMETERS;
    this.matchStrategyFactory = options.matchStrategyFactory || matchStrategyFactory;
  }

  /**
   * Create a multi-table waterfall test
   * @param {Object} testParameters - Test-specific parameters
   * @param {Function} validationFn - Function to validate the generated SQL
   * @returns {Function} Test function
   */
  createTest(testParameters, validationFn) {
    // Store reference to this for use in the closure
    const self = this;
    
    return withErrorHandling(async function(context) {
      // Merge default parameters with test-specific parameters
      const parameters = {
        ...self.defaultParameters,
        ...(context.parameters || {}),
        ...testParameters
      };
      
      // Validate required parameters
      self._validateParameters(parameters);
      
      // Create strategy using factory pattern
      const strategy = self.matchStrategyFactory.createMultiTableWaterfallStrategy({
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
      return validationFn ? validationFn(sql, parameters) : self._defaultValidation(sql, parameters);
    });
  }
  
  /**
   * Validate parameters for multi-table waterfall test
   * @private
   * @param {Object} parameters - Test parameters
   * @throws {Error} If required parameters are missing
   */
  _validateParameters(parameters) {
    // Define validation rules
    const validationRules = {
      required: ['sourceTable', 'referenceTables', 'matchingRules', 'thresholds'],
      types: {
        sourceTable: 'string',
        referenceTables: 'array',
        matchingRules: 'object',
        thresholds: 'object',
        fieldMappings: 'object',
        requiredFields: 'object',
        confidenceMultipliers: 'object',
        factoryOptions: 'object'
      },
      defaults: {
        fieldMappings: {},
        requiredFields: {},
        confidenceMultipliers: {},
        factoryOptions: { useClassBasedFactoryPattern: true }
      },
      messages: {
        sourceTable: 'Source table is required for multi-table waterfall test',
        referenceTables: 'Reference tables are required for multi-table waterfall test',
        matchingRules: 'Matching rules are required for multi-table waterfall test',
        thresholds: 'Thresholds are required for multi-table waterfall test'
      }
    };

    // Validate and apply defaults
    const validatedParams = validateParameters(parameters, validationRules, 'MultiTableTestFactory');
    
    // Validate reference tables
    if (!Array.isArray(validatedParams.referenceTables) || validatedParams.referenceTables.length === 0) {
      throw new Error('Reference tables must be a non-empty array');
    }
    
    validatedParams.referenceTables.forEach((refTable, index) => {
      if (!refTable.id) {
        throw new Error(`Reference table at index ${index} must have an id`);
      }
      
      if (!refTable.table) {
        throw new Error(`Reference table ${refTable.id} must have a table name`);
      }
    });
    
    // Ensure there are matching rules for each reference table
    validatedParams.referenceTables.forEach(refTable => {
      if (!validatedParams.matchingRules[refTable.id]) {
        throw new Error(`Matching rules are required for reference table ${refTable.id}`);
      }
    });
    
    return validatedParams;
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
    if (!sql.includes('WITH source_data AS')) {
      return {
        success: false,
        message: 'SQL does not include source data CTE'
      };
    }
    
    // Check for multi-table waterfall comment
    if (!sql.includes('Multi-table waterfall match strategy')) {
      return {
        success: false,
        message: 'SQL does not include multi-table waterfall comment'
      };
    }
    
    // Check that SQL has source table
    if (!sql.includes(`FROM ${parameters.sourceTable}`)) {
      return {
        success: false,
        message: `SQL does not include source table: ${parameters.sourceTable}`
      };
    }
    
    // Check that SQL has CTEs for all reference tables
    for (const refTable of parameters.referenceTables) {
      if (!sql.includes(`FROM ${refTable.table}`)) {
        return {
          success: false,
          message: `SQL does not include reference table: ${refTable.table}`
        };
      }
    }
    
    return {
      success: true,
      message: 'SQL validation passed'
    };
  }
}

// Export factory class and default parameters
module.exports = {
  MultiTableTestFactory,
  DEFAULT_TEST_PARAMETERS
}; 