/**
 * SQL Templates
 * 
 * This module provides templates for generating SQL queries.
 * It follows the Separation of Concerns principle by focusing solely on
 * SQL generation aspects of the matching system.
 * 
 * The module now supports multiple SQL dialects including:
 * - BigQuery (default)
 * - PostgreSQL
 * - Snowflake
 */

const { SqlGenerationError } = require('../core/errors');

/**
 * SQL dialect handlers for different database systems
 */
const DIALECT_HANDLERS = {
  /**
   * BigQuery dialect handler
   */
  bigquery: {
    escapeIdentifier: (identifier) => {
      return identifier.match(/[-\s.]/g) ? `\`${identifier}\`` : identifier;
    },
    dateFormat: (field, format = 'YYYY-MM-DD') => {
      return `FORMAT_DATE('${format}', ${field})`;
    },
    arrayAgg: (field) => {
      return `ARRAY_AGG(${field})`;
    },
    regexpReplace: (field, pattern, replacement) => {
      return `REGEXP_REPLACE(${field}, '${pattern}', '${replacement}')`;
    },
    soundex: (field) => {
      return `SOUNDEX(${field})`;
    },
    concatWs: (separator, ...fields) => {
      return `CONCAT_WS('${separator}', ${fields.join(', ')})`;
    },
    exists: (query) => {
      return `EXISTS (${query})`;
    },
    windowFunction: (function_name, partition_by, order_by) => {
      return `${function_name}() OVER (PARTITION BY ${partition_by} ${order_by ? `ORDER BY ${order_by}` : ''})`;
    }
  },
  
  /**
   * PostgreSQL dialect handler
   */
  postgresql: {
    escapeIdentifier: (identifier) => {
      return `"${identifier.replace(/"/g, '""')}"`;
    },
    dateFormat: (field, format = 'YYYY-MM-DD') => {
      return `TO_CHAR(${field}::date, '${format}')`;
    },
    arrayAgg: (field) => {
      return `ARRAY_AGG(${field})`;
    },
    regexpReplace: (field, pattern, replacement) => {
      return `REGEXP_REPLACE(${field}, '${pattern}', '${replacement}', 'g')`;
    },
    soundex: (field) => {
      return `SOUNDEX(${field})`;
    },
    concatWs: (separator, ...fields) => {
      return `CONCAT_WS('${separator}', ${fields.join(', ')})`;
    },
    exists: (query) => {
      return `EXISTS (${query})`;
    },
    windowFunction: (function_name, partition_by, order_by) => {
      return `${function_name}() OVER (PARTITION BY ${partition_by} ${order_by ? `ORDER BY ${order_by}` : ''})`;
    }
  },
  
  /**
   * Snowflake dialect handler
   */
  snowflake: {
    escapeIdentifier: (identifier) => {
      return `"${identifier.replace(/"/g, '""')}"`;
    },
    dateFormat: (field, format = 'YYYY-MM-DD') => {
      return `TO_CHAR(${field}, '${format}')`;
    },
    arrayAgg: (field) => {
      return `ARRAY_AGG(${field})`;
    },
    regexpReplace: (field, pattern, replacement) => {
      return `REGEXP_REPLACE(${field}, '${pattern}', '${replacement}')`;
    },
    soundex: (field) => {
      return `SOUNDEX(${field})`;
    },
    concatWs: (separator, ...fields) => {
      return `CONCAT_WS('${separator}', ${fields.join(', ')})`;
    },
    exists: (query) => {
      return `EXISTS (${query})`;
    },
    windowFunction: (function_name, partition_by, order_by) => {
      return `${function_name}() OVER (PARTITION BY ${partition_by} ${order_by ? `ORDER BY ${order_by}` : ''})`;
    }
  }
};

// Default dialect
const DEFAULT_DIALECT = 'bigquery';

