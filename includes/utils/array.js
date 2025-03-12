/**
 * Array Utilities
 * 
 * This module provides array manipulation utilities used throughout the application.
 * It follows the Separation of Concerns principle by isolating array-related functionality.
 */

/**
 * Chunks an array into smaller arrays of a specified size
 * @param {Array} array - The array to be chunked
 * @param {number} [size=1] - The size of each chunk
 * @returns {Array[]} Array of chunked arrays
 */
function chunk(array, size = 1) {
  if (!Array.isArray(array) || array.length === 0) {
    return [];
  }
  
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  
  return chunks;
}

/**
 * Returns the difference between two arrays
 * @param {Array} array - The array to inspect
 * @param {Array} values - The values to exclude
 * @returns {Array} A new array of filtered values
 */
function difference(array, values) {
  if (!Array.isArray(array)) {
    return [];
  }
  
  if (!Array.isArray(values) || values.length === 0) {
    return [...array];
  }
  
  const valueSet = new Set(values);
  return array.filter(item => !valueSet.has(item));
}

/**
 * Creates an array with all falsey values removed
 * @param {Array} array - The array to compact
 * @returns {Array} The new array of filtered values
 */
function compact(array) {
  if (!Array.isArray(array)) {
    return [];
  }
  
  return array.filter(Boolean);
}

/**
 * Creates a duplicate-free version of an array
 * @param {Array} array - The array to inspect
 * @returns {Array} The new duplicate-free array
 */
function uniq(array) {
  if (!Array.isArray(array)) {
    return [];
  }
  
  return [...new Set(array)];
}

/**
 * Flattens an array a single level deep
 * @param {Array} array - The array to flatten
 * @returns {Array} The new flattened array
 */
function flatten(array) {
  if (!Array.isArray(array)) {
    return [];
  }
  
  return array.reduce((result, item) => {
    if (Array.isArray(item)) {
      result.push(...item);
    } else {
      result.push(item);
    }
    return result;
  }, []);
}

/**
 * Recursively flattens an array
 * @param {Array} array - The array to deep flatten
 * @returns {Array} The new flattened array
 */
function flattenDeep(array) {
  if (!Array.isArray(array)) {
    return [];
  }
  
  return array.reduce((result, item) => {
    if (Array.isArray(item)) {
      result.push(...flattenDeep(item));
    } else {
      result.push(item);
    }
    return result;
  }, []);
}

/**
 * Creates an object composed of keys generated from the results of running 
 * each element of the array through the iteratee function
 * @param {Array} array - The array to iterate over
 * @param {Function} iteratee - The function invoked per iteration
 * @returns {Object} The composed aggregate object
 */
function groupBy(array, iteratee) {
  if (!Array.isArray(array) || typeof iteratee !== 'function') {
    return {};
  }
  
  return array.reduce((result, item) => {
    const key = iteratee(item);
    if (!result[key]) {
      result[key] = [];
    }
    result[key].push(item);
    return result;
  }, {});
}

/**
 * Gets the intersection of two arrays
 * @param {Array} array - The array to compare
 * @param {Array} values - The array to intersect with
 * @returns {Array} The array of intersecting values
 */
function intersection(array, values) {
  if (!Array.isArray(array) || !Array.isArray(values)) {
    return [];
  }
  
  const valueSet = new Set(values);
  return array.filter(item => valueSet.has(item));
}

/**
 * Creates an array of elements split into groups based on a predicate
 * @param {Array} array - The array to process
 * @param {Function} predicate - The function invoked per iteration
 * @returns {Array[]} Returns the array of grouped elements
 */
function partition(array, predicate) {
  if (!Array.isArray(array) || typeof predicate !== 'function') {
    return [[], []];
  }
  
  return array.reduce(
    (result, item) => {
      result[predicate(item) ? 0 : 1].push(item);
      return result;
    },
    [[], []]
  );
}

/**
 * Creates an array of shuffled values
 * @param {Array} array - The array to shuffle
 * @returns {Array} Returns the new shuffled array
 */
