/**
 * @fileoverview Error Types for MarketAds Dataform
 * 
 * This module defines the error types used throughout the MarketAds Dataform project.
 * It provides a hierarchy of error classes to enable precise error handling and reporting.
 */

/**
 * Base error class for all MarketAds Dataform errors
 */
class MarketAdsError extends Error {
  /**
   * @param {string} message - Error message
   * @param {Object} options - Additional error options
   * @param {string} options.code - Error code
   * @param {string} options.component - Component where the error occurred
   * @param {Error} options.cause - Original error that caused this error
   * @param {Object} options.context - Additional context information
   * @param {string} options.severity - Error severity level
   */
  constructor(message, options = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = options.code || 'MARKETADS_ERROR';
    this.component = options.component || 'unknown';
    this.cause = options.cause;
    this.context = options.context || {};
    this.timestamp = new Date();
    this.severity = options.severity || this.getSeverity();
    
    // Add any custom properties from options
    Object.keys(options).forEach(key => {
      if (!['code', 'component', 'cause', 'context', 'severity'].includes(key)) {
        this[key] = options[key];
      }
    });
    
    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Get the severity level of this error type
   * @returns {string} Severity level (ERROR, WARNING, INFO)
   */
  getSeverity() {
    return 'ERROR';
  }

  /**
   * Convert error to a plain object for logging
   * @returns {Object} Plain object representation of the error
   */
  toJSON() {
    const json = {
      name: this.name,
      message: this.message,
      code: this.code,
      component: this.component,
      severity: this.severity,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
      context: this.context,
      cause: this.cause ? (this.cause.toJSON ? this.cause.toJSON() : {
        name: this.cause.name,
        message: this.cause.message,
        stack: this.cause.stack
      }) : undefined
    };
    
    // Add any custom properties
    Object.keys(this).forEach(key => {
      if (!['name', 'message', 'code', 'component', 'severity', 'timestamp', 'stack', 'context', 'cause'].includes(key)) {
        json[key] = this[key];
      }
    });
    
    return json;
  }
  
  /**
   * Create a MarketAdsError from a standard Error
   * @param {Error} error - Original error
   * @param {Object} options - Additional options
   * @returns {MarketAdsError} Wrapped error
   */
  static fromError(error, options = {}) {
    // If already a MarketAdsError, return as is
    if (error instanceof MarketAdsError) {
      return error;
    }
    
    // Create a new MarketAdsError with the original error as cause
    return new MarketAdsError(error.message, {
      ...options,
      cause: error
    });
  }
}

/**
 * Error class for validation errors
 */
class ValidationError extends MarketAdsError {
  /**
   * @param {string} message - Error message
   * @param {Object} options - Additional error options
   * @param {string} options.field - Field that failed validation
   * @param {*} options.value - Value that failed validation
   * @param {string} options.constraint - Constraint that was violated
   * @param {Function} options.messageFormatter - Custom message formatter
   */
  constructor(message, options = {}) {
    super(message, {
      ...options,
      code: options.code || 'VALIDATION_ERROR'
    });
    this.field = options.field;
    this.value = options.value;
    this.constraint = options.constraint;
    this.messageFormatter = options.messageFormatter;
  }

  /**
   * Get the severity level of this error type
   * @returns {string} Severity level
   */
  getSeverity() {
    return 'WARNING';
  }
  
  /**
   * Format a user-friendly error message
   * @returns {string} Formatted message
   */
  formatMessage() {
    if (this.messageFormatter) {
      return this.messageFormatter(this);
    }
    
    if (this.field && this.constraint) {
      return `Validation failed for field '${this.field}': ${this.constraint} constraint violated with value '${this.value}'`;
    }
    
    return this.message;
  }
  
