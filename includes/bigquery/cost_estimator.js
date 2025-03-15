/**
 * @fileoverview BigQuery Cost Estimator
 * 
 * This module provides functionality to estimate and optimize costs for BigQuery operations.
 * It helps predict query costs, analyze cost trends, and suggest cost optimization strategies.
 */

// BigQuery pricing constants (in USD)
const PRICING = {
  // On-demand query pricing per TB
  QUERY_TB: 5.00,
  
  // Storage pricing per TB per month
  STORAGE_ACTIVE_TB_MONTH: 0.02,  // $0.02 per GB = $20 per TB
  STORAGE_LONG_TERM_TB_MONTH: 0.01, // $0.01 per GB = $10 per TB
  
  // Streaming inserts per GB
  STREAMING_GB: 0.01,
  
  // Flat-rate pricing (slots)
  SLOT_100_MONTHLY: 2000, // $2000 for 100 slots per month
  
  // Free tier allowances
  FREE_QUERY_TB: 1,
  FREE_STORAGE_GB: 10
};

// Bytes conversion constants
const BYTES = {
  KB: 1024,
  MB: 1024 * 1024,
  GB: 1024 * 1024 * 1024,
  TB: 1024 * 1024 * 1024 * 1024
};

/**
 * Estimates the cost of a BigQuery query based on bytes processed
 * 
 * @param {number} bytesProcessed - Number of bytes processed by the query
 * @param {Object} options - Cost estimation options
 * @param {boolean} options.applyFreeTier - Whether to apply free tier allowance
 * @param {number} options.freeTierRemainingTB - Remaining free tier allowance in TB
 * @returns {Object} Cost estimate details
 */
function estimateQueryCost(bytesProcessed, options = {}) {
  if (bytesProcessed === undefined || bytesProcessed === null) {
    throw new Error('Bytes processed must be provided for query cost estimation');
  }
  
  const applyFreeTier = options.applyFreeTier !== false;
  const freeTierRemainingTB = options.freeTierRemainingTB !== undefined ? 
    options.freeTierRemainingTB : PRICING.FREE_QUERY_TB;
  
  // Convert bytes to TB for pricing calculation
  const terabytesProcessed = bytesProcessed / BYTES.TB;
  
  // Apply free tier if enabled
  let billableTerabytes = terabytesProcessed;
  let freeTierUsed = 0;
  
  if (applyFreeTier && freeTierRemainingTB > 0) {
    freeTierUsed = Math.min(terabytesProcessed, freeTierRemainingTB);
    billableTerabytes = Math.max(0, terabytesProcessed - freeTierUsed);
  }
  
  // Calculate cost
  const cost = billableTerabytes * PRICING.QUERY_TB;
  
  return {
    bytesProcessed,
    terabytesProcessed,
    billableTerabytes,
    freeTierUsed,
    cost,
    pricingModel: 'on_demand'
  };
}

/**
 * Estimates the cost of BigQuery storage
 * 
 * @param {Object} storageDetails - Storage details
 * @param {number} storageDetails.activeStorageBytes - Active storage in bytes
 * @param {number} storageDetails.longTermStorageBytes - Long-term storage in bytes
 * @param {Object} options - Cost estimation options
 * @param {boolean} options.applyFreeTier - Whether to apply free tier allowance
 * @returns {Object} Cost estimate details
 */
