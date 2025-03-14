// dataform/includes/match_strategy.js

/**
 * Interface for match strategies.
 */
class MatchStrategy {
  /**
   * Create a new match strategy
   * @param {string} name - Strategy name
   * @param {Object} options - Strategy options
   */
  constructor(name, options = {}) {
    this.name = name;
    this.options = options;
  }

  /**
   * Generate SQL for the matching strategy
   * @param {Object} context - Context with source and reference information
   * @returns {string} Generated SQL
   */
  generateSql(context) {
    throw new Error("Method 'generateSql' must be implemented.");
  }

  /**
   * Match records using this strategy
   * @param {Object} context - Context with source and reference information
   */
  match(context) {
    throw new Error("Method 'match' must be implemented.");
  }

  /**
   * Score matches using this strategy
   */
  score() {
    throw new Error("Method 'score' must be implemented.");
  }

  /**
   * Describe this strategy
   * @returns {string} Strategy description
   */
  describe() {
    throw new Error("Method 'describe' must be implemented.");
  }
}

module.exports = { MatchStrategy };