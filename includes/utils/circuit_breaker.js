/**
 * @fileoverview Circuit Breaker for MarketAds Dataform
 * 
 * This module implements the circuit breaker pattern for error recovery.
 * It prevents cascading failures by failing fast when a service is unavailable.
 */

const { MarketAdsError } = require('../errors/error_types');

/**
 * Circuit breaker states
 */
const CIRCUIT_STATE = {
  CLOSED: 'CLOSED',     // Circuit is closed, requests are allowed
  OPEN: 'OPEN',         // Circuit is open, requests are not allowed
  HALF_OPEN: 'HALF_OPEN' // Circuit is half-open, limited requests are allowed
};

/**
 * CircuitBreakerError class for circuit breaker specific errors
 */
class CircuitBreakerError extends MarketAdsError {
  /**
   * Create a new CircuitBreakerError
   * @param {string} message - Error message
   * @param {Object} options - Error options
   */
  constructor(message, options = {}) {
    super(message, {
      ...options,
      code: options.code || 'CIRCUIT_OPEN',
      component: options.component || 'circuit-breaker'
    });
  }
}

/**
 * CircuitBreaker class implementing the circuit breaker pattern
 */
class CircuitBreaker {
  /**
   * Create a new CircuitBreaker
   * @param {Object} options - Circuit breaker options
   * @param {number} options.failureThreshold - Number of failures before opening circuit
   * @param {number} options.resetTimeoutMs - Time in milliseconds before trying to close circuit
   * @param {number} options.halfOpenSuccessThreshold - Number of successes in half-open state before closing circuit
   * @param {Function} options.fallbackFn - Fallback function to call when circuit is open
   * @param {Function} options.onStateChange - Callback for state changes
   * @param {Function} options.isFailure - Function to determine if a response is a failure
   * @param {string} options.name - Name of the circuit breaker
   */
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeoutMs = options.resetTimeoutMs || 30000;
    this.halfOpenSuccessThreshold = options.halfOpenSuccessThreshold || 1;
    this.fallbackFn = options.fallbackFn;
    this.onStateChange = options.onStateChange || (() => {});
    this.isFailure = options.isFailure || (error => !!error);
    this.name = options.name || 'default';
    
