/**
 * Rule Optimizer Module
 * 
 * Evaluates different combinations of matching rules to find the optimal set
 * that balances effectiveness (precision/recall) with performance.
 */

const { getCompatibleTypes, getRecommendedAlgorithms } = require('./field_type_inference');

/**
 * Main optimizer function to find optimal rule combination
 * @param {Array<Object>} availableRules - All possible rules that could be applied
 * @param {Object} schemaInfo - Information about available tables/fields
 * @param {string} goalType - The user's goal type (e.g., 'high_precision')
 * @param {Object} options - Additional optimization options
 * @returns {Array<Object>} Optimized set of rules
 */
function findOptimalRuleCombination(availableRules, schemaInfo, goalType, options = {}) {
  if (!availableRules || !Array.isArray(availableRules) || availableRules.length === 0) {
    throw new Error('No rules available for optimization');
  }
  
  // Set defaults for options
  const opts = {
    maxRuleCount: options.maxRuleCount || 5,           // Maximum number of rules to include
    minEffectiveness: options.minEffectiveness || 0.7,  // Minimum effectiveness score (0-1)
    performanceWeight: options.performanceWeight || 0.3, // How much to weight performance vs effectiveness (0-1)
    ...options
  };
  
  // Calculate rule effectiveness and performance scores
  const scoredRules = availableRules.map(rule => ({
    ...rule,
    effectiveness: calculateRuleEffectiveness(rule, schemaInfo, goalType),
    performance: calculateRulePerformance(rule, schemaInfo)
  }));
  
  // Get optimal combination based on scores and constraints
  return optimizeRuleCombination(scoredRules, opts);
}

/**
 * Calculate how effective a rule is likely to be for the given schema and goal
 * @param {Object} rule - The rule to evaluate
 * @param {Object} schemaInfo - Information about available tables/fields
 * @param {string} goalType - The user's goal type
 * @returns {number} Effectiveness score (0-1)
 */
function calculateRuleEffectiveness(rule, schemaInfo, goalType) {
  if (!rule || !rule.type) {
    return 0;
  }
  
  let baseScore = 0;
  
  // Check if the rule uses fields that are present and compatible
  if (rule.fields && Array.isArray(rule.fields) && rule.fields.length > 0) {
    const fieldCompatibilityScores = rule.fields.map(field => {
      // Check if field exists in schema
      const schemaField = schemaInfo.commonFields && 
        schemaInfo.commonFields.find(f => f.name === field.name);
      
      if (!schemaField) {
        return 0; // Field doesn't exist
      }
      
      // Check field quality
      const fieldStats = schemaInfo.fieldStats && 
        schemaInfo.fieldStats.fields && 
        schemaInfo.fieldStats.fields[field.name];
      
      if (!fieldStats) {
        return 0.5; // No stats, assume moderate quality
      }
      
      // Calculate field quality score based on uniqueness and completeness
      const uniquenessScore = fieldStats.uniqueRatio || 0.5;
      const completenessScore = 1 - (fieldStats.nullRatio || 0.5);
      return (uniquenessScore + completenessScore) / 2;
    });
    
    // Overall field compatibility score is the average
    baseScore = fieldCompatibilityScores.reduce((sum, score) => sum + score, 0) / 
      fieldCompatibilityScores.length;
  }
  
  // Adjust score based on rule type and goal type
  switch (goalType) {
    case 'high_precision':
      // For high precision, favor exact matches and unique field rules
      if (rule.type.includes('exact') || rule.type.includes('id_match')) {
        baseScore *= 1.3;
      } else if (rule.type.includes('fuzzy') || rule.type.includes('partial')) {
        baseScore *= 0.7;
      }
      break;
      
    case 'high_recall':
      // For high recall, favor fuzzy matches and partial matches
      if (rule.type.includes('fuzzy') || rule.type.includes('partial') || rule.type.includes('transitive')) {
        baseScore *= 1.3;
      }
      break;
      
    case 'performance':
      // For performance, favor rules that can use indexes and simple comparisons
      if (rule.type.includes('exact') || rule.type.includes('prefix')) {
        baseScore *= 1.2;
      } else if (rule.type.includes('transitive') || rule.type.includes('complex')) {
        baseScore *= 0.6;
      }
      break;
  }
  
  // Ensure score is within 0-1 range
  return Math.max(0, Math.min(1, baseScore));
}

