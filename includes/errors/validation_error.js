/**
 * @fileoverview Validation Error Handler for MarketAds Dataform
 * 
 * This module provides specialized validation error handling functionality.
 * It extends the base error handling with validation-specific features.
 */

const { ValidationError } = require('./error_types');
const { defaultErrorHandler } = require('./error_handler');

/**
 * ValidationErrorHandler class for specialized validation error handling
 */
class ValidationErrorHandler {
  /**
   * Create a new ValidationErrorHandler
   * @param {Object} options - Configuration options
   * @param {Object} options.errorHandler - Error handler to use
   */
  constructor(options = {}) {
    this.errorHandler = options.errorHandler || defaultErrorHandler;
  }

  /**
   * Handle a validation error
   * @param {ValidationError} error - The validation error to handle
   * @param {Object} context - Additional context information
   * @returns {ValidationError} The handled error
   */
  handleValidationError(error, context = {}) {
    // Ensure it's a ValidationError
    if (!(error instanceof ValidationError)) {
      error = new ValidationError(error.message, {
        cause: error,
        context,
        field: context.field,
        value: context.value,
        constraint: context.constraint
      });
    }
    
    // Add additional context
    error.context = { ...error.context, ...context };
    
    // Delegate to the main error handler
    return this.errorHandler.handleError(error, context);
  }

  /**
   * Create a validation error
   * @param {string} message - Error message
   * @param {Object} options - Error options
   * @returns {ValidationError} The created validation error
   */
  createValidationError(message, options = {}) {
    return new ValidationError(message, options);
  }

  /**
   * Validate a condition and throw a ValidationError if it fails
   * @param {boolean} condition - Condition to validate
   * @param {string} message - Error message if condition fails
   * @param {Object} options - Error options
   * @throws {ValidationError} If condition is false
   */
  validateOrThrow(condition, message, options = {}) {
    if (!condition) {
      throw this.createValidationError(message, options);
    }
  }

  /**
   * Validate a value is not null or undefined
   * @param {*} value - Value to validate
   * @param {string} fieldName - Field name for error message
   * @param {Object} options - Error options
   * @throws {ValidationError} If value is null or undefined
   */
  validateRequired(value, fieldName, options = {}) {
    this.validateOrThrow(
      value !== null && value !== undefined,
      `${fieldName} is required`,
      {
        ...options,
        field: fieldName,
        value,
        constraint: 'required'
      }
    );
  }

  /**
   * Validate a value is of a specific type
   * @param {*} value - Value to validate
   * @param {string|Array<string>} expectedType - Expected type(s)
   * @param {string} fieldName - Field name for error message
   * @param {Object} options - Error options
   * @throws {ValidationError} If value is not of the expected type
   */
  validateType(value, expectedType, fieldName, options = {}) {
    const types = Array.isArray(expectedType) ? expectedType : [expectedType];
    
    // Skip validation if value is null/undefined and not required
    if ((value === null || value === undefined) && !options.required) {
      return;
    }
    
    // Get actual type
    let actualType = typeof value;
    if (value === null) {
      actualType = 'null';
    } else if (Array.isArray(value)) {
      actualType = 'array';
    } else if (value instanceof Date) {
      actualType = 'date';
    }
    
    this.validateOrThrow(
      types.includes(actualType) || types.includes('any'),
      `${fieldName} must be of type ${types.join(' or ')}, but got ${actualType}`,
      {
        ...options,
        field: fieldName,
        value,
        constraint: 'type',
        expectedType: types,
        actualType
      }
    );
  }

