/**
 * Semantic Type Detection
 * 
 * This module handles detection of semantic types for fields
 * based on field names, data types, and sample values.
 */

const { SemanticTypeError } = require('../core/errors');

/**
 * Common field name patterns for detecting semantic types
 */
const FIELD_NAME_PATTERNS = {
  email: [
    /^email$/i,
    /^e[-_]?mail/i,
    /^contact[-_]?email/i,
    /^email[-_]?address/i
  ],
  
  phone: [
    /^phone$/i,
    /^phone[-_]?number/i,
    /^contact[-_]?phone/i,
    /^telephone/i,
    /^mobile/i,
    /^cell[-_]?phone/i
  ],
  
  firstName: [
    /^first[-_]?name$/i,
    /^given[-_]?name$/i,
    /^f[-_]?name$/i,
    /^forename$/i
  ],
  
  lastName: [
    /^last[-_]?name$/i,
    /^surname$/i,
    /^family[-_]?name$/i,
    /^l[-_]?name$/i
  ],
  
  middleName: [
    /^middle[-_]?name$/i,
    /^m[-_]?name$/i
  ],
  
  fullName: [
    /^name$/i,
    /^full[-_]?name$/i,
    /^person[-_]?name$/i,
    /^display[-_]?name$/i
  ],
  
  dateOfBirth: [
    /^(date[-_]?of[-_]?birth)$/i,
    /^birth[-_]?date$/i,
    /^dob$/i,
    /^born[-_]?on$/i
  ],
  
  address: [
    /^address$/i,
    /^street[-_]?address$/i,
    /^addr$/i,
    /^street$/i
  ],
  
  postalCode: [
    /^postal[-_]?code$/i,
    /^zip[-_]?code$/i,
    /^zip$/i,
    /^postcode$/i
  ],
  
  city: [
    /^city$/i,
    /^town$/i,
    /^municipality$/i
  ],
  
  state: [
    /^state$/i,
    /^province$/i,
    /^region$/i,
    /^county$/i
  ],
  
  country: [
    /^country$/i,
    /^nation$/i
  ],
  
  gender: [
    /^gender$/i,
    /^sex$/i
  ]
};

/**
 * Regular expressions for validating common semantic types
 */
const VALIDATION_PATTERNS = {
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  phone: /^\+?[0-9]{10,15}$/,
  postalCode: /^[0-9]{5}(-[0-9]{4})?$/,
  dateOfBirth: /^\d{4}-\d{2}-\d{2}$/ // ISO format
};

/**
 * Attempts to detect semantic type based on field name
 * @param {string} fieldName - The field name to analyze
 * @returns {string|null} The detected semantic type or null if unable to detect
 */
function detectTypeFromName(fieldName) {
  if (!fieldName || typeof fieldName !== 'string') {
    return null;
  }
  
  for (const [semanticType, patterns] of Object.entries(FIELD_NAME_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(fieldName)) {
        return semanticType;
      }
    }
  }
  
  return null;
}

/**
 * Detects semantic type based on sample values
 * @param {Array<any>} sampleValues - Sample values to analyze
 * @param {string} dataType - The SQL data type of the field
 * @returns {string|null} The detected semantic type or null if unable to detect
 */
function detectTypeFromSamples(sampleValues, dataType) {
  if (!Array.isArray(sampleValues) || sampleValues.length === 0) {
    return null;
  }
  
  // Convert to lowercase string data type
  const type = (dataType || '').toLowerCase();
  
  // Filter out null/undefined values
  const validSamples = sampleValues.filter(v => v != null);
  if (validSamples.length === 0) {
    return null;
  }
  
  // Try to detect based on content patterns
  const stringSamples = validSamples.map(s => String(s));
  
  // Email detection
  if (stringSamples.some(s => VALIDATION_PATTERNS.email.test(s))) {
    return 'email';
  }
  
  // Phone detection
  if (stringSamples.some(s => VALIDATION_PATTERNS.phone.test(s))) {
    return 'phone';
  }
  
  // Date detection
  if (type.includes('date') || type.includes('timestamp') || 
      stringSamples.some(s => VALIDATION_PATTERNS.dateOfBirth.test(s))) {
    return 'dateOfBirth';
  }
  
  // Postal code detection
  if (stringSamples.some(s => VALIDATION_PATTERNS.postalCode.test(s))) {
    return 'postalCode';
  }
  
  // Gender detection
  const genderValues = ['m', 'f', 'male', 'female', 'man', 'woman'];
  if (stringSamples.some(s => genderValues.includes(s.toLowerCase()))) {
    return 'gender';
  }
  
  return null;
}

/**
 * Assigns a confidence score to a semantic type detection
 * @param {string} semanticType - The detected semantic type
 * @param {string} fieldName - The field name
 * @param {Array<any>} sampleValues - Sample values
 * @param {string} dataType - The SQL data type
 * @returns {number} Confidence score between 0 and 1
 */
function getDetectionConfidence(semanticType, fieldName, sampleValues, dataType) {
  if (!semanticType) {
    return 0;
  }
  
  let confidence = 0;
  
  // Name match is strongest indicator
  const nameMatch = detectTypeFromName(fieldName) === semanticType;
  if (nameMatch) {
    confidence += 0.7;
  }
  
  // Content match is also strong
  const contentMatch = detectTypeFromSamples(sampleValues, dataType) === semanticType;
  if (contentMatch) {
    confidence += 0.6;
  }
  
  // Adjust based on the number of valid samples
  const validSamples = (sampleValues || []).filter(v => v != null).length;
  if (validSamples > 0) {
    const sampleFactor = Math.min(validSamples / 10, 1); // Max out at 10 samples
    confidence *= (0.7 + (0.3 * sampleFactor));
  }
  
  return Math.min(confidence, 1);
}

/**
 * Detects semantic type for a field with confidence score
 * @param {Object} field - Field object
 * @param {string} field.name - Field name
 * @param {string} field.type - Field data type
 * @param {Array<any>} [field.sampleValues] - Optional sample values
 * @returns {Object} Detection result with type and confidence
 */
function detectSemanticType(field) {
  if (!field || !field.name) {
    throw new SemanticTypeError('Invalid field object', null);
  }
  
  const { name, type, sampleValues = [] } = field;
  
  // Try name-based detection first
  let semanticType = detectTypeFromName(name);
  
  // If no type detected from name, try sample-based detection
  if (!semanticType && sampleValues.length > 0) {
    semanticType = detectTypeFromSamples(sampleValues, type);
  }
  
  // If still no type, return unknown
  if (!semanticType) {
    return {
      semanticType: 'unknown',
      confidence: 0
    };
  }
  
  const confidence = getDetectionConfidence(semanticType, name, sampleValues, type);
  
  return {
    semanticType,
    confidence
  };
}

module.exports = {
  detectSemanticType,
  detectTypeFromName,
  detectTypeFromSamples,
  getDetectionConfidence,
  FIELD_NAME_PATTERNS,
  VALIDATION_PATTERNS
}; 