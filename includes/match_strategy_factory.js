// dataform/includes/match_strategy_factory.js

/**
 * @fileoverview Factory class for creating match strategy instances.
 * This file implements the Class-Based Factory Pattern as documented in
 * the CLASS_BASED_FACTORY_PATTERN.md file.
 * 
 * The MatchStrategyFactory is responsible for creating different match strategy
 * instances based on column types, strategy names, or specific requirements.
 * 
 * @author MarketAds Data Team
 * @see {@link docs/CLASS_BASED_FACTORY_PATTERN.md|Factory Pattern Documentation}
 */

// Import core utilities
const functions = require("./functions");

// Import strategy implementations
const { ExactMatchStrategy } = require("./match_strategies/exact_match_strategy");
const { ZipSoundexLastNameFirstNameStrategy } = require("./match_strategies/zip_soundex_lastname_firstname_strategy");
const { WaterfallMatchStrategy } = require("./match_strategies/waterfall_match_strategy");
const { MultiTableWaterfallStrategy } = require("./match_strategies/multi_table_waterfall_strategy");

// Import column documentation 
const docs = require("./docs"); // Fix path to docs.js - remove the leading slash

/**
 * Factory class for creating match strategy instances based on different criteria.
 * 
 * This factory centralizes the creation of different matching strategies and provides
 * methods to select the appropriate strategy based on column types, strategy names,
 * or specific requirements.
 * 
 * @class
 * @example
 * // Create a factory
 * const factory = new MatchStrategyFactory();
 * 
 * // Create a waterfall strategy instance
 * const waterfallStrategy = factory.create('waterfall', {
 *   sourceTable: 'customers',
 *   targetTable: 'reference_customers',
 *   confidenceThreshold: 0.8
 * });
 * 
 * // Use the strategy
 * const result = waterfallStrategy.execute();
 */
class MatchStrategyFactory {
  /**
   * Initializes a new instance of the MatchStrategyFactory.
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
   * Determines if the factory can handle matching between two columns.
   * 
   * @param {string} col1 - First column name
   * @param {string} col2 - Second column name
   * @returns {boolean} True if the columns can be matched, otherwise false
   * 
   * @example
   * const canMatch = factory.canHandle('first_name', 'fname');
   */
  canHandle(col1, col2) {
    const col1Type = docs.columns?.find(col => col.name === col1)?.type;
    const col2Type = docs.columns?.find(col => col.name === col2)?.type;
    return col1Type === col2Type;
  }

  /**
   * Gets the appropriate matching strategy for two columns based on their types.
   * 
   * @param {string} col1 - First column name
   * @param {string} col2 - Second column name
   * @returns {Object} The appropriate matching strategy
   * @throws {Error} If no strategy can be found for the columns
   * 
   * @example
   * const strategy = factory.getStrategy('email', 'email_address');
   */
  getStrategy(col1, col2) {
    // Implement logic to select the appropriate strategy based on column types and other criteria
    if (this.canHandle(col1, col2)) {
      const col1Type = docs.columns.find(col => col.name === col1)?.type;
      const col2Type = docs.columns.find(col => col.name === col2)?.type;

      if ((col1Type === "STRING" && col2Type === "STRING") ||
          (col1Type === "INTEGER" && col2Type === "INTEGER")) {
        // Use exact matching for string or integer columns
        return new ExactMatchStrategy(col1, col2);
      }
      // ... add more conditions for other column types and matching strategies ...
    }

    throw new Error(`No strategy found for columns ${col1} and ${col2}`);
  }
  
  /**
   * Creates a waterfall match strategy instance.
   * 
   * @param {Object} options - Configuration options for the waterfall strategy
   * @param {string} options.sourceTable - The source table name
   * @param {string} options.targetTable - The target table name
   * @param {Object} [options.matchingRules] - Rules for matching records
   * @param {number} [options.confidenceThreshold=0.7] - Minimum confidence score to consider a match
   * @returns {WaterfallMatchStrategy} A configured waterfall match strategy instance
   * 
   * @example
   * const waterfallStrategy = factory.createWaterfallStrategy({
   *   sourceTable: 'customers',
   *   targetTable: 'reference_customers',
   *   confidenceThreshold: 0.8
   * });
   */
  createWaterfallStrategy(options) {
    const mergedOptions = { ...this.defaultOptions, ...options };
    return new WaterfallMatchStrategy(mergedOptions);
  }
  