function estimateStorageCost(storageDetails, options = {}) {
  if (!storageDetails || 
      (storageDetails.activeStorageBytes === undefined && 
       storageDetails.longTermStorageBytes === undefined)) {
    throw new Error('Storage details must be provided for storage cost estimation');
  }
  
  const applyFreeTier = options.applyFreeTier !== false;
  const activeStorageBytes = storageDetails.activeStorageBytes || 0;
  const longTermStorageBytes = storageDetails.longTermStorageBytes || 0;
  
  // Convert bytes to TB for pricing calculation
  const activeStorageTB = activeStorageBytes / BYTES.TB;
  const longTermStorageTB = longTermStorageBytes / BYTES.TB;
  
  // Apply free tier if enabled (10 GB free storage)
  let billableActiveStorageTB = activeStorageTB;
  let billableLongTermStorageTB = longTermStorageTB;
  let freeTierUsedGB = 0;
  
  if (applyFreeTier) {
    const totalStorageGB = (activeStorageBytes + longTermStorageBytes) / BYTES.GB;
    freeTierUsedGB = Math.min(totalStorageGB, PRICING.FREE_STORAGE_GB);
    
    // Apply free tier proportionally to active and long-term storage
    if (totalStorageGB > 0) {
      const activeStorageRatio = (activeStorageBytes / BYTES.GB) / totalStorageGB;
      const freeTierActiveGB = freeTierUsedGB * activeStorageRatio;
      const freeTierLongTermGB = freeTierUsedGB * (1 - activeStorageRatio);
      
      billableActiveStorageTB = Math.max(0, (activeStorageBytes - (freeTierActiveGB * BYTES.GB))) / BYTES.TB;
      billableLongTermStorageTB = Math.max(0, (longTermStorageBytes - (freeTierLongTermGB * BYTES.GB))) / BYTES.TB;
    }
  }
  
  // Calculate costs
  const activeStorageCost = billableActiveStorageTB * PRICING.STORAGE_ACTIVE_TB_MONTH;
  const longTermStorageCost = billableLongTermStorageTB * PRICING.STORAGE_LONG_TERM_TB_MONTH;
  const totalCost = activeStorageCost + longTermStorageCost;
  
  return {
    activeStorageBytes,
    longTermStorageBytes,
    activeStorageTB,
    longTermStorageTB,
    billableActiveStorageTB,
    billableLongTermStorageTB,
    freeTierUsedGB,
    activeStorageCost,
    longTermStorageCost,
    totalCost
  };
}

/**
 * Estimates the cost of streaming inserts
 * 
 * @param {number} streamingBytes - Bytes streamed
 * @returns {Object} Cost estimate details
 */
function estimateStreamingCost(streamingBytes) {
  if (streamingBytes === undefined || streamingBytes === null) {
    throw new Error('Streaming bytes must be provided for streaming cost estimation');
  }
  
  // Convert bytes to GB for pricing calculation
  const streamingGB = streamingBytes / BYTES.GB;
  
  // Calculate cost
  const cost = streamingGB * PRICING.STREAMING_GB;
  
  return {
    streamingBytes,
    streamingGB,
    cost
  };
}

/**
 * Estimates the cost of flat-rate pricing (slots)
 * 
 * @param {number} slots - Number of slots
 * @param {string} commitmentTerm - Commitment term ('monthly', 'annual', or 'flex')
 * @returns {Object} Cost estimate details
 */
function estimateSlotCost(slots, commitmentTerm = 'monthly') {
  if (slots === undefined || slots === null) {
    throw new Error('Number of slots must be provided for slot cost estimation');
  }
  
  // Calculate number of 100-slot blocks (minimum 100 slots)
  const slotBlocks = Math.max(1, Math.ceil(slots / 100));
  
  // Apply discount based on commitment term
  let discountFactor = 1.0; // No discount for monthly
  
  if (commitmentTerm === 'annual') {
    discountFactor = 0.8; // 20% discount for annual commitment
  } else if (commitmentTerm === 'flex') {
    discountFactor = 1.5; // 50% premium for flex commitment
  }
  
  // Calculate cost
  const monthlyCost = slotBlocks * PRICING.SLOT_100_MONTHLY * discountFactor;
  const annualCost = monthlyCost * 12;
  
  return {
    slots,
    slotBlocks,
    commitmentTerm,
    discountFactor,
    monthlyCost,
    annualCost,
    effectiveCostPerSlot: monthlyCost / slots
  };
}

