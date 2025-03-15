/**
 * @fileoverview Error Handler for MarketAds Dataform
 * 
 * This module provides centralized error handling functionality for the MarketAds Dataform project.
 * It includes error wrapping, categorization, logging, and recovery mechanisms.
 */

const { MarketAdsError } = require('./error_types');
const { ValidationError } = require('./validation_error');

/**
 * ErrorHandler class for centralized error handling
 */
class ErrorHandler {
  /**
   * Create a new ErrorHandler
   * @param {Object} options - Configuration options
   * @param {Function} options.logger - Custom logger function
   * @param {Function} options.classifier - Custom error classifier function
   * @param {Function} options.transformer - Custom error transformer function
   */
  constructor(options = {}) {
    this.logger = options.logger;
    this.classifier = options.classifier;
    this.transformer = options.transformer;
  }

  /**
   * Handle an error
   * @param {Error} error - The error to handle
   * @param {Function} callback - Optional callback function to receive the error
   * @returns {Error} The handled error
   */
  handle(error, callback) {
    // Transform the error if needed
    const transformedError = this.transform(error);
    
    // Log the error
    this.log(transformedError);
    
    // Call the callback if provided
    if (typeof callback === 'function') {
      callback(transformedError);
    }
    
    return transformedError;
  }

  /**
   * Transform an error into a MarketAdsError if needed
   * @param {Error} error - The error to transform
   * @returns {Error} The transformed error
   */
  transform(error) {
    // If a custom transformer is provided, use it
    if (typeof this.transformer === 'function') {
      return this.transformer(error);
    }
    
    // If it's already a MarketAdsError, return it as is
    if (error instanceof MarketAdsError) {
      return error;
    }
    
    // Otherwise, wrap it in a MarketAdsError
    return new MarketAdsError(error.message, {
      cause: error,
      code: this.classify(error)
    });
  }

  /**
   * Classify an error to determine its type
   * @param {Error} error - The error to classify
   * @returns {string} The error classification
   */
  classify(error) {
    if (typeof this.classifier === 'function') {
      return this.classifier(error);
    }

    if (error instanceof ValidationError) {
      return 'VALIDATION';
    } else if (error instanceof MarketAdsError) {
      return 'MARKETADS';
    } else if (error.name === 'DataformError') {
      return 'DATAFORM';
    } else if (error.name === 'BigQueryError') {
      return 'BIGQUERY';
    }

    return 'UNKNOWN';
  }

  /**
   * Log an error
   * @param {Error} error - The error to log
   */
  log(error) {
    // If a custom logger is provided, use it
    if (typeof this.logger === 'function') {
      this.logger(error);
      return;
    }
    
    // Default logging based on severity
    if (error instanceof MarketAdsError) {
      const severity = error.severity || 'ERROR';
      
      if (severity === 'ERROR') {
        console.error(error);
      } else if (severity === 'WARNING') {
        console.warn(error);
      } else if (severity === 'INFO') {
        console.info(error);
      } else {
        console.error(error);
      }
    } else {
      console.error(error);
    }
  }

  /**
   * Wrap a function to safely handle errors
   * @param {Function} fn - The function to wrap
   * @param {*} fallback - Fallback value to return on error
   * @param {Function} errorCallback - Callback to receive errors
   * @returns {Function} The wrapped function
   */
  wrapSafe(fn, fallback = null, errorCallback) {
    return function(...args) {
      try {
        const result = fn(...args);
        
        // Handle promises
        if (result && typeof result.then === 'function') {
          return result.catch(error => {
            this.handle(error, errorCallback);
            return fallback;
          });
        }
        
        return result;
      } catch (error) {
        this.handle(error, errorCallback);
        return fallback;
      }
    }.bind(this);
  }

  /**
   * Create a function that retries on error
   * @param {Function} fn - The function to retry
   * @param {Object} options - Retry options
   * @param {number} options.maxRetries - Maximum number of retries
   * @param {number} options.delay - Initial delay in milliseconds
   * @param {number} options.backoffFactor - Backoff factor for exponential delay
   * @param {Function} options.retryCondition - Function to determine if retry should be attempted
   * @returns {Function} The retry function
   */
  retry(fn, options = {}) {
    const maxRetries = options.maxRetries || 3;
    const delay = options.delay || 1000;
    const backoffFactor = options.backoffFactor || 2;
    const retryCondition = options.retryCondition || (() => true);
    
    return async (...args) => {
      let lastError;
      let attempt = 0;
      
      while (attempt <= maxRetries) {
        try {
          return await fn(...args);
        } catch (error) {
          lastError = error;
          
          // Check if we should retry
          if (attempt >= maxRetries || !retryCondition(error)) {
            break;
          }
          
          // Calculate delay with exponential backoff
          const retryDelay = delay * Math.pow(backoffFactor, attempt);
          
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          
          attempt++;
        }
      }
      
      // If we get here, all retries failed
      throw lastError;
    };
  }

  /**
   * Create a circuit breaker for a function
   * @param {Function} fn - The function to protect with circuit breaker
   * @param {Object} options - Circuit breaker options
   * @param {number} options.failureThreshold - Number of failures before opening circuit
   * @param {number} options.resetTimeout - Time in ms before attempting to close circuit
   * @param {Function|*} options.fallback - Fallback function or value to use when circuit is open
   * @returns {Function} The protected function
   */
  withCircuitBreaker(fn, options = {}) {
    const failureThreshold = options.failureThreshold || 5;
    const resetTimeout = options.resetTimeout || 30000;
    const fallback = options.fallback;
    
    // Circuit state
    let failures = 0;
    let circuitOpen = false;
    let lastFailureTime = null;
    
    return async (...args) => {
      // Check if circuit is open
      if (circuitOpen) {
        // Check if we should try to reset (half-open state)
        const now = Date.now();
        if (lastFailureTime && (now - lastFailureTime) > resetTimeout) {
          // Allow one request through to test the service
          circuitOpen = false;
        } else {
          // Circuit is still open
          if (typeof fallback === 'function') {
            return fallback(...args);
          } else if (fallback !== undefined) {
            return fallback;
          }
          throw new MarketAdsError('Circuit breaker is open - service unavailable', {
            code: 'CIRCUIT_OPEN',
            severity: 'ERROR'
          });
        }
      }
      
      try {
        // Call the function
        const result = await fn(...args);
        
        // Success - reset failure count
        failures = 0;
        
        return result;
      } catch (error) {
        // Increment failure count
        failures++;
        lastFailureTime = Date.now();
        
        // Check if we should open the circuit
        if (failures >= failureThreshold) {
          circuitOpen = true;
        }
        
        // Re-throw the error
        throw error;
      }
    };
  }
}

module.exports = { ErrorHandler }; 