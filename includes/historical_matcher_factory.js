/**
 * Historical Matcher Factory
 * 
 * Factory class for creating historical matcher instances
 */

const { HistoricalMatcher } = require('./historical_matcher');

/**
 * Factory class for creating historical matcher instances
 */
class HistoricalMatcherFactory {
  /**
   * Constructor
   */
  constructor() {
    // Initialize factory
  }

  /**
   * Creates a historical matcher instance
   * @param {Object} options - Configuration options
   * @returns {HistoricalMatcher} Historical matcher instance
   */
  createHistoricalMatcher(options) {
    return new HistoricalMatcher(options);
  }
}

module.exports = { HistoricalMatcherFactory }; 