/**
 * Get a dialect handler for the specified SQL dialect
 * @param {string} [dialect=DEFAULT_DIALECT] - SQL dialect name
 * @returns {Object} Dialect handler
 * @throws {SqlGenerationError} If the dialect is not supported
 */
function getDialectHandler(dialect = DEFAULT_DIALECT) {
  const handler = DIALECT_HANDLERS[dialect.toLowerCase()];
  if (!handler) {
    throw new SqlGenerationError(`Unsupported SQL dialect: ${dialect}`, 'dialect');
  }
  return handler;
}

/**
 * Template for selecting records from a table with optional WHERE clause
 * @param {string} tableName - Table name
 * @param {string[]} columns - Columns to select
 * @param {string} [whereClause] - Optional WHERE clause
 * @param {Object} [options] - Template options
 * @param {string} [options.dialect=DEFAULT_DIALECT] - SQL dialect
 * @returns {string} SQL query
 */
function selectTemplate(tableName, columns, whereClause, options = {}) {
  if (!tableName) {
    throw new SqlGenerationError('Table name is required', 'tableName');
  }
  
  if (!Array.isArray(columns) || columns.length === 0) {
    throw new SqlGenerationError('At least one column must be specified', 'columns');
  }
  
  const dialect = options.dialect || DEFAULT_DIALECT;
  const dialectHandler = getDialectHandler(dialect);
  
  const columnsStr = columns.map(col => {
    if (typeof col === 'string') {
      return col;
    } else if (col.expression) {
      return `${col.expression} AS ${dialectHandler.escapeIdentifier(col.alias || 'expr')}`;
    }
    return col;
  }).join(', ');
  
  let query = `SELECT ${columnsStr} FROM ${tableName}`;
  
  if (whereClause) {
    query += ` WHERE ${whereClause}`;
  }
  
  return query;
}

/**
 * Template for joining two tables
 * @param {string} sourceTable - Source table name
 * @param {string} targetTable - Target table name
 * @param {string} joinCondition - JOIN condition
 * @param {string[]} selectColumns - Columns to select
 * @param {Object} [options] - Template options
 * @param {string} [options.dialect=DEFAULT_DIALECT] - SQL dialect
 * @param {string} [options.joinType='INNER'] - Join type (INNER, LEFT, RIGHT, FULL)
 * @returns {string} SQL query
 */
function joinTemplate(sourceTable, targetTable, joinCondition, selectColumns, options = {}) {
  if (!sourceTable || !targetTable) {
    throw new SqlGenerationError('Source and target tables are required', 'tables');
  }
  
  if (!joinCondition) {
    throw new SqlGenerationError('Join condition is required', 'joinCondition');
  }
  
  if (!Array.isArray(selectColumns) || selectColumns.length === 0) {
    throw new SqlGenerationError('At least one column must be specified', 'selectColumns');
  }
  
  const dialect = options.dialect || DEFAULT_DIALECT;
  const dialectHandler = getDialectHandler(dialect);
  const joinType = options.joinType || 'INNER';
  
  const columnsStr = selectColumns.map(col => {
    if (typeof col === 'string') {
      return col;
    } else if (col.expression) {
      return `${col.expression} AS ${dialectHandler.escapeIdentifier(col.alias || 'expr')}`;
    }
    return col;
  }).join(', ');
  
  return `SELECT ${columnsStr} 
          FROM ${sourceTable} 
          ${joinType} JOIN ${targetTable} ON ${joinCondition}`;
}

/**
 * Template for creating a temporary table
 * @param {string} tempTableName - Temporary table name
 * @param {string} selectQuery - SELECT query to populate the table
 * @param {Object} [options] - Template options
 * @param {string} [options.dialect=DEFAULT_DIALECT] - SQL dialect
 * @returns {string} SQL query
 */
