/**
 * Intelligent Rule Selector
 * 
 * Main entry point for the intelligent rule selection system.
 * Combines schema analysis, field type inference, goal analysis, 
 * rule optimization, and performance tracking to provide
 * optimal matching rule recommendations.
 */

const schemaAnalyzer = require('./schema_analyzer');
const fieldTypeInference = require('./field_type_inference');
const goalAnalyzer = require('./goal_analyzer');
const ruleOptimizer = require('./rule_optimizer');
const rulePerformanceTracker = require('./rule_performance_tracker');
const ruleSelectionService = require('./rule_selection_service');

/**
 * Main function to recommend rules based on user intent and available data
 * @param {string} sourceTableId - ID of the source table
 * @param {string} referenceTableId - ID of the reference table
 * @param {string} goalDescription - User's description of their matching goal
 * @param {Object} options - Additional options for the recommendation
 * @returns {Promise<Object>} Recommended rules and configuration
 */
async function recommendRules(sourceTableId, referenceTableId, goalDescription, options = {}) {
  try {
    // Step 1: Analyze schema of both tables
    console.log('Analyzing schema...');
    const schemaAnalysis = await schemaAnalyzer.analyzeSchema(sourceTableId, referenceTableId);
    
    // Step 2: Enhance schema with field type inference
    console.log('Inferring field types...');
    const sourceSampleData = await getSampleData(sourceTableId, options.sampleSize || 100);
    const referenceSampleData = await getSampleData(referenceTableId, options.sampleSize || 100);
    
    const enhancedSourceSchema = fieldTypeInference.inferFieldTypes(
      schemaAnalysis.sourceSchema, 
      sourceSampleData
    );
    
    const enhancedReferenceSchema = fieldTypeInference.inferFieldTypes(
      schemaAnalysis.referenceSchema,
      referenceSampleData  
    );
    
    // Combine schema analyses with enhanced field type information
    const enhancedSchemaAnalysis = {
      ...schemaAnalysis,
      sourceSchema: enhancedSourceSchema,
      referenceSchema: enhancedReferenceSchema,
      // Update common fields with semantic type information
      commonFields: schemaAnalysis.commonFields.map(field => {
        const sourceField = enhancedSourceSchema.fields.find(f => f.name === field.name);
        const referenceField = enhancedReferenceSchema.fields.find(f => f.name === field.name);
        
        return {
          ...field,
          semanticType: (sourceField && sourceField.semanticType) || 
                       (referenceField && referenceField.semanticType) || 
                       { type: 'unknown', confidence: 'low', source: 'default' }
        };
      })
    };
    
    // Step 3: Analyze user goal
    console.log('Analyzing goal...');
    const goalType = goalAnalyzer.inferGoalFromDescription(goalDescription);
    const goalConfig = goalAnalyzer.getConfigurationForGoal(goalType);
    
    // Adjust configuration based on schema information
    const adjustedConfig = goalAnalyzer.adjustConfigurationForSchema(
      goalConfig, 
      enhancedSchemaAnalysis
    );
    
    // Step 4: Generate rule recommendations using the optimizer
    console.log('Optimizing rule selection...');
    const ruleRecommendations = ruleOptimizer.generateRecommendedRules(
      enhancedSchemaAnalysis,
      goalType,
      {
        maxRuleCount: options.maxRuleCount || 5,
        minEffectiveness: options.minEffectiveness || 0.7,
        performanceWeight: options.performanceWeight || 0.3,
        ...options
      }
    );
    
    // Step 5: Apply historical performance data if available
    console.log('Applying performance history...');
    const rulesWithHistory = rulePerformanceTracker.applyHistoricalPerformanceData(
      ruleRecommendations.recommendedRules
    );
    
    // Step 6: Build the final recommendation
    const finalRecommendation = {
      sourceTable: sourceTableId,
      referenceTable: referenceTableId,
      goal: {
        description: goalDescription,
        inferredType: goalType,
        configuration: adjustedConfig
      },
      schemaAnalysis: {
        commonFieldCount: enhancedSchemaAnalysis.commonFields.length,
        sourceRowCount: enhancedSchemaAnalysis.sourceRowCount,
        referenceRowCount: enhancedSchemaAnalysis.referenceRowCount,
        fieldTypes: enhancedSchemaAnalysis.commonFields.map(f => ({
          name: f.name,
          semanticType: f.semanticType.type,
          confidence: f.semanticType.confidence
        }))
      },
      recommendedRules: rulesWithHistory,
      recommendedBlocking: ruleRecommendations.recommendedBlocking,
      performance: {
        estimatedEffectiveness: ruleRecommendations.effectiveness,
        estimatedPerformance: ruleRecommendations.performance,
        historicalData: rulesWithHistory.some(r => r.historicalF1Score !== undefined)
      },
      explanation: goalAnalyzer.explainConfiguration(goalType, adjustedConfig),
      generatedAt: new Date().toISOString()
    };
    
    return finalRecommendation;
  } catch (error) {
    console.error('Error in rule recommendation:', error);
    throw new Error(`Failed to recommend rules: ${error.message}`);
  }
}

