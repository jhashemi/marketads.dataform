/**
 * Blocking Configuration
 * 
 * This module contains configuration specific to the blocking process.
 * Separating blocking configuration from other concerns follows the
 * Separation of Concerns principle.
 */

const { ConfigurationError } = require('../core/errors');

/**
 * Default blocking strategies to use for different semantic types
 */
const DEFAULT_BLOCKING_STRATEGIES = {
  email: ['exact', 'domain'],
  phone: ['exact', 'lastFourDigits'],
  firstName: ['exact', 'firstThreeChars', 'soundex'],
  lastName: ['exact', 'firstThreeChars', 'soundex'],
  dateOfBirth: ['exact', 'year', 'month', 'day'],
  address: ['standardized', 'tokenized'],
  postalCode: ['exact', 'prefix'],
  fullName: ['tokenized', 'soundex']
};

/**
 * Default blocking parameters
 */
const DEFAULT_BLOCKING_PARAMS = {
  // Maximum number of blocking keys to generate per record
  maxKeysPerRecord: 10,
  
  // Minimum length for prefix-based blocking
  minPrefixLength: 3,
  
  // Minimum tokens to use in tokenized blocking
  minTokens: 2,
  
  // Whether to use cross-product of tokens or just individual tokens
  useTokenCrossProduct: true,
  
  // Number of phonetic keys to compute for names (e.g., different soundex variations)
  maxPhoneticKeys: 2
};

/**
 * Validates blocking strategies configuration
 * @param {Object} strategies - Blocking strategies by semantic type
 * @throws {ConfigurationError} If strategies are invalid
 */
function validateBlockingStrategies(strategies) {
  if (!strategies || typeof strategies !== 'object') {
    throw new ConfigurationError('Blocking strategies must be an object', 'blockingStrategies');
  }
  
  for (const [semanticType, strategyList] of Object.entries(strategies)) {
    if (!Array.isArray(strategyList) || strategyList.length === 0) {
      throw new ConfigurationError(
        `Blocking strategies for "${semanticType}" must be a non-empty array`,
        `blockingStrategies.${semanticType}`
      );
    }
    
    for (const strategy of strategyList) {
      if (typeof strategy !== 'string' || strategy.length === 0) {
        throw new ConfigurationError(
          `Invalid blocking strategy for "${semanticType}": ${strategy}`,
          `blockingStrategies.${semanticType}`
        );
      }
    }
  }
}

/**
 * Validates blocking parameters
 * @param {Object} params - Blocking parameters to validate
 * @throws {ConfigurationError} If parameters are invalid
 */
function validateBlockingParams(params) {
  if (!params || typeof params !== 'object') {
    throw new ConfigurationError('Blocking parameters must be an object', 'blockingParams');
  }
  
  const validations = [
    { param: 'maxKeysPerRecord', min: 1, max: 100 },
    { param: 'minPrefixLength', min: 1, max: 10 },
    { param: 'minTokens', min: 1, max: 10 },
    { param: 'maxPhoneticKeys', min: 1, max: 10 }
  ];
  
  for (const { param, min, max } of validations) {
    const value = params[param];
    if (typeof value !== 'number' || value < min || value > max || !Number.isInteger(value)) {
      throw new ConfigurationError(
        `"${param}" must be an integer between ${min} and ${max}`,
        `blockingParams.${param}`
      );
    }
  }
  
  if (typeof params.useTokenCrossProduct !== 'boolean') {
    throw new ConfigurationError(
      '"useTokenCrossProduct" must be a boolean',
      'blockingParams.useTokenCrossProduct'
    );
  }
}

/**
 * Creates a blocking configuration object with the specified or default values
 * @param {Object} options - Configuration options
 * @param {Object} [options.blockingStrategies] - Blocking strategies by semantic type
 * @param {Object} [options.blockingParams] - Blocking parameters
 * @returns {Object} Validated blocking configuration
 */
function createBlockingConfig(options = {}) {
  const blockingStrategies = {
    ...DEFAULT_BLOCKING_STRATEGIES,
    ...(options.blockingStrategies || {})
  };
  
  const blockingParams = {
    ...DEFAULT_BLOCKING_PARAMS,
    ...(options.blockingParams || {})
  };
  
  // Validate configurations
  validateBlockingStrategies(blockingStrategies);
  validateBlockingParams(blockingParams);
  
  return {
    blockingStrategies,
    blockingParams
  };
}

module.exports = {
  DEFAULT_BLOCKING_STRATEGIES,
  DEFAULT_BLOCKING_PARAMS,
  createBlockingConfig,
  validateBlockingStrategies,
  validateBlockingParams
}; 