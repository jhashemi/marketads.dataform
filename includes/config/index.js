/**
 * Configuration Module
 * 
 * This module serves as the entry point for all configuration.
 * It composes configurations from different domains into a single
 * configuration object, following the Separation of Concerns principle.
 */

const { projectConfig } = require("dataform");
const matchingConfig = require('./matching');
const blockingConfig = require('./blocking');
const environmentConfig = require('./environment');
const { ConfigurationError } = require('../core/errors');

/**
 * Gets configuration value from project variables with default fallback
 * @param {string} key - The configuration key
 * @param {*} defaultValue - Default value if not found in project variables
 * @returns {*} - Configuration value
 */
function getConfigValue(key, defaultValue) {
  const prefix = "config_";
  return projectConfig.vars && projectConfig.vars[prefix + key] !== undefined ? 
    projectConfig.vars[prefix + key] : defaultValue;
}

/**
 * Gets the current environment name
 * @returns {string} - Current environment name
 */
function getCurrentEnvironment() {
  return projectConfig.vars?.environment || process.env.DATAFORM_ENVIRONMENT || "development";
}

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
    // Extract user options from project variables when available
    const projectVars = projectConfig.vars || {};
    
    const config = {
      matching: matchingConfig.createMatchingConfig({
        fieldWeights: projectVars.field_weights,
        confidenceThresholds: projectVars.confidence_thresholds,
        similarityThresholds: projectVars.similarity_thresholds,
        metricsTargets: projectVars.metrics_targets,
        ...options.matching
      }),
      
      blocking: blockingConfig.createBlockingConfig({
        blockingStrategies: projectVars.blocking_strategies,
        blockingParams: projectVars.blocking_params,
        ...options.blocking
      }),
      
      environment: environmentConfig.createEnvironmentConfig({
        environmentSettings: projectVars.environment_settings,
        ...options.environment
      })
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
  getConfigValue,
  getCurrentEnvironment,
  
  // Re-export sub-module functions for convenience
  createMatchingConfig: matchingConfig.createMatchingConfig,
  createBlockingConfig: blockingConfig.createBlockingConfig,
  createEnvironmentConfig: environmentConfig.createEnvironmentConfig,
  
  // Environment helpers
  isProduction: () => getCurrentEnvironment() === 'production',
  isDevelopment: () => getCurrentEnvironment() === 'development',
  isTesting: () => getCurrentEnvironment() === 'testing'
}; 