/**
 * Apply and execute recommended rules
 * @param {Object} recommendation - Rule recommendation from recommendRules()
 * @param {Object} options - Execution options
 * @returns {Promise<Object>} Execution results
 */
async function applyRecommendedRules(recommendation, options = {}) {
  try {
    if (!recommendation || !recommendation.recommendedRules) {
      throw new Error('Valid rule recommendation required');
    }
    
    console.log('Applying recommended rules...');
    
    // Convert recommendation to rule configuration format expected by the rule service
    const ruleConfig = {
      sourceTable: recommendation.sourceTable,
      referenceTable: recommendation.referenceTable,
      rules: recommendation.recommendedRules.map(rule => ({
        type: rule.type,
        name: rule.name,
        fields: rule.fields,
        threshold: getThresholdForRule(rule, recommendation.goal.configuration.thresholds),
        algorithm: rule.algorithm,
        options: {}
      })),
      blocking: recommendation.recommendedBlocking.map(block => ({
        name: block.name,
        fields: block.fields,
        function: block.function
      })),
      thresholds: recommendation.goal.configuration.thresholds,
      options: {
        transitiveMatching: recommendation.goal.configuration.transitiveMatching,
        ...options
      }
    };
    
    // Execute the matching process
    console.log('Executing matching process...');
    const startTime = Date.now();
    const result = await executeMatching(ruleConfig);
    const executionTime = Date.now() - startTime;
    
    // Record performance for each rule used
    console.log('Recording rule performance...');
    recommendation.recommendedRules.forEach(rule => {
      const ruleResult = result.ruleResults.find(r => r.ruleName === rule.name);
      if (ruleResult) {
        rulePerformanceTracker.recordRulePerformance(rule.name, {
          ruleName: rule.name,
          ruleType: rule.type,
          executionTimeMs: ruleResult.executionTimeMs,
          matchCount: ruleResult.matchCount,
          comparisonCount: ruleResult.comparisonCount,
          fields: rule.fields.map(f => typeof f === 'string' ? f : f.name),
          fieldMatchContributions: ruleResult.fieldContributions
        });
      }
    });
    
    // Record performance for the combination
    const combinationId = `${recommendation.sourceTable}_${recommendation.referenceTable}_${recommendation.goal.inferredType}`;
    rulePerformanceTracker.recordRuleCombinationPerformance(
      combinationId,
      recommendation.recommendedRules.map(r => r.name),
      {
        executionTimeMs: executionTime,
        matchCount: result.totalMatches,
        comparisonCount: result.totalComparisons
      }
    );
    
    // Return enriched results
    return {
      ...result,
      executionTime,
      appliedRecommendation: recommendation,
      performanceRecorded: true
    };
  } catch (error) {
    console.error('Error applying rules:', error);
    throw new Error(`Failed to apply recommended rules: ${error.message}`);
  }
}

/**
 * Get a sample of data from a table for analysis
 * @param {string} tableId - ID of the table to sample
 * @param {number} sampleSize - Number of records to sample
 * @returns {Promise<Array<Object>>} Sample data
 */
async function getSampleData(tableId, sampleSize = 100) {
  try {
    // In a real implementation, this would query the database
    // For this prototype, we'll simulate it
    console.log(`Getting sample data for ${tableId} (${sampleSize} records)...`);
    
    // Temporarily return empty array for the prototype
    // In a real implementation, this would return actual database rows
    return [];
  } catch (error) {
    console.error(`Error getting sample data for ${tableId}:`, error);
    return []; // Return empty array on error rather than failing
  }
}

/**
 * Determine appropriate threshold for a rule based on its type and confidence
 * @param {Object} rule - Rule configuration
 * @param {Object} thresholds - Threshold configuration (high, medium, low)
 * @returns {number} Appropriate threshold value
 */
function getThresholdForRule(rule, thresholds) {
  if (!rule || !thresholds) {
    return 0.7; // Default fallback
  }
  
  // Exact matches use high threshold
  if (rule.type.includes('exact_match') || rule.confidence === 'very_high') {
    return thresholds.high;
  }
  
  // Fuzzy/partial matches use medium threshold
  if (rule.type.includes('fuzzy') || rule.confidence === 'medium') {
    return thresholds.medium;
  }
  
  // Very fuzzy matches use low threshold
  if (rule.type.includes('partial') || rule.confidence === 'low') {
    return thresholds.low;
  }
  
  // Default to medium threshold
  return thresholds.medium;
}

