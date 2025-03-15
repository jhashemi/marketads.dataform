/**
 * @fileoverview Fallback Utilities for MarketAds Dataform
 * 
 * This module provides utilities for implementing graceful degradation
 * when services or operations fail.
 */

/**
 * Execute a function with a fallback if it fails
 * @param {Function} primaryFn - Primary function to execute
 * @param {Function} fallbackFn - Fallback function to execute if primary fails
 * @param {Object} options - Options
 * @param {Function} options.shouldFallback - Function to determine if fallback should be used
 * @param {Function} options.onFallback - Function called when fallback is used
 * @returns {Promise<*>} Promise resolving to the result of either function
 */
async function withFallback(primaryFn, fallbackFn, options = {}) {
  const shouldFallback = options.shouldFallback || (() => true);
  const onFallback = options.onFallback || (() => {});
  
  try {
    return await primaryFn();
  } catch (error) {
    if (shouldFallback(error)) {
      onFallback(error);
      return fallbackFn();
    }
    throw error;
  }
}

/**
 * Execute a function with multiple fallbacks in sequence
 * @param {Array<Function>} fns - Array of functions to try in sequence
 * @param {Object} options - Options
 * @param {Function} options.shouldFallback - Function to determine if fallback should be used
 * @param {Function} options.onFallback - Function called when fallback is used
 * @returns {Promise<*>} Promise resolving to the result of the first successful function
 * @throws {Error} If all functions fail
 */
async function withFallbackChain(fns, options = {}) {
  const shouldFallback = options.shouldFallback || (() => true);
  const onFallback = options.onFallback || (() => {});
  
  let lastError;
  
  for (let i = 0; i < fns.length; i++) {
    try {
      return await fns[i]();
    } catch (error) {
      lastError = error;
      
      if (i < fns.length - 1 && shouldFallback(error, i)) {
        onFallback(error, i);
        continue;
      }
      
      throw error;
    }
  }
  
  // This should never be reached, but just in case
  throw lastError;
}

/**
 * Create a function that returns a default value if the original function fails
 * @param {Function} fn - Function to execute
 * @param {*} defaultValue - Default value to return if function fails
 * @param {Object} options - Options
 * @param {Function} options.shouldUseDefault - Function to determine if default should be used
 * @param {Function} options.onUseDefault - Function called when default is used
 * @returns {Function} Function that returns default value on failure
 */
function withDefault(fn, defaultValue, options = {}) {
  const shouldUseDefault = options.shouldUseDefault || (() => true);
  const onUseDefault = options.onUseDefault || (() => {});
  
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      if (shouldUseDefault(error)) {
        onUseDefault(error);
        return typeof defaultValue === 'function' ? defaultValue(error, ...args) : defaultValue;
      }
      throw error;
    }
  };
}

/**
 * Create a function that returns cached data if the original function fails
 * @param {Function} fn - Function to execute
 * @param {Function} getCachedData - Function to get cached data
 * @param {Object} options - Options
 * @param {Function} options.shouldUseCache - Function to determine if cache should be used
 * @param {Function} options.onUseCache - Function called when cache is used
 * @returns {Function} Function that returns cached data on failure
 */
function withCache(fn, getCachedData, options = {}) {
  const shouldUseCache = options.shouldUseCache || (() => true);
  const onUseCache = options.onUseCache || (() => {});
  
  return async (...args) => {
    try {
      const result = await fn(...args);
      return result;
    } catch (error) {
      if (shouldUseCache(error)) {
        onUseCache(error);
        return getCachedData(...args);
      }
      throw error;
    }
  };
}

/**
 * Create a function that degrades gracefully by trying progressively simpler alternatives
 * @param {Array<{fn: Function, weight: number}>} alternatives - Array of alternative functions with weights
 * @param {Object} options - Options
 * @param {Function} options.shouldDegrade - Function to determine if degradation should occur
 * @param {Function} options.onDegrade - Function called when degradation occurs
 * @returns {Function} Function that degrades gracefully
 */
