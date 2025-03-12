/**
 * Object Utilities
 * 
 * This module provides object manipulation utilities used throughout the application.
 * It follows the Separation of Concerns principle by isolating object-related functionality.
 */

/**
 * Checks if a value is an object
 * @param {*} value - The value to check
 * @returns {boolean} Whether the value is an object
 */
function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Creates a shallow clone of an object
 * @param {Object} obj - The object to clone
 * @returns {Object} The cloned object
 */
function clone(obj) {
  if (!isObject(obj)) {
    return {};
  }
  
  return { ...obj };
}

/**
 * Creates a deep clone of an object
 * @param {Object} obj - The object to clone
 * @returns {Object} The deep cloned object
 */
function cloneDeep(obj) {
  if (!isObject(obj)) {
    return {};
  }
  
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Picks properties from an object
 * @param {Object} obj - The source object
 * @param {string[]} paths - The property paths to pick
 * @returns {Object} The new object with picked properties
 */
function pick(obj, paths) {
  if (!isObject(obj) || !Array.isArray(paths)) {
    return {};
  }
  
  return paths.reduce((result, path) => {
    if (Object.prototype.hasOwnProperty.call(obj, path)) {
      result[path] = obj[path];
    }
    return result;
  }, {});
}

/**
 * Omits properties from an object
 * @param {Object} obj - The source object
 * @param {string[]} paths - The property paths to omit
 * @returns {Object} The new object without the omitted properties
 */
function omit(obj, paths) {
  if (!isObject(obj)) {
    return {};
  }
  
  if (!Array.isArray(paths) || paths.length === 0) {
    return { ...obj };
  }
  
  const pathSet = new Set(paths);
  return Object.keys(obj).reduce((result, key) => {
    if (!pathSet.has(key)) {
      result[key] = obj[key];
    }
    return result;
  }, {});
}

/**
 * Gets the value at a path of an object
 * @param {Object} obj - The object to query
 * @param {string|string[]} path - The path of the property to get
 * @param {*} [defaultValue] - The value returned if the resolved value is undefined
 * @returns {*} The resolved value
 */
function get(obj, path, defaultValue) {
  if (!isObject(obj) || !path) {
    return defaultValue;
  }
  
  const keys = Array.isArray(path) ? path : path.split('.');
  let result = obj;
  
  for (const key of keys) {
    if (result === undefined || result === null) {
      return defaultValue;
    }
    result = result[key];
  }
  
  return result === undefined ? defaultValue : result;
}

/**
 * Sets the value at a path of an object
 * @param {Object} obj - The object to modify
 * @param {string|string[]} path - The path of the property to set
 * @param {*} value - The value to set
 * @returns {Object} The modified object
 */
function set(obj, path, value) {
  if (!isObject(obj) || !path) {
    return obj;
  }
  
  const keys = Array.isArray(path) ? path : path.split('.');
  const result = { ...obj };
  let current = result;
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!isObject(current[key])) {
      current[key] = {};
    }
    current = current[key];
  }
  
  current[keys[keys.length - 1]] = value;
  return result;
}

/**
 * Checks if an object has a property at a path
 * @param {Object} obj - The object to query
 * @param {string|string[]} path - The path to check
 * @returns {boolean} Whether the path exists
 */
function has(obj, path) {
  if (!isObject(obj) || !path) {
    return false;
  }
  
  const keys = Array.isArray(path) ? path : path.split('.');
  let current = obj;
  
  for (const key of keys) {
    if (!isObject(current) || !Object.prototype.hasOwnProperty.call(current, key)) {
      return false;
    }
    current = current[key];
  }
  
  return true;
}

/**
 * Merges multiple objects together
 * @param {...Object} objects - The objects to merge
 * @returns {Object} The merged object
 */
function merge(...objects) {
  return objects.reduce((result, obj) => {
    if (!isObject(obj)) {
      return result;
    }
    
    return { ...result, ...obj };
  }, {});
}

/**
 * Deeply merges multiple objects together
 * @param {...Object} objects - The objects to merge
 * @returns {Object} The merged object
 */
function mergeDeep(...objects) {
  return objects.reduce((result, obj) => {
    if (!isObject(obj)) {
      return result;
    }
    
    return Object.keys(obj).reduce((merged, key) => {
      if (isObject(merged[key]) && isObject(obj[key])) {
        merged[key] = mergeDeep(merged[key], obj[key]);
      } else {
        merged[key] = obj[key];
      }
      return merged;
    }, { ...result });
  }, {});
}

/**
 * Creates an object from entries
 * @param {Array} entries - The key-value pairs
 * @returns {Object} The new object
 */
function fromEntries(entries) {
  if (!Array.isArray(entries)) {
    return {};
  }
  
  return entries.reduce((result, [key, value]) => {
    result[key] = value;
    return result;
  }, {});
}

/**
 * Creates entries from an object
 * @param {Object} obj - The object to convert
 * @returns {Array} The key-value pairs
 */
function entries(obj) {
  if (!isObject(obj)) {
    return [];
  }
  
  return Object.entries(obj);
}

/**
 * Maps values in an object
 * @param {Object} obj - The object to iterate over
 * @param {Function} iteratee - The function invoked per iteration
 * @returns {Object} The new mapped object
 */
