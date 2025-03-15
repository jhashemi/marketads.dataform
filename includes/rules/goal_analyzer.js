/**
 * Goal Analyzer Module
 * 
 * Translates high-level user goals into appropriate rule configurations.
 * Maps user intent (like precision vs. recall) to optimal rule parameters.
 */

/**
 * Available goal types for the matching system
 * @enum {string}
 */
const GoalType = {
  // High precision, lower recall - only strong matches
  HIGH_PRECISION: 'high_precision',
  
  // High recall, lower precision - find as many matches as possible
  HIGH_RECALL: 'high_recall',
  
  // Balanced approach - good precision and recall tradeoff
  BALANCED: 'balanced',
  
  // Optimized for performance - faster but may sacrifice quality
  PERFORMANCE: 'performance',
  
  // Custom configuration - user-defined settings
  CUSTOM: 'custom'
};

/**
 * Translates a user goal description into a goal type
 * @param {string} goalDescription - User's description of their goal
 * @returns {string} Appropriate goal type
 */
function inferGoalFromDescription(goalDescription) {
  if (!goalDescription || typeof goalDescription !== 'string') {
    return GoalType.BALANCED; // Default to balanced
  }
  
  const normalized = goalDescription.toLowerCase();
  
  // High precision patterns
  if (normalized.includes('exact') || 
      normalized.includes('precise') || 
      normalized.includes('accuracy') ||
      normalized.includes('confident') ||
      normalized.includes('certain') ||
      normalized.includes('only strong') ||
      normalized.includes('high confidence')) {
    return GoalType.HIGH_PRECISION;
  }
  
  // High recall patterns
  if (normalized.includes('find all') ||
      normalized.includes('find as many') ||
      normalized.includes('maximize matches') ||
      normalized.includes('don\'t miss') ||
      normalized.includes('comprehensive') ||
      normalized.includes('complete set')) {
    return GoalType.HIGH_RECALL;
  }
  
  // Performance focused
  if (normalized.includes('fast') ||
      normalized.includes('quick') ||
      normalized.includes('efficient') ||
      normalized.includes('performance') ||
      normalized.includes('speed')) {
    return GoalType.PERFORMANCE;
  }
  
  // Custom
  if (normalized.includes('custom') ||
      normalized.includes('specific') ||
      normalized.includes('advanced')) {
    return GoalType.CUSTOM;
  }
  
  // Default to balanced
  return GoalType.BALANCED;
}

/**
 * Generate rule configuration parameters based on goal type
 * @param {string} goalType - Type of matching goal
 * @returns {Object} Configuration parameters optimized for the goal
 */
function getConfigurationForGoal(goalType) {
  switch (goalType) {
    case GoalType.HIGH_PRECISION:
      return {
        thresholds: {
          high: 0.9,  // Higher than default
          medium: 0.75,
          low: 0.6
        },
        blockingStrategy: 'aggressive', // More blocking to improve precision
        fieldWeightMultipliers: {
          uniqueIdentifiers: 1.5,   // Increase weight for unique fields
          names: 1.0,
          addresses: 1.0,
          dates: 1.0
        },
        transitiveMatching: false,  // Disable to prevent error propagation
        maxEditDistance: 1,  // Stricter edit distance
        fuzzyMatchingAggressiveness: 'conservative',
        similarityThreshold: 0.85,  // Higher similarity required
        maxLevDistance: 1  // Stricter Levenshtein distance
      };
      
    case GoalType.HIGH_RECALL:
      return {
        thresholds: {
          high: 0.8,  // Lower than default
          medium: 0.6,
          low: 0.4
        },
        blockingStrategy: 'minimal', // Less blocking to find more matches
        fieldWeightMultipliers: {
          uniqueIdentifiers: 1.0,
          names: 1.2,       // Increase weight for common fields
          addresses: 1.2,
          dates: 1.0
        },
        transitiveMatching: true,   // Enable to find indirect matches
        maxEditDistance: 3,  // More lenient edit distance
        fuzzyMatchingAggressiveness: 'aggressive',
        similarityThreshold: 0.65,  // Lower similarity acceptable
        maxLevDistance: 3  // More lenient Levenshtein distance
      };
      
    case GoalType.PERFORMANCE:
      return {
        thresholds: {
          high: 0.85,
          medium: 0.7,
          low: 0.5
        },
        blockingStrategy: 'aggressive', // More blocking for performance
        fieldWeightMultipliers: {
          uniqueIdentifiers: 1.5,   // Prioritize fields that block efficiently
          names: 1.0,
          addresses: 0.8,   // Reduce computation on complex fields
          dates: 1.2        // Dates are efficient to compare
        },
        transitiveMatching: false,  // Disable for performance
        maxEditDistance: 2,
        fuzzyMatchingAggressiveness: 'balanced',
        similarityThreshold: 0.75,
        maxLevDistance: 2,
        enableParallelProcessing: true,
        batchSize: 10000,  // Larger batches for efficiency
        useIndexHints: true // Use DB index hints
      };
      
    case GoalType.CUSTOM:
      // Return null for custom, as this requires additional parameters
      return null;
      
    case GoalType.BALANCED:
    default:
      // Default balanced configuration
      return {
        thresholds: {
          high: 0.85,
          medium: 0.65,
          low: 0.45
        },
        blockingStrategy: 'balanced',
        fieldWeightMultipliers: {
          uniqueIdentifiers: 1.2,
          names: 1.0,
          addresses: 1.0,
          dates: 1.0
        },
        transitiveMatching: true,
        maxEditDistance: 2,
        fuzzyMatchingAggressiveness: 'balanced',
        similarityThreshold: 0.75,
        maxLevDistance: 2
      };
  }
}

