/**
 * Matching Engine
 * 
 * This module implements the core matching logic.
 * It follows the Interface Segregation Principle by focusing only on
 * matching record evaluation and not SQL generation or other concerns.
 */

const { IMatchEngine } = require('../core/types');
const { StrategyError, MissingFieldError } = require('../core/errors');
const types = require('../types');
const { distance } = require('fastest-levenshtein');
const natural = require('natural');
const jaroWinkler = natural.JaroWinklerDistance;
const tokenizer = new natural.WordTokenizer();

// Default field weights if not provided in config
const DEFAULT_WEIGHTS = {
  // High importance fields
  email: 0.9,
  phone: 0.8,
  dateOfBirth: 0.8,
  
  // Medium importance fields
  firstName: 0.6,
  lastName: 0.7,
  postalCode: 0.7,
  
  // Lower importance fields
  address: 0.5,
  city: 0.4,
  state: 0.3,
  country: 0.3,
  gender: 0.2,
  middleName: 0.3,
  suffix: 0.3,
  title: 0.1
};

// Default confidence thresholds for classifying matches
const DEFAULT_CONFIDENCE_THRESHOLDS = {
  HIGH: 0.9,
  MEDIUM: 0.7,
  LOW: 0.5,
  MINIMUM: 0.3
};

/**
 * Calculates similarity score between two values based on semantic type
 * @param {any} value1 - First value to compare
 * @param {any} value2 - Second value to compare
 * @param {string} semanticType - Semantic type for these values
 * @returns {number} Similarity score between 0 and 1
 */
function calculateSimilarity(value1, value2, semanticType) {
  // Handle null/undefined values
  if (value1 == null || value2 == null) {
    return 0;
  }
  
  // Special handling for array types (e.g., address_components)
  if (semanticType === 'address_components' && Array.isArray(value1) && Array.isArray(value2)) {
    // Use Jaccard similarity for arrays
    return calculateJaccardSimilarity(value1, value2);
  }
  
  // Convert to strings for comparison
  const str1 = String(value1).trim().toLowerCase();
  const str2 = String(value2).trim().toLowerCase();
  
  // Exact match is always 1.0
  if (str1 === str2) {
    return 1.0;
  }
  
  // Apply different comparison logic based on semantic type
  switch (semanticType) {
    case 'email':
      // For email, check if domain matches if username doesn't
      if (str1.includes('@') && str2.includes('@')) {
        const [user1, domain1] = str1.split('@');
        const [user2, domain2] = str2.split('@');
        
        // If domains match exactly, return 0.5
        if (domain1 === domain2) {
          return 0.5;
        }
      }
      return 0; // Different emails have 0 similarity
      
    case 'phone':
      // For phone, check last 4 digits
      const digits1 = str1.replace(/\D/g, '');
      const digits2 = str2.replace(/\D/g, '');
      
      // If both have at least 4 digits, check last 4
      if (digits1.length >= 4 && digits2.length >= 4) {
        const last4_1 = digits1.slice(-4);
        const last4_2 = digits2.slice(-4);
        
        if (last4_1 === last4_2) {
          return 0.7; // Same last 4 digits is a strong signal
        }
      }
      return 0;
      
    case 'firstName':
    case 'lastName':
    case 'middleName':
    case 'name':
      // For names, use Jaro-Winkler for better name matching
      return jaroWinkler(str1, str2);
      
    case 'address':
      // For addresses, check for token overlap
      return calculateTokenOverlapSimilarity(str1, str2);
      
    case 'postalCode':
      // For postal codes, check if they share a prefix
      const minLength = Math.min(str1.length, str2.length);
      for (let i = minLength; i >= 3; i--) {
        if (str1.substring(0, i) === str2.substring(0, i)) {
          return i / Math.max(str1.length, str2.length);
        }
      }
      return 0;
      
    case 'dateOfBirth':
      // For dates, parse and compare components
      try {
        const date1 = new Date(str1);
        const date2 = new Date(str2);
        
        // Invalid dates
        if (isNaN(date1.getTime()) || isNaN(date2.getTime())) {
          return 0;
        }
        
        // Compare year, month, day separately
        let score = 0;
        if (date1.getFullYear() === date2.getFullYear()) score += 0.4;
        if (date1.getMonth() === date2.getMonth()) score += 0.3;
        if (date1.getDate() === date2.getDate()) score += 0.3;
        
        return score;
      } catch (e) {
        return 0;
      }
      
    default:
      // Default string similarity for other types
      return calculateLevenshteinSimilarity(str1, str2);
  }
}

/**
 * Calculates Jaccard similarity between two arrays
 * @param {Array} arr1 - First array
 * @param {Array} arr2 - Second array
 * @returns {number} Similarity score between 0 and 1
 */
