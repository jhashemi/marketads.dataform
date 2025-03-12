/**
 * Semantic Types Module
 * 
 * This module serves as the entry point for all semantic type functionality.
 * It exports functions for detecting, validating, and mapping semantic types.
 */

const detection = require('./detection');
const validation = require('./validation');
const mapping = require('./mapping');

/**
 * Detects semantic type for a field
 * @param {Object} field - Field object
 * @returns {Object} Detection result with type and confidence
 */
function detectType(field) {
  return detection.detectSemanticType(field);
}

/**
 * Validates a value for a specific semantic type
 * @param {any} value - The value to validate
 * @param {string} semanticType - The semantic type
 * @returns {boolean} Whether the value is valid for the type
 */
function validateType(value, semanticType) {
  return validation.isValidForType(value, semanticType);
}

/**
 * Creates a field mapping with basic validation
 * @param {string} semanticType - Semantic type
 * @param {string} fieldName - Field name
 * @returns {Object} Field mapping object
 */
function createMapping(semanticType, fieldName) {
  return mapping.createFieldMapping(semanticType, fieldName);
}

/**
 * Auto-maps fields to semantic types based on name and content analysis
 * @param {Array<Object>} fields - Array of field objects with name and type
 * @param {Array<any>} [sampleData] - Optional sample records for better detection
 * @returns {Object} Mapping of semantic types to field names
 */
function autoMapFields(fields, sampleData) {
  return mapping.mapFieldsToSemanticTypes(fields, sampleData);
}

/**
 * Validates if a record structure matches required semantic types
 * @param {Object} record - The record to validate
 * @param {Array<Object>} fieldMappings - Field mappings
 * @param {string[]} requiredTypes - Required semantic types
 * @returns {boolean} True if valid
 */
function validateRecordTypes(record, fieldMappings, requiredTypes) {
  try {
    mapping.validateRecordAgainstMappings(record, fieldMappings, requiredTypes);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Transforms a record using field mappings to semantic type keys
 * @param {Object} record - Record with physical field names
 * @param {Array<Object>} fieldMappings - Field mappings
 * @returns {Object} Record with semantic type keys
 */
function toSemanticTypes(record, fieldMappings) {
  return mapping.transformRecordToSemanticTypes(record, fieldMappings);
}

/**
 * Transforms a record from semantic type keys back to physical field names
 * @param {Object} record - Record with semantic type keys
 * @param {Array<Object>} fieldMappings - Field mappings
 * @returns {Object} Record with physical field names
 */
function fromSemanticTypes(record, fieldMappings) {
  return mapping.transformRecordFromSemanticTypes(record, fieldMappings);
}

module.exports = {
  // Main convenience functions
  detectType,
  validateType,
  createMapping,
  autoMapFields,
  validateRecordTypes,
  toSemanticTypes,
  fromSemanticTypes,
  
  // Sub-modules
  detection,
  validation,
  mapping
}; 