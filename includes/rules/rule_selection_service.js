/**
 * Rule Selection Service
 * Analyzes database schemas and recommends optimal matching rules
 * based on field quality and compatibility
 */

const schemaAnalyzer = require('./schema_analyzer');

/**
 * Recommend matching rules based on table schema analysis
 * @param {string} sourceTableId - ID of the source table
 * @param {string} referenceTableId - ID of the reference table
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} Recommended matching rules configuration
 */
async function recommendRules(sourceTableId, referenceTableId, options = {}) {
  // Analyze table schemas
  const analysis = await schemaAnalyzer.analyzeSchema(sourceTableId, referenceTableId);
  
  // Extract goal from options
  const { goal = 'balanced' } = options;
  
  // Build rule recommendations based on the goal
  const recommendations = buildRecommendations(analysis, goal);
  
  return {
    sourceTableId,
    referenceTableId,
    goal,
    recommendations
  };
}

/**
 * Build rule recommendations based on schema analysis and goal
 * @param {Object} analysis - Schema analysis results
 * @param {string} goal - Matching goal (balanced, precision, recall)
 * @returns {Object} Rule recommendations
 */
function buildRecommendations(analysis, goal) {
  // Get common fields filtered by compatibility quality
  const highQualityFields = analysis.commonFields.filter(field => 
    field.compatibility.quality === 'high'
  );
  
  const mediumQualityFields = analysis.commonFields.filter(field => 
    field.compatibility.quality === 'medium'
  );
  
  const lowQualityFields = analysis.commonFields.filter(field => 
    field.compatibility.quality === 'low'
  );
  
  // Build rule sets based on goal
  const exactMatchRules = buildExactMatchRules(highQualityFields);
  const fuzzyMatchRules = buildFuzzyMatchRules(highQualityFields.concat(mediumQualityFields));
  const blockingRules = buildBlockingRules(highQualityFields);
  
  // Determine thresholds based on goal
  const thresholds = determineThresholds(goal);
  
  // Determine rule weights based on goal
  const ruleWeights = determineRuleWeights(goal, analysis.commonFields);
  
  return {
    exactMatchRules,
    fuzzyMatchRules,
    blockingRules,
    thresholds,
    ruleWeights
  };
}

/**
 * Build exact match rules from high-quality fields
 * @param {Array<Object>} highQualityFields - High-quality common fields
 * @returns {Array<Object>} Exact match rule configurations
 */
function buildExactMatchRules(highQualityFields) {
  // Extract unique fields for exact matching
  return highQualityFields
    .filter(field => field.sourceField.isUnique || field.referenceField.isUnique)
    .map(field => ({
      fieldName: field.sourceField.name,
      ruleType: 'exact',
      quality: field.compatibility.quality
    }));
}

/**
 * Build fuzzy match rules from high and medium quality fields
 * @param {Array<Object>} fields - High and medium quality common fields
 * @returns {Array<Object>} Fuzzy match rule configurations
 */
function buildFuzzyMatchRules(fields) {
  const rules = [];
  
  // Create rules based on field types
  fields.forEach(field => {
    const fieldName = field.sourceField.name;
    let ruleType = 'fuzzy';
    let algorithm = 'levenshtein';
    
    // Determine algorithm based on field name
    if (fieldName.toLowerCase().includes('name')) {
      algorithm = 'jaroWinkler';
    } else if (fieldName.toLowerCase().includes('phone')) {
      algorithm = 'phoneticDistance';
    } else if (fieldName.toLowerCase().includes('email')) {
      algorithm = 'emailSimilarity';
    } else if (fieldName.toLowerCase().includes('address')) {
      algorithm = 'addressSimilarity';
    }
    
    rules.push({
      fieldName,
      ruleType,
      algorithm,
      quality: field.compatibility.quality
    });
  });
  
  return rules;
}

/**
 * Build blocking rules from high-quality fields
 * @param {Array<Object>} highQualityFields - High-quality common fields
 * @returns {Array<Object>} Blocking rule configurations
 */
