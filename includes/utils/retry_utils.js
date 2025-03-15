/**
 * @fileoverview Retry Utilities for MarketAds Dataform
 * 
 * This module provides retry functionality for error recovery.
 * It includes exponential backoff, jitter, and configurable retry strategies.
 */

const { TimeoutError } = require('../errors/error_types');

/**
 * Retry strategies
 */
const RETRY_STRATEGIES = {
  /**
   * Exponential backoff strategy
   * @param {number} attempt - Current attempt number (0-based)
   * @param {number} initialDelayMs - Initial delay in milliseconds
   * @param {number} maxDelayMs - Maximum delay in milliseconds
   * @returns {number} Delay in milliseconds
   */
  EXPONENTIAL: (attempt, initialDelayMs, maxDelayMs) => {
    return Math.min(initialDelayMs * Math.pow(2, attempt), maxDelayMs);
  },
  
  /**
   * Linear backoff strategy
   * @param {number} attempt - Current attempt number (0-based)
   * @param {number} initialDelayMs - Initial delay in milliseconds
   * @param {number} maxDelayMs - Maximum delay in milliseconds
   * @returns {number} Delay in milliseconds
   */
  LINEAR: (attempt, initialDelayMs, maxDelayMs) => {
    return Math.min(initialDelayMs * (attempt + 1), maxDelayMs);
  },
  
  /**
   * Fixed delay strategy
   * @param {number} attempt - Current attempt number (0-based)
   * @param {number} initialDelayMs - Initial delay in milliseconds
   * @returns {number} Delay in milliseconds
   */
  FIXED: (attempt, initialDelayMs) => {
    return initialDelayMs;
  }
};

/**
 * Add jitter to a delay to prevent thundering herd problem
 * @param {number} delay - Base delay in milliseconds
 * @param {number} jitterFactor - Jitter factor (0-1)
 * @returns {number} Delay with jitter in milliseconds
 */
function addJitter(delay, jitterFactor = 0.1) {
  const jitter = delay * jitterFactor;
  return delay + (Math.random() * jitter * 2) - jitter;
}

/**
 * Wait for a specified time
 * @param {number} delayMs - Delay in milliseconds
 * @returns {Promise<void>} Promise that resolves after the delay
 */
function wait(delayMs) {
  return new Promise(resolve => setTimeout(resolve, delayMs));
}

/**
 * Retry a function with configurable retry strategy
 * @param {Function} fn - Function to retry
 * @param {Object} options - Retry options
 * @param {number} options.maxRetries - Maximum number of retries
 * @param {number} options.initialDelayMs - Initial delay in milliseconds
 * @param {number} options.maxDelayMs - Maximum delay in milliseconds
 * @param {Function} options.retryStrategy - Retry strategy function
 * @param {Function} options.shouldRetry - Function to determine if retry should be attempted
 * @param {number} options.jitterFactor - Jitter factor (0-1)
 * @param {Function} options.onRetry - Function called before each retry
 * @param {number} options.timeoutMs - Timeout in milliseconds
 * @returns {Promise<*>} Promise resolving to the function result
 */
async function retry(fn, options = {}) {
  const maxRetries = options.maxRetries || 3;
  const initialDelayMs = options.initialDelayMs || 1000;
  const maxDelayMs = options.maxDelayMs || 30000;
  const retryStrategy = options.retryStrategy || RETRY_STRATEGIES.EXPONENTIAL;
  const shouldRetry = options.shouldRetry || (() => true);
  const jitterFactor = options.jitterFactor || 0.1;
  const onRetry = options.onRetry || (() => {});
  const timeoutMs = options.timeoutMs;
  
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // If timeout is specified, wrap the function in a timeout
      if (timeoutMs) {
        return await withTimeout(fn, timeoutMs);
      } else {
        return await fn();
      }
    } catch (error) {
      lastError = error;
      
      // Check if we should retry
      if (attempt >= maxRetries || !shouldRetry(error, attempt)) {
        break;
      }
      
      // Calculate delay with strategy and jitter
      const baseDelay = retryStrategy(attempt, initialDelayMs, maxDelayMs);
      const delay = addJitter(baseDelay, jitterFactor);
      
      // Call onRetry callback
      onRetry(error, attempt, delay);
      
      // Wait before retrying
      await wait(delay);
    }
  }
  
  // If we get here, all retries failed
  throw lastError;
}

/**
 * Execute a function with a timeout
 * @param {Function} fn - Function to execute
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Promise<*>} Promise resolving to the function result
 * @throws {TimeoutError} If the function times out
 */
async function withTimeout(fn, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new TimeoutError(`Operation timed out after ${timeoutMs}ms`, {
        timeoutMs,
        operation: fn.name || 'anonymous'
      }));
    }, timeoutMs);
    
    Promise.resolve(fn())
      .then(result => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch(error => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

/**
 * Create a retryable version of a function
 * @param {Function} fn - Function to make retryable
 * @param {Object} options - Retry options
 * @returns {Function} Retryable function
 */
function retryable(fn, options = {}) {
  return async (...args) => {
    return retry(() => fn(...args), options);
  };
}

/**
 * Create a function that retries only specific errors
 * @param {Function} fn - Function to make retryable
 * @param {Array<Function|string>} errorTypes - Error types to retry
 * @param {Object} options - Retry options
 * @returns {Function} Retryable function
 */
function retryableForErrors(fn, errorTypes, options = {}) {
  const shouldRetry = (error, attempt) => {
    return errorTypes.some(errorType => {
      if (typeof errorType === 'string') {
        return error.name === errorType || error.code === errorType;
      } else {
        return error instanceof errorType;
      }
    });
  };
  
  return retryable(fn, {
    ...options,
    shouldRetry
  });
}

/**
 * Create a function that retries network errors
 * @param {Function} fn - Function to make retryable
 * @param {Object} options - Retry options
 * @returns {Function} Retryable function
 */
function retryableForNetworkErrors(fn, options = {}) {
  const networkErrorCodes = [
    'ECONNRESET',
    'ECONNREFUSED',
    'ETIMEDOUT',
    'ESOCKETTIMEDOUT',
    'ENOTFOUND',
    'ENETUNREACH',
    'EHOSTUNREACH',
    'EPIPE'
  ];
  
  const shouldRetry = (error, attempt) => {
    return networkErrorCodes.includes(error.code) ||
           error.name === 'FetchError' ||
           error.message.includes('network') ||
           error.message.includes('connection');
  };
  
  return retryable(fn, {
    ...options,
    shouldRetry
  });
}

/**
 * Create a function that retries BigQuery errors
 * @param {Function} fn - Function to make retryable
 * @param {Object} options - Retry options
 * @returns {Function} Retryable function
 */
function retryableForBigQueryErrors(fn, options = {}) {
  const retryableBigQueryErrors = [
    'rateLimitExceeded',
    'backendError',
    'internalError',
    'quotaExceeded',
    'resourcesExceeded',
    'resourceInUse',
    'resourceUnavailable',
    'responseTooLarge',
    'timeout'
  ];
  
  const shouldRetry = (error, attempt) => {
    if (error.name === 'BigQueryError' || error.code === 'BIGQUERY_ERROR') {
      return retryableBigQueryErrors.includes(error.reason);
    }
    
    return false;
  };
  
  return retryable(fn, {
    ...options,
    shouldRetry
  });
}

module.exports = {
  RETRY_STRATEGIES,
  retry,
  retryable,
  retryableForErrors,
  retryableForNetworkErrors,
  retryableForBigQueryErrors,
  withTimeout,
  wait,
  addJitter
}; 