/**
 * SQL Dialect Handlers
 * 
 * This module provides dialect-specific SQL functionality for:
 * - BigQuery
 * - PostgreSQL
 * - Snowflake
 * 
 * Each dialect handler implements a consistent interface for common SQL operations
 * that might vary between different database engines.
 */

const { SqlGenerationError } = require('../core/errors');

/**
 * Supported SQL dialects
 * @enum {string}
 */
const SQL_DIALECTS = {
  BIGQUERY: 'bigquery',
  POSTGRESQL: 'postgresql',
  SNOWFLAKE: 'snowflake'
};

/**
 * Default SQL dialect to use if not specified
 */
const DEFAULT_DIALECT = SQL_DIALECTS.BIGQUERY;

/**
 * Base SQL dialect handler with common functionality
 */
class BaseDialectHandler {
  /**
   * Creates a new dialect handler
   * @param {string} dialectName - The name of the dialect
   */
  constructor(dialectName) {
    this.dialectName = dialectName;
  }
  
  /**
   * Escapes an identifier (table, column name)
   * @param {string} identifier - The identifier to escape
   * @returns {string} Escaped identifier
   */
  escapeIdentifier(identifier) {
    throw new Error('Method escapeIdentifier must be implemented by subclass');
  }
  
  /**
   * Formats a date column with the specified format string
   * @param {string} columnExpr - The column or expression to format
   * @param {string} formatStr - The format string
   * @returns {string} SQL expression for formatted date
   */
  dateFormat(columnExpr, formatStr) {
    throw new Error('Method dateFormat must be implemented by subclass');
  }
  
  /**
   * Creates a timestamp from a string 
   * @param {string} timestampStr - Timestamp string literal
   * @returns {string} SQL expression for timestamp creation
   */
  parseTimestamp(timestampStr) {
    throw new Error('Method parseTimestamp must be implemented by subclass');
  }
  
  /**
   * Gets the current timestamp
   * @returns {string} SQL expression for current timestamp
   */
  currentTimestamp() {
    throw new Error('Method currentTimestamp must be implemented by subclass');
  }
  
  /**
   * Creates a regular expression match condition
   * @param {string} column - The column to match against
   * @param {string} pattern - The regex pattern
   * @returns {string} SQL expression for regex matching
   */
  regexMatch(column, pattern) {
    throw new Error('Method regexMatch must be implemented by subclass');
  }
  
  /**
   * Creates an array literal
   * @param {Array} values - Array values
   * @returns {string} SQL expression for array literal
   */
  arrayLiteral(values) {
    throw new Error('Method arrayLiteral must be implemented by subclass');
  }
  
  /**
   * Creates a function to check if a value exists in an array
   * @param {string} value - The value to check
   * @param {string} arrayExpr - The array expression
   * @returns {string} SQL expression for array contains check
   */
  arrayContains(value, arrayExpr) {
    throw new Error('Method arrayContains must be implemented by subclass');
  }
  
  /**
   * Calculates the similarity between two strings
   * @param {string} str1 - The first string
   * @param {string} str2 - The second string
   * @returns {string} SQL expression for string similarity
   */
  stringSimilarity(str1, str2) {
    throw new Error('Method stringSimilarity must be implemented by subclass');
  }
  
  /**
   * Creates a window function with partition and ordering
   * @param {string} aggregate - The aggregate function
   * @param {string} partitionBy - The partition expression
   * @param {string} orderBy - The order expression
   * @returns {string} SQL expression for window function
   */
  windowFunction(aggregate, partitionBy, orderBy) {
    throw new Error('Method windowFunction must be implemented by subclass');
  }
  
  /**
   * Creates a CASE WHEN statement with multiple conditions
   * @param {...any} args - Alternating conditions and results, with optional default
   * @returns {string} SQL CASE WHEN expression
   * 
   * Usage: caseWhen(condition1, result1, condition2, result2, ..., defaultResult)
   * If odd number of args, the last one is used as the ELSE result
   */
  caseWhen(...args) {
    if (args.length < 2) {
      throw new SqlGenerationError('CASE WHEN requires at least one condition and result');
    }
    
    let sql = 'CASE';
    const hasDefault = args.length % 2 !== 0;
    const pairs = hasDefault ? Math.floor(args.length / 2) : args.length / 2;
    
    for (let i = 0; i < pairs; i++) {
      const condition = args[i * 2];
      const result = args[i * 2 + 1];
      sql += ` WHEN ${condition} THEN ${result}`;
    }
    
    if (hasDefault) {
      sql += ` ELSE ${args[args.length - 1]}`;
    }
    
    sql += ' END';
    return sql;
  }
}

/**
 * BigQuery dialect handler
 */
class BigQueryDialectHandler extends BaseDialectHandler {
  constructor() {
    super(SQL_DIALECTS.BIGQUERY);
  }
  
