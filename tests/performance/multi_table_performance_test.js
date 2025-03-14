/**
 * Multi-Table Waterfall Strategy Performance Tests
 * 
 * These tests benchmark the performance of the Multi-Table Waterfall strategy
 * under various load conditions and configurations to ensure it meets performance
 * requirements for production use.
 */

const { test, describe } = require('../test_framework');
const { TestType } = require('../test_types');
const { withErrorHandling } = require('../../includes/validation/test_helpers');
const { MultiTableWaterfallStrategy } = require('../../includes/match_strategies/multi_table_waterfall_strategy');
const { 
  trackCpuUtilization, 
  measureExecutionTime, 
  measureAsyncExecutionTime, 
  getCurrentMemoryUsage 
} = require('../../includes/utils/performance_utils');

// Helper to generate a configuration with a specific number of reference tables
const generateConfig = (tableCounts) => {
  const referenceTables = [];
  const matchingRules = {};
  const fieldMappings = {};
  
  for (let i = 1; i <= tableCounts; i++) {
    const tableId = `test_table_${i}`;
    
    // Add reference table
    referenceTables.push({
      id: tableId,
      table: tableId,
      name: `Test Table ${i}`,
      keyField: 'id',
      priority: i,
      confidenceMultiplier: 1.0
    });
    
    // Add matching rules
    matchingRules[tableId] = {
      blocking: [
        { sourceField: 'postal_code', targetField: 'postal_code', exact: true }
      ],
      scoring: [
        { sourceField: 'first_name', targetField: 'first_name', method: 'jaro_winkler', weight: 1.5 },
        { sourceField: 'last_name', targetField: 'last_name', method: 'jaro_winkler', weight: 2.0 },
        { sourceField: 'email', targetField: 'email', method: 'exact', weight: 3.0 }
      ]
    };
    
    // Add field mappings
    fieldMappings[tableId] = [
      { sourceField: 'first_name', targetField: 'first_name_mapped' },
      { sourceField: 'last_name', targetField: 'last_name_mapped' },
      { sourceField: 'email', targetField: 'email_mapped' }
    ];
  }
  
  return {
    referenceTables,
    matchingRules,
    fieldMappings,
    thresholds: {
      high: 0.85,
      medium: 0.7,
      low: 0.55
    }
  };
};

