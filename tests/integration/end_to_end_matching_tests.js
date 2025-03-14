/**
 * End-to-End Matching Integration Tests
 * 
 * Tests the complete matching workflow from data ingestion to output generation.
 * These tests validate that all components work together correctly in a full matching pipeline.
 */

const { TestType, TestPriority } = require('../../includes/validation/validation_registry');
const { withErrorHandling } = require('../../includes/validation/error_handler');

// Import the MatchingSystem class
const { MatchingSystem } = require('../../includes/matching_system');

// Import the MatchStrategyFactory as a class
const { MatchStrategyFactory } = require('../../includes/match_strategy_factory');

// Create an instance of the factory
const matchStrategyFactory = new MatchStrategyFactory();

exports.tests = [
  {
    id: 'end_to_end_basic_matching_test',
    name: 'Basic End-to-End Matching Test',
    description: 'Tests a complete matching pipeline with basic customer data',
    type: TestType.INTEGRATION,
    priority: TestPriority.HIGH,
    tags: ['integration', 'matching', 'end-to-end'],
    parameters: {
      sourceTable: 'test_customer_data',
      referenceTable: 'verified_customers',
      expectedMatchCount: 75, // We expect to find matches for 75% of records
      matchThreshold: 0.75,
      blockingFields: ['zip_code', 'last_name'],
      matchingFields: [
        { source: 'first_name', target: 'first_name', weight: 1.0 },
        { source: 'last_name', target: 'last_name', weight: 2.0 },
        { source: 'address', target: 'address', weight: 1.5 },
        { source: 'phone', target: 'phone', weight: 2.5 },
        { source: 'email', target: 'email', weight: 3.0 }
      ]
    },
    testFn: withErrorHandling(async function(context) {
      // Setup test parameters
      const { sourceTable, referenceTable, expectedMatchCount, matchThreshold, blockingFields, matchingFields } = context.parameters;
      
      // Configure strategy
      const strategy = matchStrategyFactory.createWaterfallStrategy({
        referenceTables: [
          { id: referenceTable, table: referenceTable, priority: 1, name: 'VERIFIED' }
        ],
        matchingRules: {
          [referenceTable]: {
            blocking: blockingFields.map(field => ({ 
              sourceField: field, 
              targetField: field, 
              exact: true 
            })),
            scoring: matchingFields.map(field => ({
              sourceField: field.source,
              targetField: field.target,
              method: 'jaro_winkler',
              weight: field.weight
            }))
          }
        },
        thresholds: {
          high: matchThreshold,
          medium: matchThreshold * 0.8,
          low: matchThreshold * 0.6
        }
      });
      
      const matchingSystemFactory = new MatchingSystemFactory();
      // Configure matching system
      const system = matchingSystemFactory.createMatchingSystem({
        sourceTable: sourceTable,
        targetTables: [referenceTable],
        outputTable: 'test_matches_output'
      });
      
      // Execute matching
      const results = await system.executeMatching();
      
      // Calculate match rate
      const matchRate = results.matchedRecords / results.totalRecords;
      
      // Evaluate test result
      return {
        passed: matchRate >= (expectedMatchCount / 100),
        message: matchRate >= (expectedMatchCount / 100) 
            ? `Successfully matched ${matchRate * 100}% of records (target: ${expectedMatchCount}%)`
            : `Failed to meet match rate target: ${(matchRate * 100).toFixed(2)}% vs ${expectedMatchCount}% expected`
      };
    }, 'INTEGRATION_TEST_ERROR', { testId: 'end_to_end_basic_matching_test' })
  },
  
  {
    id: 'end_to_end_multi_source_matching_test',
    name: 'Multi-Source End-to-End Matching Test',
    description: 'Tests matching with multiple source tables against a single reference',
    type: TestType.INTEGRATION,
    priority: TestPriority.MEDIUM,
    tags: ['integration', 'matching', 'end-to-end', 'multi-source'],
    dependencies: ['end_to_end_basic_matching_test'],
    parameters: {
      sourceTables: [
        'test_customers_region_1',
        'test_customers_region_2',
        'test_customers_region_3'
      ],
      referenceTable: 'verified_customers',
      expectedMatchCounts: {
        'test_customers_region_1': 80,
        'test_customers_region_2': 70,
        'test_customers_region_3': 65
      },
      matchThreshold: 0.75,
      blockingFields: ['zip_code'],
      matchingFields: [
        { source: 'first_name', target: 'first_name', weight: 1.0 },
        { source: 'last_name', target: 'last_name', weight: 2.0 },
        { source: 'email', target: 'email', weight: 3.0 }
      ]
    },
    testFn: withErrorHandling(async function(context) {
      // Setup test parameters
      const { sourceTables, referenceTable, expectedMatchCounts, matchThreshold, blockingFields, matchingFields } = context.parameters;
      
      // Create base strategy configuration
      const strategyConfig = {
        referenceTables: [
          { id: referenceTable, table: referenceTable, priority: 1, name: 'VERIFIED' }
        ],
        matchingRules: {
          [referenceTable]: {
            blocking: blockingFields.map(field => ({ 
              sourceField: field, 
              targetField: field, 
              exact: true 
            })),
            scoring: matchingFields.map(field => ({
              sourceField: field.source,
              targetField: field.target,
              method: 'jaro_winkler',
              weight: field.weight
            }))
          }
        },
        thresholds: {
          high: matchThreshold,
          medium: matchThreshold * 0.8,
          low: matchThreshold * 0.6
        }
      };
      
      // Process each source table
      const results = [];
      let allSuccess = true;
      
      for (const sourceTable of sourceTables) {
        // Configure strategy
        const strategy = matchStrategyFactory.createWaterfallStrategy(strategyConfig);
        const matchingSystemFactory = new MatchingSystemFactory();
        
        // Configure matching system
        const system = matchingSystemFactory.createMatchingSystem({
          sourceTable: sourceTable,
          targetTables: [referenceTable],
          outputTable: `test_matches_${sourceTable}`
        });
        
        // Execute matching
        const matchResults = await system.executeMatching();
        
        // Calculate match rate
        const matchRate = matchResults.matchedRecords / matchResults.totalRecords;
        const expectedRate = expectedMatchCounts[sourceTable] / 100;
        const success = matchRate >= expectedRate;
        
        // Store results
        results.push({
          sourceTable,
          matchRate,
          expectedRate,
          success
        });
        
        // Update overall success flag
        if (!success) {
          allSuccess = false;
        }
      }
      
      // Evaluate test result
      return {
        passed: allSuccess,
        message: allSuccess 
            ? `Successfully matched all source tables to target rates`
            : `Failed to meet match rate targets for one or more source tables`
      };
    }, 'INTEGRATION_TEST_ERROR', { testId: 'end_to_end_multi_source_matching_test' })
  },
  
  {
    id: 'end_to_end_data_quality_test',
    name: 'End-to-End Data Quality Test',
    description: 'Tests matching with various data quality scenarios',
    type: TestType.INTEGRATION,
    priority: TestPriority.MEDIUM,
    tags: ['integration', 'matching', 'end-to-end', 'data-quality'],
    dependencies: ['end_to_end_basic_matching_test'],
    parameters: {
      dataQualityScenarios: [
        {
          name: 'clean_data',
          sourceTable: 'test_customers_clean',
          expectedMatchRate: 90
        },
        {
          name: 'missing_data',
          sourceTable: 'test_customers_missing_fields',
          expectedMatchRate: 60
        },
        {
          name: 'typo_data',
          sourceTable: 'test_customers_typos',
          expectedMatchRate: 75
        }
      ],
      referenceTable: 'verified_customers',
      matchThreshold: 0.65,
      blockingFields: ['zip_code'],
      matchingFields: [
        { source: 'first_name', target: 'first_name', weight: 1.0 },
        { source: 'last_name', target: 'last_name', weight: 2.0 },
        { source: 'email', target: 'email', weight: 3.0 }
      ]
    },
    testFn: withErrorHandling(async function(context) {
      // Setup test parameters
      const { dataQualityScenarios, referenceTable, matchThreshold, blockingFields, matchingFields } = context.parameters;
      
      // Create base strategy configuration
      const strategyConfig = {
        referenceTables: [
          { id: referenceTable, table: referenceTable, priority: 1, name: 'VERIFIED' }
        ],
        matchingRules: {
          [referenceTable]: {
            blocking: blockingFields.map(field => ({ 
              sourceField: field, 
              targetField: field, 
              exact: true 
            })),
            scoring: matchingFields.map(field => ({
              sourceField: field.source,
              targetField: field.target,
              method: 'jaro_winkler',
              weight: field.weight
            }))
          }
        },
        thresholds: {
          high: matchThreshold,
          medium: matchThreshold * 0.8,
          low: matchThreshold * 0.6
        }
      };
      
      // Process each scenario
      const results = [];
      let allSuccess = true;
      
      for (const scenario of dataQualityScenarios) {
        // Configure strategy
        const strategy = matchStrategyFactory.createWaterfallStrategy(strategyConfig);
        const matchingSystemFactory = new MatchingSystemFactory();
        
        // Configure matching system
        const system = matchingSystemFactory.createMatchingSystem({
          sourceTable: scenario.sourceTable,
          targetTables: [referenceTable],
          outputTable: `test_matches_${scenario.name}`
        });
        
        // Execute matching
        const matchResults = await system.executeMatching();
        
        // Calculate match rate
        const matchRate = matchResults.matchedRecords / matchResults.totalRecords;
        const expectedRate = scenario.expectedMatchRate / 100;
        const success = matchRate >= expectedRate;
        
        // Store results
        results.push({
          scenario: scenario.name,
          matchRate,
          expectedRate,
          success
        });
        
        // Update overall success flag
        if (!success) {
          allSuccess = false;
        }
      }
      
      // Evaluate test result
      return {
        passed: allSuccess,
        message: allSuccess 
            ? `Successfully matched data across all quality scenarios to target rates`
            : `Failed to meet match rate targets for one or more data quality scenarios`
      };
    }, 'INTEGRATION_TEST_ERROR', { testId: 'end_to_end_data_quality_test' })
  }
];

// Register tests with validation registry
exports.register = async (registry) => {
  const testIds = [];
  
  // Register each test with error handling
  for (const test of exports.tests) {
    try {
      const testId = registry.registerTest({
        ...test,
        testFn: test.testFn
      });
      
      testIds.push(testId);
    } catch (error) {
      console.error(`Failed to register end-to-end matching test ${test.id}: ${error.message}`);
    }
  }
  
  return testIds;
};