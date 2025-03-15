/**
 * @fileoverview Test Runner for Error Handling Tests
 * 
 * This script runs the error handling tests and displays the results.
 */

const { tests: errorTypeTests } = require('./error_types_test');
const { tests: errorHandlerTests } = require('./error_handler_test');
const { tests: validationErrorTests } = require('../validation/validation_error_test');

async function runTests(testSuite, suiteName) {
  console.log(`\n=== Running ${suiteName} Tests ===\n`);
  
  let passed = 0;
  let failed = 0;
  
  // Save original console methods
  const originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info
  };
  
  for (const test of testSuite) {
    process.stdout.write(`Running test: ${test.name}... `);
    
    try {
      // Suppress console output during test
      console.log = () => {};
      console.error = () => {};
      console.warn = () => {};
      console.info = () => {};
      
      const result = await test.testFn();
      
      // Restore console
      console.log = originalConsole.log;
      console.error = originalConsole.error;
      console.warn = originalConsole.warn;
      console.info = originalConsole.info;
      
      if (result) {
        passed++;
        console.log('PASSED');
      } else {
        failed++;
        console.log('FAILED');
      }
    } catch (error) {
      // Restore console
      console.log = originalConsole.log;
      console.error = originalConsole.error;
      console.warn = originalConsole.warn;
      console.info = originalConsole.info;
      
      failed++;
      console.log(`FAILED with error: ${error.message}`);
    }
  }
  
  console.log(`\n${suiteName} Results: ${passed} passed, ${failed} failed\n`);
  
  return { passed, failed };
}

async function main() {
  console.log('\n=== Error Handling Test Suite ===\n');
  
  const results = {
    errorTypes: await runTests(errorTypeTests, 'Error Types'),
    errorHandler: await runTests(errorHandlerTests, 'Error Handler'),
    validationError: await runTests(validationErrorTests, 'Validation Error')
  };
  
  const totalPassed = Object.values(results).reduce((sum, result) => sum + result.passed, 0);
  const totalFailed = Object.values(results).reduce((sum, result) => sum + result.failed, 0);
  
  console.log('\n=== Overall Results ===\n');
  console.log(`Error Types: ${results.errorTypes.passed} passed, ${results.errorTypes.failed} failed`);
  console.log(`Error Handler: ${results.errorHandler.passed} passed, ${results.errorHandler.failed} failed`);
  console.log(`Validation Error: ${results.validationError.passed} passed, ${results.validationError.failed} failed`);
  console.log(`\nTotal: ${totalPassed} passed, ${totalFailed} failed\n`);
  
  if (totalFailed > 0) {
    console.log('Some tests failed!');
    process.exit(1);
  } else {
    console.log('All tests passed!');
    process.exit(0);
  }
}

// Run the tests
main().catch(error => {
  console.error('Error running tests:', error);
  process.exit(1);
}); 