/**
 * Market Ads Dataform Package
 * 
 * This package provides utilities and functions for data processing in Dataform projects
 * related to marketing and advertising data.
 */

// Export utility functions
const functions = require('./includes/functions');
const matchingFunctions = require('./includes/matching_functions');
const semanticTypes = require('./includes/semantic_types');

// Optional: export other utilities as needed
const ruleEngine = require('./includes/rule_engine');
const historicalMatcher = require('./includes/historical_matcher');
const matchStrategyFactory = require('./includes/match_strategy_factory');

// Export all modules
module.exports = {
  functions,
  matchingFunctions,
  semanticTypes,
  ruleEngine,
  historicalMatcher,
  matchStrategyFactory
}; 