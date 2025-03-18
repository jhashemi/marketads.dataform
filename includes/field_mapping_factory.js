/**
 * Field Mapping Factory
 * 
 * This module provides utilities for creating field mappings between tables
 * based on semantic types. It automatically detects matching fields and
 * suggests appropriate field mappings.
 */

const semanticTypes = require('./semantic_types');
const { projectConfig } = require("dataform");
const errorLogger = require('./error_logger');

/**
 * Creates field mappings between source and target tables
 * @param {Array<string>} sourceFields - List of field names in source table
 * @param {Array<string>} targetFields - List of field names in target table
 * @param {Object} options - Mapping options
 * @param {boolean} [options.ignoreCase=true] - Whether to ignore case when matching field names
 * @param {boolean} [options.useSemanticTypes=true] - Whether to use semantic type detection
 * @param {Array<string>} [options.priorityFields] - Fields to prioritize in mapping
 * @returns {Object} Field mapping object
 */
function createFieldMappings(sourceFields, targetFields, options = {}) {
  try {
    const startTime = Date.now();
    
    // Extract source and target table names from context if available
    const sourceTable = options.sourceTable || '';
    const targetTable = options.targetTable || '';
    
    const mappings = {};
    const opts = {
      ignoreCase: options.ignoreCase !== false,
      useSemanticTypes: options.useSemanticTypes !== false,
      priorityFields: options.priorityFields || []
    };
    
    // First, analyze all fields to detect semantic types
    const sourceFieldTypes = opts.useSemanticTypes ? 
      semanticTypes.analyzeFields(sourceFields) : {};
    const targetFieldTypes = opts.useSemanticTypes ? 
      semanticTypes.analyzeFields(targetFields) : {};
    
    // Process priority fields first
    for (const priorityField of opts.priorityFields) {
      // Find field in source
      const sourceField = findField(sourceFields, priorityField, opts.ignoreCase);
      if (!sourceField) continue;
      
      // Find matching field in target based on name or semantic type
      const targetField = findMatchingField(sourceField, targetFields, sourceFieldTypes, targetFieldTypes, opts);
      if (targetField) {
        mappings[sourceField] = targetField;
      }
    }
    
    // Process remaining fields
    for (const sourceField of sourceFields) {
      // Skip fields already mapped
      if (mappings[sourceField]) continue;
      
      // Find matching field in target
      const targetField = findMatchingField(sourceField, targetFields, sourceFieldTypes, targetFieldTypes, opts);
      if (targetField) {
        mappings[sourceField] = targetField;
      }
    }
    
    const executionTimeMs = Date.now() - startTime;
    
    // Record telemetry
    const telemetrySql = recordMappingTelemetry(
      sourceTable,
      targetTable,
      sourceFields,
      targetFields,
      mappings,
      options,
      executionTimeMs
    );
    
    // Generate SQL for field mappings with telemetry
    let sql = '';
    Object.entries(mappings).forEach(([sourceField, targetField]) => {
      sql += `${sourceField} as ${targetField},\n`;
    });
    
    // Remove trailing comma and newline
    sql = sql.replace(/,\n$/, '');
    
    // Add telemetry SQL as a comment that will be ignored by BigQuery
    sql += `\n\n-- TELEMETRY: ${telemetrySql.replace(/\n/g, ' ')}`;
    
    return sql;
  } catch (error) {
    // Log the error
    errorLogger.logError(
      'field_mapping_factory',
      errorLogger.ERROR_TYPES.FIELD_MAPPING,
      {
        sourceFields,
        targetFields,
        options,
        error: error.message,
        stack: error.stack,
        sourceFile: 'field_mapping_factory.js'
      },
      errorLogger.SEVERITY.ERROR
    );
    
    // Return a safe fallback that won't break the pipeline
    return sourceFields.map(field => `${field} as ${field}`).join(',\n');
  }
}

/**
 * Finds a field in the field list
 * @param {Array<string>} fields - List of fields
 * @param {string} fieldName - Field name to find
 * @param {boolean} ignoreCase - Whether to ignore case
 * @returns {string|null} Found field or null
 */
function findField(fields, fieldName, ignoreCase) {
  if (ignoreCase) {
    const lowerFieldName = fieldName.toLowerCase();
    return fields.find(f => f.toLowerCase() === lowerFieldName) || null;
  }
  return fields.includes(fieldName) ? fieldName : null;
}

/**
 * Finds a matching field in the target fields
 * @param {string} sourceField - Source field name
 * @param {Array<string>} targetFields - List of target fields
 * @param {Object} sourceFieldTypes - Source field semantic types
 * @param {Object} targetFieldTypes - Target field semantic types
 * @param {Object} options - Mapping options
 * @returns {string|null} Matching target field or null
 */
function findMatchingField(sourceField, targetFields, sourceFieldTypes, targetFieldTypes, options) {
  try {
    // Try exact match first (case insensitive if ignoreCase is true)
    const exactMatch = findField(targetFields, sourceField, options.ignoreCase);
    if (exactMatch) return exactMatch;
    
    // If using semantic types, try to match by semantic type
    if (options.useSemanticTypes) {
      const sourceType = sourceFieldTypes[sourceField];
      if (sourceType) {
        // Find target fields with same semantic type
        for (const targetField of targetFields) {
          const targetType = targetFieldTypes[targetField];
          if (targetType && targetType.key === sourceType.key) {
            return targetField;
          }
        }
      }
    }
    
    // Try fuzzy matching based on field name similarities
    let bestMatch = null;
    let bestScore = 0;
    
    for (const targetField of targetFields) {
      const score = calculateFieldNameSimilarity(sourceField, targetField, options.ignoreCase);
      if (score > 0.8 && score > bestScore) {
        bestMatch = targetField;
        bestScore = score;
      }
    }
    
    // Only return match if score is above threshold
    return bestScore > (options.similarityThreshold || 0.5) ? bestMatch : null;
  } catch (error) {
    // Log the error but don't throw
    errorLogger.logError(
      'field_mapping_factory',
      errorLogger.ERROR_TYPES.FIELD_MAPPING,
      {
        sourceField,
        targetFields,
        options,
        error: error.message,
        sourceFile: 'field_mapping_factory.js'
      },
      errorLogger.SEVERITY.WARNING
    );
    
    // Return a safe fallback
    return targetFields.find(f => f.toLowerCase() === sourceField.toLowerCase()) || null;
  }
}

