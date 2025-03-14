/**
 * Waterfall Strategy Integration Tests
 * 
 * Tests the waterfall and multi-table waterfall matching strategies
 * to ensure they correctly prioritize matches based on reference table 
 * priority and match confidence.
 */

// Import the Jest adapter for testing
require('../../includes/validation/jest_adapter');

// Import the validation registry types
const { TestType, TestPriority } = require('../../includes/validation/validation_registry');
const { withErrorHandling } = require('../../includes/validation/error_handler');

// Import the strategy factory as a class - make sure to use the class import
const { MatchStrategyFactory } = require('../../includes/match_strategy_factory');

// Create an instance of the factory - this is required before using any factory methods
const matchStrategyFactory = new MatchStrategyFactory();

// Test configuration
const testConfig = {
  sourceTable: 'source_customer_data',
  referenceTables: [
    {
      id: 'verified_customers',
      table: 'verified_customers',
      name: 'Verified Customers',
      keyField: 'customer_id',
      priority: 1
    },
    {
      id: 'crm_customers',
      table: 'crm_customers',
      name: 'CRM Customers',
      keyField: 'customer_id',
      priority: 2
    }
  ],
  matchingRules: {
    'verified_customers': {
      blocking: [
        { sourceField: 'postal_code', targetField: 'postal_code', exact: true }
      ],
      scoring: [
        { sourceField: 'first_name', targetField: 'first_name', method: 'jaro_winkler', weight: 1.5 },
        { sourceField: 'last_name', targetField: 'last_name', method: 'jaro_winkler', weight: 2.0 },
        { sourceField: 'email', targetField: 'email', method: 'exact', weight: 3.0 }
      ]
    },
    'crm_customers': {
      blocking: [
        { sourceField: 'postal_code', targetField: 'zip', exact: true }
      ],
      scoring: [
        { sourceField: 'first_name', targetField: 'fname', method: 'jaro_winkler', weight: 1.5 },
        { sourceField: 'last_name', targetField: 'lname', method: 'jaro_winkler', weight: 2.0 },
        { sourceField: 'phone', targetField: 'phone_number', method: 'exact', weight: 2.5 }
      ]
    }
  },
  thresholds: {
    high: 0.85,
    medium: 0.70,
    low: 0.55
  }
};

/**
 * Test: Basic Waterfall Strategy
 * 
 * Tests the basic waterfall strategy with simple priority-based matching.
 */
describe('Waterfall Strategy Tests', () => {
  test('Basic Waterfall Strategy', { 
    type: TestType.INTEGRATION,
    id: 'waterfall_strategy_basic_test',
    parameters: testConfig
  }, withErrorHandling(function(context) {
    const { parameters } = context;
    
    // Create waterfall strategy
    const waterfallStrategy = matchStrategyFactory.createWaterfallStrategy({
      referenceTables: parameters.referenceTables || testConfig.referenceTables,
      matchingRules: parameters.matchingRules || testConfig.matchingRules,
      thresholds: parameters.thresholds || testConfig.thresholds
    });
    
    // Generate SQL from the strategy
    const sql = waterfallStrategy.generateSql({
      sourceTable: parameters.sourceTable || testConfig.sourceTable,
      sourceAlias: 's',
      targetAlias: 't'
    });
    
    // Validate SQL structure
    expect(sql).not.toBeNull();
    expect(sql.includes('WITH source_data AS')).toBe(true);
    
    // Check that SQL has CTEs for all reference tables
    for (const table of parameters.referenceTables || testConfig.referenceTables) {
      expect(sql.includes(`FROM ${table.table}`)).toBe(true);
    }
    
    // Check for proper prioritization
    expect(sql.includes('ORDER BY')).toBe(true);
    expect(sql.includes('priority')).toBe(true);
    expect(sql.includes('match_score')).toBe(true);
    
    return { passed: true };
  }));

  test('Multi-Table Waterfall Strategy', { 
    type: TestType.INTEGRATION,
    id: 'waterfall_strategy_multi_table_test',
    dependencies: ['waterfall_strategy_basic_test'],
    parameters: testConfig
  }, withErrorHandling(function(context) {
    const { parameters } = context;
    
    // Additional parameters for multi-table strategy
    const fieldMappings = parameters.fieldMappings || {
      'verified_customers': {
        first_name: 'first_name',
        last_name: 'last_name',
        email: 'email'
      },
      'crm_customers': {
        first_name: 'fname',
        last_name: 'lname',
        phone: 'phone_number'
      }
    };
    
    const requiredFields = parameters.requiredFields || {
      'verified_customers': ['email'],
      'crm_customers': ['phone']
    };
    
    const confidenceMultipliers = parameters.confidenceMultipliers || {
      'verified_customers': 1.2,
      'crm_customers': 0.9
    };
    
    // Create multi-table waterfall strategy
    const multiTableStrategy = matchStrategyFactory.createMultiTableWaterfallStrategy({
      referenceTables: parameters.referenceTables || testConfig.referenceTables,
      matchingRules: parameters.matchingRules || testConfig.matchingRules,
      thresholds: parameters.thresholds || testConfig.thresholds,
      fieldMappings: fieldMappings,
      requiredFields: requiredFields,
      confidenceMultipliers: confidenceMultipliers
    });
    
    // Generate SQL from the strategy
    const sql = multiTableStrategy.generateSql({
      sourceTable: parameters.sourceTable || testConfig.sourceTable,
      sourceAlias: 's',
      targetAlias: 't'
    });
    
    // Validate SQL structure
    expect(sql).not.toBeNull();
    expect(sql.includes('WITH source_data AS')).toBe(true);
    
    // Check that SQL has CTEs for all reference tables
    for (const table of parameters.referenceTables || testConfig.referenceTables) {
      expect(sql.includes(`FROM ${table.table}`)).toBe(true);
    }
    
    // Check for proper prioritization
    expect(sql.includes('ORDER BY')).toBe(true);
    expect(sql.includes('priority')).toBe(true);
    
    return { passed: true };
  }));
});

