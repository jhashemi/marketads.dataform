// includes/matching_functions.js
// Core reusable functions for the record linkage system

const semanticTypes = require('./semantic_types');
const { validateParameters } = require('./validation/parameter_validator');
const config = require('./config');

/**
 * Returns a standardized version of the input string for more consistent matching
 * @param {string} input - Raw input string to standardize
 * @param {string} fieldName - Field name to detect type or explicit type
 * @returns {string} - Standardized string
 */
function standardize(input, fieldName) {
  if (!input) return "";
  
  // Detect the semantic type from the field name
  const semanticType = semanticTypes.detectSemanticType(fieldName);
  const fieldType = semanticType ? semanticType.key : null;
  
  // Get matching field type for standardization
  let standardizationType = 'text';
  if (fieldType) {
    if (fieldType === 'EMAIL') standardizationType = 'email';
    else if (fieldType === 'PHONE') standardizationType = 'phone';
    else if (['FIRST_NAME', 'LAST_NAME', 'FULL_NAME'].includes(fieldType)) standardizationType = 'name';
    else if (['ADDRESS', 'ADDRESS_LINE_1'].includes(fieldType)) standardizationType = 'address';
    else if (fieldType === 'ZIP_CODE') standardizationType = 'zip';
  } else {
    // Fallback detection based on field name patterns
    if (fieldName.toLowerCase().includes('email')) standardizationType = 'email';
    else if (fieldName.toLowerCase().includes('phone')) standardizationType = 'phone';
    else if (fieldName.toLowerCase().includes('name')) standardizationType = 'name';
    else if (fieldName.toLowerCase().includes('address')) standardizationType = 'address';
    else if (fieldName.toLowerCase().includes('zip')) standardizationType = 'zip';
  }
  
  // Map fieldType to UDF when in SQL context
  if (typeof input === 'string' && input.includes('${')) {
    // We're generating SQL, use UDFs
    switch (standardizationType) {
      case 'name':
        return `\${ref("core.text_udfs")}.standardize_name(${input})`;
      case 'address':
        return `\${ref("core.text_udfs")}.standardize_address(${input})`;
      case 'phone':
        return `\${ref("core.text_udfs")}.standardize_phone(${input})`;
      case 'email':
        return `\${ref("core.text_udfs")}.standardize_email(${input})`;
      case 'zip':
        return `SUBSTR(REGEXP_REPLACE(${input}, r'[^0-9]', ''), 1, 5)`;
      default:
        return `UPPER(TRIM(${input}))`;
    }
  }
  
  // JavaScript implementation for non-SQL contexts
  let result = input.toString().trim();
  
  switch (standardizationType) {
    case 'name':
      // Convert to uppercase and remove titles, suffixes, and extra spaces
      result = result.toUpperCase()
                    .replace(/^(MR|MRS|MS|DR|PROF)\.?\s+/i, "")
                    .replace(/\s+(JR|SR|I|II|III|IV|V|ESQ|MD|PHD)\.?$/i, "")
                    .replace(/,\s*(JR|SR|I|II|III|IV|V|ESQ|MD|PHD)\.?$/i, "")
                    .replace(/,/g, "")
                    .replace(/\s+/g, " ");
      break;
    case 'address':
      // Convert to uppercase and standardize common abbreviations
      result = result.toUpperCase()
                    .replace(/\bAPARTMENT\b|\bAPT\b/i, "APT")
                    .replace(/\bAVENUE\b|\bAVE\b/i, "AVE")
                    .replace(/\bBOULEVARD\b|\bBLVD\b/i, "BLVD")
                    .replace(/\bSTREET\b|\bST\b/i, "ST")
                    .replace(/\bROAD\b|\bRD\b/i, "RD")
                    .replace(/,\s*APARTMENT/i, " APT")
                    .replace(/,\s*APT/i, " APT")
                    .replace(/,/g, "")
                    .replace(/\s+/g, " ");
      break;
    case 'phone':
      // Strip non-numeric characters
      result = result.replace(/\D/g, "");
      break;
    case 'email':
      // Convert to lowercase (emails are case-insensitive)
      result = result.toLowerCase();
      break;
    case 'zip':
      // Take just the first 5 digits
      result = result.replace(/\D/g, "").substring(0, 5);
      break;
    default:
      // Default to uppercase for general text
      result = result.toUpperCase();
  }
  return result;
}

