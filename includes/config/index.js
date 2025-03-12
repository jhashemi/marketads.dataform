/**
 * Configuration Module
 * 
 * This module serves as the entry point for all configuration.
 * It composes configurations from different domains into a single
 * configuration object, following the Separation of Concerns principle.
 */

const matchingConfig = require('./matching');
const blockingConfig = require('./blocking');
const environmentConfig = require('./environment');
const { ConfigurationError } = require('../core/errors');

/**
 * Creates a complete configuration object with all components
 * @param {Object} options - Configuration options
 * @param {Object} [options.matching] - Matching configuration options
 * @param {Object} [options.blocking] - Blocking configuration options
 * @param {Object} [options.environment] - Environment configuration options
 * @returns {Object} Complete configuration object
 */
function createConfig(options = {}) {
  try {
    const config = {
      matching: matchingConfig.createMatchingConfig(options.matching || {}),
      blocking: blockingConfig.createBlockingConfig(options.blocking || {}),
      environment: environmentConfig.createEnvironmentConfig(options.environment || {})
    };
    
    return config;
  } catch (error) {
    if (error instanceof ConfigurationError) {
      throw error;
    }
    
    throw new ConfigurationError(`Failed to create configuration: ${error.message}`);
  }
}

/**
 * Default configuration using all defaults from sub-modules
 */
const DEFAULT_CONFIG = createConfig();

module.exports = {
  createConfig,
  DEFAULT_CONFIG,
  
  // Re-export sub-module functions for convenience
  createMatchingConfig: matchingConfig.createMatchingConfig,
  createBlockingConfig: blockingConfig.createBlockingConfig,
  createEnvironmentConfig: environmentConfig.createEnvironmentConfig,
  
  // Environment helpers
  getCurrentEnvironment: environmentConfig.getCurrentEnvironment,
  isProduction: environmentConfig.isProduction,
  isDevelopment: environmentConfig.isDevelopment,
  isTesting: environmentConfig.isTesting
}; 