  /**
   * Creates a multi-table waterfall strategy instance.
   * 
   * @param {Object} options - Configuration options for the multi-table waterfall strategy
   * @param {string} options.sourceTable - The source table name
   * @param {Array<Object>} options.referenceTables - Array of reference table configurations
   * @param {Object} [options.matchingRules] - Rules for matching records by reference table
   * @param {number} [options.confidenceThreshold=0.7] - Minimum confidence score to consider a match
   * @returns {MultiTableWaterfallStrategy} A configured multi-table waterfall strategy instance
   * 
   * @example
   * const multiTableStrategy = factory.createMultiTableWaterfallStrategy({
   *   sourceTable: 'customers',
   *   referenceTables: [
   *     { id: 'verified', table: 'verified_customers', priority: 1 },
   *     { id: 'crm', table: 'crm_customers', priority: 2 }
   *   ]
   * });
   */
  createMultiTableWaterfallStrategy(options) {
    const mergedOptions = { ...this.defaultOptions, ...options };
    return new MultiTableWaterfallStrategy(mergedOptions);
  }
  
  /**
   * Creates a strategy instance by name.
   * 
   * @param {string} strategyName - The name of the strategy to create
   * @param {Object} [options={}] - Configuration options for the strategy
   * @returns {Object} The requested strategy instance
   * @throws {Error} If the strategy name is not recognized
   * 
   * @example
   * const exactStrategy = factory.createStrategyByName('exact_match', {
   *   sourceField: 'email',
   *   targetField: 'email_address'
   * });
   */
  createStrategyByName(strategyName, options = {}) {
    const mergedOptions = { ...this.defaultOptions, ...options };
    
    switch (strategyName) {
      case 'exact_match':
        return new ExactMatchStrategy(mergedOptions);
      case 'zip_soundex_lastname_firstname':
        return new ZipSoundexLastNameFirstNameStrategy(mergedOptions);
      case 'waterfall':
        return this.createWaterfallStrategy(mergedOptions);
      case 'multi_table_waterfall':
        return this.createMultiTableWaterfallStrategy(mergedOptions);
      default:
        throw new Error(`Unknown strategy name: ${strategyName}`);
    }
  }
  
  /**
   * Creates a strategy instance. Main factory method that serves as the entry point.
   * 
   * @param {string|Object} strategyNameOrOptions - Strategy name or options object with strategy property
   * @param {Object} [options={}] - Configuration options if strategy name is provided
   * @returns {Object} The requested strategy instance
   * 
   * @example
   * // Create by name and options
   * const strategy1 = factory.create('waterfall', { sourceTable: 'customers' });
   * 
   * // Create by options object with strategy property
   * const strategy2 = factory.create({
   *   strategy: 'waterfall',
   *   sourceTable: 'customers'
   * });
   */
  create(strategyNameOrOptions, options = {}) {
    // If first parameter is a string, treat it as strategy name
    if (typeof strategyNameOrOptions === 'string') {
      return this.createStrategyByName(strategyNameOrOptions, options);
    }
    
    // If first parameter is an object, treat it as options with a strategy property
    if (typeof strategyNameOrOptions === 'object' && strategyNameOrOptions.strategy) {
      const { strategy, ...restOptions } = strategyNameOrOptions;
      return this.createStrategyByName(strategy, { ...restOptions, ...options });
    }
    
    throw new Error('Invalid parameters: provide either a strategy name or options with strategy property');
  }
}

// Export the class itself rather than a singleton instance
// This allows Dataform to properly require the module
module.exports = { MatchStrategyFactory };