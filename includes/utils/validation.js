/**
 * Validation Utilities
 * 
 * This module provides validation utilities used throughout the application.
 * It follows the Separation of Concerns principle by isolating validation-related functionality.
 */

/**
 * Checks if a value is a string
 * @param {*} value - The value to check
 * @returns {boolean} Whether the value is a string
 */
function isString(value) {
  return typeof value === 'string';
}

/**
 * Checks if a value is a number
 * @param {*} value - The value to check
 * @returns {boolean} Whether the value is a number
 */
function isNumber(value) {
  return typeof value === 'number' && !isNaN(value);
}

/**
 * Checks if a value is a boolean
 * @param {*} value - The value to check
 * @returns {boolean} Whether the value is a boolean
 */
function isBoolean(value) {
  return typeof value === 'boolean';
}

/**
 * Checks if a value is an array
 * @param {*} value - The value to check
 * @returns {boolean} Whether the value is an array
 */
function isArray(value) {
  return Array.isArray(value);
}

/**
 * Checks if a value is an object
 * @param {*} value - The value to check
 * @returns {boolean} Whether the value is an object
 */
function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Checks if a value is a function
 * @param {*} value - The value to check
 * @returns {boolean} Whether the value is a function
 */
function isFunction(value) {
  return typeof value === 'function';
}

/**
 * Checks if a value is undefined
 * @param {*} value - The value to check
 * @returns {boolean} Whether the value is undefined
 */
function isUndefined(value) {
  return value === undefined;
}

/**
 * Checks if a value is null
 * @param {*} value - The value to check
 * @returns {boolean} Whether the value is null
 */
function isNull(value) {
  return value === null;
}

/**
 * Checks if a value is null or undefined
 * @param {*} value - The value to check
 * @returns {boolean} Whether the value is null or undefined
 */
function isNullOrUndefined(value) {
  return isNull(value) || isUndefined(value);
}

/**
 * Checks if a value is empty (undefined, null, empty string, empty array, or empty object)
 * @param {*} value - The value to check
 * @returns {boolean} Whether the value is empty
 */
function isEmpty(value) {
  if (isNullOrUndefined(value)) {
    return true;
  }
  
  if (isString(value) || isArray(value)) {
    return value.length === 0;
  }
  
  if (isObject(value)) {
    return Object.keys(value).length === 0;
  }
  
  return false;
}

/**
 * Checks if a value is a valid email address
 * @param {string} value - The value to check
 * @returns {boolean} Whether the value is a valid email address
 */
function isEmail(value) {
  if (!isString(value)) {
    return false;
  }
  
  // Simple email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
}

/**
 * Checks if a value is a valid URL
 * @param {string} value - The value to check
 * @returns {boolean} Whether the value is a valid URL
 */
function isUrl(value) {
  if (!isString(value)) {
    return false;
  }
  
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (e) {
    return false;
  }
}

/**
 * Checks if a value is a date object
 * @param {*} value - The value to check
 * @returns {boolean} Whether the value is a date object
 */
function isDate(value) {
  return value instanceof Date && !isNaN(value.getTime());
}

/**
 * Checks if a value is a valid JSON string
 * @param {string} value - The value to check
 * @returns {boolean} Whether the value is a valid JSON string
 */
