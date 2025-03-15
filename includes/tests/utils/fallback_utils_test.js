/**
 * @fileoverview Tests for Fallback Utilities
 * 
 * This file contains tests for the fallback utilities functionality.
 */

const assert = require('assert');
const { 
  withFallback, 
  withFallbackChain, 
  withDefault, 
  withCache,
  withGracefulDegradation,
  withReadOnlyFallback,
  withSizeFallback,
  withPartialResults
} = require('../../utils/fallback_utils');

/**
 * Test suite for Fallback Utilities
 */
const tests = [
  {
    id: 'fallback_utils_with_fallback_success',
    name: 'Fallback Utils - With Fallback Success',
    type: 'unit',
    tags: ['fallback', 'utils'],
    priority: 1,
    testFn: async () => {
      // Create a primary function that succeeds
      const primaryFn = async () => 'primary result';
      
      // Create a fallback function
      const fallbackFn = async () => 'fallback result';
      
      // Execute with fallback
      const result = await withFallback(primaryFn, fallbackFn);
      
      // Verify the primary function was used
      assert.strictEqual(result, 'primary result', 'withFallback should return the result of the primary function if it succeeds');
      
      return true;
    }
  },
  
  {
    id: 'fallback_utils_with_fallback_failure',
    name: 'Fallback Utils - With Fallback Failure',
    type: 'unit',
    tags: ['fallback', 'utils'],
    priority: 1,
    testFn: async () => {
      // Create a primary function that fails
      const primaryFn = async () => {
        throw new Error('Primary function failed');
      };
      
      // Create a fallback function
      const fallbackFn = async () => 'fallback result';
      
      // Execute with fallback
      const result = await withFallback(primaryFn, fallbackFn);
      
      // Verify the fallback function was used
      assert.strictEqual(result, 'fallback result', 'withFallback should return the result of the fallback function if the primary function fails');
      
      return true;
    }
  },
  
  {
    id: 'fallback_utils_with_fallback_should_fallback',
    name: 'Fallback Utils - With Fallback Should Fallback',
    type: 'unit',
    tags: ['fallback', 'utils'],
    priority: 1,
    testFn: async () => {
      // Create a primary function that fails with a specific error
      const primaryFn = async () => {
        const error = new Error('Primary function failed');
        error.code = 'SPECIFIC_ERROR';
        throw error;
      };
      
      // Create a fallback function
      const fallbackFn = async () => 'fallback result';
      
      // Execute with fallback that only falls back for specific errors
      const result = await withFallback(primaryFn, fallbackFn, {
        shouldFallback: (error) => error.code === 'SPECIFIC_ERROR'
      });
      
      // Verify the fallback function was used
      assert.strictEqual(result, 'fallback result', 'withFallback should use the fallback function if shouldFallback returns true');
      
      // Create a primary function that fails with a different error
      const primaryFn2 = async () => {
        const error = new Error('Primary function failed');
        error.code = 'OTHER_ERROR';
        throw error;
      };
      
      // Execute with fallback that only falls back for specific errors
      try {
        await withFallback(primaryFn2, fallbackFn, {
          shouldFallback: (error) => error.code === 'SPECIFIC_ERROR'
        });
        assert.fail('withFallback should throw if shouldFallback returns false');
      } catch (error) {
        assert.strictEqual(error.code, 'OTHER_ERROR', 'withFallback should throw the original error if shouldFallback returns false');
      }
      
      return true;
    }
  },
  
  {
    id: 'fallback_utils_with_fallback_on_fallback',
    name: 'Fallback Utils - With Fallback On Fallback',
    type: 'unit',
    tags: ['fallback', 'utils'],
    priority: 1,
    testFn: async () => {
      // Create a primary function that fails
      const primaryFn = async () => {
        throw new Error('Primary function failed');
      };
      
      // Create a fallback function
      const fallbackFn = async () => 'fallback result';
      
      // Create an onFallback callback
      let fallbackCalled = false;
      const onFallback = (error) => {
        fallbackCalled = true;
        assert.strictEqual(error.message, 'Primary function failed', 'onFallback should receive the original error');
      };
      
      // Execute with fallback
      const result = await withFallback(primaryFn, fallbackFn, {
        onFallback
      });
      
      // Verify the fallback function was used and the callback was called
      assert.strictEqual(result, 'fallback result', 'withFallback should return the result of the fallback function');
      assert.strictEqual(fallbackCalled, true, 'onFallback callback should be called');
      
      return true;
    }
  },
  
  {
    id: 'fallback_utils_with_fallback_chain_success',
    name: 'Fallback Utils - With Fallback Chain Success',
    type: 'unit',
    tags: ['fallback', 'utils'],
    priority: 1,
    testFn: async () => {
      // Create a chain of functions
      const fn1 = async () => 'result 1';
      const fn2 = async () => 'result 2';
      const fn3 = async () => 'result 3';
      
      // Execute with fallback chain
      const result = await withFallbackChain([fn1, fn2, fn3]);
      
      // Verify the first function was used
      assert.strictEqual(result, 'result 1', 'withFallbackChain should return the result of the first successful function');
      
      return true;
    }
  },
  
  {
    id: 'fallback_utils_with_fallback_chain_partial_failure',
    name: 'Fallback Utils - With Fallback Chain Partial Failure',
    type: 'unit',
    tags: ['fallback', 'utils'],
    priority: 1,
    testFn: async () => {
      // Create a chain of functions where the first one fails
      const fn1 = async () => {
        throw new Error('Function 1 failed');
      };
      const fn2 = async () => 'result 2';
      const fn3 = async () => 'result 3';
      
      // Execute with fallback chain
      const result = await withFallbackChain([fn1, fn2, fn3]);
      
      // Verify the second function was used
      assert.strictEqual(result, 'result 2', 'withFallbackChain should return the result of the first successful function');
      
      return true;
    }
  },
  
  {
    id: 'fallback_utils_with_fallback_chain_complete_failure',
    name: 'Fallback Utils - With Fallback Chain Complete Failure',
    type: 'unit',
    tags: ['fallback', 'utils'],
    priority: 1,
    testFn: async () => {
      // Create a chain of functions where all fail
      const fn1 = async () => {
        throw new Error('Function 1 failed');
      };
      const fn2 = async () => {
        throw new Error('Function 2 failed');
      };
      const fn3 = async () => {
        throw new Error('Function 3 failed');
      };
      
      // Execute with fallback chain
      try {
        await withFallbackChain([fn1, fn2, fn3]);
        assert.fail('withFallbackChain should throw if all functions fail');
      } catch (error) {
        assert.strictEqual(error.message, 'Function 3 failed', 'withFallbackChain should throw the last error');
      }
      
      return true;
    }
  },
  
  {
    id: 'fallback_utils_with_fallback_chain_on_fallback',
    name: 'Fallback Utils - With Fallback Chain On Fallback',
    type: 'unit',
    tags: ['fallback', 'utils'],
    priority: 1,
    testFn: async () => {
      // Create a chain of functions where the first one fails
      const fn1 = async () => {
        throw new Error('Function 1 failed');
      };
      const fn2 = async () => 'result 2';
      const fn3 = async () => 'result 3';
      
      // Create an onFallback callback
      const fallbackCalls = [];
      const onFallback = (error, index) => {
        fallbackCalls.push({ error: error.message, index });
      };
      
      // Execute with fallback chain
      const result = await withFallbackChain([fn1, fn2, fn3], {
        onFallback
      });
      
      // Verify the second function was used and the callback was called
      assert.strictEqual(result, 'result 2', 'withFallbackChain should return the result of the first successful function');
      assert.strictEqual(fallbackCalls.length, 1, 'onFallback callback should be called once');
      assert.strictEqual(fallbackCalls[0].error, 'Function 1 failed', 'onFallback should receive the error');
      assert.strictEqual(fallbackCalls[0].index, 0, 'onFallback should receive the index of the failed function');
      
      return true;
    }
  },
  
  {
    id: 'fallback_utils_with_default_success',
    name: 'Fallback Utils - With Default Success',
    type: 'unit',
    tags: ['fallback', 'utils'],
    priority: 1,
    testFn: async () => {
      // Create a function that succeeds
      const fn = async () => 'result';
      
      // Execute with default
      const result = await withDefault(fn, 'default value');
      
      // Verify the function result was used
      assert.strictEqual(result, 'result', 'withDefault should return the result of the function if it succeeds');
      
      return true;
    }
  },
  
  {
    id: 'fallback_utils_with_default_failure',
    name: 'Fallback Utils - With Default Failure',
    type: 'unit',
    tags: ['fallback', 'utils'],
    priority: 1,
    testFn: async () => {
      // Create a function that fails
      const fn = async () => {
        throw new Error('Function failed');
      };
      
      // Execute with default
      const result = await withDefault(fn, 'default value');
      
      // Verify the default value was used
      assert.strictEqual(result, 'default value', 'withDefault should return the default value if the function fails');
      
      return true;
    }
  },
  
  {
    id: 'fallback_utils_with_default_should_use_default',
    name: 'Fallback Utils - With Default Should Use Default',
    type: 'unit',
    tags: ['fallback', 'utils'],
    priority: 1,
    testFn: async () => {
      // Create a function that fails with a specific error
      const fn = async () => {
        const error = new Error('Function failed');
        error.code = 'SPECIFIC_ERROR';
        throw error;
      };
      
      // Execute with default that only uses default for specific errors
      const result = await withDefault(fn, 'default value', {
        shouldUseDefault: (error) => error.code === 'SPECIFIC_ERROR'
      });
      
      // Verify the default value was used
      assert.strictEqual(result, 'default value', 'withDefault should use the default value if shouldUseDefault returns true');
      
      // Create a function that fails with a different error
      const fn2 = async () => {
        const error = new Error('Function failed');
        error.code = 'OTHER_ERROR';
        throw error;
      };
      
      // Execute with default that only uses default for specific errors
      try {
        await withDefault(fn2, 'default value', {
          shouldUseDefault: (error) => error.code === 'SPECIFIC_ERROR'
        });
        assert.fail('withDefault should throw if shouldUseDefault returns false');
      } catch (error) {
        assert.strictEqual(error.code, 'OTHER_ERROR', 'withDefault should throw the original error if shouldUseDefault returns false');
      }
      
      return true;
    }
  },
  
  {
    id: 'fallback_utils_with_cache_success',
    name: 'Fallback Utils - With Cache Success',
    type: 'unit',
    tags: ['fallback', 'utils'],
    priority: 1,
    testFn: async () => {
      // Create a function that succeeds
      const fn = async () => 'result';
      
      // Create a cache
      const cache = {
        value: 'cached value'
      };
      
      // Execute with cache
      const result = await withCache(fn, () => cache.value);
      
      // Verify the function result was used
      assert.strictEqual(result, 'result', 'withCache should return the result of the function if it succeeds');
      
      return true;
    }
  },
  
  {
    id: 'fallback_utils_with_cache_failure',
    name: 'Fallback Utils - With Cache Failure',
    type: 'unit',
    tags: ['fallback', 'utils'],
    priority: 1,
    testFn: async () => {
      // Create a function that fails
      const fn = async () => {
        throw new Error('Function failed');
      };
      
      // Create a cache
      const cache = {
        value: 'cached value'
      };
      
      // Execute with cache
      const result = await withCache(fn, () => cache.value);
      
      // Verify the cached value was used
      assert.strictEqual(result, 'cached value', 'withCache should return the cached value if the function fails');
      
      return true;
    }
  },
  
  {
    id: 'fallback_utils_with_graceful_degradation',
    name: 'Fallback Utils - With Graceful Degradation',
    type: 'unit',
    tags: ['fallback', 'utils'],
    priority: 1,
    testFn: async () => {
      // Create a set of alternatives with weights
      const alternatives = [
        { fn: async () => { throw new Error('Alternative 1 failed'); }, weight: 1.0 },
        { fn: async () => 'result 2', weight: 0.8 },
        { fn: async () => 'result 3', weight: 0.5 }
      ];
      
      // Execute with graceful degradation
      const result = await withGracefulDegradation(alternatives);
      
      // Verify the first successful alternative was used
      assert.strictEqual(result, 'result 2', 'withGracefulDegradation should return the result of the first successful alternative');
      
      // Create a set of alternatives where all fail
      const failingAlternatives = [
        { fn: async () => { throw new Error('Alternative 1 failed'); }, weight: 1.0 },
        { fn: async () => { throw new Error('Alternative 2 failed'); }, weight: 0.8 },
        { fn: async () => { throw new Error('Alternative 3 failed'); }, weight: 0.5 }
      ];
      
      // Execute with graceful degradation
      try {
        await withGracefulDegradation(failingAlternatives);
        assert.fail('withGracefulDegradation should throw if all alternatives fail');
      } catch (error) {
        assert.strictEqual(error.message, 'Alternative 3 failed', 'withGracefulDegradation should throw the last error');
      }
      
      return true;
    }
  },
  
  {
    id: 'fallback_utils_with_read_only_fallback',
    name: 'Fallback Utils - With Read-Only Fallback',
    type: 'unit',
    tags: ['fallback', 'utils'],
    priority: 1,
    testFn: async () => {
      // Create a write function that fails with a write-related error
      const writeFn = async () => {
        const error = new Error('Write operation failed');
        error.code = 'WRITE_ERROR';
        throw error;
      };
      
      // Create a read function
      const readFn = async () => 'read result';
      
      // Execute with read-only fallback
      const result = await withReadOnlyFallback(writeFn, readFn, {
        isWriteError: (error) => error.code === 'WRITE_ERROR'
      });
      
      // Verify the read function was used
      assert.strictEqual(result, 'read result', 'withReadOnlyFallback should use the read function if the write function fails with a write-related error');
      
      // Create a write function that fails with a non-write-related error
      const otherErrorFn = async () => {
        const error = new Error('Other error');
        error.code = 'OTHER_ERROR';
        throw error;
      };
      
      // Execute with read-only fallback
      try {
        await withReadOnlyFallback(otherErrorFn, readFn, {
          isWriteError: (error) => error.code === 'WRITE_ERROR'
        });
        assert.fail('withReadOnlyFallback should throw if the write function fails with a non-write-related error');
      } catch (error) {
        assert.strictEqual(error.code, 'OTHER_ERROR', 'withReadOnlyFallback should throw the original error if it is not write-related');
      }
      
      return true;
    }
  },
  
  {
    id: 'fallback_utils_with_size_fallback',
    name: 'Fallback Utils - With Size Fallback',
    type: 'unit',
    tags: ['fallback', 'utils'],
    priority: 1,
    testFn: async () => {
      // Create a complex function for large inputs
      const complexFn = async (input) => {
        if (input.length > 10) {
          throw new Error('Input too large for complex function');
        }
        return 'complex result';
      };
      
      // Create a simple function for large inputs
      const simpleFn = async (input) => 'simple result';
      
      // Execute with size fallback for a small input
      const smallResult = await withSizeFallback(complexFn, simpleFn, 'small input');
      
      // Verify the complex function was used
      assert.strictEqual(smallResult, 'complex result', 'withSizeFallback should use the complex function for small inputs');
      
      // Execute with size fallback for a large input
      const largeResult = await withSizeFallback(complexFn, simpleFn, 'this is a very large input');
      
      // Verify the simple function was used
      assert.strictEqual(largeResult, 'simple result', 'withSizeFallback should use the simple function if the complex function fails');
      
      return true;
    }
  },
  
  {
    id: 'fallback_utils_with_partial_results',
    name: 'Fallback Utils - With Partial Results',
    type: 'unit',
    tags: ['fallback', 'utils'],
    priority: 1,
    testFn: async () => {
      // Create a function that returns full results
      const fullFn = async () => ({
        items: [1, 2, 3, 4, 5],
        complete: true
      });
      
      // Create a function that returns partial results
      const partialFn = async () => ({
        items: [1, 2, 3],
        complete: false
      });
      
      // Execute with partial results for a successful full function
      const fullResult = await withPartialResults(fullFn, partialFn);
      
      // Verify the full function was used
      assert.deepStrictEqual(fullResult, { items: [1, 2, 3, 4, 5], complete: true }, 'withPartialResults should return the full results if available');
      
      // Create a function that fails
      const failingFn = async () => {
        throw new Error('Function failed');
      };
      
      // Execute with partial results for a failing function
      const partialResult = await withPartialResults(failingFn, partialFn);
      
      // Verify the partial function was used
      assert.deepStrictEqual(partialResult, { items: [1, 2, 3], complete: false }, 'withPartialResults should return partial results if the full function fails');
      
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