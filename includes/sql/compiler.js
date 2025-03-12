/**
 * SQL Compiler
 * 
 * This module handles SQL query compilation with advanced templating and validation.
 * It leverages Knex.js for SQL generation and query building.
 */

const { SqlGenerationError } = require('../core/errors');
const knex = require('knex')({ client: 'pg' });

/**
 * Compiles a SQL query with parameter substitution
 * @param {string} sqlTemplate - SQL template string
 * @param {Object} params - Parameters to substitute
 * @returns {string} Compiled SQL query
 */
function compileSql(sqlTemplate, params = {}) {
  try {
    // For simple parameter substitution, still support basic templating
    let compiledSql = sqlTemplate;
    
    // Replace {{paramName}} patterns with actual values
    for (const [key, value] of Object.entries(params)) {
      const pattern = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      const formattedValue = formatSqlValue(value);
      compiledSql = compiledSql.replace(pattern, formattedValue);
    }
    
    return compiledSql;
  } catch (error) {
    throw new SqlGenerationError(`Failed to compile SQL: ${error.message}`, sqlTemplate);
  }
}

/**
 * Formats a value for safe SQL inclusion
 * @param {any} value - Value to format
 * @returns {string} SQL-safe string representation of the value
 */
function formatSqlValue(value) {
  if (value === null || value === undefined) {
    return 'NULL';
  }
  
  if (typeof value === 'number') {
    return String(value);
  }
  
  if (typeof value === 'boolean') {
    return value ? 'TRUE' : 'FALSE';
  }
  
  if (Array.isArray(value)) {
    return formatSqlArray(value);
  }
  
  if (value instanceof Date) {
    return `'${value.toISOString()}'`;
  }
  
  if (typeof value === 'object') {
    return `'${escapeSqlString(JSON.stringify(value))}'`;
  }
  
  // String values are escaped and quoted
  return `'${escapeSqlString(String(value))}'`;
}

/**
 * Formats an array for SQL inclusion
 * @param {Array} array - Array to format
 * @returns {string} SQL array representation
 */
function formatSqlArray(array) {
  if (!array.length) {
    return 'ARRAY[]::text[]';
  }
  
  const formattedItems = array.map(item => formatSqlValue(item));
  return `ARRAY[${formattedItems.join(', ')}]`;
}

/**
 * Escapes a string for SQL inclusion
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeSqlString(str) {
  return str.replace(/'/g, "''");
}

/**
 * Validates a SQL query for basic syntax and security issues
 * @param {string} sql - SQL query to validate
 * @returns {Object} Validation result
 */
function validateSql(sql) {
  const issues = [];
  
  // Check for common SQL injection patterns
  if (/;\s*DROP\s+/i.test(sql)) {
    issues.push('Possible DROP statement injection detected');
  }
  
  if (/;\s*DELETE\s+/i.test(sql)) {
    issues.push('Possible DELETE statement injection detected');
  }
  
  if (/;\s*TRUNCATE\s+/i.test(sql)) {
    issues.push('Possible TRUNCATE statement injection detected');
  }
  
  if (/EXEC\s+\w+/i.test(sql)) {
    issues.push('EXEC statements are not allowed');
  }
  
  if (/xp_cmdshell/i.test(sql)) {
    issues.push('xp_cmdshell is not allowed');
  }
  
  // Check balanced parentheses
  let parenBalance = 0;
  for (const char of sql) {
    if (char === '(') parenBalance++;
    if (char === ')') parenBalance--;
    if (parenBalance < 0) {
      issues.push('Unbalanced parentheses');
      break;
    }
  }
  
  if (parenBalance !== 0) {
    issues.push('Unbalanced parentheses');
  }
  
  // Check balanced quotes
  let inQuote = false;
  for (const char of sql) {
    if (char === "'") inQuote = !inQuote;
  }
  
  if (inQuote) {
    issues.push('Unbalanced quotes');
  }
  
  return {
    isValid: issues.length === 0,
    issues
  };
}

