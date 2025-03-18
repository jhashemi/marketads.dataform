/**
 * Test configuration settings for Dataform project
 * Contains environment-specific settings for test execution
 */
module.exports = {
  // Schema where test tables will be created
  testSchema: "marketads_test",
  
  // Test timeout in seconds
  testTimeout: 120,
  
  // Whether to validate test results
  validateResults: true,
  
  // Test data generation configuration
  testData: {
    // Number of sample rows to generate for tests
    sampleSize: 100,
    
    // Default seed for random data generation (for reproducibility)
    seed: 42
  },
  
  // Error threshold settings
  errorThresholds: {
    // Maximum allowed mapping accuracy deviation
    mappingAccuracyThreshold: 0.95,
    
    // Maximum allowed processing error rate
    maxErrorRate: 0.01
  }
}; 