/**
 * @fileoverview BigQuery Query Performance Tracker
 * 
 * This module provides functionality to track, analyze, and optimize query performance
 * over time. It helps identify slow queries, track performance trends, and suggest
 * optimization opportunities.
 */

// Default time window for performance analysis (in days)
const DEFAULT_ANALYSIS_WINDOW_DAYS = 30;

// Threshold for considering a query as slow (in milliseconds)
const DEFAULT_SLOW_QUERY_THRESHOLD_MS = 5000;

// Threshold for considering a query as expensive (in bytes processed)
const DEFAULT_EXPENSIVE_QUERY_THRESHOLD_BYTES = 10 * 1024 * 1024 * 1024; // 10 GB

/**
 * Records performance metrics for a query execution
 * 
 * @param {Object} queryInfo - Information about the executed query
 * @param {string} queryInfo.sql - The SQL query text
 * @param {string} queryInfo.jobId - The BigQuery job ID
 * @param {number} queryInfo.startTime - Query start timestamp
 * @param {number} queryInfo.endTime - Query end timestamp
 * @param {number} queryInfo.bytesProcessed - Bytes processed by the query
 * @param {number} queryInfo.bytesShuffled - Bytes shuffled during query execution
 * @param {number} queryInfo.slotMs - Slot milliseconds consumed
 * @param {Object} queryInfo.metadata - Additional metadata about the query
 * @returns {Object} Recorded performance entry with calculated metrics
 */
function recordQueryPerformance(queryInfo) {
  if (!queryInfo || !queryInfo.sql || !queryInfo.startTime || !queryInfo.endTime) {
    throw new Error('Missing required query information for performance tracking');
  }
  
  // Calculate execution time
  const executionTimeMs = queryInfo.endTime - queryInfo.startTime;
  
  // Calculate cost estimate (BigQuery pricing is approximately $5 per TB processed)
  const bytesPerTB = 1099511627776; // 1 TB in bytes
  const costPerTB = 5; // $5 per TB
  const estimatedCost = (queryInfo.bytesProcessed || 0) / bytesPerTB * costPerTB;
  
  // Generate a normalized version of the query for grouping similar queries
  const normalizedQuery = normalizeQueryForGrouping(queryInfo.sql);
  
  // Create performance entry
  const performanceEntry = {
    timestamp: Date.now(),
    jobId: queryInfo.jobId,
    sql: queryInfo.sql,
    normalizedQuery,
    executionTimeMs,
    bytesProcessed: queryInfo.bytesProcessed || 0,
    bytesShuffled: queryInfo.bytesShuffled || 0,
    slotMs: queryInfo.slotMs || 0,
    estimatedCost,
    metadata: queryInfo.metadata || {}
  };
  
  // Add performance classification
  performanceEntry.classification = classifyQueryPerformance(performanceEntry);
  
  return performanceEntry;
}

/**
 * Normalizes a query for grouping similar queries together
 * 
 * @param {string} sql - The SQL query to normalize
 * @returns {string} Normalized query for grouping
 */
function normalizeQueryForGrouping(sql) {
  if (!sql) return '';
  
  // Remove comments
  let normalized = sql.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
  
  // Replace string literals with placeholders
  normalized = normalized.replace(/'[^']*'/g, "'?'");
  
  // Replace numeric literals with placeholders
  normalized = normalized.replace(/\b\d+\b/g, "?");
  
  // Replace multiple whitespace with a single space
  normalized = normalized.replace(/\s+/g, ' ').trim();
  
  return normalized;
}

/**
 * Classifies a query's performance based on execution time and resource usage
 * 
 * @param {Object} performanceEntry - The query performance entry
 * @param {Object} thresholds - Custom thresholds for classification
 * @returns {Object} Performance classification
 */
function classifyQueryPerformance(performanceEntry, thresholds = {}) {
  const slowThresholdMs = thresholds.slowQueryThresholdMs || DEFAULT_SLOW_QUERY_THRESHOLD_MS;
  const expensiveThresholdBytes = thresholds.expensiveQueryThresholdBytes || DEFAULT_EXPENSIVE_QUERY_THRESHOLD_BYTES;
  
  const classification = {
    isSlow: performanceEntry.executionTimeMs > slowThresholdMs,
    isExpensive: performanceEntry.bytesProcessed > expensiveThresholdBytes,
    performanceCategory: 'normal'
  };
  
  // Determine overall performance category
  if (classification.isSlow && classification.isExpensive) {
    classification.performanceCategory = 'critical';
  } else if (classification.isSlow) {
    classification.performanceCategory = 'slow';
  } else if (classification.isExpensive) {
    classification.performanceCategory = 'expensive';
  }
  
  return classification;
}

