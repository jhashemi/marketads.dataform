// dataform/includes/match_strategy_factory.js

const ExactMatchStrategy = require("./match_strategies/exact_match_strategy");
const ZipSoundexLastNameFirstNameStrategy = require("./match_strategies/zip_soundex_lastname_firstname_strategy");
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
}

module.exports = MatchStrategyFactory;