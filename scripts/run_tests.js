#!/usr/bin/env node

/**
 * Test Runner Script for Record Matching System
 * 
 * Executes validation tests based on command line arguments and generates reports.
 * 
 * Usage:
 *   node run_tests.js [options]
 * 
 * Options:
 *   --type TYPE      Run tests of specific type (unit, integration, performance, e2e)
 *   --tags TAG,TAG   Run tests with specific tags
 *   --priority N     Run tests with priority level N or higher
 *   --test TEST_ID   Run specific test by ID
 *   --parallel       Run tests in parallel (default)
 *   --sequential     Run tests sequentially
 *   --report         Generate test report
 *   --report-format  Report format (html, json, console)
 *   --output DIR     Output directory for reports
 *   --config FILE    Configuration file to use
 *   --help           Show help
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Import validation framework components
const { validationRegistry, TestType, TestStatus, TestPriority } = require('../includes/validation/validation_registry');
const { defaultConfigManager } = require('../includes/validation/config_manager');
const { ReportGenerator, ReportFormat } = require('../includes/validation/report_generator');
const { documentationManager } = require('../includes/validation/documentation_manager');
const errorHandler = require('../includes/validation/error_handler');

// Parse command line arguments
const args = parseArguments(process.argv.slice(2));

// Main function
async function main() {
  try {
    console.log('\n=== Record Matching System Test Runner ===\n');
    
    // Load configuration if specified
    if (args.config) {
      await loadConfiguration(args.config);
    }
    
    // Initialize components
    await initializeFramework();
    
    // Display test plan
    const testPlan = createTestPlan();
    displayTestPlan(testPlan);
    
    // Run tests
    console.log('\nRunning tests...\n');
    const startTime = Date.now();
    const results = await runTests(testPlan);
    const endTime = Date.now();
    
    // Display summary
    const summary = validationRegistry.getTestSummary();
    summary.duration = endTime - startTime;
    displaySummary(summary);
    
    // Generate report if requested
    if (args.report) {
      await generateReport(results, summary);
    }
    
    // Return exit code based on test results
    return summary.failed > 0 ? 1 : 0;
    
  } catch (error) {
    console.error('\n❌ Error running tests:');
    console.error(error.message);
    
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    
    return 1;
  }
}

/**
 * Parse command line arguments
 * @param {Array<string>} args - Command line arguments
 * @returns {Object} Parsed arguments
 */
function parseArguments(args) {
  const result = {
    type: null,
    tags: [],
    priority: null,
    testId: null,
    parallel: true,
    report: false,
    reportFormat: ReportFormat.HTML,
    outputDir: './test_reports',
    config: null,
    help: false
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--type':
        result.type = args[++i];
        break;
      case '--tags':
        result.tags = args[++i].split(',');
        break;
      case '--priority':
        result.priority = parseInt(args[++i], 10);
        break;
      case '--test':
        result.testId = args[++i];
        break;
      case '--parallel':
        result.parallel = true;
        break;
      case '--sequential':
        result.parallel = false;
        break;
      case '--report':
        result.report = true;
        break;
      case '--report-format':
        result.reportFormat = args[++i];
        break;
      case '--output':
        result.outputDir = args[++i];
        break;
      case '--config':
        result.config = args[++i];
        break;
      case '--help':
        result.help = true;
        break;
      default:
        if (arg.startsWith('--')) {
          console.warn(`Unknown argument: ${arg}`);
        }
    }
  }
  
  // Show help and exit if requested
  if (result.help) {
    showHelp();
    process.exit(0);
  }
  
  return result;
}

/**
 * Display help message
 */
function showHelp() {
  console.log(`
Test Runner for Record Matching System

Usage:
  node run_tests.js [options]

Options:
  --type TYPE        Run tests of specific type (unit, integration, performance, e2e)
  --tags TAG,TAG     Run tests with specific tags
  --priority N       Run tests with priority level N or higher
  --test TEST_ID     Run specific test by ID
  --parallel         Run tests in parallel (default)
  --sequential       Run tests sequentially
  --report           Generate test report
  --report-format    Report format (html, json, console)
  --output DIR       Output directory for reports
  --config FILE      Configuration file to use
  --help             Show this help message
  
Examples:
  # Run all unit tests
  node run_tests.js --type unit
  
  # Run tests with specific tags
  node run_tests.js --tags matching,name
  
  # Run high priority tests only
  node run_tests.js --priority 1
  
  # Run tests and generate a report
  node run_tests.js --report --output ./reports
  `);
}

/**
 * Load configuration from file
 * @param {string} configFile - Path to configuration file
 */
async function loadConfiguration(configFile) {
  console.log(`Loading configuration from ${configFile}...`);
  await defaultConfigManager.loadFromFile(configFile);
  console.log('Configuration loaded successfully.\n');
}

/**
 * Initialize the validation framework
 */
