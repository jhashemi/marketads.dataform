/**
 * SQL Templates
 * 
 * This module provides templates for generating SQL queries.
 * It follows the Separation of Concerns principle by focusing solely on
 * SQL generation aspects of the matching system.
 */

const { SqlGenerationError } = require('../core/errors');

/**
 * Template for selecting records from a table with optional WHERE clause
 * @param {string} tableName - Table name
 * @param {string[]} columns - Columns to select
 * @param {string} [whereClause] - Optional WHERE clause
 * @returns {string} SQL query
 */
function selectTemplate(tableName, columns, whereClause) {
  if (!tableName) {
    throw new SqlGenerationError('Table name is required', 'tableName');
  }
  
  if (!Array.isArray(columns) || columns.length === 0) {
    throw new SqlGenerationError('At least one column must be specified', 'columns');
  }
  
  const columnsStr = columns.join(', ');
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
 * @returns {string} SQL query
 */
function joinTemplate(sourceTable, targetTable, joinCondition, selectColumns) {
  if (!sourceTable || !targetTable) {
    throw new SqlGenerationError('Source and target tables are required', 'tables');
  }
  
  if (!joinCondition) {
    throw new SqlGenerationError('Join condition is required', 'joinCondition');
  }
  
  if (!Array.isArray(selectColumns) || selectColumns.length === 0) {
    throw new SqlGenerationError('At least one column must be specified', 'selectColumns');
  }
  
  const columnsStr = selectColumns.join(', ');
  
  return `SELECT ${columnsStr} 
          FROM ${sourceTable} 
          JOIN ${targetTable} ON ${joinCondition}`;
}

/**
 * Template for creating a temporary table
 * @param {string} tempTableName - Temporary table name
 * @param {string} selectQuery - SELECT query to populate the table
 * @returns {string} SQL query
 */
function createTempTableTemplate(tempTableName, selectQuery) {
  if (!tempTableName) {
    throw new SqlGenerationError('Temporary table name is required', 'tempTableName');
  }
  
  if (!selectQuery) {
    throw new SqlGenerationError('Select query is required', 'selectQuery');
  }
  
  return `CREATE TEMPORARY TABLE ${tempTableName} AS (${selectQuery})`;
}

/**
 * Template for blocking key generation
 * @param {string} tableName - Table name
 * @param {Array<Object>} blockingKeyExpressions - Blocking key expressions
 * @returns {string} SQL query
 */
function blockingKeysTemplate(tableName, blockingKeyExpressions) {
  if (!tableName) {
    throw new SqlGenerationError('Table name is required', 'tableName');
  }
  
  if (!Array.isArray(blockingKeyExpressions) || blockingKeyExpressions.length === 0) {
    throw new SqlGenerationError('At least one blocking key expression is required', 'blockingKeyExpressions');
  }
  
  const selects = [
    `${tableName}.*`,
    ...blockingKeyExpressions.map(({ columnName, sql }) => `${sql} AS ${columnName}`)
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
 * @returns {string} SQL query
 */
function matchingTemplate(sourceTable, targetTable, blockingJoinCondition, matchConditions, selectColumns) {
  if (!sourceTable || !targetTable) {
    throw new SqlGenerationError('Source and target tables are required', 'tables');
  }
  
  if (!blockingJoinCondition) {
    throw new SqlGenerationError('Blocking join condition is required', 'blockingJoinCondition');
  }
  
  if (!Array.isArray(selectColumns) || selectColumns.length === 0) {
    throw new SqlGenerationError('At least one column must be specified', 'selectColumns');
  }
  
  const columnsStr = selectColumns.join(', ');
  
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
 * @param {string} matchQuery - Match query
 * @param {Array<Object>} scoreExpressions - Score expressions
 * @returns {string} SQL query
 */
function confidenceScoreTemplate(matchQuery, scoreExpressions) {
  if (!matchQuery) {
    throw new SqlGenerationError('Match query is required', 'matchQuery');
  }
  
  if (!Array.isArray(scoreExpressions) || scoreExpressions.length === 0) {
    throw new SqlGenerationError('At least one score expression is required', 'scoreExpressions');
  }
  
  const individualScores = scoreExpressions.map(expr => 
    `${expr.expression} AS ${expr.name}`
  );
  
  const weightedSum = scoreExpressions
    .map(expr => `COALESCE(${expr.name}, 0) * ${expr.weight}`)
    .join(' + ');
  
  const totalWeight = scoreExpressions
    .map(expr => expr.weight)
    .reduce((a, b) => a + b, 0);
  
  return `
    WITH match_candidates AS (
      ${matchQuery}
    ),
    individual_scores AS (
      SELECT 
        *,
        ${individualScores.join(',\n        ')}
      FROM match_candidates
    )
    SELECT
      *,
      (${weightedSum}) / ${totalWeight} AS confidence_score
    FROM individual_scores
  `;
}

/**
 * Template for metrics calculation
 * @param {string} matchesTable - Matches table name
 * @param {Object} confidenceThresholds - Confidence thresholds
 * @returns {string} SQL query
 */
function metricsTemplate(matchesTable, confidenceThresholds) {
  if (!matchesTable) {
    throw new SqlGenerationError('Matches table name is required', 'matchesTable');
  }
  
  if (!confidenceThresholds || typeof confidenceThresholds !== 'object') {
    throw new SqlGenerationError('Confidence thresholds are required', 'confidenceThresholds');
  }
  
  const { HIGH, MEDIUM, LOW } = confidenceThresholds;
  
  return `
    SELECT
      COUNT(DISTINCT source_id) AS total_source_records,
      COUNT(*) AS total_matches,
      SUM(CASE WHEN confidence_score >= ${HIGH} THEN 1 ELSE 0 END) AS high_confidence_matches,
      SUM(CASE WHEN confidence_score >= ${MEDIUM} AND confidence_score < ${HIGH} THEN 1 ELSE 0 END) AS medium_confidence_matches,
      SUM(CASE WHEN confidence_score >= ${LOW} AND confidence_score < ${MEDIUM} THEN 1 ELSE 0 END) AS low_confidence_matches,
      SUM(CASE WHEN has_dob_append = TRUE THEN 1 ELSE 0 END) AS dob_appends,
      CAST(SUM(CASE WHEN has_dob_append = TRUE THEN 1 ELSE 0 END) AS FLOAT) / NULLIF(COUNT(DISTINCT source_id), 0) AS dob_append_rate,
      AVG(confidence_score) AS avg_confidence_score
    FROM ${matchesTable}
  `;
}

/**
 * Template for field similarity calculation
 * @param {string} sourceField - Source field name
 * @param {string} targetField - Target field name
 * @param {string} similarityFunction - Similarity function name
 * @returns {string} SQL expression
 */
function fieldSimilarityTemplate(sourceField, targetField, similarityFunction) {
  if (!sourceField || !targetField) {
    throw new SqlGenerationError('Source and target fields are required', 'fields');
  }
  
  if (!similarityFunction) {
    throw new SqlGenerationError('Similarity function is required', 'similarityFunction');
  }
  
  // Map of supported similarity functions to their SQL implementation
  const similarityFunctions = {
    exact: `CASE WHEN source.${sourceField} = target.${targetField} THEN 1.0 ELSE 0.0 END`,
    levenshtein: `1.0 - (LEVENSHTEIN(source.${sourceField}, target.${targetField})::FLOAT / 
                  GREATEST(LENGTH(source.${sourceField}), LENGTH(target.${targetField}), 1))`,
    jaccard: `SIMILARITY(source.${sourceField}, target.${targetField})`,
    phonetic: `CASE WHEN SOUNDEX(source.${sourceField}) = SOUNDEX(target.${targetField}) THEN 1.0 ELSE 0.0 END`,
    numeric: `1.0 - ABS(source.${sourceField}::FLOAT - target.${targetField}::FLOAT) / 
              GREATEST(ABS(source.${sourceField}::FLOAT), ABS(target.${targetField}::FLOAT), 1)`,
    substring: `CASE 
                WHEN source.${sourceField} = target.${targetField} THEN 1.0
                WHEN POSITION(source.${sourceField} IN target.${targetField}) > 0 THEN 0.7
                WHEN POSITION(target.${targetField} IN source.${sourceField}) > 0 THEN 0.7
                ELSE 0.0 
              END`
  };
  
  const sqlExpression = similarityFunctions[similarityFunction];
  
  if (!sqlExpression) {
    throw new SqlGenerationError(`Unsupported similarity function: ${similarityFunction}`, 'similarityFunction');
  }
  
  // Add null handling
  return `CASE WHEN source.${sourceField} IS NULL OR target.${targetField} IS NULL THEN 0.0 
          ELSE ${sqlExpression} END`;
}

module.exports = {
  selectTemplate,
  joinTemplate,
  createTempTableTemplate,
  blockingKeysTemplate,
  matchingTemplate,
  confidenceScoreTemplate,
  metricsTemplate,
  fieldSimilarityTemplate
}; 