  escapeIdentifier(identifier) {
    // In BigQuery, identifiers with special characters (. or -) need to be backtick quoted
    if (/[.\s-]/.test(identifier)) {
      return `\`${identifier}\``;
    }
    return identifier;
  }
  
  dateFormat(columnExpr, formatStr) {
    return `FORMAT_DATE('${formatStr}', ${columnExpr})`;
  }
  
  parseTimestamp(timestampStr) {
    return `TIMESTAMP '${timestampStr}'`;
  }
  
  currentTimestamp() {
    return 'CURRENT_TIMESTAMP()';
  }
  
  regexMatch(column, pattern) {
    return `REGEXP_CONTAINS(${column}, r'${pattern}')`;
  }
  
  arrayLiteral(values) {
    const formattedValues = values.map(v => formatSqlValue(v)).join(', ');
    return `[${formattedValues}]`;
  }
  
  arrayContains(value, arrayExpr) {
    return `${formatSqlValue(value)} IN UNNEST(${arrayExpr})`;
  }
  
  stringSimilarity(str1, str2) {
    // BigQuery doesn't have a built-in fuzzy matching function like levenshtein
    // Using a workaround with jaccard similarity based on character 3-grams
    return `
      (SELECT 
        IFNULL(
          SAFE_DIVIDE(
            COUNTIF(t1 IN UNNEST(t2_array)),
            ARRAY_LENGTH(t2_array)
          ), 0
        ) AS similarity
       FROM UNNEST(REGEXP_EXTRACT_ALL(LOWER(${str1}), '.{1,3}')) as t1
       CROSS JOIN (
         SELECT ARRAY_AGG(t2) AS t2_array
         FROM UNNEST(REGEXP_EXTRACT_ALL(LOWER(${str2}), '.{1,3}')) as t2
       )
      )`;
  }
  
  windowFunction(aggregate, partitionBy, orderBy) {
    let windowClause = '';
    if (partitionBy) {
      windowClause += ` PARTITION BY ${partitionBy}`;
    }
    if (orderBy) {
      windowClause += ` ORDER BY ${orderBy}`;
    }
    return `${aggregate} OVER (${windowClause})`;
  }
}

/**
 * PostgreSQL dialect handler
 */
class PostgreSQLDialectHandler extends BaseDialectHandler {
  constructor() {
    super(SQL_DIALECTS.POSTGRESQL);
  }
  
  escapeIdentifier(identifier) {
    // In PostgreSQL, identifiers with special characters need to be double quoted
    // Double quotes inside identifiers need to be escaped as ""
    if (/[.\s-"]/.test(identifier)) {
      return `"${identifier.replace(/"/g, '""')}"`;
    }
    return identifier;
  }
  
  dateFormat(columnExpr, formatStr) {
    return `TO_CHAR(${columnExpr}::date, '${formatStr}')`;
  }
  
  parseTimestamp(timestampStr) {
    return `TIMESTAMP '${timestampStr}'`;
  }
  
  currentTimestamp() {
    return 'CURRENT_TIMESTAMP';
  }
  
  regexMatch(column, pattern) {
    return `${column} ~ '${pattern}'`;
  }
  
  arrayLiteral(values) {
    const formattedValues = values.map(v => formatSqlValue(v)).join(', ');
    return `ARRAY[${formattedValues}]`;
  }
  
  arrayContains(value, arrayExpr) {
    return `${formatSqlValue(value)} = ANY(${arrayExpr})`;
  }
  
  stringSimilarity(str1, str2) {
    // PostgreSQL has levenshtein function if pg_trgm extension is enabled
    return `(1 - (levenshtein(${str1}, ${str2})::float / GREATEST(length(${str1}), length(${str2}))))`;
  }
  
  windowFunction(aggregate, partitionBy, orderBy) {
    let windowClause = '';
    if (partitionBy) {
      windowClause += ` PARTITION BY ${partitionBy}`;
    }
    if (orderBy) {
      windowClause += ` ORDER BY ${orderBy}`;
    }
    return `${aggregate} OVER (${windowClause})`;
  }
}

/**
 * Snowflake dialect handler
 */
class SnowflakeDialectHandler extends BaseDialectHandler {
  constructor() {
    super(SQL_DIALECTS.SNOWFLAKE);
  }
  
