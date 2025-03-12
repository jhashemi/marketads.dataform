/**
 * Error Handler for Record Matching System
 * 
 * Provides standardized error handling, classification, and logging
 * across the validation framework.
 */

/**
 * Error types enum
 * @readonly
 * @enum {string}
 */
const ErrorType = {
  CONFIG_ERROR: 'CONFIG_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  BIGQUERY_ERROR: 'BIGQUERY_ERROR',
  DATAFORM_ERROR: 'DATAFORM_ERROR',
  TEST_ERROR: 'TEST_ERROR',
  IO_ERROR: 'IO_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
};

/**
 * Error severity levels
 * @readonly
 * @enum {string}
 */
const ErrorSeverity = {
  FATAL: 'FATAL',
  ERROR: 'ERROR',
  WARNING: 'WARNING',
  INFO: 'INFO'
};

/**
 * Custom error class for validation framework
 */
class ValidationError extends Error {
  /**
   * Create a new ValidationError
   * @param {string} message - Error message
   * @param {string} type - Error type from ErrorType enum
   * @param {Error|null} originalError - Original error if this is a wrapper
   * @param {string} severity - Error severity from ErrorSeverity enum
   * @param {Object} context - Additional error context
   */
  constructor(message, type = ErrorType.UNKNOWN_ERROR, originalError = null, severity = ErrorSeverity.ERROR, context = {}) {
    super(message);
    this.name = 'ValidationError';
    this.type = type;
    this.originalError = originalError;
    this.severity = severity;
    this.context = context;
    this.timestamp = new Date().toISOString();
    
    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ValidationError);
    }
  }
  
  /**
   * Get JSON representation of error
   * @returns {Object} JSON representation
   */
  toJSON() {
    return {
      name: this.name,
      type: this.type,
      message: this.message,
      severity: this.severity,
      timestamp: this.timestamp,
      context: this.context,
      stack: this.stack,
      originalError: this.originalError ? {
        name: this.originalError.name,
        message: this.originalError.message,
        stack: this.originalError.stack
      } : null
    };
  }
}

/**
 * Log an error with context
 * @param {Error|ValidationError} error - Error to log
 * @param {Object} additionalContext - Additional context to include
 */
function logError(error, additionalContext = {}) {
  const errorObj = error instanceof ValidationError
    ? error
    : new ValidationError(
        error.message,
        ErrorType.UNKNOWN_ERROR,
        error,
        ErrorSeverity.ERROR,
        additionalContext
      );
  
  // Combine context
  const context = {
    ...errorObj.context,
    ...additionalContext
  };
  
  // Log based on severity
  const logData = {
    type: errorObj.type,
    message: errorObj.message,
    timestamp: errorObj.timestamp,
    context,
    stack: errorObj.stack
  };
  
  switch (errorObj.severity) {
    case ErrorSeverity.FATAL:
    case ErrorSeverity.ERROR:
      console.error(JSON.stringify(logData, null, 2));
      break;
    case ErrorSeverity.WARNING:
      console.warn(JSON.stringify(logData, null, 2));
      break;
    case ErrorSeverity.INFO:
      console.info(JSON.stringify(logData, null, 2));
      break;
    default:
      console.log(JSON.stringify(logData, null, 2));
  }
  
  return errorObj;
}

/**
 * Create a configuration error
 * @param {string} message - Error message
 * @param {Error|null} originalError - Original error if this is a wrapper
 * @param {Object} context - Additional error context
 * @returns {ValidationError} The created error
 */
function createConfigError(message, originalError = null, context = {}) {
  return new ValidationError(
    message,
    ErrorType.CONFIG_ERROR,
    originalError,
    ErrorSeverity.ERROR,
    context
  );
}

/**
 * Create a validation error
 * @param {string} message - Error message
 * @param {Error|null} originalError - Original error if this is a wrapper
 * @param {Object} context - Additional error context
 * @returns {ValidationError} The created error
 */
function createValidationError(message, originalError = null, context = {}) {
  return new ValidationError(
    message,
    ErrorType.VALIDATION_ERROR,
    originalError,
    ErrorSeverity.ERROR,
    context
  );
}

/**
 * Create a BigQuery error
 * @param {string} message - Error message
 * @param {Error|null} originalError - Original error if this is a wrapper
 * @param {Object} context - Additional error context
 * @returns {ValidationError} The created error
 */
