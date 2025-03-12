/**
 * Custom Error Types
 * 
 * This module defines custom error types used throughout the application.
 * Each error type extends the base Error class with additional properties.
 */

/**
 * Base error for all application errors
 */
class MatchingError extends Error {
  constructor(message) {
    super(message);
    this.name = 'MatchingError';
  }
}

/**
 * Error thrown when configuration is invalid
 */
class ConfigurationError extends MatchingError {
  constructor(message, configKey) {
    super(message);
    this.name = 'ConfigurationError';
    this.configKey = configKey;
  }
}

/**
 * Error thrown when validation fails
 */
class ValidationError extends MatchingError {
  constructor(message, fieldName, value) {
    super(message);
    this.name = 'ValidationError';
    this.fieldName = fieldName;
    this.value = value;
  }
}

/**
 * Error thrown when a required field is missing
 */
class MissingFieldError extends ValidationError {
  constructor(fieldName) {
    super(`Missing required field: ${fieldName}`, fieldName, undefined);
    this.name = 'MissingFieldError';
  }
}

/**
 * Error thrown when a semantic type is invalid or cannot be mapped
 */
class SemanticTypeError extends MatchingError {
  constructor(message, semanticType) {
    super(message);
    this.name = 'SemanticTypeError';
    this.semanticType = semanticType;
  }
}

/**
 * Error thrown when a match strategy is invalid or cannot be applied
 */
class StrategyError extends MatchingError {
  constructor(message, strategyName) {
    super(message);
    this.name = 'StrategyError';
    this.strategyName = strategyName;
  }
}

/**
 * Error thrown when SQL generation fails
 */
class SqlGenerationError extends MatchingError {
  constructor(message, sqlPart) {
    super(message);
    this.name = 'SqlGenerationError';
    this.sqlPart = sqlPart;
  }
}

module.exports = {
  MatchingError,
  ConfigurationError,
  ValidationError,
  MissingFieldError,
  SemanticTypeError,
  StrategyError,
  SqlGenerationError
}; 