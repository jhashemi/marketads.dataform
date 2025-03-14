const { TransitiveMatcher } = require('./transitive_matcher');

/**
 * Factory for creating TransitiveMatcher instances
 */
class TransitiveMatcherFactory {
  /**
   * Creates a new TransitiveMatcher instance
   * @param {Object} options - Configuration options for TransitiveMatcher
   * @returns {TransitiveMatcher} - New TransitiveMatcher instance
   */
  createTransitiveMatcher(options) {
    return new TransitiveMatcher(options);
  }
}

module.exports = { TransitiveMatcherFactory };