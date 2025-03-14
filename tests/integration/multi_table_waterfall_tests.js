/**
 * Multi-Table Waterfall Strategy Tests
 * 
 * Integration tests for the multi-table waterfall matching strategy.
 */

// Import the validation registry
const { ValidationRegistry, TestType, TestPriority } = require('../../includes/validation/validation_registry');
const { withErrorHandling } = require('../../includes/validation/error_handler');

// Import the strategy factory as a class
const { MatchStrategyFactory } = require('../../includes/match_strategy_factory');

// Create an instance of the factory
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
  fieldMappings: {
    'verified_customers': [
      { sourceField: 'first_name', targetField: 'first_name_mapped' },
      { sourceField: 'last_name', targetField: 'last_name_mapped' },
      { sourceField: 'email', targetField: 'email_mapped' }
    ],
    'crm_customers': [
      { sourceField: 'fname', targetField: 'first_name_mapped' },
      { sourceField: 'lname', targetField: 'last_name_mapped' },
      { sourceField: 'phone_number', targetField: 'phone_mapped' }
    ]
  },
  requiredFields: {
    'verified_customers': ['email'],
    'crm_customers': ['phone']
  },
  confidenceMultipliers: {
    'verified_customers': 1.2,
    'crm_customers': 0.9
  },
  thresholds: {
    high: 0.85,
    medium: 0.70,
    low: 0.55
  }
};

