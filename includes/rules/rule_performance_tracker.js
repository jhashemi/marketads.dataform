/**
 * Rule Performance Tracker
 * 
 * Tracks the performance and effectiveness of matching rules over time to improve
 * future recommendations based on actual results.
 */

/**
 * @typedef {Object} RulePerformanceMetrics
 * @property {string} ruleId - Unique identifier for the rule
 * @property {string} ruleName - Human-readable name of the rule
 * @property {string} ruleType - Type of rule (exact, fuzzy, etc.)
 * @property {number} precision - Precision metric (true positives / (true positives + false positives))
 * @property {number} recall - Recall metric (true positives / (true positives + false negatives))
 * @property {number} f1Score - F1 score (2 * precision * recall / (precision + recall))
 * @property {number} executionTimeMs - Average execution time in milliseconds
 * @property {number} matchCount - Number of matches produced
 * @property {number} comparisonCount - Number of record comparisons performed
 * @property {Array<string>} fields - Fields used by this rule
 * @property {Date} lastUpdated - When this metric was last updated
 */

// In-memory store for performance metrics (in production, this would be persisted to a database)
const rulePerformanceStore = new Map();

/**
 * Record the performance metrics for a rule after execution
 * @param {string} ruleId - Unique identifier for the rule
 * @param {Object} metrics - Performance metrics for this execution
 */
function recordRulePerformance(ruleId, metrics) {
  if (!ruleId || typeof ruleId !== 'string') {
    throw new Error('Valid rule ID required');
  }
  
  if (!metrics || typeof metrics !== 'object') {
    throw new Error('Valid metrics object required');
  }
  
  // Get existing metrics if any
  const existingMetrics = rulePerformanceStore.get(ruleId) || {
    ruleId,
    executionCount: 0,
    totalExecutionTimeMs: 0,
    totalMatchCount: 0,
    totalComparisonCount: 0,
    precisionSamples: [],
    recallSamples: [],
    fieldPerformance: {}
  };
  
  // Update metrics
  const updatedMetrics = {
    ...existingMetrics,
    ruleName: metrics.ruleName || existingMetrics.ruleName,
    ruleType: metrics.ruleType || existingMetrics.ruleType,
    executionCount: existingMetrics.executionCount + 1,
    totalExecutionTimeMs: existingMetrics.totalExecutionTimeMs + (metrics.executionTimeMs || 0),
    totalMatchCount: existingMetrics.totalMatchCount + (metrics.matchCount || 0),
    totalComparisonCount: existingMetrics.totalComparisonCount + (metrics.comparisonCount || 0),
    fields: metrics.fields || existingMetrics.fields,
    lastUpdated: new Date()
  };
  
  // Update precision and recall if provided
  if (typeof metrics.precision === 'number') {
    updatedMetrics.precisionSamples = [
      ...existingMetrics.precisionSamples,
      metrics.precision
    ].slice(-10); // Keep last 10 samples
  }
  
  if (typeof metrics.recall === 'number') {
    updatedMetrics.recallSamples = [
      ...existingMetrics.recallSamples,
      metrics.recall
    ].slice(-10); // Keep last 10 samples
  }
  
  // Update field-specific performance
  if (metrics.fields && Array.isArray(metrics.fields)) {
    metrics.fields.forEach(field => {
      if (!updatedMetrics.fieldPerformance[field]) {
        updatedMetrics.fieldPerformance[field] = {
          useCount: 0,
          totalMatchContribution: 0
        };
      }
      
      updatedMetrics.fieldPerformance[field].useCount++;
      
      // If we have match contribution data for this field
      if (metrics.fieldMatchContributions && 
          typeof metrics.fieldMatchContributions[field] === 'number') {
        updatedMetrics.fieldPerformance[field].totalMatchContribution += 
          metrics.fieldMatchContributions[field];
      }
    });
  }
  
  // Calculate derived metrics
  updatedMetrics.avgExecutionTimeMs = updatedMetrics.totalExecutionTimeMs / updatedMetrics.executionCount;
  updatedMetrics.avgMatchesPerExecution = updatedMetrics.totalMatchCount / updatedMetrics.executionCount;
  updatedMetrics.avgPrecision = updatedMetrics.precisionSamples.length > 0 ? 
    updatedMetrics.precisionSamples.reduce((sum, val) => sum + val, 0) / updatedMetrics.precisionSamples.length : null;
  updatedMetrics.avgRecall = updatedMetrics.recallSamples.length > 0 ? 
    updatedMetrics.recallSamples.reduce((sum, val) => sum + val, 0) / updatedMetrics.recallSamples.length : null;
  
  // Calculate F1 score if we have both precision and recall
  if (updatedMetrics.avgPrecision && updatedMetrics.avgRecall) {
    updatedMetrics.f1Score = (2 * updatedMetrics.avgPrecision * updatedMetrics.avgRecall) / 
      (updatedMetrics.avgPrecision + updatedMetrics.avgRecall);
  }
  
  // Store updated metrics
  rulePerformanceStore.set(ruleId, updatedMetrics);
  
  return updatedMetrics;
}

