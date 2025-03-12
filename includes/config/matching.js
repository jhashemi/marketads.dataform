/**
 * Matching Configuration
 * 
 * This module contains configuration specific to the matching process.
 * It separates matching configuration from other concerns, following
 * the Separation of Concerns principle.
 */

const { ConfigurationError } = require('../core/errors');

/**
 * Default field weights for different semantic types
 */
const DEFAULT_FIELD_WEIGHTS = {
  email: 0.9,
  phone: 0.8,
  firstName: 0.6,
  lastName: 0.7,
  address: 0.5,
  dateOfBirth: 0.8,
  postalCode: 0.7,
  city: 0.4,
  state: 0.3,
  country: 0.3,
  gender: 0.2,
  middleName: 0.3,
  suffix: 0.3,
  title: 0.1
};

/**
 * Default thresholds for match confidence tiers
 */
const DEFAULT_CONFIDENCE_THRESHOLDS = {
  HIGH: 0.9,
  MEDIUM: 0.7,
  LOW: 0.5,
  MINIMUM: 0.3
};

/**
 * Default similarity thresholds for different field types
 */
const DEFAULT_SIMILARITY_THRESHOLDS = {
  EXACT: 1.0,
  HIGH: 0.9,
  MEDIUM: 0.7,
  LOW: 0.5
};

/**
 * Default metrics targets
 */
const DEFAULT_METRICS_TARGETS = {
  dobAppendRate: 0.8,
  highConfidenceMatchRate: 0.7,
  mediumConfidenceMatchRate: 0.2
};

/**
 * Validates field weights configuration
 * @param {Object} fieldWeights - Field weights to validate
 * @throws {ConfigurationError} If field weights are invalid
 */
function validateFieldWeights(fieldWeights) {
  if (!fieldWeights || typeof fieldWeights !== 'object') {
    throw new ConfigurationError('Field weights must be an object', 'fieldWeights');
  }
  
  for (const [field, weight] of Object.entries(fieldWeights)) {
    if (typeof weight !== 'number' || weight < 0 || weight > 1) {
      throw new ConfigurationError(
        `Field weight for "${field}" must be a number between 0 and 1`, 
        `fieldWeights.${field}`
      );
    }
  }
}

/**
 * Validates confidence thresholds configuration
 * @param {Object} thresholds - Confidence thresholds to validate
 * @throws {ConfigurationError} If thresholds are invalid
 */
function validateConfidenceThresholds(thresholds) {
  if (!thresholds || typeof thresholds !== 'object') {
    throw new ConfigurationError('Confidence thresholds must be an object', 'confidenceThresholds');
  }
  
  const requiredTiers = ['HIGH', 'MEDIUM', 'LOW', 'MINIMUM'];
  for (const tier of requiredTiers) {
    if (typeof thresholds[tier] !== 'number' || thresholds[tier] < 0 || thresholds[tier] > 1) {
      throw new ConfigurationError(
        `Confidence threshold for "${tier}" must be a number between 0 and 1`,
        `confidenceThresholds.${tier}`
      );
    }
  }
  
  // Ensure thresholds are in descending order
  if (!(thresholds.HIGH >= thresholds.MEDIUM && 
        thresholds.MEDIUM >= thresholds.LOW && 
        thresholds.LOW >= thresholds.MINIMUM)) {
    throw new ConfigurationError(
      'Confidence thresholds must be in descending order: HIGH >= MEDIUM >= LOW >= MINIMUM',
      'confidenceThresholds'
    );
  }
}

/**
 * Creates a matching configuration object with the specified or default values
 * @param {Object} options - Configuration options
 * @param {Object} [options.fieldWeights] - Field weights by semantic type
 * @param {Object} [options.confidenceThresholds] - Confidence tier thresholds
 * @param {Object} [options.similarityThresholds] - Similarity thresholds for field comparison
 * @param {Object} [options.metricsTargets] - Target metrics values
 * @returns {Object} Validated matching configuration
 */
function createMatchingConfig(options = {}) {
  const fieldWeights = {
    ...DEFAULT_FIELD_WEIGHTS,
    ...(options.fieldWeights || {})
  };
  
  const confidenceThresholds = {
    ...DEFAULT_CONFIDENCE_THRESHOLDS,
    ...(options.confidenceThresholds || {})
  };
  
  const similarityThresholds = {
    ...DEFAULT_SIMILARITY_THRESHOLDS,
    ...(options.similarityThresholds || {})
  };
  
  const metricsTargets = {
    ...DEFAULT_METRICS_TARGETS,
    ...(options.metricsTargets || {})
  };
  
  // Validate configurations
  validateFieldWeights(fieldWeights);
  validateConfidenceThresholds(confidenceThresholds);
  
  return {
    fieldWeights,
    confidenceThresholds,
    similarityThresholds,
    metricsTargets
  };
}

module.exports = {
  DEFAULT_FIELD_WEIGHTS,
  DEFAULT_CONFIDENCE_THRESHOLDS,
  DEFAULT_SIMILARITY_THRESHOLDS,
  DEFAULT_METRICS_TARGETS,
  createMatchingConfig,
  validateFieldWeights,
  validateConfidenceThresholds
}; 