function withGracefulDegradation(alternatives, options = {}) {
  const shouldDegrade = options.shouldDegrade || (() => true);
  const onDegrade = options.onDegrade || (() => {});
  
  // Sort alternatives by weight (highest first)
  const sortedAlternatives = [...alternatives].sort((a, b) => b.weight - a.weight);
  
  return async (...args) => {
    let lastError;
    
    for (let i = 0; i < sortedAlternatives.length; i++) {
      try {
        return await sortedAlternatives[i].fn(...args);
      } catch (error) {
        lastError = error;
        
        if (i < sortedAlternatives.length - 1 && shouldDegrade(error, i)) {
          onDegrade(error, i, sortedAlternatives[i].weight, sortedAlternatives[i+1].weight);
          continue;
        }
        
        throw error;
      }
    }
    
    // This should never be reached, but just in case
    throw lastError;
  };
}

/**
 * Create a function that executes in read-only mode if write operations fail
 * @param {Function} writeFn - Function that performs write operations
 * @param {Function} readFn - Function that performs read-only operations
 * @param {Object} options - Options
 * @param {Function} options.isWriteError - Function to determine if error is write-related
 * @param {Function} options.onFallbackToReadOnly - Function called when falling back to read-only
 * @returns {Function} Function that falls back to read-only mode
 */
function withReadOnlyFallback(writeFn, readFn, options = {}) {
  const isWriteError = options.isWriteError || (() => true);
  const onFallbackToReadOnly = options.onFallbackToReadOnly || (() => {});
  
  return async (...args) => {
    try {
      return await writeFn(...args);
    } catch (error) {
      if (isWriteError(error)) {
        onFallbackToReadOnly(error);
        return readFn(...args);
      }
      throw error;
    }
  };
}

/**
 * Create a function that falls back to a simpler implementation for large inputs
 * @param {Function} complexFn - Complex implementation for small inputs
 * @param {Function} simpleFn - Simple implementation for large inputs
 * @param {Function} isLargeInput - Function to determine if input is large
 * @param {Object} options - Options
 * @param {Function} options.onFallbackToSimple - Function called when falling back to simple implementation
 * @returns {Function} Function that falls back to simple implementation for large inputs
 */
function withSizeFallback(complexFn, simpleFn, isLargeInput, options = {}) {
  const onFallbackToSimple = options.onFallbackToSimple || (() => {});
  
  return async (...args) => {
    if (isLargeInput(...args)) {
      onFallbackToSimple(...args);
      return simpleFn(...args);
    }
    
    try {
      return await complexFn(...args);
    } catch (error) {
      // If complex implementation fails, try simple implementation
      onFallbackToSimple(...args, error);
      return simpleFn(...args);
    }
  };
}

/**
 * Create a function that falls back to partial results if full results cannot be obtained
 * @param {Function} fullFn - Function that returns full results
 * @param {Function} partialFn - Function that returns partial results
 * @param {Object} options - Options
 * @param {Function} options.shouldFallbackToPartial - Function to determine if partial results should be used
 * @param {Function} options.onFallbackToPartial - Function called when falling back to partial results
 * @returns {Function} Function that falls back to partial results
 */
function withPartialResults(fullFn, partialFn, options = {}) {
  const shouldFallbackToPartial = options.shouldFallbackToPartial || (() => true);
  const onFallbackToPartial = options.onFallbackToPartial || (() => {});
  
  return async (...args) => {
    try {
      return await fullFn(...args);
    } catch (error) {
      if (shouldFallbackToPartial(error)) {
        onFallbackToPartial(error);
        return partialFn(...args);
      }
      throw error;
    }
  };
}

module.exports = {
  withFallback,
  withFallbackChain,
  withDefault,
  withCache,
  withGracefulDegradation,
  withReadOnlyFallback,
  withSizeFallback,
  withPartialResults
}; 