/**
 * Get performance metrics for a specific rule
 * @param {string} ruleId - Unique identifier for the rule
 * @returns {Object|null} Performance metrics or null if not found
 */
function getRulePerformance(ruleId) {
  return rulePerformanceStore.get(ruleId) || null;
}

/**
 * Get performance metrics for all tracked rules
 * @returns {Array<Object>} Array of rule performance metrics
 */
function getAllRulePerformance() {
  return Array.from(rulePerformanceStore.values());
}

/**
 * Record performance for a combination of rules
 * @param {string} combinationId - Identifier for this rule combination 
 * @param {Array<string>} ruleIds - IDs of rules in this combination
 * @param {Object} metrics - Performance metrics for the combination
 */
function recordRuleCombinationPerformance(combinationId, ruleIds, metrics) {
  if (!combinationId || !Array.isArray(ruleIds) || ruleIds.length === 0 || !metrics) {
    throw new Error('Valid combination ID, rule IDs, and metrics required');
  }
  
  // Format the combination data
  const combinationMetrics = {
    combinationId,
    ruleIds,
    executionTimeMs: metrics.executionTimeMs || 0,
    matchCount: metrics.matchCount || 0,
    precision: metrics.precision,
    recall: metrics.recall,
    f1Score: metrics.f1Score,
    comparisonCount: metrics.comparisonCount || 0,
    timestamp: new Date()
  };
  
  // In a real implementation, this would be stored in a database
  // For this prototype, we'll use the combinationId as a special ruleId
  return recordRulePerformance(`combination:${combinationId}`, {
    ruleName: `Combination: ${combinationId}`,
    ruleType: 'combination',
    ...metrics,
    fields: ruleIds.map(id => `rule:${id}`), // Treating rule IDs as fields for the combination
  });
}

/**
 * Get performance metrics for top performing rules by different criteria
 * @param {string} metric - Metric to rank by ('precision', 'recall', 'f1Score', 'performance')
 * @param {number} limit - Maximum number of rules to return
 * @returns {Array<Object>} Top performing rules
 */
function getTopPerformingRules(metric = 'f1Score', limit = 5) {
  const allMetrics = getAllRulePerformance();
  
  // Skip combinations when looking at individual rule performance
  const individualRules = allMetrics.filter(m => !m.ruleId.startsWith('combination:'));
  
  // Sort by requested metric
  switch (metric) {
    case 'precision':
      return individualRules
        .filter(m => m.avgPrecision !== null)
        .sort((a, b) => b.avgPrecision - a.avgPrecision)
        .slice(0, limit);
      
    case 'recall':
      return individualRules
        .filter(m => m.avgRecall !== null)
        .sort((a, b) => b.avgRecall - a.avgRecall)
        .slice(0, limit);
      
    case 'f1Score':
      return individualRules
        .filter(m => m.f1Score !== null)
        .sort((a, b) => b.f1Score - a.f1Score)
        .slice(0, limit);
      
    case 'performance':
      return individualRules
        .sort((a, b) => a.avgExecutionTimeMs - b.avgExecutionTimeMs)
        .slice(0, limit);
      
    default:
      throw new Error(`Unknown metric: ${metric}`);
  }
}