function calculateJaccardSimilarity(arr1, arr2) {
  if (!Array.isArray(arr1) || !Array.isArray(arr2)) {
    return 0;
  }
  
  // If both arrays are empty, they're identical
  if (arr1.length === 0 && arr2.length === 0) {
    return 1.0;
  }
  
  // Create sets for efficient intersection/union
  const set1 = new Set(arr1.map(item => String(item).toLowerCase()));
  const set2 = new Set(arr2.map(item => String(item).toLowerCase()));
  
  // Calculate intersection
  const intersection = new Set();
  for (const item of set1) {
    if (set2.has(item)) {
      intersection.add(item);
    }
  }
  
  // Calculate union
  const union = new Set([...set1, ...set2]);
  
  // Jaccard similarity = size of intersection / size of union
  return intersection.size / union.size;
}

/**
 * Calculates Levenshtein similarity between two strings
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Similarity score between 0 and 1
 */
function calculateLevenshteinSimilarity(str1, str2) {
  if (!str1 && !str2) {
    return 1.0; // Both empty means they match
  }
  
  if (!str1 || !str2) {
    return 0.0; // One empty means no match
  }
  
  str1 = String(str1).toLowerCase();
  str2 = String(str2).toLowerCase();
  
  if (str1 === str2) {
    return 1.0; // Exact match
  }
  
  // Use the fastest-levenshtein library
  const levenshteinDistance = distance(str1, str2);
  const maxLength = Math.max(str1.length, str2.length);
  
  // Convert distance to similarity score (0-1)
  return 1 - (levenshteinDistance / maxLength);
}

/**
 * Calculates token-based similarity between two strings
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Similarity score between 0 and 1
 */
function calculateTokenOverlapSimilarity(str1, str2) {
  if (!str1 && !str2) {
    return 1.0; // Both empty means they match
  }
  
  if (!str1 || !str2) {
    return 0.0; // One empty means no match
  }
  
  str1 = String(str1).toLowerCase();
  str2 = String(str2).toLowerCase();
  
  if (str1 === str2) {
    return 1.0; // Exact match
  }
  
  // Use Jaro-Winkler for name matching (gives weight to common prefixes)
  const jaroWinklerScore = jaroWinkler(str1, str2);
  
  // Use tokenization for additional comparison
  const tokens1 = tokenizer.tokenize(str1) || [];
  const tokens2 = tokenizer.tokenize(str2) || [];
  
  // If either has no tokens, rely solely on Jaro-Winkler
  if (tokens1.length === 0 || tokens2.length === 0) {
    return jaroWinklerScore;
  }
  
  // Calculate token overlap (jaccard similarity)
  const set1 = new Set(tokens1);
  const set2 = new Set(tokens2);
  
  const intersection = new Set([...set1].filter(token => set2.has(token)));
  const union = new Set([...set1, ...set2]);
  
  const jaccardScore = intersection.size / union.size;
  
  // Weight Jaro-Winkler higher for names (0.7) and Jaccard for longer texts (0.3)
  return (jaroWinklerScore * 0.7) + (jaccardScore * 0.3);
}

/**
 * Match engine class implementing the IMatchEngine interface
 */
class MatchEngine {
  /**
   * Creates a new match engine
   * @param {Object} config - Matching configuration
   * @param {Object} [config.fieldWeights] - Field weights by semantic type
   * @param {Object} [config.confidenceThresholds] - Confidence thresholds for match tiers
   */
  constructor(config = {}) {
    this.fieldWeights = {
      ...DEFAULT_WEIGHTS,
      ...(config.fieldWeights || {})
    };
    
    this.confidenceThresholds = {
      ...DEFAULT_CONFIDENCE_THRESHOLDS,
      ...(config.confidenceThresholds || {})
    };
  }
  
