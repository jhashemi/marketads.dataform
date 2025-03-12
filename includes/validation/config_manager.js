/**
 * Configuration Manager for Record Matching System
 * 
 * Provides centralized configuration management for the validation framework
 * with configuration validation, defaults, and override capabilities.
 */

const fs = require('fs');
const path = require('path');
const errorHandler = require('./error_handler');

/**
 * Default test configuration values
 */
const DEFAULT_CONFIG = {
  // BigQuery connection settings
  bigquery: {
    projectId: process.env.BIGQUERY_PROJECT_ID || null,
    datasetId: process.env.BIGQUERY_DATASET_ID || 'test_dataset',
    location: process.env.BIGQUERY_LOCATION || 'US',
    timeoutMs: 300000, // 5 minutes
    maximumBytesBilled: null // No limit by default
  },
  
  // Test execution settings
  testExecution: {
    parallel: true,
    maxParallelTests: 5,
    retryCount: 2,
    retryDelayMs: 1000
  },
  
  // Matching thresholds
  matchingThresholds: {
    high: 0.85,
    medium: 0.65,
    low: 0.45
  },
  
  // Field weights
  fieldWeights: {
    firstName: 1.5,
    lastName: 2.0,
    email: 2.5,
    phone: 1.0,
    streetAddress: 2.0,
    city: 1.0,
    state: 0.5,
    zipCode: 1.5,
    dateOfBirth: 3.0
  },
  
  // Test output settings
  testOutput: {
    outputDir: process.env.TEST_OUTPUT_DIR || './test_reports',
    reportFormat: 'html',
    includeRawResults: true,
    includeErrorDetails: true
  },
  
  // Temporary test data settings
  tempData: {
    cleanupAfterTests: true,
    tablePrefix: 'temp_test_'
  }
};

/**
 * Schema definitions for configuration validation
 */
const CONFIG_SCHEMA = {
  bigquery: {
    type: 'object',
    required: ['projectId', 'datasetId'],
    nullable: false
  },
  testExecution: {
    type: 'object',
    required: ['parallel', 'maxParallelTests'],
    nullable: false
  },
  matchingThresholds: {
    type: 'object',
    required: ['high', 'medium', 'low'],
    nullable: false
  },
  fieldWeights: {
    type: 'object',
    nullable: false
  },
  testOutput: {
    type: 'object',
    required: ['outputDir', 'reportFormat'],
    nullable: false
  },
  tempData: {
    type: 'object',
    required: ['cleanupAfterTests', 'tablePrefix'],
    nullable: false
  }
};

/**
 * Configuration Manager class
 */
class ConfigManager {
  /**
   * Create a new ConfigManager
   * @param {Object} initialConfig - Initial configuration to override defaults
   */
  constructor(initialConfig = {}) {
    this.config = this._mergeWithDefaults(initialConfig);
    this.validate();
  }
  
  /**
   * Get current configuration
   * @returns {Object} The current configuration object
   */
  getConfig() {
    return JSON.parse(JSON.stringify(this.config)); // Return a deep copy
  }
  
  /**
   * Update configuration
   * @param {Object} newConfig - New configuration values
   * @param {boolean} validate - Whether to validate after update
   * @returns {Object} Updated configuration
   */
  update(newConfig, validate = true) {
    this.config = this._deepMerge(this.config, newConfig);
    
    if (validate) {
      this.validate();
    }
    
    return this.getConfig();
  }
  
  /**
   * Reset configuration to defaults
   * @returns {Object} Default configuration
   */
  reset() {
    this.config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    return this.getConfig();
  }
  
  /**
   * Load configuration from file
   * @param {string} filePath - Path to configuration file
   * @returns {Object} Loaded configuration
   */
  loadFromFile(filePath) {
    try {
      const resolvedPath = path.resolve(filePath);
      
      if (!fs.existsSync(resolvedPath)) {
        throw errorHandler.createConfigError(`Configuration file not found: ${resolvedPath}`);
      }
      
      const fileContent = fs.readFileSync(resolvedPath, 'utf8');
      let fileConfig;
      
      if (resolvedPath.endsWith('.json')) {
        fileConfig = JSON.parse(fileContent);
      } else if (resolvedPath.endsWith('.js')) {
        // For JS files, require them directly (allows dynamic configurations)
        delete require.cache[resolvedPath]; // Clear require cache to ensure fresh load
        fileConfig = require(resolvedPath);
      } else {
        throw errorHandler.createConfigError(`Unsupported configuration file format: ${resolvedPath}`);
      }
      
      this.update(fileConfig);
      return this.getConfig();
      
    } catch (error) {
      if (error instanceof errorHandler.ValidationError) {
        throw error;
      }
      
      throw errorHandler.createConfigError(`Error loading configuration from file: ${error.message}`, error);
    }
  }
  
  /**
   * Save configuration to file
   * @param {string} filePath - Path to save configuration file
   * @returns {boolean} True if successful
   */
  saveToFile(filePath) {
    try {
      const resolvedPath = path.resolve(filePath);
      const dirPath = path.dirname(resolvedPath);
      
      // Ensure directory exists
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      
      const fileContent = JSON.stringify(this.config, null, 2);
      fs.writeFileSync(resolvedPath, fileContent, 'utf8');
      return true;
      
    } catch (error) {
      throw errorHandler.createIOError(`Error saving configuration to file: ${error.message}`, error);
    }
  }
  
