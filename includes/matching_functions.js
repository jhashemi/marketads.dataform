a// includes/matching_functions.js
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
  
  // Convert to uppercase and trim
  let result = input.toUpperCase().trim();
  
  switch (fieldType) {
    case 'name':
      // Remove titles, suffixes, and extra spaces
      result = result.replace(/^(MR|MRS|MS|DR|PROF)\.?\s+/, "")
                    .replace(/\s+(JR|SR|I|II|III|IV|V|ESQ|MD|PHD)\.?$/, "")
                    .replace(/\s+/g, " ");
      break;
    case 'address':
      // Standardize common abbreviations
      result = result.replace(/\bAPARTMENT\b|\bAPT\b/g, "APT")
                    .replace(/\bAVENUE\b|\bAVE\b/g, "AVE")
                    .replace(/\bBOULEVARD\b|\bBLVD\b/g, "BLVD")
                    .replace(/\bSTREET\b|\bST\b/g, "ST")
                    .replace(/\bROAD\b|\bRD\b/g, "RD")
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
 * Calculate Jaro-Winkler similarity between two strings
 * Optimized for names and addresses
 * @param {string} s1 - First string
 * @param {string} s2 - Second string
 * @returns {number} - Similarity score between 0 and 1
 */
function jaroWinkler(s1, s2) {
  // Implementation of Jaro-Winkler algorithm
  // This is a simplified version for illustration
  
  if (!s1 || !s2) return 0;
  if (s1 === s2) return 1;
  
  // Real implementation would go here
  // This is a placeholder that would be replaced with actual algorithm
  
  return 0.5; // Placeholder
}

/**
 * Generate a phonetic code for a name using a modified Soundex algorithm
 * @param {string} name - Input name
 * @returns {string} - Phonetic code
 */
function phoneticCode(name) {
  if (!name) return "";
  
  // Implementation of phonetic algorithm
  // This is a simplified version for illustration
  
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

      const similarity = jaroWinkler(standardize(sourceRecord[field], field),
                                    standardize(targetRecord[field], field));

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
        keys.push(`LZ:${standardize(record.LastName.substring(0, 3), 'name')}${standardize(record.ZipCode, 'zip')}`);
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
  }
  
  return keys;
}

module.exports = {
  standardize,
  jaroWinkler,
  phoneticCode,
  calculateConfidenceScore,
  generateBlockingKeys
};