function createTempTableTemplate(tempTableName, selectQuery, options = {}) {
  if (!tempTableName) {
    throw new SqlGenerationError('Temporary table name is required', 'tempTableName');
  }
  
  if (!selectQuery) {
    throw new SqlGenerationError('Select query is required', 'selectQuery');
  }
  
  const dialect = options.dialect || DEFAULT_DIALECT;
  
  // Dialect-specific temp table creation
  switch (dialect.toLowerCase()) {
    case 'bigquery':
      return `CREATE TEMPORARY TABLE ${tempTableName} AS (${selectQuery})`;
    case 'postgresql':
      return `CREATE TEMPORARY TABLE ${tempTableName} AS (${selectQuery})`;
    case 'snowflake':
      return `CREATE TEMPORARY TABLE ${tempTableName} AS (${selectQuery})`;
    default:
      throw new SqlGenerationError(`Unsupported SQL dialect for temp table: ${dialect}`, 'dialect');
  }
}

/**
 * Template for blocking key generation
 * @param {string} tableName - Table name
 * @param {Array<Object>} blockingKeyExpressions - Blocking key expressions
 * @param {Object} [options] - Template options
 * @param {string} [options.dialect=DEFAULT_DIALECT] - SQL dialect
 * @returns {string} SQL query
 */
function blockingKeysTemplate(tableName, blockingKeyExpressions, options = {}) {
  if (!tableName) {
    throw new SqlGenerationError('Table name is required', 'tableName');
  }
  
  if (!Array.isArray(blockingKeyExpressions) || blockingKeyExpressions.length === 0) {
    throw new SqlGenerationError('At least one blocking key expression is required', 'blockingKeyExpressions');
  }
  
  const dialect = options.dialect || DEFAULT_DIALECT;
  const dialectHandler = getDialectHandler(dialect);
  
  const selects = [
    `${tableName}.*`,
    ...blockingKeyExpressions.map(({ columnName, sql }) => `${sql} AS ${dialectHandler.escapeIdentifier(columnName)}`)
  ];
  
  return `SELECT ${selects.join(', ')} FROM ${tableName}`;
}

/**
 * Template for matching operation using blocking keys
 * @param {string} sourceTable - Source table name
 * @param {string} targetTable - Target table name
 * @param {string} blockingJoinCondition - Blocking join condition
 * @param {string} matchConditions - Additional match conditions
 * @param {string[]} selectColumns - Columns to select
 * @param {Object} [options] - Template options
 * @param {string} [options.dialect=DEFAULT_DIALECT] - SQL dialect
 * @returns {string} SQL query
 */
function matchingTemplate(sourceTable, targetTable, blockingJoinCondition, matchConditions, selectColumns, options = {}) {
  if (!sourceTable || !targetTable) {
    throw new SqlGenerationError('Source and target tables are required', 'tables');
  }
  
  if (!blockingJoinCondition) {
    throw new SqlGenerationError('Blocking join condition is required', 'blockingJoinCondition');
  }
  
  if (!Array.isArray(selectColumns) || selectColumns.length === 0) {
    throw new SqlGenerationError('At least one column must be specified', 'selectColumns');
  }
  
  const dialect = options.dialect || DEFAULT_DIALECT;
  const dialectHandler = getDialectHandler(dialect);
  
  const columnsStr = selectColumns.map(col => {
    if (typeof col === 'string') {
      return col;
    } else if (col.expression) {
      return `${col.expression} AS ${dialectHandler.escapeIdentifier(col.alias || 'expr')}`;
    }
    return col;
  }).join(', ');
  
  let query = `
    SELECT ${columnsStr}
    FROM ${sourceTable} AS source
    JOIN ${targetTable} AS target ON ${blockingJoinCondition}
  `;
  
  if (matchConditions) {
    query += ` WHERE ${matchConditions}`;
  }
  
  return query;
}

/**
 * Template for confidence score calculation
 * @param {string} baseQuery - Base query including similarity measures
 * @param {Array<Object>} similarityExpressions - Similarity expression definitions
 * @param {Object} [options] - Template options
 * @param {string} [options.dialect=DEFAULT_DIALECT] - SQL dialect
 * @returns {string} SQL query
 */
