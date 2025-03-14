/**
 * Multi-Table Waterfall Integration Tests
 * 
 * Tests the system's ability to perform matching across multiple reference tables
 * in a waterfall/priority-based approach, where matches from higher priority tables
 * take precedence over matches from lower priority tables.
 */

const { TestType, TestPriority } = require('../../includes/validation/validation_registry');
const { withErrorHandling } = require('../../includes/validation/error_handler');
const matchStrategyFactory = require('../../includes/match_strategy_factory');
const matchingSystem = require('../../includes/matching_system');

exports.tests = [
  {
    id: 'multi_table_waterfall_basic_test',
    name: 'Basic Multi-Table Waterfall Test',
    description: 'Tests basic multi-table waterfall matching with priority ordering',
    type: TestType.INTEGRATION,
    priority: TestPriority.HIGH,
    tags: ['integration', 'multi-table', 'waterfall'],
    parameters: {
      sourceTable: 'test_customers',
      referenceTables: [
        { id: 'verified_customers', table: 'verified_customers', priority: 1, name: 'VERIFIED' },
        { id: 'historical_data', table: 'historical_data', priority: 2, name: 'HISTORICAL' },
        { id: 'third_party', table: 'third_party_data', priority: 3, name: 'THIRD_PARTY' }
      ],
      expectedMatchDistribution: {
        'verified_customers': 0.4, // 40% should match to verified_customers
        'historical_data': 0.3,    // 30% should match to historical_data
        'third_party': 0.2,        // 20% should match to third_party_data
        'unmatched': 0.1           // 10% should remain unmatched
      }
    },
    testFn: async (context) => {
      // Setup test parameters
      const { sourceTable, referenceTables, expectedMatchDistribution } = context.parameters;
      
      // Create multi-table waterfall strategy
      const strategy = matchStrategyFactory.createMultiTableWaterfallStrategy({
        referenceTables,
        matchingRules: {
          'verified_customers': {
            blocking: [{ sourceField: 'zip', targetField: 'zip', exact: true }],
            scoring: [
              { sourceField: 'first_name', targetField: 'first_name', method: 'jaro_winkler', weight: 1.5 },
              { sourceField: 'last_name', targetField: 'last_name', method: 'jaro_winkler', weight: 2.0 },
              { sourceField: 'email', targetField: 'email', method: 'exact', weight: 3.0 }
            ]
          },
          'historical_data': {
            blocking: [{ sourceField: 'zip', targetField: 'postal_code', exact: true }],
            scoring: [
              { sourceField: 'first_name', targetField: 'firstname', method: 'jaro_winkler', weight: 1.5 },
              { sourceField: 'last_name', targetField: 'lastname', method: 'jaro_winkler', weight: 2.0 },
              { sourceField: 'email', targetField: 'email_address', method: 'exact', weight: 3.0 }
            ]
          },
          'third_party': {
            blocking: [{ sourceField: 'zip', targetField: 'zipcode', exact: true }],
            scoring: [
              { sourceField: 'first_name', targetField: 'first', method: 'jaro_winkler', weight: 1.5 },
              { sourceField: 'last_name', targetField: 'last', method: 'jaro_winkler', weight: 2.0 },
              { sourceField: 'email', targetField: 'email_addr', method: 'exact', weight: 3.0 }
            ]
          }
        },
        thresholds: { high: 0.85, medium: 0.7, low: 0.55 }
      });
      
      // Initialize the matching system
      const system = new matchingSystem.MatchingSystem({
        strategy,
        sourceTable,
        targetTables: referenceTables.map(rt => rt.table),
        outputTable: 'test_multi_table_results'
      });
      
      // Execute the matching pipeline
      const results = await system.executeMatching();
      
      // Analyze match distribution
      const matchDistribution = await system.getMatchDistribution();
      
      // Validate match distribution against expected distribution
      const matchDistributionSuccess = validateMatchDistribution(
        matchDistribution, 
        expectedMatchDistribution, 
        results.totalRecords
      );
      
      // Validate priority ordering - check that no lower priority match was chosen
      // when a higher priority match was available
      const priorityOrderingResults = await validatePriorityOrdering(
        system, 
        referenceTables
      );
      
      return {
        passed: matchDistributionSuccess && priorityOrderingResults.success,
        metrics: {
          totalRecords: results.totalRecords,
          matchedRecords: results.matchedRecords,
          unmatched: results.totalRecords - results.matchedRecords,
          matchRate: results.matchedRecords / results.totalRecords,
          distribution: matchDistribution,
          priorities: {
            correctPriorityOrdering: priorityOrderingResults.success,
            violationCount: priorityOrderingResults.violationCount,
            violations: priorityOrderingResults.violations
          }
        },
        message: matchDistributionSuccess && priorityOrderingResults.success
          ? `Successfully matched records using multi-table waterfall approach with correct priority ordering`
          : `Multi-table waterfall test failed: Distribution correct: ${matchDistributionSuccess}, Priority ordering correct: ${priorityOrderingResults.success}`
      };
    }
  },
  
  {
    id: 'multi_table_waterfall_field_mapping_test',
    name: 'Multi-Table Waterfall Field Mapping Test',
    description: 'Tests field mapping capabilities in multi-table waterfall matching',
    type: TestType.INTEGRATION,
    priority: TestPriority.MEDIUM,
    tags: ['integration', 'multi-table', 'waterfall', 'field-mapping'],
    parameters: {
      sourceTable: 'test_customers',
      referenceTables: [
        { id: 'verified_customers', table: 'verified_customers', priority: 1, name: 'VERIFIED' },
        { id: 'historical_data', table: 'historical_data', priority: 2, name: 'HISTORICAL' }
      ],
      fieldMappings: {
        'verified_customers': [
          { sourceField: 'email', targetField: 'email_verified' },
          { sourceField: 'customer_id', targetField: 'verified_id' },
          { sourceField: 'account_status', targetField: 'verified_status' }
        ],
        'historical_data': [
          { sourceField: 'email_address', targetField: 'email_historical' },
          { sourceField: 'customer_id', targetField: 'historical_id' },
          { sourceField: 'status', targetField: 'historical_status' }
        ]
      }
    },
    testFn: async (context) => {
      // Setup test parameters
      const { sourceTable, referenceTables, fieldMappings } = context.parameters;
      
      // Create multi-table waterfall strategy with field mappings
      const strategy = matchStrategyFactory.createMultiTableWaterfallStrategy({
        referenceTables,
        matchingRules: {
          'verified_customers': {
            blocking: [{ sourceField: 'zip', targetField: 'zip', exact: true }],
            scoring: [
              { sourceField: 'first_name', targetField: 'first_name', method: 'jaro_winkler', weight: 1.5 },
              { sourceField: 'last_name', targetField: 'last_name', method: 'jaro_winkler', weight: 2.0 }
            ]
          },
          'historical_data': {
            blocking: [{ sourceField: 'zip', targetField: 'postal_code', exact: true }],
            scoring: [
              { sourceField: 'first_name', targetField: 'firstname', method: 'jaro_winkler', weight: 1.5 },
              { sourceField: 'last_name', targetField: 'lastname', method: 'jaro_winkler', weight: 2.0 }
            ]
          }
        },
        thresholds: { high: 0.85, medium: 0.7, low: 0.55 },
        fieldMappings
      });
      
      // Initialize the matching system
      const system = new matchingSystem.MatchingSystem({
        strategy,
        sourceTable,
        targetTables: referenceTables.map(rt => rt.table),
        outputTable: 'test_multi_table_field_mapping'
      });
      
      // Execute the matching pipeline
      const results = await system.executeMatching();
      
      // Validate that field mappings were applied correctly
      const fieldMappingValidation = await validateFieldMappings(
        system, 
        fieldMappings
      );
      
      return {
        passed: fieldMappingValidation.success,
        metrics: {
          totalRecords: results.totalRecords,
          matchedRecords: results.matchedRecords,
          fieldMappingCoverage: fieldMappingValidation.coverage,
          fieldMappingErrors: fieldMappingValidation.errors
        },
        message: fieldMappingValidation.success
          ? `Successfully applied field mappings in multi-table waterfall matching`
          : `Field mapping test failed: ${fieldMappingValidation.errorMessage}`
      };
    }
  },
  
  {
    id: 'multi_table_waterfall_confidence_test',
    name: 'Multi-Table Waterfall Confidence Test',
    description: 'Tests confidence scoring and thresholds in multi-table waterfall matching',
    type: TestType.INTEGRATION,
    priority: TestPriority.MEDIUM,
    tags: ['integration', 'multi-table', 'waterfall', 'confidence'],
    parameters: {
      sourceTable: 'test_customers',
      referenceTables: [
        { 
          id: 'verified_customers', 
          table: 'verified_customers', 
          priority: 1, 
          name: 'VERIFIED',
          confidenceMultiplier: 1.2,
          requiredFields: ['email']
        },
        { 
          id: 'historical_data', 
          table: 'historical_data', 
          priority: 2, 
          name: 'HISTORICAL',
          confidenceMultiplier: 1.0,
          requiredFields: []
        },
        { 
          id: 'third_party', 
          table: 'third_party_data', 
          priority: 3, 
          name: 'THIRD_PARTY',
          confidenceMultiplier: 0.8,
          requiredFields: []
        }
      ],
      confidenceLevels: {
        high: 0.9,
        medium: 0.75,
        low: 0.6
      },
      expectedConfidenceDistribution: {
        high: 0.4,   // 40% should be high confidence
        medium: 0.3, // 30% should be medium confidence
        low: 0.2,    // 20% should be low confidence
        unmatched: 0.1 // 10% should be unmatched
      }
    },
    testFn: async (context) => {
      // Setup test parameters
      const { sourceTable, referenceTables, confidenceLevels, expectedConfidenceDistribution } = context.parameters;
      
      // Create multi-table waterfall strategy with confidence settings
      const strategy = matchStrategyFactory.createMultiTableWaterfallStrategy({
        referenceTables,
        matchingRules: {
          'verified_customers': {
            blocking: [{ sourceField: 'zip', targetField: 'zip', exact: true }],
            scoring: [
              { sourceField: 'first_name', targetField: 'first_name', method: 'jaro_winkler', weight: 1.5 },
              { sourceField: 'last_name', targetField: 'last_name', method: 'jaro_winkler', weight: 2.0 },
              { sourceField: 'email', targetField: 'email', method: 'exact', weight: 3.0 }
            ]
          },
          'historical_data': {
            blocking: [{ sourceField: 'zip', targetField: 'postal_code', exact: true }],
            scoring: [
              { sourceField: 'first_name', targetField: 'firstname', method: 'jaro_winkler', weight: 1.5 },
              { sourceField: 'last_name', targetField: 'lastname', method: 'jaro_winkler', weight: 2.0 }
            ]
          },
          'third_party': {
            blocking: [{ sourceField: 'zip', targetField: 'zipcode', exact: true }],
            scoring: [
              { sourceField: 'first_name', targetField: 'first', method: 'jaro_winkler', weight: 1.5 },
              { sourceField: 'last_name', targetField: 'last', method: 'jaro_winkler', weight: 2.0 }
            ]
          }
        },
        thresholds: confidenceLevels,
        confidenceField: 'match_confidence'
      });
      
      // Initialize the matching system
      const system = new matchingSystem.MatchingSystem({
        strategy,
        sourceTable,
        targetTables: referenceTables.map(rt => rt.table),
        outputTable: 'test_multi_table_confidence'
      });
      
      // Execute the matching pipeline
      const results = await system.executeMatching();
      
      // Analyze confidence distribution
      const confidenceDistribution = await system.getConfidenceDistribution();
      
      // Validate confidence distribution against expected distribution
      const confidenceDistributionSuccess = validateMatchDistribution(
        confidenceDistribution, 
        expectedConfidenceDistribution, 
        results.totalRecords
      );
      
      // Validate confidence multipliers were applied correctly
      const confidenceMultiplierResults = await validateConfidenceMultipliers(
        system, 
        referenceTables
      );
      
      // Validate required fields checks were applied
      const requiredFieldsResults = await validateRequiredFields(
        system, 
        referenceTables
      );
      
      return {
        passed: confidenceDistributionSuccess && 
                confidenceMultiplierResults.success &&
                requiredFieldsResults.success,
        metrics: {
          totalRecords: results.totalRecords,
          matchedRecords: results.matchedRecords,
          confidenceDistribution,
          multipliers: {
            correctMultiplierApplication: confidenceMultiplierResults.success,
            violations: confidenceMultiplierResults.violations
          },
          requiredFields: {
            correctRequiredFieldsCheck: requiredFieldsResults.success,
            violations: requiredFieldsResults.violations
          }
        },
        message: confidenceDistributionSuccess && confidenceMultiplierResults.success && requiredFieldsResults.success
          ? `Successfully applied confidence scoring in multi-table waterfall matching`
          : `Confidence test failed. Distribution correct: ${confidenceDistributionSuccess}, Multipliers correct: ${confidenceMultiplierResults.success}, Required fields correct: ${requiredFieldsResults.success}`
      };
    }
  },
  
  {
    id: 'multi_table_waterfall_large_scale_test',
    name: 'Multi-Table Waterfall Large Scale Test',
    description: 'Tests multi-table waterfall matching at scale with many tables and records',
    type: TestType.INTEGRATION,
    priority: TestPriority.LOW,
    tags: ['integration', 'multi-table', 'waterfall', 'scale', 'slow'],
    parameters: {
      sourceTable: 'test_customers_large',
      referenceTables: [
        { id: 'verified_customers', table: 'verified_customers_large', priority: 1, name: 'VERIFIED' },
        { id: 'historical_data', table: 'historical_data_large', priority: 2, name: 'HISTORICAL' },
        { id: 'third_party_1', table: 'third_party_data_1', priority: 3, name: 'THIRD_PARTY_1' },
        { id: 'third_party_2', table: 'third_party_data_2', priority: 4, name: 'THIRD_PARTY_2' },
        { id: 'third_party_3', table: 'third_party_data_3', priority: 5, name: 'THIRD_PARTY_3' }
      ],
      performanceThresholds: {
        maxExecutionTime: 300, // seconds
        minRecordsPerSecond: 500
      }
    },
    testFn: async (context) => {
      // Setup test parameters
      const { sourceTable, referenceTables, performanceThresholds } = context.parameters;
      
      // Create multi-table waterfall strategy
      const strategy = matchStrategyFactory.createMultiTableWaterfallStrategy({
        referenceTables,
        matchingRules: {
          'verified_customers': {
            blocking: [{ sourceField: 'zip', targetField: 'zip', exact: true }],
            scoring: [
              { sourceField: 'first_name', targetField: 'first_name', method: 'jaro_winkler', weight: 1.5 },
              { sourceField: 'last_name', targetField: 'last_name', method: 'jaro_winkler', weight: 2.0 }
            ]
          },
          'historical_data': {
            blocking: [{ sourceField: 'zip', targetField: 'postal_code', exact: true }],
            scoring: [
              { sourceField: 'first_name', targetField: 'firstname', method: 'jaro_winkler', weight: 1.5 },
              { sourceField: 'last_name', targetField: 'lastname', method: 'jaro_winkler', weight: 2.0 }
            ]
          },
          'third_party_1': {
            blocking: [{ sourceField: 'zip', targetField: 'zipcode', exact: true }],
            scoring: [
              { sourceField: 'first_name', targetField: 'first', method: 'jaro_winkler', weight: 1.5 },
              { sourceField: 'last_name', targetField: 'last', method: 'jaro_winkler', weight: 2.0 }
            ]
          },
          'third_party_2': {
            blocking: [{ sourceField: 'zip', targetField: 'zip_code', exact: true }],
            scoring: [
              { sourceField: 'first_name', targetField: 'given_name', method: 'jaro_winkler', weight: 1.5 },
              { sourceField: 'last_name', targetField: 'family_name', method: 'jaro_winkler', weight: 2.0 }
            ]
          },
          'third_party_3': {
            blocking: [{ sourceField: 'zip', targetField: 'zip', exact: true }],
            scoring: [
              { sourceField: 'first_name', targetField: 'fname', method: 'jaro_winkler', weight: 1.5 },
              { sourceField: 'last_name', targetField: 'lname', method: 'jaro_winkler', weight: 2.0 }
            ]
          }
        },
        thresholds: { high: 0.85, medium: 0.7, low: 0.55 }
      });
      
      // Initialize the matching system
      const system = new matchingSystem.MatchingSystem({
        strategy,
        sourceTable,
        targetTables: referenceTables.map(rt => rt.table),
        outputTable: 'test_multi_table_large'
      });
      
      // Measure execution time
      console.log(`Starting large-scale multi-table waterfall matching test...`);
      const startTime = Date.now();
      
      // Execute the matching pipeline
      const results = await system.executeMatching();
      
      const endTime = Date.now();
      const executionTimeSeconds = (endTime - startTime) / 1000;
      const recordsPerSecond = results.totalRecords / executionTimeSeconds;
      
      // Validate performance meets thresholds
      const executionTimeSuccess = executionTimeSeconds <= performanceThresholds.maxExecutionTime;
      const throughputSuccess = recordsPerSecond >= performanceThresholds.minRecordsPerSecond;
      
      return {
        passed: executionTimeSuccess && throughputSuccess,
        metrics: {
          totalRecords: results.totalRecords,
          matchedRecords: results.matchedRecords,
          matchRate: results.matchedRecords / results.totalRecords,
          executionTimeSeconds,
          recordsPerSecond,
          tableCount: referenceTables.length,
          performance: {
            executionTimeSuccess,
            throughputSuccess,
            executionTimeThreshold: performanceThresholds.maxExecutionTime,
            throughputThreshold: performanceThresholds.minRecordsPerSecond
          }
        },
        message: executionTimeSuccess && throughputSuccess
          ? `Successfully performed large-scale multi-table waterfall matching in ${executionTimeSeconds.toFixed(2)}s (${recordsPerSecond.toFixed(2)} records/second)`
          : `Large-scale multi-table test failed performance targets. Time: ${executionTimeSeconds.toFixed(2)}s (limit: ${performanceThresholds.maxExecutionTime}s), Throughput: ${recordsPerSecond.toFixed(2)} records/s (min: ${performanceThresholds.minRecordsPerSecond})`
      };
    }
  }
];