/**
 * Execute the matching process with the given configuration
 * @param {Object} config - Rule configuration
 * @returns {Promise<Object>} Matching results
 */
async function executeMatching(config) {
  try {
    // In a real implementation, this would call the actual matching engine
    // For this prototype, we'll delegate to the existing rule selection service
    return await ruleSelectionService.executeMatching(config);
  } catch (error) {
    console.error('Error executing matching:', error);
    throw new Error(`Failed to execute matching: ${error.message}`);
  }
}

/**
 * Get performance report for rules and field effectiveness
 * @param {number} days - Number of days to include in the report
 * @returns {Object} Performance report
 */
function getPerformanceReport(days = 30) {
  try {
    return rulePerformanceTracker.generatePerformanceTrendReport(null, days);
  } catch (error) {
    console.error('Error generating performance report:', error);
    throw new Error(`Failed to generate performance report: ${error.message}`);
  }
}

/**
 * Get a detailed explanation of the recommendations
 * @param {Object} recommendation - Rule recommendation
 * @returns {string} Detailed explanation
 */
function explainRecommendation(recommendation) {
  if (!recommendation) {
    return 'No recommendation available to explain.';
  }
  
  let explanation = `# Rule Recommendation Explanation\n\n`;
  
  // Explain goal and configuration
  explanation += `## Matching Goal\n\n`;
  explanation += `You described your goal as: "${recommendation.goal.description}"\n\n`;
  explanation += `We interpreted this as a **${recommendation.goal.inferredType.replace(/_/g, ' ')}** matching strategy.\n\n`;
  explanation += `${recommendation.explanation}\n\n`;
  
  // Explain schema analysis
  explanation += `## Schema Analysis\n\n`;
  explanation += `We found ${recommendation.schemaAnalysis.commonFieldCount} fields common to both tables.\n`;
  explanation += `The source table has approximately ${recommendation.schemaAnalysis.sourceRowCount} rows.\n`;
  explanation += `The reference table has approximately ${recommendation.schemaAnalysis.referenceRowCount} rows.\n\n`;
  
  explanation += `### Detected Field Types\n\n`;
  recommendation.schemaAnalysis.fieldTypes.forEach(field => {
    explanation += `- \`${field.name}\`: ${field.semanticType} (${field.confidence} confidence)\n`;
  });
  explanation += `\n`;
  
  // Explain recommended rules
  explanation += `## Recommended Rules\n\n`;
  recommendation.recommendedRules.forEach((rule, index) => {
    explanation += `### ${index + 1}. ${rule.name}\n\n`;
    explanation += `- Type: ${rule.type}\n`;
    explanation += `- Algorithm: ${rule.algorithm || 'standard'}\n`;
    explanation += `- Fields: ${rule.fields.map(f => typeof f === 'string' ? f : `${f.name} (weight: ${f.weight})`).join(', ')}\n`;
    
    if (rule.historicalF1Score !== undefined) {
      explanation += `- Historical F1 Score: ${rule.historicalF1Score.toFixed(2)}\n`;
    }
    
    explanation += `\n`;
  });
  
  // Explain blocking recommendations
  explanation += `## Recommended Blocking Strategies\n\n`;
  recommendation.recommendedBlocking.forEach((strategy, index) => {
    explanation += `### ${index + 1}. ${strategy.name}\n\n`;
    explanation += `- Description: ${strategy.description}\n`;
    explanation += `- Fields: ${strategy.fields.join(', ')}\n`;
    explanation += `- Function: \`${strategy.function}\`\n`;
    explanation += `- Effectiveness: ${(strategy.effectiveness * 100).toFixed(0)}%\n\n`;
  });
  
  // Explain performance
  explanation += `## Performance Expectations\n\n`;
  explanation += `- Estimated effectiveness score: ${(recommendation.performance.estimatedEffectiveness * 100).toFixed(0)}%\n`;
  explanation += `- Estimated performance score: ${(recommendation.performance.estimatedPerformance * 100).toFixed(0)}%\n`;
  
  if (recommendation.performance.historicalData) {
    explanation += `- This recommendation incorporates historical performance data\n`;
  } else {
    explanation += `- No historical performance data was available for these rules\n`;
  }
  
  return explanation;
}

module.exports = {
  recommendRules,
  applyRecommendedRules,
  getPerformanceReport,
  explainRecommendation
}; 