/**
 * Compares on-demand vs. flat-rate pricing for a given workload
 * 
 * @param {Object} workload - Workload details
 * @param {number} workload.monthlyBytesProcessed - Monthly bytes processed
 * @param {number} workload.peakConcurrentQueries - Peak number of concurrent queries
 * @param {Object} options - Comparison options
 * @param {boolean} options.includeAnnualCommitment - Whether to include annual commitment in comparison
 * @returns {Object} Pricing comparison results
 */
function compareOnDemandVsFlatRate(workload, options = {}) {
  if (!workload || !workload.monthlyBytesProcessed) {
    throw new Error('Monthly bytes processed must be provided for pricing comparison');
  }
  
  const includeAnnualCommitment = options.includeAnnualCommitment !== false;
  
  // Estimate on-demand cost
  const monthlyTBProcessed = workload.monthlyBytesProcessed / BYTES.TB;
  const onDemandCost = monthlyTBProcessed * PRICING.QUERY_TB;
  
  // Estimate required slots based on peak concurrent queries
  // A rough estimate is 50-100 slots per concurrent query
  const peakConcurrentQueries = workload.peakConcurrentQueries || 1;
  const estimatedSlotsNeeded = peakConcurrentQueries * 75; // Using 75 as a middle ground
  
  // Calculate flat-rate costs
  const monthlyCommitment = estimateSlotCost(estimatedSlotsNeeded, 'monthly');
  const annualCommitment = includeAnnualCommitment ? 
    estimateSlotCost(estimatedSlotsNeeded, 'annual') : null;
  
  // Determine break-even point (TB processed where flat-rate becomes cheaper)
  const monthlyBreakEvenTB = monthlyCommitment.monthlyCost / PRICING.QUERY_TB;
  const annualBreakEvenTB = annualCommitment ? 
    annualCommitment.monthlyCost / PRICING.QUERY_TB : null;
  
  // Determine recommended pricing model
  let recommendedModel = 'on_demand';
  let savingsAmount = 0;
  let savingsPercent = 0;
  
  if (annualCommitment && monthlyTBProcessed > annualBreakEvenTB) {
    recommendedModel = 'annual_flat_rate';
    savingsAmount = onDemandCost - annualCommitment.monthlyCost;
    savingsPercent = (savingsAmount / onDemandCost) * 100;
  } else if (monthlyTBProcessed > monthlyBreakEvenTB) {
    recommendedModel = 'monthly_flat_rate';
    savingsAmount = onDemandCost - monthlyCommitment.monthlyCost;
    savingsPercent = (savingsAmount / onDemandCost) * 100;
  }
  
  return {
    workload: {
      monthlyBytesProcessed: workload.monthlyBytesProcessed,
      monthlyTBProcessed,
      peakConcurrentQueries,
      estimatedSlotsNeeded
    },
    onDemand: {
      monthlyCost: onDemandCost,
      annualCost: onDemandCost * 12
    },
    flatRate: {
      monthly: monthlyCommitment,
      annual: annualCommitment
    },
    breakEven: {
      monthlyCommitmentTB: monthlyBreakEvenTB,
      annualCommitmentTB: annualBreakEvenTB
    },
    recommendation: {
      model: recommendedModel,
      savingsAmount,
      savingsPercent
    }
  };
}

/**
 * Analyzes query history to estimate monthly costs and suggest optimizations
 * 
 * @param {Array} queryHistory - Array of query execution records
 * @param {Object} options - Analysis options
 * @returns {Object} Cost analysis and optimization suggestions
 */