  /**
   * Validate the current configuration
   * @returns {boolean} True if valid
   */
  validate() {
    try {
      this._validateConfigObject(this.config, CONFIG_SCHEMA);
      
      // Additional validation for specific fields
      this._validateSpecificFields();
      
      return true;
    } catch (error) {
      throw errorHandler.createConfigError(`Configuration validation error: ${error.message}`, error);
    }
  }
  
  /**
   * Get a specific configuration value by path
   * @param {string} path - Dot-notation path to configuration value
   * @param {*} defaultValue - Default value if path not found
   * @returns {*} Configuration value
   */
  get(path, defaultValue = undefined) {
    const parts = path.split('.');
    let current = this.config;
    
    for (const part of parts) {
      if (current === undefined || current === null || typeof current !== 'object') {
        return defaultValue;
      }
      
      current = current[part];
    }
    
    return current !== undefined ? current : defaultValue;
  }
  
  /**
   * Set a specific configuration value by path
   * @param {string} path - Dot-notation path to configuration value
   * @param {*} value - Value to set
   * @param {boolean} validate - Whether to validate after update
   * @returns {Object} Updated configuration
   */
  set(path, value, validate = true) {
    const parts = path.split('.');
    const newConfig = JSON.parse(JSON.stringify(this.config));
    let current = newConfig;
    
    // Navigate to the right level
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      
      if (current[part] === undefined) {
        current[part] = {};
      }
      
      current = current[part];
    }
    
    // Set the value
    current[parts[parts.length - 1]] = value;
    
    return this.update(newConfig, validate);
  }
  
  /**
   * Merge configuration with defaults
   * @private
   * @param {Object} config - Configuration to merge
   * @returns {Object} Merged configuration
   */
  _mergeWithDefaults(config) {
    return this._deepMerge(JSON.parse(JSON.stringify(DEFAULT_CONFIG)), config);
  }
  
  /**
   * Deep merge two objects
   * @private
   * @param {Object} target - Target object
   * @param {Object} source - Source object
   * @returns {Object} Merged object
   */
  _deepMerge(target, source) {
    const output = { ...target };
    
    if (isObject(target) && isObject(source)) {
      Object.keys(source).forEach(key => {
        if (isObject(source[key])) {
          if (!(key in target)) {
            output[key] = source[key];
          } else {
            output[key] = this._deepMerge(target[key], source[key]);
          }
        } else {
          output[key] = source[key];
        }
      });
    }
    
    return output;
    
    function isObject(item) {
      return (item && typeof item === 'object' && !Array.isArray(item));
    }
  }
  
  /**
   * Validate configuration object against schema
   * @private
   * @param {Object} config - Configuration object
   * @param {Object} schema - Schema object
   * @param {string} path - Current validation path
   */
  _validateConfigObject(config, schema, path = '') {
    // Check for required properties
    Object.keys(schema).forEach(key => {
      const fieldSchema = schema[key];
      const currentPath = path ? `${path}.${key}` : key;
      
      // Check if property exists
      if (!(key in config)) {
        if (fieldSchema.required && fieldSchema.required.includes(key)) {
          throw new Error(`Missing required configuration property: ${currentPath}`);
        }
        return;
      }
      
      const value = config[key];
      
      // Check null constraint
      if (value === null && fieldSchema.nullable === false) {
        throw new Error(`Configuration property cannot be null: ${currentPath}`);
      }
      
      // Check type
      if (fieldSchema.type === 'object' && typeof value !== 'object') {
        throw new Error(`Configuration property must be an object: ${currentPath}`);
      }
      
      // Check required sub-properties for objects
      if (fieldSchema.type === 'object' && value !== null && fieldSchema.required) {
        fieldSchema.required.forEach(requiredKey => {
          if (!(requiredKey in value)) {
            throw new Error(`Missing required configuration property: ${currentPath}.${requiredKey}`);
          }
        });
      }
    });
  }
  
  /**
   * Validate specific field constraints
   * @private
   */
  _validateSpecificFields() {
    // Validate thresholds are in correct order
    const { high, medium, low } = this.config.matchingThresholds;
    
    if (high < medium) {
      throw new Error('matchingThresholds.high must be greater than or equal to matchingThresholds.medium');
    }
    
    if (medium < low) {
      throw new Error('matchingThresholds.medium must be greater than or equal to matchingThresholds.low');
    }
    
    // Validate thresholds are between 0 and 1
    if (high < 0 || high > 1) {
      throw new Error('matchingThresholds.high must be between 0 and 1');
    }
    
    if (medium < 0 || medium > 1) {
      throw new Error('matchingThresholds.medium must be between 0 and 1');
    }
    
    if (low < 0 || low > 1) {
      throw new Error('matchingThresholds.low must be between 0 and 1');
    }
    
    // Validate field weights are positive
    Object.entries(this.config.fieldWeights).forEach(([field, weight]) => {
      if (weight < 0) {
        throw new Error(`fieldWeights.${field} must be positive`);
      }
    });
    
    // Validate BigQuery timeout
    if (this.config.bigquery.timeoutMs <= 0) {
      throw new Error('bigquery.timeoutMs must be positive');
    }
    
    // Validate output directory
    const outputDir = this.config.testOutput.outputDir;
    if (!outputDir) {
      throw new Error('testOutput.outputDir must not be empty');
    }
  }
}

/**
 * Create a default configuration manager instance
 */
const defaultConfigManager = new ConfigManager();

module.exports = {
  DEFAULT_CONFIG,
  ConfigManager,
  defaultConfigManager
}; 