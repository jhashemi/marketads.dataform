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
const { ValidationRegistry, TestType, TestStatus, TestPriority } = require('../includes/validation/validation_registry');
const { defaultConfigManager } = require('../includes/validation/config_manager');
const { ReportGenerator, ReportFormat } = require('../includes/validation/report_generator');
const documentationManager = require('../includes/validation/documentation_manager');
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
    const registry = initializeFramework();
    
    // Display test plan
    const testPlan = createTestPlan(registry, args);
    displayTestPlan(testPlan);
    
    // Run tests
    console.log('\nRunning tests...\n');
    const startTime = new Date();
    const results = await runTests(registry, testPlan);
    
    // Display summary
    await displaySummary(results, startTime, registry);
    
    // Generate report if requested
    if (args.report) {
      const testSummary = {
        total: registry.tests.length,
        executed: results.length,
        passed: results.filter(r => r.status === 'passed').length,
        failed: results.filter(r => r.status === 'failed').length,
        duration: (new Date() - startTime),
        coverage: {
          percentage: Math.round((results.filter(r => r.status === 'passed').length / registry.tests.length) * 100)
        },
        byType: {}
      };
      
      await generateReport(results, testSummary);
    }
    
    // Return exit code based on test results
    return results.some(result => result.status === 'failed') ? 1 : 0;
    
  } catch (error) {
    console.error(`\n❌ Error running tests:\n${error.message}`);
    console.error('\nStack trace:');
    console.error(error);
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
 * Initializes the validation framework
 * @returns {ValidationRegistry} Initialized validation registry
 */
function initializeFramework() {
  console.log('Initializing validation framework...');
  const registry = new ValidationRegistry();
  
  // Ensure proper class handling for factory pattern
  ensureClassBasedFactoryPattern();
  
  // Scan for test files
  scanTestFiles(registry, './tests/unit');
  scanTestFiles(registry, './tests/integration');
  scanTestFiles(registry, './tests/performance');
  scanTestFiles(registry, './tests/functional');
  scanTestFiles(registry, './tests/component');
  scanTestFiles(registry, './tests/system');
  
  // Explicitly mark as initialized
  registry.initialized = true;
  
  console.log('Validation framework initialized successfully.\n');
  return registry;
}

/**
 * Ensures proper class-based factory pattern setup in the global scope
 * This helps tests use the class-based pattern correctly
 */
function ensureClassBasedFactoryPattern() {
  try {
    // Import all core components from the main index
    const {
      // Core Classes
      MatchingSystem,
      HistoricalMatcher,
      TransitiveMatcher,
      
      // Factory Classes
      MatchingSystemFactory,
      HistoricalMatcherFactory,
      MatchStrategyFactory,
      TransitiveMatcherFactory,
      
      // Factory instances
      matchingSystemFactory,
      historicalMatcherFactory,
      matchStrategyFactory,
      transitiveMatcherFactory
    } = require('../includes');
    
    // Create global factory instances if they haven't been imported
    global.matchStrategyFactory = matchStrategyFactory || new MatchStrategyFactory();
    global.matchingSystemFactory = matchingSystemFactory || new MatchingSystemFactory();
    global.historicalMatcherFactory = historicalMatcherFactory || new HistoricalMatcherFactory();
    global.transitiveMatcherFactory = transitiveMatcherFactory || new TransitiveMatcherFactory();
    
    // Make classes globally available for tests
    global.MatchingSystem = MatchingSystem;
    global.HistoricalMatcher = HistoricalMatcher;
    global.TransitiveMatcher = TransitiveMatcher;
    
    // Make factory classes available globally
    global.MatchingSystemFactory = MatchingSystemFactory;
    global.HistoricalMatcherFactory = HistoricalMatcherFactory;
    global.MatchStrategyFactory = MatchStrategyFactory;
    global.TransitiveMatcherFactory = TransitiveMatcherFactory;
    
    console.log('Class-based factory pattern initialized successfully.');
  } catch (error) {
    console.warn('Warning: Unable to set up global class-based factory pattern:', error.message);
    console.warn('Stack trace:', error.stack);
  }
}

/**
 * Create test plan
 * @param {ValidationRegistry} registry - Validation registry
 * @param {Object} args - Command line arguments
 * @returns {Object} Test plan
 */
function createTestPlan(registry, args) {
  const allTests = registry.getAllTests();
  let tests = [];
  
  // Filter tests by type
  if (args.type) {
    tests = allTests.filter(test => test.type.toLowerCase() === args.type.toLowerCase());
  } else {
    tests = [...allTests];
  }
  
  // Filter tests by test ID
  if (args.test) {
    // Support partial matching for test IDs
    const testPattern = args.test.toLowerCase();
    const matchingTests = tests.filter(test => 
      test.id.toLowerCase().includes(testPattern)
    );
    
    if (matchingTests.length === 0) {
      throw new Error(`Test not found: ${args.test}`);
    }
    
    tests = matchingTests;
  }
  
  // Filter tests by priority
  if (args.priority) {
    tests = tests.filter(test => test.priority.toLowerCase() === args.priority.toLowerCase());
  }
  
  // Create test plan
  return {
    tests,
    parallel: args.parallel,
    type: args.type
  };
}

/**
 * Display test plan
 * @param {Object} testPlan - Test plan
 */
function displayTestPlan(testPlan) {
  console.log(`Test Plan:`);
  console.log(`- Total tests: ${testPlan.tests.length}`);
  
  if (testPlan.type) {
    console.log(`- Type: ${testPlan.type}`);
  }
  
  console.log(`- Execution mode: ${testPlan.parallel ? 'Parallel' : 'Sequential'}`);
  
  // Display test breakdown by type
  const testsByType = {};
  
  testPlan.tests.forEach(test => {
    const type = test.type.toLowerCase();
    testsByType[type] = (testsByType[type] || 0) + 1;
  });
  
  if (Object.keys(testsByType).length > 0) {
    console.log(`\nTest breakdown by type:`);
    
    for (const type in testsByType) {
      console.log(`- ${type}: ${testsByType[type]} tests`);
    }
  }
  
  console.log('');
}

/**
 * Run tests according to test plan
 * @param {ValidationRegistry} registry - Validation registry
 * @param {Object} testPlan - Test plan
 * @returns {Array<Object>} Test results
 */
async function runTests(registry, testPlan) {
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
  return await registry.runTests({
    testIds: testPlan.tests.map(test => test.id),
    ...options
  });
}

/**
 * Display test summary
 * @param {Array<Object>} testResults - Test results
 * @param {number} startTime - Test start time
 * @param {ValidationRegistry} validationRegistry - Validation registry
 */
async function displaySummary(testResults, startTime, validationRegistry) {
  const endTime = new Date();
  const executionTime = (endTime - startTime) / 1000;
  
  const totalTests = validationRegistry.getAllTests().length;
  const executedTests = testResults.length;
  const passedTests = testResults.filter(result => result.status === 'passed').length;
  const failedTests = testResults.filter(result => result.status === 'failed').length;
  
  // Calculate coverage
  const coverage = Math.round((executedTests / totalTests) * 100);
  
  console.log('\n=== Test Results Summary ===');
  console.log(`Total tests:     ${totalTests}`);
  console.log(`Executed:        ${executedTests}`);
  console.log(`Passed:          ${passedTests}`);
  console.log(`Failed:          ${failedTests}`);
  console.log(`Execution Time:  ${executionTime.toFixed(2)}s`);
  console.log(`Coverage:        ${coverage}%`);
  
  // Display failed tests
  const failedTestResults = testResults.filter(result => result.status === 'failed');
  if (failedTestResults.length > 0) {
    console.log('\nFailed Tests:');
    failedTestResults.forEach(result => {
      console.log(`- ${result.name}: ${result.error}`);
    });
  }
}

/**
 * Generate test report
 * @param {Array<Object>} results - Test results
 * @param {Object} validationRegistry - Validation registry or test summary
 */
async function generateReport(results, validationRegistry) {
  console.log('\nGenerating test report...');
  
  // Create report generator
  const reportGenerator = new ReportGenerator();
  
  // Check if we received a validation registry or a test summary
  const summary = typeof validationRegistry.getTestSummary === 'function' 
    ? validationRegistry.getTestSummary() 
    : validationRegistry;
  
  // Generate report
  const reportPath = await reportGenerator.generateReport(
    results,
    {
      total: summary.total || results.length,
      executed: results.length,
      passed: results.filter(r => r.status === 'passed').length,
      failed: results.filter(r => r.status === 'failed').length
    },
    args.reportFormat,
    'test_report'
  );
  
  // Generate summary file
  await reportGenerator.generateSummaryFile({
    total: summary.total || results.length,
    executed: results.length,
    passed: results.filter(r => r.status === 'passed').length,
    failed: results.filter(r => r.status === 'failed').length
  });
  
  // Generate performance visualization if there are performance tests
  const performanceTests = results.filter(result => result.type === TestType.PERFORMANCE);
  
  if (performanceTests.length > 0) {
    await reportGenerator.generatePerformanceVisualization(performanceTests);
  }
  
  console.log(`Report generated: ${reportPath}`);
}

/**
 * Scans a directory for test files and registers them with the validation registry
 * @param {ValidationRegistry} registry - Validation registry
 * @param {string} directory - Directory to scan
 */
function scanTestFiles(registry, directory) {
  if (!fs.existsSync(directory)) {
    console.warn(`Warning: Directory does not exist: ${directory}`);
    return;
  }
  
  console.log(`Scanning for test files in directory: ${directory}`);
  
  // Find all JavaScript files in the directory
  const files = fs.readdirSync(directory)
    .filter(file => file.endsWith('.js'))
    .map(file => path.resolve(directory, file));
  
  console.log(`Found ${files.length} test files.`);
  
  // Load and register each test file
  let registeredTests = 0;
  
  for (const file of files) {
    try {
      console.log(`Loading test file: ${file}`);
      
      // Clear require cache to ensure fresh load
      delete require.cache[file];
      
      // Load the test file
      const testModule = require(file);
      
      // Check if the module exports tests
      if (testModule.tests && Array.isArray(testModule.tests)) {
        // Register each test
        for (const test of testModule.tests) {
          try {
            registry.registerTest(test);
            registeredTests++;
          } catch (error) {
            console.warn(`  Warning: Failed to register test ${test.id}: ${error.message}`);
          }
        }
      } else {
        console.log(`No tests found in file: ${file}`);
      }
    } catch (error) {
      console.warn(`  Warning: Failed to load test file ${file}: ${error.message}`);
    }
  }
  
  console.log(`Registered ${registeredTests} tests.`);
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