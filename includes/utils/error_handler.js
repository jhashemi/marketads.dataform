/**
 * Enhanced error handling and logging module for the historical matching system
 */

const ERROR_TYPES = {
  VALIDATION: 'VALIDATION_ERROR',
  CONFIGURATION: 'CONFIGURATION_ERROR',
  EXECUTION: 'EXECUTION_ERROR',
  DATA: 'DATA_ERROR',
  SYSTEM: 'SYSTEM_ERROR'
};

const ERROR_SEVERITY = {
  INFO: 'INFO',
  WARNING: 'WARNING',
  ERROR: 'ERROR',
  CRITICAL: 'CRITICAL'
};

class MatchingError extends Error {
  constructor(message, type, severity, details = {}) {
    super(message);
    this.name = 'MatchingError';
    this.type = type;
    this.severity = severity;
    this.details = details;
    this.timestamp = new Date().toISOString();
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      type: this.type,
      severity: this.severity,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }
}

class ErrorHandler {
  constructor(options = {}) {
    this.logLevel = options.logLevel || 'INFO';
    this.logToConsole = options.logToConsole !== false;
    this.logToFile = options.logToFile || false;
    this.logFilePath = options.logFilePath || './matching_error.log';
    this.errorCallbacks = new Map();
    this.performanceMetrics = new Map();
    this.performanceThresholds = options.performanceThresholds || {
      warning: 1000, // 1 second
      error: 5000    // 5 seconds
    };
  }

  /**
   * Start performance tracking for a specific operation
   * @param {string} operationId - Unique identifier for the operation
   * @param {Object} context - Additional context for the operation
   */
  startPerformanceTracking(operationId, context = {}) {
    this.performanceMetrics.set(operationId, {
      startTime: process.hrtime(),
      context,
      checkpoints: []
    });
  }

  /**
   * Add a checkpoint to performance tracking
   * @param {string} operationId - Operation identifier
   * @param {string} checkpointName - Name of the checkpoint
   * @param {Object} checkpointData - Additional data for the checkpoint
   */
  addPerformanceCheckpoint(operationId, checkpointName, checkpointData = {}) {
    const metric = this.performanceMetrics.get(operationId);
    if (metric) {
      const checkpoint = {
        name: checkpointName,
        timestamp: process.hrtime(metric.startTime),
        data: checkpointData
      };
      metric.checkpoints.push(checkpoint);
    }
  }

  /**
   * End performance tracking and get metrics
   * @param {string} operationId - Operation identifier
   * @returns {Object} Performance metrics
   */
  endPerformanceTracking(operationId) {
    const metric = this.performanceMetrics.get(operationId);
    if (!metric) return null;

    const endTime = process.hrtime(metric.startTime);
    const durationMs = (endTime[0] * 1000) + (endTime[1] / 1000000);

    const performanceLog = {
      operationId,
      context: metric.context,
      duration: durationMs,
      checkpoints: metric.checkpoints.map(cp => ({
        name: cp.name,
        timeFromStart: (cp.timestamp[0] * 1000) + (cp.timestamp[1] / 1000000),
        data: cp.data
      })),
      timestamp: new Date().toISOString(),
      severity: this.getPerformanceSeverity(durationMs)
    };

    this.logPerformanceMetrics(performanceLog);
    this.performanceMetrics.delete(operationId);

    return performanceLog;
  }

  /**
   * Get performance severity level based on duration
   * @param {number} durationMs - Duration in milliseconds
   * @returns {string} Severity level
   */
  getPerformanceSeverity(durationMs) {
    if (durationMs >= this.performanceThresholds.error) {
      return 'ERROR';
    } else if (durationMs >= this.performanceThresholds.warning) {
      return 'WARNING';
    }
    return 'INFO';
  }

