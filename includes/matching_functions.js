// includes/matching_functions.js
// Core reusable functions for the record linkage system

const { semanticTypeMap } = require('./semantic_types');

/**
 * Returns a standardized version of the input string for more consistent matching
 * @param {string} input - Raw input string to standardize
 * @param {string} fieldType - Type of field (name, address, phone, email, etc.)
 * @returns {string} - Standardized string
 */
function standardize(input, fieldType) {
  if (!input) return "";
  
  // Map fieldType to UDF when in SQL context
  if (typeof input === 'string' && input.includes('${')) {
    // We're generating SQL, use UDFs
    switch (fieldType) {
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
  let result = input.toUpperCase().trim();
  
  switch (fieldType) {
    case 'name':
      // Remove titles, suffixes, and extra spaces
      result = result.replace(/^(MR|MRS|MS|DR|PROF)\.?\s+/, "")
                    .replace(/\s+(JR|SR|I|II|III|IV|V|ESQ|MD|PHD)\.?$/i, "")
                    .replace(/,\s*(JR|SR|I|II|III|IV|V|ESQ|MD|PHD)\.?$/i, "")
                    .replace(/,/g, "")
                    .replace(/\s+/g, " ");
      break;
    case 'address':
      // Standardize common abbreviations
      result = result.replace(/\bAPARTMENT\b|\bAPT\b/gi, "APT")
                    .replace(/\bAVENUE\b|\bAVE\b/gi, "AVE")
                    .replace(/\bBOULEVARD\b|\bBLVD\b/gi, "BLVD")
                    .replace(/\bSTREET\b|\bST\b/gi, "ST")
                    .replace(/\bROAD\b|\bRD\b/gi, "RD")
                    .replace(/,\s*APARTMENT/gi, " APT")
                    .replace(/,\s*APT/gi, " APT")
                    .replace(/,/g, "")
                    .replace(/\s+/g, " ");
      break;
    case 'phone':
      // Strip non-numeric characters
      result = result.replace(/\D/g, "");
      break;
    case 'email':
      // Convert to lowercase (emails are case-insensitive)
      result = input.toLowerCase().trim();
      break;
    case 'zip':
      // Take just the first 5 digits
      result = result.replace(/\D/g, "").substring(0, 5);
      break;
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

  for (const field of fields) {
    if (sourceRecord[field] && targetRecord[field]) {
      // Get semantic type for the field, default to field name if not in map
      const semanticType = semanticTypeMap[field] ? field : field; // Placeholder for actual logic

      // Choose appropriate similarity method based on field type
      let similarityMethod = 'levenshtein';
      if (field.toLowerCase().includes('name')) {
        similarityMethod = 'soundex';
      } else if (field.toLowerCase().includes('address')) {
        similarityMethod = 'address';
      } else if (field.toLowerCase().includes('email')) {
        similarityMethod = 'levenshtein';
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
  
  return {
    score: finalScore,
    fieldScores,
    meetThreshold: finalScore >= 0.85, // Default threshold from requirements
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
  const keys = [];
  
  switch(method) {
    case 'zipcode':
      if (record.ZipCode) {
        keys.push(`ZIP:${standardize(record.ZipCode, 'zip')}`);
      }
      break;
    case 'name_zip':
      if (record.LastName && record.ZipCode) {
        const lastName = standardize(record.LastName, 'name');
        const lastNamePrefix = lastName.substring(0, 4); // Use 4 characters to match the test
        keys.push(`LZ:${lastNamePrefix}${standardize(record.ZipCode, 'zip')}`);
      }
      break;
    case 'phone':
      if (record.PhoneNumber) {
        keys.push(`PH:${standardize(record.PhoneNumber, 'phone')}`);
      }
      break;
    case 'name_dob':
      if (record.LastName && record.DateOfBirth) {
        const dob = record.DateOfBirth.replace(/\D/g, "");
        if (dob.length >= 4) {
          keys.push(`DB:${standardize(record.LastName.substring(0, 3), 'name')}${dob.substring(0, 4)}`);
        }
      }
      break;
    case 'email_prefix':
      if (record.EmailAddress) {
        const email = standardize(record.EmailAddress, 'email');
        const prefix = email.split('@')[0];
        if (prefix) {
          keys.push(`EM:${prefix}`);
        }
      }
      break;
    case 'soundex_name':
      if (record.FirstName && record.LastName) {
        keys.push(`SN:${phoneticCode(record.FirstName)}_${phoneticCode(record.LastName)}`);
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