function createBigQueryError(message, originalError = null, context = {}) {
  return new ValidationError(
    message,
    ErrorType.BIGQUERY_ERROR,
    originalError,
    ErrorSeverity.ERROR,
    context
  );
}

/**
 * Create a Dataform error
 * @param {string} message - Error message
 * @param {Error|null} originalError - Original error if this is a wrapper
 * @param {Object} context - Additional error context
 * @returns {ValidationError} The created error
 */
function createDataformError(message, originalError = null, context = {}) {
  return new ValidationError(
    message,
    ErrorType.DATAFORM_ERROR,
    originalError,
    ErrorSeverity.ERROR,
    context
  );
}

/**
 * Create a test error
 * @param {string} message - Error message
 * @param {Error|null} originalError - Original error if this is a wrapper
 * @param {Object} context - Additional error context
 * @returns {ValidationError} The created error
 */
function createTestError(message, originalError = null, context = {}) {
  return new ValidationError(
    message,
    ErrorType.TEST_ERROR,
    originalError,
    ErrorSeverity.ERROR,
    context
  );
}

/**
 * Create an I/O error
 * @param {string} message - Error message
 * @param {Error|null} originalError - Original error if this is a wrapper
 * @param {Object} context - Additional error context
 * @returns {ValidationError} The created error
 */
function createIOError(message, originalError = null, context = {}) {
  return new ValidationError(
    message,
    ErrorType.IO_ERROR,
    originalError,
    ErrorSeverity.ERROR,
    context
  );
}

/**
 * Create a network error
 * @param {string} message - Error message
 * @param {Error|null} originalError - Original error if this is a wrapper
 * @param {Object} context - Additional error context
 * @returns {ValidationError} The created error
 */
function createNetworkError(message, originalError = null, context = {}) {
  return new ValidationError(
    message,
    ErrorType.NETWORK_ERROR,
    originalError,
    ErrorSeverity.ERROR,
    context
  );
}

/**
 * Create a timeout error
 * @param {string} message - Error message
 * @param {Error|null} originalError - Original error if this is a wrapper
 * @param {Object} context - Additional error context
 * @returns {ValidationError} The created error
 */
function createTimeoutError(message, originalError = null, context = {}) {
  return new ValidationError(
    message,
    ErrorType.TIMEOUT_ERROR,
    originalError,
    ErrorSeverity.ERROR,
    context
  );
}

/**
 * Wrap a function with standardized error handling
 * @param {Function} fn - Function to wrap
 * @param {string} errorType - Error type from ErrorType enum
 * @param {Object} context - Additional error context
 * @returns {Function} Wrapped function
 */
function withErrorHandling(fn, errorType = ErrorType.UNKNOWN_ERROR, context = {}) {
  return async function(...args) {
    try {
      return await fn(...args);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error; // Already a ValidationError, just re-throw
      }
      
      // Create appropriate error based on type
      let validationError;
      
      switch (errorType) {
        case ErrorType.CONFIG_ERROR:
          validationError = createConfigError(error.message, error, context);
          break;
        case ErrorType.VALIDATION_ERROR:
          validationError = createValidationError(error.message, error, context);
          break;
        case ErrorType.BIGQUERY_ERROR:
          validationError = createBigQueryError(error.message, error, context);
          break;
        case ErrorType.DATAFORM_ERROR:
          validationError = createDataformError(error.message, error, context);
          break;
        case ErrorType.TEST_ERROR:
          validationError = createTestError(error.message, error, context);
          break;
        case ErrorType.IO_ERROR:
          validationError = createIOError(error.message, error, context);
          break;
        case ErrorType.NETWORK_ERROR:
          validationError = createNetworkError(error.message, error, context);
          break;
        case ErrorType.TIMEOUT_ERROR:
          validationError = createTimeoutError(error.message, error, context);
          break;
        default:
          validationError = new ValidationError(
            error.message,
            ErrorType.UNKNOWN_ERROR,
            error,
            ErrorSeverity.ERROR,
            context
          );
      }
      
      // Log and re-throw
      logError(validationError);
      throw validationError;
    }
  };
}

module.exports = {
  ErrorType,
  ErrorSeverity,
  ValidationError,
  logError,
  createConfigError,
  createValidationError,
  createBigQueryError,
  createDataformError,
  createTestError,
  createIOError,
  createNetworkError,
  createTimeoutError,
  withErrorHandling
}; 