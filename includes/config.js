/**
 * Centralized Configuration
 * 
 * This module provides a single source of truth for all configuration parameters
 * used throughout the matching system. This makes it easier to adjust parameters
 * without having to modify multiple files.
 */

// Import dataform core functionality to access project variables
const { projectConfig } = require("dataform");

// Get environment configuration
const getEnvironment = () => projectConfig.vars.environment || "development";

// Get configuration from project variables with defaults
const getConfigValue = (key, defaultValue) => {
  const prefix = "config_";
  return projectConfig.vars[prefix + key] !== undefined ? 
    projectConfig.vars[prefix + key] : defaultValue;
};

// Matching confidence thresholds
const CONFIDENCE = {
  HIGH: getConfigValue("confidence_high", 0.90),
  MEDIUM: getConfigValue("confidence_medium", 0.75),
  LOW: getConfigValue("confidence_low", 0.60),
  MINIMUM: getConfigValue("confidence_minimum", 0.50)
};

// Field weights for composite scoring
const FIELD_WEIGHTS = {
  // Person identifiers
  email: getConfigValue("weight_email", 0.95),
  phoneNumber: getConfigValue("weight_phoneNumber", 0.90),
  fullName: getConfigValue("weight_fullName", 0.85),
  firstName: getConfigValue("weight_firstName", 0.60),
  lastName: getConfigValue("weight_lastName", 0.70),
  dateOfBirth: getConfigValue("weight_dateOfBirth", 0.85),
  ssn: getConfigValue("weight_ssn", 0.95),
  
  // Address components
  address: getConfigValue("weight_address", 0.80),
  addressLine1: getConfigValue("weight_addressLine1", 0.75),
  zipCode: getConfigValue("weight_zipCode", 0.65),
  city: getConfigValue("weight_city", 0.50),
  state: getConfigValue("weight_state", 0.40),
  
  // Other identifiers
  deviceId: getConfigValue("weight_deviceId", 0.70),
  userId: getConfigValue("weight_userId", 0.85)
};

// Blocking strategies configuration
const BLOCKING = {
  STRATEGIES: getConfigValue("blocking_strategies", [
    'zipLast3',              // Zip + first 3 chars of last name
    'zipSoundexLastName',    // Zip + soundex of last name
    'stateLast3First3',      // State + first 3 chars of last name + first 3 chars of first name
    'zipStreet5',            // Zip + first 5 chars of street name
    'last3SoundexFirstCity'  // First 3 chars of last name + soundex of first name + city
  ]),
  MAX_BLOCK_SIZE: getConfigValue("max_block_size", 1000),
  ENABLE_PROGRESSIVE: getConfigValue("enable_progressive_blocking", true)
};

// Target metrics
const TARGETS = {
  MATCH_RATE: getConfigValue("target_match_rate", 0.80),
  DOB_APPEND_RATE: getConfigValue("target_dob_append_rate", 0.65),
  PRECISION: getConfigValue("target_precision", 0.95)
};

// Load historical datasets dynamically from project config when available
const getHistoricalDatasets = () => {
  const configDatasets = projectConfig.vars.historical_datasets;
  if (configDatasets && Array.isArray(configDatasets)) {
    return configDatasets;
  }
  
  // Default datasets if not configured in project variables
  return [
    // Gold/normalized datasets (highest quality)
    { table: `${ref("trustfinancial.consumer2022q4_voter_gold")}`, quality: 0.95, weightMultiplier: 1.0 },
    { table: `${ref("trustfinancial.consumer2022_q2_gold")}`, quality: 0.93, weightMultiplier: 1.0 },
    { table: `${ref("trustfinancial.consumer2022q4_voter_normalized")}`, quality: 0.90, weightMultiplier: 0.98 },
    
    // Regular datasets in reverse chronological order
    { table: `${ref("trustfinancial.ConsumerQ1_2023")}`, quality: 0.92, weightMultiplier: 0.97 },
    { table: `${ref("trustfinancial.consumer2022_q4")}`, quality: 0.88, weightMultiplier: 0.95 },
    { table: `${ref("trustfinancial.consumer2022q4_voter")}`, quality: 0.87, weightMultiplier: 0.94 },
    { table: `${ref("trustfinancial.Consumer2022_q2")}`, quality: 0.85, weightMultiplier: 0.92 },
    { table: `${ref("trustfinancial.Consumer2022q2")}`, quality: 0.85, weightMultiplier: 0.92 },
    { table: `${ref("trustfinancial.consumer2021q3_2")}`, quality: 0.83, weightMultiplier: 0.90 },
    { table: `${ref("trustfinancial.consumer2021q3")}`, quality: 0.83, weightMultiplier: 0.90 },
    { table: `${ref("trustfinancial.Consumer_2021_q3")}`, quality: 0.83, weightMultiplier: 0.90 },
    { table: `${ref("trustfinancial.Consumer_2021_Q1_final")}`, quality: 0.80, weightMultiplier: 0.88 },
    { table: `${ref("trustfinancial.Consumer_2021_Q1_fix")}`, quality: 0.80, weightMultiplier: 0.88 },
    { table: `${ref("trustfinancial.Consumer_Q4_fix")}`, quality: 0.78, weightMultiplier: 0.86 },
    { table: `${ref("trustfinancial.Consumer_Q4")}`, quality: 0.75, weightMultiplier: 0.85 }
  ];
};

// Environment-specific configurations
const ENVIRONMENTS = {
  development: {
    maxRowsPerRun: getConfigValue("dev_max_rows", 10000),
    enableHistoricalMatching: getConfigValue("dev_enable_historical", false),
    enableLogging: getConfigValue("dev_enable_logging", true)
  },
  staging: {
    maxRowsPerRun: getConfigValue("staging_max_rows", 100000),
    enableHistoricalMatching: getConfigValue("staging_enable_historical", true),
    enableLogging: getConfigValue("staging_enable_logging", true)
  },
  production: {
    maxRowsPerRun: getConfigValue("prod_max_rows", null), // No limit
    enableHistoricalMatching: getConfigValue("prod_enable_historical", true),
    enableLogging: getConfigValue("prod_enable_logging", false)
  }
};

// Export all configuration objects
module.exports = {
  CONFIDENCE,
  FIELD_WEIGHTS,
  BLOCKING,
  TARGETS,
  getHistoricalDatasets,
  ENVIRONMENTS,
  
  // Helper function to get environment-specific config
  getEnvironmentConfig: function() {
    const env = getEnvironment();
    return ENVIRONMENTS[env] || ENVIRONMENTS.development;
  }
}; 