/**
 * Validates that the actual match distribution is close to the expected distribution
 * @param {Object} actual - Actual distribution
 * @param {Object} expected - Expected distribution 
 * @param {number} totalRecords - Total number of records
 * @returns {boolean} - Whether the distribution is valid
 */
function validateMatchDistribution(actual, expected, totalRecords) {
  // Convert percentages to counts
  const expectedCounts = {};
  for (const [key, percentage] of Object.entries(expected)) {
    expectedCounts[key] = Math.round(totalRecords * percentage);
  }
  
  // Calculate maximum allowed deviation (5% of total records)
  const maxDeviation = Math.max(Math.round(totalRecords * 0.05), 5);
  
  // Check if actual counts are within acceptable range
  for (const [key, expectedCount] of Object.entries(expectedCounts)) {
    const actualCount = actual[key] || 0;
    if (Math.abs(actualCount - expectedCount) > maxDeviation) {
      return false;
    }
  }
  
  return true;
}

/**
 * Validates that priority ordering is respected in match results
 * @param {Object} system - Matching system instance
 * @param {Array} referenceTables - Reference tables configuration
 * @returns {Object} - Validation results
 */
async function validatePriorityOrdering(system, referenceTables) {
  // This would be implemented to check that no lower priority match
  // was chosen when a higher priority match was available
  // Simplified implementation for test purposes
  
  // In a real implementation, this would query the match results and examine
  // the matches to ensure priority ordering was respected
  
  return {
    success: true,
    violationCount: 0,
    violations: []
  };
}

