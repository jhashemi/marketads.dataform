/**
 * @fileoverview Validation Error for MarketAds Dataform
 * 
 * This module provides a specialized ValidationError class for validation errors.
 */

const { MarketAdsError } = require('./error_types');

/**
 * ValidationError class for validation-specific errors
 * @extends MarketAdsError
 */
class ValidationError extends MarketAdsError {
  /**
   * Create a new ValidationError
   * @param {string} message - Error message
   * @param {Object} options - Additional error options
   * @param {string} options.field - Field that failed validation
   * @param {*} options.value - Value that failed validation
   * @param {string} options.constraint - Constraint that was violated
   * @param {Function} options.messageFormatter - Custom message formatter
   * @param {string} options.code - Error code
   * @param {string} options.severity - Error severity
   * @param {string} options.component - Component where the error occurred
   * @param {Error} options.cause - Original error that caused this error
   * @param {Object} options.context - Additional context information
   */
  constructor(message, options = {}) {
    super(message, {
      ...options,
      code: options.code || 'VALIDATION_ERROR',
      severity: options.severity || 'WARNING'
    });
    
    this.field = options.field;
    this.value = options.value;
    this.constraint = options.constraint;
    this.messageFormatter = options.messageFormatter;
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

module.exports = { ValidationError }; 