/**
 * Scalability Tests for Record Matching System
 * 
 * These tests evaluate system performance under increasing data volumes:
 * - Small datasets (thousands of records)
 * - Medium datasets (hundreds of thousands of records)
 * - Large datasets (millions of records)
 */

const { TestType, TestPriority } = require('../../includes/validation/validation_registry');
const { withErrorHandling } = require('../../includes/validation/error_handler');
const performanceUtils = require('../../includes/utils/performance_utils');

exports.tests = [
  {
    id: 'scalability_small_dataset_test',
    name: 'Small Dataset Scalability Test',
    description: 'Tests matching performance with a small dataset (thousands of records)',
    type: TestType.PERFORMANCE,
    priority: TestPriority.MEDIUM,
    tags: ['performance', 'scalability', 'small-data'],
    parameters: {
      recordCount: 5000,
      expectedMaxDuration: 30, // seconds
      matchingStrategy: 'waterfall',
      tableConfigurations: {
        sourceTable: 'test_source_small',
        targetTables: ['test_target_small']
      }
    },
    testFn: async (context) => {
      // Setup test data
      const { recordCount, expectedMaxDuration, matchingStrategy, tableConfigurations } = context.parameters;
      
      // Measure execution time
      const startTime = performanceUtils.getCurrentTimeMs();
      
      // Execute matching operation
      const result = await performanceUtils.executeMatchingWithTiming({
        strategy: matchingStrategy,
        sourceTable: tableConfigurations.sourceTable,
        targetTables: tableConfigurations.targetTables,
        recordCount: recordCount
      });
      
      const endTime = performanceUtils.getCurrentTimeMs();
      const durationSeconds = (endTime - startTime) / 1000;
      
      // Validate results
      const isPassing = durationSeconds <= expectedMaxDuration;
      
      return {
        passed: isPassing,
        metrics: {
          executionTime: durationSeconds,
          recordsPerSecond: recordCount / durationSeconds,
          memoryUsage: result.memoryUsage,
          expectedMaxDuration
        },
        message: isPassing 
          ? `Successfully matched ${recordCount} records in ${durationSeconds.toFixed(2)}s`
          : `Matching ${recordCount} records took ${durationSeconds.toFixed(2)}s, exceeding maximum of ${expectedMaxDuration}s`
      };
    }
  },
  
  {
    id: 'scalability_medium_dataset_test',
    name: 'Medium Dataset Scalability Test',
    description: 'Tests matching performance with a medium dataset (hundreds of thousands of records)',
    type: TestType.PERFORMANCE,
    priority: TestPriority.MEDIUM,
    tags: ['performance', 'scalability', 'medium-data'],
    parameters: {
      recordCount: 250000,
      expectedMaxDuration: 180, // seconds
      matchingStrategy: 'waterfall',
      tableConfigurations: {
        sourceTable: 'test_source_medium',
        targetTables: ['test_target_medium']
      }
    },
    testFn: async (context) => {
      // Setup test data
      const { recordCount, expectedMaxDuration, matchingStrategy, tableConfigurations } = context.parameters;
      
      // Measure execution time
      const startTime = performanceUtils.getCurrentTimeMs();
      
      // Execute matching operation
      const result = await performanceUtils.executeMatchingWithTiming({
        strategy: matchingStrategy,
        sourceTable: tableConfigurations.sourceTable,
        targetTables: tableConfigurations.targetTables,
        recordCount: recordCount
      });
      
      const endTime = performanceUtils.getCurrentTimeMs();
      const durationSeconds = (endTime - startTime) / 1000;
      
      // Validate results
      const isPassing = durationSeconds <= expectedMaxDuration;
      
      return {
        passed: isPassing,
        metrics: {
          executionTime: durationSeconds,
          recordsPerSecond: recordCount / durationSeconds,
          memoryUsage: result.memoryUsage,
          expectedMaxDuration
        },
        message: isPassing 
          ? `Successfully matched ${recordCount} records in ${durationSeconds.toFixed(2)}s`
          : `Matching ${recordCount} records took ${durationSeconds.toFixed(2)}s, exceeding maximum of ${expectedMaxDuration}s`
      };
    }
  },
  
  {
    id: 'scalability_large_dataset_test',
    name: 'Large Dataset Scalability Test',
    description: 'Tests matching performance with a large dataset (millions of records)',
    type: TestType.PERFORMANCE,
    priority: TestPriority.LOW, // Lower priority because it takes longer to run
    tags: ['performance', 'scalability', 'large-data', 'slow'],
    parameters: {
      recordCount: 1000000,
      expectedMaxDuration: 600, // seconds
      matchingStrategy: 'waterfall',
      tableConfigurations: {
        sourceTable: 'test_source_large',
        targetTables: ['test_target_large']
      }
    },
    testFn: async (context) => {
      // Setup test data
      const { recordCount, expectedMaxDuration, matchingStrategy, tableConfigurations } = context.parameters;
      
      // Measure execution time
      const startTime = performanceUtils.getCurrentTimeMs();
      
      // Execute matching operation
      const result = await performanceUtils.executeMatchingWithTiming({
        strategy: matchingStrategy,
        sourceTable: tableConfigurations.sourceTable,
        targetTables: tableConfigurations.targetTables,
        recordCount: recordCount
      });
      
      const endTime = performanceUtils.getCurrentTimeMs();
      const durationSeconds = (endTime - startTime) / 1000;
      
      // Validate results
      const isPassing = durationSeconds <= expectedMaxDuration;
      
      return {
        passed: isPassing,
        metrics: {
          executionTime: durationSeconds,
          recordsPerSecond: recordCount / durationSeconds,
          memoryUsage: result.memoryUsage,
          cpuUtilization: result.cpuUtilization,
          expectedMaxDuration
        },
        message: isPassing 
          ? `Successfully matched ${recordCount} records in ${durationSeconds.toFixed(2)}s`
          : `Matching ${recordCount} records took ${durationSeconds.toFixed(2)}s, exceeding maximum of ${expectedMaxDuration}s`
      };
    }
  },
  
  {
    id: 'scalability_multi_table_test',
    name: 'Multi-Table Scalability Test',
    description: 'Tests performance when matching against multiple reference tables simultaneously',
    type: TestType.PERFORMANCE,
    priority: TestPriority.HIGH,
    tags: ['performance', 'scalability', 'multi-table'],
    parameters: {
      recordCount: 50000,
      expectedMaxDuration: 120, // seconds
      matchingStrategy: 'multi_table_waterfall',
      tableConfigurations: {
        sourceTable: 'test_source_multi',
        targetTables: [
          'test_target_table1',
          'test_target_table2',
          'test_target_table3'
        ]
      }
    },
    testFn: async (context) => {
      // Setup test data
      const { recordCount, expectedMaxDuration, matchingStrategy, tableConfigurations } = context.parameters;
      
      // Measure execution time
      const startTime = performanceUtils.getCurrentTimeMs();
      
      // Execute matching operation
      const result = await performanceUtils.executeMatchingWithTiming({
        strategy: matchingStrategy,
        sourceTable: tableConfigurations.sourceTable,
        targetTables: tableConfigurations.targetTables,
        recordCount: recordCount
      });
      
      const endTime = performanceUtils.getCurrentTimeMs();
      const durationSeconds = (endTime - startTime) / 1000;
      
      // Validate results
      const isPassing = durationSeconds <= expectedMaxDuration;
      
      return {
        passed: isPassing,
        metrics: {
          executionTime: durationSeconds,
          recordsPerSecond: recordCount / durationSeconds,
          tablesUsed: tableConfigurations.targetTables.length,
          memoryUsage: result.memoryUsage,
          expectedMaxDuration
        },
        message: isPassing 
          ? `Successfully matched ${recordCount} records against ${tableConfigurations.targetTables.length} tables in ${durationSeconds.toFixed(2)}s`
          : `Matching ${recordCount} records against ${tableConfigurations.targetTables.length} tables took ${durationSeconds.toFixed(2)}s, exceeding maximum of ${expectedMaxDuration}s`
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
        testFn: withErrorHandling(test.testFn, 'PERFORMANCE_TEST_ERROR', { testId: test.id })
      });
      
      testIds.push(testId);
    } catch (error) {
      console.error(`Failed to register scalability test ${test.id}: ${error.message}`);
    }
  }
  
  return testIds;
};