/**
 * Calculate the performance characteristics of a rule
 * @param {Object} rule - The rule to evaluate
 * @param {Object} schemaInfo - Information about available tables/fields
 * @returns {number} Performance score (0-1, higher is better performance)
 */
function calculateRulePerformance(rule, schemaInfo) {
  if (!rule || !rule.type) {
    return 0;
  }
  
  // Base performance scores by rule type (rough estimates)
  const basePerformanceScores = {
    exact_match: 0.9,         // Very fast
    prefix_match: 0.85,       // Fast
    id_match: 0.9,            // Very fast
    email_match: 0.8,         // Relatively fast
    phone_match: 0.8,         // Relatively fast
    fuzzy_match: 0.5,         // Slower
    levenshtein_match: 0.4,   // Slow
    soundex_match: 0.6,       // Moderate
    metaphone_match: 0.6,     // Moderate
    address_match: 0.4,       // Complex and slow
    transitive_match: 0.3,    // Very complex
    composite_match: 0.7      // Depends on components
  };
  
  // Get base score for this rule type
  let performanceScore = 0.5;  // Default moderate score
  
  // Find matching rule type or closest match
  for (const [ruleType, score] of Object.entries(basePerformanceScores)) {
    if (rule.type.includes(ruleType)) {
      performanceScore = score;
      break;
    }
  }
  
  // Adjust for field volume if we have that information
  if (schemaInfo && schemaInfo.sourceRowCount && schemaInfo.referenceRowCount) {
    const dataVolume = schemaInfo.sourceRowCount * schemaInfo.referenceRowCount;
    
    // Adjust score down for very large data volumes with expensive rules
    if (dataVolume > 1000000 && performanceScore < 0.7) {  // 1M potential comparisons
      performanceScore *= 0.8;
    } else if (dataVolume > 10000000 && performanceScore < 0.8) {  // 10M potential comparisons
      performanceScore *= 0.6;
    }
    
    // Blocking helps performance with large datasets
    if (rule.blocking && dataVolume > 1000000) {
      performanceScore *= 1.3;
    }
  }
  
  // Adjust for rule complexity (number of fields and operations)
  const fieldCount = rule.fields ? rule.fields.length : 0;
  if (fieldCount > 3) {
    performanceScore *= 0.9;  // More fields = more processing
  }
  
  // Ensure score is within 0-1 range
  return Math.max(0, Math.min(1, performanceScore));
}

/**
 * Find the optimal combination of rules
 * @param {Array<Object>} scoredRules - Rules with effectiveness and performance scores
 * @param {Object} options - Optimization options
 * @returns {Array<Object>} Optimal rule combination
 */
