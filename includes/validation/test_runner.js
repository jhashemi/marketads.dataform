/**
 * Test Runner for Record Matching System
 * 
 * This module provides functionality to run validation tests in batch mode,
 * collect results, and generate performance metrics.
 */

const { ValidationEngine, createTestCase } = require('./validation_engine');
const { executeTestCase } = require('./test_executor');
const { generateComprehensiveTestSuite } = require('./test_generator');
const fs = require('fs');
const path = require('path');

/**
 * Configuration for test runner
 * @typedef {Object} TestRunnerConfig
 * @property {string} projectId - Google Cloud project ID
 * @property {string} datasetId - BigQuery dataset ID for temporary test tables
 * @property {Object} sourceSchema - Schema for source test tables
 * @property {Object} targetSchema - Schema for target test tables
 * @property {string} outputDir - Directory for test reports
 * @property {string} reportFormat - Format for test reports (html, sql, json)
 */

/**
 * Creates a new test runner
 * @param {TestRunnerConfig} config - Test runner configuration
 * @returns {Object} - Test runner instance
 */
function createTestRunner(config = {}) {
  const defaultConfig = {
    projectId: process.env.BIGQUERY_PROJECT_ID || 'default-project',
    datasetId: process.env.BIGQUERY_DATASET_ID || 'test_dataset',
    outputDir: './test_reports',
    reportFormat: 'html'
  };
  
  const mergedConfig = { ...defaultConfig, ...config };
  
  return {
    config: mergedConfig,
    validationEngine: new ValidationEngine(),
    testResults: {},
    
    /**
     * Adds a test case to the test runner
     * @param {Object} testCase - Test case to add
     */
    addTestCase(testCase) {
      this.validationEngine.addTestCase(testCase);
    },
    
    /**
     * Adds a batch of test cases to the test runner
     * @param {Array} testCases - Array of test cases to add
     */
    addTestCases(testCases) {
      for (const testCase of testCases) {
        this.addTestCase(testCase);
      }
    },
    
    /**
     * Adds standard test suite to the test runner
     */
    addStandardTestSuite() {
      this.addTestCases(generateComprehensiveTestSuite());
    },
    
    /**
     * Runs all tests with the specified matching function
     * @param {Function} matchingFunction - Function that generates matching SQL
     * @returns {Object} - Test results
     */
    async runTests(matchingFunction) {
      if (!matchingFunction) {
        throw new Error("Missing matching function");
      }
      
      console.log(`Running ${this.validationEngine.testCases.length} test cases...`);
      
      const results = await this.validationEngine.validateAll(matchingFunction);
      this.testResults = results;
      
      console.log("Test execution complete.");
      console.log(`Average precision: ${results.summary.averagePrecision.toFixed(2)}`);
      console.log(`Average recall: ${results.summary.averageRecall.toFixed(2)}`);
      console.log(`Average F1 score: ${results.summary.averageF1.toFixed(2)}`);
      
      return results;
    },
    
    /**
     * Generates a test report in the specified format
     * @param {string} format - Report format (html, sql, json)
     * @returns {string} - Path to the generated report
     */
    generateReport(format = null) {
      const reportFormat = format || this.config.reportFormat;
      
      if (Object.keys(this.testResults).length === 0) {
        throw new Error("No test results available. Run tests first.");
      }
      
      const reportContent = this.validationEngine.generateReport(reportFormat);
      
      if (!fs.existsSync(this.config.outputDir)) {
        fs.mkdirSync(this.config.outputDir, { recursive: true });
      }
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const reportFilename = `matching_test_report_${timestamp}.${reportFormat}`;
      const reportPath = path.join(this.config.outputDir, reportFilename);
      
      fs.writeFileSync(reportPath, reportContent);
      console.log(`Test report generated: ${reportPath}`);
      
      return reportPath;
    },
    
    /**
     * Runs a complete test cycle including standard tests and report generation
     * @param {Function} matchingFunction - Function that generates matching SQL
     * @returns {Object} - Test results
     */
    async runStandardTestCycle(matchingFunction) {
      this.addStandardTestSuite();
      await this.runTests(matchingFunction);
      this.generateReport();
      return this.testResults;
    }
  };
}

/**
 * Command-line test runner
 */
async function runCommandLineTests() {
  if (require.main === module) {
    // This file was run directly from the command line
    const args = process.argv.slice(2);
    const matchingFunctionPath = args[0];
    
    if (!matchingFunctionPath) {
      console.error("Error: Please provide the path to the matching function module.");
      process.exit(1);
    }
    
    try {
      const matchingFunction = require(path.resolve(matchingFunctionPath));
      const testRunner = createTestRunner({
        projectId: process.env.BIGQUERY_PROJECT_ID,
        datasetId: process.env.BIGQUERY_DATASET_ID,
        outputDir: process.env.TEST_OUTPUT_DIR || './test_reports'
      });
      
      await testRunner.runStandardTestCycle(matchingFunction);
    } catch (error) {
      console.error("Error running tests:", error);
      process.exit(1);
    }
  }
}

// Run command-line tests if this file is executed directly
runCommandLineTests();

module.exports = {
  createTestRunner
}; 