  /**
   * Validate a number is within a range
   * @param {number} value - Value to validate
   * @param {Object} range - Range to validate against
   * @param {number} range.min - Minimum value (inclusive)
   * @param {number} range.max - Maximum value (inclusive)
   * @param {string} fieldName - Field name for error message
   * @param {Object} options - Error options
   * @throws {ValidationError} If value is not within the range
   */
  validateRange(value, range, fieldName, options = {}) {
    // Skip validation if value is null/undefined and not required
    if ((value === null || value === undefined) && !options.required) {
      return;
    }
    
    // Validate type first
    this.validateType(value, 'number', fieldName, options);
    
    // Validate min
    if (range.min !== undefined) {
      this.validateOrThrow(
        value >= range.min,
        `${fieldName} must be >= ${range.min}, but got ${value}`,
        {
          ...options,
          field: fieldName,
          value,
          constraint: 'min',
          min: range.min
        }
      );
    }
    
    // Validate max
    if (range.max !== undefined) {
      this.validateOrThrow(
        value <= range.max,
        `${fieldName} must be <= ${range.max}, but got ${value}`,
        {
          ...options,
          field: fieldName,
          value,
          constraint: 'max',
          max: range.max
        }
      );
    }
  }

  /**
   * Validate a string length
   * @param {string} value - Value to validate
   * @param {Object} length - Length to validate against
   * @param {number} length.min - Minimum length (inclusive)
   * @param {number} length.max - Maximum length (inclusive)
   * @param {string} fieldName - Field name for error message
   * @param {Object} options - Error options
   * @throws {ValidationError} If value length is not within the range
   */
  validateLength(value, length, fieldName, options = {}) {
    // Skip validation if value is null/undefined and not required
    if ((value === null || value === undefined) && !options.required) {
      return;
    }
    
    // Validate type first
    this.validateType(value, 'string', fieldName, options);
    
    // Validate min length
    if (length.min !== undefined) {
      this.validateOrThrow(
        value.length >= length.min,
        `${fieldName} must have length >= ${length.min}, but got ${value.length}`,
        {
          ...options,
          field: fieldName,
          value,
          constraint: 'minLength',
          minLength: length.min
        }
      );
    }
    
    // Validate max length
    if (length.max !== undefined) {
      this.validateOrThrow(
        value.length <= length.max,
        `${fieldName} must have length <= ${length.max}, but got ${value.length}`,
        {
          ...options,
          field: fieldName,
          value,
          constraint: 'maxLength',
          maxLength: length.max
        }
      );
    }
  }

  /**
   * Validate a value is one of a set of allowed values
   * @param {*} value - Value to validate
   * @param {Array} allowedValues - Allowed values
   * @param {string} fieldName - Field name for error message
   * @param {Object} options - Error options
   * @throws {ValidationError} If value is not one of the allowed values
   */
  validateEnum(value, allowedValues, fieldName, options = {}) {
    // Skip validation if value is null/undefined and not required
    if ((value === null || value === undefined) && !options.required) {
      return;
    }
    
    this.validateOrThrow(
      allowedValues.includes(value),
      `${fieldName} must be one of [${allowedValues.join(', ')}], but got ${value}`,
      {
        ...options,
        field: fieldName,
        value,
        constraint: 'enum',
        allowedValues
      }
    );
  }

  /**
   * Validate a string matches a pattern
   * @param {string} value - Value to validate
   * @param {RegExp|string} pattern - Pattern to match
   * @param {string} fieldName - Field name for error message
   * @param {Object} options - Error options
   * @throws {ValidationError} If value does not match the pattern
   */
  validatePattern(value, pattern, fieldName, options = {}) {
    // Skip validation if value is null/undefined and not required
    if ((value === null || value === undefined) && !options.required) {
      return;
    }
    
    // Validate type first
    this.validateType(value, 'string', fieldName, options);
    
    const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern);
    