  /**
   * Create validation errors from a validation result object
   * @param {Object} validationResult - Validation result with errors
   * @returns {ValidationError[]} Array of validation errors
   */
  static fromValidationResult(validationResult) {
    if (!validationResult || validationResult.valid) {
      return [];
    }
    
    return (validationResult.errors || []).map(error => 
      new ValidationError(error.message, {
        field: error.field,
        value: error.value,
        constraint: error.constraint
      })
    );
  }
}

/**
 * Error class for Dataform specific errors
 */
class DataformError extends MarketAdsError {
  /**
   * @param {string} message - Error message
   * @param {Object} options - Additional error options
   */
  constructor(message, options = {}) {
    super(message, {
      ...options,
      code: options.code || 'DATAFORM_ERROR'
    });
  }
}

/**
 * Error class for configuration errors
 */
class ConfigurationError extends MarketAdsError {
  /**
   * @param {string} message - Error message
   * @param {Object} options - Additional error options
   * @param {string} options.parameter - Parameter that caused the error
   * @param {*} options.value - Invalid value
   * @param {string} options.expected - Expected value or format
   */
  constructor(message, options = {}) {
    super(message, {
      ...options,
      code: options.code || 'CONFIGURATION_ERROR'
    });
    this.parameter = options.parameter;
    this.value = options.value;
    this.expected = options.expected;
  }
}

/**
 * Error class for database errors
 */
class DatabaseError extends MarketAdsError {
  /**
   * @param {string} message - Error message
   * @param {Object} options - Additional error options
   * @param {string} options.query - SQL query that caused the error
   * @param {string} options.database - Database name
   * @param {string} options.table - Table name
   */
  constructor(message, options = {}) {
    super(message, {
      ...options,
      code: options.code || 'DATABASE_ERROR'
    });
    this.query = options.query;
    this.database = options.database;
    this.table = options.table;
  }
}

/**
 * Error class for BigQuery specific errors
 */
class BigQueryError extends MarketAdsError {
  /**
   * @param {string} message - Error message
   * @param {Object} options - Additional error options
   * @param {string} options.query - SQL query that caused the error
   * @param {string} options.jobId - BigQuery job ID
   * @param {string} options.location - BigQuery location
   */
  constructor(message, options = {}) {
    super(message, {
      ...options,
      code: options.code || 'BIGQUERY_ERROR'
    });
    this.query = options.query;
    this.jobId = options.jobId;
    this.location = options.location;
  }
}

/**
 * Error class for timeout errors
 */
class TimeoutError extends MarketAdsError {
  /**
   * @param {string} message - Error message
   * @param {Object} options - Additional error options
   * @param {number} options.timeoutMs - Timeout in milliseconds
   * @param {string} options.operation - Operation that timed out
   */
  constructor(message, options = {}) {
    super(message, {
      ...options,
      code: options.code || 'TIMEOUT_ERROR'
    });
    this.timeoutMs = options.timeoutMs;
    this.operation = options.operation;
  }
}

/**
 * Error class for API errors
 */
class ApiError extends MarketAdsError {
  /**
   * @param {string} message - Error message
   * @param {Object} options - Additional error options
   * @param {string} options.endpoint - API endpoint
   * @param {string} options.method - HTTP method
   * @param {number} options.statusCode - HTTP status code
   * @param {Object} options.response - API response data
   */
  constructor(message, options = {}) {
    super(message, {
      ...options,
      code: options.code || 'API_ERROR'
    });
    this.endpoint = options.endpoint;
    this.method = options.method;
    this.statusCode = options.statusCode;
    this.response = options.response;
  }

  /**
   * Get the severity level based on status code
   * @returns {string} Severity level
   */
  getSeverity() {
    // 5xx errors are server errors (more severe)
    if (this.statusCode && this.statusCode >= 500) {
      return 'ERROR';
    }
    // 4xx errors are client errors (less severe)
    return 'WARNING';
  }
}

/**
 * Error class for system errors
 */
class SystemError extends MarketAdsError {
  /**
   * @param {string} message - Error message
   * @param {Object} options - Additional error options
   * @param {string} options.subsystem - Affected subsystem
   */
  constructor(message, options = {}) {
    super(message, {
      ...options,
      code: options.code || 'SYSTEM_ERROR'
    });
    this.subsystem = options.subsystem;
  }

  /**
   * Get the severity level of this error type
   * @returns {string} Severity level
   */
  getSeverity() {
    return 'ERROR';
  }
}

/**
 * Error class for not found errors
 */
class NotFoundError extends MarketAdsError {
  /**
   * @param {string} message - Error message
   * @param {Object} options - Additional error options
   * @param {string} options.resourceType - Type of resource not found
   * @param {string} options.resourceId - ID of resource not found
   */
  constructor(message, options = {}) {
    super(message, {
      ...options,
      code: options.code || 'NOT_FOUND_ERROR'
    });
    this.resourceType = options.resourceType;
    this.resourceId = options.resourceId;
  }

  /**
   * Get the severity level of this error type
   * @returns {string} Severity level
   */
  getSeverity() {
    return 'WARNING';
  }
}

module.exports = {
  MarketAdsError,
  ValidationError,
  DataformError,
  ConfigurationError,
  DatabaseError,
  BigQueryError,
  TimeoutError,
  ApiError,
  SystemError,
  NotFoundError
}; 