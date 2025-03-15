/**
 * @fileoverview Error Logger for MarketAds Dataform
 * 
 * This module provides error logging functionality for the MarketAds Dataform project.
 * It includes structured logging, log level filtering, and output formatting.
 */

const { MarketAdsError } = require('../errors/error_types');

// Log levels
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARNING: 2,
  ERROR: 3,
  CRITICAL: 4
};

// Default log level
const DEFAULT_LOG_LEVEL = LOG_LEVELS.INFO;

/**
 * ErrorLogger class for structured error logging
 */
class ErrorLogger {
  /**
   * Create a new ErrorLogger
   * @param {Object} options - Configuration options
   * @param {string} options.logLevel - Minimum log level to output
   * @param {Function} options.outputFn - Function to output logs
   * @param {boolean} options.includeTimestamp - Whether to include timestamps in logs
   * @param {boolean} options.includeStackTrace - Whether to include stack traces in logs
   * @param {Function} options.formatter - Function to format log entries
   */
  constructor(options = {}) {
    this.logLevel = this.parseLogLevel(options.logLevel) || DEFAULT_LOG_LEVEL;
    this.outputFn = options.outputFn || console.log;
    this.includeTimestamp = options.includeTimestamp !== false;
    this.includeStackTrace = options.includeStackTrace !== false;
    this.formatter = options.formatter || this.defaultFormatter;
    this.logHistory = [];
    this.maxHistorySize = options.maxHistorySize || 100;
  }

  /**
   * Parse a log level string to its numeric value
   * @param {string} level - Log level string
   * @returns {number} Numeric log level
   */
  parseLogLevel(level) {
    if (!level) return null;
    
    if (typeof level === 'number' && level >= 0 && level <= 4) {
      return level;
    }
    
    const upperLevel = level.toUpperCase();
    return LOG_LEVELS[upperLevel] !== undefined ? LOG_LEVELS[upperLevel] : null;
  }

  /**
   * Default log entry formatter
   * @param {Object} entry - Log entry to format
   * @returns {string} Formatted log entry
   */
  defaultFormatter(entry) {
    const parts = [];
    
    if (entry.timestamp) {
      parts.push(`[${entry.timestamp.toISOString()}]`);
    }
    
    parts.push(`[${entry.level}]`);
    
    if (entry.component) {
      parts.push(`[${entry.component}]`);
    }
    
    parts.push(entry.message);
    
    if (entry.error) {
      if (entry.error instanceof MarketAdsError) {
        parts.push(`\nError: ${entry.error.name} (${entry.error.code}): ${entry.error.message}`);
        
        if (entry.error.context && Object.keys(entry.error.context).length > 0) {
          parts.push(`\nContext: ${JSON.stringify(entry.error.context, null, 2)}`);
        }
      } else {
        parts.push(`\nError: ${entry.error.name}: ${entry.error.message}`);
      }
      
      if (entry.includeStackTrace && entry.error.stack) {
        parts.push(`\nStack Trace: ${entry.error.stack}`);
      }
    }
    
    if (entry.data && Object.keys(entry.data).length > 0) {
      parts.push(`\nData: ${JSON.stringify(entry.data, null, 2)}`);
    }
    
    return parts.join(' ');
  }

  /**
   * Log a message at a specific level
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {Object} options - Additional log options
   * @param {Error} options.error - Error object
   * @param {string} options.component - Component name
   * @param {Object} options.data - Additional data
   */
  log(level, message, options = {}) {
    const numericLevel = this.parseLogLevel(level);
    
    // Skip if below configured log level
    if (numericLevel < this.logLevel) {
      return;
    }
    
    const entry = {
      level,
      message,
      timestamp: this.includeTimestamp ? new Date() : null,
      error: options.error,
      component: options.component,
      data: options.data,
      includeStackTrace: this.includeStackTrace
    };
    
    // Add to history
    this.addToHistory(entry);
    
    // Format and output
    const formattedEntry = this.formatter(entry);
    this.outputFn(formattedEntry);
    
    return entry;
  }

  /**
   * Add a log entry to history
   * @param {Object} entry - Log entry
   */
  addToHistory(entry) {
    this.logHistory.push(entry);
    
    // Trim history if it exceeds max size
    if (this.logHistory.length > this.maxHistorySize) {
      this.logHistory = this.logHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Log a debug message
   * @param {string} message - Log message
   * @param {Object} options - Additional log options
   */
  debug(message, options = {}) {
    return this.log('DEBUG', message, options);
  }

  /**
   * Log an info message
   * @param {string} message - Log message
   * @param {Object} options - Additional log options
   */
  info(message, options = {}) {
    return this.log('INFO', message, options);
  }

  /**
   * Log a warning message
   * @param {string} message - Log message
   * @param {Object} options - Additional log options
   */
  warn(message, options = {}) {
    return this.log('WARNING', message, options);
  }

  /**
   * Log an error message
   * @param {string} message - Log message
   * @param {Object} options - Additional log options
   */
  error(message, options = {}) {
    return this.log('ERROR', message, options);
  }

  /**
   * Log a critical message
   * @param {string} message - Log message
   * @param {Object} options - Additional log options
   */
  critical(message, options = {}) {
    return this.log('CRITICAL', message, options);
  }

  /**
   * Log an error object
   * @param {Error} error - Error object to log
   * @param {Object} options - Additional log options
   * @param {string} options.message - Optional message to include
   * @param {string} options.level - Log level (defaults to ERROR or based on error severity)
   */
  logError(error, options = {}) {
    let level = options.level;
    
    // Determine level from error if not specified
    if (!level && error instanceof MarketAdsError) {
      level = error.severity;
    }
    
    // Default to ERROR if level still not determined
    level = level || 'ERROR';
    
    // Determine message
    const message = options.message || (error.message || 'An error occurred');
    
    return this.log(level, message, {
      ...options,
      error
    });
  }

  /**
   * Get log history
   * @param {Object} options - Filter options
   * @param {string} options.level - Filter by minimum log level
   * @param {string} options.component - Filter by component
   * @param {number} options.limit - Limit number of entries
   * @returns {Array} Filtered log history
   */
  getHistory(options = {}) {
    let history = [...this.logHistory];
    
    // Filter by level
    if (options.level) {
      const minLevel = this.parseLogLevel(options.level);
      history = history.filter(entry => {
        const entryLevel = this.parseLogLevel(entry.level);
        return entryLevel >= minLevel;
      });
    }
    
    // Filter by component
    if (options.component) {
      history = history.filter(entry => entry.component === options.component);
    }
    
    // Apply limit
    if (options.limit && options.limit > 0) {
      history = history.slice(-options.limit);
    }
    
    return history;
  }

  /**
   * Clear log history
   */
  clearHistory() {
    this.logHistory = [];
  }

  /**
   * Create a child logger with inherited settings and a specific component
   * @param {string} component - Component name for the child logger
   * @param {Object} options - Override options
   * @returns {ErrorLogger} Child logger
   */
  child(component, options = {}) {
    return new ErrorLogger({
      logLevel: this.logLevel,
      outputFn: this.outputFn,
      includeTimestamp: this.includeTimestamp,
      includeStackTrace: this.includeStackTrace,
      formatter: this.formatter,
      maxHistorySize: this.maxHistorySize,
      ...options,
      component
    });
  }
}

// Create a default error logger instance
const defaultErrorLogger = new ErrorLogger();

module.exports = {
  ErrorLogger,
  defaultErrorLogger,
  LOG_LEVELS
}; 