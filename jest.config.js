/**
 * Jest configuration for Record Matching System
 * 
 * This configuration enables Jest to run both traditional Jest tests
 * and tests designed for the custom test runner.
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // Test match patterns
  testMatch: [
    '**/tests/**/*.js',
    '!**/node_modules/**'
  ],
  
  // Module file extensions
  moduleFileExtensions: ['js', 'json', 'node'],
  
  // Setup files
  setupFilesAfterEnv: ['./jest.setup.js'],
  
  // Coverage configuration
  collectCoverageFrom: [
    'includes/**/*.js',
    '!**/node_modules/**'
  ],
  
  // Coverage directory
  coverageDirectory: 'coverage',
  
  // Reporters
  reporters: [
    'default',
    ['jest-html-reporter', {
      pageTitle: 'Record Matching System Test Report',
      outputPath: './test-report.html',
      includeFailureMsg: true
    }]
  ],
  
  // Verbose output
  verbose: true
};
