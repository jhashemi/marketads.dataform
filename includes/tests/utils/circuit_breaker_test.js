/**
 * @fileoverview Tests for circuit breaker utility
 */

const assert = require('assert');
const { CircuitBreaker } = require('../../utils/circuit_breaker');

/**
 * Test suite for circuit breaker utility
 */
const tests = [
  {
    id: 'circuit_breaker_closed_state',
    name: 'Circuit Breaker - Closed State',
    type: 'unit',
    tags: ['circuit_breaker', 'utility'],
    priority: 1,
    testFn: async () => {
      // Test circuit breaker in closed state (normal operation)
      const breaker = new CircuitBreaker({
        name: 'test-breaker',
        failureThreshold: 3,
        resetTimeout: 1000
      });
      
      // Circuit should start in closed state
      assert.strictEqual(breaker.getState(), 'CLOSED', 'Circuit should start in closed state');
      
      // Successful operations should keep circuit closed
      await breaker.execute(() => 'success');
      assert.strictEqual(breaker.getState(), 'CLOSED', 'Circuit should remain closed after success');
      
      return true;
    }
  },
  {
    id: 'circuit_breaker_open_state',
    name: 'Circuit Breaker - Open State',
    type: 'unit',
    tags: ['circuit_breaker', 'utility'],
    priority: 1,
    testFn: async () => {
      // Test circuit breaker opening after failures
      const breaker = new CircuitBreaker({
        name: 'test-breaker',
        failureThreshold: 2,
        resetTimeout: 1000
      });
      
      // Fail enough times to open the circuit
      try { await breaker.execute(() => { throw new Error('Failure 1'); }); } catch (e) {}
      try { await breaker.execute(() => { throw new Error('Failure 2'); }); } catch (e) {}
      
      // Circuit should now be open
      assert.strictEqual(breaker.getState(), 'OPEN', 'Circuit should open after failures');
      
      // Attempts to execute while open should fail fast
      const startTime = Date.now();
      await assert.rejects(
        breaker.execute(() => 'should not execute'),
        /Circuit breaker is open/,
        'Should reject with circuit open error'
      );
      const duration = Date.now() - startTime;
      
      // Should fail fast (under 50ms)
      assert(duration < 50, `Should fail fast when circuit is open (took ${duration}ms)`);
      
      return true;
    }
  },
  {
    id: 'circuit_breaker_half_open_state',
    name: 'Circuit Breaker - Half-Open State',
    type: 'unit',
    tags: ['circuit_breaker', 'utility'],
    priority: 1,
    testFn: async () => {
      // Test circuit breaker transitioning to half-open state
      const breaker = new CircuitBreaker({
        name: 'test-breaker',
        failureThreshold: 2,
        resetTimeout: 100 // Short timeout for testing
      });
      
      // Fail enough times to open the circuit
      try { await breaker.execute(() => { throw new Error('Failure 1'); }); } catch (e) {}
      try { await breaker.execute(() => { throw new Error('Failure 2'); }); } catch (e) {}
      
      // Circuit should now be open
      assert.strictEqual(breaker.getState(), 'OPEN', 'Circuit should open after failures');
      
      // Wait for reset timeout
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Circuit should now be half-open
      assert.strictEqual(breaker.getState(), 'HALF_OPEN', 'Circuit should be half-open after reset timeout');
      
      // Successful operation should close the circuit
      await breaker.execute(() => 'success');
      assert.strictEqual(breaker.getState(), 'CLOSED', 'Circuit should close after success in half-open state');
      
      return true;
    }
  },
  {
    id: 'circuit_breaker_fallback',
    name: 'Circuit Breaker - Fallback Function',
    type: 'unit',
    tags: ['circuit_breaker', 'utility'],
    priority: 1,
    testFn: async () => {
      // Test circuit breaker with fallback function
      const breaker = new CircuitBreaker({
        name: 'test-breaker',
        failureThreshold: 2,
        resetTimeout: 1000,
        fallback: () => 'fallback result'
      });
      
      // Fail enough times to open the circuit
      try { await breaker.execute(() => { throw new Error('Failure 1'); }); } catch (e) {}
      try { await breaker.execute(() => { throw new Error('Failure 2'); }); } catch (e) {}
      
      // Circuit should now be open
      assert.strictEqual(breaker.getState(), 'OPEN', 'Circuit should open after failures');
      
      // Execute should use fallback
      const result = await breaker.execute(() => 'should not execute');
      assert.strictEqual(result, 'fallback result', 'Should return fallback result when circuit is open');
      
      return true;
    }
  },
  {
    id: 'circuit_breaker_events',
    name: 'Circuit Breaker - Events',
    type: 'unit',
    tags: ['circuit_breaker', 'utility'],
    priority: 2,
    testFn: async () => {
      // Test circuit breaker events
      const breaker = new CircuitBreaker({
        name: 'test-breaker',
        failureThreshold: 2,
        resetTimeout: 100
      });
      
      const events = [];
      breaker.on('open', () => events.push('open'));
      breaker.on('close', () => events.push('close'));
      breaker.on('half-open', () => events.push('half-open'));
      breaker.on('success', () => events.push('success'));
      breaker.on('failure', () => events.push('failure'));
      
      // Successful operation
      await breaker.execute(() => 'success');
      
      // Fail enough times to open the circuit
      try { await breaker.execute(() => { throw new Error('Failure 1'); }); } catch (e) {}
      try { await breaker.execute(() => { throw new Error('Failure 2'); }); } catch (e) {}
      
      // Wait for reset timeout
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Successful operation to close the circuit
      await breaker.execute(() => 'success');
      
      // Check events
      assert(events.includes('success'), 'Should emit success event');
      assert(events.includes('failure'), 'Should emit failure event');
      assert(events.includes('open'), 'Should emit open event');
      assert(events.includes('half-open'), 'Should emit half-open event');
      assert(events.includes('close'), 'Should emit close event');
      
      return true;
    }
  }
];

module.exports = { tests }; 