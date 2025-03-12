/**
 * Semantic Type Validation
 * 
 * This module provides validation functions for different semantic types.
 * It ensures that values conform to the expected format for each semantic type.
 */

const { ValidationError } = require('../core/errors');
const { VALIDATION_PATTERNS } = require('./detection');

/**
 * Additional validation patterns not used in detection but used for validation
 */
const ADDITIONAL_VALIDATION_PATTERNS = {
  firstName: /^[A-Za-z'\-\s]{1,50}$/,
  lastName: /^[A-Za-z'\-\s]{1,50}$/,
  middleName: /^[A-Za-z'\-\s]{0,50}$/,
  fullName: /^[A-Za-z'\-\s,\.]{2,100}$/,
  address: /^[A-Za-z0-9'\-\s,\.#]{5,200}$/,
  city: /^[A-Za-z'\-\s\.]{2,50}$/,
  state: /^[A-Za-z'\-\s\.]{2,50}$/,
  country: /^[A-Za-z'\-\s\.]{2,50}$/,
  gender: /^(m|f|male|female|man|woman|other|non-binary)$/i
};

// Combine all validation patterns
const ALL_VALIDATION_PATTERNS = {
  ...VALIDATION_PATTERNS,
  ...ADDITIONAL_VALIDATION_PATTERNS
};

/**
 * Validates if a value conforms to the expected format for a semantic type
 * @param {any} value - The value to validate
 * @param {string} semanticType - The semantic type
 * @returns {boolean} True if valid, false otherwise
 */
function isValidForType(value, semanticType) {
  if (value == null) {
    return false;
  }
  
  // Get the pattern for this semantic type
  const pattern = ALL_VALIDATION_PATTERNS[semanticType];
  
  // If no pattern defined, can't validate
  if (!pattern) {
    return true;
  }
  
  // Convert value to string and test
  const strValue = String(value);
  return pattern.test(strValue);
}

/**
 * Validates a value for a semantic type and throws if invalid
 * @param {any} value - The value to validate
 * @param {string} semanticType - The semantic type
 * @param {string} [fieldName] - Optional field name for error message
 * @throws {ValidationError} If validation fails
 */
function validateValue(value, semanticType, fieldName) {
  if (value == null) {
    return; // Null/undefined values are allowed (they represent missing data)
  }
  
  if (!isValidForType(value, semanticType)) {
    throw new ValidationError(
      `Invalid ${semanticType} value: ${value}`,
      fieldName || semanticType,
      value
    );
  }
}

/**
 * Specialized validation for date of birth
 * @param {string} dob - Date of birth string
 * @param {Object} options - Validation options
 * @param {number} [options.minYear=1900] - Minimum acceptable year
 * @param {number} [options.maxYear] - Maximum acceptable year (defaults to current year)
 * @returns {boolean} True if valid
 */
function isValidDateOfBirth(dob, options = {}) {
  if (!dob) {
    return false;
  }
  
  // Check format using regex first
  if (!ALL_VALIDATION_PATTERNS.dateOfBirth.test(dob)) {
    return false;
  }
  
  try {
    const date = new Date(dob);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return false;
    }
    
    // Get the year
    const year = date.getFullYear();
    
    // Check year range
    const minYear = options.minYear || 1900;
    const maxYear = options.maxYear || new Date().getFullYear();
    
    if (year < minYear || year > maxYear) {
      return false;
    }
    
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Validates an email address with more detailed checks
 * @param {string} email - The email to validate
 * @param {Object} options - Validation options
 * @param {boolean} [options.checkDomain=false] - Whether to check domain MX records (not implemented)
 * @returns {boolean} True if valid
 */
function isValidEmail(email, options = {}) {
  if (!email) {
    return false;
  }
  
  // Basic format check
  if (!ALL_VALIDATION_PATTERNS.email.test(email)) {
    return false;
  }
  
  // Additional checks
  const parts = email.split('@');
  if (parts.length !== 2) {
    return false;
  }
  
  const [local, domain] = parts;
  
  // Length checks
  if (local.length > 64 || domain.length > 255) {
    return false;
  }
  
  // Domain must have at least one dot
  if (!domain.includes('.')) {
    return false;
  }
  
  // Domain must not start or end with a hyphen
  if (domain.startsWith('-') || domain.endsWith('-')) {
    return false;
  }
  
  return true;
}

/**
 * Validates a phone number with more detailed checks
 * @param {string} phone - The phone number to validate
 * @param {Object} options - Validation options
 * @param {string} [options.format='international'] - Expected format ('international' or 'national')
 * @returns {boolean} True if valid
 */
function isValidPhone(phone, options = {}) {
  if (!phone) {
    return false;
  }
  
  // Remove non-digit characters for validation
  const digits = phone.replace(/\D/g, '');
  
  // Check minimum digits
  if (digits.length < 10) {
    return false;
  }
  
  // Check maximum digits
  if (digits.length > 15) {
    return false;
  }
  
  // For international format, check country code
  if (options.format === 'international' && phone.startsWith('+')) {
    const countryCode = phone.substring(1).split(/\D/)[0];
    if (!/^[1-9][0-9]{0,2}$/.test(countryCode)) {
      return false;
    }
  }
  
  return true;
}

module.exports = {
  isValidForType,
  validateValue,
  isValidDateOfBirth,
  isValidEmail,
  isValidPhone,
  ALL_VALIDATION_PATTERNS
}; 