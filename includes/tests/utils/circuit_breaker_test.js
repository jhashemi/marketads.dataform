/**
 * @fileoverview Tests for Circuit Breaker
 * 
 * This file contains tests for the circuit breaker functionality.
 */

const assert = require('assert');
const { 
  CIRCUIT_STATES, 
  CircuitBreakerError, 
  CircuitBreaker 
} = require('../../utils/circuit_breaker');
const { MarketAdsError } = require('../../errors/error_types');

// Helper function to wait for a specified time
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Test suite for Circuit Breaker
 */
const tests = [
  {
    id: 'circuit_breaker_initial_state',
    name: 'Circuit Breaker - Initial State',
    type: 'unit',
    tags: ['circuit_breaker', 'utils'],
    priority: 1,
    testFn: async () => {
      // Create a new circuit breaker
      const circuitBreaker = new CircuitBreaker({
        failureThreshold: 3,
        resetTimeoutMs: 1000
      });
      
      // Verify initial state
      assert.strictEqual(circuitBreaker.getState(), CIRCUIT_STATES.CLOSED, 'Initial state should be CLOSED');
      assert.strictEqual(circuitBreaker.failureCount, 0, 'Initial failure count should be 0');
      assert.strictEqual(circuitBreaker.successCount, 0, 'Initial success count should be 0');
      
      return true;
    }
  },
  
  {
    id: 'circuit_breaker_successful_execution',
    name: 'Circuit Breaker - Successful Execution',
    type: 'unit',
    tags: ['circuit_breaker', 'utils'],
    priority: 1,
    testFn: async () => {
      // Create a new circuit breaker
      const circuitBreaker = new CircuitBreaker({
        failureThreshold: 3,
        resetTimeoutMs: 1000
      });
      
      // Create a function that always succeeds
      const successFn = async () => 'success';
      
      // Execute the function through the circuit breaker
      const result = await circuitBreaker.execute(successFn);
      
      // Verify the result and state
      assert.strictEqual(result, 'success', 'Circuit breaker should return the result of the successful function');
      assert.strictEqual(circuitBreaker.getState(), CIRCUIT_STATES.CLOSED, 'State should remain CLOSED after successful execution');
      assert.strictEqual(circuitBreaker.failureCount, 0, 'Failure count should remain 0');
      assert.strictEqual(circuitBreaker.successCount, 1, 'Success count should be incremented');
      
      return true;
    }
  },
  
  {
    id: 'circuit_breaker_failed_execution',
    name: 'Circuit Breaker - Failed Execution',
    type: 'unit',
    tags: ['circuit_breaker', 'utils'],
    priority: 1,
    testFn: async () => {
      // Create a new circuit breaker
      const circuitBreaker = new CircuitBreaker({
        failureThreshold: 3,
        resetTimeoutMs: 1000
      });
      
      // Create a function that always fails
      const failureFn = async () => {
        throw new Error('Function failed');
      };
      
      // Execute the function through the circuit breaker
      try {
        await circuitBreaker.execute(failureFn);
        assert.fail('Circuit breaker should throw if the function fails');
      } catch (error) {
        assert(error instanceof Error, 'Error should be propagated');
        assert.strictEqual(error.message, 'Function failed', 'Error message should be preserved');
      }
      
      // Verify the state
      assert.strictEqual(circuitBreaker.getState(), CIRCUIT_STATES.CLOSED, 'State should remain CLOSED after a single failure');
      assert.strictEqual(circuitBreaker.failureCount, 1, 'Failure count should be incremented');
      assert.strictEqual(circuitBreaker.successCount, 0, 'Success count should remain 0');
      
      return true;
    }
  },
  
  {
    id: 'circuit_breaker_open_circuit',
    name: 'Circuit Breaker - Open Circuit',
    type: 'unit',
    tags: ['circuit_breaker', 'utils'],
    priority: 1,
    testFn: async () => {
      // Create a new circuit breaker with a low failure threshold
      const circuitBreaker = new CircuitBreaker({
        failureThreshold: 2,
        resetTimeoutMs: 1000
      });
      
      // Create a function that always fails
      const failureFn = async () => {
        throw new Error('Function failed');
      };
      
      // Execute the function multiple times to open the circuit
      try {
        await circuitBreaker.execute(failureFn);
        assert.fail('Circuit breaker should throw if the function fails');
      } catch (error) {
        assert(error instanceof Error, 'Error should be propagated');
      }
      
      try {
        await circuitBreaker.execute(failureFn);
        assert.fail('Circuit breaker should throw if the function fails');
      } catch (error) {
        assert(error instanceof Error, 'Error should be propagated');
      }
      
      // Verify the circuit is now open
      assert.strictEqual(circuitBreaker.getState(), CIRCUIT_STATES.OPEN, 'State should be OPEN after reaching failure threshold');
      assert.strictEqual(circuitBreaker.failureCount, 2, 'Failure count should match the threshold');
      
      // Try to execute another function while the circuit is open
      try {
        await circuitBreaker.execute(async () => 'success');
        assert.fail('Circuit breaker should throw if the circuit is open');
      } catch (error) {
        assert(error instanceof CircuitBreakerError, 'Error should be a CircuitBreakerError');
        assert(error.message.includes('Circuit is OPEN'), 'Error message should indicate the circuit is open');
      }
      
      return true;
    }
  },
  
  {
    id: 'circuit_breaker_half_open_circuit',
    name: 'Circuit Breaker - Half-Open Circuit',
    type: 'unit',
    tags: ['circuit_breaker', 'utils'],
    priority: 1,
    testFn: async () => {
      // Create a new circuit breaker with a short reset timeout
      const circuitBreaker = new CircuitBreaker({
        failureThreshold: 2,
        resetTimeoutMs: 100 // Short timeout for testing
      });
      
      // Create a function that always fails
      const failureFn = async () => {
        throw new Error('Function failed');
      };
      
      // Execute the function multiple times to open the circuit
      try {
        await circuitBreaker.execute(failureFn);
      } catch (error) {
        // Expected error
      }
      
      try {
        await circuitBreaker.execute(failureFn);
      } catch (error) {
        // Expected error
      }
      
      // Verify the circuit is now open
      assert.strictEqual(circuitBreaker.getState(), CIRCUIT_STATES.OPEN, 'State should be OPEN after reaching failure threshold');
      
      // Wait for the reset timeout to transition to half-open
      await wait(150);
      
      // Verify the circuit is now half-open
      assert.strictEqual(circuitBreaker.getState(), CIRCUIT_STATES.HALF_OPEN, 'State should be HALF_OPEN after reset timeout');
      
      // Execute a successful function to close the circuit
      const result = await circuitBreaker.execute(async () => 'success');
      
      // Verify the result and state
      assert.strictEqual(result, 'success', 'Circuit breaker should return the result of the successful function');
      assert.strictEqual(circuitBreaker.getState(), CIRCUIT_STATES.CLOSED, 'State should be CLOSED after successful execution in HALF_OPEN state');
      assert.strictEqual(circuitBreaker.failureCount, 0, 'Failure count should be reset');
      assert.strictEqual(circuitBreaker.successCount, 1, 'Success count should be incremented');
      
      return true;
    }
  },
  
  {
    id: 'circuit_breaker_half_open_failure',
    name: 'Circuit Breaker - Half-Open Failure',
    type: 'unit',
    tags: ['circuit_breaker', 'utils'],
    priority: 1,
    testFn: async () => {
      // Create a new circuit breaker with a short reset timeout
      const circuitBreaker = new CircuitBreaker({
        failureThreshold: 2,
        resetTimeoutMs: 100 // Short timeout for testing
      });
      
      // Create a function that always fails
      const failureFn = async () => {
        throw new Error('Function failed');
      };
      
      // Execute the function multiple times to open the circuit
      try {
        await circuitBreaker.execute(failureFn);
      } catch (error) {
        // Expected error
      }
      
      try {
        await circuitBreaker.execute(failureFn);
      } catch (error) {
        // Expected error
      }
      
      // Wait for the reset timeout to transition to half-open
      await wait(150);
      
      // Execute a failing function while half-open
      try {
        await circuitBreaker.execute(failureFn);
        assert.fail('Circuit breaker should throw if the function fails in HALF_OPEN state');
      } catch (error) {
        assert(error instanceof Error, 'Error should be propagated');
      }
      
      // Verify the circuit is open again
      assert.strictEqual(circuitBreaker.getState(), CIRCUIT_STATES.OPEN, 'State should be OPEN after failure in HALF_OPEN state');
      assert.strictEqual(circuitBreaker.failureCount, 1, 'Failure count should be reset to 1');
      
      return true;
    }
  },
  
  {
    id: 'circuit_breaker_fallback',
    name: 'Circuit Breaker - Fallback',
    type: 'unit',
    tags: ['circuit_breaker', 'utils'],
    priority: 1,
    testFn: async () => {
      // Create a new circuit breaker with a fallback function
      const circuitBreaker = new CircuitBreaker({
        failureThreshold: 2,
        resetTimeoutMs: 1000,
        fallbackFn: async () => 'fallback'
      });
      
      // Create a function that always fails
      const failureFn = async () => {
        throw new Error('Function failed');
      };
      
      // Execute the function multiple times to open the circuit
      try {
        await circuitBreaker.execute(failureFn);
      } catch (error) {
        // Expected error
      }
      
      try {
        await circuitBreaker.execute(failureFn);
      } catch (error) {
        // Expected error
      }
      
      // Verify the circuit is now open
      assert.strictEqual(circuitBreaker.getState(), CIRCUIT_STATES.OPEN, 'State should be OPEN after reaching failure threshold');
      
      // Execute another function while the circuit is open
      const result = await circuitBreaker.execute(async () => 'success');
      
      // Verify the fallback was used
      assert.strictEqual(result, 'fallback', 'Circuit breaker should use the fallback function when the circuit is open');
      
      return true;
    }
  },
  
  {
    id: 'circuit_breaker_force_open',
    name: 'Circuit Breaker - Force Open',
    type: 'unit',
    tags: ['circuit_breaker', 'utils'],
    priority: 1,
    testFn: async () => {
      // Create a new circuit breaker
      const circuitBreaker = new CircuitBreaker({
        failureThreshold: 3,
        resetTimeoutMs: 1000
      });
      
      // Force the circuit open
      circuitBreaker.forceOpen();
      
      // Verify the state
      assert.strictEqual(circuitBreaker.getState(), CIRCUIT_STATES.OPEN, 'State should be OPEN after forceOpen');
      
      // Try to execute a function
      try {
        await circuitBreaker.execute(async () => 'success');
        assert.fail('Circuit breaker should throw if the circuit is forced open');
      } catch (error) {
        assert(error instanceof CircuitBreakerError, 'Error should be a CircuitBreakerError');
      }
      
      return true;
    }
  },
  
  {
    id: 'circuit_breaker_force_close',
    name: 'Circuit Breaker - Force Close',
    type: 'unit',
    tags: ['circuit_breaker', 'utils'],
    priority: 1,
    testFn: async () => {
      // Create a new circuit breaker
      const circuitBreaker = new CircuitBreaker({
        failureThreshold: 2,
        resetTimeoutMs: 1000
      });
      
      // Create a function that always fails
      const failureFn = async () => {
        throw new Error('Function failed');
      };
      
      // Execute the function multiple times to open the circuit
      try {
        await circuitBreaker.execute(failureFn);
      } catch (error) {
        // Expected error
      }
      
      try {
        await circuitBreaker.execute(failureFn);
      } catch (error) {
        // Expected error
      }
      
      // Verify the circuit is now open
      assert.strictEqual(circuitBreaker.getState(), CIRCUIT_STATES.OPEN, 'State should be OPEN after reaching failure threshold');
      
      // Force the circuit closed
      circuitBreaker.forceClose();
      
      // Verify the state
      assert.strictEqual(circuitBreaker.getState(), CIRCUIT_STATES.CLOSED, 'State should be CLOSED after forceClose');
      assert.strictEqual(circuitBreaker.failureCount, 0, 'Failure count should be reset');
      
      // Execute a function
      try {
        await circuitBreaker.execute(failureFn);
        assert.fail('Circuit breaker should throw if the function fails');
      } catch (error) {
        assert(error instanceof Error, 'Error should be propagated');
      }
      
      // Verify the failure count was incremented
      assert.strictEqual(circuitBreaker.failureCount, 1, 'Failure count should be incremented');
      
      return true;
    }
  },
  
  {
    id: 'circuit_breaker_reset',
    name: 'Circuit Breaker - Reset',
    type: 'unit',
    tags: ['circuit_breaker', 'utils'],
    priority: 1,
    testFn: async () => {
      // Create a new circuit breaker
      const circuitBreaker = new CircuitBreaker({
        failureThreshold: 2,
        resetTimeoutMs: 1000
      });
      
      // Create a function that always fails
      const failureFn = async () => {
        throw new Error('Function failed');
      };
      
      // Execute the function multiple times to open the circuit
      try {
        await circuitBreaker.execute(failureFn);
      } catch (error) {
        // Expected error
      }
      
      try {
        await circuitBreaker.execute(failureFn);
      } catch (error) {
        // Expected error
      }
      
      // Verify the circuit is now open
      assert.strictEqual(circuitBreaker.getState(), CIRCUIT_STATES.OPEN, 'State should be OPEN after reaching failure threshold');
      
      // Reset the circuit
      circuitBreaker.reset();
      
      // Verify the state
      assert.strictEqual(circuitBreaker.getState(), CIRCUIT_STATES.CLOSED, 'State should be CLOSED after reset');
      assert.strictEqual(circuitBreaker.failureCount, 0, 'Failure count should be reset');
      assert.strictEqual(circuitBreaker.successCount, 0, 'Success count should be reset');
      
      return true;
    }
  },
  
  {
    id: 'circuit_breaker_wrap',
    name: 'Circuit Breaker - Wrap',
    type: 'unit',
    tags: ['circuit_breaker', 'utils'],
    priority: 1,
    testFn: async () => {
      // Create a new circuit breaker
      const circuitBreaker = new CircuitBreaker({
        failureThreshold: 2,
        resetTimeoutMs: 1000,
        fallbackFn: async () => 'fallback'
      });
      
      // Create a function that always fails
      const failureFn = async () => {
        throw new Error('Function failed');
      };
      
      // Wrap the function with the circuit breaker
      const wrappedFn = circuitBreaker.wrap(failureFn);
      
      // Execute the wrapped function multiple times to open the circuit
      try {
        await wrappedFn();
      } catch (error) {
        // Expected error
      }
      
      try {
        await wrappedFn();
      } catch (error) {
        // Expected error
      }
      
      // Verify the circuit is now open
      assert.strictEqual(circuitBreaker.getState(), CIRCUIT_STATES.OPEN, 'State should be OPEN after reaching failure threshold');
      
      // Execute the wrapped function again
      const result = await wrappedFn();
      
      // Verify the fallback was used
      assert.strictEqual(result, 'fallback', 'Wrapped function should use the fallback when the circuit is open');
      
      return true;
    }
  },
  
  {
    id: 'circuit_breaker_success_threshold',
    name: 'Circuit Breaker - Success Threshold',
    type: 'unit',
    tags: ['circuit_breaker', 'utils'],
    priority: 1,
    testFn: async () => {
      // Create a new circuit breaker with a success threshold
      const circuitBreaker = new CircuitBreaker({
        failureThreshold: 2,
        resetTimeoutMs: 100,
        successThreshold: 2 // Require 2 consecutive successes to close the circuit
      });
      
      // Create a function that always fails
      const failureFn = async () => {
        throw new Error('Function failed');
      };
      
      // Execute the function multiple times to open the circuit
      try {
        await circuitBreaker.execute(failureFn);
      } catch (error) {
        // Expected error
      }
      
      try {
        await circuitBreaker.execute(failureFn);
      } catch (error) {
        // Expected error
      }
      
      // Wait for the reset timeout to transition to half-open
      await wait(150);
      
      // Execute a successful function once
      await circuitBreaker.execute(async () => 'success');
      
      // Verify the circuit is still half-open
      assert.strictEqual(circuitBreaker.getState(), CIRCUIT_STATES.HALF_OPEN, 'State should remain HALF_OPEN after one success');
      assert.strictEqual(circuitBreaker.successCount, 1, 'Success count should be incremented');
      
      // Execute a successful function again
      await circuitBreaker.execute(async () => 'success');
      
      // Verify the circuit is now closed
      assert.strictEqual(circuitBreaker.getState(), CIRCUIT_STATES.CLOSED, 'State should be CLOSED after reaching success threshold');
      assert.strictEqual(circuitBreaker.successCount, 0, 'Success count should be reset');
      
      return true;
    }
  },
  
  {
    id: 'circuit_breaker_error_handling',
    name: 'Circuit Breaker - Error Handling',
    type: 'unit',
    tags: ['circuit_breaker', 'utils'],
    priority: 1,
    testFn: async () => {
      // Create a new circuit breaker
      const circuitBreaker = new CircuitBreaker({
        failureThreshold: 2,
        resetTimeoutMs: 1000
      });
      
      // Create a function that throws a MarketAdsError
      const errorFn = async () => {
        throw new MarketAdsError('Custom error', { code: 'CUSTOM_ERROR' });
      };
      
      // Execute the function
      try {
        await circuitBreaker.execute(errorFn);
        assert.fail('Circuit breaker should throw if the function throws');
      } catch (error) {
        assert(error instanceof MarketAdsError, 'Error should be a MarketAdsError');
        assert.strictEqual(error.code, 'CUSTOM_ERROR', 'Error code should be preserved');
      }
      
      // Verify the failure count was incremented
      assert.strictEqual(circuitBreaker.failureCount, 1, 'Failure count should be incremented');
      
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