/**
 * Adds Common Table Expressions (CTEs) to a SQL query
 * @param {string} sqlQuery - SQL query
 * @param {Object} ctes - Map of CTE names to definitions
 * @returns {string} SQL query with CTEs
 */
function addCommonTableExpressions(sqlQuery, ctes = {}) {
  if (!ctes || Object.keys(ctes).length === 0) {
    return sqlQuery;
  }
  
  try {
    const cteDefinitions = Object.entries(ctes).map(([name, definition]) => {
      return `${name} AS (${definition})`;
    });
    
    const withClause = `WITH ${cteDefinitions.join(',\n')}`;
    
    return `${withClause}\n${sqlQuery}`;
  } catch (error) {
    throw new SqlGenerationError(`Failed to add CTEs: ${error.message}`, sqlQuery);
  }
}

/**
 * SQL Compiler class for building and compiling SQL queries
 */
class SqlCompiler {
  /**
   * Creates a new SQL compiler
   * @param {Object} options - Compiler options
   * @param {Object} [options.defaultParams] - Default parameters
   */
  constructor(options = {}) {
    this.defaultParams = options.defaultParams || {};
  }
  
  /**
   * Creates a new Knex query builder instance
   * @returns {Object} Knex query builder
   */
  builder() {
    return knex.queryBuilder();
  }
  
  /**
   * Compiles a SQL query with parameter substitution
   * @param {string} sqlTemplate - SQL template string
   * @param {Object} params - Parameters to substitute
   * @returns {string} Compiled SQL query
   */
  compile(sqlTemplate, params = {}) {
    const mergedParams = { ...this.defaultParams, ...params };
    return compileSql(sqlTemplate, mergedParams);
  }
  
  /**
   * Adds CTEs to a SQL query
   * @param {string} sqlQuery - SQL query
   * @param {Object} ctes - CTEs to add
   * @returns {string} SQL query with CTEs
   */
  addCTEs(sqlQuery, ctes = {}) {
    return addCommonTableExpressions(sqlQuery, ctes);
  }
  
  /**
   * Sets default parameters
   * @param {Object} params - Default parameters
   */
  setDefaultParams(params = {}) {
    this.defaultParams = { ...this.defaultParams, ...params };
  }
  
  /**
   * Validates a SQL query
   * @param {string} sql - SQL query
   * @returns {Object} Validation result
   */
  validate(sql) {
    return validateSql(sql);
  }
  
  /**
   * Creates a SELECT query using Knex
   * @param {string} tableName - Table name
   * @param {Array|Object} columns - Columns to select
   * @param {Object} whereClause - Where conditions
   * @returns {string} SQL query
   */
  select(tableName, columns, whereClause) {
    try {
      let query = knex(tableName).select(columns);
      
      if (whereClause) {
        query = query.where(whereClause);
      }
      
      return query.toQuery();
    } catch (error) {
      throw new SqlGenerationError(`Failed to create SELECT query: ${error.message}`);
    }
  }
  
  /**
   * Creates a JOIN query using Knex
   * @param {string} sourceTable - Source table
   * @param {string} targetTable - Target table
   * @param {Object|Function} joinCondition - Join condition
   * @param {Array|Object} selectColumns - Columns to select
   * @returns {string} SQL query
   */
  join(sourceTable, targetTable, joinCondition, selectColumns) {
    try {
      let query = knex(sourceTable)
        .join(targetTable, joinCondition)
        .select(selectColumns);
      
      return query.toQuery();
    } catch (error) {
      throw new SqlGenerationError(`Failed to create JOIN query: ${error.message}`);
    }
  }
}

module.exports = {
  SqlCompiler,
  compileSql,
  validateSql,
  formatSqlValue,
  formatSqlArray,
  escapeSqlString,
  addCommonTableExpressions
}; 