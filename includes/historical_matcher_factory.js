/**
 * @fileoverview Factory class for creating HistoricalMatcher instances.
 * This file implements the Class-Based Factory Pattern as documented in
 * the CLASS_BASED_FACTORY_PATTERN.md file.
 * 
 * @author MarketAds Data Team
 * @see {@link docs/CLASS_BASED_FACTORY_PATTERN.md|Factory Pattern Documentation}
 */

const { HistoricalMatcher } = require('./historical_matcher');

/**
 * Factory class for creating HistoricalMatcher instances.
 * 
 * This factory is responsible for instantiating HistoricalMatcher objects with the
 * appropriate configuration. It follows the Factory Pattern to centralize
 * object creation logic and support dependency injection.
 * 
 * @class
 * @example
 * // Create a factory
 * const factory = new HistoricalMatcherFactory();
 * 
 * // Create a historical matcher instance
 * const historicalMatcher = factory.create({
 *   sourceTable: 'customers',
 *   baselineTable: 'customer_history',
 *   outputTable: 'customer_matches_history'
 * });
 * 
 * // Use the historical matcher
 * const result = historicalMatcher.execute();
 */
class HistoricalMatcherFactory {
  /**
   * Initializes a new instance of the HistoricalMatcherFactory.
   * 
   * @constructor
   * @param {Object} [config] - Optional configuration for the factory
   * @param {Function} [config.loggerProvider] - Function that returns a logger instance
   * @param {Object} [config.defaultOptions] - Default options to use when creating instances
   */
  constructor(config = {}) {
    this.loggerProvider = config.loggerProvider;
    this.defaultOptions = config.defaultOptions || {};
  }

  /**
   * Creates a new HistoricalMatcher instance with the provided options.
   * 
   * @param {Object} options - Configuration options for the HistoricalMatcher
   * @param {string} options.sourceTable - The source table name
   * @param {string} options.baselineTable - The baseline historical table name
   * @param {string} [options.outputTable] - The output table for matches
   * @param {Object} [options.matchingRules] - Rules for matching records
   * @param {number} [options.confidenceThreshold=0.7] - Minimum confidence score to consider a match
   * @param {boolean} [options.allowMultipleMatches=false] - Whether to allow multiple matches for a source record
   * @param {number} [options.maxMatches=1] - Maximum number of matches per source record
   * @param {Object} [options.fieldMappings] - Mappings between source and historical fields
   * @param {Object} [options.customHandlers] - Custom handler functions for specific operations
   * 
   * @returns {HistoricalMatcher} A configured HistoricalMatcher instance
   * 
   * @throws {Error} If required options are missing or invalid
   * 
   * @example
   * const historicalMatcher = factory.create({
   *   sourceTable: 'customers_current',
   *   baselineTable: 'customers_historical',
   *   outputTable: 'customer_matches_historical',
   *   confidenceThreshold: 0.8,
   *   matchingRules: {
   *     blocking: [{ sourceField: 'zip', targetField: 'postal_code' }],
   *     scoring: [{ sourceField: 'name', targetField: 'name', weight: 1.0 }]
   *   }
   * });
   */
  create(options) {
    // Merge default options with provided options
    const mergedOptions = { ...this.defaultOptions, ...options };
    
    // Create a logger if a provider is available
    if (this.loggerProvider) {
      mergedOptions.logger = this.loggerProvider();
    }
    
    // Create and return a new HistoricalMatcher instance
    return new HistoricalMatcher(mergedOptions);
  }
  
  /**
   * Alias for create() method to maintain backward compatibility
   * @deprecated Use create() instead
   */
  createHistoricalMatcher(options) {
    return this.create(options);
  }
}

module.exports = { HistoricalMatcherFactory }; 