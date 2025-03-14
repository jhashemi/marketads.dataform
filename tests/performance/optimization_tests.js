/**
 * Optimization Tests for Record Matching System
 * 
 * These tests benchmark different optimization techniques and configurations:
 * - Comparing different matching strategies
 * - Testing SQL query optimization techniques
 * - Evaluating memory usage and CPU utilization
 * - Benchmarking blocking key generation techniques
 */

const { TestType, TestPriority } = require('../../includes/validation/validation_registry');
const { withErrorHandling } = require('../../includes/validation/error_handler');
const performanceUtils = require('../../includes/utils/performance_utils');
const matchStrategyFactory = require('../../includes/match_strategy_factory');

exports.tests = [
  {
    id: 'optimization_matching_strategies_comparison',
    name: 'Matching Strategies Comparison Test',
    description: 'Compares performance of different matching strategies with the same dataset',
    type: TestType.PERFORMANCE,
    priority: TestPriority.HIGH,
    tags: ['performance', 'optimization', 'strategy-comparison'],
    parameters: {
      recordCount: 50000,
      strategies: [
        'exact_match', 
        'zip_soundex_lastname_firstname', 
        'waterfall', 
        'multi_table_waterfall'
      ],
      tableConfigurations: {
        sourceTable: 'test_source_medium',
        targetTables: ['test_target_medium']
      }
    },
    testFn: async (context) => {
      // Setup test data
      const { recordCount, strategies, tableConfigurations } = context.parameters;
      const benchmarkResults = [];
      
      // Run benchmark for each strategy
      for (const strategyName of strategies) {
        // Measure execution time
        const startTime = performanceUtils.getCurrentTimeMs();
        
        // Execute matching operation
        const result = await performanceUtils.executeMatchingWithTiming({
          strategy: strategyName,
          sourceTable: tableConfigurations.sourceTable,
          targetTables: tableConfigurations.targetTables,
          recordCount: recordCount
        });
        
        const endTime = performanceUtils.getCurrentTimeMs();
        const durationSeconds = (endTime - startTime) / 1000;
        
        benchmarkResults.push({
          strategyName,
          durationSeconds,
          recordsPerSecond: recordCount / durationSeconds,
          memoryUsage: result.memoryUsage,
          cpuUtilization: result.cpuUtilization,
          matchQuality: result.matchQuality || 'N/A'
        });
      }
      
      // Sort results by performance (fastest first)
      benchmarkResults.sort((a, b) => a.durationSeconds - b.durationSeconds);
      
      // The test passes if we successfully ran all benchmarks
      const isPassing = benchmarkResults.length === strategies.length;
      
      return {
        passed: isPassing,
        metrics: {
          benchmarkResults,
          fastestStrategy: benchmarkResults[0].strategyName,
          speedupFactor: benchmarkResults[benchmarkResults.length - 1].durationSeconds / 
                         benchmarkResults[0].durationSeconds
        },
        message: isPassing 
          ? `Successfully benchmarked ${strategies.length} matching strategies. Fastest: ${benchmarkResults[0].strategyName} (${benchmarkResults[0].durationSeconds.toFixed(2)}s)`
          : `Failed to complete benchmarks for all strategies`
      };
    }
  },
  
  {
    id: 'optimization_blocking_key_comparison',
    name: 'Blocking Key Generation Comparison Test',
    description: 'Compares performance of different blocking key generation techniques',
    type: TestType.PERFORMANCE,
    priority: TestPriority.MEDIUM,
    tags: ['performance', 'optimization', 'blocking-keys'],
    parameters: {
      recordCount: 50000,
      blockingMethods: [
        'zipLast3',
        'zipSoundexLastName',
        'stateLast3First3',
        'zipStreet5',
        'last3SoundexFirstCity'
      ],
      tableConfigurations: {
        sourceTable: 'test_source_medium',
        targetTables: ['test_target_medium']
      }
    },
    testFn: async (context) => {
      const { recordCount, blockingMethods, tableConfigurations } = context.parameters;
      const benchmarkResults = [];
      
      // Run benchmark for each blocking method
      for (const blockingMethod of blockingMethods) {
        // Measure execution time
        const startTime = performanceUtils.getCurrentTimeMs();
        
        // Execute blocking key generation
        const result = await performanceUtils.executeBlockingKeyGenerationWithTiming({
          method: blockingMethod,
          sourceTable: tableConfigurations.sourceTable,
          recordCount: recordCount
        });
        
        const endTime = performanceUtils.getCurrentTimeMs();
        const durationSeconds = (endTime - startTime) / 1000;
        
        benchmarkResults.push({
          blockingMethod,
          durationSeconds,
          recordsPerSecond: recordCount / durationSeconds,
          avgBlockSize: result.avgBlockSize || 'N/A',
          blockCount: result.blockCount || 'N/A',
          memoryUsage: result.memoryUsage
        });
      }
      
      // Sort results by performance (fastest first)
      benchmarkResults.sort((a, b) => a.durationSeconds - b.durationSeconds);
      
      // The test passes if we successfully ran all benchmarks
      const isPassing = benchmarkResults.length === blockingMethods.length;
      
      return {
        passed: isPassing,
        metrics: {
          benchmarkResults,
          fastestMethod: benchmarkResults[0].blockingMethod,
          slowestMethod: benchmarkResults[benchmarkResults.length - 1].blockingMethod
        },
        message: isPassing 
          ? `Successfully benchmarked ${blockingMethods.length} blocking methods. Fastest: ${benchmarkResults[0].blockingMethod} (${benchmarkResults[0].durationSeconds.toFixed(2)}s)`
          : `Failed to complete benchmarks for all blocking methods`
      };
    }
  },
  
  {
    id: 'optimization_sql_query_test',
    name: 'SQL Query Optimization Test',
    description: 'Tests performance of different SQL query optimization techniques',
    type: TestType.PERFORMANCE,
    priority: TestPriority.MEDIUM,
    tags: ['performance', 'optimization', 'sql'],
    parameters: {
      recordCount: 50000,
      optimizationTechniques: [
        'standard',
        'with_cte',
        'with_partitioning',
        'with_clustering'
      ],
      matchingStrategy: 'waterfall',
      tableConfigurations: {
        sourceTable: 'test_source_medium',
        targetTables: ['test_target_medium']
      }
    },
    testFn: async (context) => {
      const { recordCount, optimizationTechniques, matchingStrategy, tableConfigurations } = context.parameters;
      const benchmarkResults = [];
      
      // Run benchmark for each optimization technique
      for (const technique of optimizationTechniques) {
        // Measure execution time
        const startTime = performanceUtils.getCurrentTimeMs();
        
        // Execute matching with specific SQL optimization technique
        const result = await performanceUtils.executeMatchingWithTiming({
          strategy: matchingStrategy,
          sourceTable: tableConfigurations.sourceTable,
          targetTables: tableConfigurations.targetTables,
          recordCount: recordCount,
          sqlOptimization: technique
        });
        
        const endTime = performanceUtils.getCurrentTimeMs();
        const durationSeconds = (endTime - startTime) / 1000;
        
        benchmarkResults.push({
          technique,
          durationSeconds,
          recordsPerSecond: recordCount / durationSeconds,
          bytesProcessed: result.bytesProcessed || 'N/A',
          slotMs: result.slotMs || 'N/A'
        });
      }
      
      // Sort results by performance (fastest first)
      benchmarkResults.sort((a, b) => a.durationSeconds - b.durationSeconds);
      
      // The test passes if we successfully ran all benchmarks
      const isPassing = benchmarkResults.length === optimizationTechniques.length;
      
      return {
        passed: isPassing,
        metrics: {
          benchmarkResults,
          fastestTechnique: benchmarkResults[0].technique,
          performanceImprovement: ((benchmarkResults[benchmarkResults.length - 1].durationSeconds - 
                                  benchmarkResults[0].durationSeconds) / 
                                 benchmarkResults[benchmarkResults.length - 1].durationSeconds * 100).toFixed(2) + '%'
        },
        message: isPassing 
          ? `Successfully benchmarked ${optimizationTechniques.length} SQL optimization techniques. Best: ${benchmarkResults[0].technique} (${benchmarkResults[0].durationSeconds.toFixed(2)}s)`
          : `Failed to complete benchmarks for all SQL optimization techniques`
      };
    }
  },
  
  {
    id: 'optimization_memory_cpu_test',
    name: 'Memory and CPU Utilization Test',
    description: 'Evaluates memory usage and CPU utilization under different configurations',
    type: TestType.PERFORMANCE,
    priority: TestPriority.MEDIUM,
    tags: ['performance', 'optimization', 'resource-usage'],
    parameters: {
      recordCount: 50000,
      configurations: [
        { name: 'default', maxMemory: null, maxThreads: null },
        { name: 'high_memory', maxMemory: '4GB', maxThreads: 2 },
        { name: 'high_cpu', maxMemory: '2GB', maxThreads: 8 },
        { name: 'balanced', maxMemory: '3GB', maxThreads: 4 }
      ],
      matchingStrategy: 'waterfall',
      tableConfigurations: {
        sourceTable: 'test_source_medium',
        targetTables: ['test_target_medium']
      }
    },
    testFn: async (context) => {
      const { recordCount, configurations, matchingStrategy, tableConfigurations } = context.parameters;
      const benchmarkResults = [];
      
      // Run benchmark for each resource configuration
      for (const config of configurations) {
        // Measure execution time
        const startTime = performanceUtils.getCurrentTimeMs();
        
        // Execute matching with specific resource configuration
        const result = await performanceUtils.executeMatchingWithTiming({
          strategy: matchingStrategy,
          sourceTable: tableConfigurations.sourceTable,
          targetTables: tableConfigurations.targetTables,
          recordCount: recordCount,
          resourceConfig: {
            maxMemory: config.maxMemory,
            maxThreads: config.maxThreads
          }
        });
        
        const endTime = performanceUtils.getCurrentTimeMs();
        const durationSeconds = (endTime - startTime) / 1000;
        
        benchmarkResults.push({
          configName: config.name,
          durationSeconds,
          recordsPerSecond: recordCount / durationSeconds,
          peakMemoryUsage: result.peakMemoryUsage || 'N/A',
          avgCpuUtilization: result.avgCpuUtilization || 'N/A',
          resourceConfig: {
            maxMemory: config.maxMemory,
            maxThreads: config.maxThreads
          }
        });
      }
      
      // Sort results by performance (fastest first)
      benchmarkResults.sort((a, b) => a.durationSeconds - b.durationSeconds);
      
      // The test passes if we successfully ran all benchmarks
      const isPassing = benchmarkResults.length === configurations.length;
      
      // Find the most efficient configuration (balancing speed and resource usage)
      let mostEfficientConfig = benchmarkResults[0];
      if (benchmarkResults.length > 1) {
        // This is a simplified efficiency calculation - in a real system you might use a more sophisticated formula
        const efficiencyScores = benchmarkResults.map(result => {
          const speedScore = 1 / result.durationSeconds;
          const memoryScore = result.peakMemoryUsage ? (1 / result.peakMemoryUsage) : 1;
          const cpuScore = result.avgCpuUtilization ? (1 / result.avgCpuUtilization) : 1;
          return {
            configName: result.configName,
            efficiencyScore: speedScore * 0.5 + memoryScore * 0.25 + cpuScore * 0.25 // Weighted score
          };
        });
        
        // Sort by efficiency (highest first)
        efficiencyScores.sort((a, b) => b.efficiencyScore - a.efficiencyScore);
        mostEfficientConfig = benchmarkResults.find(r => r.configName === efficiencyScores[0].configName);
      }
      
      return {
        passed: isPassing,
        metrics: {
          benchmarkResults,
          fastestConfig: benchmarkResults[0].configName,
          mostEfficientConfig: mostEfficientConfig.configName,
          recommendedConfig: mostEfficientConfig.configName
        },
        message: isPassing 
          ? `Successfully benchmarked ${configurations.length} resource configurations. Fastest: ${benchmarkResults[0].configName} (${benchmarkResults[0].durationSeconds.toFixed(2)}s). Most efficient: ${mostEfficientConfig.configName}`
          : `Failed to complete benchmarks for all resource configurations`
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
      console.error(`Failed to register optimization test ${test.id}: ${error.message}`);
    }
  }
  
  return testIds;
};