function optimizeRuleCombination(scoredRules, options) {
  // Sort rules by combined score (weighted effectiveness and performance)
  const sortedRules = [...scoredRules].sort((a, b) => {
    const aScore = (a.effectiveness * (1 - options.performanceWeight)) + 
                  (a.performance * options.performanceWeight);
    const bScore = (b.effectiveness * (1 - options.performanceWeight)) + 
                  (b.performance * options.performanceWeight);
    return bScore - aScore;  // Descending order
  });
  
  // Start with the highest scoring rule
  const selectedRules = [sortedRules[0]];
  let totalEffectiveness = selectedRules[0].effectiveness;
  
  // Build complementary rule set to reach minimum effectiveness while respecting max count
  for (let i = 1; i < sortedRules.length && selectedRules.length < options.maxRuleCount; i++) {
    const candidate = sortedRules[i];
    
    // Calculate marginal effectiveness gain of adding this rule
    const overlap = calculateRuleOverlap(candidate, selectedRules);
    const marginalGain = candidate.effectiveness * (1 - overlap);
    
    // Only add rule if it provides meaningful gain
    if (marginalGain > 0.05) {
      selectedRules.push(candidate);
      totalEffectiveness += marginalGain;
    }
    
    // If we've reached minimum effectiveness, check if we want to optimize for performance
    if (totalEffectiveness >= options.minEffectiveness && options.performanceWeight > 0.3) {
      break;
    }
  }
  
  // If we haven't reached minimum effectiveness but have capacity, add more rules
  while (totalEffectiveness < options.minEffectiveness && 
         selectedRules.length < options.maxRuleCount && 
         selectedRules.length < scoredRules.length) {
    // Find the next best rule not already selected
    const nextRule = scoredRules.find(rule => !selectedRules.includes(rule));
    if (!nextRule) break;
    
    selectedRules.push(nextRule);
    const overlap = calculateRuleOverlap(nextRule, selectedRules.slice(0, -1));
    totalEffectiveness += nextRule.effectiveness * (1 - overlap);
  }
  
  // Calculate overall scores for the selected combination
  const overallEffectiveness = totalEffectiveness;
  const overallPerformance = selectedRules.reduce((sum, rule) => sum + rule.performance, 0) / selectedRules.length;
  
  // Return the selected rules along with score information
  return {
    rules: selectedRules,
    effectiveness: overallEffectiveness,
    performance: overallPerformance,
    combinedScore: (overallEffectiveness * (1 - options.performanceWeight)) + 
                  (overallPerformance * options.performanceWeight)
  };
}

/**
 * Calculate the overlap/redundancy between a candidate rule and existing rules
 * @param {Object} candidateRule - Rule being considered for addition
 * @param {Array<Object>} existingRules - Rules already selected
 * @returns {number} Overlap score (0-1, higher means more redundant)
 */
function calculateRuleOverlap(candidateRule, existingRules) {
  if (!candidateRule || !existingRules || existingRules.length === 0) {
    return 0;
  }
  
  // Calculate overlap based on fields and algorithms used
  const overlaps = existingRules.map(existing => {
    // Field overlap
    const candidateFields = candidateRule.fields || [];
    const existingFields = existing.fields || [];
    
    const fieldOverlapCount = candidateFields.filter(cf => 
      existingFields.some(ef => ef.name === cf.name)).length;
    
    const fieldOverlapScore = candidateFields.length > 0 ? 
      fieldOverlapCount / candidateFields.length : 0;
    
    // Algorithm similarity
    const algorithmSimilarity = candidateRule.type === existing.type ? 1 : 
      (candidateRule.type.includes(existing.type) || existing.type.includes(candidateRule.type)) ? 0.5 : 0;
    
    // Combined overlap score
    return (fieldOverlapScore * 0.7) + (algorithmSimilarity * 0.3);
  });
  
  // Return maximum overlap with any existing rule
  return Math.max(...overlaps, 0);
}

/**
 * Generate recommended rule combinations for a specific goal and schema
 * @param {Object} schemaInfo - Schema and field information
 * @param {string} goalType - User's goal type
 * @param {Object} options - Additional options
 * @returns {Object} Recommended rule combinations
 */
function generateRecommendedRules(schemaInfo, goalType, options = {}) {
  if (!schemaInfo || !schemaInfo.commonFields) {
    throw new Error('Valid schema information required for rule recommendations');
  }
  
  // Create potential rules based on field types
  const potentialRules = createPotentialRules(schemaInfo, goalType);
  
  // Find optimal combination
  const optimized = findOptimalRuleCombination(
    potentialRules, 
    schemaInfo, 
    goalType, 
    options
  );
  
  // Generate blocking strategy recommendations
  const recommendedBlocking = generateBlockingRecommendations(
    schemaInfo, 
    optimized.rules, 
    goalType
  );
  
  return {
    recommendedRules: optimized.rules,
    recommendedBlocking,
    effectiveness: optimized.effectiveness,
    performance: optimized.performance,
    overallScore: optimized.combinedScore,
    generatedAt: new Date().toISOString()
  };
}

/**
 * Create potential rules based on available fields and their types
 * @param {Object} schemaInfo - Schema information
 * @param {string} goalType - User's goal type
 * @returns {Array<Object>} Potential matching rules
 */
