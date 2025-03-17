/**
 * @fileoverview Fallback utilities for error recovery
 * 
 * This module provides utilities for implementing fallback mechanisms
 * to handle errors gracefully and provide alternative behavior when
 * operations fail.
 */

/**
 * Wraps a function with a fallback mechanism
 * 
 * @param {Function} fn - The original function to execute
 * @param {Function} fallbackFn - The fallback function to execute if the original function fails
 * @param {Object} options - Options for the fallback behavior
 * @param {boolean} [options.passError=false] - Whether to pass the error to the fallback function
 * @param {Function} [options.shouldFallback] - Function to determine if fallback should be used
 * @param {Function} [options.onError] - Function to call when an error occurs
 * @returns {Function} A wrapped function that will use the fallback if the original fails
 */
function withFallback(fn, fallbackFn, options = {}) {
  const { passError = false, shouldFallback = () => true, onError } = options;
  
  return function(...args) {
    try {
      const result = fn.apply(this, args);
      
      // Handle promises
      if (result instanceof Promise) {
        return result.catch(error => {
          if (shouldFallback(error)) {
            if (onError) {
              onError(error);
            }
            
            return passError ? 
              fallbackFn.call(this, error, ...args) : 
              fallbackFn.apply(this, args);
          }
          
          throw error;
        });
      }
      
      return result;
    } catch (error) {
      if (shouldFallback(error)) {
        if (onError) {
          onError(error);
        }
        
        return passError ? 
          fallbackFn.call(this, error, ...args) : 
          fallbackFn.apply(this, args);
      }
      
      throw error;
    }
  };
}

/**
 * Creates a fallback function that returns a default value
 * 
 * @param {*} fallbackValue - The value to return as fallback
 * @returns {Function} A function that returns the fallback value
 */
function createFallbackFunction(fallbackValue) {
  return function() {
    return fallbackValue;
  };
}

/**
 * Executes a chain of functions, falling back to the next one if the previous fails
 * 
 * @param {Array<Function>} fns - Array of functions to try in order
 * @param {Object} options - Options for the fallback chain
 * @param {Function} [options.onFallback] - Function to call when falling back to the next function
 * @returns {Promise<*>} Result of the first successful function
 * @throws {Error} The last error if all functions fail
 */
async function fallbackChain(fns, options = {}) {
  const { onFallback } = options;
  let lastError;
  
  for (let i = 0; i < fns.length; i++) {
    try {
      return await fns[i]();
    } catch (error) {
      lastError = error;
      
      if (onFallback) {
        onFallback(error, i);
      }
    }
  }
  
  throw lastError;
}

/**
 * Executes a function with a default value fallback
 * 
 * @param {Function} fn - The function to execute
 * @param {*} defaultValue - The default value to return if the function fails
 * @param {Object} options - Options for the default value fallback
 * @param {Function} [options.shouldUseDefault] - Function to determine if default should be used
 * @returns {Promise<*>} Result of the function or the default value
 */
async function withDefault(fn, defaultValue, options = {}) {
  const { shouldUseDefault = () => true } = options;
  
  try {
    return await fn();
  } catch (error) {
    if (shouldUseDefault(error)) {
      return defaultValue;
    }
    
    throw error;
  }
}

/**
 * Executes a function with a cached value fallback
 * 
 * @param {Function} fn - The function to execute
 * @param {Function} getCachedValue - Function to get the cached value
 * @param {Object} options - Options for the cache fallback
 * @param {Function} [options.shouldUseCache] - Function to determine if cache should be used
 * @param {Function} [options.onCacheUsed] - Function to call when cache is used
 * @returns {Promise<*>} Result of the function or the cached value
 */
async function withCache(fn, getCachedValue, options = {}) {
  const { shouldUseCache = () => true, onCacheUsed } = options;
  
  try {
    return await fn();
  } catch (error) {
    if (shouldUseCache(error)) {
      const cachedValue = getCachedValue();
      
      if (onCacheUsed) {
        onCacheUsed(error, cachedValue);
      }
      
      return cachedValue;
    }
    
    throw error;
  }
}

module.exports = {
  withFallback,
  createFallbackFunction,
  fallbackChain,
  withDefault,
  withCache
}; 