function mapValues(obj, iteratee) {
  if (!isObject(obj) || typeof iteratee !== 'function') {
    return {};
  }
  
  return Object.keys(obj).reduce((result, key) => {
    result[key] = iteratee(obj[key], key, obj);
    return result;
  }, {});
}

/**
 * Maps keys in an object
 * @param {Object} obj - The object to iterate over
 * @param {Function} iteratee - The function invoked per iteration
 * @returns {Object} The new mapped object
 */
function mapKeys(obj, iteratee) {
  if (!isObject(obj) || typeof iteratee !== 'function') {
    return {};
  }
  
  return Object.keys(obj).reduce((result, key) => {
    const newKey = iteratee(obj[key], key, obj);
    result[newKey] = obj[key];
    return result;
  }, {});
}

/**
 * Transforms an object
 * @param {Object} obj - The object to transform
 * @param {Function} transformer - The transformer function
 * @param {Object} [initialValue={}] - The initial value
 * @returns {Object} The transformed object
 */
function transform(obj, transformer, initialValue = {}) {
  if (!isObject(obj) || typeof transformer !== 'function') {
    return initialValue;
  }
  
  return Object.keys(obj).reduce((result, key) => {
    return transformer(result, obj[key], key, obj);
  }, initialValue);
}

/**
 * Checks if two objects are equal
 * @param {Object} objA - The first object
 * @param {Object} objB - The second object
 * @returns {boolean} Whether the objects are equal
 */
function isEqual(objA, objB) {
  if (objA === objB) {
    return true;
  }
  
  if (!isObject(objA) || !isObject(objB)) {
    return false;
  }
  
  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);
  
  if (keysA.length !== keysB.length) {
    return false;
  }
  
  return keysA.every(key => {
    const valueA = objA[key];
    const valueB = objB[key];
    
    if (isObject(valueA) && isObject(valueB)) {
      return isEqual(valueA, valueB);
    }
    
    return valueA === valueB;
  });
}

/**
 * Creates an object composed of the inverted keys and values
 * @param {Object} obj - The object to invert
 * @returns {Object} The inverted object
 */
function invert(obj) {
  if (!isObject(obj)) {
    return {};
  }
  
  return Object.keys(obj).reduce((result, key) => {
    const value = obj[key];
    result[value] = key;
    return result;
  }, {});
}

/**
 * Flattens an object to a single level depth
 * @param {Object} obj - The object to flatten
 * @param {string} [separator='.'] - The separator for nested keys
 * @returns {Object} The flattened object
 */
function flatten(obj, separator = '.') {
  if (!isObject(obj)) {
    return {};
  }
  
  const result = {};
  
  function flattenHelper(current, prefix = '') {
    Object.keys(current).forEach(key => {
      const newKey = prefix ? `${prefix}${separator}${key}` : key;
      
      if (isObject(current[key])) {
        flattenHelper(current[key], newKey);
      } else {
        result[newKey] = current[key];
      }
    });
  }
  
  flattenHelper(obj);
  return result;
}

/**
 * Unflatten a flattened object back to a nested object
 * @param {Object} obj - The object to unflatten
 * @param {string} [separator='.'] - The separator for nested keys
 * @returns {Object} The unflattened object
 */
function unflatten(obj, separator = '.') {
  if (!isObject(obj)) {
    return {};
  }
  
  const result = {};
  
  Object.keys(obj).forEach(key => {
    const keys = key.split(separator);
    let current = result;
    
    keys.forEach((k, i) => {
      if (i === keys.length - 1) {
        current[k] = obj[key];
      } else {
        current[k] = current[k] || {};
        current = current[k];
      }
    });
  });
  
  return result;
}

/**
 * Get keys of an object
 * @param {Object} obj - The object to get keys from
 * @returns {string[]} The object keys
 */
function keys(obj) {
  if (!isObject(obj)) {
    return [];
  }
  
  return Object.keys(obj);
}

/**
 * Get values of an object
 * @param {Object} obj - The object to get values from
 * @returns {Array} The object values
 */
function values(obj) {
  if (!isObject(obj)) {
    return [];
  }
  
  return Object.values(obj);
}

/**
 * Converts an object's keys to camelCase
 * @param {Object} obj - The object to convert
 * @returns {Object} The object with camelCase keys
 */
function camelCaseKeys(obj) {
  if (!isObject(obj)) {
    return {};
  }
  
  return Object.keys(obj).reduce((result, key) => {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = obj[key];
    return result;
  }, {});
}

/**
 * Converts an object's keys to snake_case
 * @param {Object} obj - The object to convert
 * @returns {Object} The object with snake_case keys
 */
function snakeCaseKeys(obj) {
  if (!isObject(obj)) {
    return {};
  }
  
  return Object.keys(obj).reduce((result, key) => {
    const snakeKey = key.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
    result[snakeKey] = obj[key];
    return result;
  }, {});
}

module.exports = {
  isObject,
  clone,
  cloneDeep,
  pick,
  omit,
  get,
  set,
  has,
  merge,
  mergeDeep,
  fromEntries,
  entries,
  mapValues,
  mapKeys,
  transform,
  isEqual,
  invert,
  flatten,
  unflatten,
  keys,
  values,
  camelCaseKeys,
  snakeCaseKeys
}; 