function createPotentialRules(schemaInfo, goalType) {
  const potentialRules = [];
  const compatibleTypes = getCompatibleTypes();
  const recommendedAlgorithms = getRecommendedAlgorithms();
  
  // Process each common field
  schemaInfo.commonFields.forEach(field => {
    if (!field.semanticType || !field.semanticType.type) {
      return; // Skip fields without detected semantic types
    }
    
    const semanticType = field.semanticType.type;
    
    // Get algorithms for this field type
    const algorithms = recommendedAlgorithms[semanticType] || ['exact'];
    
    // Create a rule for each appropriate algorithm
    algorithms.forEach(algorithm => {
      // Skip certain algorithms for certain goal types
      if (goalType === 'high_precision' && 
          (algorithm === 'fuzzy' || algorithm === 'soundex') && 
          semanticType !== 'id') {
        return;
      }
      
      if (goalType === 'performance' && 
          (algorithm === 'levenshtein' || algorithm === 'token_sort')) {
        return;
      }
      
      const ruleName = `${semanticType}_${algorithm}`;
      
      potentialRules.push({
        type: `${algorithm}_match`,
        name: ruleName,
        fields: [{ name: field.name, weight: 1.0 }],
        algorithm: algorithm,
        confidence: algorithm === 'exact' ? 'high' : 'medium',
        blocking: canUseForBlocking(field, algorithm),
      });
    });
  });
  
  // Add composite rules for frequently co-occurring fields
  addCompositeRules(potentialRules, schemaInfo, goalType);
  
  // Add transitive rules for high recall goals
  if (goalType === 'high_recall') {
    potentialRules.push({
      type: 'transitive_match',
      name: 'transitive_closure',
      fields: [],  // Uses existing matches
      algorithm: 'transitive',
      confidence: 'medium',
      blocking: false
    });
  }
  
  return potentialRules;
}

/**
 * Add composite rules that combine multiple fields
 * @param {Array<Object>} rules - Existing rule list to add to
 * @param {Object} schemaInfo - Schema information
 * @param {string} goalType - User's goal type
 */
function addCompositeRules(rules, schemaInfo, goalType) {
  const fields = schemaInfo.commonFields;
  
  // Check for name fields (first + last name combination)
  const firstNameField = fields.find(f => f.semanticType && f.semanticType.type === 'firstName');
  const lastNameField = fields.find(f => f.semanticType && f.semanticType.type === 'lastName');
  
  if (firstNameField && lastNameField) {
    rules.push({
      type: 'composite_match',
      name: 'full_name_match',
      fields: [
        { name: firstNameField.name, weight: 0.4 },
        { name: lastNameField.name, weight: 0.6 }
      ],
      algorithm: 'weighted_fields',
      confidence: 'high',
      blocking: true
    });
  }
  
  // Check for address fields (city + postal code)
  const cityField = fields.find(f => f.semanticType && f.semanticType.type === 'city');
  const postalField = fields.find(f => f.semanticType && f.semanticType.type === 'postalCode');
  
  if (cityField && postalField) {
    rules.push({
      type: 'composite_match',
      name: 'location_match',
      fields: [
        { name: cityField.name, weight: 0.4 },
        { name: postalField.name, weight: 0.6 }
      ],
      algorithm: 'weighted_fields',
      confidence: 'high',
      blocking: true
    });
  }
  
  // Add more composite rules based on available fields and goal type
  if (goalType === 'high_precision') {
    // For high precision, look for unique identifier combinations
    const idFields = fields.filter(f => 
      f.semanticType && 
      (f.semanticType.type === 'id' || 
       f.semanticType.type === 'email' || 
       f.semanticType.type === 'phoneNumber')
    );
    
    if (idFields.length >= 2) {
      rules.push({
        type: 'composite_match',
        name: 'unique_id_match',
        fields: idFields.slice(0, 2).map(f => ({ name: f.name, weight: 0.5 })),
        algorithm: 'all_fields_match',
        confidence: 'very_high',
        blocking: true
      });
    }
  }
}

