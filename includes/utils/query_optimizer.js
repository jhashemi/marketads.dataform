// Query Optimization Utilities
// Provides functions for optimizing query performance using approximate functions
// and efficient data type strategies

const DEFAULT_CONFIG = {
    // Error threshold for approximate functions
    approximationErrorThreshold: 0.02,
    // Minimum rows for using approximation
    minRowsForApproximation: 10000,
    // Number of buckets for quantile calculations
    defaultQuantileBuckets: 100,
    // Maximum string length for join keys
    maxJoinKeyLength: 50,
    // New configuration options
    windowFunctionOptimizationThreshold: 1000000,
    partitionedAggregationThreshold: 500000,
    hllPrecision: 15, // HyperLogLog++ precision parameter
    preAggregationBatchSize: 1000
  };
  
  /**
   * Optimizes a percentile calculation query
   * @param {Object} params Query parameters
   * @param {string} params.tableName Source table
   * @param {string} params.valueColumn Column to calculate percentiles for
   * @param {number} params.buckets Number of buckets (default 100)
   * @returns {string} Optimized SQL query
   */
  function optimizePercentileQuery(params) {
    const { tableName, valueColumn, buckets = DEFAULT_CONFIG.defaultQuantileBuckets } = params;
    
    return `
      WITH QuantInfo AS (
        SELECT
          o, qval
        FROM UNNEST((
          SELECT APPROX_QUANTILES(${valueColumn}, ${buckets})
          FROM \`${tableName}\`
        )) AS qval
        WITH OFFSET o
        WHERE o > 0
      )
      SELECT
        ${valueColumn},
        (SELECT (${buckets + 1} - MIN(o)) FROM QuantInfo WHERE ${valueColumn} <= qval) as percentile
      FROM \`${tableName}\``;
  }
  
  /**
   * Optimizes a distinct count query
   * @param {Object} params Query parameters
   * @param {string} params.tableName Source table
   * @param {string[]} params.countColumns Columns to count distinct values
   * @param {string[]} params.groupByColumns Optional GROUP BY columns
   * @returns {string} Optimized SQL query
   */
  function optimizeDistinctCountQuery(params) {
    const { tableName, countColumns, groupByColumns = [] } = params;
    
    const selectClauses = countColumns.map(col => 
      `APPROX_COUNT_DISTINCT(${col}) as distinct_${col}`
    ).join(',\n    ');
    
    return `
      SELECT
        ${groupByColumns.length > 0 ? groupByColumns.join(',\n    ') + ',\n    ' : ''}
        ${selectClauses}
      FROM \`${tableName}\`
      ${groupByColumns.length > 0 ? 'GROUP BY ' + groupByColumns.join(', ') : ''}`;
  }
  
  /**
   * Optimizes join key data types
   * @param {Object} params Join parameters
   * @param {string} params.sourceTable Source table
   * @param {string} params.targetTable Target table
   * @param {Object[]} params.joinKeys Join key mappings
   * @returns {Object} Optimized join configuration
   */
  function optimizeJoinKeys(params) {
    const { sourceTable, targetTable, joinKeys } = params;
    
    return joinKeys.map(key => {
      // Determine optimal data type
      const dataType = key.type === 'string' && key.maxLength <= DEFAULT_CONFIG.maxJoinKeyLength
        ? 'STRING'
        : 'INT64';
        
      return {
        ...key,
        optimizedType: dataType,
        castRequired: key.type !== dataType.toLowerCase(),
        sourceColumn: key.castRequired 
          ? `CAST(${key.sourceColumn} AS ${dataType})`
          : key.sourceColumn,
        targetColumn: key.castRequired
          ? `CAST(${key.targetColumn} AS ${dataType})`
          : key.targetColumn
      };
    });
  }
  
  /**
   * Generates an optimized join query
   * @param {Object} params Join parameters
   * @param {string} params.sourceTable Source table
   * @param {string} params.targetTable Target table
   * @param {Object[]} params.joinKeys Join key mappings
   * @param {string[]} params.selectColumns Columns to select
   * @returns {string} Optimized SQL query
   */
  function generateOptimizedJoinQuery(params) {
    const { sourceTable, targetTable, joinKeys, selectColumns } = params;
    
    const optimizedKeys = optimizeJoinKeys({ sourceTable, targetTable, joinKeys });
    
    const joinConditions = optimizedKeys.map(key =>
      `s.${key.sourceColumn} = t.${key.targetColumn}`
    ).join(' AND ');
    
    const selectClauses = selectColumns.map(col => {
      const [table, column] = col.split('.');
      return `${table}.${column}`;
    }).join(',\n    ');
    
    return `
      SELECT
        ${selectClauses}
      FROM \`${sourceTable}\` s
      JOIN \`${targetTable}\` t
      ON ${joinConditions}`;
  }
  
  /**
   * Validates optimization results
   * @param {Object} params Validation parameters
   * @param {Object} params.baseline Baseline metrics
   * @param {Object} params.optimized Optimized metrics
   * @returns {Object} Validation results
   */
  function validateOptimization(params) {
    const { baseline, optimized } = params;
    
    const performanceImprovement = 
      (baseline.executionTime - optimized.executionTime) / baseline.executionTime;
      
    const errorRate = Math.abs(
      (baseline.result - optimized.result) / baseline.result
    );
    
    return {
      isValid: performanceImprovement > 0 && errorRate <= DEFAULT_CONFIG.approximationErrorThreshold,
      metrics: {
        performanceImprovement,
        errorRate,
        baseline: baseline.executionTime,
        optimized: optimized.executionTime
      }
    };
  }
  
  /**
   * Optimizes high cardinality distinct count queries using HLL++
   * @param {Object} params Query parameters
   * @param {string} params.tableName Source table
   * @param {string[]} params.countColumns Columns to count distinct values
   * @param {string[]} params.dimensions Dimension columns for grouping
   * @param {number} params.precision HLL precision (10-24, default 15)
   * @returns {string} Optimized SQL query
   */
  function optimizeHighCardinalityCount(params) {
    const { 
      tableName, 
      countColumns, 
      dimensions = [], 
      precision = DEFAULT_CONFIG.hllPrecision 
    } = params;

    const hllInitClauses = countColumns.map(col =>
      `HLL_COUNT.INIT(${col}, ${precision}) as hll_${col}`
    ).join(',\n    ');

    const dimensionClauses = dimensions.length > 0 
      ? dimensions.join(',\n    ') + ',\n    '
      : '';

    return `
      SELECT
        ${dimensionClauses}
        ${hllInitClauses}
      FROM \`${tableName}\`
      ${dimensions.length > 0 ? 'GROUP BY ' + dimensions.join(', ') : ''}`;
  }
  
  /**
   * Optimizes window function queries using pre-aggregation
   * @param {Object} params Query parameters
   * @param {string} params.tableName Source table
   * @param {Object[]} params.windows Window function definitions
   * @param {string[]} params.partitionBy Partition columns
   * @param {string} params.orderBy Order by column
   * @returns {string} Optimized SQL query
   */
  function optimizeWindowFunctions(params) {
    const { 
      tableName, 
      windows, 
      partitionBy = [], 
      orderBy 
    } = params;

    const partitionClause = partitionBy.length > 0 
      ? `PARTITION BY ${partitionBy.join(', ')}` 
      : '';

    const preAggregation = `
      WITH pre_aggregated AS (
        SELECT
          ${partitionBy.join(',\n        ')},
          ${orderBy} as order_col,
          ${windows.map(w => 
            `${w.aggregation}(${w.column}) as ${w.alias}_agg`
          ).join(',\n        ')}
        FROM \`${tableName}\`
        GROUP BY ${partitionBy.join(', ')}, ${orderBy}
      )`;

    const windowClauses = windows.map(w => `
      ${w.aggregation}(${w.alias}_agg) OVER (
        ${partitionClause}
        ORDER BY order_col
        ${w.frame || ''}
      ) as ${w.alias}`
    ).join(',\n    ');

    return `
      ${preAggregation}
      SELECT
        t.*,
        ${windowClauses}
      FROM \`${tableName}\` t
      LEFT JOIN pre_aggregated p
      ON ${partitionBy.map(col => `t.${col} = p.${col}`).join(' AND ')}
      AND t.${orderBy} = p.order_col`;
  }
  
  /**
   * Optimizes partitioned aggregation queries
   * @param {Object} params Query parameters
   * @param {string} params.tableName Source table
   * @param {Object[]} params.aggregations Aggregation definitions
   * @param {string[]} params.partitionBy Partition columns
   * @param {string} params.timeColumn Timestamp/datetime column
   * @param {string} params.timeGranularity Time granularity for pre-aggregation
   * @returns {string} Optimized SQL query
   */
  function optimizePartitionedAggregation(params) {
    const { 
      tableName, 
      aggregations, 
      partitionBy = [], 
      timeColumn,
      timeGranularity = 'HOUR' 
    } = params;

    const aggregationClauses = aggregations.map(agg => 
      `${agg.function}(${agg.column}) as ${agg.alias}`
    ).join(',\n      ');

    const preAggregation = `
      WITH hourly_aggregation AS (
        SELECT
          TIMESTAMP_TRUNC(${timeColumn}, ${timeGranularity}) as time_key,
          ${partitionBy.join(',\n        ')},
          ${aggregationClauses}
        FROM \`${tableName}\`
        GROUP BY time_key, ${partitionBy.join(', ')}
      )`;

    const finalAggregations = aggregations.map(agg => {
      if (agg.function === 'AVG') {
        return `SUM(${agg.alias} * COUNT(*)) / SUM(COUNT(*)) as ${agg.alias}`;
      }
      return `${agg.function}(${agg.alias}) as ${agg.alias}`;
    }).join(',\n      ');

    return `
      ${preAggregation}
      SELECT
        DATE(time_key) as date_key,
        ${partitionBy.join(',\n      ')},
        ${finalAggregations}
      FROM hourly_aggregation
      GROUP BY date_key, ${partitionBy.join(', ')}`;
  }
  
  /**
   * Validates optimization results with detailed metrics
   * @param {Object} params Validation parameters
   * @param {Object} params.baseline Baseline metrics
   * @param {Object} params.optimized Optimized metrics
   * @param {Object} params.thresholds Custom thresholds
   * @returns {Object} Validation results with detailed metrics
   */
  function validateOptimizationWithMetrics(params) {
    const { baseline, optimized, thresholds = DEFAULT_CONFIG } = params;
    
    const performanceImprovement = 
      (baseline.executionTime - optimized.executionTime) / baseline.executionTime;
      
    const errorRate = Math.abs(
      (baseline.result - optimized.result) / baseline.result
    );
    
    const resourceUsage = {
      bytesProcessed: optimized.bytesProcessed / baseline.bytesProcessed,
      slotMs: optimized.slotMs / baseline.slotMs
    };

    return {
      isValid: performanceImprovement > 0 && errorRate <= thresholds.approximationErrorThreshold,
      metrics: {
        performanceImprovement,
        errorRate,
        resourceUsage,
        baseline: {
          executionTime: baseline.executionTime,
          bytesProcessed: baseline.bytesProcessed,
          slotMs: baseline.slotMs
        },
        optimized: {
          executionTime: optimized.executionTime,
          bytesProcessed: optimized.bytesProcessed,
          slotMs: optimized.slotMs
        }
      },
      recommendations: generateOptimizationRecommendations({
        performanceImprovement,
        errorRate,
        resourceUsage,
        thresholds
      })
    };
  }
  
  /**
   * Generates optimization recommendations based on metrics
   * @param {Object} metrics Performance metrics
   * @returns {string[]} Array of recommendations
   */
  function generateOptimizationRecommendations(metrics) {
    const recommendations = [];
    
    if (metrics.performanceImprovement < 0.2) {
      recommendations.push(
        'Consider increasing pre-aggregation batch size',
        'Evaluate partition key cardinality'
      );
    }
    
    if (metrics.errorRate > metrics.thresholds.approximationErrorThreshold / 2) {
      recommendations.push(
        'Consider increasing HLL precision',
        'Evaluate approximation thresholds'
      );
    }
    
    if (metrics.resourceUsage.bytesProcessed > 0.8) {
      recommendations.push(
        'Review partition pruning efficiency',
        'Consider additional pre-filtering'
      );
    }
    
    return recommendations;
  }
  
  module.exports = {
    DEFAULT_CONFIG,
    optimizePercentileQuery,
    optimizeDistinctCountQuery,
    optimizeJoinKeys,
    generateOptimizedJoinQuery,
    validateOptimization,
    // New exports
    optimizeHighCardinalityCount,
    optimizeWindowFunctions,
    optimizePartitionedAggregation,
    validateOptimizationWithMetrics
  };