/**
 * Centralized Configuration
 * 
 * This module provides a single source of truth for all configuration parameters
 * used throughout the matching system. This makes it easier to adjust parameters
 * without having to modify multiple files.
 */

// Matching confidence thresholds
const CONFIDENCE = {
  HIGH: 0.90,    // High confidence match (auto-accept)
  MEDIUM: 0.75,  // Medium confidence (accept with additional evidence)
  LOW: 0.60,     // Low confidence (require strong supporting evidence)
  MINIMUM: 0.50  // Minimum threshold to consider a potential match
};

// Field weights for composite scoring
const FIELD_WEIGHTS = {
  // Person identifiers
  email: 0.95,
  phoneNumber: 0.90,
  fullName: 0.85,
  firstName: 0.60,
  lastName: 0.70,
  dateOfBirth: 0.85,
  ssn: 0.95,
  
  // Address components
  address: 0.80,
  addressLine1: 0.75,
  zipCode: 0.65,
  city: 0.50,
  state: 0.40,
  
  // Other identifiers
  deviceId: 0.70,
  userId: 0.85
};

// Blocking strategies configuration
const BLOCKING = {
  STRATEGIES: [
    'zipLast3',              // Zip + first 3 chars of last name
    'zipSoundexLastName',    // Zip + soundex of last name
    'stateLast3First3',      // State + first 3 chars of last name + first 3 chars of first name
    'zipStreet5',            // Zip + first 5 chars of street name
    'last3SoundexFirstCity'  // First 3 chars of last name + soundex of first name + city
  ],
  MAX_BLOCK_SIZE: 1000,      // Maximum comparisons per block
  ENABLE_PROGRESSIVE: true   // Enable progressive blocking
};

// Target metrics
const TARGETS = {
  MATCH_RATE: 0.80,          // Overall match rate target
  DOB_APPEND_RATE: 0.65,     // Date of birth append rate target (primary KPI)
  PRECISION: 0.95            // Precision target (true positives / all positives)
};

// Historical datasets in priority order
const HISTORICAL_DATASETS = [
  // Gold/normalized datasets (highest quality)
  { table: "trustfinancial.consumer2022q4_voter_gold", quality: 0.95, weightMultiplier: 1.0 },
  { table: "trustfinancial.consumer2022_q2_gold", quality: 0.93, weightMultiplier: 1.0 },
  { table: "trustfinancial.consumer2022q4_voter_normalized", quality: 0.90, weightMultiplier: 0.98 },
  
  // Regular datasets in reverse chronological order
  { table: "trustfinancial.ConsumerQ1_2023", quality: 0.92, weightMultiplier: 0.97 },
  { table: "trustfinancial.consumer2022_q4", quality: 0.88, weightMultiplier: 0.95 },
  { table: "trustfinancial.consumer2022q4_voter", quality: 0.87, weightMultiplier: 0.94 },
  { table: "trustfinancial.Consumer2022_q2", quality: 0.85, weightMultiplier: 0.92 },
  { table: "trustfinancial.Consumer2022q2", quality: 0.85, weightMultiplier: 0.92 },
  { table: "trustfinancial.consumer2021q3_2", quality: 0.83, weightMultiplier: 0.90 },
  { table: "trustfinancial.consumer2021q3", quality: 0.83, weightMultiplier: 0.90 },
  { table: "trustfinancial.Consumer_2021_q3", quality: 0.83, weightMultiplier: 0.90 },
  { table: "trustfinancial.Consumer_2021_Q1_final", quality: 0.80, weightMultiplier: 0.88 },
  { table: "trustfinancial.Consumer_2021_Q1_fix", quality: 0.80, weightMultiplier: 0.88 },
  { table: "trustfinancial.Consumer_Q4_fix", quality: 0.78, weightMultiplier: 0.86 },
  { table: "trustfinancial.Consumer_Q4", quality: 0.75, weightMultiplier: 0.85 }
];

// Environment-specific configurations
const ENVIRONMENTS = {
  development: {
    maxRowsPerRun: 10000,
    enableHistoricalMatching: false,
    enableLogging: true
  },
  staging: {
    maxRowsPerRun: 100000,
    enableHistoricalMatching: true,
    enableLogging: true
  },
  production: {
    maxRowsPerRun: null, // No limit
    enableHistoricalMatching: true,
    enableLogging: false
  }
};

// Export all configuration objects
module.exports = {
  CONFIDENCE,
  FIELD_WEIGHTS,
  BLOCKING,
  TARGETS,
  HISTORICAL_DATASETS,
  ENVIRONMENTS,
  
  // Helper function to get environment-specific config
  getEnvironmentConfig: function() {
    const env = process.env.DATAFORM_ENVIRONMENT || "development";
    return ENVIRONMENTS[env] || ENVIRONMENTS.development;
  }
}; 