// Define performance test suite
describe('Multi-Table Waterfall Strategy Performance Tests', () => {
  // Small configuration test (3 tables)
  test('Small Configuration Performance (3 tables)', {
    type: TestType.PERFORMANCE,
    id: 'multi_table_waterfall_small_perf_test',
    priority: 2,
    parameters: {
      tableCount: 3,
      expectedMaxExecutionTime: 50 // ms
    }
  }, withErrorHandling(function(context) {
    const { parameters } = context;
    const config = generateConfig(parameters.tableCount);
    
    // Measure instantiation time
    const instantiationTime = measureExecutionTime(() => {
      new MultiTableWaterfallStrategy(config);
    });
    
    // Create strategy for SQL generation test
    const strategy = new MultiTableWaterfallStrategy(config);
    
    // Measure SQL generation time and CPU usage
    const { time: sqlGenerationTime, cpu } = trackCpuUtilization(() => {
      strategy.generateSql({
        sourceTable: 'test_source_table',
        sourceAlias: 's',
        targetAlias: 't'
      });
    }, 'SQL Generation (Small Config)');
    
    // Get memory usage
    const memoryUsage = getCurrentMemoryUsage();
    
    // Validate performance
    const totalExecutionTime = instantiationTime + sqlGenerationTime;
    const passed = totalExecutionTime <= parameters.expectedMaxExecutionTime;
    
    return {
      success: passed,
      message: passed 
        ? `Performance test passed: ${totalExecutionTime}ms execution time`
        : `Performance test failed: ${totalExecutionTime}ms exceeds limit of ${parameters.expectedMaxExecutionTime}ms`,
      details: {
        instantiationTime,
        sqlGenerationTime,
        totalExecutionTime,
        cpuUsage: cpu,
        memoryUsage,
        tableCount: parameters.tableCount
      }
    };
  }));
  
  // Medium configuration test (10 tables)
  test('Medium Configuration Performance (10 tables)', {
    type: TestType.PERFORMANCE,
    id: 'multi_table_waterfall_medium_perf_test',
    priority: 2,
    parameters: {
      tableCount: 10,
      expectedMaxExecutionTime: 100 // ms
    }
  }, withErrorHandling(function(context) {
    const { parameters } = context;
    const config = generateConfig(parameters.tableCount);
    
    // Measure instantiation time
    const instantiationTime = measureExecutionTime(() => {
      new MultiTableWaterfallStrategy(config);
    });
    
    // Create strategy for SQL generation test
    const strategy = new MultiTableWaterfallStrategy(config);
    
    // Measure SQL generation time and CPU usage
    const { time: sqlGenerationTime, cpu } = trackCpuUtilization(() => {
      strategy.generateSql({
        sourceTable: 'test_source_table',
        sourceAlias: 's',
        targetAlias: 't'
      });
    }, 'SQL Generation (Medium Config)');
    
    // Get memory usage
    const memoryUsage = getCurrentMemoryUsage();
    
    // Validate performance
    const totalExecutionTime = instantiationTime + sqlGenerationTime;
    const passed = totalExecutionTime <= parameters.expectedMaxExecutionTime;
    
    return {
      success: passed,
      message: passed 
        ? `Performance test passed: ${totalExecutionTime}ms execution time`
        : `Performance test failed: ${totalExecutionTime}ms exceeds limit of ${parameters.expectedMaxExecutionTime}ms`,
      details: {
        instantiationTime,
        sqlGenerationTime,
        totalExecutionTime,
        cpuUsage: cpu,
        memoryUsage,
        tableCount: parameters.tableCount
      }
    };
  }));
  
  // Large configuration test (25 tables)
  test('Large Configuration Performance (25 tables)', {
    type: TestType.PERFORMANCE,
    id: 'multi_table_waterfall_large_perf_test',
    priority: 2,
    parameters: {
      tableCount: 25,
      expectedMaxExecutionTime: 250 // ms
    }
  }, withErrorHandling(function(context) {
    const { parameters } = context;
    const config = generateConfig(parameters.tableCount);
    
    // Measure instantiation time
    const instantiationTime = measureExecutionTime(() => {
      new MultiTableWaterfallStrategy(config);
    });
    
    // Create strategy for SQL generation test
    const strategy = new MultiTableWaterfallStrategy(config);
    
    // Measure SQL generation time and CPU usage
    const { time: sqlGenerationTime, cpu } = trackCpuUtilization(() => {
      strategy.generateSql({
        sourceTable: 'test_source_table',
        sourceAlias: 's',
        targetAlias: 't'
      });
    }, 'SQL Generation (Large Config)');
    
    // Get memory usage
    const memoryUsage = getCurrentMemoryUsage();
    
    // Validate performance
    const totalExecutionTime = instantiationTime + sqlGenerationTime;
    const passed = totalExecutionTime <= parameters.expectedMaxExecutionTime;
    
    return {
      success: passed,
      message: passed 
        ? `Performance test passed: ${totalExecutionTime}ms execution time`
        : `Performance test failed: ${totalExecutionTime}ms exceeds limit of ${parameters.expectedMaxExecutionTime}ms`,
      details: {
        instantiationTime,
        sqlGenerationTime,
        totalExecutionTime,
        cpuUsage: cpu,
        memoryUsage,
        tableCount: parameters.tableCount
      }
    };
  }));
  
  // Repeated SQL generation test (for caching)
  test('Repeated SQL Generation Performance', {
    type: TestType.PERFORMANCE,
    id: 'multi_table_waterfall_repeated_gen_test',
    priority: 2,
    parameters: {
      tableCount: 10,
      repetitions: 5,
      expectedImprovement: 0.3 // 30% faster after first generation
    }
  }, withErrorHandling(function(context) {
    const { parameters } = context;
    const config = generateConfig(parameters.tableCount);
    
    // Create strategy
    const strategy = new MultiTableWaterfallStrategy(config);
    
    // First generation (cold)
    const firstGenerationTime = measureExecutionTime(() => {
      strategy.generateSql({
        sourceTable: 'test_source_table',
        sourceAlias: 's',
        targetAlias: 't'
      });
    });
    
    // Subsequent generations (potentially cached)
    const generationTimes = [];
    for (let i = 0; i < parameters.repetitions; i++) {
      generationTimes.push(measureExecutionTime(() => {
        strategy.generateSql({
          sourceTable: 'test_source_table',
          sourceAlias: 's',
          targetAlias: 't'
        });
      }));
    }
    
    // Calculate average of subsequent generations
    const avgSubsequentTime = generationTimes.reduce((sum, time) => sum + time, 0) / generationTimes.length;
    
    // Calculate improvement (lower is better)
    const improvement = 1 - (avgSubsequentTime / firstGenerationTime);
    const passed = improvement >= parameters.expectedImprovement;
    
    return {
      success: passed,
      message: passed 
        ? `Caching test passed: ${(improvement * 100).toFixed(1)}% improvement after first generation`
        : `Caching test failed: Only ${(improvement * 100).toFixed(1)}% improvement (expected ${parameters.expectedImprovement * 100}%)`,
      details: {
        firstGenerationTime,
        avgSubsequentTime,
        improvement,
        generationTimes,
        tableCount: parameters.tableCount
      }
    };
  }));
});

// Export the test suite
module.exports = {}; 