function analyzeQueryCosts(queryHistory, options = {}) {
  if (!queryHistory || queryHistory.length === 0) {
    return {
      totalQueries: 0,
      estimatedMonthlyCost: 0,
      costBreakdown: {},
      optimizationSuggestions: []
    };
  }
  
  // Group queries by normalized pattern
  const queryPatterns = {};
  let totalBytesProcessed = 0;
  let totalCost = 0;
  
  queryHistory.forEach(query => {
    const normalizedQuery = normalizeQueryForCosting(query.sql);
    
    if (!queryPatterns[normalizedQuery]) {
      queryPatterns[normalizedQuery] = {
        count: 0,
        totalBytesProcessed: 0,
        totalCost: 0,
        sampleQuery: query.sql,
        executions: []
      };
    }
    
    // Calculate cost for this query
    const bytesProcessed = query.bytesProcessed || 0;
    const costEstimate = estimateQueryCost(bytesProcessed, { applyFreeTier: false });
    
    queryPatterns[normalizedQuery].count++;
    queryPatterns[normalizedQuery].totalBytesProcessed += bytesProcessed;
    queryPatterns[normalizedQuery].totalCost += costEstimate.cost;
    queryPatterns[normalizedQuery].executions.push({
      timestamp: query.timestamp,
      bytesProcessed,
      cost: costEstimate.cost
    });
    
    totalBytesProcessed += bytesProcessed;
    totalCost += costEstimate.cost;
  });
  
  // Calculate monthly projection based on query history timespan
  const timestamps = queryHistory.map(q => q.timestamp).filter(t => t);
  const oldestTimestamp = Math.min(...timestamps);
  const newestTimestamp = Math.max(...timestamps);
  const timeSpanDays = (newestTimestamp - oldestTimestamp) / (1000 * 60 * 60 * 24);
  
  let monthlyMultiplier = 30; // Default to 30 if we can't calculate
  if (timeSpanDays > 0) {
    monthlyMultiplier = 30 / timeSpanDays;
  }
  
  const estimatedMonthlyBytesProcessed = totalBytesProcessed * monthlyMultiplier;
  const estimatedMonthlyCost = totalCost * monthlyMultiplier;
  
  // Sort query patterns by cost (highest first)
  const costliestPatterns = Object.entries(queryPatterns)
    .map(([pattern, stats]) => ({
      pattern,
      count: stats.count,
      totalBytesProcessed: stats.totalBytesProcessed,
      totalCost: stats.totalCost,
      estimatedMonthlyCost: stats.totalCost * monthlyMultiplier,
      sampleQuery: stats.sampleQuery
    }))
    .sort((a, b) => b.totalCost - a.totalCost)
    .slice(0, 10); // Top 10 costliest patterns
  
  // Generate optimization suggestions
  const optimizationSuggestions = generateCostOptimizationSuggestions(
    costliestPatterns,
    estimatedMonthlyBytesProcessed,
    queryHistory
  );
  
  // Compare on-demand vs. flat-rate pricing
  const pricingComparison = compareOnDemandVsFlatRate({
    monthlyBytesProcessed: estimatedMonthlyBytesProcessed,
    peakConcurrentQueries: estimatePeakConcurrentQueries(queryHistory)
  });
  
  return {
    timeSpanDays,
    totalQueries: queryHistory.length,
    totalBytesProcessed,
    totalCost,
    estimatedMonthlyBytesProcessed,
    estimatedMonthlyCost,
    costliestPatterns,
    pricingComparison,
    optimizationSuggestions
  };
}

/**
 * Normalizes a query for cost analysis by removing literals and standardizing whitespace
 * 
 * @param {string} sql - The SQL query to normalize
 * @returns {string} Normalized query pattern
 */