  /**
   * Log performance metrics
   * @param {Object} metrics - Performance metrics to log
   */
  logPerformanceMetrics(metrics) {
    const performanceLog = {
      type: 'PERFORMANCE',
      ...metrics
    };

    if (this.logToConsole) {
      console.log('PERFORMANCE:', JSON.stringify(performanceLog, null, 2));
    }

    if (this.logToFile) {
      const fs = require('fs');
      fs.appendFileSync(
        this.logFilePath.replace('.log', '_performance.log'),
        JSON.stringify(performanceLog) + '\n'
      );
    }

    // Trigger callbacks for performance logging
    if (this.errorCallbacks.has('PERFORMANCE')) {
      this.errorCallbacks.get('PERFORMANCE').forEach(callback => {
        callback(performanceLog);
      });
    }
  }

  /**
   * Wrap a function with performance tracking
   * @param {Function} fn - Function to wrap
   * @param {string} operationId - Operation identifier
   * @param {Object} context - Operation context
   * @returns {Function}
   */
  withPerformanceTracking(fn, operationId, context = {}) {
    return async (...args) => {
      this.startPerformanceTracking(operationId, context);
      try {
        const result = await fn(...args);
        this.endPerformanceTracking(operationId);
        return result;
      } catch (error) {
        const perfLog = this.endPerformanceTracking(operationId);
        throw this.createExecutionError(
          error.message,
          {
            originalError: error,
            performanceMetrics: perfLog
          }
        );
      }
    };
  }

  /**
   * Get current performance metrics
   * @returns {Object} Current performance metrics
   */
  getCurrentPerformanceMetrics() {
    const metrics = {};
    for (const [operationId, metric] of this.performanceMetrics.entries()) {
      const currentTime = process.hrtime(metric.startTime);
      metrics[operationId] = {
        duration: (currentTime[0] * 1000) + (currentTime[1] / 1000000),
        checkpoints: metric.checkpoints.map(cp => ({
          name: cp.name,
          timeFromStart: (cp.timestamp[0] * 1000) + (cp.timestamp[1] / 1000000),
          data: cp.data
        })),
        context: metric.context
      };
    }
    return metrics;
  }

  /**
   * Create a validation error
   * @param {string} message - Error message
   * @param {Object} details - Additional error details
   * @returns {MatchingError}
   */
  createValidationError(message, details = {}) {
    return new MatchingError(message, ERROR_TYPES.VALIDATION, ERROR_SEVERITY.ERROR, details);
  }

  /**
   * Create a configuration error
   * @param {string} message - Error message
   * @param {Object} details - Additional error details
   * @returns {MatchingError}
   */
  createConfigError(message, details = {}) {
    return new MatchingError(message, ERROR_TYPES.CONFIGURATION, ERROR_SEVERITY.ERROR, details);
  }

  /**
   * Create an execution error
   * @param {string} message - Error message
   * @param {Object} details - Additional error details
   * @returns {MatchingError}
   */
  createExecutionError(message, details = {}) {
    return new MatchingError(message, ERROR_TYPES.EXECUTION, ERROR_SEVERITY.ERROR, details);
  }

  /**
   * Create a data error
   * @param {string} message - Error message
   * @param {Object} details - Additional error details
   * @returns {MatchingError}
   */
  createDataError(message, details = {}) {
    return new MatchingError(message, ERROR_TYPES.DATA, ERROR_SEVERITY.ERROR, details);
  }

  /**
   * Create a system error
   * @param {string} message - Error message
   * @param {Object} details - Additional error details
   * @returns {MatchingError}
   */
  createSystemError(message, details = {}) {
    return new MatchingError(message, ERROR_TYPES.SYSTEM, ERROR_SEVERITY.CRITICAL, details);
  }

