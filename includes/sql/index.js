/**
 * SQL Module
 * 
 * This module serves as the entry point for SQL generation functionality.
 * It composes templates and compilation capabilities following the
 * Interface Segregation Principle and Separation of Concerns.
 */

const templates = require('./templates');
const { SqlCompiler, compileSql, validateSql } = require('./compiler');
const { ISqlGenerator } = require('../core/types');
const { SqlGenerationError } = require('../core/errors');

/**
 * SQL Generator class implementing the ISqlGenerator interface
 */
class SqlGenerator {
  /**
   * Creates a new SQL generator
   * @param {Object} options - Generator options
   * @param {Object} [options.defaultParams] - Default parameters
   */
  constructor(options = {}) {
    this.compiler = new SqlCompiler(options);
  }
  
  /**
   * Generates SQL for matching process
   * @param {Object} params - SQL generation parameters
   * @param {string} params.sourceTable - Source table name
   * @param {string} params.targetTable - Target table name
   * @param {Array<Object>} params.sourceFieldMappings - Source field mappings
   * @param {Array<Object>} params.targetFieldMappings - Target field mappings
   * @param {Object} params.blockingEngine - Blocking engine instance
   * @param {Object} params.fieldWeights - Field weights
   * @param {string} [params.tempTablePrefix='temp_matching_'] - Temporary table prefix
   * @returns {string} Generated SQL
   */
  generateMatchingSql(params) {
    if (!params || typeof params !== 'object') {
      throw new SqlGenerationError('Parameters object is required', 'params');
    }
    
    const {
      sourceTable,
      targetTable,
      sourceFieldMappings,
      targetFieldMappings,
      blockingEngine,
      fieldWeights,
      tempTablePrefix = 'temp_matching_'
    } = params;
    
    // Required parameters validation
    if (!sourceTable || !targetTable) {
      throw new SqlGenerationError('Source and target tables are required', 'tables');
    }
    
    if (!Array.isArray(sourceFieldMappings) || !Array.isArray(targetFieldMappings)) {
      throw new SqlGenerationError('Field mappings must be arrays', 'fieldMappings');
    }
    
    if (!blockingEngine) {
      throw new SqlGenerationError('Blocking engine is required', 'blockingEngine');
    }
    
    // Generate join condition using blocking engine
    const joinCondition = blockingEngine.createJoinCondition(
      sourceTable,
      targetTable,
      sourceFieldMappings,
      targetFieldMappings
    );
    
    // Generate similarity expressions for shared fields
    const similarityExpressions = this._generateSimilarityExpressions(
      sourceFieldMappings,
      targetFieldMappings,
      fieldWeights
    );
    
    // Define select columns
    const selectColumns = [
      'source.* AS source_record',
      'target.* AS target_record',
      ...similarityExpressions.map(expr => `${expr.expression} AS ${expr.name}`)
    ];
    
    // Generate matching query
    const matchQuery = templates.matchingTemplate(
      sourceTable,
      targetTable,
      joinCondition,
      null, // No additional conditions
      selectColumns
    );
    
    // Add confidence score calculation
    const finalQuery = templates.confidenceScoreTemplate(
      matchQuery,
      similarityExpressions
    );
    
    return finalQuery;
  }
  
  /**
   * Generates SQL for metrics calculation
   * @param {Object} params - SQL generation parameters
   * @param {string} params.matchesTable - Matches table name
   * @param {Object} params.confidenceThresholds - Confidence thresholds
   * @returns {string} Generated SQL
   */
  generateMetricsSql(params) {
    if (!params || typeof params !== 'object') {
      throw new SqlGenerationError('Parameters object is required', 'params');
    }
    
    const { matchesTable, confidenceThresholds } = params;
    
    if (!matchesTable) {
      throw new SqlGenerationError('Matches table name is required', 'matchesTable');
    }
    
    if (!confidenceThresholds || typeof confidenceThresholds !== 'object') {
      throw new SqlGenerationError('Confidence thresholds are required', 'confidenceThresholds');
    }
    
    return templates.metricsTemplate(matchesTable, confidenceThresholds);
  }
  