function shuffle(array) {
  if (!Array.isArray(array)) {
    return [];
  }
  
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  
  return result;
}

/**
 * Gets all but the first element of an array
 * @param {Array} array - The array to query
 * @returns {Array} Returns the slice of array
 */
function tail(array) {
  if (!Array.isArray(array) || array.length === 0) {
    return [];
  }
  
  return array.slice(1);
}

/**
 * Gets all but the last element of an array
 * @param {Array} array - The array to query
 * @returns {Array} Returns the slice of array
 */
function initial(array) {
  if (!Array.isArray(array) || array.length === 0) {
    return [];
  }
  
  return array.slice(0, -1);
}

/**
 * Gets the last element of an array
 * @param {Array} array - The array to query
 * @returns {*} Returns the last element
 */
function last(array) {
  if (!Array.isArray(array) || array.length === 0) {
    return undefined;
  }
  
  return array[array.length - 1];
}

/**
 * Gets the first element of an array
 * @param {Array} array - The array to query
 * @returns {*} Returns the first element
 */
function first(array) {
  if (!Array.isArray(array) || array.length === 0) {
    return undefined;
  }
  
  return array[0];
}

/**
 * Creates a duplicate-free version of an array by a specified comparator
 * @param {Array} array - The array to inspect
 * @param {Function} [comparator] - The comparator invoked per element
 * @returns {Array} Returns the new duplicate-free array
 */
function uniqBy(array, comparator) {
  if (!Array.isArray(array)) {
    return [];
  }
  
  if (typeof comparator !== 'function') {
    return uniq(array);
  }
  
  const seen = new Map();
  return array.filter(item => {
    const key = comparator(item);
    if (seen.has(key)) {
      return false;
    }
    seen.set(key, true);
    return true;
  });
}

/**
 * Counts occurrences of each value in an array
 * @param {Array} array - The array to analyze
 * @returns {Object} Object with counts keyed by value
 */
function countBy(array) {
  if (!Array.isArray(array)) {
    return {};
  }
  
  return array.reduce((result, item) => {
    const key = String(item);
    result[key] = (result[key] || 0) + 1;
    return result;
  }, {});
}

/**
 * Sorts an array in ascending or descending order
 * @param {Array} array - The array to sort
 * @param {boolean} [desc=false] - Whether to sort in descending order
 * @returns {Array} The sorted array
 */
function sortBy(array, desc = false) {
  if (!Array.isArray(array)) {
    return [];
  }
  
  const sorted = [...array].sort((a, b) => {
    if (a < b) return desc ? 1 : -1;
    if (a > b) return desc ? -1 : 1;
    return 0;
  });
  
  return sorted;
}

/**
 * Gets the min value from an array
 * @param {Array<number>} array - The array to query
 * @returns {number|undefined} The minimum value
 */
function min(array) {
  if (!Array.isArray(array) || array.length === 0) {
    return undefined;
  }
  
  return Math.min(...array);
}

/**
 * Gets the max value from an array
 * @param {Array<number>} array - The array to query
 * @returns {number|undefined} The maximum value
 */
function max(array) {
  if (!Array.isArray(array) || array.length === 0) {
    return undefined;
  }
  
  return Math.max(...array);
}

/**
 * Gets the sum of array values
 * @param {Array<number>} array - The array to query
 * @returns {number} The sum
 */
function sum(array) {
  if (!Array.isArray(array) || array.length === 0) {
    return 0;
  }
  
  return array.reduce((acc, val) => acc + (Number(val) || 0), 0);
}

/**
 * Gets the average of array values
 * @param {Array<number>} array - The array to query
 * @returns {number} The average
 */
function average(array) {
  if (!Array.isArray(array) || array.length === 0) {
    return 0;
  }
  
  return sum(array) / array.length;
}

module.exports = {
  chunk,
  difference,
  compact,
  uniq,
  flatten,
  flattenDeep,
  groupBy,
  intersection,
  partition,
  shuffle,
  tail,
  initial,
  last,
  first,
  uniqBy,
  countBy,
  sortBy,
  min,
  max,
  sum,
  average
}; 