/**
 * Calculate string similarity between two strings
 * Delegates to appropriate BigQuery function when in SQL context
 * @param {string} s1 - First string
 * @param {string} s2 - Second string
 * @param {string} method - Similarity method ('levenshtein', 'jaro_winkler', 'soundex')
 * @returns {string|number} - Similarity score between 0 and 1 or SQL expression
 */
function calculateSimilarity(s1, s2, method = 'levenshtein') {
  if (!s1 || !s2) return 0;
  if (s1 === s2) return 1;
  
  // Validate parameters
  const validationRules = {
    constraints: {
      method: {
        enum: ['levenshtein', 'jaro_winkler', 'soundex', 'address']
      }
    }
  };

  validateParameters({ method }, validationRules, 'calculateSimilarity');

  // If we're in SQL context (strings contain SQL placeholders)
  if (typeof s1 === 'string' && s1.includes('${')) {
    switch (method.toLowerCase()) {
      case 'levenshtein':
        return `\${ref("core.text_udfs")}.text_similarity(${s1}, ${s2})`;
      case 'jaro_winkler':
        return `ML.SIMILARITY(${s1}, ${s2}, 'JARO_WINKLER')`;
      case 'soundex':
        return `\${ref("core.text_udfs")}.phonetic_similarity(${s1}, ${s2}, 'SOUNDEX')`;
      case 'address':
        return `\${ref("core.text_udfs")}.address_similarity(${s1}, ${s2})`;
      default:
        return `\${ref("core.text_udfs")}.text_similarity(${s1}, ${s2})`;
    }
  }
  
  // JavaScript implementation for non-SQL contexts (placeholder)
  return 0.5; // This would be replaced with actual JS implementation
}

/**
 * Generate a phonetic code for a name
 * @param {string} name - Input name
 * @param {string} algorithm - Phonetic algorithm to use ('soundex', 'metaphone')
 * @returns {string} - Phonetic code or SQL expression
 */
function phoneticCode(name, algorithm = 'soundex') {
  // Validate parameters
  const validationRules = {
    constraints: {
      algorithm: {
        enum: ['soundex', 'metaphone']
      }
    }
  };

  validateParameters({ algorithm }, validationRules, 'phoneticCode');
  
  if (!name) return "";
  
  // If we're in SQL context
  if (typeof name === 'string' && name.includes('${')) {
    switch (algorithm.toLowerCase()) {
      case 'soundex':
        return `SOUNDEX(${name})`;
      case 'metaphone':
        // BigQuery doesn't have METAPHONE, so we use SOUNDEX as a fallback
        return `SOUNDEX(${name})`;
      default:
        return `SOUNDEX(${name})`;
    }
  }
  
  // JavaScript implementation for non-SQL contexts (placeholder)
  return name.substring(0, 1) + "000"; // Placeholder
}

/**
 * Calculates weighted confidence score based on field matches
 * @param {Object} sourceRecord - Source record with fields
 * @param {Object} targetRecord - Target record with fields
 * @param {Object} weights - Field importance weights
 * @param {Object} thresholds - Minimum similarity thresholds by field
 * @returns {Object} - Confidence score and match details
 */
