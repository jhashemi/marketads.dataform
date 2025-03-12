/**
 * Jest Setup File
 * 
 * This file contains setup code that runs before each test.
 * It helps solve console type errors and other integration issues.
 */

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