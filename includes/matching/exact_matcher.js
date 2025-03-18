/**
 * Exact Matcher
 * 
 * This module provides exact matching functionality with optional normalization.
 * It can match strings, numbers, booleans, dates, and handle null values.
 */

/**
 * Normalize a value based on specified options
 * @param {any} value - Value to normalize
 * @param {Object} [options={}] - Normalization options
 * @param {boolean} [options.trim=false] - Whether to trim string values
 * @param {boolean} [options.caseSensitive=true] - Whether string comparison is case-sensitive
 * @param {number} [options.precision] - Number of decimal places for numeric values
 * @param {string} [options.dateFormat] - Format for date values ('YYYY-MM-DD', etc.)
 * @param {string} [options.convertType] - Type to convert value to ('string', 'number', 'boolean', 'date')
 * @param {any} [options.nullValue] - Value to use instead of null/undefined
 * @returns {any} Normalized value
 */
function normalizeValue(value, options = {}) {
  const {
    trim = false,
    caseSensitive = true,
    precision,
    dateFormat,
    convertType,
    nullValue
  } = options;
  
  // Handle null/undefined values
  if (value === null || value === undefined) {
    if (nullValue !== undefined) {
      return nullValue;
    }
    return value;
  }
  
  // Type conversion if specified
  if (convertType) {
    switch (convertType.toLowerCase()) {
      case 'string':
        return String(value);
      case 'number':
        return Number(value);
      case 'boolean':
        // Convert to boolean (0, '0', 'false', false -> false, everything else -> true)
        if (value === 0 || value === '0' || value === 'false' || value === false) {
          return false;
        }
        return Boolean(value);
      case 'date':
        return new Date(value);
    }
  }
  
  // String-specific normalizations
  if (typeof value === 'string') {
    let result = value;
    
    if (trim) {
      result = result.trim();
    }
    
    if (!caseSensitive) {
      result = result.toLowerCase();
    }
    
    return result;
  }
  
  // Number-specific normalizations
  if (typeof value === 'number' && precision !== undefined) {
    return Number(value.toFixed(precision));
  }
  
  // Date-specific normalizations
  if (value instanceof Date && dateFormat) {
    // Simple date formatting for common patterns
    if (dateFormat === 'YYYY-MM-DD') {
      return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
    }
    else if (dateFormat === 'MM/DD/YYYY') {
      return `${String(value.getMonth() + 1).padStart(2, '0')}/${String(value.getDate()).padStart(2, '0')}/${value.getFullYear()}`;
    }
    // For more complex formatting, one would typically use a date library
    return value.toISOString();
  }
  
  // Default: return the value unchanged
  return value;
}

/**
 * Check if two values match exactly, with optional normalization
 * @param {any} value1 - First value
 * @param {any} value2 - Second value
 * @param {Object} [options={}] - Match options
 * @param {boolean} [options.trim=false] - Whether to trim string values
 * @param {boolean} [options.caseSensitive=true] - Whether string comparison is case-sensitive
 * @param {number} [options.tolerance=0] - Tolerance for numeric equality
 * @param {boolean} [options.nullEqualsNull=true] - Whether null equals null
 * @returns {number} 1.0 if match, 0.0 if no match
 */
function exactMatch(value1, value2, options = {}) {
  const {
    trim = false,
    caseSensitive = true,
    tolerance = 0,
    nullEqualsNull = true
  } = options;
  
  // Handle null/undefined special cases
  if (value1 === null && value2 === null) {
    return nullEqualsNull ? 1.0 : 0.0;
  }
  
  if (value1 === undefined && value2 === undefined) {
    return nullEqualsNull ? 1.0 : 0.0;
  }
  
  if (value1 === null || value1 === undefined || value2 === null || value2 === undefined) {
    return 0.0;
  }
  
  // Normalize values based on options
  const normalizedValue1 = normalizeValue(value1, { trim, caseSensitive });
  const normalizedValue2 = normalizeValue(value2, { trim, caseSensitive });
  
  // Handle numeric comparison with tolerance
  if (typeof normalizedValue1 === 'number' && typeof normalizedValue2 === 'number') {
    if (Math.abs(normalizedValue1 - normalizedValue2) <= tolerance) {
      return 1.0;
    }
    return 0.0;
  }
  
  // Handle date comparison
  if (normalizedValue1 instanceof Date && normalizedValue2 instanceof Date) {
    if (normalizedValue1.getTime() === normalizedValue2.getTime()) {
      return 1.0;
    }
    return 0.0;
  }
  
  // Default equality check
  if (normalizedValue1 === normalizedValue2) {
    return 1.0;
  }
  
  return 0.0;
}

/**
 * Generate SQL for exact matching
 * @param {string} field1 - First field expression
 * @param {string} field2 - Second field expression
 * @param {Object} [options={}] - SQL generation options
 * @param {boolean} [options.trim=false] - Whether to trim string values
 * @param {boolean} [options.caseSensitive=true] - Whether string comparison is case-sensitive
 * @param {boolean} [options.nullEqualsNull=false] - Whether null equals null
 * @param {boolean} [options.isNumeric=false] - Whether fields contain numeric values
 * @param {number} [options.tolerance=0] - Tolerance for numeric equality
 * @returns {string} SQL for exact matching
 */
