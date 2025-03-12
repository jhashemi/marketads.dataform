// dataform/includes/match_strategy_factory.js

const ExactMatchStrategy = require("./match_strategies/exact_match_strategy");
const ZipSoundexLastNameFirstNameStrategy = require("./match_strategies/zip_soundex_lastname_firstname_strategy");
const WaterfallMatchStrategy = require("./match_strategies/waterfall_match_strategy");
const MultiTableWaterfallStrategy = require("./match_strategies/multi_table_waterfall_strategy");
// ... import other strategies ...

const docs = require("/includes/docs"); // Import column information from docs.js

class MatchStrategyFactory {
  canHandle(col1, col2) {
    const col1Type = docs.columns.find(col => col.name === col1)?.type;
    const col2Type = docs.columns.find(col => col.name === col2)?.type;

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

      if (col1Type === "STRING" && col2Type === "STRING") {
        // Example: Use exact matching for string columns
        return new ExactMatchStrategy(col1, col2);
      } else if (col1Type === "INTEGER" && col2Type === "INTEGER") {
        // Example: Use range matching for integer columns
        return new RangeMatchStrategy(col1, col2); // Assuming you have a RangeMatchStrategy implemented
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

// Create singleton instance
const matchStrategyFactory = new MatchStrategyFactory();

module.exports = matchStrategyFactory;