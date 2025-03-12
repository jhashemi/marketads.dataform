/**
 * Environment Configuration
 * 
 * This module contains environment-specific configurations.
 * Separating environment configuration from other concerns follows the
 * Separation of Concerns principle.
 */

const { ConfigurationError } = require('../core/errors');

/**
 * Default environment settings
 */
const DEFAULT_ENVIRONMENT_SETTINGS = {
  // Maximum records to process in a single run
  maxRecords: 100000,
  
  // Default timeout for operations (ms)
  timeout: 30000,
  
  // Whether to log detailed information
  verbose: false,
  
  // Default temporary table prefix
  tempTablePrefix: 'temp_matching_',
  
  // Default schema for matching operations
  defaultSchema: 'marketads',
  
  // Whether to cache intermediate results
  useCache: true,
  
  // Default sample size for metrics
  metricsSampleSize: 1000,
  
  // Whether to track runtime metrics
  trackPerformance: true
};

/**
 * Validates environment settings
 * @param {Object} settings - Environment settings to validate
 * @throws {ConfigurationError} If environment settings are invalid
 */
function validateEnvironmentSettings(settings) {
  if (!settings || typeof settings !== 'object') {
    throw new ConfigurationError('Environment settings must be an object', 'environmentSettings');
  }
  
  const numericParams = [
    { param: 'maxRecords', min: 1, max: 10000000 },
    { param: 'timeout', min: 1000, max: 3600000 },
    { param: 'metricsSampleSize', min: 100, max: 1000000 }
  ];
  
  for (const { param, min, max } of numericParams) {
    const value = settings[param];
    if (typeof value !== 'number' || value < min || value > max || !Number.isInteger(value)) {
      throw new ConfigurationError(
        `"${param}" must be an integer between ${min} and ${max}`,
        `environmentSettings.${param}`
      );
    }
  }
  
  const booleanParams = ['verbose', 'useCache', 'trackPerformance'];
  for (const param of booleanParams) {
    if (typeof settings[param] !== 'boolean') {
      throw new ConfigurationError(
        `"${param}" must be a boolean`,
        `environmentSettings.${param}`
      );
    }
  }
  
  const stringParams = ['tempTablePrefix', 'defaultSchema'];
  for (const param of stringParams) {
    if (typeof settings[param] !== 'string' || settings[param].length === 0) {
      throw new ConfigurationError(
        `"${param}" must be a non-empty string`,
        `environmentSettings.${param}`
      );
    }
  }
  
  // Validate temp table prefix format (alphanumeric and underscore only)
  if (!/^[a-zA-Z0-9_]+$/.test(settings.tempTablePrefix)) {
    throw new ConfigurationError(
      '"tempTablePrefix" must contain only alphanumeric characters and underscores',
      'environmentSettings.tempTablePrefix'
    );
  }
  
  // Validate schema name format (alphanumeric and underscore only)
  if (!/^[a-zA-Z0-9_]+$/.test(settings.defaultSchema)) {
    throw new ConfigurationError(
      '"defaultSchema" must contain only alphanumeric characters and underscores',
      'environmentSettings.defaultSchema'
    );
  }
}

/**
 * Creates an environment configuration object with the specified or default values
 * @param {Object} options - Configuration options
 * @param {Object} [options.environmentSettings] - Environment settings
 * @returns {Object} Validated environment configuration
 */
function createEnvironmentConfig(options = {}) {
  const environmentSettings = {
    ...DEFAULT_ENVIRONMENT_SETTINGS,
    ...(options.environmentSettings || {})
  };
  
  // Validate configurations
  validateEnvironmentSettings(environmentSettings);
  
  return {
    environmentSettings
  };
}

/**
 * Gets the current environment (development, testing, production)
 * @returns {string} Current environment
 */
function getCurrentEnvironment() {
  return process.env.NODE_ENV || 'development';
}

/**
 * Checks if the current environment is production
 * @returns {boolean} True if production environment
 */
function isProduction() {
  return getCurrentEnvironment() === 'production';
}

/**
 * Checks if the current environment is development
 * @returns {boolean} True if development environment
 */
function isDevelopment() {
  return getCurrentEnvironment() === 'development';
}

/**
 * Checks if the current environment is testing
 * @returns {boolean} True if testing environment
 */
function isTesting() {
  return getCurrentEnvironment() === 'testing';
}

module.exports = {
  DEFAULT_ENVIRONMENT_SETTINGS,
  createEnvironmentConfig,
  validateEnvironmentSettings,
  getCurrentEnvironment,
  isProduction,
  isDevelopment,
  isTesting
}; 