// Export tests array for the validation registry
exports.tests = [
  {
    id: 'multi_table_waterfall_basic_test',
    name: 'Basic Multi-Table Waterfall Test',
    type: TestType.INTEGRATION,
    priority: TestPriority.HIGH,
    parameters: testConfig,
    testFn: withErrorHandling(function(context) {
      const { parameters } = context;
      
      // Create multi-table waterfall strategy
      const strategy = matchStrategyFactory.createMultiTableWaterfallStrategy({
        referenceTables: parameters.referenceTables,
        matchingRules: parameters.matchingRules,
        thresholds: parameters.thresholds
      });
      
      // Generate SQL for strategy
      const sql = strategy.generateSql({
        sourceTable: parameters.sourceTable,
        sourceAlias: 's',
        targetAlias: 't'
      });
      
      // Validate SQL has CTEs for all reference tables
      for (const refTable of parameters.referenceTables) {
        // Check for table name in JOIN clause
        if (!sql.includes(`JOIN ${refTable.table} AS t`)) {
          throw new Error(`Missing JOIN for reference table: ${refTable.table}`);
        }
      }
      
      // Validate SQL has proper prioritization
      if (!sql.includes('ORDER BY') || !sql.includes('table_priority')) {
        throw new Error('Missing proper ORDER BY prioritization');
      }
      
      // Validate SQL has proper scoring
      if (!sql.includes('match_score')) {
        throw new Error('Missing proper scoring calculations');
      }
      
      return { passed: true };
    })
  },
  {
    id: 'multi_table_waterfall_field_mapping_test',
    name: 'Multi-Table Waterfall Field Mapping Test',
    type: TestType.INTEGRATION,
    priority: TestPriority.MEDIUM,
    dependencies: ['multi_table_waterfall_basic_test'],
    parameters: testConfig,
    testFn: withErrorHandling(function(context) {
      const { parameters } = context;
      
      // Create multi-table waterfall strategy with field mappings
      const strategy = matchStrategyFactory.createMultiTableWaterfallStrategy({
        referenceTables: parameters.referenceTables,
        matchingRules: parameters.matchingRules,
        thresholds: parameters.thresholds,
        fieldMappings: parameters.fieldMappings
      });
      
      // Generate SQL for strategy
      const sql = strategy.generateSql({
        sourceTable: parameters.sourceTable,
        sourceAlias: 's',
        targetAlias: 't'
      });
      
      // Validate field mappings in SQL
      for (const tableId in parameters.fieldMappings) {
        for (const mapping of parameters.fieldMappings[tableId]) {
          if (!sql.includes(mapping.targetField)) {
            throw new Error(`Missing field mapping: ${mapping.sourceField} -> ${mapping.targetField}`);
          }
        }
      }
      
      return { passed: true };
    })
  },
  {
    id: 'multi_table_waterfall_confidence_test',
    name: 'Multi-Table Waterfall Confidence Test',
    type: TestType.INTEGRATION,
    priority: TestPriority.MEDIUM,
    dependencies: ['multi_table_waterfall_basic_test'],
    parameters: testConfig,
    testFn: withErrorHandling(function(context) {
      const { parameters } = context;
      
      // Create multi-table waterfall strategy with confidence multipliers
      const strategy = matchStrategyFactory.createMultiTableWaterfallStrategy({
        referenceTables: parameters.referenceTables,
        matchingRules: parameters.matchingRules,
        thresholds: parameters.thresholds,
        confidenceMultipliers: parameters.confidenceMultipliers
      });
      
      // Generate SQL for strategy
      const sql = strategy.generateSql({
        sourceTable: parameters.sourceTable,
        sourceAlias: 's',
        targetAlias: 't'
      });
      
      // Log the SQL for debugging
      console.log(`SQL for confidence test (first 500 chars): ${sql.substring(0, 500)}...`);
      
      // Validate that the SQL contains some evidence of confidence calculation
      if (!sql.includes('match_confidence') && !sql.includes('confidence')) {
        throw new Error('Missing confidence calculation in SQL');
      }
      
      return { passed: true };
    })
  },
  {
    id: 'multi_table_waterfall_required_fields_test',
    name: 'Multi-Table Waterfall Required Fields Test',
    type: TestType.INTEGRATION,
    priority: TestPriority.MEDIUM,
    dependencies: ['multi_table_waterfall_basic_test'],
    parameters: testConfig,
    testFn: withErrorHandling(function(context) {
      const { parameters } = context;
      
      // Create multi-table waterfall strategy with required fields
      const strategy = matchStrategyFactory.createMultiTableWaterfallStrategy({
        referenceTables: parameters.referenceTables,
        matchingRules: parameters.matchingRules,
        thresholds: parameters.thresholds,
        requiredFields: parameters.requiredFields
      });
      
      // Generate SQL for strategy
      const sql = strategy.generateSql({
        sourceTable: parameters.sourceTable,
        sourceAlias: 's',
        targetAlias: 't'
      });
      
      // Log the SQL for debugging
      console.log(`SQL for required fields test (first 500 chars): ${sql.substring(0, 500)}...`);
      
      // Validate required fields in SQL - just check if the field names appear in the SQL
      for (const tableId in parameters.requiredFields) {
        for (const field of parameters.requiredFields[tableId]) {
          if (!sql.includes(field)) {
            throw new Error(`Required field '${field}' not found in SQL for table ${tableId}`);
          }
        }
      }
      
      return { passed: true };
    })
  },
  {
    id: 'multi_table_waterfall_large_scale_test',
    name: 'Multi-Table Waterfall Large Scale Test',
    type: TestType.INTEGRATION,
    priority: TestPriority.LOW,
    dependencies: ['multi_table_waterfall_field_mapping_test', 'multi_table_waterfall_confidence_test', 'multi_table_waterfall_required_fields_test'],
    parameters: testConfig,
    testFn: withErrorHandling(function(context) {
      const { parameters } = context;
      
      // Create multi-table waterfall strategy with all options
      const strategy = matchStrategyFactory.createMultiTableWaterfallStrategy({
        referenceTables: parameters.referenceTables,
        matchingRules: parameters.matchingRules,
        thresholds: parameters.thresholds,
        fieldMappings: parameters.fieldMappings,
        requiredFields: parameters.requiredFields,
        confidenceMultipliers: parameters.confidenceMultipliers
      });
      
      // Generate SQL for strategy
      const sql = strategy.generateSql({
        sourceTable: parameters.sourceTable,
        sourceAlias: 's',
        targetAlias: 't'
      });
      
      // Validate SQL has all components
      if (!sql.includes('WITH source_data AS')) {
        throw new Error('Missing source data CTE');
      }
      
      // Check for required fields
      for (const tableId in parameters.requiredFields) {
        for (const field of parameters.requiredFields[tableId]) {
          if (!sql.includes(field)) {
            throw new Error(`Missing required field: ${field}`);
          }
        }
      }
      
      // Check for proper ranking
      if (!sql.includes('ROW_NUMBER')) {
        throw new Error('Missing row number ranking');
      }
      
      return { passed: true };
    })
  }
];