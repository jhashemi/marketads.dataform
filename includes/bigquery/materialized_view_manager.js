/**
 * @fileoverview BigQuery Materialized View Manager
 * 
 * This module provides functionality to identify, create, and manage materialized views
 * for frequently executed queries. Materialized views can significantly improve query
 * performance and reduce costs by pre-computing and storing query results.
 */

// Minimum frequency threshold for considering a query for materialization
const DEFAULT_FREQUENCY_THRESHOLD = 5;

// Minimum complexity threshold (in terms of tables joined or aggregations)
const DEFAULT_COMPLEXITY_THRESHOLD = 2;

// Maximum age (in days) for a materialized view before refresh is recommended
const DEFAULT_MAX_VIEW_AGE_DAYS = 1;

/**
 * Analyzes query history to identify candidates for materialized views
 * 
 * @param {Array} queryHistory - Array of historical queries with execution stats
 * @param {Object} options - Configuration options
 * @param {number} options.frequencyThreshold - Minimum execution frequency to consider
 * @param {number} options.complexityThreshold - Minimum query complexity to consider
 * @param {number} options.minBytesProcessed - Minimum bytes processed to consider
 * @returns {Array} Array of materialized view candidates with recommendations
 */
function identifyMaterializedViewCandidates(queryHistory, options = {}) {
  if (!queryHistory || queryHistory.length === 0) {
    return [];
  }
  
  const frequencyThreshold = options.frequencyThreshold || DEFAULT_FREQUENCY_THRESHOLD;
  const complexityThreshold = options.complexityThreshold || DEFAULT_COMPLEXITY_THRESHOLD;
  const minBytesProcessed = options.minBytesProcessed || 1000000000; // 1GB
  
  // Group similar queries together
  const queryGroups = groupSimilarQueries(queryHistory);
  
  // Evaluate each query group for materialization potential
  const candidates = [];
  
  for (const [queryPattern, queries] of Object.entries(queryGroups)) {
    // Skip if the query group doesn't meet the frequency threshold
    if (queries.length < frequencyThreshold) {
      continue;
    }
    
    // Calculate average bytes processed and execution time
    const totalBytesProcessed = queries.reduce((sum, q) => sum + (q.bytesProcessed || 0), 0);
    const totalExecutionTime = queries.reduce((sum, q) => sum + (q.executionTime || 0), 0);
    const avgBytesProcessed = totalBytesProcessed / queries.length;
    const avgExecutionTime = totalExecutionTime / queries.length;
    
    // Skip if the query doesn't process enough data
    if (avgBytesProcessed < minBytesProcessed) {
      continue;
    }
    
    // Analyze query complexity
    const complexity = analyzeQueryComplexity(queries[0].sql);
    
    // Skip if the query isn't complex enough to benefit from materialization
    if (complexity < complexityThreshold) {
      continue;
    }
    
    // Check if the query is suitable for materialization
    const suitability = assessMaterializationSuitability(queries[0].sql);
    
    if (suitability.suitable) {
      // Estimate benefits of materialization
      const benefits = estimateMaterializationBenefits(queries, avgBytesProcessed, avgExecutionTime);
      
      candidates.push({
        queryPattern,
        frequency: queries.length,
        complexity,
        avgBytesProcessed,
        avgExecutionTime,
        suitability,
        benefits,
        sampleQuery: queries[0].sql,
        lastExecuted: Math.max(...queries.map(q => q.timestamp || 0))
      });
    }
  }
  
  // Sort candidates by estimated cost savings (highest first)
  return candidates.sort((a, b) => b.benefits.estimatedCostSavingsPerMonth - a.benefits.estimatedCostSavingsPerMonth);
}

/**
 * Groups similar queries together based on their structure
 * 
 * @param {Array} queryHistory - Array of historical queries
 * @returns {Object} Map of query patterns to arrays of matching queries
 */
function groupSimilarQueries(queryHistory) {
  const queryGroups = {};
  
  queryHistory.forEach(query => {
    // Normalize the query to create a pattern
    const pattern = normalizeQuery(query.sql);
    
    if (!queryGroups[pattern]) {
      queryGroups[pattern] = [];
    }
    
    queryGroups[pattern].push(query);
  });
  
  return queryGroups;
}

/**
 * Normalizes a SQL query by removing literals and standardizing whitespace
 * 
 * @param {string} sql - The SQL query to normalize
 * @returns {string} Normalized query pattern
 */
