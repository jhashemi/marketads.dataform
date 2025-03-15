/**
 * @fileoverview Error Handler for MarketAds Dataform
 * 
 * This module provides centralized error handling functionality for the MarketAds Dataform project.
 * It includes error wrapping, categorization, logging, and recovery mechanisms.
 */

const { MarketAdsError } = require('./error_types');

/**
 * ErrorHandler class for centralized error handling
 */
class ErrorHandler {
  /**
   * Create a new ErrorHandler
   * @param {Object} options - Configuration options
   * @param {Function} options.logger - Logger function
   * @param {boolean} options.captureStackTrace - Whether to capture stack traces
   * @param {boolean} options.logErrors - Whether to log errors
   * @param {Function} options.onError - Callback function for error events
   */
  constructor(options = {}) {
    this.logger = options.logger || console;
    this.captureStackTrace = options.captureStackTrace !== false;
    this.logErrors = options.logErrors !== false;
    this.onError = options.onError || (() => {});
    this.errorListeners = [];
  }

  /**
   * Handle an error
   * @param {Error} error - The error to handle
   * @param {Object} context - Additional context information
   * @returns {Error} The handled error
   */
  handleError(error, context = {}) {
    // Wrap non-MarketAdsError errors
    const wrappedError = this.wrapError(error, context);
    
    // Log the error if logging is enabled
    if (this.logErrors) {
      this.logError(wrappedError);
    }
    
    // Notify error listeners
    this.notifyErrorListeners(wrappedError);
    
    // Call the onError callback
    this.onError(wrappedError);
    
    return wrappedError;
  }

  /**
   * Wrap a standard Error in a MarketAdsError
   * @param {Error} error - The error to wrap
   * @param {Object} context - Additional context information
   * @returns {MarketAdsError} The wrapped error
   */
  wrapError(error, context = {}) {
    // If it's already a MarketAdsError, just add context
    if (error instanceof MarketAdsError) {
      error.context = { ...error.context, ...context };
      return error;
    }
    
    // Otherwise, wrap it in a MarketAdsError
    return new MarketAdsError(error.message, {
      cause: error,
      context,
      code: this.categorizeError(error)
    });
  }

  /**
   * Categorize an error based on its properties
   * @param {Error} error - The error to categorize
   * @returns {string} The error code
   */
  categorizeError(error) {
    // Check for common error types and assign appropriate codes
    if (error.name === 'SyntaxError') {
      return 'SYNTAX_ERROR';
    } else if (error.name === 'ReferenceError') {
      return 'REFERENCE_ERROR';
    } else if (error.name === 'TypeError') {
      return 'TYPE_ERROR';
    } else if (error.name === 'RangeError') {
      return 'RANGE_ERROR';
    } else if (error.code === 'ENOENT') {
      return 'FILE_NOT_FOUND';
    } else if (error.code === 'EACCES') {
      return 'PERMISSION_DENIED';
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ESOCKETTIMEDOUT') {
      return 'TIMEOUT_ERROR';
    } else if (error.code === 'ECONNREFUSED') {
      return 'CONNECTION_REFUSED';
    } else if (error.code === 'ECONNRESET') {
      return 'CONNECTION_RESET';
    } else if (error.code && error.code.startsWith('ERR_')) {
      return error.code;
    }
    
    return 'UNKNOWN_ERROR';
  }

  /**
   * Log an error
   * @param {Error} error - The error to log
   */
  logError(error) {
    const errorObj = error instanceof MarketAdsError ? error.toJSON() : {
      name: error.name,
      message: error.message,
      stack: error.stack
    };
    
    // Log based on severity
    if (error instanceof MarketAdsError && error.severity === 'CRITICAL') {
      this.logger.error('CRITICAL ERROR:', errorObj);
    } else if (error instanceof MarketAdsError && error.severity === 'WARNING') {
      this.logger.warn('WARNING:', errorObj);
    } else {
      this.logger.error('ERROR:', errorObj);
    }
  }

  /**
   * Add an error listener
   * @param {Function} listener - The listener function
   * @returns {Function} Function to remove the listener
   */
  addErrorListener(listener) {
    this.errorListeners.push(listener);
    
    // Return a function to remove the listener
    return () => {
      this.errorListeners = this.errorListeners.filter(l => l !== listener);
    };
  }

  /**
   * Notify all error listeners
   * @param {Error} error - The error to notify about
   */
  notifyErrorListeners(error) {
    this.errorListeners.forEach(listener => {
      try {
        listener(error);
      } catch (listenerError) {
        // Don't let listener errors propagate
        this.logger.error('Error in error listener:', listenerError);
      }
    });
  }

  /**
   * Create a safe version of a function that catches and handles errors
   * @param {Function} fn - The function to wrap
   * @param {Object} context - Additional context information
   * @returns {Function} The wrapped function
   */
  safeFn(fn, context = {}) {
    return async (...args) => {
      try {
        return await fn(...args);
      } catch (error) {
        return this.handleError(error, {
          ...context,
          arguments: args
        });
      }
    };
  }

