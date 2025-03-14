/**
 * Jest setup file for Record Matching System
 * 
 * This file sets up the Jest environment with global functions and mocks
 * needed for the tests to run properly.
 */

// Mock the validation registry if it's not available
jest.mock('./includes/validation/validation_registry', () => {
  return {
    TestType: {
      UNIT: 'unit',
      INTEGRATION: 'integration',
      PERFORMANCE: 'performance',
      E2E: 'e2e'
    },
    TestStatus: {
      PENDING: 'pending',
      RUNNING: 'running',
      PASSED: 'passed',
      FAILED: 'failed',
      SKIPPED: 'skipped',
      ERROR: 'error'
    },
    TestPriority: {
      HIGH: 1,
      MEDIUM: 2,
      LOW: 3
    },
    validationRegistry: {
      registerTest: jest.fn(),
      unregisterTest: jest.fn(),
      getTest: jest.fn(),
      getAllTests: jest.fn(),
      getTestResult: jest.fn(),
      getAllTestResults: jest.fn(),
      getTestSummary: jest.fn(),
      runTests: jest.fn(),
      runTest: jest.fn(),
      scanTestFiles: jest.fn(),
      sortTestsByDependency: jest.fn()
    }
  };
}, { virtual: true });

// Global expect function for compatibility with both test systems
global.expect = global.expect || require('expect');

// Global beforeAll hook
beforeAll(() => {
  console.log('Starting Record Matching System tests...');
});

// Global afterAll hook
afterAll(() => {
  console.log('Completed Record Matching System tests.');
});

// Fix for "TypeError: console.X is not a function" errors
// This can happen when the test environment and runtime environment 
// have mismatched console implementations
const originalConsole = global.console;

global.console = {
  log: jest.fn(originalConsole.log),
  error: jest.fn(originalConsole.error),
  warn: jest.fn(originalConsole.warn),
  info: jest.fn(originalConsole.info),
  debug: jest.fn(originalConsole.debug),
  
  // Pass through other console methods
  ...originalConsole
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
}); 