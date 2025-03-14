/**
 * Jest Adapter for ValidationRegistry
 * 
 * This adapter bridges the gap between Jest and the custom validation framework
 * by providing global Jest test functions that register with the validation registry.
 */

const { ValidationRegistry, TestType } = require('./validation_registry');

// Create a singleton registry
const registry = new ValidationRegistry();

// Store lifecycle hooks
const lifecycleHooks = {
  beforeAll: [],
  afterAll: [],
  beforeEach: [],
  afterEach: []
};

// Export the registry for direct use if needed
exports.registry = registry;

/**
 * Initialize the adapter with Jest globals
 */
exports.initializeJestAdapter = () => {
  // Add lifecycle hooks
  if (typeof global.beforeAll !== 'function') {
    global.beforeAll = (fn) => {
      lifecycleHooks.beforeAll.push(fn);
    };
  }

  if (typeof global.afterAll !== 'function') {
    global.afterAll = (fn) => {
      lifecycleHooks.afterAll.push(fn);
    };
  }

  if (typeof global.beforeEach !== 'function') {
    global.beforeEach = (fn) => {
      lifecycleHooks.beforeEach.push(fn);
    };
  }

  if (typeof global.afterEach !== 'function') {
    global.afterEach = (fn) => {
      lifecycleHooks.afterEach.push(fn);
    };
  }

  // Make Jest functions available globally if they aren't already
  if (typeof global.describe !== 'function') {
    global.describe = (name, fn) => {
      try {
        // Just execute the function as Jest would
        fn();
      } catch (error) {
        console.error(`Error in describe block "${name}":`, error);
      }
    };
  }

  if (typeof global.test !== 'function' && typeof global.it !== 'function') {
    // Define test/it function that registers with validation registry
    const testFn = (name, fn, options = {}) => {
      const testId = name.toLowerCase().replace(/\s+/g, '_');
      
      // Create a wrapped test function that runs lifecycle hooks
      const wrappedFn = async (context) => {
        try {
          // Run beforeEach hooks
          for (const hook of lifecycleHooks.beforeEach) {
            await hook();
          }

          // Run the test
          await fn(context);

          // Run afterEach hooks
          for (const hook of lifecycleHooks.afterEach) {
            await hook();
          }

          return { success: true };
        } catch (error) {
          return { 
            success: false, 
            error: error.message,
            stack: error.stack
          };
        }
      };
      
      // Register with validation registry
      registry.registerTest({
        id: testId,
        name: name,
        type: options.type || TestType.UNIT,
        priority: options.priority || 2,
        dependencies: options.dependencies || [],
        parameters: options.parameters || {},
        testFn: wrappedFn
      });
    };

    // Make both test and it available
    global.test = testFn;
    global.it = testFn;
  }

  // Create a basic expect function if needed
  if (typeof global.expect !== 'function') {
    global.expect = (actual) => {
      return {
        toBe: (expected) => {
          if (actual !== expected) {
            throw new Error(`Expected ${expected} but got ${actual}`);
          }
          return true;
        },
        toEqual: (expected) => {
          const actualJson = JSON.stringify(actual);
          const expectedJson = JSON.stringify(expected);
          if (actualJson !== expectedJson) {
            throw new Error(`Expected ${expectedJson} but got ${actualJson}`);
          }
          return true;
        },
        toBeGreaterThan: (expected) => {
          if (!(actual > expected)) {
            throw new Error(`Expected ${actual} to be greater than ${expected}`);
          }
          return true;
        },
        toBeLessThan: (expected) => {
          if (!(actual < expected)) {
            throw new Error(`Expected ${actual} to be less than ${expected}`);
          }
          return true;
        },
        toBeLessThanOrEqual: (expected) => {
          if (!(actual <= expected)) {
            throw new Error(`Expected ${actual} to be less than or equal to ${expected}`);
          }
          return true;
        },
        toBeInstanceOf: (expected) => {
          if (!(actual instanceof expected)) {
            throw new Error(`Expected ${actual} to be instance of ${expected.name}`);
          }
          return true;
        },
        toHaveProperty: (prop) => {
          if (!(prop in actual)) {
            throw new Error(`Expected object to have property ${prop}`);
          }
          return true;
        }
      };
    };
  }
};

// Auto-initialize when imported
exports.initializeJestAdapter(); 