function confidenceScoreTemplate(baseQuery, similarityExpressions, options = {}) {
  if (!baseQuery) {
    throw new SqlGenerationError('Base query is required', 'baseQuery');
  }
  
  if (!Array.isArray(similarityExpressions) || similarityExpressions.length === 0) {
    throw new SqlGenerationError('Similarity expressions are required', 'similarityExpressions');
  }
  
  const dialect = options.dialect || DEFAULT_DIALECT;
  const dialectHandler = getDialectHandler(dialect);
  
  // Calculate total weight for normalization
  const totalWeight = similarityExpressions.reduce((sum, expr) => sum + (expr.weight || 1), 0);
  
  // Create the weighted sum expression
  const weightedSumExpr = similarityExpressions.map(expr => {
    const name = expr.name;
    const weight = expr.weight || 1;
    return `(${name} * ${weight})`;
  }).join(' + ');
  
  // Create the final query with confidence score
  return `
    WITH similarity_data AS (
      ${baseQuery}
    )
    SELECT 
      *,
      (${weightedSumExpr}) / ${totalWeight} AS confidence_score
    FROM similarity_data
  `;
}

/**
 * Template for metrics calculation
 * @param {string} matchesTable - Matches table name
 * @param {Object} confidenceThresholds - Confidence thresholds
 * @param {Object} [options] - Template options
 * @param {string} [options.dialect=DEFAULT_DIALECT] - SQL dialect
 * @returns {string} SQL query
 */
function metricsTemplate(matchesTable, confidenceThresholds, options = {}) {
  if (!matchesTable) {
    throw new SqlGenerationError('Matches table name is required', 'matchesTable');
  }
  
  if (!confidenceThresholds || typeof confidenceThresholds !== 'object') {
    throw new SqlGenerationError('Confidence thresholds are required', 'confidenceThresholds');
  }
  
  const dialect = options.dialect || DEFAULT_DIALECT;
  const dialectHandler = getDialectHandler(dialect);
  
  const { high = 0.85, medium = 0.70, low = 0.55 } = confidenceThresholds;
  
  return `
    SELECT
      COUNT(DISTINCT source_id) AS total_source_records,
      COUNT(*) AS total_matches,
      SUM(CASE WHEN confidence_score >= ${high} THEN 1 ELSE 0 END) AS high_confidence_matches,
      SUM(CASE WHEN confidence_score >= ${medium} AND confidence_score < ${high} THEN 1 ELSE 0 END) AS medium_confidence_matches,
      SUM(CASE WHEN confidence_score >= ${low} AND confidence_score < ${medium} THEN 1 ELSE 0 END) AS low_confidence_matches,
      SUM(CASE WHEN has_dob_append = TRUE THEN 1 ELSE 0 END) AS dob_appends,
      CAST(SUM(CASE WHEN has_dob_append = TRUE THEN 1 ELSE 0 END) AS FLOAT) / NULLIF(COUNT(DISTINCT source_id), 0) AS dob_append_rate,
      AVG(confidence_score) AS avg_confidence_score
    FROM ${matchesTable}
  `;
}

/**
 * Template for transitive closure calculation
 * @param {string} matchesTable - Matches table name 
 * @param {number} maxDepth - Maximum transitive depth
 * @param {number} confidenceThreshold - Minimum confidence threshold
 * @param {Object} [options] - Template options
 * @param {string} [options.dialect=DEFAULT_DIALECT] - SQL dialect
 * @param {string} [options.sourceIdField='source_id'] - Source ID field name
 * @param {string} [options.targetIdField='target_id'] - Target ID field name
 * @param {string} [options.confidenceField='confidence'] - Confidence field name
 * @returns {string} SQL query
 */
