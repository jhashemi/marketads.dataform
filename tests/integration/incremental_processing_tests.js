/**
 * Incremental Processing Integration Tests
 * 
 * Tests the system's ability to process new data incrementally without reprocessing
 * the entire dataset. These tests ensure efficient handling of data updates.
 */

const { TestType, TestPriority } = require('../../includes/validation/validation_registry');
const { withErrorHandling } = require('../../includes/validation/error_handler');
const matchingSystem = require('../../includes/matching_system');
const historicalMatcher = require('../../includes/historical_matcher');

exports.tests = [
  {
    id: 'incremental_basic_test',
    name: 'Basic Incremental Processing Test',
    description: 'Tests incremental processing with a simple dataset and new records',
    type: TestType.INTEGRATION,
    priority: TestPriority.HIGH,
    tags: ['integration', 'incremental', 'processing'],
    parameters: {
      baseTable: 'test_base_customers',
      incrementalTable: 'test_new_customers',
      referenceTable: 'master_customer_records',
      expectedMatchRates: {
        initial: 0.7, // 70% match rate for initial data
        incremental: 0.75 // 75% match rate for incremental data
      }
    },
    testFn: async (context) => {
      // Setup test parameters
      const { baseTable, incrementalTable, referenceTable, expectedMatchRates } = context.parameters;
      
      // Create historical matcher
      const matcher = new historicalMatcher.HistoricalMatcher({
        sourceTable: baseTable,
        targetTables: [referenceTable],
        outputTable: 'test_match_results',
        incrementalMode: true,
        timestampColumn: 'last_updated'
      });
      
      // Step 1: Process base data
      console.log(`Processing base data from ${baseTable}...`);
      const baseResults = await matcher.executeMatching();
      
      // Calculate base match rate
      const baseMatchRate = baseResults.matchedRecords / baseResults.totalRecords;
      const baseSuccess = baseMatchRate >= expectedMatchRates.initial;
      
      // Step 2: Process incremental data
      console.log(`Processing incremental data from ${incrementalTable}...`);
      
      // Configure matcher for incremental data
      matcher.sourceTable = incrementalTable;
      
      // Execute incremental matching
      const incrementalResults = await matcher.executeMatching();
      
      // Calculate incremental match rate
      const incrementalMatchRate = incrementalResults.matchedRecords / incrementalResults.totalRecords;
      const incrementalSuccess = incrementalMatchRate >= expectedMatchRates.incremental;
      
      // Verify incremental processing performance
      const processedRecordsOnly = incrementalResults.totalProcessedRecords === incrementalResults.totalRecords;
      
      return {
        passed: baseSuccess && incrementalSuccess && processedRecordsOnly,
        metrics: {
          base: {
            totalRecords: baseResults.totalRecords,
            matchedRecords: baseResults.matchedRecords,
            matchRate: baseMatchRate
          },
          incremental: {
            totalRecords: incrementalResults.totalRecords,
            matchedRecords: incrementalResults.matchedRecords,
            matchRate: incrementalMatchRate,
            processedRecordsOnly: processedRecordsOnly
          }
        },
        message: baseSuccess && incrementalSuccess && processedRecordsOnly 
          ? `Successfully processed incremental data with match rates: base=${(baseMatchRate * 100).toFixed(2)}%, incremental=${(incrementalMatchRate * 100).toFixed(2)}%`
          : `Failed to process incremental data correctly. Base success: ${baseSuccess}, Incremental success: ${incrementalSuccess}, Processed only new records: ${processedRecordsOnly}`
      };
    }
  },
  
  {
    id: 'incremental_with_updates_test',
    name: 'Incremental Processing with Updates Test',
    description: 'Tests incremental processing with both new records and updates to existing records',
    type: TestType.INTEGRATION,
    priority: TestPriority.MEDIUM,
    tags: ['integration', 'incremental', 'processing', 'updates'],
    parameters: {
      baseTable: 'test_base_customers',
      updatesTable: 'test_customer_updates',
      newRecordsTable: 'test_new_customers',
      referenceTable: 'master_customer_records',
      expectedResults: {
        updatedRecords: 50, // Expected number of updated records
        newRecords: 100, // Expected number of new records
        matchRate: 0.75 // Expected overall match rate
      }
    },
    testFn: async (context) => {
      // Setup test parameters
      const { baseTable, updatesTable, newRecordsTable, referenceTable, expectedResults } = context.parameters;
      
      // Create historical matcher
      const matcher = new historicalMatcher.HistoricalMatcher({
        sourceTable: baseTable,
        targetTables: [referenceTable],
        outputTable: 'test_match_results',
        incrementalMode: true,
        timestampColumn: 'last_updated',
        recordIdColumn: 'customer_id'
      });
      
      // Step 1: Process base data
      console.log(`Processing base data from ${baseTable}...`);
      const baseResults = await matcher.executeMatching();
      
      // Step 2: Process updates
      console.log(`Processing updates from ${updatesTable}...`);
      
      // Configure matcher for updates
      matcher.sourceTable = updatesTable;
      
      // Execute updates processing
      const updateResults = await matcher.executeMatching();
      
      // Verify updates were processed correctly
      const correctUpdateCount = updateResults.updatedRecords === expectedResults.updatedRecords;
      
      // Step 3: Process new records
      console.log(`Processing new records from ${newRecordsTable}...`);
      
      // Configure matcher for new records
      matcher.sourceTable = newRecordsTable;
      
      // Execute new records processing
      const newRecordsResults = await matcher.executeMatching();
      
      // Verify new records were processed correctly
      const correctNewRecordsCount = newRecordsResults.totalRecords === expectedResults.newRecords;
      
      // Calculate final match rate across all data
      const finalResults = await matcher.getMatchStatistics();
      const finalMatchRate = finalResults.matchedRecords / finalResults.totalRecords;
      const matchRateSuccess = finalMatchRate >= expectedResults.matchRate;
      
      return {
        passed: correctUpdateCount && correctNewRecordsCount && matchRateSuccess,
        metrics: {
          baseRecords: baseResults.totalRecords,
          updatedRecords: updateResults.updatedRecords,
          newRecords: newRecordsResults.totalRecords,
          finalMatchRate: finalMatchRate
        },
        message: correctUpdateCount && correctNewRecordsCount && matchRateSuccess 
          ? `Successfully processed incremental updates (${updateResults.updatedRecords} updates, ${newRecordsResults.totalRecords} new records) with final match rate: ${(finalMatchRate * 100).toFixed(2)}%`
          : `Failed to process incremental updates correctly. Update count correct: ${correctUpdateCount}, New records count correct: ${correctNewRecordsCount}, Match rate success: ${matchRateSuccess}`
      };
    }
  },
  
  {
    id: 'incremental_large_scale_test',
    name: 'Large-Scale Incremental Processing Test',
    description: 'Tests incremental processing at scale with a large initial dataset and multiple incremental updates',
    type: TestType.INTEGRATION,
    priority: TestPriority.LOW,
    tags: ['integration', 'incremental', 'processing', 'scale', 'slow'],
    parameters: {
      baseTable: 'test_base_large',
      incrementalTables: ['test_incremental_1', 'test_incremental_2', 'test_incremental_3'],
      referenceTable: 'master_customer_records',
      performanceThreshold: 0.8 // Incremental should be at least 80% faster than full reprocessing
    },
    testFn: async (context) => {
      // Setup test parameters
      const { baseTable, incrementalTables, referenceTable, performanceThreshold } = context.parameters;
      
      // Step 1: Process base data and measure time
      console.log(`Processing large base data from ${baseTable}...`);
      
      const fullProcessingMatcher = new matchingSystem.MatchingSystem({
        sourceTable: baseTable,
        targetTables: [referenceTable],
        outputTable: 'test_full_results',
        incrementalMode: false
      });
      
      const fullProcessingStartTime = Date.now();
      const fullProcessingResults = await fullProcessingMatcher.executeMatching();
      const fullProcessingTime = Date.now() - fullProcessingStartTime;
      
      // Step 2: Process base data with incremental matcher
      const incrementalMatcher = new historicalMatcher.HistoricalMatcher({
        sourceTable: baseTable,
        targetTables: [referenceTable],
        outputTable: 'test_incremental_results',
        incrementalMode: true,
        timestampColumn: 'last_updated',
        recordIdColumn: 'customer_id'
      });
      
      console.log(`Processing base data incrementally from ${baseTable}...`);
      const baseIncrementalResults = await incrementalMatcher.executeMatching();
      
      // Step 3: Process incremental updates and measure time
      let totalIncrementalTime = 0;
      let totalIncrementalRecords = 0;
      
      for (const incrementalTable of incrementalTables) {
        console.log(`Processing incremental data from ${incrementalTable}...`);
        
        // Configure matcher for incremental data
        incrementalMatcher.sourceTable = incrementalTable;
        
        // Measure processing time for this increment
        const incrementStartTime = Date.now();
        const incrementResults = await incrementalMatcher.executeMatching();
        const incrementTime = Date.now() - incrementStartTime;
        
        totalIncrementalTime += incrementTime;
        totalIncrementalRecords += incrementResults.totalRecords;
      }
      
      // Step 4: Process all incremental data in a single full processing run for comparison
      console.log('Processing all incremental data in full mode for comparison...');
      
      const combinedIncrementalTable = 'test_all_incremental';
      const fullReprocessingMatcher = new matchingSystem.MatchingSystem({
        sourceTable: combinedIncrementalTable,
        targetTables: [referenceTable],
        outputTable: 'test_full_incremental_results',
        incrementalMode: false
      });
      
      const fullIncrementalStartTime = Date.now();
      const fullIncrementalResults = await fullReprocessingMatcher.executeMatching();
      const fullIncrementalTime = Date.now() - fullIncrementalStartTime;
      
      // Calculate performance improvement
      const performanceImprovement = 1 - (totalIncrementalTime / fullIncrementalTime);
      const performanceSuccess = performanceImprovement >= performanceThreshold;
      
      // Verify incremental processing produced the same results as full processing
      const finalIncrementalResults = await incrementalMatcher.getMatchStatistics();
      const fullResults = await fullProcessingMatcher.getMatchStatistics();
      
      const matchQualityConsistent = 
        Math.abs(finalIncrementalResults.matchedRecords - fullResults.matchedRecords) < 5 && // Allow small differences
        Math.abs(finalIncrementalResults.totalRecords - fullResults.totalRecords) < 5;
      
      return {
        passed: performanceSuccess && matchQualityConsistent,
        metrics: {
          baseRecords: baseIncrementalResults.totalRecords,
          incrementalRecords: totalIncrementalRecords,
          fullProcessingTime: fullProcessingTime,
          incrementalProcessingTime: totalIncrementalTime,
          fullIncrementalProcessingTime: fullIncrementalTime,
          performanceImprovement: performanceImprovement,
          matchQualityConsistent: matchQualityConsistent
        },
        message: performanceSuccess && matchQualityConsistent
          ? `Successfully processed large-scale incremental data with ${(performanceImprovement * 100).toFixed(2)}% performance improvement over full reprocessing`
          : `Failed to meet incremental processing performance targets or match quality inconsistencies detected. Performance improvement: ${(performanceImprovement * 100).toFixed(2)}%, Quality consistent: ${matchQualityConsistent}`
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
      console.error(`Failed to register incremental processing test ${test.id}: ${error.message}`);
    }
  }
  
  return testIds;
};