/**
 * Adjust configuration based on available schema information
 * @param {Object} baseConfig - Base configuration from goal
 * @param {Object} schemaInfo - Information about available tables/fields
 * @returns {Object} Adjusted configuration
 */
function adjustConfigurationForSchema(baseConfig, schemaInfo) {
  if (!baseConfig || !schemaInfo) {
    return baseConfig;
  }
  
  const adjustedConfig = { ...baseConfig };
  
  // Check if we have email fields (good for blocking)
  const hasEmailFields = schemaInfo.commonFields && 
    schemaInfo.commonFields.some(field => 
      field.semanticType && field.semanticType.type === 'email');
  
  // Check if we have name fields (good for fuzzy matching)
  const hasNameFields = schemaInfo.commonFields && 
    schemaInfo.commonFields.some(field => 
      field.semanticType && 
      (field.semanticType.type === 'firstName' || 
       field.semanticType.type === 'lastName' ||
       field.semanticType.type === 'fullName'));
  
  // Check field quality
  const uniqueFieldRatio = schemaInfo.fieldStats && 
    schemaInfo.fieldStats.uniqueFieldRatio || 0.5;
  
  // Adjust blocking strategy based on field availability
  if (hasEmailFields && baseConfig.blockingStrategy !== 'minimal') {
    adjustedConfig.recommendedBlocking = ['email_domain', 'email_prefix'];
  } else if (hasNameFields) {
    adjustedConfig.recommendedBlocking = ['name_first_char', 'last_name_soundex'];
  }
  
  // Adjust thresholds based on field quality
  if (uniqueFieldRatio < 0.3) {
    // If few unique fields, require higher thresholds
    adjustedConfig.thresholds = {
      high: Math.min(0.95, adjustedConfig.thresholds.high + 0.05),
      medium: Math.min(0.85, adjustedConfig.thresholds.medium + 0.05),
      low: Math.min(0.65, adjustedConfig.thresholds.low + 0.05)
    };
  } else if (uniqueFieldRatio > 0.7) {
    // If many unique fields, can lower thresholds slightly
    adjustedConfig.thresholds = {
      high: Math.max(0.8, adjustedConfig.thresholds.high - 0.03),
      medium: Math.max(0.6, adjustedConfig.thresholds.medium - 0.03),
      low: Math.max(0.4, adjustedConfig.thresholds.low - 0.03)
    };
  }
  
  return adjustedConfig;
}

/**
 * Create full rule configuration for use with rule selection service
 * @param {string} goalDescription - User's goal description
 * @param {Object} schemaInfo - Schema information from schema analyzer
 * @param {Object} customParams - Additional custom parameters
 * @returns {Object} Complete rule configuration
 */
function generateRuleConfiguration(goalDescription, schemaInfo, customParams = {}) {
  // Infer goal type from description
  const goalType = inferGoalFromDescription(goalDescription);
  
  // Get base configuration for this goal type
  let config = getConfigurationForGoal(goalType);
  
  // For custom goals, start with balanced and apply custom params
  if (goalType === GoalType.CUSTOM && customParams) {
    config = { 
      ...getConfigurationForGoal(GoalType.BALANCED),
      ...customParams 
    };
  }
  
  // If we have schema info, adjust config based on available fields
  if (schemaInfo) {
    config = adjustConfigurationForSchema(config, schemaInfo);
  }
  
  // Override with any explicit custom parameters
  if (customParams && Object.keys(customParams).length > 0) {
    config = {
      ...config,
      ...customParams
    };
  }
  
  return {
    goalType,
    configuration: config,
    generatedAt: new Date().toISOString()
  };
}

