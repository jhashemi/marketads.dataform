/**
 * @fileoverview Factory class for creating MatchingSystem instances.
 * This file implements the Class-Based Factory Pattern as documented in
 * the CLASS_BASED_FACTORY_PATTERN.md file.
 * 
 * @author MarketAds Data Team
 * @see {@link docs/CLASS_BASED_FACTORY_PATTERN.md|Factory Pattern Documentation}
 */

const { MatchingSystem } = require('./matching_system');

/**
 * Factory class for creating MatchingSystem instances.
 * 
 * This factory is responsible for instantiating MatchingSystem objects with the
 * appropriate configuration. It follows the Factory Pattern to centralize
 * object creation logic and support dependency injection.
 * 
 * @class
 * @example
 * // Create a factory
 * const factory = new MatchingSystemFactory();
 * 
 * // Create a matching system instance
 * const matchingSystem = factory.create({
 *   sourceTable: 'customers',
 *   targetTable: 'customer_matches',
 *   matchingRules: { ... }
 * });
 * 
 * // Use the matching system
 * const result = matchingSystem.execute();
 */
class MatchingSystemFactory {
  /**
   * Initializes a new instance of the MatchingSystemFactory.
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
   * Creates a new MatchingSystem instance with the provided options.
   * 
   * @param {Object} options - Configuration options for the MatchingSystem
   * @param {string} options.sourceTable - The source table name
   * @param {string} options.targetTable - The target table name
   * @param {Object} [options.matchingRules] - Rules for matching records
   * @param {number} [options.confidenceThreshold=0.7] - Minimum confidence score to consider a match
   * @param {boolean} [options.allowMultipleMatches=false] - Whether to allow multiple matches for a source record
   * @param {number} [options.maxMatches=1] - Maximum number of matches per source record
   * @param {Object} [options.fieldMappings] - Mappings between source and target fields
   * @param {Array<string>} [options.requiredFields] - Fields that must be present for a match
   * @param {Object} [options.customHandlers] - Custom handler functions for specific operations
   * 
   * @returns {MatchingSystem} A configured MatchingSystem instance
   * 
   * @throws {Error} If required options are missing or invalid
   * 
   * @example
   * const matchingSystem = factory.create({
   *   sourceTable: 'customers',
   *   targetTable: 'customer_matches',
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
    
    // Create and return a new MatchingSystem instance
    return new MatchingSystem(mergedOptions);
  }
  
  /**
   * Alias for create() method to maintain backward compatibility
   * @deprecated Use create() instead
   */
  createMatchingSystem(options) {
    return this.create(options);
  }
}

module.exports = { MatchingSystemFactory }; 