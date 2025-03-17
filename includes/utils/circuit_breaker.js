/**
 * @fileoverview Circuit Breaker implementation for error handling
 * 
 * This module provides a circuit breaker pattern implementation to prevent
 * cascading failures and provide resilience to the system.
 */

const EventEmitter = require('events');
const { MarketAdsError } = require('../errors/error_types');

/**
 * Circuit states
 */
const CIRCUIT_STATES = {
  CLOSED: 'CLOSED',     // Normal operation, requests pass through
  OPEN: 'OPEN',         // Circuit is open, requests fail fast
  HALF_OPEN: 'HALF_OPEN' // Testing if the service is back to normal
};

/**
 * Error thrown when the circuit is open
 */
class CircuitBreakerError extends MarketAdsError {
  constructor(message, options = {}) {
    super(message, {
      code: 'CIRCUIT_OPEN',
      component: 'circuit_breaker',
      ...options
    });
    this.name = 'CircuitBreakerError';
  }
}

/**
 * Circuit Breaker implementation
 * 
 * Implements the circuit breaker pattern to prevent cascading failures
 * by failing fast when a service is unavailable.
 */
class CircuitBreaker extends EventEmitter {
  /**
   * Create a new circuit breaker
   * 
   * @param {Object} options - Circuit breaker options
   * @param {string} [options.name='default'] - Name of the circuit breaker
   * @param {number} [options.failureThreshold=3] - Number of failures before opening the circuit
   * @param {number} [options.resetTimeout=30000] - Time in ms before attempting to close the circuit
   * @param {number} [options.successThreshold=1] - Number of successes needed to close the circuit
   * @param {Function} [options.fallback] - Fallback function to call when circuit is open
   * @param {Function} [options.isFailure] - Function to determine if an error should count as a failure
   */
  constructor(options = {}) {
    super();
    
    this.name = options.name || 'default';
    this.failureThreshold = options.failureThreshold || 3;
    this.resetTimeout = options.resetTimeout || 30000;
    this.successThreshold = options.successThreshold || 1;
    this.fallback = options.fallback;
    this.isFailure = options.isFailure || (() => true);
    
    this.state = CIRCUIT_STATES.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;
    
    this._resetTimer = null;
  }
  
  /**
   * Get the current state of the circuit
   * @returns {string} Current circuit state
   */
  getState() {
    // If the circuit is open but the reset timeout has elapsed,
    // transition to half-open state
    if (this.state === CIRCUIT_STATES.OPEN && 
        this.nextAttemptTime && 
        Date.now() >= this.nextAttemptTime) {
      this._transitionToHalfOpen();
    }
    
    return this.state;
  }
  
  /**
   * Execute a function with circuit breaker protection
   * 
   * @param {Function} fn - Function to execute
   * @returns {Promise<*>} Result of the function
   * @throws {Error} Original error or CircuitBreakerError if circuit is open
   */
  async execute(fn) {
    const currentState = this.getState();
    
    // If circuit is open, fail fast or use fallback
    if (currentState === CIRCUIT_STATES.OPEN) {
      if (this.fallback) {
        return await this.fallback();
      }
      
      throw new CircuitBreakerError(`Circuit breaker is open for ${this.name}`, {
        nextAttemptTime: this.nextAttemptTime
      });
    }
    
    try {
      // Execute the function
      const result = await fn();
      
      // Handle success
      this._onSuccess();
      
      return result;
    } catch (error) {
      // Handle failure
      this._onFailure(error);
      
      // Re-throw the original error
      throw error;
    }
  }
  
  /**
   * Wrap a function with circuit breaker protection
   * 
   * @param {Function} fn - Function to wrap
   * @returns {Function} Wrapped function
   */
  wrap(fn) {
    return async (...args) => {
      return this.execute(() => fn(...args));
    };
  }
  
  /**
   * Force the circuit to open
   */
  forceOpen() {
    this._transitionToOpen();
  }
  
  /**
   * Force the circuit to close
   */
  forceClose() {
    this._transitionToClosed();
  }
  
  /**
   * Reset the circuit breaker to its initial state
   */
  reset() {
    this._clearTimer();
    this.state = CIRCUIT_STATES.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;
    this.emit('reset');
  }
  
  /**
   * Handle successful execution
   * @private
   */
  _onSuccess() {
    if (this.state === CIRCUIT_STATES.HALF_OPEN) {
      this.successCount++;
      
      if (this.successCount >= this.successThreshold) {
        this._transitionToClosed();
      }
    } else if (this.state === CIRCUIT_STATES.CLOSED) {
      // Reset failure count on success in closed state
      this.failureCount = 0;
      this.successCount++;
    }
    
    this.emit('success');
  }
  
  /**
   * Handle failed execution
   * @param {Error} error - The error that occurred
   * @private
   */
  _onFailure(error) {
    if (this.isFailure(error)) {
      this.lastFailureTime = Date.now();
      
      if (this.state === CIRCUIT_STATES.CLOSED) {
        this.failureCount++;
        
        if (this.failureCount >= this.failureThreshold) {
          this._transitionToOpen();
        }
      } else if (this.state === CIRCUIT_STATES.HALF_OPEN) {
        this._transitionToOpen();
      }
      
      this.emit('failure', error);
    }
  }
  
  /**
   * Transition to open state
   * @private
   */
  _transitionToOpen() {
    if (this.state !== CIRCUIT_STATES.OPEN) {
      this._clearTimer();
      this.state = CIRCUIT_STATES.OPEN;
      this.nextAttemptTime = Date.now() + this.resetTimeout;
      
      // Set timer to transition to half-open
      this._resetTimer = setTimeout(() => {
        this._transitionToHalfOpen();
      }, this.resetTimeout);
      
      this.emit('open');
    }
  }
  
  /**
   * Transition to half-open state
   * @private
   */
  _transitionToHalfOpen() {
    if (this.state === CIRCUIT_STATES.OPEN) {
      this._clearTimer();
      this.state = CIRCUIT_STATES.HALF_OPEN;
      this.successCount = 0;
      this.emit('half-open');
    }
  }
  
  /**
   * Transition to closed state
   * @private
   */
  _transitionToClosed() {
    this._clearTimer();
    this.state = CIRCUIT_STATES.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttemptTime = null;
    this.emit('close');
  }
  
  /**
   * Clear the reset timer
   * @private
   */
  _clearTimer() {
    if (this._resetTimer) {
      clearTimeout(this._resetTimer);
      this._resetTimer = null;
    }
  }
}

module.exports = {
  CIRCUIT_STATES,
  CircuitBreakerError,
  CircuitBreaker
}; 