/**
 * MarketAds Dataform - Core Module Index
 * 
 * This is the main entry point for the MarketAds Dataform library.
 * It exports all the key components and factories for external use.
 */

// Core Classes
const { MatchingSystem } = require('./matching_system');
const { HistoricalMatcher } = require('./historical_matcher');

// Factory Classes
const { MatchingSystemFactory } = require('./matching_system_factory');
const { HistoricalMatcherFactory } = require('./historical_matcher_factory');
const { MatchStrategyFactory } = require('./match_strategy_factory');

// Matching Module
const { TransitiveMatcher } = require('./matching/transitive_matcher');
const { TransitiveMatcherFactory } = require('./matching/transitive_matcher_factory');

// Export all components
module.exports = {
  // Core Classes
  MatchingSystem,
  HistoricalMatcher,
  TransitiveMatcher,
  
  // Factory Classes
  MatchingSystemFactory,
  HistoricalMatcherFactory,
  MatchStrategyFactory,
  TransitiveMatcherFactory,
  
  // Factory instances (for convenience)
  matchingSystemFactory: new MatchingSystemFactory(),
  historicalMatcherFactory: new HistoricalMatcherFactory(),
  matchStrategyFactory: new MatchStrategyFactory(),
  transitiveMatcherFactory: new TransitiveMatcherFactory()
}; 