function normalizeQueryForCosting(sql) {
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
 * Estimates the peak number of concurrent queries from query history
 * 
 * @param {Array} queryHistory - Array of query execution records
 * @returns {number} Estimated peak concurrent queries
 */
function estimatePeakConcurrentQueries(queryHistory) {
  if (!queryHistory || queryHistory.length === 0) {
    return 1;
  }
  
  // Filter queries with start and end times
  const queriesWithTimes = queryHistory.filter(q => 
    q.startTime && q.endTime && q.startTime < q.endTime
  );
  
  if (queriesWithTimes.length === 0) {
    // If we don't have timing data, estimate based on total query count
    return Math.max(1, Math.ceil(queryHistory.length / 100));
  }
  
  // Create events for query starts and ends
  const events = [];
  
  queriesWithTimes.forEach(query => {
    events.push({ time: query.startTime, type: 'start' });
    events.push({ time: query.endTime, type: 'end' });
  });
  
  // Sort events by time
  events.sort((a, b) => a.time - b.time);
  
  // Count concurrent queries at each event
  let currentConcurrent = 0;
  let peakConcurrent = 0;
  
  events.forEach(event => {
    if (event.type === 'start') {
      currentConcurrent++;
    } else {
      currentConcurrent--;
    }
    
    peakConcurrent = Math.max(peakConcurrent, currentConcurrent);
  });
  
  return Math.max(1, peakConcurrent);
}

/**
 * Generates cost optimization suggestions based on query analysis
 * 
 * @param {Array} costliestPatterns - Array of costliest query patterns
 * @param {number} monthlyBytesProcessed - Estimated monthly bytes processed
 * @param {Array} queryHistory - Full query history for additional analysis
 * @returns {Array} Array of optimization suggestions
 */
function generateCostOptimizationSuggestions(costliestPatterns, monthlyBytesProcessed, queryHistory) {
  const suggestions = [];
  
  // Suggest materialized views for frequent expensive queries
  costliestPatterns.forEach(pattern => {
    if (pattern.count >= 5 && pattern.totalBytesProcessed > 1000000000) { // 1 GB
      suggestions.push({
        type: 'materialized_view',
        priority: 'high',
        description: `Consider creating a materialized view for frequently executed expensive query pattern (${pattern.count} executions, $${pattern.totalCost.toFixed(2)})`,
        estimatedMonthlySavings: pattern.estimatedMonthlyCost * 0.9, // Assume 90% cost reduction
        query: pattern.sampleQuery
      });
    }
  });
  
  // Suggest partitioning for large tables
  const largeTableQueries = costliestPatterns.filter(p => p.totalBytesProcessed > 10 * BYTES.GB);
  const tableNames = new Set();
  
  largeTableQueries.forEach(pattern => {
    extractTableNames(pattern.sampleQuery).forEach(table => tableNames.add(table));
  });
  
  if (tableNames.size > 0) {
    suggestions.push({
      type: 'partitioning',
      priority: 'high',
      description: `Consider partitioning large tables to reduce query costs`,
      tables: Array.from(tableNames),
      estimatedMonthlySavings: estimateMonthlyCost(monthlyBytesProcessed) * 0.4 // Assume 40% cost reduction
    });
  }
  
  // Suggest flat-rate pricing if cost-effective
  if (monthlyBytesProcessed > 200 * BYTES.TB) {
    suggestions.push({
      type: 'flat_rate_pricing',
      priority: 'medium',
      description: 'Consider flat-rate pricing for high-volume workloads',
      estimatedMonthlySavings: estimateMonthlyCost(monthlyBytesProcessed) * 0.3 // Assume 30% cost reduction
    });
  }
  
  // Suggest query caching for small, frequent queries
  const smallFrequentQueries = costliestPatterns.filter(p => 
    p.count > 10 && p.totalBytesProcessed < 1 * BYTES.GB
  );
  
  if (smallFrequentQueries.length > 0) {
    suggestions.push({
      type: 'query_caching',
      priority: 'medium',
      description: `Enable query results cache for ${smallFrequentQueries.length} small, frequent query patterns`,
      estimatedMonthlySavings: smallFrequentQueries.reduce((sum, p) => sum + p.estimatedMonthlyCost * 0.5, 0) // Assume 50% cost reduction
    });
  }
  
  // Suggest BI Engine for interactive dashboards
  if (hasInteractiveDashboardPatterns(queryHistory)) {
    suggestions.push({
      type: 'bi_engine',
      priority: 'medium',
      description: 'Consider using BI Engine for interactive dashboard queries',
      estimatedMonthlySavings: estimateMonthlyCost(monthlyBytesProcessed) * 0.2 // Assume 20% cost reduction
    });
  }
  
  return suggestions;
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
 * Estimates monthly cost based on bytes processed
 * 
 * @param {number} bytesProcessed - Bytes processed
 * @returns {number} Estimated cost
 */
function estimateMonthlyCost(bytesProcessed) {
  return (bytesProcessed / BYTES.TB) * PRICING.QUERY_TB;
}

/**
 * Detects if query history contains patterns typical of interactive dashboards
 * 
 * @param {Array} queryHistory - Query history
 * @returns {boolean} True if interactive dashboard patterns are detected
 */
function hasInteractiveDashboardPatterns(queryHistory) {
  if (!queryHistory || queryHistory.length < 10) {
    return false;
  }
  
  // Look for patterns typical of dashboards:
  // 1. Many small queries (< 100MB)
  // 2. Similar queries executed in bursts
  // 3. Queries with LIMIT clauses
  
  const smallQueries = queryHistory.filter(q => 
    q.bytesProcessed && q.bytesProcessed < 100 * BYTES.MB
  );
  
  const queriesWithLimit = queryHistory.filter(q => 
    q.sql && q.sql.toUpperCase().includes('LIMIT')
  );
  
  // Check if we have enough small queries and queries with LIMIT
  return smallQueries.length > queryHistory.length * 0.3 && 
         queriesWithLimit.length > queryHistory.length * 0.3;
}

/**
 * Forecasts future costs based on historical trends
 * 
 * @param {Array} monthlyCosts - Array of monthly cost records
 * @param {number} forecastMonths - Number of months to forecast
 * @returns {Object} Cost forecast
 */
function forecastCosts(monthlyCosts, forecastMonths = 3) {
  if (!monthlyCosts || monthlyCosts.length < 2) {
    return {
      forecast: [],
      trend: 'insufficient_data'
    };
  }
  
  // Sort costs by month
  const sortedCosts = [...monthlyCosts].sort((a, b) => a.month.localeCompare(b.month));
  
  // Calculate growth rate using simple linear regression
  const n = sortedCosts.length;
  const x = Array.from({ length: n }, (_, i) => i);
  const y = sortedCosts.map(c => c.cost);
  
  const sumX = x.reduce((sum, val) => sum + val, 0);
  const sumY = y.reduce((sum, val) => sum + val, 0);
  const sumXY = x.reduce((sum, i) => sum + (i * y[i]), 0);
  const sumXX = x.reduce((sum, val) => sum + (val * val), 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  // Generate forecast
  const lastMonth = sortedCosts[sortedCosts.length - 1].month;
  const forecast = [];
  
  for (let i = 1; i <= forecastMonths; i++) {
    const forecastMonth = incrementMonth(lastMonth, i);
    const forecastCost = intercept + slope * (n + i - 1);
    
    forecast.push({
      month: forecastMonth,
      cost: Math.max(0, forecastCost) // Ensure cost is not negative
    });
  }
  
  // Determine trend
  let trend;
  if (slope > 0.1) {
    trend = 'increasing';
  } else if (slope < -0.1) {
    trend = 'decreasing';
  } else {
    trend = 'stable';
  }
  
  return {
    historicalMonths: sortedCosts.map(c => c.month),
    historicalCosts: sortedCosts.map(c => c.cost),
    forecast,
    trend,
    monthlyGrowthRate: slope / (sumY / n) // Normalize slope by average cost
  };
}

/**
 * Increments a month string (YYYY-MM) by a specified number of months
 * 
 * @param {string} monthStr - Month in YYYY-MM format
 * @param {number} increment - Number of months to increment
 * @returns {string} Incremented month in YYYY-MM format
 */
function incrementMonth(monthStr, increment) {
  const [year, month] = monthStr.split('-').map(Number);
  
  let newMonth = month + increment;
  let newYear = year;
  
  while (newMonth > 12) {
    newMonth -= 12;
    newYear += 1;
  }
  
  return `${newYear}-${newMonth.toString().padStart(2, '0')}`;
}

module.exports = {
  PRICING,
  BYTES,
  estimateQueryCost,
  estimateStorageCost,
  estimateStreamingCost,
  estimateSlotCost,
  compareOnDemandVsFlatRate,
  analyzeQueryCosts,
  forecastCosts,
  normalizeQueryForCosting
}; 