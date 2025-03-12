/**
 * Field Type Detection
 * 
 * Utilities to detect field types and determine appropriate
 * standardization, comparison, and blocking strategies.
 */

// Common field name patterns for detection
const FIELD_PATTERNS = {
  // Name-related fields
  NAME: /^(name|first_?name|last_?name|full_?name|given_?name|surname|middle_?name)$/i,
  FIRST_NAME: /^(first_?name|given_?name|forename)$/i,
  LAST_NAME: /^(last_?name|surname|family_?name)$/i,
  
  // Contact info
  EMAIL: /^(email|email_?address|e_?mail)$/i,
  PHONE: /^(phone|phone_?number|telephone|mobile|cell_?phone)$/i,
  
  // Address components
  ADDRESS: /^(address|addr|street|address_?line|street_?address)$/i,
  CITY: /^(city|town|municipality|locality)$/i,
  STATE: /^(state|province|region|county)$/i,
  ZIP: /^(zip|zip_?code|postal_?code|postcode|post_?code)$/i,
  COUNTRY: /^(country|nation)$/i,
  
  // Dates
  DATE: /^(date|dt|timestamp|time)$/i,
  DOB: /^(dob|birth_?date|date_?of_?birth|birth_?day)$/i,
  
  // Identifiers
  ID: /^(id$|identifier|key|code|uuid|guid)$/i,
  ACCOUNT: /^(account|acct|account_?id|account_?num|account_?number)$/i,
  
  // Demographics
  GENDER: /^(gender|sex)$/i,
  AGE: /^(age)$/i,
  
  // Numeric
  AMOUNT: /^(amount|price|cost|value|num|number|quantity|count)$/i
};

/**
 * Detects field type based on field name
 * @param {string} fieldName - Name of the field to analyze
 * @returns {string} Detected field type
 */
function detectFieldType(fieldName) {
  const normalizedName = fieldName.trim().toLowerCase();
  
  // Check against known patterns
  if (FIELD_PATTERNS.FIRST_NAME.test(normalizedName)) return 'first_name';
  if (FIELD_PATTERNS.LAST_NAME.test(normalizedName)) return 'last_name';
  if (FIELD_PATTERNS.NAME.test(normalizedName)) return 'name';
  if (FIELD_PATTERNS.EMAIL.test(normalizedName)) return 'email';
  if (FIELD_PATTERNS.PHONE.test(normalizedName)) return 'phone';
  if (FIELD_PATTERNS.ADDRESS.test(normalizedName)) return 'address';
  if (FIELD_PATTERNS.CITY.test(normalizedName)) return 'city';
  if (FIELD_PATTERNS.STATE.test(normalizedName)) return 'state';
  if (FIELD_PATTERNS.ZIP.test(normalizedName)) return 'zip';
  if (FIELD_PATTERNS.COUNTRY.test(normalizedName)) return 'country';
  if (FIELD_PATTERNS.DOB.test(normalizedName)) return 'date_of_birth';
  if (FIELD_PATTERNS.DATE.test(normalizedName)) return 'date';
  if (FIELD_PATTERNS.ID.test(normalizedName)) return 'id';
  if (FIELD_PATTERNS.ACCOUNT.test(normalizedName)) return 'account';
  if (FIELD_PATTERNS.GENDER.test(normalizedName)) return 'gender';
  if (FIELD_PATTERNS.AGE.test(normalizedName)) return 'age';
  if (FIELD_PATTERNS.AMOUNT.test(normalizedName)) return 'numeric';
  
  // Default to string if no match
  return 'string';
}

/**
 * Get recommended standardization options for a field type
 * @param {string} fieldType - Type of field
 * @returns {Object} Standardization options
 */