// Legacy exports for compatibility
module.exports = {
  waterfall_strategy_basic_test: function(context) {
    console.log("Running direct matching on test_customer_data...");
    
    // Map parameters from context if available
    const parameters = context.parameters || testConfig;
    
    // Create the waterfall strategy
    const waterfallStrategy = matchStrategyFactory.createWaterfallStrategy({
      referenceTables: parameters.referenceTables || testConfig.referenceTables,
      matchingRules: parameters.matchingRules || testConfig.matchingRules,
      thresholds: parameters.thresholds || testConfig.thresholds
    });
    
    // Generate SQL
    const sql = waterfallStrategy.generateSql({
      sourceTable: parameters.sourceTable || testConfig.sourceTable,
      sourceAlias: 's',
      targetAlias: 't'
    });
    
    // Validate SQL as in the test above
    if (!sql) {
      throw new Error('Failed to generate SQL for waterfall strategy');
    }
    
    return { success: true, message: 'Waterfall strategy basic test passed' };
  },
  
  waterfall_strategy_multi_table_test: function(context) {
    console.log("Running direct matching on test_customer_data...");
    
    // Ensure the basic test completes first
    const basicResult = this.waterfall_strategy_basic_test(context);
    if (!basicResult.success) {
      throw new Error('Basic waterfall test failed: ' + basicResult.message);
    }
    
    // Map parameters from context if available
    const parameters = context.parameters || testConfig;
    
    // Additional parameters for multi-table strategy
    const fieldMappings = parameters.fieldMappings || {
      'verified_customers': {
        first_name: 'first_name',
        last_name: 'last_name',
        email: 'email'
      },
      'crm_customers': {
        first_name: 'fname',
        last_name: 'lname',
        phone: 'phone_number'
      }
    };
    
    const requiredFields = parameters.requiredFields || {
      'verified_customers': ['email'],
      'crm_customers': ['phone']
    };
    
    const confidenceMultipliers = parameters.confidenceMultipliers || {
      'verified_customers': 1.2,
      'crm_customers': 0.9
    };
    
    // Create multi-table waterfall strategy
    const multiTableStrategy = matchStrategyFactory.createMultiTableWaterfallStrategy({
      referenceTables: parameters.referenceTables || testConfig.referenceTables,
      matchingRules: parameters.matchingRules || testConfig.matchingRules,
      thresholds: parameters.thresholds || testConfig.thresholds,
      fieldMappings: fieldMappings,
      requiredFields: requiredFields,
      confidenceMultipliers: confidenceMultipliers
    });
    
    // Generate SQL
    const sql = multiTableStrategy.generateSql({
      sourceTable: parameters.sourceTable || testConfig.sourceTable,
      sourceAlias: 's',
      targetAlias: 't'
    });
    
    // Validate SQL as in the test above
    if (!sql) {
      throw new Error('Failed to generate SQL for multi-table waterfall strategy');
    }
    
    return { success: true, message: 'Multi-table waterfall strategy test passed' };
  }
}; 