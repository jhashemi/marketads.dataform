/**
 * End-to-End Matching Integration Tests
 * 
 * Tests the complete matching workflow from data ingestion to output generation.
 * These tests validate that all components work together correctly in a full matching pipeline.
 */

const { TestType, TestPriority } = require('../../includes/validation/validation_registry');
const { withErrorHandling } = require('../../includes/validation/error_handler');
const matchingSystem = require('../../includes/matching_system');
const matchStrategyFactory = require('../../includes/match_strategy_factory');

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
    testFn: async (context) => {
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
            scoring: matchingFields
          }
        },
        thresholds: { 
          high: matchThreshold,
          medium: matchThreshold - 0.1,
          low: matchThreshold - 0.2
        }
      });
      
      // Initialize the matching system
      const system = new matchingSystem.MatchingSystem({
        strategy,
        sourceTable,
        targetTables: [referenceTable],
        outputTable: 'test_match_results'
      });
      
      // Execute the complete matching pipeline
      const results = await system.executeMatching();
      
      // Validate results
      const matchRate = results.matchedRecords / results.totalRecords;
      const isPassing = matchRate >= (expectedMatchCount / 100);
      
      // Test both quantitative metrics and qualitative match quality
      const qualityMetrics = results.qualityMetrics || {};
      const hasHighQualityMatches = 
        (qualityMetrics.highConfidenceMatches || 0) >= (results.matchedRecords * 0.6);
      
      return {
        passed: isPassing && hasHighQualityMatches,
        metrics: {
          totalRecords: results.totalRecords,
          matchedRecords: results.matchedRecords,
          matchRate: matchRate,
          executionTime: results.executionTime,
          qualityMetrics
        },
        message: isPassing 
          ? `Successfully matched ${results.matchedRecords} out of ${results.totalRecords} records (${(matchRate * 100).toFixed(2)}%)`
          : `Failed to meet match rate target: ${(matchRate * 100).toFixed(2)}% vs ${expectedMatchCount}% expected`
      };
    }
  },
  
  {
    id: 'end_to_end_multi_source_matching_test',
    name: 'Multi-Source End-to-End Matching Test',
    description: 'Tests a complete matching pipeline with multiple data sources',
    type: TestType.INTEGRATION,
    priority: TestPriority.MEDIUM,
    tags: ['integration', 'matching', 'end-to-end', 'multi-source'],
    parameters: {
      sourceTables: ['test_customers_web', 'test_customers_store', 'test_customers_app'],
      referenceTable: 'master_customer_records',
      expectedMatchCounts: {
        'test_customers_web': 85,
        'test_customers_store': 70,
        'test_customers_app': 60
      },
      matchThreshold: 0.8,
      blockingFields: ['zip_code'],
      matchingFields: [
        { source: 'first_name', target: 'first_name', weight: 1.0 },
        { source: 'last_name', target: 'last_name', weight: 2.0 },
        { source: 'email', target: 'email', weight: 3.0 }
      ]
    },
    testFn: async (context) => {
      // Setup test parameters
      const { sourceTables, referenceTable, expectedMatchCounts, matchThreshold, blockingFields, matchingFields } = context.parameters;
      
      // Store results for each source
      const results = {};
      let overallSuccess = true;
      
      // Process each source table
      for (const sourceTable of sourceTables) {
        // Configure strategy for this source
        const strategy = matchStrategyFactory.createWaterfallStrategy({
          referenceTables: [
            { id: referenceTable, table: referenceTable, priority: 1, name: 'MASTER' }
          ],
          matchingRules: {
            [referenceTable]: {
              blocking: blockingFields.map(field => ({ 
                sourceField: field, 
                targetField: field, 
                exact: true 
              })),
              scoring: matchingFields
            }
          },
          thresholds: { 
            high: matchThreshold,
            medium: matchThreshold - 0.1,
            low: matchThreshold - 0.2
          }
        });
        
        // Initialize the matching system
        const system = new matchingSystem.MatchingSystem({
          strategy,
          sourceTable,
          targetTables: [referenceTable],
          outputTable: `${sourceTable}_matches`
        });
        
        // Execute the matching pipeline for this source
        const sourceResult = await system.executeMatching();
        
        // Calculate match rate for this source
        const matchRate = sourceResult.matchedRecords / sourceResult.totalRecords;
        const expectedRate = expectedMatchCounts[sourceTable] / 100;
        const sourceSuccess = matchRate >= expectedRate;
        
        // Store the results
        results[sourceTable] = {
          totalRecords: sourceResult.totalRecords,
          matchedRecords: sourceResult.matchedRecords,
          matchRate: matchRate,
          expectedRate: expectedRate,
          passed: sourceSuccess
        };
        
        // Update overall success flag
        overallSuccess = overallSuccess && sourceSuccess;
      }
      
      // Calculate aggregated metrics
      const aggregatedMetrics = {
        totalRecords: Object.values(results).reduce((sum, r) => sum + r.totalRecords, 0),
        matchedRecords: Object.values(results).reduce((sum, r) => sum + r.matchedRecords, 0),
        averageMatchRate: Object.values(results).reduce((sum, r) => sum + r.matchRate, 0) / sourceTables.length
      };
      
      return {
        passed: overallSuccess,
        metrics: {
          sourceResults: results,
          aggregated: aggregatedMetrics
        },
        message: overallSuccess 
          ? `Successfully matched records across ${sourceTables.length} source tables with an average match rate of ${(aggregatedMetrics.averageMatchRate * 100).toFixed(2)}%`
          : `Failed to meet match rate targets for one or more source tables`
      };
    }
  },
  
  {
    id: 'end_to_end_data_quality_test',
    name: 'End-to-End Data Quality Test',
    description: 'Tests the impact of data quality issues on matching results',
    type: TestType.INTEGRATION,
    priority: TestPriority.MEDIUM,
    tags: ['integration', 'matching', 'end-to-end', 'data-quality'],
    parameters: {
      dataQualityScenarios: [
        { name: 'clean_data', table: 'test_customers_clean', expectedMatchRate: 90 },
        { name: 'missing_values', table: 'test_customers_missing_values', expectedMatchRate: 70 },
        { name: 'typos', table: 'test_customers_typos', expectedMatchRate: 75 },
        { name: 'format_issues', table: 'test_customers_format_issues', expectedMatchRate: 65 }
      ],
      referenceTable: 'master_customer_records',
      matchThreshold: 0.7,
      blockingFields: ['zip_code'],
      matchingFields: [
        { source: 'first_name', target: 'first_name', weight: 1.0, method: 'jaro_winkler' },
        { source: 'last_name', target: 'last_name', weight: 2.0, method: 'jaro_winkler' },
        { source: 'address', target: 'address', weight: 1.5, method: 'token' },
        { source: 'email', target: 'email', weight: 3.0, method: 'exact' }
      ]
    },
    testFn: async (context) => {
      // Setup test parameters
      const { dataQualityScenarios, referenceTable, matchThreshold, blockingFields, matchingFields } = context.parameters;
      
      // Store results for each data quality scenario
      const results = {};
      let overallSuccess = true;
      
      // Process each data quality scenario
      for (const scenario of dataQualityScenarios) {
        // Configure strategy
        const strategy = matchStrategyFactory.createWaterfallStrategy({
          referenceTables: [
            { id: referenceTable, table: referenceTable, priority: 1, name: 'MASTER' }
          ],
          matchingRules: {
            [referenceTable]: {
              blocking: blockingFields.map(field => ({ 
                sourceField: field, 
                targetField: field, 
                exact: true 
              })),
              scoring: matchingFields
            }
          },
          thresholds: { 
            high: matchThreshold,
            medium: matchThreshold - 0.1,
            low: matchThreshold - 0.2
          }
        });
        
        // Initialize the matching system
        const system = new matchingSystem.MatchingSystem({
          strategy,
          sourceTable: scenario.table,
          targetTables: [referenceTable],
          outputTable: `${scenario.table}_matches`
        });
        
        // Execute the matching pipeline for this scenario
        const scenarioResult = await system.executeMatching();
        
        // Calculate match rate for this scenario
        const matchRate = scenarioResult.matchedRecords / scenarioResult.totalRecords;
        const expectedRate = scenario.expectedMatchRate / 100;
        const scenarioSuccess = matchRate >= expectedRate;
        
        // Store the results
        results[scenario.name] = {
          totalRecords: scenarioResult.totalRecords,
          matchedRecords: scenarioResult.matchedRecords,
          matchRate: matchRate,
          expectedRate: expectedRate,
          passed: scenarioSuccess
        };
        
        // Update overall success flag
        overallSuccess = overallSuccess && scenarioSuccess;
      }
      
      // Calculate data quality impact metrics
      const baselineRate = results.clean_data ? results.clean_data.matchRate : 0;
      const qualityImpactMetrics = {};
      
      for (const scenario of Object.keys(results)) {
        if (scenario !== 'clean_data') {
          qualityImpactMetrics[scenario] = {
            matchRateReduction: baselineRate - results[scenario].matchRate,
            percentageImpact: ((baselineRate - results[scenario].matchRate) / baselineRate * 100).toFixed(2) + '%'
          };
        }
      }
      
      return {
        passed: overallSuccess,
        metrics: {
          scenarioResults: results,
          dataQualityImpact: qualityImpactMetrics
        },
        message: overallSuccess 
          ? `Successfully evaluated matching performance across ${dataQualityScenarios.length} data quality scenarios`
          : `Failed to meet match rate targets for one or more data quality scenarios`
      };
    }
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
        testFn: withErrorHandling(test.testFn, 'INTEGRATION_TEST_ERROR', { testId: test.id })
      });
      
      testIds.push(testId);
    } catch (error) {
      console.error(`Failed to register end-to-end matching test ${test.id}: ${error.message}`);
    }
  }
  
  return testIds;
};