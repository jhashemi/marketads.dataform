/**
 * @fileoverview Tests for Error Handler
 * 
 * This file contains tests for the error handler functionality.
 */

const assert = require('assert');
const { ErrorHandler } = require('../../errors/error_handler');
const { 
  MarketAdsError, 
  ValidationError, 
  ConfigurationError,
  DatabaseError,
  BigQueryError,
  TimeoutError,
  ApiError,
  SystemError,
  NotFoundError
} = require('../../errors/error_types');

// Mock logger for testing
class MockLogger {
  constructor() {
    this.logs = [];
  }
  
  error(message, data) {
    this.logs.push({ level: 'error', message, data });
  }
  
  warn(message, data) {
    this.logs.push({ level: 'warn', message, data });
  }
  
  info(message, data) {
    this.logs.push({ level: 'info', message, data });
  }
  
  debug(message, data) {
    this.logs.push({ level: 'debug', message, data });
  }
  
  clear() {
    this.logs = [];
  }
}

/**
 * Test suite for ErrorHandler
 */
const tests = [
  {
    id: 'error_handler_basic',
    name: 'Error Handler - Basic Functionality',
    type: 'unit',
    tags: ['error_handling', 'core'],
    priority: 1,
    testFn: async () => {
      // Create a mock logger
      const mockLogger = new MockLogger();
      
      // Create an error handler with the mock logger
      const errorHandler = new ErrorHandler({
        logger: mockLogger
      });
      
      // Create a standard error
      const standardError = new Error('Standard error message');
      
      // Handle the error
      const handledError = errorHandler.handleError(standardError);
      
      // Verify the error was wrapped as a MarketAdsError
      assert(handledError instanceof MarketAdsError, 'Error should be wrapped as MarketAdsError');
      assert.strictEqual(handledError.message, 'Standard error message', 'Error message should be preserved');
      assert.strictEqual(handledError.cause, standardError, 'Original error should be set as cause');
      
      // Verify the error was logged
      assert.strictEqual(mockLogger.logs.length, 1, 'Error should be logged once');
      assert.strictEqual(mockLogger.logs[0].level, 'error', 'Error should be logged at error level');
      
      return true;
    }
  },
  
  {
    id: 'error_handler_categorize',
    name: 'Error Handler - Error Categorization',
    type: 'unit',
    tags: ['error_handling', 'core'],
    priority: 1,
    testFn: async () => {
      const errorHandler = new ErrorHandler({ logErrors: false });
      
      // Test categorization of different error types
      const syntaxError = new SyntaxError('Invalid syntax');
      const handledSyntaxError = errorHandler.handleError(syntaxError);
      assert.strictEqual(handledSyntaxError.code, 'SYNTAX_ERROR', 'SyntaxError should be categorized correctly');
      
      const typeError = new TypeError('Invalid type');
      const handledTypeError = errorHandler.handleError(typeError);
      assert.strictEqual(handledTypeError.code, 'TYPE_ERROR', 'TypeError should be categorized correctly');
      
      const fileNotFoundError = new Error('File not found');
      fileNotFoundError.code = 'ENOENT';
      const handledFileError = errorHandler.handleError(fileNotFoundError);
      assert.strictEqual(handledFileError.code, 'FILE_NOT_FOUND', 'ENOENT error should be categorized correctly');
      
      const timeoutError = new Error('Connection timeout');
      timeoutError.code = 'ETIMEDOUT';
      const handledTimeoutError = errorHandler.handleError(timeoutError);
      assert.strictEqual(handledTimeoutError.code, 'TIMEOUT_ERROR', 'ETIMEDOUT error should be categorized correctly');
      
      return true;
    }
  },
  
  {
    id: 'error_handler_custom_errors',
    name: 'Error Handler - Custom Error Types',
    type: 'unit',
    tags: ['error_handling', 'core'],
    priority: 1,
    testFn: async () => {
      const mockLogger = new MockLogger();
      const errorHandler = new ErrorHandler({ logger: mockLogger });
      
      // Test handling of custom error types
      const validationError = new ValidationError('Invalid input', {
        field: 'username',
        value: '',
        constraint: 'required'
      });
      
      const handledValidationError = errorHandler.handleError(validationError);
      
      // Verify the error was not wrapped (already a MarketAdsError)
      assert(handledValidationError instanceof ValidationError, 'ValidationError should not be wrapped');
      assert.strictEqual(handledValidationError.field, 'username', 'Error properties should be preserved');
      
      // Verify the error was logged at the appropriate level (WARNING for ValidationError)
      assert.strictEqual(mockLogger.logs.length, 1, 'Error should be logged once');
      assert.strictEqual(mockLogger.logs[0].level, 'warn', 'ValidationError should be logged at warning level');
      
      // Test SystemError (CRITICAL)
      mockLogger.clear();
      const systemError = new SystemError('Critical system failure', {
        subsystem: 'database'
      });
      
      errorHandler.handleError(systemError);
      
      // Verify the error was logged at the appropriate level (CRITICAL for SystemError)
      assert.strictEqual(mockLogger.logs.length, 1, 'Error should be logged once');
      assert.strictEqual(mockLogger.logs[0].level, 'error', 'SystemError should be logged at error level');
      assert(mockLogger.logs[0].message.includes('CRITICAL'), 'SystemError should be logged as CRITICAL');
      
      return true;
    }
  },
  
  {
    id: 'error_handler_listeners',
    name: 'Error Handler - Error Listeners',
    type: 'unit',
    tags: ['error_handling', 'core'],
    priority: 1,
    testFn: async () => {
      const errorHandler = new ErrorHandler({ logErrors: false });
      
      // Create a listener that counts errors
      let errorCount = 0;
      const errorListener = () => {
        errorCount++;
      };
      
      // Add the listener
      const removeListener = errorHandler.addErrorListener(errorListener);
      
      // Handle some errors
      errorHandler.handleError(new Error('First error'));
      errorHandler.handleError(new Error('Second error'));
      
      // Verify the listener was called
      assert.strictEqual(errorCount, 2, 'Error listener should be called for each error');
      
      // Remove the listener
      removeListener();
      
      // Handle another error
      errorHandler.handleError(new Error('Third error'));
      
      // Verify the listener was not called
      assert.strictEqual(errorCount, 2, 'Error listener should not be called after removal');
      
      return true;
    }
  },
  
  {
    id: 'error_handler_safe_fn',
    name: 'Error Handler - Safe Function Wrapper',
    type: 'unit',
    tags: ['error_handling', 'core'],
    priority: 1,
    testFn: async () => {
      const errorHandler = new ErrorHandler({ logErrors: false });
      
      // Create a function that throws an error
      const throwingFn = () => {
        throw new Error('Function error');
      };
      
      // Create a safe version of the function
      const safeFn = errorHandler.safeFn(throwingFn, { component: 'test' });
      
      // Call the safe function
      const result = await safeFn();
      
      // Verify the error was handled and returned
      assert(result instanceof MarketAdsError, 'Safe function should return the handled error');
      assert.strictEqual(result.message, 'Function error', 'Error message should be preserved');
      assert.strictEqual(result.component, 'test', 'Context should be added to the error');
      
      // Create a function that returns a value
      const successFn = () => 'success';
      
      // Create a safe version of the function
      const safeSuccessFn = errorHandler.safeFn(successFn);
      
      // Call the safe function
      const successResult = await safeSuccessFn();
      
      // Verify the result was returned
      assert.strictEqual(successResult, 'success', 'Safe function should return the result for successful calls');
      
      return true;
    }
  },
  
  {
    id: 'error_handler_try_exec',
    name: 'Error Handler - Try Execute',
    type: 'unit',
    tags: ['error_handling', 'core'],
    priority: 1,
    testFn: async () => {
      const errorHandler = new ErrorHandler({ logErrors: false });
      
      // Test tryExec with a successful function
      const successResult = errorHandler.tryExec(() => 'success');
      assert.strictEqual(successResult.success, true, 'tryExec should return success: true for successful calls');
      assert.strictEqual(successResult.value, 'success', 'tryExec should return the function result');
      
      // Test tryExec with a failing function
      const failureResult = errorHandler.tryExec(() => {
        throw new Error('Function error');
      });
      assert.strictEqual(failureResult.success, false, 'tryExec should return success: false for failing calls');
      assert(failureResult.error instanceof MarketAdsError, 'tryExec should return the handled error');
      
      // Test tryExecAsync with a successful async function
      const asyncSuccessResult = await errorHandler.tryExecAsync(async () => 'async success');
      assert.strictEqual(asyncSuccessResult.success, true, 'tryExecAsync should return success: true for successful calls');
      assert.strictEqual(asyncSuccessResult.value, 'async success', 'tryExecAsync should return the function result');
      
      // Test tryExecAsync with a failing async function
      const asyncFailureResult = await errorHandler.tryExecAsync(async () => {
        throw new Error('Async function error');
      });
      assert.strictEqual(asyncFailureResult.success, false, 'tryExecAsync should return success: false for failing calls');
      assert(asyncFailureResult.error instanceof MarketAdsError, 'tryExecAsync should return the handled error');
      
      return true;
    }
  },
  
  {
    id: 'error_handler_retry',
    name: 'Error Handler - Retry Function',
    type: 'unit',
    tags: ['error_handling', 'core'],
    priority: 1,
    testFn: async () => {
      const errorHandler = new ErrorHandler({ logErrors: false });
      
      // Create a function that fails the first two times and succeeds the third time
      let attempts = 0;
      const flakeyFn = async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error(`Attempt ${attempts} failed`);
        }
        return 'success';
      };
      
      // Create a retry function
      const retryFn = errorHandler.retryFn(flakeyFn, {
        maxRetries: 3,
        initialDelayMs: 10, // Use small delays for testing
        maxDelayMs: 50
      });
      
      // Call the retry function
      const result = await retryFn();
      
      // Verify the function was retried and eventually succeeded
      assert.strictEqual(result, 'success', 'Retry function should return the result after successful retry');
      assert.strictEqual(attempts, 3, 'Function should be called 3 times (1 initial + 2 retries)');
      
      // Create a function that always fails
      const alwaysFailsFn = async () => {
        throw new Error('Always fails');
      };
      
      // Create a retry function with a shouldRetry function that only retries specific errors
      const conditionalRetryFn = errorHandler.retryFn(alwaysFailsFn, {
        maxRetries: 2,
        initialDelayMs: 10,
        shouldRetry: (error) => error.message.includes('specific')
      });
      
      // Call the retry function with an error that should not be retried
      try {
        await conditionalRetryFn();
        assert.fail('Retry function should throw for errors that are not retried');
      } catch (error) {
        assert(error instanceof MarketAdsError, 'Error should be handled');
        assert.strictEqual(error.message, 'Always fails', 'Error message should be preserved');
      }
      
      return true;
    }
  },
  
  {
    id: 'error_handler_circuit_breaker',
    name: 'Error Handler - Circuit Breaker',
    type: 'unit',
    tags: ['error_handling', 'core'],
    priority: 1,
    testFn: async () => {
      const errorHandler = new ErrorHandler({ logErrors: false });
      
      // Create a function that always fails
      const failingFn = async () => {
        throw new Error('Service unavailable');
      };
      
      // Create a fallback function
      const fallbackFn = async () => 'fallback';
      
      // Create a circuit breaker
      const circuitBreakerFn = errorHandler.circuitBreaker(failingFn, {
        failureThreshold: 2,
        resetTimeoutMs: 100, // Use small timeout for testing
        fallbackFn
      });
      
      // Call the circuit breaker function multiple times to open the circuit
      try {
        await circuitBreakerFn();
        assert.fail('Circuit breaker should throw on first call');
      } catch (error) {
        assert(error instanceof MarketAdsError, 'Error should be handled');
      }
      
      try {
        await circuitBreakerFn();
        assert.fail('Circuit breaker should throw on second call');
      } catch (error) {
        assert(error instanceof MarketAdsError, 'Error should be handled');
      }
      
      // The circuit should now be open, so the fallback should be used
      const result = await circuitBreakerFn();
      assert.strictEqual(result, 'fallback', 'Circuit breaker should use fallback when circuit is open');
      
      // Wait for the reset timeout
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // The circuit should now be half-open, so the function should be tried again
      try {
        await circuitBreakerFn();
        assert.fail('Circuit breaker should throw when half-open if function fails');
      } catch (error) {
        assert(error instanceof MarketAdsError, 'Error should be handled');
      }
      
      // The circuit should be open again
      const fallbackResult = await circuitBreakerFn();
      assert.strictEqual(fallbackResult, 'fallback', 'Circuit breaker should use fallback when circuit is open again');
      
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