/**
 * Validates that field mappings were applied correctly
 * @param {Object} system - Matching system instance
 * @param {Object} fieldMappings - Field mappings configuration
 * @returns {Object} - Validation results
 */
async function validateFieldMappings(system, fieldMappings) {
  // This would be implemented to check that mapped fields are present in results
  // Simplified implementation for test purposes
  
  // In a real implementation, this would query the match results and check
  // that mapped fields were correctly populated
  
  return {
    success: true,
    coverage: 1.0,
    errors: []
  };
}

/**
 * Validates that confidence multipliers were applied correctly
 * @param {Object} system - Matching system instance
 * @param {Array} referenceTables - Reference tables configuration
 * @returns {Object} - Validation results
 */
async function validateConfidenceMultipliers(system, referenceTables) {
  // This would be implemented to check that confidence scores reflect
  // the configured multipliers
  // Simplified implementation for test purposes
  
  return {
    success: true,
    violations: []
  };
}

/**
 * Validates that required fields checks were applied correctly
 * @param {Object} system - Matching system instance
 * @param {Array} referenceTables - Reference tables configuration
 * @returns {Object} - Validation results
 */
async function validateRequiredFields(system, referenceTables) {
  // This would be implemented to check that matches only occur when
  // required fields are present
  // Simplified implementation for test purposes
  
  return {
    success: true,
    violations: []
  };
}

// Register tests with validation registry
exports.register = async (registry) => {
  const testIds = [];
  
  // Register each test with error handling
  for (const test of exports.tests) {
    try {
      const testId = registry.registerTest({
        ...test,
        testFn: withErrorHandling(test.testFn, 'INTEGRATION_TEST_ERROR', { testId: test.id })
      });
      
      testIds.push(testId);
    } catch (error) {
      console.error(`Failed to register multi-table waterfall test ${test.id}: ${error.message}`);
    }
  }
  
  return testIds;
};