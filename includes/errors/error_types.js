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
   */
  constructor(message, options = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = options.code || 'UNKNOWN_ERROR';
    this.component = options.component || 'unknown';
    this.cause = options.cause;
    this.context = options.context || {};
    this.timestamp = new Date();
    this.severity = this.getSeverity();
    
    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Get the severity level of this error type
   * @returns {string} Severity level (CRITICAL, ERROR, WARNING, INFO)
   */
  getSeverity() {
    return 'ERROR';
  }

  /**
   * Convert error to a plain object for logging
   * @returns {Object} Plain object representation of the error
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      component: this.component,
      severity: this.severity,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
      context: this.context,
      cause: this.cause ? {
        name: this.cause.name,
        message: this.cause.message,
        stack: this.cause.stack
      } : undefined
    };
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
   */
  constructor(message, options = {}) {
    super(message, {
      ...options,
      code: options.code || 'VALIDATION_ERROR'
    });
    this.field = options.field;
    this.value = options.value;
    this.constraint = options.constraint;
  }

  /**
   * Get the severity level of this error type
   * @returns {string} Severity level
   */
  getSeverity() {
    return 'WARNING';
  }

  /**
   * Convert error to a plain object for logging
   * @returns {Object} Plain object representation of the error
   */
  toJSON() {
    return {
      ...super.toJSON(),
      field: this.field,
      value: this.value,
      constraint: this.constraint
    };
  }
}

/**
 * Error class for configuration errors
 */
class ConfigurationError extends MarketAdsError {
  /**
   * @param {string} message - Error message
   * @param {Object} options - Additional error options
   * @param {string} options.configKey - Configuration key that caused the error
   */
  constructor(message, options = {}) {
    super(message, {
      ...options,
      code: options.code || 'CONFIGURATION_ERROR'
    });
    this.configKey = options.configKey;
  }

  /**
   * Get the severity level of this error type
   * @returns {string} Severity level
   */
  getSeverity() {
    return 'ERROR';
  }

  /**
   * Convert error to a plain object for logging
   * @returns {Object} Plain object representation of the error
   */
  toJSON() {
    return {
      ...super.toJSON(),
      configKey: this.configKey
    };
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

  /**
   * Get the severity level of this error type
   * @returns {string} Severity level
   */
  getSeverity() {
    return 'ERROR';
  }

  /**
   * Convert error to a plain object for logging
   * @returns {Object} Plain object representation of the error
   */
  toJSON() {
    return {
      ...super.toJSON(),
      query: this.query,
      database: this.database,
      table: this.table
    };
  }
}

/**
 * Error class for BigQuery specific errors
 */
class BigQueryError extends DatabaseError {
  /**
   * @param {string} message - Error message
   * @param {Object} options - Additional error options
   * @param {string} options.jobId - BigQuery job ID
   * @param {string} options.location - BigQuery location
   */
  constructor(message, options = {}) {
    super(message, {
      ...options,
      code: options.code || 'BIGQUERY_ERROR',
      database: options.database || 'bigquery'
    });
    this.jobId = options.jobId;
    this.location = options.location;
  }

  /**
   * Convert error to a plain object for logging
   * @returns {Object} Plain object representation of the error
   */
  toJSON() {
    return {
      ...super.toJSON(),
      jobId: this.jobId,
      location: this.location
    };
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

  /**
   * Get the severity level of this error type
   * @returns {string} Severity level
   */
  getSeverity() {
    return 'ERROR';
  }

  /**
   * Convert error to a plain object for logging
   * @returns {Object} Plain object representation of the error
   */
  toJSON() {
    return {
      ...super.toJSON(),
      timeoutMs: this.timeoutMs,
      operation: this.operation
    };
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
   * @param {Object} options.requestData - Request data
   * @param {Object} options.responseData - Response data
   */
  constructor(message, options = {}) {
    super(message, {
      ...options,
      code: options.code || 'API_ERROR'
    });
    this.endpoint = options.endpoint;
    this.method = options.method;
    this.statusCode = options.statusCode;
    this.requestData = options.requestData;
    this.responseData = options.responseData;
  }

  /**
   * Get the severity level of this error type
   * @returns {string} Severity level
   */
  getSeverity() {
    return this.statusCode >= 500 ? 'ERROR' : 'WARNING';
  }

  /**
   * Convert error to a plain object for logging
   * @returns {Object} Plain object representation of the error
   */
  toJSON() {
    return {
      ...super.toJSON(),
      endpoint: this.endpoint,
      method: this.method,
      statusCode: this.statusCode,
      requestData: this.requestData,
      responseData: this.responseData
    };
  }
}

/**
 * Error class for critical system errors
 */
class SystemError extends MarketAdsError {
  /**
   * @param {string} message - Error message
   * @param {Object} options - Additional error options
   * @param {string} options.subsystem - Subsystem where the error occurred
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
    return 'CRITICAL';
  }

  /**
   * Convert error to a plain object for logging
   * @returns {Object} Plain object representation of the error
   */
  toJSON() {
    return {
      ...super.toJSON(),
      subsystem: this.subsystem
    };
  }
}

/**
 * Error class for resource not found errors
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

  /**
   * Convert error to a plain object for logging
   * @returns {Object} Plain object representation of the error
   */
  toJSON() {
    return {
      ...super.toJSON(),
      resourceType: this.resourceType,
      resourceId: this.resourceId
    };
  }
}

module.exports = {
  MarketAdsError,
  ValidationError,
  ConfigurationError,
  DatabaseError,
  BigQueryError,
  TimeoutError,
  ApiError,
  SystemError,
  NotFoundError
}; 