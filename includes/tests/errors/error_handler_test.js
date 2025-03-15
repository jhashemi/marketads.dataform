/**
 * @fileoverview Tests for Error Handler
 * 
 * This file contains tests for the error handling functionality.
 */

const assert = require('assert');
const { ErrorHandler } = require('../../errors/error_handler');
const { MarketAdsError, DataformError, BigQueryError } = require('../../errors/error_types');
const { ValidationError } = require('../../errors/validation_error');

/**
 * Test suite for ErrorHandler
 */
const tests = [
  {
    id: 'error_handler_creation',
    name: 'Error Handler - Basic Creation',
    type: 'unit',
    tags: ['error', 'handler'],
    priority: 1,
    testFn: async () => {
      // Create a basic error handler
      const handler = new ErrorHandler();
      
      // Verify handler properties
      assert(handler, 'Handler should be created');
      assert(typeof handler.handle === 'function', 'Handler should have handle method');
      assert(typeof handler.log === 'function', 'Handler should have log method');
      assert(typeof handler.wrapSafe === 'function', 'Handler should have wrapSafe method');
      assert(typeof handler.retry === 'function', 'Handler should have retry method');
      assert(typeof handler.withCircuitBreaker === 'function', 'Handler should have withCircuitBreaker method');
      
      return true;
    }
  },
  
  {
    id: 'error_handler_handle_basic',
    name: 'Error Handler - Basic Error Handling',
    type: 'unit',
    tags: ['error', 'handler'],
    priority: 1,
    testFn: async () => {
      // Create handler
      const handler = new ErrorHandler();
      
      // Create test errors
      const standardError = new Error('Standard error');
      const marketAdsError = new MarketAdsError('MarketAds error');
      const dataformError = new DataformError('Dataform error');
      const bigQueryError = new BigQueryError('BigQuery error');
      const validationError = new ValidationError('Validation error');
      
      // Mock console methods to capture output
      const originalConsoleError = console.error;
      const originalConsoleWarn = console.warn;
      let errorLogs = [];
      let warnLogs = [];
      
      console.error = (...args) => {
        errorLogs.push(args.join(' '));
      };
      
      console.warn = (...args) => {
        warnLogs.push(args.join(' '));
      };
      
      try {
        // Handle different types of errors
        handler.handle(standardError);
        handler.handle(marketAdsError);
        handler.handle(dataformError);
        handler.handle(bigQueryError);
        handler.handle(validationError);
        
        // Verify logs
        const totalLogs = errorLogs.length + warnLogs.length;
        assert(totalLogs >= 5, 'Should log all errors');
        assert(errorLogs.some(log => log.includes('Standard error')), 'Should log standard error');
        assert(errorLogs.some(log => log.includes('MarketAds error')), 'Should log MarketAds error');
        assert(errorLogs.some(log => log.includes('Dataform error')), 'Should log Dataform error');
        assert(errorLogs.some(log => log.includes('BigQuery error')), 'Should log BigQuery error');
        assert(warnLogs.some(log => log.includes('Validation error')), 'Should log validation error');
        
        return true;
      } finally {
        // Restore console methods
        console.error = originalConsoleError;
        console.warn = originalConsoleWarn;
      }
    }
  },
  
  {
    id: 'error_handler_handle_with_callback',
    name: 'Error Handler - Handle with Callback',
    type: 'unit',
    tags: ['error', 'handler'],
    priority: 1,
    testFn: async () => {
      // Create handler
      const handler = new ErrorHandler();
      
      // Create test error
      const testError = new MarketAdsError('Test error');
      
      // Create callback
      let callbackCalled = false;
      let callbackError = null;
      const callback = (err) => {
        callbackCalled = true;
        callbackError = err;
      };
      
      // Handle error with callback
      handler.handle(testError, callback);
      
      // Verify callback was called
      assert(callbackCalled, 'Callback should be called');
      assert.strictEqual(callbackError, testError, 'Callback should receive the error');
      
      return true;
    }
  },
  
  {
    id: 'error_handler_log',
    name: 'Error Handler - Error Logging',
    type: 'unit',
    tags: ['error', 'handler', 'logging'],
    priority: 1,
    testFn: async () => {
      // Create handler
      const handler = new ErrorHandler();
      
      // Create test error
      const testError = new MarketAdsError('Test error', {
        code: 'TEST_ERROR',
        severity: 'WARNING',
        component: 'test-component',
        context: { testId: '123' }
      });
      
      // Mock console methods to capture output
      const originalConsoleError = console.error;
      const originalConsoleWarn = console.warn;
      const originalConsoleInfo = console.info;
      let errorLogs = [];
      let warnLogs = [];
      let infoLogs = [];
      
      console.error = (...args) => {
        errorLogs.push(args.join(' '));
      };
      console.warn = (...args) => {
        warnLogs.push(args.join(' '));
      };
      console.info = (...args) => {
        infoLogs.push(args.join(' '));
      };
      
      try {
        // Log error with different severity levels
        handler.log(new MarketAdsError('Error level', { severity: 'ERROR' }));
        handler.log(new MarketAdsError('Warning level', { severity: 'WARNING' }));
        handler.log(new MarketAdsError('Info level', { severity: 'INFO' }));
        
        // Verify logs by severity
        assert(errorLogs.some(log => log.includes('Error level')), 'Should log ERROR to console.error');
        assert(warnLogs.some(log => log.includes('Warning level')), 'Should log WARNING to console.warn');
        assert(infoLogs.some(log => log.includes('Info level')), 'Should log INFO to console.info');
        
        // Test with custom logger
        let customLoggerCalled = false;
        let customLoggedError = null;
        const customLogger = (err) => {
          customLoggerCalled = true;
          customLoggedError = err;
        };
        
        const handlerWithCustomLogger = new ErrorHandler({ logger: customLogger });
        handlerWithCustomLogger.log(testError);
        
        // Verify custom logger was called
        assert(customLoggerCalled, 'Custom logger should be called');
        assert.strictEqual(customLoggedError, testError, 'Custom logger should receive the error');
        
        return true;
      } finally {
        // Restore console methods
        console.error = originalConsoleError;
        console.warn = originalConsoleWarn;
        console.info = originalConsoleInfo;
      }
    }
  },
  
  {
    id: 'error_handler_wrap_safe',
    name: 'Error Handler - Safe Function Wrapper',
    type: 'unit',
    tags: ['error', 'handler', 'safe'],
    priority: 1,
    testFn: async () => {
      // Create handler
      const handler = new ErrorHandler();
      
      // Create test functions
      const successFn = () => 'success';
      const failFn = () => {
        throw new Error('Test error');
      };
      const asyncSuccessFn = async () => 'async success';
      const asyncFailFn = async () => {
        throw new Error('Async test error');
      };
      
      // Wrap functions
      const wrappedSuccessFn = handler.wrapSafe(successFn);
      const wrappedFailFn = handler.wrapSafe(failFn);
      const wrappedAsyncSuccessFn = handler.wrapSafe(asyncSuccessFn);
      const wrappedAsyncFailFn = handler.wrapSafe(asyncFailFn);
      
      // Test synchronous success
      const syncSuccessResult = wrappedSuccessFn();
      assert.strictEqual(syncSuccessResult, 'success', 'Wrapped sync function should return result');
      
      // Test synchronous failure
      const syncFailResult = wrappedFailFn();
      assert.strictEqual(syncFailResult, null, 'Wrapped sync function should return null on error');
      
      // Test asynchronous success
      const asyncSuccessResult = await wrappedAsyncSuccessFn();
      assert.strictEqual(asyncSuccessResult, 'async success', 'Wrapped async function should return result');
      
      // Test asynchronous failure
      const asyncFailResult = await wrappedAsyncFailFn();
      assert.strictEqual(asyncFailResult, null, 'Wrapped async function should return null on error');
      
      // Test with custom fallback
      const wrappedWithFallback = handler.wrapSafe(failFn, 'fallback');
      const fallbackResult = wrappedWithFallback();
      assert.strictEqual(fallbackResult, 'fallback', 'Should return custom fallback on error');
      
      // Test with error callback
      let callbackCalled = false;
      let callbackError = null;
      const errorCallback = (err) => {
        callbackCalled = true;
        callbackError = err;
      };
      
      const wrappedWithCallback = handler.wrapSafe(failFn, null, errorCallback);
      wrappedWithCallback();
      
      assert(callbackCalled, 'Error callback should be called');
      assert(callbackError instanceof Error, 'Error callback should receive error');
      assert.strictEqual(callbackError.message, 'Test error', 'Error callback should receive correct error');
      
      return true;
    }
  },
  
  {
    id: 'error_handler_retry',
    name: 'Error Handler - Retry Function',
    type: 'unit',
    tags: ['error', 'handler', 'retry'],
    priority: 1,
    testFn: async () => {
      // Create handler
      const handler = new ErrorHandler();
      
      // Create test function that succeeds on third attempt
      let attempts = 0;
      const eventuallySuccessFn = async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error(`Attempt ${attempts} failed`);
        }
        return 'success after retries';
      };
      
      // Create always failing function
      let failingAttempts = 0;
      const alwaysFailFn = async () => {
        failingAttempts++;
        throw new Error(`Always failing: attempt ${failingAttempts}`);
      };
      
      // Reset counters
      attempts = 0;
      failingAttempts = 0;
      
      // Wrap with retry
      const retryEventualSuccess = handler.retry(eventuallySuccessFn, {
        maxRetries: 3,
        delay: 10, // Small delay for tests
        backoffFactor: 1.5
      });
      
      // Test eventual success
      const successResult = await retryEventualSuccess();
      assert.strictEqual(successResult, 'success after retries', 'Should return success after retries');
      assert.strictEqual(attempts, 3, 'Should have made 3 attempts');
      
      // Reset counter
      failingAttempts = 0;
      
      // Wrap always failing function
      const retryAlwaysFail = handler.retry(alwaysFailFn, {
        maxRetries: 3,
        delay: 10,
        backoffFactor: 1.5
      });
      
      // Test always failing function
      try {
        await retryAlwaysFail();
        assert.fail('Should have thrown an error');
      } catch (error) {
        assert(error instanceof Error, 'Should throw error after max retries');
        assert.strictEqual(failingAttempts, 4, 'Should have made 4 attempts (initial + 3 retries)');
      }
      
      // Test with retry condition
      let conditionalAttempts = 0;
      const conditionalFailFn = async () => {
        conditionalAttempts++;
        throw new Error(`Conditional error: ${conditionalAttempts}`);
      };
      
      const retryOnlySpecificErrors = handler.retry(conditionalFailFn, {
        maxRetries: 3,
        delay: 10,
        retryCondition: (err) => err.message.includes('Conditional error: 1')
      });
      
      // Should only retry on first error
      try {
        await retryOnlySpecificErrors();
        assert.fail('Should have thrown an error');
      } catch (error) {
        assert(error instanceof Error, 'Should throw error');
        assert.strictEqual(conditionalAttempts, 2, 'Should have made 2 attempts (retry only on first error)');
      }
      
      return true;
    }
  },
  
  {
    id: 'error_handler_circuit_breaker',
    name: 'Error Handler - Circuit Breaker',
    type: 'unit',
    tags: ['error', 'handler', 'circuit-breaker'],
    priority: 1,
    testFn: async () => {
      // Create handler
      const handler = new ErrorHandler();
      
      // Create test function
      let functionCalls = 0;
      const testFn = async () => {
        functionCalls++;
        throw new Error(`Error ${functionCalls}`);
      };
      
      // Create circuit breaker
      const withCircuitBreaker = handler.withCircuitBreaker(testFn, {
        failureThreshold: 3,
        resetTimeout: 50 // Small timeout for tests
      });
      
      // Reset counter
      functionCalls = 0;
      
      // Call function until circuit opens
      try {
        await withCircuitBreaker();
      } catch (error) {
        // Expected error
      }
      
      try {
        await withCircuitBreaker();
      } catch (error) {
        // Expected error
      }
      
      try {
        await withCircuitBreaker();
      } catch (error) {
        // Expected error
      }
      
      // Circuit should be open now, function should not be called
      try {
        await withCircuitBreaker();
        assert.fail('Should have thrown circuit open error');
      } catch (error) {
        assert(error.message.includes('Circuit breaker is open'), 'Should throw circuit open error');
        assert.strictEqual(functionCalls, 3, 'Function should not be called when circuit is open');
      }
      
      // Wait for circuit to reset
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Circuit should be half-open now, function should be called again
      try {
        await withCircuitBreaker();
        assert.fail('Should have thrown error');
      } catch (error) {
        assert(!error.message.includes('Circuit breaker is open'), 'Should not throw circuit open error');
        assert.strictEqual(functionCalls, 4, 'Function should be called when circuit is half-open');
      }
      
      // Test with fallback
      const withFallback = handler.withCircuitBreaker(testFn, {
        failureThreshold: 1,
        resetTimeout: 50,
        fallback: () => 'fallback result'
      });
      
      // Reset counter
      functionCalls = 4; // Continue from previous count
      
      // Call once to open circuit
      try {
        await withFallback();
      } catch (error) {
        // Expected error
      }
      
      // Circuit should be open, fallback should be used
      const fallbackResult = await withFallback();
      assert.strictEqual(fallbackResult, 'fallback result', 'Should return fallback when circuit is open');
      assert.strictEqual(functionCalls, 5, 'Function should not be called when using fallback');
      
      return true;
    }
  },
  
  {
    id: 'error_handler_error_classification',
    name: 'Error Handler - Error Classification',
    type: 'unit',
    tags: ['error', 'handler', 'classification'],
    priority: 1,
    testFn: async () => {
      // Create handler
      const handler = new ErrorHandler();
      
      // Test error classification
      const standardError = new Error('Standard error');
      const marketAdsError = new MarketAdsError('MarketAds error');
      const dataformError = new DataformError('Dataform error');
      const bigQueryError = new BigQueryError('BigQuery error', { code: 'INVALID_QUERY' });
      const validationError = new ValidationError('Validation error');
      
      // Verify classification
      assert.strictEqual(handler.classify(standardError), 'UNKNOWN', 'Standard error should be classified as UNKNOWN');
      assert.strictEqual(handler.classify(marketAdsError), 'MARKETADS', 'MarketAdsError should be classified as MARKETADS');
      assert.strictEqual(handler.classify(dataformError), 'DATAFORM', 'DataformError should be classified as DATAFORM');
      assert.strictEqual(handler.classify(bigQueryError), 'BIGQUERY', 'BigQueryError should be classified as BIGQUERY');
      assert.strictEqual(handler.classify(validationError), 'VALIDATION', 'ValidationError should be classified as VALIDATION');
      
      // Test with custom classifier
      const customClassifier = (err) => {
        if (err.message.includes('custom')) {
          return 'CUSTOM';
        }
        return 'DEFAULT';
      };
      
      const handlerWithCustomClassifier = new ErrorHandler({ classifier: customClassifier });
      
      const customError = new Error('This is a custom error');
      const nonCustomError = new Error('This is a regular error');
      
      assert.strictEqual(handlerWithCustomClassifier.classify(customError), 'CUSTOM', 'Custom error should be classified as CUSTOM');
      assert.strictEqual(handlerWithCustomClassifier.classify(nonCustomError), 'DEFAULT', 'Non-custom error should be classified as DEFAULT');
      
      return true;
    }
  },
  
  {
    id: 'error_handler_error_transformation',
    name: 'Error Handler - Error Transformation',
    type: 'unit',
    tags: ['error', 'handler', 'transformation'],
    priority: 1,
    testFn: async () => {
      // Create handler with transformer
      const transformer = (err) => {
        if (err instanceof Error && err.name === 'Error') {
          return new MarketAdsError(`Transformed: ${err.message}`, {
            cause: err,
            code: 'TRANSFORMED_ERROR'
          });
        }
        return err;
      };
      
      const handler = new ErrorHandler({ transformer });
      
      // Test transformation
      const originalError = new Error('Original error');
      const transformedError = handler.transform(originalError);
      
      assert(transformedError instanceof MarketAdsError, 'Error should be transformed to MarketAdsError');
      assert.strictEqual(transformedError.message, 'Transformed: Original error', 'Error message should be transformed');
      assert.strictEqual(transformedError.code, 'TRANSFORMED_ERROR', 'Error code should be set');
      assert.strictEqual(transformedError.cause, originalError, 'Original error should be set as cause');
      
      // Test that MarketAdsError is not transformed
      const marketAdsError = new MarketAdsError('Already a MarketAdsError');
      const notTransformedError = handler.transform(marketAdsError);
      
      assert.strictEqual(notTransformedError, marketAdsError, 'MarketAdsError should not be transformed');
      
      return true;
    }
  },
  
  {
    id: 'error_handler_integration',
    name: 'Error Handler - Integration Test',
    type: 'integration',
    tags: ['error', 'handler', 'integration'],
    priority: 2,
    testFn: async () => {
      // Create handler with all options
      const options = {
        logger: (err) => {
          // Custom logger
          return { logged: true, error: err };
        },
        classifier: (err) => {
          // Custom classifier
          if (err.message.includes('classified')) {
            return 'CLASSIFIED';
          }
          return 'UNCLASSIFIED';
        },
        transformer: (err) => {
          // Custom transformer
          if (err.message.includes('transform')) {
            return new MarketAdsError(`Transformed: ${err.message}`, { cause: err });
          }
          return err;
        }
      };
      
      const handler = new ErrorHandler(options);
      
      // Test function that will be wrapped, retried, and circuit-broken
      let functionCalls = 0;
      const testFn = async (shouldSucceed = false, shouldThrowClassified = false, shouldThrowTransform = false) => {
        functionCalls++;
        
        if (shouldSucceed) {
          return 'success';
        }
        
        if (shouldThrowClassified) {
          throw new Error('This error should be classified');
        }
        
        if (shouldThrowTransform) {
          throw new Error('This error should transform');
        }
        
        throw new Error(`Regular error: attempt ${functionCalls}`);
      };
      
      // Create wrapped function with retry and circuit breaker
      const wrappedFn = handler.wrapSafe(
        handler.retry(
          handler.withCircuitBreaker(testFn, {
            failureThreshold: 3,
            resetTimeout: 50,
            fallback: () => 'circuit breaker fallback'
          }),
          {
            maxRetries: 2,
            delay: 10
          }
        ),
        'safe wrapper fallback'
      );
      
      // Reset counter
      functionCalls = 0;
      
      // Test successful call
      const successResult = await wrappedFn(true);
      assert.strictEqual(successResult, 'success', 'Should return success');
      assert.strictEqual(functionCalls, 1, 'Function should be called once');
      
      // Reset counter
      functionCalls = 0;
      
      // Test failing call with retry
      const failResult = await wrappedFn();
      assert.strictEqual(failResult, 'safe wrapper fallback', 'Should return safe wrapper fallback after retries');
      assert.strictEqual(functionCalls, 3, 'Function should be called 3 times (initial + 2 retries)');
      
      // Reset counter
      functionCalls = 0;
      
      // Test classified error
      const classifiedResult = await wrappedFn(false, true);
      assert.strictEqual(classifiedResult, 'circuit breaker fallback', 'Should return circuit breaker fallback');
      
      // Test transformed error
      const transformedResult = await wrappedFn(false, false, true);
      assert.strictEqual(transformedResult, 'circuit breaker fallback', 'Should return circuit breaker fallback');
      
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