/**
 * Translate a goal and schema into recommended rule types
 * @param {string} goalType - Type of goal
 * @param {Object} schemaInfo - Schema information
 * @returns {Array<string>} Recommended rule types
 */
function getRecommendedRuleTypes(goalType, schemaInfo) {
  // Common rules for all goal types
  const rules = ['exact_match'];
  
  // Schema-based suggestions
  if (schemaInfo && schemaInfo.commonFields) {
    // Look for fields by semantic type
    const fieldTypes = schemaInfo.commonFields.map(f => 
      f.semanticType && f.semanticType.type || 'unknown');
    
    if (fieldTypes.includes('email')) {
      rules.push('email_match');
    }
    
    if (fieldTypes.includes('phoneNumber')) {
      rules.push('phone_match');
    }
    
    if (fieldTypes.includes('firstName') || fieldTypes.includes('lastName') || fieldTypes.includes('fullName')) {
      rules.push('name_match');
    }
    
    if (fieldTypes.includes('streetAddress') || fieldTypes.includes('city') || fieldTypes.includes('postalCode')) {
      rules.push('address_match');
    }
    
    if (fieldTypes.includes('dateOfBirth')) {
      rules.push('dob_match');
    }
  }
  
  // Goal-specific rules
  switch (goalType) {
    case GoalType.HIGH_PRECISION:
      // For high precision, prioritize exact matches and unique fields
      rules.push('composite_key_match');
      break;
      
    case GoalType.HIGH_RECALL:
      // For high recall, add fuzzy matching rules
      rules.push('fuzzy_match');
      rules.push('transitive_match');
      rules.push('partial_match');
      break;
      
    case GoalType.PERFORMANCE:
      // For performance, prioritize efficient rules
      rules.push('prefix_match');
      break;
      
    case GoalType.BALANCED:
    default:
      // For balanced, include a mix
      rules.push('fuzzy_match');
      rules.push('prefix_match');
      break;
  }
  
  return [...new Set(rules)]; // Remove duplicates
}

/**
 * Generate a human-readable explanation of the goal-based configuration
 * @param {string} goalType - Type of matching goal
 * @param {Object} config - Configuration parameters
 * @returns {string} Explanation of the configuration
 */
function explainConfiguration(goalType, config) {
  let explanation = `Configuration optimized for: ${goalType.replace(/_/g, ' ')}\n\n`;
  
  switch (goalType) {
    case GoalType.HIGH_PRECISION:
      explanation += "This configuration prioritizes accuracy over completeness. It will find fewer matches overall, but the matches it finds will be highly reliable. It uses:\n\n";
      explanation += "- Higher match thresholds to require stronger evidence\n";
      explanation += "- Weighted scoring that emphasizes unique identifiers\n";
      explanation += "- Conservative fuzzy matching to reduce false positives\n";
      explanation += "- Disabled transitive matching to prevent error propagation\n";
      break;
      
    case GoalType.HIGH_RECALL:
      explanation += "This configuration prioritizes finding as many potential matches as possible, even if some are lower confidence. It uses:\n\n";
      explanation += "- Lower match thresholds to capture more potential matches\n";
      explanation += "- Minimal blocking to compare more record pairs\n";
      explanation += "- Aggressive fuzzy matching to find non-obvious similarities\n";
      explanation += "- Enabled transitive matching to find indirect relationships\n";
      break;
      
    case GoalType.PERFORMANCE:
      explanation += "This configuration optimizes for processing speed and efficiency. It uses:\n\n";
      explanation += "- Aggressive blocking to reduce comparisons\n";
      explanation += "- Prioritization of fields that are computationally efficient to compare\n";
      explanation += "- Disabled complex features like transitive matching\n";
      explanation += "- Batch processing and parallel execution\n";
      break;
      
    case GoalType.BALANCED:
      explanation += "This configuration provides a balanced approach between accuracy and completeness. It uses:\n\n";
      explanation += "- Moderate thresholds suitable for most use cases\n";
      explanation += "- Balanced blocking strategy\n";
      explanation += "- Even field weights across different types\n";
      explanation += "- Standard fuzzy matching parameters\n";
      break;
  }
  
  explanation += "\nDetailed settings:\n";
  explanation += `- Match thresholds: High (${config.thresholds.high}), Medium (${config.thresholds.medium}), Low (${config.thresholds.low})\n`;
  explanation += `- Blocking strategy: ${config.blockingStrategy}\n`;
  explanation += `- Transitive matching: ${config.transitiveMatching ? 'Enabled' : 'Disabled'}\n`;
  
  return explanation;
}

module.exports = {
  GoalType,
  inferGoalFromDescription,
  getConfigurationForGoal,
  adjustConfigurationForSchema,
  generateRuleConfiguration,
  getRecommendedRuleTypes,
  explainConfiguration
}; 