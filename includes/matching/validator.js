/**
 * Match Validator
 * 
 * This module handles validation of match candidates and results.
 * It follows the Separation of Concerns principle by focusing on validation logic.
 */

const { ValidationError } = require('../core/errors');
const types = require('../types');

/**
 * Validates match candidate records against required fields
 * @param {Object} sourceRecord - Source record
 * @param {Object} targetRecord - Target record
 * @param {Array<Object>} sourceFieldMappings - Source field mappings
 * @param {Array<Object>} targetFieldMappings - Target field mappings
 * @param {string[]} requiredFields - Required semantic fields for this match
 * @returns {boolean} Whether validation passes
 * @throws {ValidationError} If validation fails
 */
function validateMatchCandidate(sourceRecord, targetRecord, sourceFieldMappings, targetFieldMappings, requiredFields) {
  if (!sourceRecord || typeof sourceRecord !== 'object') {
    throw new ValidationError('Source record must be an object', 'sourceRecord', sourceRecord);
  }
  
  if (!targetRecord || typeof targetRecord !== 'object') {
    throw new ValidationError('Target record must be an object', 'targetRecord', targetRecord);
  }
  
  if (!Array.isArray(sourceFieldMappings)) {
    throw new ValidationError('Source field mappings must be an array', 'sourceFieldMappings', sourceFieldMappings);
  }
  
  if (!Array.isArray(targetFieldMappings)) {
    throw new ValidationError('Target field mappings must be an array', 'targetFieldMappings', targetFieldMappings);
  }
  
  if (!Array.isArray(requiredFields)) {
    throw new ValidationError('Required fields must be an array', 'requiredFields', requiredFields);
  }
  
  // Convert records to semantic type format
  const sourceByType = types.toSemanticTypes(sourceRecord, sourceFieldMappings);
  const targetByType = types.toSemanticTypes(targetRecord, targetFieldMappings);
  
  // Check for required fields in both records
  for (const semanticType of requiredFields) {
    // Validate source has field
    if (sourceByType[semanticType] === undefined) {
      throw new ValidationError(
        `Source record missing required field: ${semanticType}`,
        'sourceRecord',
        semanticType
      );
    }
    
    // Validate target has field
    if (targetByType[semanticType] === undefined) {
      throw new ValidationError(
        `Target record missing required field: ${semanticType}`,
        'targetRecord',
        semanticType
      );
    }
    
    // Validate both values are valid for the type
    if (!types.validateType(sourceByType[semanticType], semanticType)) {
      throw new ValidationError(
        `Source record has invalid value for ${semanticType}: ${sourceByType[semanticType]}`,
        'sourceRecord',
        semanticType
      );
    }
    
    if (!types.validateType(targetByType[semanticType], semanticType)) {
      throw new ValidationError(
        `Target record has invalid value for ${semanticType}: ${targetByType[semanticType]}`,
        'targetRecord',
        semanticType
      );
    }
  }
  
  return true;
}

/**
 * Validates a match result structure
 * @param {Object} matchResult - Match result to validate
 * @returns {boolean} Whether validation passes
 * @throws {ValidationError} If validation fails
 */
function validateMatchResult(matchResult) {
  if (!matchResult || typeof matchResult !== 'object') {
    throw new ValidationError('Match result must be an object', 'matchResult', matchResult);
  }
  
  // Check required properties
  const requiredProps = ['sourceId', 'targetId', 'confidence', 'tier'];
  for (const prop of requiredProps) {
    if (matchResult[prop] === undefined) {
      throw new ValidationError(
        `Match result missing required property: ${prop}`,
        'matchResult',
        prop
      );
    }
  }
  
  // Validate confidence score
  if (typeof matchResult.confidence !== 'number' || 
      matchResult.confidence < 0 || 
      matchResult.confidence > 1) {
    throw new ValidationError(
      'Confidence must be a number between 0 and 1',
      'matchResult.confidence',
      matchResult.confidence
    );
  }
  
  // Validate tier
  const validTiers = ['HIGH', 'MEDIUM', 'LOW', 'MINIMUM', 'NO_MATCH'];
  if (!validTiers.includes(matchResult.tier)) {
    throw new ValidationError(
      `Tier must be one of: ${validTiers.join(', ')}`,
      'matchResult.tier',
      matchResult.tier
    );
  }
  
  // If components are present, validate they are an object
  if (matchResult.components !== undefined && 
      (typeof matchResult.components !== 'object' || matchResult.components === null)) {
    throw new ValidationError(
      'Components must be an object',
      'matchResult.components',
      matchResult.components
    );
  }
  
  return true;
}

/**
 * Validates if two records can be merged based on match result
 * @param {Object} matchResult - Match result
 * @param {Object} options - Validation options
 * @param {number} [options.minConfidence=0.9] - Minimum confidence for merge
 * @param {string[]} [options.requiredFields=[]] - Fields that must match for merge
 * @returns {boolean} Whether records can be merged
 */