/**
 * Determine if a field can be used for blocking based on its properties
 * @param {Object} field - Field information
 * @param {string} algorithm - Matching algorithm
 * @returns {boolean} Whether field can be used for blocking
 */
function canUseForBlocking(field, algorithm) {
  if (!field || !field.semanticType) {
    return false;
  }
  
  // Only exact matches on certain field types are suitable for blocking
  if (algorithm !== 'exact' && algorithm !== 'prefix') {
    return false;
  }
  
  // These field types are good for blocking
  const blockingTypes = [
    'email', 'phoneNumber', 'postalCode', 'id', 
    'customerId', 'userId', 'dateOfBirth'
  ];
  
  return blockingTypes.includes(field.semanticType.type);
}

/**
 * Generate recommended blocking strategies
 * @param {Object} schemaInfo - Schema information
 * @param {Array<Object>} selectedRules - Selected matching rules
 * @param {string} goalType - User's goal type
 * @returns {Array<Object>} Recommended blocking strategies
 */
function generateBlockingRecommendations(schemaInfo, selectedRules, goalType) {
  const blockingStrategies = [];
  
  // Extract fields that can be used for blocking from selected rules
  const blockingFields = selectedRules
    .filter(rule => rule.blocking)
    .flatMap(rule => rule.fields || []);
  
  // Find fields with appropriate semantic types
  const emailField = schemaInfo.commonFields.find(f => 
    f.semanticType && f.semanticType.type === 'email');
  
  const nameFields = schemaInfo.commonFields.filter(f => 
    f.semanticType && 
    (f.semanticType.type === 'firstName' || f.semanticType.type === 'lastName'));
  
  const postalField = schemaInfo.commonFields.find(f => 
    f.semanticType && f.semanticType.type === 'postalCode');
  
  const phoneField = schemaInfo.commonFields.find(f => 
    f.semanticType && f.semanticType.type === 'phoneNumber');
  
  // Add blocking strategies based on available fields
  if (emailField) {
    blockingStrategies.push({
      name: 'email_domain_blocking',
      description: 'Block by email domain',
      fields: [emailField.name],
      function: 'SPLIT_PART(email, "@", 2)',
      effectiveness: 0.9
    });
  }
  
  if (nameFields.length >= 1) {
    const nameField = nameFields[0];
    blockingStrategies.push({
      name: 'name_first_char_blocking',
      description: 'Block by first character of name',
      fields: [nameField.name],
      function: 'LEFT(name, 1)',
      effectiveness: 0.7
    });
  }
  
  if (postalField) {
    blockingStrategies.push({
      name: 'postal_prefix_blocking',
      description: 'Block by postal code prefix',
      fields: [postalField.name],
      function: 'LEFT(postal_code, 3)',
      effectiveness: 0.85
    });
  }
  
  if (phoneField) {
    blockingStrategies.push({
      name: 'phone_prefix_blocking',
      description: 'Block by phone number prefix',
      fields: [phoneField.name],
      function: 'LEFT(phone_number, 3)',
      effectiveness: 0.8
    });
  }
  
  // For high recall goals, use less aggressive blocking
  if (goalType === 'high_recall') {
    blockingStrategies.forEach(strategy => {
      strategy.effectiveness *= 0.8; // Lower effectiveness score for recall
    });
    
    // Add a more lenient blocking strategy
    if (nameFields.length >= 1) {
      blockingStrategies.push({
        name: 'name_soundex_blocking',
        description: 'Block by Soundex code of name',
        fields: [nameFields[0].name],
        function: 'SOUNDEX(name)',
        effectiveness: 0.6
      });
    }
  }
  
  // Sort by effectiveness and return top strategies
  return blockingStrategies
    .sort((a, b) => b.effectiveness - a.effectiveness)
    .slice(0, 3);
}

module.exports = {
  findOptimalRuleCombination,
  calculateRuleEffectiveness,
  calculateRulePerformance,
  optimizeRuleCombination,
  generateRecommendedRules,
  createPotentialRules,
  generateBlockingRecommendations
}; 