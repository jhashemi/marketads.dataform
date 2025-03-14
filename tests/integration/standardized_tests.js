/**
 * Standardized Integration Tests
 * 
 * Examples of using the test_helpers module to create standardized tests
 * that properly implement the class-based factory pattern.
 */

const { TestType, TestPriority } = require('../../includes/validation/validation_registry');
const {
  createWaterfallTestConfig,
  createMultiTableWaterfallTestFn,
  createMatchingSystemTestFn,
  createHistoricalMatcherTestFn
} = require('../../includes/validation/test_helpers');

// Create test configuration
const waterfallTestConfig = createWaterfallTestConfig({
  sourceTable: 'test_customer_data',
  referenceTables: [
    {
      id: 'verified_customers',
      table: 'verified_customers',
      priority: 1,
      name: 'Verified Customers',
      keyField: 'customer_id'
    },
    {
      id: 'crm_customers',
      table: 'crm_customers',
      priority: 2,
      name: 'CRM Customers',
      keyField: 'customer_id'
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
  }
});

// Simple validators for SQL generation tests
function validateJoins(sql, parameters) {
  // Check for JOINs for all reference tables
  for (const refTable of parameters.referenceTables) {
    if (!sql.includes(`JOIN ${refTable.table}`)) {
      throw new Error(`Missing JOIN for reference table: ${refTable.table}`);
    }
  }
  
  return {
    passed: true,
    message: 'All reference tables found in SQL JOINs'
  };
}

function validateFieldMappings(sql, parameters) {
  // Check for field mappings in SELECT clause
  for (const tableId in parameters.fieldMappings) {
    for (const mapping of parameters.fieldMappings[tableId]) {
      if (!sql.includes(mapping.targetField)) {
        throw new Error(`Missing field mapping: ${mapping.sourceField} -> ${mapping.targetField}`);
      }
    }
  }
  
  return {
    passed: true,
    message: 'All field mappings found in SQL'
  };
}

// Export tests
exports.tests = [
  {
    id: 'standardized_waterfall_test',
    name: 'Standardized Multi-Table Waterfall Test',
    description: 'Tests the multi-table waterfall strategy using the standardized test helpers',
    type: TestType.INTEGRATION,
    priority: TestPriority.HIGH,
    parameters: waterfallTestConfig,
    testFn: createMultiTableWaterfallTestFn(validateJoins)
  },
  {
    id: 'standardized_field_mapping_test',
    name: 'Standardized Field Mapping Test',
    description: 'Tests field mappings in the multi-table waterfall strategy',
    type: TestType.INTEGRATION,
    priority: TestPriority.MEDIUM,
    dependencies: ['standardized_waterfall_test'],
    parameters: waterfallTestConfig,
    testFn: createMultiTableWaterfallTestFn(validateFieldMappings)
  },
  {
    id: 'standardized_matching_system_test',
    name: 'Standardized Matching System Test',
    description: 'Tests the matching system using the standardized test helpers',
    type: TestType.INTEGRATION,
    priority: TestPriority.HIGH,
    parameters: {
      sourceTable: 'test_customer_data',
      referenceTable: 'verified_customers',
      expectedMatchCount: 75
    },
    testFn: createMatchingSystemTestFn(async (matchingSystem, context) => {
      const { parameters } = context;
      
      // Execute matching
      const results = await matchingSystem.executeMatching();
      
      // Calculate match rate
      const matchRate = results.matchedRecords / results.totalRecords;
      const expectedRate = parameters.expectedMatchCount / 100;
      
      return {
        passed: matchRate >= expectedRate,
        message: matchRate >= expectedRate
          ? `Successfully matched ${matchRate * 100}% of records (target: ${parameters.expectedMatchCount}%)`
          : `Failed to meet match rate target: ${(matchRate * 100).toFixed(2)}% vs ${parameters.expectedMatchCount}% expected`
      };
    })
  },
  {
    id: 'standardized_historical_matcher_test',
    name: 'Standardized Historical Matcher Test',
    description: 'Tests the historical matcher using the standardized test helpers',
    type: TestType.INTEGRATION,
    priority: TestPriority.HIGH,
    parameters: {
      baseTable: 'test_base_customers',
      referenceTable: 'verified_customers',
      expectedMatchRate: 0.7
    },
    testFn: createHistoricalMatcherTestFn(async (historicalMatcher, context) => {
      const { parameters } = context;
      
      // Execute matching
      const results = await historicalMatcher.executeMatching();
      
      // Calculate match rate
      const matchRate = results.matchedRecords / results.totalRecords;
      const expectedRate = parameters.expectedMatchRate;
      
      return {
        passed: matchRate >= expectedRate,
        message: matchRate >= expectedRate
          ? `Successfully matched ${matchRate * 100}% of records (target: ${expectedRate * 100}%)`
          : `Failed to meet match rate target: ${(matchRate * 100).toFixed(2)}% vs ${expectedRate * 100}% expected`
      };
    })
  }
]; 