function generateExactMatchSql(field1, field2, options = {}) {
  const {
    trim = false,
    caseSensitive = true,
    nullEqualsNull = false,
    isNumeric = false,
    tolerance = 0
  } = options;
  
  // Build field expressions with normalizations
  let expr1 = field1;
  let expr2 = field2;
  
  // Apply trimming if requested
  if (trim) {
    expr1 = `TRIM(${expr1})`;
    expr2 = `TRIM(${expr2})`;
  }
  
  // Apply case insensitivity if requested
  if (!caseSensitive) {
    expr1 = `UPPER(${expr1})`;
    expr2 = `UPPER(${expr2})`;
  }
  
  // Handle numeric comparison with tolerance
  if (isNumeric && tolerance > 0) {
    return `CASE WHEN ${expr1} IS NULL OR ${expr2} IS NULL THEN 0
      WHEN ABS(${expr1} - ${expr2}) <= ${tolerance} THEN 1
      ELSE 0 END`;
  }
  
  // Regular equality with null handling
  let sql = nullEqualsNull 
    ? `CASE WHEN ${expr1} IS NULL AND ${expr2} IS NULL THEN 1
        WHEN ${expr1} IS NULL OR ${expr2} IS NULL THEN 0
        WHEN ${expr1} = ${expr2} THEN 1
        ELSE 0 END`
    : `CASE WHEN ${expr1} IS NULL OR ${expr2} IS NULL THEN 0
        WHEN ${expr1} = ${expr2} THEN 1
        ELSE 0 END`;
  
  return sql.trim();
}

/**
 * Create a SQL function for exact matching
 * @param {string} functionName - Name for the SQL function
 * @param {Object} [options={}] - SQL function options
 * @returns {string} SQL CREATE FUNCTION statement
 */
function createExactMatchSqlFunction(functionName, options = {}) {
  const {
    trim = false,
    caseSensitive = true,
    nullEqualsNull = false,
    isNumeric = false,
    tolerance = 0
  } = options;
  
  return `
    CREATE OR REPLACE FUNCTION \`\${self()}.${functionName}\`(
      value1 STRING, 
      value2 STRING
    )
    RETURNS FLOAT64
    AS (
      ${generateExactMatchSql('value1', 'value2', {
        trim,
        caseSensitive,
        nullEqualsNull,
        isNumeric,
        tolerance
      })}
    );
  `;
}

/**
 * Get an exact matcher with the specified configuration
 * @param {Object} [config={}] - Matcher configuration
 * @param {boolean} [config.trim=false] - Whether to trim string values
 * @param {boolean} [config.caseSensitive=true] - Whether string comparison is case-sensitive
 * @param {number} [config.tolerance=0] - Tolerance for numeric equality
 * @param {boolean} [config.nullEqualsNull=true] - Whether null equals null
 * @param {number} [config.defaultThreshold=1.0] - Default threshold for isMatch
 * @returns {Object} Exact matcher object
 */
function getExactMatcher(config = {}) {
  const {
    trim = false,
    caseSensitive = true,
    tolerance = 0,
    nullEqualsNull = true,
    defaultThreshold = 1.0
  } = config;
  
  return {
    /**
     * Match two values exactly
     * @param {any} value1 - First value
     * @param {any} value2 - Second value
     * @param {Object} [options={}] - Match options
     * @returns {Object} Match result with score and isMatch
     */
    match(value1, value2, options = {}) {
      const matchOptions = {
        trim,
        caseSensitive,
        tolerance,
        nullEqualsNull,
        ...options
      };
      
      const score = exactMatch(value1, value2, matchOptions);
      const threshold = options.threshold || defaultThreshold;
      
      return {
        score,
        isMatch: score >= threshold,
        value1,
        value2,
        threshold
      };
    },
    
    /**
     * Generate SQL for exact matching
     * @param {string} field1 - First field expression
     * @param {string} field2 - Second field expression
     * @param {Object} [options={}] - SQL generation options
     * @returns {string} SQL for exact matching
     */
    generateSql(field1, field2, options = {}) {
      return generateExactMatchSql(field1, field2, {
        trim,
        caseSensitive,
        nullEqualsNull,
        tolerance,
        ...options
      });
    },
    
    /**
     * Create a SQL function for exact matching
     * @param {string} functionName - Name for the SQL function
     * @param {Object} [options={}] - SQL function options
     * @returns {string} SQL CREATE FUNCTION statement
     */
    createSqlFunction(functionName, options = {}) {
      return createExactMatchSqlFunction(functionName, {
        trim,
        caseSensitive,
        nullEqualsNull,
        tolerance,
        ...options
      });
    },
    
    /**
     * Get the configuration for this matcher
     * @returns {Object} Current configuration
     */
    getConfig() {
      return {
        trim,
        caseSensitive,
        tolerance,
        nullEqualsNull,
        defaultThreshold
      };
    }
  };
}

module.exports = {
  normalizeValue,
  exactMatch,
  generateExactMatchSql,
  createExactMatchSqlFunction,
  getExactMatcher
};