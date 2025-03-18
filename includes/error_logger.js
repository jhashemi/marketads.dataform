/**
 * Error logging module for Dataform project
 * Provides structured error logging and monitoring capabilities
 */

// Error types constants
const ERROR_TYPES = {
  SEMANTIC_TYPE_DETECTION: 'semantic_type_detection',
  FIELD_MAPPING: 'field_mapping',
  STANDARDIZATION: 'standardization',
  VALIDATION: 'validation',
  CONFIGURATION: 'configuration',
  EXECUTION: 'execution'
};

// Severity levels
const SEVERITY = {
  INFO: 'INFO',
  WARNING: 'WARNING',
  ERROR: 'ERROR',
  CRITICAL: 'CRITICAL'
};

/**
 * Creates the error log table if it doesn't exist
 * @returns {string} SQL to create error log table
 */
const createErrorLogTable = () => {
  return `
    CREATE TABLE IF NOT EXISTS \${self().schema}.error_log (
      error_id STRING,
      timestamp TIMESTAMP,
      context STRING,
      error_type STRING,
      severity STRING,
      details STRING,
      source_file STRING
    )
  `;
};

/**
 * Logs an error to the error_log table
 * @param {string} context - The context where the error occurred
 * @param {string} errorType - The type of error (use ERROR_TYPES constants)
 * @param {Object} details - Details about the error
 * @param {string} severity - Error severity (use SEVERITY constants)
 * @returns {string} SQL to insert into error_log table
 */
const logError = (context, errorType, details, severity = SEVERITY.ERROR) => {
  const timestamp = new Date().toISOString();
  const errorId = `ERR_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const sourceFile = details.sourceFile || 'unknown';
  
  // Clean and stringify details
  const cleanDetails = { ...details };
  delete cleanDetails.sourceFile; // Remove sourceFile from details
  const detailsJson = JSON.stringify(cleanDetails).replace(/'/g, "''"); // Escape single quotes
  
  return `
    INSERT INTO \${self().schema}.error_log (
      error_id, timestamp, context, error_type, severity, details, source_file
    )
    VALUES (
      '${errorId}', 
      '${timestamp}', 
      '${context}', 
      '${errorType}', 
      '${severity}', 
      '${detailsJson}',
      '${sourceFile}'
    )
  `;
};

/**
 * Creates SQL to query recent errors
 * @param {number} hours - Number of hours to look back
 * @param {string} errorType - Optional filter for error type
 * @param {string} minSeverity - Minimum severity level to include
 * @returns {string} SQL to query recent errors
 */
const getRecentErrors = (hours = 24, errorType = null, minSeverity = SEVERITY.WARNING) => {
  let sql = `
    SELECT 
      error_id,
      timestamp,
      context,
      error_type,
      severity,
      details,
      source_file
    FROM \${self().schema}.error_log
    WHERE timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL ${hours} HOUR)
  `;
  
  // Add filters if provided
  if (errorType) {
    sql += `\n    AND error_type = '${errorType}'`;
  }
  
  // Filter by minimum severity
  if (minSeverity === SEVERITY.CRITICAL) {
    sql += `\n    AND severity = '${SEVERITY.CRITICAL}'`;
  } else if (minSeverity === SEVERITY.ERROR) {
    sql += `\n    AND severity IN ('${SEVERITY.ERROR}', '${SEVERITY.CRITICAL}')`;
  } else if (minSeverity === SEVERITY.WARNING) {
    sql += `\n    AND severity IN ('${SEVERITY.WARNING}', '${SEVERITY.ERROR}', '${SEVERITY.CRITICAL}')`;
  }
  
  sql += `\n    ORDER BY timestamp DESC`;
  
  return sql;
};

// Exports
module.exports = {
  ERROR_TYPES,
  SEVERITY,
  createErrorLogTable,
  logError,
  getRecentErrors
}; 