  escapeIdentifier(identifier) {
    // In Snowflake, identifiers with special characters need to be double quoted
    // Double quotes inside identifiers need to be escaped as ""
    if (/[.\s-"]/.test(identifier)) {
      return `"${identifier.replace(/"/g, '""')}"`;
    }
    return identifier;
  }
  
  dateFormat(columnExpr, formatStr) {
    return `TO_CHAR(${columnExpr}, '${formatStr}')`;
  }
  
  parseTimestamp(timestampStr) {
    return `TIMESTAMP '${timestampStr}'`;
  }
  
  currentTimestamp() {
    return 'CURRENT_TIMESTAMP()';
  }
  
  regexMatch(column, pattern) {
    return `REGEXP_LIKE(${column}, '${pattern}')`;
  }
  
  arrayLiteral(values) {
    const formattedValues = values.map(v => formatSqlValue(v)).join(', ');
    return `ARRAY_CONSTRUCT(${formattedValues})`;
  }
  
  arrayContains(value, arrayExpr) {
    return `ARRAY_CONTAINS(${formatSqlValue(value)}, ${arrayExpr})`;
  }
  
  stringSimilarity(str1, str2) {
    // Snowflake has EDITDISTANCE function
    return `(1 - (EDITDISTANCE(${str1}, ${str2})::float / GREATEST(LENGTH(${str1}), LENGTH(${str2}))))`;
  }
  
  windowFunction(aggregate, partitionBy, orderBy) {
    let windowClause = '';
    if (partitionBy) {
      windowClause += ` PARTITION BY ${partitionBy}`;
    }
    if (orderBy) {
      windowClause += ` ORDER BY ${orderBy}`;
    }
    return `${aggregate} OVER (${windowClause})`;
  }
}

// Registry of dialect handlers
const DIALECT_HANDLERS = {
  [SQL_DIALECTS.BIGQUERY]: new BigQueryDialectHandler(),
  [SQL_DIALECTS.POSTGRESQL]: new PostgreSQLDialectHandler(),
  [SQL_DIALECTS.SNOWFLAKE]: new SnowflakeDialectHandler()
};

/**
 * Get the appropriate dialect handler
 * @param {string} dialect - The SQL dialect
 * @returns {BaseDialectHandler} The dialect handler
 * @throws {SqlGenerationError} If the dialect is not supported
 */
function getDialectHandler(dialect = DEFAULT_DIALECT) {
  const handler = DIALECT_HANDLERS[dialect.toLowerCase()];
  if (!handler) {
    throw new SqlGenerationError(`Unsupported SQL dialect: ${dialect}`);
  }
  return handler;
}

/**
 * Format a JavaScript value for SQL insertion
 * @param {*} value - The value to format
 * @returns {string} SQL literal representation
 */
function formatSqlValue(value) {
  if (value === null || value === undefined) {
    return 'NULL';
  }
  
  if (typeof value === 'string') {
    // Escape single quotes by doubling them
    return `'${value.replace(/'/g, "''")}'`;
  }
  
  if (typeof value === 'number') {
    return value.toString();
  }
  
  if (typeof value === 'boolean') {
    return value ? 'TRUE' : 'FALSE';
  }
  
  if (value instanceof Date) {
    return `DATE '${value.toISOString().split('T')[0]}'`;
  }
  
  if (Array.isArray(value)) {
    const formattedValues = value.map(v => formatSqlValue(v)).join(', ');
    return `ARRAY[${formattedValues}]`;
  }
  
  if (typeof value === 'object') {
    return `'${JSON.stringify(value)}'`;
  }
  
  // Default fallback
  return `'${String(value)}'`;
}

/**
 * Compile an SQL template with a specific dialect
 * @param {string} template - The SQL template
 * @param {Object} params - The parameters to inject
 * @param {string} dialect - The SQL dialect
 * @returns {string} Compiled SQL statement
 */
function compileDialectTemplate(template, params = {}, dialect = DEFAULT_DIALECT) {
  const dialectHandler = getDialectHandler(dialect);
  
  // Replace function calls
  let compiledSql = template.replace(/\{\{fn:([a-zA-Z]+)\(([^)]+)\)\}\}/g, (match, fnName, args) => {
    // Parse args - simple split by comma, trim whitespace
    const argList = args.split(',').map(arg => arg.trim());
    
    // Check if function exists on the dialect handler
    if (typeof dialectHandler[fnName] !== 'function') {
      throw new SqlGenerationError(`Unsupported dialect function: ${fnName}`);
    }
    
    // Get argument values, which may be params
    const resolvedArgs = argList.map(arg => {
      // If arg is a param reference like paramName, resolve it
      if (params[arg] !== undefined) {
        return params[arg];
      }
      return arg;
    });
    
    // Call the function with the arguments
    return dialectHandler[fnName](...resolvedArgs);
  });
  
  // Replace parameters
  compiledSql = compiledSql.replace(/\{\{param:([a-zA-Z0-9_]+)\}\}/g, (match, paramName) => {
    if (params[paramName] === undefined) {
      throw new SqlGenerationError(`Missing parameter: ${paramName}`);
    }
    return formatSqlValue(params[paramName]);
  });
  
  return compiledSql;
}

module.exports = {
  SQL_DIALECTS,
  DEFAULT_DIALECT,
  DIALECT_HANDLERS,
  getDialectHandler,
  formatSqlValue,
  compileDialectTemplate
}; 