function buildBlockingRules(highQualityFields) {
  // Select fields for blocking
  // Ideal blocking fields are those with low null ratio and medium-high cardinality
  return highQualityFields
    .filter(field => {
      const nullRatio = field.sourceField.nullRatio || 0;
      return nullRatio < 0.1; // Less than 10% nulls
    })
    .map(field => ({
      fieldName: field.sourceField.name,
      transformations: determineTransformations(field.sourceField)
    }));
}

/**
 * Determine appropriate transformations for a blocking field
 * @param {Object} field - Field to determine transformations for
 * @returns {Array<string>} List of transformations to apply
 */
function determineTransformations(field) {
  const transformations = [];
  const fieldName = field.name.toLowerCase();
  
  // Add transformations based on field name
  if (fieldName.includes('name')) {
    transformations.push('firstCharacter');
    transformations.push('metaphone');
  } else if (fieldName.includes('email')) {
    transformations.push('domainOnly');
  } else if (fieldName.includes('phone')) {
    transformations.push('lastFourDigits');
  } else if (fieldName.includes('zip') || fieldName.includes('postal')) {
    transformations.push('firstThreeChars');
  }
  
  return transformations;
}

/**
 * Determine threshold values based on matching goal
 * @param {string} goal - Matching goal (balanced, precision, recall)
 * @returns {Object} Threshold configuration
 */
function determineThresholds(goal) {
  switch (goal) {
    case 'precision':
      return {
        high: 0.9,
        medium: 0.75,
        low: 0.5
      };
    case 'recall':
      return {
        high: 0.8,
        medium: 0.6,
        low: 0.4
      };
    case 'balanced':
    default:
      return {
        high: 0.85,
        medium: 0.65,
        low: 0.45
      };
  }
}

/**
 * Determine rule weights based on matching goal and field qualities
 * @param {string} goal - Matching goal (balanced, precision, recall)
 * @param {Array<Object>} commonFields - Common fields between tables
 * @returns {Object} Rule weight configuration
 */
function determineRuleWeights(goal, commonFields) {
  const weights = {};
  
  // Assign weights to each field based on quality and goal
  commonFields.forEach(field => {
    const fieldName = field.sourceField.name;
    const quality = field.compatibility.quality;
    
    // Base weight based on quality
    let weight = 1.0;
    if (quality === 'high') {
      weight = 3.0;
    } else if (quality === 'medium') {
      weight = 2.0;
    }
    
    // Adjust weight based on goal
    if (goal === 'precision') {
      if (field.sourceField.isUnique || field.referenceField.isUnique) {
        weight *= 1.5; // Boost unique fields for precision
      }
    } else if (goal === 'recall') {
      if (quality === 'medium' || quality === 'low') {
        weight *= 1.2; // Boost lower quality fields for recall
      }
    }
    
    weights[fieldName] = weight;
  });
  
  return weights;
}

/**
 * Evaluate a candidate rule set's expected performance
 * @param {Array<Object>} rules - Rule configurations to evaluate
 * @param {Object} analysis - Schema analysis results
 * @returns {Object} Performance evaluation metrics
 */
function evaluateRuleSet(rules, analysis) {
  // In a real implementation, this would use historical data or statistical models
  // to predict the performance of the rule set
  
  // For this implementation, we'll use a simple heuristic based on field qualities
  const highQualityRules = rules.filter(rule => rule.quality === 'high').length;
  const totalRules = rules.length;
  
  // Calculate estimated metrics
  const estimatedPrecision = totalRules > 0 ? 0.7 + (0.3 * highQualityRules / totalRules) : 0;
  const estimatedRecall = totalRules > 0 ? 0.6 + (0.3 * rules.length / analysis.commonFields.length) : 0;
  const estimatedF1 = (estimatedPrecision + estimatedRecall) > 0 ? 
    2 * (estimatedPrecision * estimatedRecall) / (estimatedPrecision + estimatedRecall) : 0;
  
  return {
    estimatedPrecision,
    estimatedRecall,
    estimatedF1
  };
}

module.exports = {
  recommendRules,
  buildRecommendations,
  buildExactMatchRules,
  buildFuzzyMatchRules,
  buildBlockingRules,
  determineTransformations,
  determineThresholds,
  determineRuleWeights,
  evaluateRuleSet
};