/**
 * Calculates similarity between field names
 * @param {string} field1 - First field name
 * @param {string} field2 - Second field name
 * @param {boolean} ignoreCase - Whether to ignore case
 * @returns {number} Similarity score (0-1)
 */
function calculateFieldNameSimilarity(field1, field2, ignoreCase) {
  if (ignoreCase) {
    field1 = field1.toLowerCase();
    field2 = field2.toLowerCase();
  }
  
  // Simple matching for now - can be enhanced with more sophisticated algorithms
  if (field1 === field2) return 1;
  
  // Common suffixes/prefixes to ignore for matching
  const commonTerms = ['_id', 'id_', '_code', 'code_', '_name', 'name_', '_number', 'number_'];
  
  // Normalize field names by removing common terms
  let normalized1 = field1;
  let normalized2 = field2;
  
  for (const term of commonTerms) {
    normalized1 = normalized1.replace(term, '');
    normalized2 = normalized2.replace(term, '');
  }
  
  if (normalized1 === normalized2) return 0.9;
  
  // Check if one is a substring of the other
  if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
    return 0.85;
  }
  
  // Calculate character overlap
  let common = 0;
  for (let i = 0; i < normalized1.length; i++) {
    if (normalized2.includes(normalized1[i])) {
      common++;
    }
  }
  
  const overlapScore = (common * 2) / (normalized1.length + normalized2.length);
  return overlapScore;
}

/**
 * Generates SQL to create standardized field mappings
 * @param {Object} fieldMappings - Field mapping object (source -> target)
 * @returns {string} SQL expressions for field mappings
 */
function generateFieldMappingSql(fieldMappings) {
  const sqlExpressions = [];
  
  for (const [sourceField, targetField] of Object.entries(fieldMappings)) {
    // Detect semantic type to apply appropriate standardization
    const semanticType = semanticTypes.detectSemanticType(sourceField);
    
    if (semanticType) {
      // Use standardization based on semantic type
      const standardizationExpr = semanticTypes.getStandardizationExpression(sourceField, semanticType.key);
      sqlExpressions.push(`${standardizationExpr} AS ${targetField}`);
    } else {
      // Default standardization (simple column reference)
      sqlExpressions.push(`${sourceField} AS ${targetField}`);
    }
  }
  
  return sqlExpressions.join(',\n');
}

/**
 * Records telemetry data for field mapping operations
 * @param {string} sourceTable - Source table name
 * @param {string} targetTable - Target table name
 * @param {Array} sourceFields - List of source field names
 * @param {Array} targetFields - List of target field names
 * @param {Object} mappingResults - The resulting field mappings
 * @param {Object} options - Options used for mapping
 * @param {number} executionTimeMs - Execution time in milliseconds
 * @returns {string} SQL to insert telemetry data
 */
const recordMappingTelemetry = (sourceTable, targetTable, sourceFields, targetFields, mappingResults, options, executionTimeMs) => {
  const mappingId = `MAP_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const timestamp = new Date().toISOString();
  const totalFields = sourceFields.length;
  const mappedFields = Object.keys(mappingResults).length;
  const mappingAccuracy = mappedFields / totalFields;
  
  // Log warning if mapping accuracy is below threshold
  if (mappingAccuracy < 0.8) {
    errorLogger.logError(
      'field_mapping_factory',
      errorLogger.ERROR_TYPES.FIELD_MAPPING,
      {
        sourceTable,
        targetTable,
        sourceFields,
        targetFields,
        mappingAccuracy,
        message: 'Low field mapping accuracy detected',
        sourceFile: 'field_mapping_factory.js'
      },
      mappingAccuracy < 0.7 ? errorLogger.SEVERITY.ERROR : errorLogger.SEVERITY.WARNING
    );
  }
  
  // Clean and stringify objects
  const configOptionsJson = JSON.stringify(options || {}).replace(/'/g, "''");
  const mappingDetailsJson = JSON.stringify(mappingResults).replace(/'/g, "''");
  
  return `
    INSERT INTO \${self().schema}.mapping_telemetry (
      mapping_id, 
      timestamp, 
      source_table, 
      target_table, 
      total_fields, 
      mapped_fields, 
      mapping_accuracy, 
      execution_time_ms,
      config_options,
      mapping_details,
      execution_context
    )
    VALUES (
      '${mappingId}',
      '${timestamp}',
      '${sourceTable || "unknown"}',
      '${targetTable || "unknown"}',
      ${totalFields},
      ${mappedFields},
      ${mappingAccuracy},
      ${executionTimeMs},
      '${configOptionsJson}',
      '${mappingDetailsJson}',
      '${self().name || "unknown"}'
    )
  `;
};

module.exports = {
  createFieldMappings,
  generateFieldMappingSql,
  findMatchingField,
  calculateFieldNameSimilarity,
  recordMappingTelemetry
}; 