  /**
   * Generates similarity expressions for shared fields
   * @param {Array<Object>} sourceFieldMappings - Source field mappings
   * @param {Array<Object>} targetFieldMappings - Target field mappings
   * @param {Object} fieldWeights - Field weights
   * @returns {Array<Object>} Similarity expressions
   * @private
   */
  _generateSimilarityExpressions(sourceFieldMappings, targetFieldMappings, fieldWeights = {}) {
    // Extract semantic types from mappings
    const sourceTypes = sourceFieldMappings.map(m => m.semanticType);
    const targetTypes = targetFieldMappings.map(m => m.semanticType);
    
    // Find shared semantic types
    const sharedTypes = sourceTypes.filter(type => targetTypes.includes(type));
    
    // Generate similarity expressions for each shared type
    const expressions = [];
    
    for (const semanticType of sharedTypes) {
      const sourceMapping = sourceFieldMappings.find(m => m.semanticType === semanticType);
      const targetMapping = targetFieldMappings.find(m => m.semanticType === semanticType);
      
      if (!sourceMapping || !targetMapping) {
        continue;
      }
      
      const sourceField = sourceMapping.fieldName;
      const targetField = targetMapping.fieldName;
      const weight = fieldWeights[semanticType] || 0.5;
      
      // Choose similarity function based on semantic type
      let similarityFunction = 'exact';
      
      switch (semanticType) {
        case 'firstName':
        case 'lastName':
        case 'middleName':
          similarityFunction = 'levenshtein';
          break;
        
        case 'address':
          similarityFunction = 'jaccard';
          break;
        
        case 'dateOfBirth':
          similarityFunction = 'numeric';
          break;
        
        case 'email':
        case 'phone':
          similarityFunction = 'exact';
          break;
        
        default:
          similarityFunction = 'levenshtein';
      }
      
      // Generate expression
      const expression = templates.fieldSimilarityTemplate(
        sourceField,
        targetField,
        similarityFunction
      );
      
      expressions.push({
        name: `${semanticType}_similarity`,
        expression,
        weight,
        semanticType
      });
    }
    
    return expressions;
  }
  
  /**
   * Compiles a SQL query with parameters
   * @param {string} sqlTemplate - SQL template
   * @param {Object} params - Parameters
   * @returns {string} Compiled SQL
   */
  compileSql(sqlTemplate, params = {}) {
    return this.compiler.compile(sqlTemplate, params);
  }
  
  /**
   * Validates a SQL query
   * @param {string} sql - SQL query
   * @returns {Object} Validation result
   */
  validateSql(sql) {
    return this.compiler.validate(sql);
  }
  
  /**
   * Adds CTEs to a SQL query
   * @param {string} sqlQuery - SQL query
   * @param {Object} ctes - CTEs to add
   * @returns {string} SQL query with CTEs
   */
  addCTEs(sqlQuery, ctes = {}) {
    return this.compiler.addCTEs(sqlQuery, ctes);
  }
}

// Ensure SqlGenerator implements ISqlGenerator
Object.entries(ISqlGenerator).forEach(([methodName, methodSignature]) => {
  if (typeof SqlGenerator.prototype[methodName] !== 'function') {
    throw new Error(`SqlGenerator must implement ${methodName} from ISqlGenerator`);
  }
});

/**
 * Creates a SQL generator
 * @param {Object} options - Generator options
 * @returns {SqlGenerator} SQL generator instance
 */
function createSqlGenerator(options = {}) {
  return new SqlGenerator(options);
}

module.exports = {
  createSqlGenerator,
  SqlGenerator,
  
  // Re-export lower-level components
  templates,
  SqlCompiler,
  
  // Re-export utility functions
  compileSql,
  validateSql
}; 