function getStandardizationOptions(fieldType) {
  switch (fieldType) {
    case 'first_name':
    case 'last_name':
    case 'name':
      return {
        trim: true,
        removeSpecialChars: true,
        uppercase: true
      };
      
    case 'email':
      return {
        trim: true,
        lowercase: true
      };
      
    case 'phone':
      return {
        trim: true,
        removeNonNumeric: true
      };
      
    case 'address':
      return {
        trim: true,
        standardizeAddressComponents: true
      };
      
    case 'city':
    case 'state':
    case 'country':
      return {
        trim: true,
        uppercase: true
      };
      
    case 'zip':
      return {
        trim: true,
        removeNonNumeric: true,
        maxLength: 5
      };
      
    case 'date':
    case 'date_of_birth':
      return {
        standardizeFormat: true,
        formatPattern: 'YYYY-MM-DD'
      };
      
    case 'gender':
      return {
        trim: true,
        uppercase: true,
        maxLength: 1
      };
      
    default:
      return {
        trim: true
      };
  }
}

/**
 * Get recommended comparison algorithm for a field type
 * @param {string} fieldType - Type of field
 * @returns {string} Recommended comparison algorithm
 */
function getRecommendedComparisonAlgorithm(fieldType) {
  switch (fieldType) {
    case 'first_name':
    case 'last_name':
    case 'name':
      return 'jaro_winkler';
      
    case 'email':
      return 'exact';
      
    case 'phone':
      return 'exact';
      
    case 'address':
      return 'token_sort_ratio';  // Compare words in any order
      
    case 'city':
      return 'levenshtein';
      
    case 'state':
    case 'country':
    case 'zip':
      return 'exact';
      
    case 'date':
    case 'date_of_birth':
      return 'date_proximity';  // Special comparison for dates
      
    case 'id':
    case 'account':
      return 'exact';
      
    case 'gender':
      return 'exact';
      
    case 'age':
    case 'numeric':
      return 'numeric_proximity';  // Allow small differences
      
    default:
      return 'levenshtein';
  }
}

/**
 * Get recommended blocking strategies for a field type
 * @param {string} fieldType - Type of field
 * @returns {Array} Recommended blocking strategies
 */
function getRecommendedBlockingStrategies(fieldType) {
  switch (fieldType) {
    case 'first_name':
      return [
        {strategy: 'first_char_soundex', weight: 0.7},
        {strategy: 'prefix', length: 3, weight: 0.5}
      ];
      
    case 'last_name':
      return [
        {strategy: 'soundex', weight: 0.8},
        {strategy: 'prefix', length: 4, weight: 0.6}
      ];
      
    case 'email':
      return [
        {strategy: 'exact', weight: 1.0},
        {strategy: 'domain', weight: 0.4}  // Just the email domain
      ];
      
    case 'phone':
      return [
        {strategy: 'exact', weight: 1.0},
        {strategy: 'suffix', length: 4, weight: 0.6}  // Last 4 digits
      ];
      
    case 'zip':
      return [
        {strategy: 'exact', weight: 0.8},
        {strategy: 'prefix', length: 3, weight: 0.5}
      ];
      
    case 'date_of_birth':
      return [
        {strategy: 'exact', weight: 1.0},
        {strategy: 'year_month', weight: 0.7}  // Just year and month
      ];
      
    default:
      return [
        {strategy: 'exact', weight: 1.0}
      ];
  }
}

/**
 * Get field importance weight based on type
 * @param {string} fieldType - Type of field
 * @returns {number} Importance weight (0-1)
 */
function getFieldImportanceWeight(fieldType) {
  switch (fieldType) {
    case 'email':
      return 1.0;  // Highly specific identifier
      
    case 'phone':
      return 0.9;  // Very good identifier
      
    case 'first_name':
      return 0.7;
      
    case 'last_name':
      return 0.8;
      
    case 'date_of_birth':
      return 0.9;  // Strong identifier
      
    case 'address':
      return 0.8;
      
    case 'zip':
      return 0.6;
      
    case 'city':
      return 0.4;
      
    case 'state':
      return 0.2;
      
    default:
      return 0.5;  // Default medium importance
  }
}

module.exports = {
  detectFieldType,
  getStandardizationOptions,
  getRecommendedComparisonAlgorithm,
  getRecommendedBlockingStrategies,
  getFieldImportanceWeight
};