function calculateConfidenceScore(sourceRecord, targetRecord, weights, thresholds) {
  const fields = Object.keys(weights);
  let totalWeight = 0;
  let weightedScore = 0;
  const fieldScores = {};

  // Validate parameters
  const validationRules = {
    required: ['sourceRecord', 'targetRecord', 'weights', 'thresholds'],
    types: {
      sourceRecord: 'object',
      targetRecord: 'object',
      weights: 'object',
      thresholds: 'object',
    }
  };

  validateParameters({ sourceRecord, targetRecord, weights, thresholds }, validationRules, 'calculateConfidenceScore');
  
  for (const field of fields) {
    if (sourceRecord[field] && targetRecord[field]) {
      // Get semantic type for the field
      const detectedType = semanticTypes.detectSemanticType(field);
      
      // Choose appropriate similarity method based on semantic type
      let similarityMethod = 'levenshtein';
      if (detectedType) {
        switch (detectedType.key) {
          case 'FIRST_NAME':
          case 'LAST_NAME':
          case 'FULL_NAME':
            similarityMethod = 'soundex';
            break;
          case 'ADDRESS':
          case 'ADDRESS_LINE_1':
            similarityMethod = 'address';
            break;
          case 'EMAIL':
            similarityMethod = 'levenshtein';
            break;
        }
      }

      const similarity = calculateSimilarity(
        standardize(sourceRecord[field], field),
        standardize(targetRecord[field], field),
        similarityMethod
      );

      fieldScores[field] = similarity;

      // Only count fields that meet minimum threshold
      if (similarity >= thresholds[field]) {
        weightedScore += similarity * weights[field];
        totalWeight += weights[field];
      }
    }
  }
  
  // Calculate final confidence score
  const finalScore = totalWeight > 0 ? weightedScore / totalWeight : 0;
  
  // Use configured threshold from config if available
  const configuredThreshold = config.getConfigValue('confidence_minimum', 0.85);
  
  return {
    score: finalScore,
    fieldScores,
    meetThreshold: finalScore >= configuredThreshold,
    matchDetails: fields.map(f => ({
      field: f,
      source: sourceRecord[f],
      target: targetRecord[f],
      score: fieldScores[f] || 0,
      passed: (fieldScores[f] || 0) >= thresholds[f]
    }))
  };
}

/**
 * Generate efficient blocking keys to reduce comparison space
 * @param {Object} record - Record to generate blocking key for
 * @param {string} method - Blocking method to use
 * @returns {string[]} - Array of blocking keys
 */
function generateBlockingKeys(record, method) {
  // Validate parameters
  const validationRules = {
    required: ['method', 'record'],
    types: {
      method: 'string',
      record: 'object',
    },
    constraints: {
      method: {
        enum: ['zipcode', 'name_zip', 'phone', 'name_dob', 'email_prefix', 'soundex_name']
      }
    }
  };

  validateParameters({ method, record }, validationRules, 'generateBlockingKeys');
  
  const keys = [];
  
  switch(method) {
    case 'zipcode':
      if (record.ZipCode) {
        keys.push(`ZIP:${standardize(record.ZipCode, 'ZIP_CODE')}`);
      }
      break;
    case 'name_zip':
      if (record.LastName && record.ZipCode) {
        const lastName = standardize(record.LastName, 'LAST_NAME');
        const lastNamePrefix = lastName.substring(0, 4);
        keys.push(`LZ:${lastNamePrefix}${standardize(record.ZipCode, 'ZIP_CODE')}`);
      }
      break;
    case 'phone':
      if (record.PhoneNumber) {
        keys.push(`PH:${standardize(record.PhoneNumber, 'PHONE')}`);
      }
      break;
    case 'name_dob':
      if (record.LastName && record.DateOfBirth) {
        const dob = standardize(record.DateOfBirth, 'DATE_OF_BIRTH').replace(/\D/g, "");
        if (dob.length >= 4) {
          keys.push(`DB:${standardize(record.LastName.substring(0, 3), 'LAST_NAME')}${dob.substring(0, 4)}`);
        }
      }
      break;
    case 'email_prefix':
      if (record.EmailAddress) {
        const email = standardize(record.EmailAddress, 'EMAIL');
        const prefix = email.split('@')[0];
        if (prefix) {
          keys.push(`EM:${prefix}`);
        }
      }
      break;
    case 'soundex_name':
      if (record.FirstName && record.LastName) {
        keys.push(`SN:${phoneticCode(standardize(record.FirstName, 'FIRST_NAME'))}_${phoneticCode(standardize(record.LastName, 'LAST_NAME'))}`);
      }
      break;
  }
  
  return keys;
}

module.exports = {
  standardize,
  calculateSimilarity,
  phoneticCode,
  calculateConfidenceScore,
  generateBlockingKeys
};