/**
 * Analyzes query performance history to identify trends and issues
 * 
 * @param {Array} performanceHistory - Array of query performance entries
 * @param {Object} options - Analysis options
 * @param {number} options.windowDays - Number of days to analyze
 * @param {number} options.slowQueryThresholdMs - Threshold for slow queries
 * @param {number} options.expensiveQueryThresholdBytes - Threshold for expensive queries
 * @returns {Object} Performance analysis results
 */
function analyzeQueryPerformance(performanceHistory, options = {}) {
  if (!performanceHistory || performanceHistory.length === 0) {
    return {
      totalQueries: 0,
      slowQueries: [],
      expensiveQueries: [],
      frequentQueries: [],
      performanceTrends: {},
      recommendations: []
    };
  }
  
  const windowDays = options.windowDays || DEFAULT_ANALYSIS_WINDOW_DAYS;
  const slowThresholdMs = options.slowQueryThresholdMs || DEFAULT_SLOW_QUERY_THRESHOLD_MS;
  const expensiveThresholdBytes = options.expensiveQueryThresholdBytes || DEFAULT_EXPENSIVE_QUERY_THRESHOLD_BYTES;
  
  // Filter entries within the analysis window
  const cutoffTime = Date.now() - (windowDays * 24 * 60 * 60 * 1000);
  const recentEntries = performanceHistory.filter(entry => entry.timestamp >= cutoffTime);
  
  if (recentEntries.length === 0) {
    return {
      totalQueries: 0,
      slowQueries: [],
      expensiveQueries: [],
      frequentQueries: [],
      performanceTrends: {},
      recommendations: []
    };
  }
  
  // Group queries by normalized query text
  const queryGroups = {};
  recentEntries.forEach(entry => {
    if (!queryGroups[entry.normalizedQuery]) {
      queryGroups[entry.normalizedQuery] = [];
    }
    queryGroups[entry.normalizedQuery].push(entry);
  });
  
  // Identify slow queries
  const slowQueries = recentEntries
    .filter(entry => entry.executionTimeMs > slowThresholdMs)
    .sort((a, b) => b.executionTimeMs - a.executionTimeMs)
    .slice(0, 10); // Top 10 slowest
  
  // Identify expensive queries
  const expensiveQueries = recentEntries
    .filter(entry => entry.bytesProcessed > expensiveThresholdBytes)
    .sort((a, b) => b.bytesProcessed - a.bytesProcessed)
    .slice(0, 10); // Top 10 most expensive
  
  // Identify most frequent query patterns
  const frequentQueries = Object.entries(queryGroups)
    .map(([normalizedQuery, entries]) => ({
      normalizedQuery,
      count: entries.length,
      avgExecutionTimeMs: entries.reduce((sum, entry) => sum + entry.executionTimeMs, 0) / entries.length,
      avgBytesProcessed: entries.reduce((sum, entry) => sum + entry.bytesProcessed, 0) / entries.length,
      totalCost: entries.reduce((sum, entry) => sum + entry.estimatedCost, 0),
      sampleQuery: entries[0].sql
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10); // Top 10 most frequent
  
  // Analyze performance trends over time
  const performanceTrends = analyzePerformanceTrends(recentEntries);
  
  // Generate optimization recommendations
  const recommendations = generateOptimizationRecommendations(
    slowQueries,
    expensiveQueries,
    frequentQueries,
    performanceTrends
  );
  
  return {
    totalQueries: recentEntries.length,
    slowQueries,
    expensiveQueries,
    frequentQueries,
    performanceTrends,
    recommendations
  };
}

/**
 * Analyzes performance trends over time
 * 
 * @param {Array} performanceEntries - Array of query performance entries
 * @returns {Object} Performance trends analysis
 */
function analyzePerformanceTrends(performanceEntries) {
  if (!performanceEntries || performanceEntries.length < 2) {
    return {
      overallTrend: 'insufficient_data',
      executionTimeTrend: 'insufficient_data',
      bytesProcessedTrend: 'insufficient_data',
      costTrend: 'insufficient_data',
      timeSeriesData: []
    };
  }
  
  // Sort entries by timestamp
  const sortedEntries = [...performanceEntries].sort((a, b) => a.timestamp - b.timestamp);
  
  // Group entries by day for time series analysis
  const dailyStats = {};
  
  sortedEntries.forEach(entry => {
    const day = new Date(entry.timestamp).toISOString().split('T')[0];
    
    if (!dailyStats[day]) {
      dailyStats[day] = {
        day,
        count: 0,
        totalExecutionTimeMs: 0,
        totalBytesProcessed: 0,
        totalCost: 0
      };
    }
    
    dailyStats[day].count++;
    dailyStats[day].totalExecutionTimeMs += entry.executionTimeMs;
    dailyStats[day].totalBytesProcessed += entry.bytesProcessed;
    dailyStats[day].totalCost += entry.estimatedCost;
  });
  
  // Convert to time series and calculate averages
  const timeSeriesData = Object.values(dailyStats)
    .map(day => ({
      day: day.day,
      queryCount: day.count,
      avgExecutionTimeMs: day.totalExecutionTimeMs / day.count,
      avgBytesProcessed: day.totalBytesProcessed / day.count,
      avgCost: day.totalCost / day.count
    }))
    .sort((a, b) => a.day.localeCompare(b.day));
  
  // Calculate trends
  const executionTimeTrend = calculateTrend(timeSeriesData.map(d => d.avgExecutionTimeMs));
  const bytesProcessedTrend = calculateTrend(timeSeriesData.map(d => d.avgBytesProcessed));
  const costTrend = calculateTrend(timeSeriesData.map(d => d.avgCost));
  
  // Determine overall trend (weighted average of individual trends)
  const trendValues = {
    'improving': -1,
    'stable': 0,
    'degrading': 1,
    'insufficient_data': 0
  };
  
  const trendScore = (
    trendValues[executionTimeTrend] * 0.4 +
    trendValues[bytesProcessedTrend] * 0.3 +
    trendValues[costTrend] * 0.3
  );
  
  let overallTrend;
  if (trendScore <= -0.3) {
    overallTrend = 'improving';
  } else if (trendScore >= 0.3) {
    overallTrend = 'degrading';
  } else {
    overallTrend = 'stable';
  }
  
  return {
    overallTrend,
    executionTimeTrend,
    bytesProcessedTrend,
    costTrend,
    timeSeriesData
  };
}

/**
 * Calculates the trend direction for a series of values
 * 
 * @param {Array} values - Array of numeric values
 * @returns {string} Trend direction ('improving', 'stable', 'degrading', or 'insufficient_data')
 */
function calculateTrend(values) {
  if (!values || values.length < 5) {
    return 'insufficient_data';
  }
  
  // Simple linear regression to determine trend
  const n = values.length;
  const indices = Array.from({ length: n }, (_, i) => i);
  
  const sumX = indices.reduce((sum, x) => sum + x, 0);
  const sumY = values.reduce((sum, y) => sum + y, 0);
  const sumXY = indices.reduce((sum, x, i) => sum + x * values[i], 0);
  const sumXX = indices.reduce((sum, x) => sum + x * x, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  
  // Normalize slope by the mean value to get relative change
  const meanY = sumY / n;
  const normalizedSlope = meanY !== 0 ? slope / meanY : 0;
  
  // Determine trend direction based on normalized slope
  if (normalizedSlope < -0.05) {
    return 'improving'; // Negative slope means decreasing values (usually good for performance metrics)
  } else if (normalizedSlope > 0.05) {
    return 'degrading'; // Positive slope means increasing values (usually bad for performance metrics)
  } else {
    return 'stable'; // Slope near zero means stable values
  }
}

/**
 * Generates optimization recommendations based on performance analysis
 * 
 * @param {Array} slowQueries - Array of slow queries
 * @param {Array} expensiveQueries - Array of expensive queries
 * @param {Array} frequentQueries - Array of frequent query patterns
 * @param {Object} performanceTrends - Performance trends analysis
 * @returns {Array} Array of optimization recommendations
 */
function generateOptimizationRecommendations(slowQueries, expensiveQueries, frequentQueries, performanceTrends) {
  const recommendations = [];
  
  // Recommend materialized views for frequent expensive queries
  frequentQueries.forEach(query => {
    if (query.count >= 5 && query.avgBytesProcessed > 1000000000) { // 1 GB
      recommendations.push({
        type: 'materialized_view',
        priority: 'high',
        description: `Consider creating a materialized view for frequently executed query pattern (${query.count} executions)`,
        query: query.sampleQuery,
        estimatedImpact: {
          executionTimeReduction: '80-90%',
          costReduction: '80-90%'
        }
      });
    }
  });
  
  // Recommend partitioning for expensive queries
  expensiveQueries.forEach(query => {
    const tableNames = extractTableNames(query.sql);
    
    if (tableNames.length > 0) {
      recommendations.push({
        type: 'partitioning',
        priority: 'high',
        description: `Consider partitioning tables used in expensive query (${formatBytes(query.bytesProcessed)} processed)`,
        query: query.sql,
        tables: tableNames,
        estimatedImpact: {
          costReduction: '40-80%',
          executionTimeReduction: '30-70%'
        }
      });
    }
  });
  
  // Recommend clustering for slow queries with filters or joins
  slowQueries.forEach(query => {
    if (hasFiltersOrJoins(query.sql)) {
      const tableNames = extractTableNames(query.sql);
      const columnNames = extractFilterColumns(query.sql);
      
      if (tableNames.length > 0 && columnNames.length > 0) {
        recommendations.push({
          type: 'clustering',
          priority: 'medium',
          description: `Consider clustering tables on columns used in filters/joins for slow query (${query.executionTimeMs}ms)`,
          query: query.sql,
          tables: tableNames,
          columns: columnNames.slice(0, 4), // BigQuery supports up to 4 clustering columns
          estimatedImpact: {
            executionTimeReduction: '20-50%',
            costReduction: '10-30%'
          }
        });
      }
    }
  });
  
  // Recommend query optimization for degrading performance trends
  if (performanceTrends.overallTrend === 'degrading') {
    recommendations.push({
      type: 'query_optimization',
      priority: 'high',
      description: 'Overall query performance is degrading over time, consider reviewing recent schema or data volume changes',
      estimatedImpact: {
        executionTimeReduction: 'varies',
        costReduction: 'varies'
      }
    });
  }
  
  // Recommend caching for frequent small queries
  frequentQueries.forEach(query => {
    if (query.count >= 10 && query.avgBytesProcessed < 100000000) { // 100 MB
      recommendations.push({
        type: 'result_caching',
        priority: 'low',
        description: `Enable result caching for frequently executed small query (${query.count} executions)`,
        query: query.sampleQuery,
        estimatedImpact: {
          executionTimeReduction: '90-100%',
          costReduction: '90-100% for cached results'
        }
      });
    }
  });
  
  return recommendations;
}

/**
 * Extracts table names from a SQL query
 * 
 * @param {string} sql - The SQL query
 * @returns {Array} Array of table names
 */
function extractTableNames(sql) {
  if (!sql) return [];
  
  const tableNames = new Set();
  
  // Match table names in FROM clauses
  const fromMatches = sql.match(/FROM\s+`?([a-zA-Z0-9_.-]+)`?(?:\s+AS\s+[a-zA-Z0-9_]+)?/gi);
  if (fromMatches) {
    fromMatches.forEach(match => {
      const tableName = match.replace(/FROM\s+`?([a-zA-Z0-9_.-]+)`?(?:\s+AS\s+[a-zA-Z0-9_]+)?/i, '$1');
      tableNames.add(tableName);
    });
  }
  
  // Match table names in JOIN clauses
  const joinMatches = sql.match(/JOIN\s+`?([a-zA-Z0-9_.-]+)`?(?:\s+AS\s+[a-zA-Z0-9_]+)?/gi);
  if (joinMatches) {
    joinMatches.forEach(match => {
      const tableName = match.replace(/JOIN\s+`?([a-zA-Z0-9_.-]+)`?(?:\s+AS\s+[a-zA-Z0-9_]+)?/i, '$1');
      tableNames.add(tableName);
    });
  }
  
  return Array.from(tableNames);
}

/**
 * Extracts column names used in filters from a SQL query
 * 
 * @param {string} sql - The SQL query
 * @returns {Array} Array of column names
 */
function extractFilterColumns(sql) {
  if (!sql) return [];
  
  const columnNames = new Set();
  
  // Match column names in WHERE clauses
  const whereClauseMatch = sql.match(/WHERE\s+(.+?)(?:GROUP BY|ORDER BY|LIMIT|$)/i);
  if (whereClauseMatch && whereClauseMatch[1]) {
    const whereClause = whereClauseMatch[1];
    
    // Extract column names from comparison operations
    const columnMatches = whereClause.match(/([a-zA-Z0-9_]+)\s*(?:=|>|<|>=|<=|!=|<>|LIKE|IN|BETWEEN)/gi);
    if (columnMatches) {
      columnMatches.forEach(match => {
        const columnName = match.replace(/([a-zA-Z0-9_]+)\s*(?:=|>|<|>=|<=|!=|<>|LIKE|IN|BETWEEN).*/i, '$1');
        columnNames.add(columnName);
      });
    }
  }
  
  // Match column names in JOIN conditions
  const joinMatches = sql.match(/ON\s+(.+?)(?:WHERE|JOIN|GROUP BY|ORDER BY|LIMIT|$)/gi);
  if (joinMatches) {
    joinMatches.forEach(match => {
      const joinCondition = match.replace(/ON\s+/i, '');
      
      // Extract column names from join conditions
      const columnMatches = joinCondition.match(/([a-zA-Z0-9_.]+)\s*(?:=|>|<|>=|<=)/gi);
      if (columnMatches) {
        columnMatches.forEach(colMatch => {
          const columnName = colMatch.replace(/([a-zA-Z0-9_.]+)\s*(?:=|>|<|>=|<=).*/i, '$1');
          // Remove table prefix if present
          const cleanColumnName = columnName.includes('.') ? columnName.split('.')[1] : columnName;
          columnNames.add(cleanColumnName);
        });
      }
    });
  }
  
  return Array.from(columnNames);
}

/**
 * Checks if a SQL query contains filters or joins
 * 
 * @param {string} sql - The SQL query
 * @returns {boolean} True if the query contains filters or joins
 */
function hasFiltersOrJoins(sql) {
  if (!sql) return false;
  
  return /WHERE\b/i.test(sql) || /JOIN\b/i.test(sql);
}

/**
 * Formats bytes into a human-readable string
 * 
 * @param {number} bytes - The number of bytes
 * @returns {string} Formatted string (e.g., "1.5 GB")
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Generates a performance report for a specific time period
 * 
 * @param {Array} performanceHistory - Array of query performance entries
 * @param {Object} options - Report options
 * @param {number} options.days - Number of days to include in the report
 * @returns {Object} Performance report
 */
function generatePerformanceReport(performanceHistory, options = {}) {
  const days = options.days || 30;
  
  // Analyze query performance
  const analysis = analyzeQueryPerformance(performanceHistory, { windowDays: days });
  
  // Calculate summary statistics
  const totalQueries = analysis.totalQueries;
  const totalSlowQueries = analysis.slowQueries.length;
  const totalExpensiveQueries = analysis.expensiveQueries.length;
  
  // Calculate total cost
  const totalCost = performanceHistory.reduce((sum, entry) => sum + entry.estimatedCost, 0);
  
  // Calculate average execution time
  const avgExecutionTime = performanceHistory.length > 0 ?
    performanceHistory.reduce((sum, entry) => sum + entry.executionTimeMs, 0) / performanceHistory.length :
    0;
  
  // Generate report
  return {
    period: `Last ${days} days`,
    summary: {
      totalQueries,
      totalSlowQueries,
      totalExpensiveQueries,
      totalCost,
      avgExecutionTime,
      performanceTrend: analysis.performanceTrends.overallTrend
    },
    topSlowQueries: analysis.slowQueries.map(q => ({
      executionTimeMs: q.executionTimeMs,
      bytesProcessed: q.bytesProcessed,
      timestamp: q.timestamp,
      sql: q.sql
    })),
    topExpensiveQueries: analysis.expensiveQueries.map(q => ({
      bytesProcessed: q.bytesProcessed,
      estimatedCost: q.estimatedCost,
      executionTimeMs: q.executionTimeMs,
      timestamp: q.timestamp,
      sql: q.sql
    })),
    mostFrequentPatterns: analysis.frequentQueries,
    performanceTrends: analysis.performanceTrends.timeSeriesData,
    recommendations: analysis.recommendations
  };
}

module.exports = {
  recordQueryPerformance,
  analyzeQueryPerformance,
  generatePerformanceReport,
  normalizeQueryForGrouping,
  classifyQueryPerformance,
  analyzePerformanceTrends,
  generateOptimizationRecommendations,
  DEFAULT_ANALYSIS_WINDOW_DAYS,
  DEFAULT_SLOW_QUERY_THRESHOLD_MS,
  DEFAULT_EXPENSIVE_QUERY_THRESHOLD_BYTES
}; 