  /**
   * Evaluates a match between source and target records
   * @param {Object} sourceRecord - Source record
   * @param {Object} targetRecord - Target record
   * @param {Object} options - Matching options
   * @param {Array<Object>} options.sourceFieldMappings - Source field mappings
   * @param {Array<Object>} options.targetFieldMappings - Target field mappings
   * @param {string[]} [options.priorityFields] - Fields to prioritize in matching
   * @returns {Object} Match score with confidence and components
   */
  evaluateMatch(sourceRecord, targetRecord, options) {
    const { sourceFieldMappings, targetFieldMappings, priorityFields = [] } = options;
    
    if (!sourceRecord || !targetRecord) {
      throw new Error('Source and target records are required');
    }
    
    if (!Array.isArray(sourceFieldMappings) || !Array.isArray(targetFieldMappings)) {
      throw new Error('Field mappings must be arrays');
    }
    
    // Convert records to semantic type format
    const sourceByType = types.toSemanticTypes(sourceRecord, sourceFieldMappings);
    const targetByType = types.toSemanticTypes(targetRecord, targetFieldMappings);
    
    // Get shared semantic types between the records
    const sourceTypes = Object.keys(sourceByType);
    const targetTypes = Object.keys(targetByType);
    const sharedTypes = sourceTypes.filter(type => targetTypes.includes(type));
    
    // If no shared types, no match
    if (sharedTypes.length === 0) {
      return {
        confidence: 0,
        components: {},
        tier: 'NO_MATCH'
      };
    }
    
    // Calculate individual field scores
    const scores = {};
    let totalWeight = 0;
    let weightedScore = 0;
    
    for (const semanticType of sharedTypes) {
      const sourceValue = sourceByType[semanticType];
      const targetValue = targetByType[semanticType];
      
      if (sourceValue == null || targetValue == null) {
        continue;
      }
      
      // Get weight for this field
      let weight = this.fieldWeights[semanticType] || 0.5;
      
      // Boost weight for priority fields
      if (priorityFields.includes(semanticType)) {
        weight *= 1.5;
      }
      
      // Calculate similarity score
      const similarity = calculateSimilarity(sourceValue, targetValue, semanticType);
      
      // Store score component
      scores[semanticType] = similarity;
      
      // Add to weighted total
      totalWeight += weight;
      weightedScore += similarity * weight;
    }
    
    // Calculate overall confidence score
    const confidence = totalWeight > 0 ? weightedScore / totalWeight : 0;
    
    // Determine tier based on thresholds
    const tier = this._determineTier(confidence);
    
    return {
      confidence,
      components: scores,
      tier
    };
  }
  
  /**
   * Determines the confidence tier based on score
   * @param {number} score - Confidence score
   * @returns {string} Confidence tier
   * @private
   */
  _determineTier(score) {
    const { HIGH, MEDIUM, LOW, MINIMUM } = this.confidenceThresholds;
    
    if (score >= HIGH) return 'HIGH';
    if (score >= MEDIUM) return 'MEDIUM';
    if (score >= LOW) return 'LOW';
    if (score >= MINIMUM) return 'MINIMUM';
    return 'NO_MATCH';
  }
  
  /**
   * Gets appropriate strategies for matching fields
   * @param {Object} sourceFields - Source fields by semantic type
   * @param {Object} targetFields - Target fields by semantic type
   * @returns {Array<Object>} Array of match strategies
   */
  getStrategies(sourceFields, targetFields) {
    if (!sourceFields || !targetFields) {
      throw new Error('Source and target fields are required');
    }
    
    const sourceTypes = Object.keys(sourceFields);
    const targetTypes = Object.keys(targetFields);
    
    const sharedTypes = sourceTypes.filter(type => targetTypes.includes(type));
    const strategies = [];
    
    // Email matching strategy
    if (sharedTypes.includes('email')) {
      strategies.push({
        name: 'email',
        requiredFields: ['email']
      });
    }
    
    // Phone matching strategy
    if (sharedTypes.includes('phone')) {
      strategies.push({
        name: 'phone',
        requiredFields: ['phone']
      });
    }
    
    // Name matching strategies
    const hasFirstName = sharedTypes.includes('firstName');
    const hasLastName = sharedTypes.includes('lastName');
    
    if (hasFirstName && hasLastName) {
      strategies.push({
        name: 'fullName',
        requiredFields: ['firstName', 'lastName']
      });
    } else if (hasLastName) {
      strategies.push({
        name: 'lastName',
        requiredFields: ['lastName']
      });
    }
    
    // Address matching strategy
    const hasAddress = sharedTypes.includes('address');
    const hasPostalCode = sharedTypes.includes('postalCode');
    
    if (hasAddress && hasPostalCode) {
      strategies.push({
        name: 'address',
        requiredFields: ['address', 'postalCode']
      });
    } else if (hasPostalCode) {
      strategies.push({
        name: 'postalCode',
        requiredFields: ['postalCode']
      });
    }
    
    // Date of birth strategy
    if (sharedTypes.includes('dateOfBirth')) {
      strategies.push({
        name: 'dateOfBirth',
        requiredFields: ['dateOfBirth']
      });
    }
    
    // Address components strategy (for array-based address components)
    if (sharedTypes.includes('address_components')) {
      strategies.push({
        name: 'address_components',
        requiredFields: ['address_components']
      });
    }
    
    // Multi-field strategy
    if (strategies.length === 0 && sharedTypes.length >= 2) {
      strategies.push({
        name: 'multiField',
        requiredFields: sharedTypes
      });
    }
    
    return strategies;
  }
}

// Ensure MatchEngine implements IMatchEngine
Object.entries(IMatchEngine).forEach(([methodName, methodSignature]) => {
  if (typeof MatchEngine.prototype[methodName] !== 'function') {
    throw new Error(`MatchEngine must implement ${methodName} from IMatchEngine`);
  }
});

module.exports = {
  MatchEngine,
  calculateSimilarity,
  calculateLevenshteinSimilarity,
  calculateTokenOverlapSimilarity,
  calculateJaccardSimilarity
};