function normalizeQuery(sql) {
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
 * Analyzes the complexity of a query based on joins, aggregations, etc.
 * 
 * @param {string} sql - The SQL query to analyze
 * @returns {number} Complexity score
 */
function analyzeQueryComplexity(sql) {
  if (!sql) return 0;
  
  let complexity = 0;
  
  // Count JOIN operations (each join adds 1 to complexity)
  const joinCount = (sql.match(/\bJOIN\b/gi) || []).length;
  complexity += joinCount;
  
  // Count aggregation functions (each adds 0.5 to complexity)
  const aggFunctions = ['SUM', 'AVG', 'COUNT', 'MIN', 'MAX'];
  let aggCount = 0;
  
  aggFunctions.forEach(func => {
    aggCount += (sql.match(new RegExp(`\\b${func}\\s*\\(`, 'gi')) || []).length;
  });
  
  complexity += aggCount * 0.5;
  
  // Check for GROUP BY (adds 1 to complexity)
  if (/\bGROUP BY\b/i.test(sql)) {
    complexity += 1;
    
    // Count the number of grouped columns
    const groupByMatch = sql.match(/\bGROUP BY\b(.*?)(?:\bHAVING\b|\bORDER BY\b|\bLIMIT\b|$)/i);
    if (groupByMatch && groupByMatch[1]) {
      const groupedColumns = groupByMatch[1].split(',').length;
      complexity += Math.min(groupedColumns * 0.2, 1); // Max 1 additional point for grouped columns
    }
  }
  
  // Check for HAVING (adds 0.5 to complexity)
  if (/\bHAVING\b/i.test(sql)) {
    complexity += 0.5;
  }
  
  // Check for window functions (each adds 1 to complexity)
  const windowFuncCount = (sql.match(/\bOVER\s*\(/gi) || []).length;
  complexity += windowFuncCount;
  
  // Check for subqueries (each adds 1 to complexity)
  const subqueryCount = (sql.match(/\(\s*SELECT\b/gi) || []).length;
  complexity += subqueryCount;
  
  return complexity;
}

/**
 * Assesses whether a query is suitable for materialization
 * 
 * @param {string} sql - The SQL query to assess
 * @returns {Object} Assessment result with suitability and reasons
 */
function assessMaterializationSuitability(sql) {
  if (!sql) {
    return {
      suitable: false,
      reasons: ['Empty query']
    };
  }
  
  const issues = [];
  
  // Check for non-deterministic functions
  const nonDeterministicFuncs = ['CURRENT_TIMESTAMP', 'CURRENT_DATE', 'CURRENT_TIME', 'NOW', 'RAND'];
  for (const func of nonDeterministicFuncs) {
    if (new RegExp(`\\b${func}\\s*\\(`, 'i').test(sql)) {
      issues.push(`Contains non-deterministic function: ${func}`);
    }
  }
  
  // Check for LIMIT without ORDER BY (makes results non-deterministic)
  if (/\bLIMIT\b/i.test(sql) && !/\bORDER BY\b/i.test(sql)) {
    issues.push('Contains LIMIT without ORDER BY, which makes results non-deterministic');
  }
  
  // Check for unsupported features in materialized views
  const unsupportedFeatures = [
    { regex: /\bUNION\b/i, message: 'UNION operations' },
    { regex: /\bINTERSECT\b/i, message: 'INTERSECT operations' },
    { regex: /\bEXCEPT\b/i, message: 'EXCEPT operations' },
    { regex: /\bWITH\s+RECURSIVE\b/i, message: 'Recursive CTEs' }
  ];
  
  for (const feature of unsupportedFeatures) {
    if (feature.regex.test(sql)) {
      issues.push(`Contains unsupported feature: ${feature.message}`);
    }
  }
  
  // Check for excessive complexity that might make materialization inefficient
  if (analyzeQueryComplexity(sql) > 10) {
    issues.push('Query is extremely complex, which might make materialization inefficient');
  }
  
  return {
    suitable: issues.length === 0,
    reasons: issues.length > 0 ? issues : ['Query is suitable for materialization']
  };
}

/**
 * Estimates the benefits of materializing a query
 * 
 * @param {Array} queries - Array of similar queries from history
 * @param {number} avgBytesProcessed - Average bytes processed by the query
 * @param {number} avgExecutionTime - Average execution time in milliseconds
 * @returns {Object} Estimated benefits
 */
function estimateMaterializationBenefits(queries, avgBytesProcessed, avgExecutionTime) {
  // Calculate query frequency per month
  const timestamps = queries.map(q => q.timestamp || 0).filter(t => t > 0);
  let queriesPerMonth = 0;
  
  if (timestamps.length >= 2) {
    const oldestTimestamp = Math.min(...timestamps);
    const newestTimestamp = Math.max(...timestamps);
    const timeRangeInDays = (newestTimestamp - oldestTimestamp) / (1000 * 60 * 60 * 24);
    
    if (timeRangeInDays > 0) {
      queriesPerMonth = (queries.length / timeRangeInDays) * 30;
    }
  } else {
    // If we don't have enough timestamp data, make a conservative estimate
    queriesPerMonth = queries.length;
  }
  
  // Estimate cost savings (BigQuery pricing is approximately $5 per TB processed)
  const bytesPerTB = 1099511627776; // 1 TB in bytes
  const costPerTB = 5; // $5 per TB
  const costPerQuery = (avgBytesProcessed / bytesPerTB) * costPerTB;
  
  // Materialized views typically reduce the bytes processed by 80-95%
  const bytesReductionFactor = 0.9; // 90% reduction
  const costSavingsPerQuery = costPerQuery * bytesReductionFactor;
  const estimatedCostSavingsPerMonth = costSavingsPerQuery * queriesPerMonth;
  
  // Estimate performance improvement
  const performanceImprovementPercent = 85; // Typical improvement is 80-90%
  const timeReductionMs = avgExecutionTime * (performanceImprovementPercent / 100);
  
  return {
    queriesPerMonth,
    costSavingsPerQuery,
    estimatedCostSavingsPerMonth,
    performanceImprovementPercent,
    timeReductionMs
  };
}

/**
 * Generates the SQL DDL statement for creating a materialized view
 * 
 * @param {string} viewName - The name for the materialized view
 * @param {string} sql - The query to materialize
 * @param {Object} options - Configuration options
 * @param {boolean} options.enableRefresh - Whether to enable automatic refresh
 * @param {string} options.refreshSchedule - Refresh schedule (e.g., 'EVERY 1 HOUR')
 * @returns {string} SQL DDL statement for creating the materialized view
 */
function generateMaterializedViewDDL(viewName, sql, options = {}) {
  if (!viewName || !sql) {
    throw new Error('Missing required parameters for generating materialized view DDL');
  }
  
  let ddl = `CREATE MATERIALIZED VIEW \`${viewName}\`\n`;
  
  // Add refresh options if specified
  if (options.enableRefresh) {
    ddl += `OPTIONS(\n  refresh_interval_minutes = ${getRefreshIntervalMinutes(options.refreshSchedule)},\n  enable_refresh = true\n)\n`;
  }
  
  // Add the query
  ddl += `AS ${sql}`;
  
  return ddl;
}

/**
 * Converts a refresh schedule string to minutes
 * 
 * @param {string} schedule - Refresh schedule (e.g., 'EVERY 1 HOUR')
 * @returns {number} Refresh interval in minutes
 */
function getRefreshIntervalMinutes(schedule) {
  if (!schedule) {
    return 60; // Default to 1 hour
  }
  
  const hourMatch = schedule.match(/EVERY\s+(\d+)\s+HOUR/i);
  if (hourMatch) {
    return parseInt(hourMatch[1]) * 60;
  }
  
  const dayMatch = schedule.match(/EVERY\s+(\d+)\s+DAY/i);
  if (dayMatch) {
    return parseInt(dayMatch[1]) * 24 * 60;
  }
  
  const minuteMatch = schedule.match(/EVERY\s+(\d+)\s+MINUTE/i);
  if (minuteMatch) {
    return parseInt(minuteMatch[1]);
  }
  
  return 60; // Default to 1 hour if format not recognized
}

/**
 * Analyzes existing materialized views and recommends optimizations
 * 
 * @param {Array} materializedViews - Array of existing materialized views with usage stats
 * @param {Array} queryHistory - Array of historical queries
 * @param {Object} options - Configuration options
 * @param {number} options.maxViewAgeDays - Maximum age in days before refresh is recommended
 * @returns {Array} Array of recommendations for existing materialized views
 */
function analyzeMaterializedViews(materializedViews, queryHistory, options = {}) {
  if (!materializedViews || materializedViews.length === 0) {
    return [];
  }
  
  const maxViewAgeDays = options.maxViewAgeDays || DEFAULT_MAX_VIEW_AGE_DAYS;
  const currentTime = Date.now();
  const recommendations = [];
  
  materializedViews.forEach(view => {
    const viewRecommendation = {
      viewName: view.name,
      recommendations: []
    };
    
    // Check if the view is being used
    const viewUsage = queryHistory.filter(query => 
      query.sql.includes(view.name) || 
      (view.baseQuery && normalizeQuery(query.sql) === normalizeQuery(view.baseQuery))
    );
    
    if (viewUsage.length === 0) {
      viewRecommendation.recommendations.push({
        type: 'unused',
        action: 'consider_dropping',
        reason: 'This materialized view has not been used in the analyzed query history'
      });
    }
    
    // Check if the view is stale
    if (view.lastRefreshed) {
      const ageInDays = (currentTime - view.lastRefreshed) / (1000 * 60 * 60 * 24);
      
      if (ageInDays > maxViewAgeDays) {
        viewRecommendation.recommendations.push({
          type: 'stale',
          action: 'refresh',
          reason: `This materialized view is ${Math.round(ageInDays)} days old, which exceeds the recommended maximum age of ${maxViewAgeDays} days`
        });
      }
    }
    
    // Check if the view's refresh schedule is appropriate
    if (view.refreshIntervalMinutes) {
      const usageFrequency = viewUsage.length;
      
      // If the view is refreshed more often than it's used, suggest reducing refresh frequency
      if (view.refreshIntervalMinutes < 60 && usageFrequency < 10) {
        viewRecommendation.recommendations.push({
          type: 'over_refreshed',
          action: 'reduce_refresh_frequency',
          reason: 'This materialized view is refreshed more frequently than necessary based on usage patterns',
          suggestedInterval: '60 minutes'
        });
      }
      
      // If the view is heavily used but refreshed infrequently, suggest increasing refresh frequency
      if (view.refreshIntervalMinutes > 360 && usageFrequency > 50) {
        viewRecommendation.recommendations.push({
          type: 'under_refreshed',
          action: 'increase_refresh_frequency',
          reason: 'This materialized view is heavily used but refreshed infrequently',
          suggestedInterval: '60 minutes'
        });
      }
    }
    
    // Only add views that have recommendations
    if (viewRecommendation.recommendations.length > 0) {
      recommendations.push(viewRecommendation);
    }
  });
  
  return recommendations;
}

/**
 * Generates a refresh statement for a materialized view
 * 
 * @param {string} viewName - The name of the materialized view to refresh
 * @returns {string} SQL statement to refresh the materialized view
 */
function generateRefreshStatement(viewName) {
  if (!viewName) {
    throw new Error('Missing view name for refresh statement');
  }
  
  return `CALL BQ.REFRESH_MATERIALIZED_VIEW(\`${viewName}\`)`;
}

/**
 * Generates a statement to modify the refresh schedule of a materialized view
 * 
 * @param {string} viewName - The name of the materialized view
 * @param {number} refreshIntervalMinutes - New refresh interval in minutes
 * @returns {string} SQL statement to modify the refresh schedule
 */
function generateModifyRefreshSchedule(viewName, refreshIntervalMinutes) {
  if (!viewName || !refreshIntervalMinutes) {
    throw new Error('Missing required parameters for modifying refresh schedule');
  }
  
  return `ALTER MATERIALIZED VIEW \`${viewName}\`
SET OPTIONS(
  refresh_interval_minutes = ${refreshIntervalMinutes}
)`;
}

/**
 * Generates a statement to drop a materialized view
 * 
 * @param {string} viewName - The name of the materialized view to drop
 * @returns {string} SQL statement to drop the materialized view
 */
function generateDropViewStatement(viewName) {
  if (!viewName) {
    throw new Error('Missing view name for drop statement');
  }
  
  return `DROP MATERIALIZED VIEW \`${viewName}\``;
}

module.exports = {
  identifyMaterializedViewCandidates,
  assessMaterializationSuitability,
  estimateMaterializationBenefits,
  generateMaterializedViewDDL,
  analyzeMaterializedViews,
  generateRefreshStatement,
  generateModifyRefreshSchedule,
  generateDropViewStatement,
  analyzeQueryComplexity,
  normalizeQuery
}; 