// dataform/includes/match_strategy_factory.js

// Import core utilities
const functions = require("./functions");

// Import strategy implementations
const { ExactMatchStrategy } = require("./match_strategies/exact_match_strategy");
const { ZipSoundexLastNameFirstNameStrategy } = require("./match_strategies/zip_soundex_lastname_firstname_strategy");
const { WaterfallMatchStrategy } = require("./match_strategies/waterfall_match_strategy");
const { MultiTableWaterfallStrategy } = require("./match_strategies/multi_table_waterfall_strategy");

// Import column documentation 
const docs = require("./docs"); // Fix path to docs.js - remove the leading slash

class MatchStrategyFactory {
  canHandle(col1, col2) {
    const col1Type = docs.columns?.find(col => col.name === col1)?.type;
    const col2Type = docs.columns?.find(col => col.name === col2)?.type;

    // Handle cases where column types may not be found in docs
    if (!col1Type || !col2Type) {
      return false;
    }

    // Implement logic to determine if the factory can handle the given columns
    // based on their types and other criteria
    if (col1Type === "STRING" && col2Type === "STRING") {
      // Example: Handle string columns with exact matching
      return true;
    } else if (col1Type === "INTEGER" && col2Type === "INTEGER") {
      // Example: Handle integer columns with range matching
      return true;
    }
    // ... add more conditions for other column types and matching strategies ...

    return false;
  }

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
   * Create a waterfall matching strategy
   * @param {Object} options - Strategy options
   * @returns {WaterfallMatchStrategy} Waterfall strategy instance
   */
  createWaterfallStrategy(options = {}) {
    return new WaterfallMatchStrategy(options);
  }
  
  /**
   * Create a multi-table waterfall matching strategy
   * @param {Object} options - Strategy options
   * @returns {MultiTableWaterfallStrategy} Multi-table waterfall strategy instance
   */
  createMultiTableWaterfallStrategy(options = {}) {
    return new MultiTableWaterfallStrategy(options);
  }
  
  /**
   * Create a strategy by name
   * @param {string} strategyName - Name of the strategy
   * @param {Object} options - Strategy options
   * @returns {MatchStrategy} Strategy instance
   */
  createStrategyByName(strategyName, options = {}) {
    switch (strategyName) {
      case 'exact':
        return new ExactMatchStrategy(options);
      case 'zip_soundex_lastname_firstname':
        return new ZipSoundexLastNameFirstNameStrategy(options);
      case 'waterfall':
        return this.createWaterfallStrategy(options);
      case 'multi_table_waterfall':
        return this.createMultiTableWaterfallStrategy(options);
      default:
        throw new Error(`Unknown strategy name: ${strategyName}`);
    }
  }
}

// Export the class itself rather than a singleton instance
// This allows Dataform to properly require the module
module.exports = MatchStrategyFactory;