/**
 * Get performance metrics for top performing rule combinations
 * @param {string} metric - Metric to rank by ('precision', 'recall', 'f1Score', 'performance')
 * @param {number} limit - Maximum number of combinations to return
 * @returns {Array<Object>} Top performing rule combinations
 */
function getTopPerformingCombinations(metric = 'f1Score', limit = 3) {
  const allMetrics = getAllRulePerformance();
  
  // Only look at combinations
  const combinations = allMetrics.filter(m => m.ruleId.startsWith('combination:'));
  
  // Sort by requested metric (similar to getTopPerformingRules)
  switch (metric) {
    case 'precision':
      return combinations
        .filter(m => m.avgPrecision !== null)
        .sort((a, b) => b.avgPrecision - a.avgPrecision)
        .slice(0, limit);
      
    case 'recall':
      return combinations
        .filter(m => m.avgRecall !== null)
        .sort((a, b) => b.avgRecall - a.avgRecall)
        .slice(0, limit);
      
    case 'f1Score':
      return combinations
        .filter(m => m.f1Score !== null)
        .sort((a, b) => b.f1Score - a.f1Score)
        .slice(0, limit);
      
    case 'performance':
      return combinations
        .sort((a, b) => a.avgExecutionTimeMs - b.avgExecutionTimeMs)
        .slice(0, limit);
      
    default:
      throw new Error(`Unknown metric: ${metric}`);
  }
}

/**
 * Calculate field effectiveness based on tracked performance
 * @returns {Object} Map of field names to effectiveness scores
 */
function calculateFieldEffectiveness() {
  const allMetrics = getAllRulePerformance();
  const fieldEffectiveness = {};
  
  // Collect field performance data from all rules
  allMetrics.forEach(ruleMetrics => {
    if (!ruleMetrics.fieldPerformance) return;
    
    Object.entries(ruleMetrics.fieldPerformance).forEach(([field, performance]) => {
      if (!fieldEffectiveness[field]) {
        fieldEffectiveness[field] = {
          totalUseCount: 0,
          totalContribution: 0,
          rulesUsingField: 0
        };
      }
      
      fieldEffectiveness[field].totalUseCount += performance.useCount;
      fieldEffectiveness[field].totalContribution += performance.totalMatchContribution;
      fieldEffectiveness[field].rulesUsingField++;
    });
  });
  
  // Calculate average contribution per use for each field
  Object.entries(fieldEffectiveness).forEach(([field, data]) => {
    fieldEffectiveness[field].avgContribution = 
      data.totalContribution / data.totalUseCount;
    
    // Calculate a normalized score (0-1)
    fieldEffectiveness[field].effectivenessScore = 
      Math.min(1, data.avgContribution);
  });
  
  return fieldEffectiveness;
}

/**
 * Apply historical performance data to improve rule recommendations
 * @param {Array<Object>} recommendedRules - Rules recommended by the optimizer
 * @returns {Array<Object>} Adjusted rules based on historical performance
 */
