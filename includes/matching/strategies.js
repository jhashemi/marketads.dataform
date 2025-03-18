/**
 * Matching Strategies Collection
 * 
 * This module exports all available matching strategies implemented
 * in the MarketAds matching system.
 */

const { JaccardSimilarityMatcher } = require('./jaccard_similarity_matcher');
const { FuzzyNameMatcher } = require('./fuzzy_name_matcher');
const { AddressMatcher } = require('./address_matcher');

/**
 * Creates a strategy matcher based on semantic type
 * @param {string} semanticType - Semantic type to create matcher for
 * @param {Object} [config] - Configuration for the matcher
 * @returns {Object} Appropriate matcher for the semantic type
 */
function createMatcherForType(semanticType, config = {}) {
  switch (semanticType.toLowerCase()) {
    case 'firstName':
    case 'lastName':
    case 'middleName':
    case 'name':
    case 'fullName':
      return new FuzzyNameMatcher(config);
      
    case 'address':
    case 'streetAddress':
      return new AddressMatcher(config);
      
    case 'tags':
    case 'categories':
    case 'features':
    case 'tokens':
      return new JaccardSimilarityMatcher(config);
      
    default:
      // Default to Jaccard for array values, otherwise FuzzyName for string values
      if (config.isArrayField) {
        return new JaccardSimilarityMatcher(config);
      } else {
        return new FuzzyNameMatcher(config);
      }
  }
}

/**
 * Returns all available matchers
 * @param {Object} [config] - Global configuration to apply to all matchers
 * @returns {Object} Object containing all matcher instances
 */
function getAllMatchers(config = {}) {
  return {
    jaccard: new JaccardSimilarityMatcher(config),
    name: new FuzzyNameMatcher(config),
    address: new AddressMatcher(config)
  };
}

/**
 * Returns a mapping of semantic types to their recommended matchers
 * @returns {Object} Mapping of semantic types to matcher types
 */
function getSemanticTypeMatcherMapping() {
  return {
    // Person names
    'firstName': 'name',
    'lastName': 'name',
    'middleName': 'name',
    'fullName': 'name',
    'name': 'name',
    
    // Addresses
    'address': 'address',
    'streetAddress': 'address',
    'street': 'address',
    
    // Token sets
    'tags': 'jaccard',
    'categories': 'jaccard',
    'features': 'jaccard',
    'tokens': 'jaccard',
    'keywords': 'jaccard',
    'interests': 'jaccard',
    'skills': 'jaccard',
    
    // Others default to name matcher for strings or jaccard for arrays
    'default': 'name',
    'defaultArray': 'jaccard'
  };
}

module.exports = {
  // Export individual matchers
  JaccardSimilarityMatcher,
  FuzzyNameMatcher,
  AddressMatcher,
  
  // Export factory functions
  createMatcherForType,
  getAllMatchers,
  getSemanticTypeMatcherMapping
};