async function initializeFramework() {
  console.log('Initializing validation framework...');
  
  // Initialize validation registry with test directory
  await validationRegistry.initialize('./tests');
  
  // Initialize documentation manager
  await documentationManager.initialize('./docs');
  
  console.log('Validation framework initialized successfully.\n');
}

/**
 * Create test plan based on command line arguments
 * @returns {Object} Test plan
 */
function createTestPlan() {
  const filters = {};
  
  // Add filters based on command line arguments
  if (args.type) {
    filters.type = args.type;
  }
  
  if (args.tags && args.tags.length > 0) {
    filters.tags = args.tags;
  }
  
  if (args.priority) {
    filters.priority = args.priority;
  }
  
  // Get tests based on filters
  let testsToRun = [];
  
  if (args.testId) {
    // Run specific test
    const test = validationRegistry.getTest(args.testId);
    
    if (test) {
      testsToRun = [test];
    } else {
      throw new Error(`Test not found: ${args.testId}`);
    }
  } else {
    // Run tests based on filters
    testsToRun = validationRegistry.getAllTests(filters);
  }
  
  return {
    tests: testsToRun,
    totalTests: testsToRun.length,
    filters,
    parallel: args.parallel
  };
}

/**
 * Display test plan
 * @param {Object} testPlan - Test plan
 */
function displayTestPlan(testPlan) {
  console.log(`Test Plan:`);
  console.log(`- Total tests: ${testPlan.totalTests}`);
  
  if (testPlan.filters.type) {
    console.log(`- Type: ${testPlan.filters.type}`);
  }
  
  if (testPlan.filters.tags && testPlan.filters.tags.length > 0) {
    console.log(`- Tags: ${testPlan.filters.tags.join(', ')}`);
  }
  
  if (testPlan.filters.priority) {
    console.log(`- Priority: ${testPlan.filters.priority}`);
  }
  
  console.log(`- Execution mode: ${testPlan.parallel ? 'Parallel' : 'Sequential'}`);
  
  // Display test breakdown by type
  const testsByType = {};
  
  testPlan.tests.forEach(test => {
    if (!testsByType[test.type]) {
      testsByType[test.type] = 0;
    }
    
    testsByType[test.type]++;
  });
  
  console.log('\nTest breakdown by type:');
  
  Object.entries(testsByType).forEach(([type, count]) => {
    console.log(`- ${type}: ${count} tests`);
  });
}

/**
 * Run tests according to test plan
 * @param {Object} testPlan - Test plan
 * @returns {Array<Object>} Test results
 */
async function runTests(testPlan) {
  // Set execution options
  const options = {
    parallelExecution: testPlan.parallel,
    maxParallel: defaultConfigManager.get('testExecution.maxParallelTests', 5),
    context: {
      config: defaultConfigManager.getConfig(),
      commandLineArgs: args
    }
  };
  
  // Run tests
  return await validationRegistry.runTests({
    testIds: testPlan.tests.map(test => test.id),
    ...options
  });
}

/**
 * Display test summary
 * @param {Object} summary - Test summary
 */
function displaySummary(summary) {
  console.log('\n=== Test Results Summary ===');
  console.log(`Total tests:     ${summary.total}`);
  console.log(`Executed:        ${summary.executed}`);
  console.log(`Passed:          ${summary.passed}`);
  console.log(`Failed:          ${summary.failed}`);
  console.log(`Execution Time:  ${(summary.duration / 1000).toFixed(2)}s`);
  console.log(`Coverage:        ${summary.coverage.percentage}%`);
  
  // Display failed tests if any
  const failedResults = validationRegistry.getAllTestResults({ passed: false });
  
  if (failedResults.length > 0) {
    console.log('\nFailed Tests:');
    
    failedResults.forEach(result => {
      console.log(`- ${result.name}`);
      
      if (result.error) {
        console.log(`  Error: ${result.error.message}`);
      }
    });
  }
}

/**
 * Generate test report
 * @param {Array<Object>} results - Test results
 * @param {Object} summary - Test summary
 */
async function generateReport(results, summary) {
  console.log('\nGenerating test report...');
  
  // Create report generator
  const reportGenerator = new ReportGenerator({
    outputDir: args.outputDir
  });
  
  // Generate report
  const reportPath = await reportGenerator.generateReport(
    results,
    summary,
    args.reportFormat,
    'test_report'
  );
  
  // Generate summary file
  await reportGenerator.generateSummaryFile(summary);
  
  // Generate performance visualization if there are performance tests
  const performanceResults = results.filter(result => result.type === TestType.PERFORMANCE);
  
  if (performanceResults.length > 0) {
    await reportGenerator.generatePerformanceVisualization(performanceResults);
  }
  
  console.log(`Test report generated: ${reportPath}`);
}

// Run main function and exit with appropriate code
main().then(
  exitCode => {
    process.exit(exitCode);
  },
  error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  }
); 