    this.state = CIRCUIT_STATE.CLOSED;
    this.failures = 0;
    this.successes = 0;
    this.lastFailureTime = 0;
    this.lastStateChangeTime = Date.now();
    this.totalRequests = 0;
    this.totalFailures = 0;
    this.consecutiveFailures = 0;
    this.totalSuccesses = 0;
    this.totalFallbacks = 0;
    this.totalTimeouts = 0;
  }

  /**
   * Execute a function with circuit breaker protection
   * @param {Function} fn - Function to execute
   * @param {...*} args - Arguments to pass to the function
   * @returns {Promise<*>} Promise resolving to the function result
   * @throws {CircuitBreakerError} If circuit is open
   */
  async execute(fn, ...args) {
    this.totalRequests++;
    
    // Check if circuit is open
    if (this.state === CIRCUIT_STATE.OPEN) {
      // Check if reset timeout has elapsed
      const now = Date.now();
      if (now - this.lastFailureTime >= this.resetTimeoutMs) {
        this.transitionState(CIRCUIT_STATE.HALF_OPEN);
      } else {
        return this.handleOpenCircuit(args);
      }
    }
    
    try {
      // Execute the function
      const result = await fn(...args);
      
      // Check if the result is a failure
      if (this.isFailure(null, result)) {
        return this.handleFailure(new Error('Function returned a failure result'), args);
      }
      
      // Handle success
      return this.handleSuccess(result);
    } catch (error) {
      // Handle failure
      return this.handleFailure(error, args);
    }
  }

  /**
   * Handle an open circuit
   * @param {Array} args - Arguments passed to the original function
   * @returns {Promise<*>} Promise resolving to the fallback result
   * @throws {CircuitBreakerError} If no fallback function is provided
   */
  async handleOpenCircuit(args) {
    this.totalFallbacks++;
    
    if (this.fallbackFn) {
      return this.fallbackFn(...args);
    }
    
    throw new CircuitBreakerError(`Circuit breaker '${this.name}' is open`, {
      context: {
        state: this.state,
        failures: this.failures,
        lastFailureTime: this.lastFailureTime,
        resetTimeoutMs: this.resetTimeoutMs,
        timeUntilReset: Math.max(0, this.resetTimeoutMs - (Date.now() - this.lastFailureTime))
      }
    });
  }

  /**
   * Handle a successful execution
   * @param {*} result - Result of the function execution
   * @returns {*} The result
   */
  handleSuccess(result) {
    this.totalSuccesses++;
    this.consecutiveFailures = 0;
    
    // If in half-open state, increment successes
    if (this.state === CIRCUIT_STATE.HALF_OPEN) {
      this.successes++;
      
      // If success threshold is reached, close the circuit
      if (this.successes >= this.halfOpenSuccessThreshold) {
        this.transitionState(CIRCUIT_STATE.CLOSED);
      }
    }
    
    return result;
  }

  /**
   * Handle a failed execution
   * @param {Error} error - Error from the function execution
   * @param {Array} args - Arguments passed to the original function
   * @returns {Promise<*>} Promise resolving to the fallback result
   * @throws {Error} The original error if no fallback is provided
   */
  async handleFailure(error, args) {
    this.failures++;
    this.totalFailures++;
    this.consecutiveFailures++;
    this.lastFailureTime = Date.now();
    
    // Check if error is a timeout
    if (error.code === 'TIMEOUT_ERROR' || error.name === 'TimeoutError') {
      this.totalTimeouts++;
    }
    
    // If in closed state and failure threshold is reached, open the circuit
    if (this.state === CIRCUIT_STATE.CLOSED && this.consecutiveFailures >= this.failureThreshold) {
      this.transitionState(CIRCUIT_STATE.OPEN);
    }
    
    // If in half-open state, open the circuit on any failure
    if (this.state === CIRCUIT_STATE.HALF_OPEN) {
      this.transitionState(CIRCUIT_STATE.OPEN);
    }
    
    // If circuit is open, use fallback
    if (this.state === CIRCUIT_STATE.OPEN) {
      return this.handleOpenCircuit(args);
    }
    
    // Otherwise, propagate the error
    throw error;
  }

  /**
   * Transition the circuit to a new state
   * @param {string} newState - New state
   */
  transitionState(newState) {
    const oldState = this.state;
    this.state = newState;
    this.lastStateChangeTime = Date.now();
    
    // Reset counters on state change
    if (newState === CIRCUIT_STATE.CLOSED) {
      this.failures = 0;
      this.consecutiveFailures = 0;
    } else if (newState === CIRCUIT_STATE.HALF_OPEN) {
      this.successes = 0;
    }
    
    // Call state change callback
    this.onStateChange({
      name: this.name,
      oldState,
      newState,
      lastFailureTime: this.lastFailureTime,
      failures: this.failures,
      totalRequests: this.totalRequests,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses,
      totalFallbacks: this.totalFallbacks,
      totalTimeouts: this.totalTimeouts
    });
  }

  /**
   * Get the current state of the circuit breaker
   * @returns {Object} Circuit breaker state
   */
  getState() {
    return {
      name: this.name,
      state: this.state,
      failures: this.failures,
      consecutiveFailures: this.consecutiveFailures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
      lastStateChangeTime: this.lastStateChangeTime,
      totalRequests: this.totalRequests,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses,
      totalFallbacks: this.totalFallbacks,
      totalTimeouts: this.totalTimeouts,
      timeUntilReset: this.state === CIRCUIT_STATE.OPEN ? 
        Math.max(0, this.resetTimeoutMs - (Date.now() - this.lastFailureTime)) : 0
    };
  }

  /**
   * Reset the circuit breaker to its initial state
   */
  reset() {
    this.transitionState(CIRCUIT_STATE.CLOSED);
    this.failures = 0;
    this.successes = 0;
    this.lastFailureTime = 0;
    this.consecutiveFailures = 0;
  }

  /**
   * Force the circuit breaker to open
   */
  forceOpen() {
    this.transitionState(CIRCUIT_STATE.OPEN);
  }

  /**
   * Force the circuit breaker to close
   */
  forceClose() {
    this.transitionState(CIRCUIT_STATE.CLOSED);
  }

  /**
   * Create a wrapped function with circuit breaker protection
   * @param {Function} fn - Function to wrap
   * @returns {Function} Wrapped function
   */
  wrap(fn) {
    return async (...args) => {
      return this.execute(fn, ...args);
    };
  }
}

/**
 * Create a circuit breaker
 * @param {Object} options - Circuit breaker options
 * @returns {CircuitBreaker} New circuit breaker
 */
function createCircuitBreaker(options = {}) {
  return new CircuitBreaker(options);
}

module.exports = {
  CIRCUIT_STATE,
  CircuitBreaker,
  CircuitBreakerError,
  createCircuitBreaker
}; 