function transitiveClosureTemplate(matchesTable, maxDepth, confidenceThreshold, options = {}) {
  if (!matchesTable) {
    throw new SqlGenerationError('Matches table name is required', 'matchesTable');
  }
  
  if (typeof maxDepth !== 'number' || maxDepth < 1) {
    throw new SqlGenerationError('Max depth must be a positive number', 'maxDepth');
  }
  
  if (typeof confidenceThreshold !== 'number' || confidenceThreshold < 0 || confidenceThreshold > 1) {
    throw new SqlGenerationError('Confidence threshold must be between 0 and 1', 'confidenceThreshold');
  }
  
  const dialect = options.dialect || DEFAULT_DIALECT;
  const dialectHandler = getDialectHandler(dialect);
  
  const sourceIdField = options.sourceIdField || 'source_id';
  const targetIdField = options.targetIdField || 'target_id';
  const confidenceField = options.confidenceField || 'confidence';
  
  // Different dialects have different recursive CTE syntax
  if (dialect.toLowerCase() === 'bigquery') {
    // BigQuery doesn't support native recursive CTEs
    return _generateBigQueryTransitiveClosure(
      matchesTable, 
      maxDepth, 
      confidenceThreshold, 
      sourceIdField, 
      targetIdField, 
      confidenceField
    );
  } else {
    // PostgreSQL and Snowflake support standard recursive CTEs
    return _generateStandardTransitiveClosure(
      matchesTable, 
      maxDepth, 
      confidenceThreshold,
      sourceIdField, 
      targetIdField, 
      confidenceField,
      dialect
    );
  }
}

/**
 * Generate transitive closure SQL for BigQuery (without native recursion)
 * @private
 */
function _generateBigQueryTransitiveClosure(matchesTable, maxDepth, confidenceThreshold, 
                                           sourceIdField, targetIdField, confidenceField) {
  // BigQuery implementation uses multiple CTEs to simulate recursion
  let sql = `
    WITH direct_matches AS (
      SELECT 
        ${sourceIdField} as source_id,
        ${targetIdField} as target_id,
        ${confidenceField} as confidence,
        1 as depth,
        CONCAT('[', CAST(${sourceIdField} AS STRING), ',', CAST(${targetIdField} AS STRING), ']') as path
      FROM ${matchesTable}
      WHERE ${confidenceField} >= ${confidenceThreshold}
    )`;
  
  // Add each level of depth as a separate CTE
  for (let depth = 2; depth <= maxDepth; depth++) {
    sql += `
    , level${depth}_matches AS (
      SELECT 
        a.source_id,
        b.target_id,
        a.confidence * b.confidence as confidence,
        ${depth} as depth,
        CONCAT(a.path, ',', CAST(b.target_id AS STRING)) as path
      FROM ${depth === 2 ? 'direct_matches' : `level${depth-1}_matches`} a
      JOIN direct_matches b
      ON a.target_id = b.source_id
      WHERE a.source_id != b.target_id  -- Prevent cycles
        AND NOT STRPOS(a.path, CAST(b.target_id AS STRING)) > 0  -- Path doesn't already contain target
    )`;
  }
  
  // Union all levels together for the final result
  sql += `
    , all_matches AS (
      SELECT * FROM direct_matches
      ${Array.from({length: maxDepth-1}, (_, i) => `UNION ALL SELECT * FROM level${i+2}_matches`).join('\n')}
    )
    
    SELECT * FROM all_matches
    ORDER BY source_id, target_id, depth
  `;
  
  return sql;
}

/**
 * Generate transitive closure SQL for databases supporting standard recursive CTEs
 * @private
 */