  /**
   * Try to execute a function, handling any errors
   * @param {Function} fn - The function to execute
   * @param {Object} context - Additional context information
   * @returns {Object} Result object with success flag and value or error
   */
  tryExec(fn, context = {}) {
    try {
      const result = fn();
      return { success: true, value: result };
    } catch (error) {
      const handledError = this.handleError(error, context);
      return { success: false, error: handledError };
    }
  }

  /**
   * Try to execute an async function, handling any errors
   * @param {Function} fn - The async function to execute
   * @param {Object} context - Additional context information
   * @returns {Promise<Object>} Promise resolving to result object with success flag and value or error
   */
  async tryExecAsync(fn, context = {}) {
    try {
      const result = await fn();
      return { success: true, value: result };
    } catch (error) {
      const handledError = this.handleError(error, context);
      return { success: false, error: handledError };
    }
  }

  /**
   * Create a function that retries on error
   * @param {Function} fn - The function to retry
   * @param {Object} options - Retry options
   * @param {number} options.maxRetries - Maximum number of retries
   * @param {number} options.initialDelayMs - Initial delay in milliseconds
   * @param {number} options.maxDelayMs - Maximum delay in milliseconds
   * @param {Function} options.shouldRetry - Function to determine if retry should be attempted
   * @returns {Function} The retry function
   */
  retryFn(fn, options = {}) {
    const maxRetries = options.maxRetries || 3;
    const initialDelayMs = options.initialDelayMs || 1000;
    const maxDelayMs = options.maxDelayMs || 10000;
    const shouldRetry = options.shouldRetry || (() => true);
    
    return async (...args) => {
      let lastError;
      
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          return await fn(...args);
        } catch (error) {
          lastError = error;
          
          // Check if we should retry
          if (attempt >= maxRetries || !shouldRetry(error, attempt)) {
            break;
          }
          
          // Calculate delay with exponential backoff
          const delay = Math.min(initialDelayMs * Math.pow(2, attempt), maxDelayMs);
          
          // Log retry attempt
          this.logger.warn(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`, {
            error: error instanceof MarketAdsError ? error.toJSON() : {
              name: error.name,
              message: error.message
            }
          });
          
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
      
      // If we get here, all retries failed
      return this.handleError(lastError, {
        retryAttempts: maxRetries,
        arguments: args
      });
    };
  }

  /**
   * Create a circuit breaker for a function
   * @param {Function} fn - The function to protect with circuit breaker
   * @param {Object} options - Circuit breaker options
   * @param {number} options.failureThreshold - Number of failures before opening circuit
   * @param {number} options.resetTimeoutMs - Time in milliseconds before trying to close circuit
   * @param {Function} options.fallbackFn - Fallback function to call when circuit is open
   * @returns {Function} The circuit breaker function
   */
  circuitBreaker(fn, options = {}) {
    const failureThreshold = options.failureThreshold || 5;
    const resetTimeoutMs = options.resetTimeoutMs || 30000;
    const fallbackFn = options.fallbackFn;
    
    let failures = 0;
    let circuitOpen = false;
    let lastFailureTime = 0;
    
    return async (...args) => {
      // Check if circuit is open
      if (circuitOpen) {
        // Check if reset timeout has elapsed
        const now = Date.now();
        if (now - lastFailureTime >= resetTimeoutMs) {
          // Try to close circuit (half-open state)
          circuitOpen = false;
          failures = 0;
        } else if (fallbackFn) {
          // Use fallback function if available
          return fallbackFn(...args);
        } else {
          // Otherwise, throw circuit open error
          throw new MarketAdsError('Circuit breaker is open', {
            code: 'CIRCUIT_OPEN',
            component: 'circuit-breaker',
            context: {
              failureThreshold,
              resetTimeoutMs,
              lastFailureTime,
              timeSinceLastFailure: now - lastFailureTime
            }
          });
        }
      }
      
      try {
        // Try to execute the function
        const result = await fn(...args);
        
        // Reset failures on success
        failures = 0;
        
        return result;
      } catch (error) {
        // Increment failure count
        failures++;
        lastFailureTime = Date.now();
        
        // Open circuit if threshold is reached
        if (failures >= failureThreshold) {
          circuitOpen = true;
          this.logger.error('Circuit breaker opened', {
            failures,
            failureThreshold,
            resetTimeoutMs
          });
        }
        
        // Handle the error
        return this.handleError(error, {
          circuitBreakerState: {
            failures,
            circuitOpen,
            failureThreshold
          },
          arguments: args
        });
      }
    };
  }
}

// Create a default error handler instance
const defaultErrorHandler = new ErrorHandler();

module.exports = {
  ErrorHandler,
  defaultErrorHandler
}; 