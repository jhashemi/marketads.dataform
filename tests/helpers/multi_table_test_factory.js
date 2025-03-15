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
      console.log('DEBUG LEGACY TEST: Context object received:', JSON.stringify(context, null, 2));
      
      // Prioritize parameters in this order:
      // 1. Command line parameters (context.parameters)
      // 2. Test-specific hardcoded parameters (testParameters)
      // 3. Factory default parameters (self.defaultParameters)
      console.log('DEBUG LEGACY TEST: Are parameters defined?', !!context.parameters);
      console.log('DEBUG LEGACY TEST: Parameters content:', JSON.stringify(context.parameters || {}, null, 2));
      
      const parameters = {
        ...self.defaultParameters,
        ...(testParameters || {}),
        ...(context.parameters || {})
      };
      
      try {
        // Validate required parameters
        const validatedParams = self._validateParameters(parameters);
        
        // Create strategy using factory pattern
        const strategy = self.matchStrategyFactory.createMultiTableWaterfallStrategy({
          referenceTables: validatedParams.referenceTables,
          matchingRules: validatedParams.matchingRules,
          thresholds: validatedParams.thresholds,
          fieldMappings: validatedParams.fieldMappings,
          requiredFields: validatedParams.requiredFields,
          confidenceMultipliers: validatedParams.confidenceMultipliers,
          allowMultipleMatches: validatedParams.allowMultipleMatches,
          maxMatches: validatedParams.maxMatches,
          confidenceField: validatedParams.confidenceField || 'confidence'
        });
        
        // Generate SQL
        const sql = strategy.generateSql({
          sourceTable: validatedParams.sourceTable,
          sourceAlias: validatedParams.sourceAlias || 's',
          targetAlias: validatedParams.targetAlias || 't',
          options: validatedParams.options || {}
        });
        
        // Validate SQL with provided validator function or default validation
        const validationResult = validationFn 
          ? validationFn(sql, validatedParams) 
          : self._defaultValidation(sql, validatedParams);
        
        // Add generated SQL to result for debugging
        if (validationResult.success) {
          validationResult.generatedSql = sql;
        }
        
        return validationResult;
      } catch (error) {
        // Return detailed error information
        return {
          success: false,
          message: `Test failed: ${error.message}`,
          error: error,
          parameters: parameters
        };
      }
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
        factoryOptions: 'object',
        allowMultipleMatches: 'boolean',
        maxMatches: 'number'
      },
      defaults: {
        fieldMappings: {},
        requiredFields: {},
        confidenceMultipliers: {},
        factoryOptions: { useClassBasedFactoryPattern: true },
        allowMultipleMatches: false,
        maxMatches: 1
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
      throw new Error('At least one reference table is required');
    }
    
    // Validate each reference table has required properties
    validatedParams.referenceTables.forEach((table, index) => {
      if (!table.id) {
        throw new Error(`Reference table at index ${index} is missing an id property`);
      }
      
      if (!table.table) {
        throw new Error(`Reference table ${table.id} is missing a table property`);
      }
      
      if (isNaN(table.priority)) {
        // Assign default priority if not specified
        table.priority = index + 1;
      }
    });
    
    // Validate matching rules exist for each reference table
    validatedParams.referenceTables.forEach(table => {
      if (!validatedParams.matchingRules[table.id]) {
        throw new Error(`No matching rules defined for reference table ${table.id}`);
      }
      
      const rules = validatedParams.matchingRules[table.id];
      
      // Validate rules have required properties
      if (!rules.blocking || !Array.isArray(rules.blocking) || rules.blocking.length === 0) {
        throw new Error(`Reference table ${table.id} requires at least one blocking rule`);
      }
      
      if (!rules.scoring || !Array.isArray(rules.scoring) || rules.scoring.length === 0) {
        throw new Error(`Reference table ${table.id} requires at least one scoring rule`);
      }
    });
    
    // Validate thresholds
    if (!validatedParams.thresholds.high || !validatedParams.thresholds.medium || !validatedParams.thresholds.low) {
      throw new Error('Thresholds must include high, medium, and low values');
    }
    
    if (typeof validatedParams.thresholds.high !== 'number' || 
        typeof validatedParams.thresholds.medium !== 'number' || 
        typeof validatedParams.thresholds.low !== 'number') {
      throw new Error('Threshold values must be numbers');
    }
    
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
    try {
      // Check for basic SQL structure
      if (!sql || typeof sql !== 'string') {
        throw new Error('Generated SQL must be a non-empty string');
      }
      
      if (!sql.includes('SELECT') || !sql.includes('FROM')) {
        throw new Error('Generated SQL must contain a valid SELECT statement');
      }
      
      // Check for reference to the source table
      if (!sql.includes(parameters.sourceTable)) {
        throw new Error(`SQL must reference source table: ${parameters.sourceTable}`);
      }
      
      // Check for reference tables
      parameters.referenceTables.forEach(refTable => {
        if (!sql.includes(refTable.table)) {
          throw new Error(`SQL must reference reference table: ${refTable.table}`);
        }
      });
      
      // Check for proper SQL structure
      const structureChecks = [
        { pattern: 'WITH', message: 'SQL must use CTEs (WITH clause) for structuring the query' },
        { pattern: 'JOIN', message: 'SQL must include at least one JOIN operation' },
        { pattern: 'table_priority', message: 'SQL must include table_priority for reference table prioritization' },
        { pattern: 'match_score', message: 'SQL must include match_score calculation' }
      ];
      
      structureChecks.forEach(check => {
        if (!sql.includes(check.pattern)) {
          throw new Error(check.message);
        }
      });
      
      // Check for features if enabled in parameters
      
      // Check field mapping
      if (parameters.fieldMappings && Object.keys(parameters.fieldMappings).length > 0) {
        const anyMappingFound = Object.values(parameters.fieldMappings).some(mappings => {
          if (!Array.isArray(mappings) || mappings.length === 0) return false;
          
          return mappings.some(mapping => {
            // Check if either source or target field is mentioned in the SQL
            return sql.includes(mapping.sourceField) || sql.includes(mapping.targetField);
          });
        });
        
        if (!anyMappingFound) {
          throw new Error('SQL must implement field mappings when provided in parameters');
        }
      }
      
      // Check confidence multipliers
      if (parameters.confidenceMultipliers && Object.keys(parameters.confidenceMultipliers).length > 0) {
        // At least one multiplier value should be in the SQL
        const anyMultiplierFound = Object.values(parameters.confidenceMultipliers).some(multiplier => {
          return sql.includes(multiplier.toString());
        });
        
        if (!anyMultiplierFound) {
          throw new Error('SQL must implement confidence multipliers when provided in parameters');
        }
      }
      
      // Check required fields
      if (parameters.requiredFields && Object.keys(parameters.requiredFields).length > 0) {
        // At least one set of required fields should be referenced
        const anyRequiredFieldsFound = Object.entries(parameters.requiredFields).some(([tableId, fields]) => {
          if (!Array.isArray(fields) || fields.length === 0) return false;
          
          return fields.some(field => sql.includes(field));
        });
        
        if (!anyRequiredFieldsFound) {
          throw new Error('SQL must implement required fields filtering when provided in parameters');
        }
      }
      
      // Check multiple matches
      if (parameters.allowMultipleMatches) {
        if (!sql.includes('ROW_NUMBER()') && !sql.includes('RANK()') && !sql.includes('DENSE_RANK()')) {
          throw new Error('SQL must implement row numbering or ranking when multiple matches are allowed');
        }
        
        if (parameters.maxMatches > 1 && !sql.includes(parameters.maxMatches.toString())) {
          throw new Error(`SQL must implement maxMatches limit of ${parameters.maxMatches}`);
        }
      }
      
      return {
        success: true,
        message: 'SQL validation passed',
        sql: sql
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error
      };
    }
  }
}

// Export factory class and default parameters
module.exports = {
  MultiTableTestFactory,
  DEFAULT_TEST_PARAMETERS
}; 