  /**
   * Log an error with context
   * @param {Error} error - Error object
   * @param {Object} context - Error context
   */
  logError(error, context = {}) {
    const errorLog = {
      timestamp: new Date().toISOString(),
      error: error instanceof MatchingError ? error.toJSON() : {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      context
    };

    if (this.logToConsole) {
      console.error('ERROR:', JSON.stringify(errorLog, null, 2));
    }

    if (this.logToFile) {
      // Implement file logging here
      const fs = require('fs');
      fs.appendFileSync(this.logFilePath, JSON.stringify(errorLog) + '\n');
    }

    // Trigger error callbacks
    if (error instanceof MatchingError && this.errorCallbacks.has(error.type)) {
      this.errorCallbacks.get(error.type).forEach(callback => callback(error, context));
    }
  }

  /**
   * Register an error callback for a specific error type
   * @param {string} errorType - Type of error to handle
   * @param {Function} callback - Callback function
   */
  onError(errorType, callback) {
    if (!this.errorCallbacks.has(errorType)) {
      this.errorCallbacks.set(errorType, new Set());
    }
    this.errorCallbacks.get(errorType).add(callback);
  }

  /**
   * Remove an error callback
   * @param {string} errorType - Type of error
   * @param {Function} callback - Callback function to remove
   */
  offError(errorType, callback) {
    if (this.errorCallbacks.has(errorType)) {
      this.errorCallbacks.get(errorType).delete(callback);
    }
  }

  /**
   * Wrap a function with error handling
   * @param {Function} fn - Function to wrap
   * @param {string} errorType - Type of error to create on failure
   * @param {Object} context - Error context
   * @returns {Function}
   */
  withErrorHandling(fn, errorType, context = {}) {
    return async (...args) => {
      try {
        return await fn(...args);
      } catch (error) {
        const wrappedError = new MatchingError(
          error.message,
          errorType,
          ERROR_SEVERITY.ERROR,
          { originalError: error, context }
        );
        this.logError(wrappedError, context);
        throw wrappedError;
      }
    };
  }

  /**
   * Create a detailed error message
   * @param {string} message - Base error message
   * @param {Object} details - Error details
   * @returns {string}
   */
  formatErrorMessage(message, details = {}) {
    let formattedMessage = `${message}\n`;
    
    if (Object.keys(details).length > 0) {
      formattedMessage += '\nDetails:\n';
      for (const [key, value] of Object.entries(details)) {
        formattedMessage += `  ${key}: ${JSON.stringify(value)}\n`;
      }
    }

    return formattedMessage;
  }

  /**
   * Validate a value and throw a formatted error if invalid
   * @param {*} value - Value to validate
   * @param {Function} validator - Validation function
   * @param {string} fieldName - Name of the field being validated
   * @param {string} errorMessage - Custom error message
   */
  validateOrThrow(value, validator, fieldName, errorMessage) {
    if (!validator(value)) {
      throw this.createValidationError(
        this.formatErrorMessage(errorMessage || `Invalid value for ${fieldName}`, {
          field: fieldName,
          value: value
        })
      );
    }
  }

  /**
   * Create a validation function for required fields
   * @param {Object} object - Object to validate
   * @param {Array<string>} requiredFields - List of required field names
   * @returns {Function}
   */
  createRequiredFieldsValidator(object, requiredFields) {
    return () => {
      const missingFields = requiredFields.filter(field => !object[field]);
      if (missingFields.length > 0) {
        throw this.createValidationError(
          this.formatErrorMessage('Missing required fields', {
            missingFields,
            object
          })
        );
      }
      return true;
    };
  }

  /**
   * Create a type validator function
   * @param {string} expectedType - Expected type name
   * @returns {Function}
   */
  createTypeValidator(expectedType) {
    return (value) => {
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      if (actualType !== expectedType) {
        throw this.createValidationError(
          this.formatErrorMessage('Invalid type', {
            expectedType,
            actualType,
            value
          })
        );
      }
      return true;
    };
  }

  /**
   * Create a range validator function
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   * @returns {Function}
   */
  createRangeValidator(min, max) {
    return (value) => {
      const numValue = Number(value);
      if (isNaN(numValue) || numValue < min || numValue > max) {
        throw this.createValidationError(
          this.formatErrorMessage('Value out of range', {
            value,
            min,
            max
          })
        );
      }
      return true;
    };
  }

  /**
   * Create a regex pattern validator function
   * @param {RegExp} pattern - Regular expression pattern
   * @param {string} description - Description of the pattern
   * @returns {Function}
   */
  createPatternValidator(pattern, description) {
    return (value) => {
      if (!pattern.test(value)) {
        throw this.createValidationError(
          this.formatErrorMessage(`Value does not match pattern: ${description}`, {
            value,
            pattern: pattern.toString()
          })
        );
      }
      return true;
    };
  }

  /**
   * Create an enum validator function
   * @param {Array} allowedValues - Array of allowed values
   * @returns {Function}
   */
  createEnumValidator(allowedValues) {
    return (value) => {
      if (!allowedValues.includes(value)) {
        throw this.createValidationError(
          this.formatErrorMessage('Invalid enum value', {
            value,
            allowedValues
          })
        );
      }
      return true;
    };
  }

  /**
   * Create a custom validator function
   * @param {Function} validatorFn - Custom validation function
   * @param {string} errorMessage - Error message for validation failure
   * @returns {Function}
   */
  createCustomValidator(validatorFn, errorMessage) {
    return (value) => {
      if (!validatorFn(value)) {
        throw this.createValidationError(
          this.formatErrorMessage(errorMessage, {
            value
          })
        );
      }
      return true;
    };
  }

  /**
   * Create an array validator function
   * @param {Function} elementValidator - Validator for array elements
   * @param {Object} options - Validation options
   * @returns {Function}
   */
  createArrayValidator(elementValidator, options = {}) {
    const { minLength, maxLength } = options;
    return (array) => {
      if (!Array.isArray(array)) {
        throw this.createValidationError(
          this.formatErrorMessage('Value is not an array', {
            value: array
          })
        );
      }

      if (minLength !== undefined && array.length < minLength) {
        throw this.createValidationError(
          this.formatErrorMessage('Array length below minimum', {
            length: array.length,
            minLength
          })
        );
      }

      if (maxLength !== undefined && array.length > maxLength) {
        throw this.createValidationError(
          this.formatErrorMessage('Array length exceeds maximum', {
            length: array.length,
            maxLength
          })
        );
      }

      array.forEach((element, index) => {
        try {
          elementValidator(element);
        } catch (error) {
          throw this.createValidationError(
            this.formatErrorMessage(`Invalid array element at index ${index}`, {
              element,
              index,
              originalError: error.message
            })
          );
        }
      });

      return true;
    };
  }

  /**
   * Create an object validator function
   * @param {Object} schema - Validation schema
   * @returns {Function}
   */
  createObjectValidator(schema) {
    return (object) => {
      if (typeof object !== 'object' || object === null) {
        throw this.createValidationError(
          this.formatErrorMessage('Value is not an object', {
            value: object
          })
        );
      }

      Object.entries(schema).forEach(([key, validator]) => {
        if (object[key] === undefined) {
          throw this.createValidationError(
            this.formatErrorMessage(`Missing required property: ${key}`, {
              object
            })
          );
        }

        try {
          validator(object[key]);
        } catch (error) {
          throw this.createValidationError(
            this.formatErrorMessage(`Invalid value for property: ${key}`, {
              property: key,
              value: object[key],
              originalError: error.message
            })
          );
        }
      });

      return true;
    };
  }

  /**
   * Create a composite validator that combines multiple validators
   * @param {Array<Function>} validators - Array of validator functions
   * @returns {Function}
   */
  createCompositeValidator(validators) {
    return (value) => {
      validators.forEach(validator => {
        validator(value);
      });
      return true;
    };
  }

  /**
   * Create an async validator function
   * @param {Function} validatorFn - Async validation function
   * @param {string} errorMessage - Error message for validation failure
   * @returns {Function}
   */
  createAsyncValidator(validatorFn, errorMessage) {
    return async (value) => {
      try {
        const isValid = await validatorFn(value);
        if (!isValid) {
          throw this.createValidationError(
            this.formatErrorMessage(errorMessage, {
              value
            })
          );
        }
        return true;
      } catch (error) {
        throw this.createValidationError(
          this.formatErrorMessage('Async validation failed', {
            value,
            originalError: error.message
          })
        );
      }
    };
  }
}

// Create and export a default instance
const defaultErrorHandler = new ErrorHandler();

module.exports = {
  ErrorHandler,
  MatchingError,
  ERROR_TYPES,
  ERROR_SEVERITY,
  defaultErrorHandler
}; 