    this.validateOrThrow(
      regex.test(value),
      `${fieldName} must match pattern ${regex}, but got ${value}`,
      {
        ...options,
        field: fieldName,
        value,
        constraint: 'pattern',
        pattern: regex.toString()
      }
    );
  }

  /**
   * Validate an array
   * @param {Array} value - Value to validate
   * @param {Object} arrayOptions - Array validation options
   * @param {number} arrayOptions.minItems - Minimum number of items
   * @param {number} arrayOptions.maxItems - Maximum number of items
   * @param {Function} arrayOptions.itemValidator - Function to validate each item
   * @param {string} fieldName - Field name for error message
   * @param {Object} options - Error options
   * @throws {ValidationError} If array validation fails
   */
  validateArray(value, arrayOptions, fieldName, options = {}) {
    // Skip validation if value is null/undefined and not required
    if ((value === null || value === undefined) && !options.required) {
      return;
    }
    
    // Validate type first
    this.validateType(value, 'array', fieldName, options);
    
    // Validate min items
    if (arrayOptions.minItems !== undefined) {
      this.validateOrThrow(
        value.length >= arrayOptions.minItems,
        `${fieldName} must have at least ${arrayOptions.minItems} items, but got ${value.length}`,
        {
          ...options,
          field: fieldName,
          value,
          constraint: 'minItems',
          minItems: arrayOptions.minItems
        }
      );
    }
    
    // Validate max items
    if (arrayOptions.maxItems !== undefined) {
      this.validateOrThrow(
        value.length <= arrayOptions.maxItems,
        `${fieldName} must have at most ${arrayOptions.maxItems} items, but got ${value.length}`,
        {
          ...options,
          field: fieldName,
          value,
          constraint: 'maxItems',
          maxItems: arrayOptions.maxItems
        }
      );
    }
    
    // Validate each item
    if (arrayOptions.itemValidator) {
      value.forEach((item, index) => {
        try {
          arrayOptions.itemValidator(item, `${fieldName}[${index}]`, options);
        } catch (error) {
          // Wrap the error with array context
          throw this.createValidationError(
            `${fieldName}[${index}]: ${error.message}`,
            {
              ...options,
              field: `${fieldName}[${index}]`,
              value: item,
              constraint: error.constraint,
              cause: error
            }
          );
        }
      });
    }
  }

  /**
   * Validate an object
   * @param {Object} value - Value to validate
   * @param {Object} objectOptions - Object validation options
   * @param {Object} objectOptions.properties - Property validators
   * @param {boolean} objectOptions.additionalProperties - Whether additional properties are allowed
   * @param {Array} objectOptions.required - Required properties
   * @param {string} fieldName - Field name for error message
   * @param {Object} options - Error options
   * @throws {ValidationError} If object validation fails
   */
  validateObject(value, objectOptions, fieldName, options = {}) {
    // Skip validation if value is null/undefined and not required
    if ((value === null || value === undefined) && !options.required) {
      return;
    }
    
    // Validate type first
    this.validateType(value, 'object', fieldName, options);
    
    // Validate required properties
    if (objectOptions.required) {
      objectOptions.required.forEach(propName => {
        this.validateOrThrow(
          propName in value,
          `${fieldName}.${propName} is required`,
          {
            ...options,
            field: `${fieldName}.${propName}`,
            value: undefined,
            constraint: 'required'
          }
        );
      });
    }
    
    // Validate each property
    if (objectOptions.properties) {
      Object.entries(objectOptions.properties).forEach(([propName, validator]) => {
        if (propName in value) {
          try {
            validator(value[propName], `${fieldName}.${propName}`, options);
          } catch (error) {
            // Wrap the error with object context
            throw this.createValidationError(
              `${fieldName}.${propName}: ${error.message}`,
              {
                ...options,
                field: `${fieldName}.${propName}`,
                value: value[propName],
                constraint: error.constraint,
                cause: error
              }
            );
          }
        }
      });
    }
    
    // Validate no additional properties if not allowed
    if (objectOptions.additionalProperties === false) {
      const allowedProps = Object.keys(objectOptions.properties || {});
      const actualProps = Object.keys(value);
      
      const extraProps = actualProps.filter(prop => !allowedProps.includes(prop));
      
      this.validateOrThrow(
        extraProps.length === 0,
        `${fieldName} has additional properties [${extraProps.join(', ')}] that are not allowed`,
        {
          ...options,
          field: fieldName,
          value,
          constraint: 'additionalProperties',
          additionalProperties: extraProps
        }
      );
    }
  }
}

// Create a default validation error handler instance
const defaultValidationErrorHandler = new ValidationErrorHandler();

module.exports = {
  ValidationErrorHandler,
  defaultValidationErrorHandler
}; 