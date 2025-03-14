/**
 * Matching System Factory
 * 
 * Factory class for creating matching system instances
 */

const { MatchingSystem } = require('./matching_system');

/**
 * Factory class for creating matching system instances
 */
class MatchingSystemFactory {
  /**
   * Constructor
   */
  constructor() {
    // Initialize factory
  }

  /**
   * Creates a matching system instance
   * @param {Object} options - Configuration options
   * @returns {MatchingSystem} Matching system instance
   */
  createMatchingSystem(options) {
    return new MatchingSystem(options);
  }
}

module.exports = { MatchingSystemFactory }; 