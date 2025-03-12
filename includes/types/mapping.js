/**
 * Semantic Type Mapping
 * 
 * This module handles mapping between semantic types and physical database fields.
 * It provides functions to create, validate, and manipulate field mappings.
 */

const { detectSemanticType } = require('./detection');
const { isValidForType } = require('./validation');
const { SemanticTypeError, MissingFieldError } = require('../core/errors');

/**
 * Creates a field mapping between a semantic type and field name
 * @param {string} semanticType - The semantic type (e.g., 'firstName', 'email')
 * @param {string} fieldName - The actual field name in the database
 * @returns {Object} Field mapping object
 */
function createFieldMapping(semanticType, fieldName) {
  if (!semanticType || typeof semanticType !== 'string') {
    throw new SemanticTypeError('Invalid semantic type', semanticType);
  }
  
  if (!fieldName || typeof fieldName !== 'string') {
    throw new MissingFieldError(fieldName);
  }
  
  return {
    semanticType,
    fieldName
  };
}

/**
 * Maps fields from a table schema to semantic types
 * @param {Array<Object>} fields - Array of field objects with name and type
 * @param {Array<any>} [sampleData] - Optional array of sample records for better detection
 * @param {number} [confidenceThreshold=0.7] - Minimum confidence threshold for automatic mapping
 * @returns {Object} Mapping of semantic types to field names
 */
function mapFieldsToSemanticTypes(fields, sampleData = [], confidenceThreshold = 0.7) {
  if (!Array.isArray(fields) || fields.length === 0) {
    throw new Error('Fields must be a non-empty array');
  }
  
  const mappings = {};
  
  // Process each field
  for (const field of fields) {
    // Extract field name and type
    const { name, type } = field;
    
    // Get sample values for this field if available
    const sampleValues = sampleData.length > 0 
      ? sampleData.map(record => record[name]).filter(v => v != null)
      : [];
    
    // Detect semantic type with confidence
    const { semanticType, confidence } = detectSemanticType({
      name,
      type,
      sampleValues
    });
    
    // Only map if confidence meets threshold and not unknown
    if (semanticType !== 'unknown' && confidence >= confidenceThreshold) {
      mappings[semanticType] = name;
    }
  }
  
  return mappings;
}

/**
 * Creates a complete set of field mappings from a mapping object
 * @param {Object} mappingsObj - Object mapping semantic types to field names
 * @returns {Array<Object>} Array of field mapping objects
 */
function createFieldMappings(mappingsObj) {
  if (!mappingsObj || typeof mappingsObj !== 'object') {
    throw new Error('Mappings must be an object');
  }
  
  return Object.entries(mappingsObj).map(([semanticType, fieldName]) => 
    createFieldMapping(semanticType, fieldName)
  );
}

/**
 * Validates a record against field mappings
 * @param {Object} record - The record to validate
 * @param {Array<Object>} fieldMappings - Field mappings
 * @param {string[]} requiredTypes - Semantic types that must be present and valid
 * @throws {ValidationError} If validation fails
 */
function validateRecordAgainstMappings(record, fieldMappings, requiredTypes = []) {
  if (!record || typeof record !== 'object') {
    throw new Error('Record must be an object');
  }
  
  if (!Array.isArray(fieldMappings)) {
    throw new Error('Field mappings must be an array');
  }
  
  // Check required fields
  for (const requiredType of requiredTypes) {
    const mapping = fieldMappings.find(m => m.semanticType === requiredType);
    
    if (!mapping) {
      throw new SemanticTypeError(`Required semantic type "${requiredType}" not mapped`, requiredType);
    }
    
    const { fieldName } = mapping;
    const value = record[fieldName];
    
    if (value == null) {
      throw new MissingFieldError(fieldName);
    }
    
    // Validate value format
    if (!isValidForType(value, requiredType)) {
      throw new SemanticTypeError(
        `Invalid value for semantic type "${requiredType}": ${value}`,
        requiredType
      );
    }
  }
}

/**
 * Gets values from a record by semantic type using mappings
 * @param {Object} record - The source record
 * @param {Array<Object>} fieldMappings - Field mappings
 * @param {string[]} semanticTypes - Semantic types to extract
 * @returns {Object} Values by semantic type
 */
function getValuesBySemanticType(record, fieldMappings, semanticTypes) {
  if (!record || typeof record !== 'object') {
    throw new Error('Record must be an object');
  }
  
  if (!Array.isArray(fieldMappings)) {
    throw new Error('Field mappings must be an array');
  }
  
  if (!Array.isArray(semanticTypes)) {
    throw new Error('Semantic types must be an array');
  }
  
  const result = {};
  
  for (const semanticType of semanticTypes) {
    const mapping = fieldMappings.find(m => m.semanticType === semanticType);
    
    if (mapping) {
      const { fieldName } = mapping;
      result[semanticType] = record[fieldName];
    }
  }
  
  return result;
}

/**
 * Transforms a record using semantic type mappings
 * @param {Object} record - The source record
 * @param {Array<Object>} fieldMappings - Field mappings
 * @returns {Object} Transformed record with semantic type keys
 */
function transformRecordToSemanticTypes(record, fieldMappings) {
  if (!record || typeof record !== 'object') {
    throw new Error('Record must be an object');
  }
  
  if (!Array.isArray(fieldMappings)) {
    throw new Error('Field mappings must be an array');
  }
  
  const result = {};
  
  for (const { semanticType, fieldName } of fieldMappings) {
    if (record[fieldName] !== undefined) {
      result[semanticType] = record[fieldName];
    }
  }
  
  return result;
}

/**
 * Transforms a record from semantic types back to physical field names
 * @param {Object} record - Record with semantic type keys
 * @param {Array<Object>} fieldMappings - Field mappings
 * @returns {Object} Record with physical field names
 */
function transformRecordFromSemanticTypes(record, fieldMappings) {
  if (!record || typeof record !== 'object') {
    throw new Error('Record must be an object');
  }
  
  if (!Array.isArray(fieldMappings)) {
    throw new Error('Field mappings must be an array');
  }
  
  const result = {};
  
  // Create reverse mapping
  const reverseMap = {};
  for (const { semanticType, fieldName } of fieldMappings) {
    reverseMap[semanticType] = fieldName;
  }
  
  // Transform using reverse mapping
  for (const [semanticType, value] of Object.entries(record)) {
    const fieldName = reverseMap[semanticType];
    if (fieldName) {
      result[fieldName] = value;
    }
  }
  
  return result;
}

module.exports = {
  createFieldMapping,
  createFieldMappings,
  mapFieldsToSemanticTypes,
  validateRecordAgainstMappings,
  getValuesBySemanticType,
  transformRecordToSemanticTypes,
  transformRecordFromSemanticTypes
}; 