function canMergeRecords(matchResult, options = {}) {
  const { minConfidence = 0.9, requiredFields = [] } = options;
  
  try {
    // Validate match result structure
    validateMatchResult(matchResult);
    
    // Check minimum confidence
    if (matchResult.confidence < minConfidence) {
      return false;
    }
    
    // If required fields specified, ensure they all have scores
    if (requiredFields.length > 0 && matchResult.components) {
      for (const field of requiredFields) {
        if (matchResult.components[field] === undefined) {
          return false;
        }
        
        // Field must have a good score
        const fieldScore = matchResult.components[field];
        if (typeof fieldScore !== 'number' || fieldScore < 0.7) {
          return false;
        }
      }
    }
    
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Checks for potential false positives in match results
 * @param {Object} matchResult - Match result to validate
 * @param {Object} sourceRecord - Source record
 * @param {Object} targetRecord - Target record
 * @param {Array<Object>} sourceFieldMappings - Source field mappings
 * @param {Array<Object>} targetFieldMappings - Target field mappings
 * @returns {Object} Validation result with warnings
 */
function checkForFalsePositives(matchResult, sourceRecord, targetRecord, sourceFieldMappings, targetFieldMappings) {
  const warnings = [];
  
  try {
    // Validate match result structure
    validateMatchResult(matchResult);
    
    // Only check medium and high confidence matches
    if (!['HIGH', 'MEDIUM'].includes(matchResult.tier)) {
      return { valid: true, warnings: [] };
    }
    
    // Convert records to semantic type format
    const sourceByType = types.toSemanticTypes(sourceRecord, sourceFieldMappings);
    const targetByType = types.toSemanticTypes(targetRecord, targetFieldMappings);
    
    // Check for contradicting fields
    const contradictionChecks = [
      // If email is different but high confidence on other fields
      {
        fields: ['email'],
        check: (source, target) => source.email && target.email && source.email !== target.email,
        warning: 'Different email addresses but high confidence match'
      },
      // If phone is different but high confidence on other fields
      {
        fields: ['phone'],
        check: (source, target) => {
          if (!source.phone || !target.phone) return false;
          const sourceDigits = source.phone.replace(/\D/g, '');
          const targetDigits = target.phone.replace(/\D/g, '');
          return sourceDigits.length >= 10 && targetDigits.length >= 10 && sourceDigits !== targetDigits;
        },
        warning: 'Different phone numbers but high confidence match'
      },
      // If DOB is different but high confidence on other fields
      {
        fields: ['dateOfBirth'],
        check: (source, target) => {
          if (!source.dateOfBirth || !target.dateOfBirth) return false;
          try {
            const sourceDate = new Date(source.dateOfBirth);
            const targetDate = new Date(target.dateOfBirth);
            return sourceDate.getTime() !== targetDate.getTime();
          } catch (e) {
            return false;
          }
        },
        warning: 'Different birth dates but high confidence match'
      }
    ];
    
    for (const { fields, check, warning } of contradictionChecks) {
      // Check if all fields exist in both records
      const hasAllFields = fields.every(field => 
        sourceByType[field] !== undefined && targetByType[field] !== undefined
      );
      
      if (hasAllFields && check(sourceByType, targetByType)) {
        warnings.push(warning);
      }
    }
    
    return {
      valid: warnings.length === 0,
      warnings
    };
  } catch (error) {
    return {
      valid: false,
      warnings: [error.message]
    };
  }
}

/**
 * Match Validator class for validating match candidates and results
 */
class MatchValidator {
  /**
   * Creates a new match validator
   * @param {Object} config - Validator configuration
   * @param {number} [config.minMergeConfidence=0.9] - Minimum confidence for merging
   * @param {string[]} [config.requiredMergeFields=[]] - Required fields for merging
   */
  constructor(config = {}) {
    this.minMergeConfidence = config.minMergeConfidence || 0.9;
    this.requiredMergeFields = config.requiredMergeFields || [];
  }
  
  /**
   * Validates a match candidate
   * @param {Object} sourceRecord - Source record
   * @param {Object} targetRecord - Target record
   * @param {Array<Object>} sourceFieldMappings - Source field mappings
   * @param {Array<Object>} targetFieldMappings - Target field mappings
   * @param {string[]} requiredFields - Required semantic fields
   * @returns {boolean} Whether validation passes
   */
  validateCandidate(sourceRecord, targetRecord, sourceFieldMappings, targetFieldMappings, requiredFields) {
    return validateMatchCandidate(
      sourceRecord,
      targetRecord,
      sourceFieldMappings,
      targetFieldMappings,
      requiredFields
    );
  }
  
  /**
   * Validates a match result
   * @param {Object} matchResult - Match result to validate
   * @returns {boolean} Whether validation passes
   */
  validateResult(matchResult) {
    return validateMatchResult(matchResult);
  }
  
  /**
   * Checks if two records can be merged
   * @param {Object} matchResult - Match result
   * @returns {boolean} Whether records can be merged
   */
  canMerge(matchResult) {
    return canMergeRecords(matchResult, {
      minConfidence: this.minMergeConfidence,
      requiredFields: this.requiredMergeFields
    });
  }
  
  /**
   * Checks for potential false positives
   * @param {Object} matchResult - Match result
   * @param {Object} sourceRecord - Source record
   * @param {Object} targetRecord - Target record
   * @param {Array<Object>} sourceFieldMappings - Source field mappings
   * @param {Array<Object>} targetFieldMappings - Target field mappings
   * @returns {Object} Validation result with warnings
   */
  checkFalsePositives(matchResult, sourceRecord, targetRecord, sourceFieldMappings, targetFieldMappings) {
    return checkForFalsePositives(
      matchResult,
      sourceRecord,
      targetRecord,
      sourceFieldMappings,
      targetFieldMappings
    );
  }
}

module.exports = {
  MatchValidator,
  validateMatchCandidate,
  validateMatchResult,
  canMergeRecords,
  checkForFalsePositives
}; 