function _generateStandardTransitiveClosure(matchesTable, maxDepth, confidenceThreshold, 
                                           sourceIdField, targetIdField, confidenceField, dialect) {
  // Standard SQL recursive CTE implementation
  return `
    WITH RECURSIVE transitive_matches AS (
      -- Base case: direct matches
      SELECT 
        ${sourceIdField} as source_id,
        ${targetIdField} as target_id,
        ${confidenceField} as confidence,
        1 as depth,
        ARRAY[${sourceIdField}, ${targetIdField}] as path
      FROM ${matchesTable}
      WHERE ${confidenceField} >= ${confidenceThreshold}
      
      UNION ALL
      
      -- Recursive case: extend matches by joining with direct matches
      SELECT 
        tm.source_id,
        dm.${targetIdField} as target_id,
        tm.confidence * dm.${confidenceField} as confidence,
        tm.depth + 1 as depth,
        tm.path || dm.${targetIdField} as path
      FROM transitive_matches tm
      JOIN ${matchesTable} dm ON tm.target_id = dm.${sourceIdField}
      WHERE tm.depth < ${maxDepth}  -- Limit recursion depth
        AND tm.source_id != dm.${targetIdField}  -- Prevent direct cycles
        AND NOT (dm.${targetIdField} = ANY(tm.path))  -- Prevent indirect cycles (path doesn't contain target)
    )
    
    SELECT * FROM transitive_matches
    ORDER BY source_id, target_id, depth
  `;
}

/**
 * Template for custom SQL based on a template string with parameters
 * @param {string} templateString - Custom SQL template string with {{paramName}} placeholders
 * @param {Object} params - Parameters to substitute
 * @param {Object} [options] - Template options
 * @param {string} [options.dialect=DEFAULT_DIALECT] - SQL dialect
 * @returns {string} Compiled SQL query
 */
function customTemplate(templateString, params = {}, options = {}) {
  if (!templateString) {
    throw new SqlGenerationError('Template string is required', 'templateString');
  }
  
  const dialect = options.dialect || DEFAULT_DIALECT;
  const dialectHandler = getDialectHandler(dialect);
  
  // Replace {{paramName}} patterns with actual values
  let compiledSql = templateString;
  
  // Process special dialect functions in the params
  const processedParams = { ...params };
  
  // Allow dialect-specific function calls in templates
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'object' && value.dialectFunction) {
      const { dialectFunction, args } = value;
      if (typeof dialectHandler[dialectFunction] === 'function') {
        processedParams[key] = dialectHandler[dialectFunction](...args);
      } else {
        throw new SqlGenerationError(`Unsupported dialect function: ${dialectFunction}`, 'dialectFunction');
      }
    }
  }
  
  // Replace parameter placeholders
  for (const [key, value] of Object.entries(processedParams)) {
    const pattern = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    const formattedValue = formatSqlValue(value);
    compiledSql = compiledSql.replace(pattern, formattedValue);
  }
  
  return compiledSql;
}

/**
 * Format a JavaScript value for SQL insertion
 * @param {*} value - Value to format
 * @returns {string} SQL-formatted value
 */
function formatSqlValue(value) {
  if (value === null || value === undefined) {
    return 'NULL';
  } else if (typeof value === 'string') {
    return `'${value.replace(/'/g, "''")}'`;
  } else if (typeof value === 'number') {
    return value.toString();
  } else if (typeof value === 'boolean') {
    return value ? 'TRUE' : 'FALSE';
  } else if (value instanceof Date) {
    return `DATE '${value.toISOString().split('T')[0]}'`;
  } else if (Array.isArray(value)) {
    return `ARRAY[${value.map(formatSqlValue).join(', ')}]`;
  } else if (typeof value === 'object') {
    return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
  }
  return String(value);
}

module.exports = {
  // Dialect handling
  getDialectHandler,
  DIALECT_HANDLERS,
  DEFAULT_DIALECT,
  
  // Templates
  selectTemplate,
  joinTemplate,
  createTempTableTemplate,
  blockingKeysTemplate,
  matchingTemplate,
  confidenceScoreTemplate,
  metricsTemplate,
  transitiveClosureTemplate,
  customTemplate,
  
  // Helpers
  formatSqlValue
}; 