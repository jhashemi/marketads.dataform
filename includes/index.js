/**
 * MarketAds Dataform - Core Module Index
 * 
 * This is the main entry point for the MarketAds Dataform library.
 * It exports all the key components and factories for external use.
 */

// Configuration modules
const config = require('./config');
const semanticTypes = require('./semantic_types');

// Core Classes
const { MatchingSystem } = require('./matching_system');
const { HistoricalMatcher } = require('./historical_matcher');
const { MatchStrategy } = require('./match_strategy');

// Factory Classes
const { MatchingSystemFactory } = require('./matching_system_factory');
const { HistoricalMatcherFactory } = require('./historical_matcher_factory');
const { MatchStrategyFactory } = require('./match_strategy_factory');
const fieldMappingFactory = require('./field_mapping_factory');

// Utility modules
const matchingFunctions = require('./matching_functions');
const blockingFunctions = require('./blocking_functions');
const functions = require('./functions');
const { validateParameters } = require('./validation/parameter_validator');

// Matching Module
const { TransitiveMatcher } = require('./matching/transitive_matcher');
const { TransitiveMatcherFactory } = require('./matching/transitive_matcher_factory');

// Re-export Dataform core for convenience
const { projectConfig } = require("dataform");

// Export all components
module.exports = {
  // Core Classes
  MatchingSystem,
  HistoricalMatcher,
  TransitiveMatcher,
  MatchStrategy,
  
  // Factory Classes
  MatchingSystemFactory,
  HistoricalMatcherFactory,
  MatchStrategyFactory,
  TransitiveMatcherFactory,
  fieldMappingFactory,
  
  // Factory instances (for convenience)
  matchingSystemFactory: new MatchingSystemFactory(),
  historicalMatcherFactory: new HistoricalMatcherFactory(),
  matchStrategyFactory: new MatchStrategyFactory(),
  transitiveMatcherFactory: new TransitiveMatcherFactory(),
  
  // Configuration
  config,
  semanticTypes,
  
  // Utility functions
  matchingFunctions,
  blockingFunctions,
  functions,
  validateParameters,
  
  // Helper methods for SQL generation
  standardize: matchingFunctions.standardize,
  calculateSimilarity: matchingFunctions.calculateSimilarity,
  phoneticCode: matchingFunctions.phoneticCode,
  
  // Dataform integration
  dataform: {
    projectConfig
  }
}; 