function isValidJson(value) {
  if (!isString(value)) {
    return false;
  }
  
  try {
    JSON.parse(value);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Checks if a value is an integer
 * @param {*} value - The value to check
 * @returns {boolean} Whether the value is an integer
 */
function isInteger(value) {
  return isNumber(value) && Number.isInteger(value);
}

/**
 * Checks if a value is a positive number
 * @param {*} value - The value to check
 * @returns {boolean} Whether the value is a positive number
 */
function isPositive(value) {
  return isNumber(value) && value > 0;
}

/**
 * Checks if a value is a negative number
 * @param {*} value - The value to check
 * @returns {boolean} Whether the value is a negative number
 */
function isNegative(value) {
  return isNumber(value) && value < 0;
}

/**
 * Checks if a value is within a range
 * @param {number} value - The value to check
 * @param {number} min - The minimum value
 * @param {number} max - The maximum value
 * @returns {boolean} Whether the value is within the range
 */
function isInRange(value, min, max) {
  return isNumber(value) && value >= min && value <= max;
}

/**
 * Checks if an object has a property
 * @param {Object} obj - The object to check
 * @param {string} property - The property name
 * @returns {boolean} Whether the object has the property
 */
function hasProperty(obj, property) {
  return isObject(obj) && Object.prototype.hasOwnProperty.call(obj, property);
}

/**
 * Checks if a value matches a regular expression
 * @param {string} value - The value to check
 * @param {RegExp} regex - The regular expression to match
 * @returns {boolean} Whether the value matches the regular expression
 */
function matchesRegex(value, regex) {
  return isString(value) && regex instanceof RegExp && regex.test(value);
}

/**
 * Validates a value against a set of validation rules
 * @param {*} value - The value to validate
 * @param {Object} rules - The validation rules
 * @returns {Object} The validation result with isValid and errors properties
 */
function validate(value, rules) {
  if (!isObject(rules)) {
    return { isValid: true, errors: [] };
  }
  
  const errors = [];
  
  if (rules.required && isEmpty(value)) {
    errors.push('Value is required');
  }
  
  if (!isNullOrUndefined(value)) {
    if (rules.type) {
      const typeChecks = {
        string: isString,
        number: isNumber,
        boolean: isBoolean,
        array: isArray,
        object: isObject,
        function: isFunction,
        date: isDate,
        email: isEmail,
        url: isUrl,
        integer: isInteger
      };
      
      const typeCheck = typeChecks[rules.type];
      
      if (typeCheck && !typeCheck(value)) {
        errors.push(`Value must be a ${rules.type}`);
      }
    }
    
    if (rules.min !== undefined && (isString(value) || isArray(value))) {
      if (value.length < rules.min) {
        errors.push(`Value must have a minimum length of ${rules.min}`);
      }
    } else if (rules.min !== undefined && isNumber(value)) {
      if (value < rules.min) {
        errors.push(`Value must be at least ${rules.min}`);
      }
    }
    
    if (rules.max !== undefined && (isString(value) || isArray(value))) {
      if (value.length > rules.max) {
        errors.push(`Value must have a maximum length of ${rules.max}`);
      }
    } else if (rules.max !== undefined && isNumber(value)) {
      if (value > rules.max) {
        errors.push(`Value must be at most ${rules.max}`);
      }
    }
    
    if (rules.enum && isArray(rules.enum) && !rules.enum.includes(value)) {
      errors.push(`Value must be one of: ${rules.enum.join(', ')}`);
    }
    
    if (rules.pattern && isString(value) && !matchesRegex(value, rules.pattern)) {
      errors.push('Value does not match the required pattern');
    }
    
    if (rules.custom && isFunction(rules.custom)) {
      const customResult = rules.custom(value);
      if (isString(customResult)) {
        errors.push(customResult);
      } else if (isArray(customResult)) {
        errors.push(...customResult);
      } else if (customResult === false) {
        errors.push('Value failed custom validation');
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Ensures a value meets certain criteria or returns a default
 * @param {*} value - The value to check
 * @param {Object} options - Options including default value and validation function
 * @returns {*} The validated value or default
 */
function ensureValid(value, { defaultValue, validator }) {
  if (isFunction(validator) && !validator(value)) {
    return defaultValue;
  }
  
  return isNullOrUndefined(value) ? defaultValue : value;
}

/**
 * Validates an object against a schema
 * @param {Object} obj - The object to validate
 * @param {Object} schema - The validation schema
 * @returns {Object} The validation result with isValid and errors properties
 */
function validateObject(obj, schema) {
  if (!isObject(obj) || !isObject(schema)) {
    return { 
      isValid: false, 
      errors: { _general: ['Invalid object or schema'] } 
    };
  }
  
  const errors = {};
  let isValid = true;
  
  Object.keys(schema).forEach(field => {
    const rules = schema[field];
    const fieldValue = obj[field];
    
    const { isValid: fieldIsValid, errors: fieldErrors } = validate(fieldValue, rules);
    
    if (!fieldIsValid) {
      errors[field] = fieldErrors;
      isValid = false;
    }
  });
  
  return { isValid, errors };
}

/**
 * Checks if a value is a valid phone number
 * @param {string} value - The value to check
 * @param {string} [locale='US'] - The locale for phone number validation
 * @returns {boolean} Whether the value is a valid phone number
 */
function isPhoneNumber(value, locale = 'US') {
  if (!isString(value)) {
    return false;
  }
  
  const patterns = {
    US: /^(\+?1)?[-. ]?(\(?\d{3}\)?[-. ]?|\d{3}[-. ]?)?\d{3}[-. ]?\d{4}$/,
    UK: /^(\+?44|0)[-. ]?(\(?\d{2,5}\)?[-. ]?|\d{2,5}[-. ]?)?\d{3,4}[-. ]?\d{3,4}$/,
    // Add more locales as needed
  };
  
  return matchesRegex(value, patterns[locale] || patterns.US);
}

/**
 * Checks if a value is a valid postal code
 * @param {string} value - The value to check
 * @param {string} [locale='US'] - The locale for postal code validation
 * @returns {boolean} Whether the value is a valid postal code
 */
function isPostalCode(value, locale = 'US') {
  if (!isString(value)) {
    return false;
  }
  
  const patterns = {
    US: /^\d{5}(-\d{4})?$/,
    UK: /^[A-Z]{1,2}\d[A-Z\d]? \d[A-Z]{2}$/i,
    CA: /^[ABCEGHJKLMNPRSTVXY]\d[A-Z] \d[A-Z]\d$/i,
    // Add more locales as needed
  };
  
  return matchesRegex(value, patterns[locale] || patterns.US);
}

/**
 * Checks if a value is alphanumeric
 * @param {string} value - The value to check
 * @returns {boolean} Whether the value contains only letters and numbers
 */
function isAlphanumeric(value) {
  return isString(value) && /^[a-zA-Z0-9]+$/.test(value);
}

/**
 * Checks if a value contains only letters
 * @param {string} value - The value to check
 * @returns {boolean} Whether the value contains only letters
 */
function isAlpha(value) {
  return isString(value) && /^[a-zA-Z]+$/.test(value);
}

/**
 * Checks if a value contains only numbers
 * @param {string} value - The value to check
 * @returns {boolean} Whether the value contains only numbers
 */
function isNumeric(value) {
  return isString(value) && /^[0-9]+$/.test(value);
}

/**
 * Checks if a date is before another date
 * @param {Date} date - The date to check
 * @param {Date} beforeDate - The date to compare against
 * @returns {boolean} Whether the date is before the comparison date
 */
function isDateBefore(date, beforeDate) {
  return isDate(date) && isDate(beforeDate) && date < beforeDate;
}

/**
 * Checks if a date is after another date
 * @param {Date} date - The date to check
 * @param {Date} afterDate - The date to compare against
 * @returns {boolean} Whether the date is after the comparison date
 */
function isDateAfter(date, afterDate) {
  return isDate(date) && isDate(afterDate) && date > afterDate;
}

/**
 * Checks if a date is between two other dates
 * @param {Date} date - The date to check
 * @param {Date} startDate - The start date of the range
 * @param {Date} endDate - The end date of the range
 * @returns {boolean} Whether the date is in the range
 */
function isDateBetween(date, startDate, endDate) {
  return isDate(date) && isDate(startDate) && isDate(endDate) &&
         date >= startDate && date <= endDate;
}

module.exports = {
  isString,
  isNumber,
  isBoolean,
  isArray,
  isObject,
  isFunction,
  isUndefined,
  isNull,
  isNullOrUndefined,
  isEmpty,
  isEmail,
  isUrl,
  isDate,
  isValidJson,
  isInteger,
  isPositive,
  isNegative,
  isInRange,
  hasProperty,
  matchesRegex,
  validate,
  ensureValid,
  validateObject,
  isPhoneNumber,
  isPostalCode,
  isAlphanumeric,
  isAlpha,
  isNumeric,
  isDateBefore,
  isDateAfter,
  isDateBetween
}; 