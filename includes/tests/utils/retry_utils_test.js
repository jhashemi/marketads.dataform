/**
 * @fileoverview Tests for Retry Utilities
 * 
 * This file contains tests for the retry utilities functionality.
 */

const assert = require('assert');
const { 
  RETRY_STRATEGIES, 
  addJitter, 
  wait, 
  retry, 
  withTimeout,
  retryable,
  retryableForErrors,
  retryableForNetworkErrors,
  retryableForBigQueryErrors
} = require('../../utils/retry_utils');
const { TimeoutError } = require('../../errors/error_types');

/**
 * Test suite for Retry Utilities
 */
const tests = [
  {
    id: 'retry_utils_add_jitter',
    name: 'Retry Utils - Add Jitter',
    type: 'unit',
    tags: ['retry', 'utils'],
    priority: 1,
    testFn: async () => {
      // Test that jitter is added within the expected range
      const baseDelay = 1000;
      const jitterFactor = 0.2;
      
      // Run multiple times to ensure randomness
      for (let i = 0; i < 100; i++) {
        const delayWithJitter = addJitter(baseDelay, jitterFactor);
        
        // Jitter should be within +/- jitterFactor of baseDelay
        const minDelay = baseDelay * (1 - jitterFactor);
        const maxDelay = baseDelay * (1 + jitterFactor);
        
        assert(delayWithJitter >= minDelay, `Delay with jitter (${delayWithJitter}) should be >= ${minDelay}`);
        assert(delayWithJitter <= maxDelay, `Delay with jitter (${delayWithJitter}) should be <= ${maxDelay}`);
      }
      
      // Test with default jitter factor
      const delayWithDefaultJitter = addJitter(baseDelay);
      assert(typeof delayWithDefaultJitter === 'number', 'Delay with default jitter should be a number');
      
      return true;
    }
  },
  
  {
    id: 'retry_utils_wait',
    name: 'Retry Utils - Wait',
    type: 'unit',
    tags: ['retry', 'utils'],
    priority: 1,
    testFn: async () => {
      // Test that wait returns a promise that resolves after the specified delay
      const startTime = Date.now();
      const delay = 100; // 100ms
      
      await wait(delay);
      
      const endTime = Date.now();
      const elapsedTime = endTime - startTime;
      
      // Allow for some timing imprecision
      assert(elapsedTime >= delay - 10, `Wait should delay for at least ${delay - 10}ms (actual: ${elapsedTime}ms)`);
      
      return true;
    }
  },
  
  {
    id: 'retry_utils_retry_success',
    name: 'Retry Utils - Retry Success',
    type: 'unit',
    tags: ['retry', 'utils'],
    priority: 1,
    testFn: async () => {
      // Test retry with a function that succeeds on the first try
      let attempts = 0;
      const successFn = async () => {
        attempts++;
        return 'success';
      };
      
      const result = await retry(successFn, {
        maxRetries: 3,
        initialDelayMs: 10,
        maxDelayMs: 100,
        retryStrategy: RETRY_STRATEGIES.EXPONENTIAL
      });
      
      assert.strictEqual(result, 'success', 'Retry should return the result of the successful function');
      assert.strictEqual(attempts, 1, 'Function should be called only once if it succeeds on the first try');
      
      return true;
    }
  },
  
  {
    id: 'retry_utils_retry_eventual_success',
    name: 'Retry Utils - Retry Eventual Success',
    type: 'unit',
    tags: ['retry', 'utils'],
    priority: 1,
    testFn: async () => {
      // Test retry with a function that fails initially but eventually succeeds
      let attempts = 0;
      const eventualSuccessFn = async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error(`Attempt ${attempts} failed`);
        }
        return 'success';
      };
      
      const result = await retry(eventualSuccessFn, {
        maxRetries: 3,
        initialDelayMs: 10,
        maxDelayMs: 100,
        retryStrategy: RETRY_STRATEGIES.EXPONENTIAL
      });
      
      assert.strictEqual(result, 'success', 'Retry should return the result of the eventually successful function');
      assert.strictEqual(attempts, 3, 'Function should be called until it succeeds');
      
      return true;
    }
  },
  
  {
    id: 'retry_utils_retry_failure',
    name: 'Retry Utils - Retry Failure',
    type: 'unit',
    tags: ['retry', 'utils'],
    priority: 1,
    testFn: async () => {
      // Test retry with a function that always fails
      let attempts = 0;
      const failureFn = async () => {
        attempts++;
        throw new Error(`Attempt ${attempts} failed`);
      };
      
      try {
        await retry(failureFn, {
          maxRetries: 3,
          initialDelayMs: 10,
          maxDelayMs: 100,
          retryStrategy: RETRY_STRATEGIES.EXPONENTIAL
        });
        assert.fail('Retry should throw if the function never succeeds');
      } catch (error) {
        assert.strictEqual(error.message, 'Attempt 4 failed', 'Retry should throw the last error');
        assert.strictEqual(attempts, 4, 'Function should be called maxRetries + 1 times');
      }
      
      return true;
    }
  },
  
  {
    id: 'retry_utils_retry_strategies',
    name: 'Retry Utils - Retry Strategies',
    type: 'unit',
    tags: ['retry', 'utils'],
    priority: 1,
    testFn: async () => {
      // Test exponential backoff strategy
      const exponentialStrategy = RETRY_STRATEGIES.EXPONENTIAL;
      assert.strictEqual(exponentialStrategy(100, 1), 200, 'Exponential strategy should double the delay on the first retry');
      assert.strictEqual(exponentialStrategy(100, 2), 400, 'Exponential strategy should quadruple the delay on the second retry');
      assert.strictEqual(exponentialStrategy(100, 3), 800, 'Exponential strategy should multiply the delay by 2^3 on the third retry');
      
      // Test linear backoff strategy
      const linearStrategy = RETRY_STRATEGIES.LINEAR;
      assert.strictEqual(linearStrategy(100, 1), 200, 'Linear strategy should add the initial delay on the first retry');
      assert.strictEqual(linearStrategy(100, 2), 300, 'Linear strategy should add the initial delay twice on the second retry');
      assert.strictEqual(linearStrategy(100, 3), 400, 'Linear strategy should add the initial delay three times on the third retry');
      
      // Test fixed backoff strategy
      const fixedStrategy = RETRY_STRATEGIES.FIXED;
      assert.strictEqual(fixedStrategy(100, 1), 100, 'Fixed strategy should keep the same delay on the first retry');
      assert.strictEqual(fixedStrategy(100, 2), 100, 'Fixed strategy should keep the same delay on the second retry');
      assert.strictEqual(fixedStrategy(100, 3), 100, 'Fixed strategy should keep the same delay on the third retry');
      
      return true;
    }
  },
  
  {
    id: 'retry_utils_retry_should_retry',
    name: 'Retry Utils - Should Retry',
    type: 'unit',
    tags: ['retry', 'utils'],
    priority: 1,
    testFn: async () => {
      // Test retry with a shouldRetry function that only retries specific errors
      let attempts = 0;
      const mixedErrorsFn = async () => {
        attempts++;
        if (attempts === 1) {
          const error = new Error('Retryable error');
          error.code = 'RETRYABLE';
          throw error;
        } else if (attempts === 2) {
          const error = new Error('Non-retryable error');
          error.code = 'NON_RETRYABLE';
          throw error;
        }
        return 'success';
      };
      
      try {
        await retry(mixedErrorsFn, {
          maxRetries: 3,
          initialDelayMs: 10,
          maxDelayMs: 100,
          retryStrategy: RETRY_STRATEGIES.EXPONENTIAL,
          shouldRetry: (error) => error.code === 'RETRYABLE'
        });
        assert.fail('Retry should throw if shouldRetry returns false');
      } catch (error) {
        assert.strictEqual(error.message, 'Non-retryable error', 'Retry should throw the non-retryable error');
        assert.strictEqual(attempts, 2, 'Function should be called until a non-retryable error occurs');
      }
      
      return true;
    }
  },
  
  {
    id: 'retry_utils_with_timeout',
    name: 'Retry Utils - With Timeout',
    type: 'unit',
    tags: ['retry', 'utils'],
    priority: 1,
    testFn: async () => {
      // Test withTimeout with a function that completes before the timeout
      const fastFn = async () => {
        await wait(10);
        return 'success';
      };
      
      const fastResult = await withTimeout(fastFn, 100);
      assert.strictEqual(fastResult, 'success', 'withTimeout should return the result of the function if it completes before the timeout');
      
      // Test withTimeout with a function that exceeds the timeout
      const slowFn = async () => {
        await wait(200);
        return 'success';
      };
      
      try {
        await withTimeout(slowFn, 50);
        assert.fail('withTimeout should throw if the function exceeds the timeout');
      } catch (error) {
        assert(error instanceof TimeoutError, 'withTimeout should throw a TimeoutError');
        assert(error.message.includes('timed out after 50ms'), 'TimeoutError should include the timeout duration');
      }
      
      return true;
    }
  },
  
  {
    id: 'retry_utils_retryable',
    name: 'Retry Utils - Retryable',
    type: 'unit',
    tags: ['retry', 'utils'],
    priority: 1,
    testFn: async () => {
      // Test retryable with a function that eventually succeeds
      let attempts = 0;
      const eventualSuccessFn = async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error(`Attempt ${attempts} failed`);
        }
        return 'success';
      };
      
      const retryableFn = retryable(eventualSuccessFn, {
        maxRetries: 3,
        initialDelayMs: 10,
        maxDelayMs: 100
      });
      
      const result = await retryableFn();
      
      assert.strictEqual(result, 'success', 'Retryable function should return the result of the eventually successful function');
      assert.strictEqual(attempts, 3, 'Function should be called until it succeeds');
      
      return true;
    }
  },
  
  {
    id: 'retry_utils_retryable_for_errors',
    name: 'Retry Utils - Retryable For Errors',
    type: 'unit',
    tags: ['retry', 'utils'],
    priority: 1,
    testFn: async () => {
      // Test retryableForErrors with specific error types
      let attempts = 0;
      const mixedErrorsFn = async () => {
        attempts++;
        if (attempts === 1) {
          const error = new Error('Retryable error');
          error.code = 'RETRYABLE_1';
          throw error;
        } else if (attempts === 2) {
          const error = new Error('Another retryable error');
          error.code = 'RETRYABLE_2';
          throw error;
        } else if (attempts === 3) {
          const error = new Error('Non-retryable error');
          error.code = 'NON_RETRYABLE';
          throw error;
        }
        return 'success';
      };
      
      const retryableFn = retryableForErrors(mixedErrorsFn, ['RETRYABLE_1', 'RETRYABLE_2'], {
        maxRetries: 3,
        initialDelayMs: 10,
        maxDelayMs: 100
      });
      
      try {
        await retryableFn();
        assert.fail('Retryable function should throw if a non-retryable error occurs');
      } catch (error) {
        assert.strictEqual(error.message, 'Non-retryable error', 'Retryable function should throw the non-retryable error');
        assert.strictEqual(attempts, 3, 'Function should be called until a non-retryable error occurs');
      }
      
      return true;
    }
  },
  
  {
    id: 'retry_utils_retryable_for_network_errors',
    name: 'Retry Utils - Retryable For Network Errors',
    type: 'unit',
    tags: ['retry', 'utils'],
    priority: 1,
    testFn: async () => {
      // Test retryableForNetworkErrors with network errors
      let attempts = 0;
      const networkErrorsFn = async () => {
        attempts++;
        if (attempts === 1) {
          const error = new Error('Connection reset');
          error.code = 'ECONNRESET';
          throw error;
        } else if (attempts === 2) {
          const error = new Error('Connection refused');
          error.code = 'ECONNREFUSED';
          throw error;
        } else if (attempts === 3) {
          const error = new Error('Non-network error');
          error.code = 'OTHER_ERROR';
          throw error;
        }
        return 'success';
      };
      
      const retryableFn = retryableForNetworkErrors(networkErrorsFn, {
        maxRetries: 3,
        initialDelayMs: 10,
        maxDelayMs: 100
      });
      
      try {
        await retryableFn();
        assert.fail('Retryable function should throw if a non-network error occurs');
      } catch (error) {
        assert.strictEqual(error.message, 'Non-network error', 'Retryable function should throw the non-network error');
        assert.strictEqual(attempts, 3, 'Function should be called until a non-network error occurs');
      }
      
      return true;
    }
  },
  
  {
    id: 'retry_utils_retryable_for_bigquery_errors',
    name: 'Retry Utils - Retryable For BigQuery Errors',
    type: 'unit',
    tags: ['retry', 'utils'],
    priority: 1,
    testFn: async () => {
      // Test retryableForBigQueryErrors with BigQuery errors
      let attempts = 0;
      const bigQueryErrorsFn = async () => {
        attempts++;
        if (attempts === 1) {
          const error = new Error('Rate limit exceeded');
          error.code = 'RATE_LIMIT_EXCEEDED';
          throw error;
        } else if (attempts === 2) {
          const error = new Error('Backend error');
          error.code = 'BACKEND_ERROR';
          throw error;
        } else if (attempts === 3) {
          const error = new Error('Non-BigQuery error');
          error.code = 'OTHER_ERROR';
          throw error;
        }
        return 'success';
      };
      
      const retryableFn = retryableForBigQueryErrors(bigQueryErrorsFn, {
        maxRetries: 3,
        initialDelayMs: 10,
        maxDelayMs: 100
      });
      
      try {
        await retryableFn();
        assert.fail('Retryable function should throw if a non-BigQuery error occurs');
      } catch (error) {
        assert.strictEqual(error.message, 'Non-BigQuery error', 'Retryable function should throw the non-BigQuery error');
        assert.strictEqual(attempts, 3, 'Function should be called until a non-BigQuery error occurs');
      }
      
      return true;
    }
  },
  
  {
    id: 'retry_utils_retry_with_timeout',
    name: 'Retry Utils - Retry With Timeout',
    type: 'unit',
    tags: ['retry', 'utils'],
    priority: 1,
    testFn: async () => {
      // Test retry with a timeout
      let attempts = 0;
      const slowFn = async () => {
        attempts++;
        await wait(50); // Slow function
        if (attempts < 3) {
          throw new Error(`Attempt ${attempts} failed`);
        }
        return 'success';
      };
      
      // Retry with a timeout that allows the function to complete
      const result = await retry(slowFn, {
        maxRetries: 3,
        initialDelayMs: 10,
        maxDelayMs: 100,
        timeoutMs: 200
      });
      
      assert.strictEqual(result, 'success', 'Retry with timeout should return the result if the function completes within the timeout');
      assert.strictEqual(attempts, 3, 'Function should be called until it succeeds');
      
      // Reset attempts
      attempts = 0;
      
      // Retry with a timeout that is too short
      try {
        await retry(slowFn, {
          maxRetries: 3,
          initialDelayMs: 10,
          maxDelayMs: 100,
          timeoutMs: 30 // Too short for the function to complete
        });
        assert.fail('Retry with timeout should throw if the function exceeds the timeout');
      } catch (error) {
        assert(error instanceof TimeoutError, 'Retry with timeout should throw a TimeoutError');
        assert(error.message.includes('timed out after 30ms'), 'TimeoutError should include the timeout duration');
        assert(attempts > 0, 'Function should be called at least once');
      }
      
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