/**
 * @fileoverview Tests for fallback utility
 */

const assert = require('assert');
const { withFallback, createFallbackFunction } = require('../../utils/fallback_utils');

/**
 * Test suite for fallback utility
 */
const tests = [
  {
    id: 'fallback_success',
    name: 'Fallback - Successful operation',
    type: 'unit',
    tags: ['fallback', 'utility'],
    priority: 1,
    testFn: async () => {
      // Test a function that succeeds
      const originalFn = () => 'success';
      const fallbackFn = () => 'fallback';
      
      const result = withFallback(originalFn, fallbackFn)();
      assert.strictEqual(result, 'success', 'Should return result from original function');
      
      return true;
    }
  },
  {
    id: 'fallback_failure',
    name: 'Fallback - Failed operation',
    type: 'unit',
    tags: ['fallback', 'utility'],
    priority: 1,
    testFn: async () => {
      // Test a function that fails
      const originalFn = () => { throw new Error('Original function failed'); };
      const fallbackFn = () => 'fallback';
      
      const result = withFallback(originalFn, fallbackFn)();
      assert.strictEqual(result, 'fallback', 'Should return result from fallback function');
      
      return true;
    }
  },
  {
    id: 'fallback_async_success',
    name: 'Fallback - Async successful operation',
    type: 'unit',
    tags: ['fallback', 'utility'],
    priority: 1,
    testFn: async () => {
      // Test an async function that succeeds
      const originalFn = async () => 'async success';
      const fallbackFn = async () => 'async fallback';
      
      const result = await withFallback(originalFn, fallbackFn)();
      assert.strictEqual(result, 'async success', 'Should return result from original async function');
      
      return true;
    }
  },
  {
    id: 'fallback_async_failure',
    name: 'Fallback - Async failed operation',
    type: 'unit',
    tags: ['fallback', 'utility'],
    priority: 1,
    testFn: async () => {
      // Test an async function that fails
      const originalFn = async () => { throw new Error('Async function failed'); };
      const fallbackFn = async () => 'async fallback';
      
      const result = await withFallback(originalFn, fallbackFn)();
      assert.strictEqual(result, 'async fallback', 'Should return result from async fallback function');
      
      return true;
    }
  },
  {
    id: 'fallback_with_args',
    name: 'Fallback - Function with arguments',
    type: 'unit',
    tags: ['fallback', 'utility'],
    priority: 1,
    testFn: async () => {
      // Test a function with arguments
      const originalFn = (a, b) => a + b;
      const fallbackFn = () => 0;
      
      const result = withFallback(originalFn, fallbackFn)(2, 3);
      assert.strictEqual(result, 5, 'Should pass arguments to original function');
      
      return true;
    }
  },
  {
    id: 'fallback_with_context',
    name: 'Fallback - Function with context',
    type: 'unit',
    tags: ['fallback', 'utility'],
    priority: 2,
    testFn: async () => {
      // Test a function with context
      const obj = {
        value: 10,
        originalFn() { return this.value; },
        fallbackFn() { return 0; }
      };
      
      const wrappedFn = withFallback(obj.originalFn, obj.fallbackFn);
      const result = wrappedFn.call(obj);
      assert.strictEqual(result, 10, 'Should preserve context');
      
      return true;
    }
  },
  {
    id: 'fallback_factory',
    name: 'Fallback - Factory function',
    type: 'unit',
    tags: ['fallback', 'utility'],
    priority: 2,
    testFn: async () => {
      // Test creating a fallback function
      const fallbackValue = 'default value';
      const fallbackFn = createFallbackFunction(fallbackValue);
      
      const result = fallbackFn();
      assert.strictEqual(result, fallbackValue, 'Factory should create function returning fallback value');
      
      return true;
    }
  },
  {
    id: 'fallback_error_handling',
    name: 'Fallback - Error handling',
    type: 'unit',
    tags: ['fallback', 'utility'],
    priority: 2,
    testFn: async () => {
      // Test error handling in fallback
      const originalFn = () => { throw new Error('Original error'); };
      const fallbackFn = (error) => `Error handled: ${error.message}`;
      
      const result = withFallback(originalFn, fallbackFn, { passError: true })();
      assert.strictEqual(result, 'Error handled: Original error', 'Should pass error to fallback function');
      
      return true;
    }
  }
];

module.exports = { tests }; 