function applyHistoricalPerformanceData(recommendedRules) {
  if (!recommendedRules || !Array.isArray(recommendedRules)) {
    return recommendedRules;
  }
  
  // Get field effectiveness data
  const fieldEffectiveness = calculateFieldEffectiveness();
  
  // Adjust rule weights based on historical performance
  const adjustedRules = recommendedRules.map(rule => {
    const ruleId = rule.ruleId || rule.name;
    const historicalPerformance = getRulePerformance(ruleId);
    
    // If we don't have historical data for this rule, return as is
    if (!historicalPerformance) {
      return rule;
    }
    
    // Create adjusted rule with historical performance data
    const adjustedRule = { ...rule };
    
    // Add performance metrics if available
    if (historicalPerformance.avgPrecision !== null) {
      adjustedRule.historicalPrecision = historicalPerformance.avgPrecision;
    }
    
    if (historicalPerformance.avgRecall !== null) {
      adjustedRule.historicalRecall = historicalPerformance.avgRecall;
    }
    
    if (historicalPerformance.f1Score !== null) {
      adjustedRule.historicalF1Score = historicalPerformance.f1Score;
    }
    
    adjustedRule.historicalExecutionTime = historicalPerformance.avgExecutionTimeMs;
    
    // Adjust field weights based on historical field effectiveness
    if (rule.fields && Array.isArray(rule.fields)) {
      adjustedRule.fields = rule.fields.map(field => {
        const fieldData = typeof field === 'string' ? { name: field } : field;
        const name = fieldData.name;
        
        // If we have effectiveness data for this field, adjust weight
        if (fieldEffectiveness[name]) {
          const effectiveness = fieldEffectiveness[name].effectivenessScore;
          const originalWeight = fieldData.weight || 1.0;
          
          // Adjust weight based on historical effectiveness
          // (fields that have proven more useful get higher weights)
          return {
            ...fieldData,
            weight: originalWeight * (0.7 + (0.6 * effectiveness))
          };
        }
        
        return fieldData;
      });
    }
    
    return adjustedRule;
  });
  
  return adjustedRules;
}

/**
 * Generate a report on rule performance trends
 * @param {string} ruleId - Optional rule ID to filter for
 * @param {number} days - Number of days to analyze
 * @returns {Object} Performance trend report
 */
function generatePerformanceTrendReport(ruleId = null, days = 30) {
  // In a real implementation, this would query a database for time-series data
  // For this prototype, we'll return simulated trend data
  
  const metrics = ruleId ? 
    [getRulePerformance(ruleId)].filter(Boolean) : 
    getAllRulePerformance();
  
  return {
    timestamp: new Date(),
    period: `${days} days`,
    ruleCount: metrics.length,
    topPerformers: {
      precision: getTopPerformingRules('precision', 3),
      recall: getTopPerformingRules('recall', 3),
      f1Score: getTopPerformingRules('f1Score', 3),
      performance: getTopPerformingRules('performance', 3)
    },
    fieldEffectiveness: calculateFieldEffectiveness(),
    trends: metrics.map(m => ({
      ruleId: m.ruleId,
      ruleName: m.ruleName,
      executionCount: m.executionCount,
      // In a real implementation, we would have time series data here
      // For the prototype, we'll simulate some trends
      precisionTrend: simulateTrendData(m.avgPrecision || 0.7, 0.05),
      recallTrend: simulateTrendData(m.avgRecall || 0.65, 0.07),
      executionTimeTrend: simulateTrendData(m.avgExecutionTimeMs || 100, 20)
    }))
  };
}

/**
 * Helper function to simulate trend data for the prototype
 * @param {number} base - Base value 
 * @param {number} variation - Maximum variation
 * @returns {Array<Object>} Simulated trend data points
 */
function simulateTrendData(base, variation) {
  // Generate 10 data points with some random variation
  return Array.from({ length: 10 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (9 - i) * 3); // Every 3 days
    
    return {
      date: date.toISOString().split('T')[0],
      value: Math.max(0, Math.min(1, base + (Math.random() * variation * 2 - variation)))
    };
  });
}

module.exports = {
  recordRulePerformance,
  getRulePerformance,
  getAllRulePerformance,
  recordRuleCombinationPerformance,
  getTopPerformingRules,
  getTopPerformingCombinations,
  calculateFieldEffectiveness,
  applyHistoricalPerformanceData,
  generatePerformanceTrendReport
}; 