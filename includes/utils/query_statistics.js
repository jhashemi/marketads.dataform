// Query Statistics and Sampling Utilities
// Provides functions for collecting and maintaining approximate statistics
// and implementing efficient sampling techniques for query optimization

/**
 * Configuration for statistics collection and sampling
 */
const DEFAULT_CONFIG = {
  // How often to refresh statistics (in hours)
  statsRefreshInterval: 24,
  // Default sample size percentage
  defaultSampleSize: 1,
  // Minimum rows for using sampling
  minRowsForSampling: 10000,
  // Maximum relative error for approximate counts
  maxApproxError: 0.02
};

/**
 * Generates SQL to collect approximate statistics for a table
 * @param {string} tableName - The table to analyze
 * @param {string[]} columns - Columns to collect statistics for
 * @param {Object} options - Additional options
 * @returns {string} SQL query for statistics collection
 */
function generateTableStatisticsSQL(tableName, columns, options = {}) {
  const opts = { ...DEFAULT_CONFIG, ...options };
  
  return `
    CREATE OR REPLACE TABLE \`${tableName}_stats\` AS
    WITH sampled_data AS (
      SELECT *
      FROM \`${tableName}\` 
      TABLESAMPLE SYSTEM (${opts.defaultSampleSize} PERCENT)
    ),
    column_stats AS (
      SELECT
        '${tableName}' as table_name,
        CURRENT_TIMESTAMP() as collected_at,
        COUNT(*) as total_rows,
        APPROX_COUNT_DISTINCT(*) as approx_distinct_rows,
        ${columns.map(col => `
          STRUCT(
            '${col}' as column_name,
            APPROX_COUNT_DISTINCT(${col}) as distinct_values,
            COUNTIF(${col} IS NULL) as null_count,
            MIN(${col}) as min_value,
            MAX(${col}) as max_value
          )`).join(',\n')}
      FROM sampled_data
    )
    SELECT * FROM column_stats`;
}

/**
 * Generates SQL to collect cardinality statistics for join keys
 * @param {string} sourceTable - Source table name
 * @param {string} targetTable - Target table name 
 * @param {string[]} joinKeys - Join key columns
 * @param {Object} options - Additional options
 * @returns {string} SQL query for join statistics
 */
function generateJoinStatisticsSQL(sourceTable, targetTable, joinKeys, options = {}) {
  const opts = { ...DEFAULT_CONFIG, ...options };

  return `
    CREATE OR REPLACE TABLE \`${sourceTable}_${targetTable}_join_stats\` AS
    WITH join_stats AS (
      SELECT
        '${sourceTable}' as source_table,
        '${targetTable}' as target_table,
        CURRENT_TIMESTAMP() as collected_at,
        ${joinKeys.map(key => `
          STRUCT(
            '${key}' as join_key,
            APPROX_COUNT_DISTINCT(s.${key}) as source_distinct,
            APPROX_COUNT_DISTINCT(t.${key}) as target_distinct,
            APPROX_QUANTILES(s.${key}, 100) as source_distribution,
            APPROX_QUANTILES(t.${key}, 100) as target_distribution
          )`).join(',\n')}
      FROM \`${sourceTable}\` s
      FULL OUTER JOIN \`${targetTable}\` t
      ON ${joinKeys.map(k => `s.${k} = t.${k}`).join(' AND ')}
    )
    SELECT * FROM join_stats`;
}

/**
 * Generates SQL for table sampling based on statistics
 * @param {string} tableName - Table to sample
 * @param {Object} stats - Collected statistics
 * @param {Object} options - Sampling options
 * @returns {string} SQL query with appropriate sampling
 */
function generateSamplingSQL(tableName, stats, options = {}) {
  const opts = { ...DEFAULT_CONFIG, ...options };
  
  // Calculate optimal sample size based on table statistics
  const sampleSize = Math.min(
    100,
    Math.max(
      opts.defaultSampleSize,
      (opts.minRowsForSampling / stats.total_rows) * 100
    )
  );

  return `
    SELECT * 
    FROM \`${tableName}\`
    ${stats.total_rows > opts.minRowsForSampling 
      ? `TABLESAMPLE SYSTEM (${sampleSize} PERCENT)` 
      : ''}`;
}

/**
 * Generates SQL for approximate aggregations
 * @param {string} tableName - Table to query
 * @param {Object} aggregations - Aggregation specifications
 * @param {Object} options - Additional options
 * @returns {string} SQL query with approximate aggregations
 */
function generateApproximateAggregationSQL(tableName, aggregations, options = {}) {
  const opts = { ...DEFAULT_CONFIG, ...options };

  const aggClauses = Object.entries(aggregations).map(([alias, spec]) => {
    switch (spec.type) {
      case 'count_distinct':
        return `APPROX_COUNT_DISTINCT(${spec.column}) as ${alias}`;
      case 'quantiles':
        return `APPROX_QUANTILES(${spec.column}, ${spec.buckets || 100}) as ${alias}`;
      case 'top_count':
        return `APPROX_TOP_COUNT(${spec.column}, ${spec.limit || 10}) as ${alias}`;
      default:
        return `${spec.type}(${spec.column}) as ${alias}`;
    }
  }).join(',\n    ');

  return `
    SELECT
      ${aggClauses}
    FROM \`${tableName}\`
    ${options.where ? `WHERE ${options.where}` : ''}
    ${options.groupBy ? `GROUP BY ${options.groupBy}` : ''}`;
}

module.exports = {
  DEFAULT_CONFIG,
  generateTableStatisticsSQL,
  generateJoinStatisticsSQL,
  generateSamplingSQL,
  generateApproximateAggregationSQL
}; 