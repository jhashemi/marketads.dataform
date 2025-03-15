/**
 * @fileoverview Tests for Error Logger
 * 
 * This file contains tests for the error logging functionality.
 */

const assert = require('assert');
const { ErrorLogger, LOG_LEVELS } = require('../../logging/error_logger');
const { 
  MarketAdsError, 
  ValidationError, 
  SystemError
} = require('../../errors/error_types');

/**
 * Test suite for ErrorLogger
 */
const tests = [
  {
    id: 'error_logger_basic',
    name: 'Error Logger - Basic Functionality',
    type: 'unit',
    tags: ['error_handling', 'logging'],
    priority: 1,
    testFn: async () => {
      // Create a mock output function to capture logs
      const logs = [];
      const mockOutput = (log) => {
        logs.push(log);
      };
      
      // Create an error logger with the mock output
      const logger = new ErrorLogger({
        outputFn: mockOutput,
        logLevel: 'DEBUG'
      });
      
      // Log messages at different levels
      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warning message');
      logger.error('Error message');
      logger.critical('Critical message');
      
      // Verify all messages were logged
      assert.strictEqual(logs.length, 5, 'All messages should be logged');
      assert(logs[0].includes('[DEBUG]'), 'Debug message should be logged with DEBUG level');
      assert(logs[1].includes('[INFO]'), 'Info message should be logged with INFO level');
      assert(logs[2].includes('[WARNING]'), 'Warning message should be logged with WARNING level');
      assert(logs[3].includes('[ERROR]'), 'Error message should be logged with ERROR level');
      assert(logs[4].includes('[CRITICAL]'), 'Critical message should be logged with CRITICAL level');
      
      return true;
    }
  },
  
  {
    id: 'error_logger_level_filtering',
    name: 'Error Logger - Level Filtering',
    type: 'unit',
    tags: ['error_handling', 'logging'],
    priority: 1,
    testFn: async () => {
      // Create a mock output function to capture logs
      const logs = [];
      const mockOutput = (log) => {
        logs.push(log);
      };
      
      // Create an error logger with WARNING level
      const logger = new ErrorLogger({
        outputFn: mockOutput,
        logLevel: 'WARNING'
      });
      
      // Log messages at different levels
      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warning message');
      logger.error('Error message');
      logger.critical('Critical message');
      
      // Verify only messages at WARNING level and above were logged
      assert.strictEqual(logs.length, 3, 'Only WARNING and above should be logged');
      assert(logs[0].includes('[WARNING]'), 'First message should be WARNING');
      assert(logs[1].includes('[ERROR]'), 'Second message should be ERROR');
      assert(logs[2].includes('[CRITICAL]'), 'Third message should be CRITICAL');
      
      // Create a logger with ERROR level
      logs.length = 0;
      const errorLogger = new ErrorLogger({
        outputFn: mockOutput,
        logLevel: 'ERROR'
      });
      
      // Log messages at different levels
      errorLogger.debug('Debug message');
      errorLogger.info('Info message');
      errorLogger.warn('Warning message');
      errorLogger.error('Error message');
      errorLogger.critical('Critical message');
      
      // Verify only messages at ERROR level and above were logged
      assert.strictEqual(logs.length, 2, 'Only ERROR and above should be logged');
      assert(logs[0].includes('[ERROR]'), 'First message should be ERROR');
      assert(logs[1].includes('[CRITICAL]'), 'Second message should be CRITICAL');
      
      return true;
    }
  },
  
  {
    id: 'error_logger_formatting',
    name: 'Error Logger - Log Formatting',
    type: 'unit',
    tags: ['error_handling', 'logging'],
    priority: 1,
    testFn: async () => {
      // Create a mock output function to capture logs
      const logs = [];
      const mockOutput = (log) => {
        logs.push(log);
      };
      
      // Create an error logger with timestamp and component
      const logger = new ErrorLogger({
        outputFn: mockOutput,
        includeTimestamp: true
      });
      
      // Log a message with component
      logger.info('Component message', { component: 'test-component' });
      
      // Verify the log format
      assert.strictEqual(logs.length, 1, 'Message should be logged');
      assert(logs[0].includes('[INFO]'), 'Log should include level');
      assert(logs[0].includes('[test-component]'), 'Log should include component');
      assert(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z\]/.test(logs[0]), 'Log should include timestamp');
      
      // Create a logger with custom formatter
      logs.length = 0;
      const customLogger = new ErrorLogger({
        outputFn: mockOutput,
        formatter: (entry) => {
          return `${entry.level}|${entry.component || 'global'}|${entry.message}`;
        }
      });
      
      // Log a message with component
      customLogger.info('Custom format', { component: 'custom' });
      
      // Verify the custom format
      assert.strictEqual(logs.length, 1, 'Message should be logged');
      assert.strictEqual(logs[0], 'INFO|custom|Custom format', 'Custom format should be applied');
      
      return true;
    }
  },
  
  {
    id: 'error_logger_error_logging',
    name: 'Error Logger - Error Object Logging',
    type: 'unit',
    tags: ['error_handling', 'logging'],
    priority: 1,
    testFn: async () => {
      // Create a mock output function to capture logs
      const logs = [];
      const mockOutput = (log) => {
        logs.push(log);
      };
      
      // Create an error logger
      const logger = new ErrorLogger({
        outputFn: mockOutput,
        includeStackTrace: true
      });
      
      // Create a standard error
      const standardError = new Error('Standard error');
      
      // Log the error
      logger.logError(standardError);
      
      // Verify the error was logged
      assert.strictEqual(logs.length, 1, 'Error should be logged');
      assert(logs[0].includes('[ERROR]'), 'Error should be logged at ERROR level');
      assert(logs[0].includes('Standard error'), 'Error message should be included');
      assert(logs[0].includes('Stack Trace:'), 'Stack trace should be included');
      
      // Create a MarketAdsError
      logs.length = 0;
      const marketAdsError = new MarketAdsError('Custom error', {
        code: 'CUSTOM_ERROR',
        component: 'test',
        context: { userId: '123' }
      });
      
      // Log the error
      logger.logError(marketAdsError);
      
      // Verify the error was logged with context
      assert.strictEqual(logs.length, 1, 'Error should be logged');
      assert(logs[0].includes('[ERROR]'), 'Error should be logged at ERROR level');
      assert(logs[0].includes('Custom error'), 'Error message should be included');
      assert(logs[0].includes('CUSTOM_ERROR'), 'Error code should be included');
      assert(logs[0].includes('userId'), 'Context should be included');
      
      // Create a ValidationError (WARNING level)
      logs.length = 0;
      const validationError = new ValidationError('Validation error', {
        field: 'username',
        value: '',
        constraint: 'required'
      });
      
      // Log the error without specifying level
      logger.logError(validationError);
      
      // Verify the error was logged at WARNING level
      assert.strictEqual(logs.length, 1, 'Error should be logged');
      assert(logs[0].includes('[WARNING]'), 'ValidationError should be logged at WARNING level');
      
      // Create a SystemError (CRITICAL level)
      logs.length = 0;
      const systemError = new SystemError('System error', {
        subsystem: 'database'
      });
      
      // Log the error without specifying level
      logger.logError(systemError);
      
      // Verify the error was logged at CRITICAL level
      assert.strictEqual(logs.length, 1, 'Error should be logged');
      assert(logs[0].includes('[CRITICAL]'), 'SystemError should be logged at CRITICAL level');
      
      // Log an error with custom message and level
      logs.length = 0;
      logger.logError(standardError, {
        message: 'Custom message for error',
        level: 'INFO'
      });
      
      // Verify the custom message and level were used
      assert.strictEqual(logs.length, 1, 'Error should be logged');
      assert(logs[0].includes('[INFO]'), 'Error should be logged at INFO level');
      assert(logs[0].includes('Custom message for error'), 'Custom message should be used');
      
      return true;
    }
  },
  
  {
    id: 'error_logger_history',
    name: 'Error Logger - Log History',
    type: 'unit',
    tags: ['error_handling', 'logging'],
    priority: 1,
    testFn: async () => {
      // Create an error logger with no output
      const logger = new ErrorLogger({
        outputFn: () => {},
        maxHistorySize: 5
      });
      
      // Log messages at different levels
      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warning message');
      logger.error('Error message');
      logger.critical('Critical message');
      
      // Get the full history
      const history = logger.getHistory();
      
      // Verify all messages were recorded
      assert.strictEqual(history.length, 5, 'All messages should be in history');
      assert.strictEqual(history[0].level, 'DEBUG', 'First message should be DEBUG');
      assert.strictEqual(history[1].level, 'INFO', 'Second message should be INFO');
      assert.strictEqual(history[2].level, 'WARNING', 'Third message should be WARNING');
      assert.strictEqual(history[3].level, 'ERROR', 'Fourth message should be ERROR');
      assert.strictEqual(history[4].level, 'CRITICAL', 'Fifth message should be CRITICAL');
      
      // Get history filtered by level
      const errorHistory = logger.getHistory({ level: 'ERROR' });
      
      // Verify only ERROR and CRITICAL messages are included
      assert.strictEqual(errorHistory.length, 2, 'Only ERROR and CRITICAL should be included');
      assert.strictEqual(errorHistory[0].level, 'ERROR', 'First message should be ERROR');
      assert.strictEqual(errorHistory[1].level, 'CRITICAL', 'Second message should be CRITICAL');
      
      // Log a message with component
      logger.info('Component message', { component: 'test-component' });
      
      // Get history filtered by component
      const componentHistory = logger.getHistory({ component: 'test-component' });
      
      // Verify only the component message is included
      assert.strictEqual(componentHistory.length, 1, 'Only component message should be included');
      assert.strictEqual(componentHistory[0].message, 'Component message', 'Message should match');
      assert.strictEqual(componentHistory[0].component, 'test-component', 'Component should match');
      
      // Test history size limit
      logger.info('Overflow message 1');
      logger.info('Overflow message 2');
      
      // Get the full history
      const limitedHistory = logger.getHistory();
      
      // Verify only the last 5 messages are kept
      assert.strictEqual(limitedHistory.length, 5, 'History should be limited to 5 messages');
      assert.strictEqual(limitedHistory[4].message, 'Overflow message 2', 'Last message should be newest');
      
      // Clear history
      logger.clearHistory();
      
      // Verify history is empty
      assert.strictEqual(logger.getHistory().length, 0, 'History should be empty after clearing');
      
      return true;
    }
  },
  
  {
    id: 'error_logger_child',
    name: 'Error Logger - Child Loggers',
    type: 'unit',
    tags: ['error_handling', 'logging'],
    priority: 1,
    testFn: async () => {
      // Create a mock output function to capture logs
      const logs = [];
      const mockOutput = (log) => {
        logs.push(log);
      };
      
      // Create a parent logger
      const parentLogger = new ErrorLogger({
        outputFn: mockOutput,
        logLevel: 'INFO'
      });
      
      // Create a child logger
      const childLogger = parentLogger.child('child-component');
      
      // Log messages from both loggers
      parentLogger.info('Parent message');
      childLogger.info('Child message');
      
      // Verify both messages were logged
      assert.strictEqual(logs.length, 2, 'Both messages should be logged');
      assert(logs[0].includes('[INFO]'), 'Parent message should be logged at INFO level');
      assert(!logs[0].includes('[child-component]'), 'Parent message should not have child component');
      assert(logs[1].includes('[INFO]'), 'Child message should be logged at INFO level');
      assert(logs[1].includes('[child-component]'), 'Child message should have child component');
      
      // Create a child logger with different level
      const debugChildLogger = parentLogger.child('debug-child', {
        logLevel: 'DEBUG'
      });
      
      // Log debug messages from both loggers
      logs.length = 0;
      parentLogger.debug('Parent debug message');
      debugChildLogger.debug('Child debug message');
      
      // Verify only child message was logged
      assert.strictEqual(logs.length, 1, 'Only child debug message should be logged');
      assert(logs[0].includes('[DEBUG]'), 'Child message should be logged at DEBUG level');
      assert(logs[0].includes('[debug-child]'), 'Child message should have debug-child component');
      
      return true;
    }
  },
  
  {
    id: 'error_logger_log_levels',
    name: 'Error Logger - Log Level Parsing',
    type: 'unit',
    tags: ['error_handling', 'logging'],
    priority: 1,
    testFn: async () => {
      // Create a logger with string level
      const stringLevelLogger = new ErrorLogger({
        outputFn: () => {},
        logLevel: 'WARNING'
      });
      
      // Verify the level was parsed correctly
      assert.strictEqual(stringLevelLogger.logLevel, LOG_LEVELS.WARNING, 'String level should be parsed correctly');
      
      // Create a logger with numeric level
      const numericLevelLogger = new ErrorLogger({
        outputFn: () => {},
        logLevel: 3 // ERROR
      });
      
      // Verify the level was parsed correctly
      assert.strictEqual(numericLevelLogger.logLevel, LOG_LEVELS.ERROR, 'Numeric level should be parsed correctly');
      
      // Create a logger with invalid level (should default to INFO)
      const invalidLevelLogger = new ErrorLogger({
        outputFn: () => {},
        logLevel: 'INVALID'
      });
      
      // Verify the default level was used
      assert.strictEqual(invalidLevelLogger.logLevel, LOG_LEVELS.INFO, 'Invalid level should default to INFO');
      
      return true;
    }
  }
];

// For manual testing
if (require.main === module) {
  (async () => {
    for (const test of tests) {
      console.log(`Running test: ${test.name}`);
      try {
        const result = await test.testFn();
        console.log(`Test ${test.name} ${result ? 'PASSED' : 'FAILED'}`);
      } catch (error) {
        console.error(`Test ${test.name} FAILED with error:`, error);
      }
    }
  })();
}

module.exports = { tests }; 