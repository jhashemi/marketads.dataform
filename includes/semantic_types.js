/**
 * Semantic Type System
 * 
 * This module provides a comprehensive system for field type identification,
 * normalization, and validation across different data sources.
 */

// Key semantic types organized by domain
const semanticTypeMap = {
  // Person identifiers
  email: ["email", "email_address", "emailAddress", "e_mail", "contact_email", "personal_email", "business_email"],
  firstName: ["firstname", "first_name", "personfirstname", "fname", "given_name", "first"],
  lastName: ["lastname", "last_name", "personlastname", "lname", "surname", "last", "family_name"],
  fullName: ["fullname", "full_name", "name", "person_name", "personname", "customer_name"],
  phoneNumber: ["phone", "phonenumber", "phone_number", "telephone", "tel", "mobile", "cell", "home_phone", "work_phone", "mobile_phone"],
  dateOfBirth: ["dob", "date_of_birth", "birthdate", "birth_date", "birthdate", "birth_day"],
  age: ["age", "person_age", "customer_age", "years_old"],
  gender: ["gender", "sex"],
  ssn: ["ssn", "social_security", "social_security_number", "tax_id"],
  
  // Address fields
  address: ["address", "street_address", "streetaddress", "addr", "street", "residence_address", "mailing_address"],
  addressLine1: ["address1", "address_line1", "addressline1", "addr1", "street_address_1"],
  addressLine2: ["address2", "address_line2", "addressline2", "addr2", "street_address_2", "apt", "unit", "suite"],
  city: ["city", "town", "municipality", "locality", "residence_city", "mailing_city"],
  state: ["state", "province", "region", "state_province", "residence_state", "mailing_state", "st"],
  zipCode: ["zipcode", "zip_code", "zip", "postal_code", "postalcode", "residence_zip", "mailing_zip", "postal"],
  country: ["country", "nation", "country_code"],
  
  // Business fields
  companyName: ["companyname", "company_name", "company", "organization", "business_name", "employer", "firm"],
  website: ["website", "web_site", "domain", "url", "web", "homepage"],
  
  // Transaction fields
  orderId: ["orderid", "order_id", "ordernumber", "order_number"],
  transactionId: ["transactionid", "transaction_id", "txnid", "txn_id"],
  purchaseAmount: ["amount", "purchaseamount", "purchase_amount", "price", "cost", "revenue"],
  
  // Dates and times
  date: ["date", "day", "event_date"],
  timestamp: ["timestamp", "time", "datetime", "date_time", "eventtime"],
  
  // Marketing fields
  campaign: ["campaign", "campaignname", "campaign_name", "utm_campaign"],
  source: ["source", "utm_source", "traffic_source", "trafficsource"],
  medium: ["medium", "utm_medium", "channel", "marketing_channel"],
  
  // IDs and identifiers
  userId: ["userid", "user_id", "visitorid", "visitor_id", "customerid", "customer_id"],
  deviceId: ["deviceid", "device_id", "hardwareid", "hardware_id", "did"]
};

/**
 * Regex patterns for validating semantic types
 */
const validationPatterns = {
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  phoneNumber: /^\+?[0-9]{10,15}$/,
  zipCode: /^[0-9]{5}(-[0-9]{4})?$/,
  dateOfBirth: /^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/,
  ssn: /^[0-9]{3}-?[0-9]{2}-?[0-9]{4}$/
};

/**
 * Finds the semantic type for a given field name
 * 
 * @param {string} fieldName - The field name to look up
 * @returns {string|null} - The semantic type or null if not found
 */
function getSemanticType(fieldName) {
  if (!fieldName) return null;
  
  const normalizedFieldName = fieldName.toLowerCase().trim().replace(/[^a-z0-9_]/g, '');
  
  for (const [semanticType, aliases] of Object.entries(semanticTypeMap)) {
    if (aliases.some(alias => alias.toLowerCase() === normalizedFieldName)) {
      return semanticType;
    }
  }
  
  // Try fuzzy matching if exact match fails
  const partialMatches = [];
  for (const [semanticType, aliases] of Object.entries(semanticTypeMap)) {
    if (aliases.some(alias => normalizedFieldName.includes(alias.toLowerCase()))) {
      partialMatches.push({ type: semanticType, score: 0.8 });
    } else if (aliases.some(alias => alias.toLowerCase().includes(normalizedFieldName))) {
      partialMatches.push({ type: semanticType, score: 0.6 });
    }
  }
  
  if (partialMatches.length > 0) {
    // Return the match with highest score
    partialMatches.sort((a, b) => b.score - a.score);
    return partialMatches[0].type;
  }
  
  return null;
}

/**
 * Checks if a field matches a specific semantic type
 * 
 * @param {string} fieldName - The field name to check
 * @param {string} semanticType - The semantic type to match against
 * @returns {boolean} - Whether the field matches the semantic type
 */
function isSemanticType(fieldName, semanticType) {
  if (!fieldName || !semanticType) return false;
  
  const normalizedFieldName = fieldName.toLowerCase().trim().replace(/[^a-z0-9_]/g, '');
  return semanticTypeMap[semanticType]?.some(alias => 
    alias.toLowerCase() === normalizedFieldName ||
    normalizedFieldName.includes(alias.toLowerCase())
  ) || false;
}

/**
 * Validates a value against the expected format for a semantic type
 * 
 * @param {string} value - The value to validate
 * @param {string} semanticType - The semantic type to validate against
 * @returns {boolean} - Whether the value is valid for the semantic type
 */
function validateValue(value, semanticType) {
  if (!value || !semanticType) return false;
  
  // For types with regex validation patterns
  if (validationPatterns[semanticType]) {
    return validationPatterns[semanticType].test(value);
  }
  
  // Basic validation for types without specific patterns
  switch(semanticType) {
    case 'firstName':
    case 'lastName':
    case 'fullName':
      return value.length > 1 && /^[a-zA-Z\s'-]+$/.test(value);
    case 'age':
      return !isNaN(value) && parseInt(value) > 0 && parseInt(value) < 120;
    default:
      return true; // No specific validation
  }
}

/**
 * Generates SQL for standardizing a field based on its semantic type
 * 
 * @param {string} fieldName - The name of the field to standardize
 * @param {string} semanticType - The semantic type to use for standardization
 * @returns {string} - SQL expression for standardizing the field
 */
function standardizeSql(fieldName, semanticType) {
  if (!fieldName || !semanticType) return fieldName;
  
  switch(semanticType) {
    case 'email':
      return `LOWER(TRIM(${fieldName}))`;
    case 'firstName':
    case 'lastName':
    case 'fullName':
      return `TRIM(INITCAP(${fieldName}))`;
    case 'phoneNumber':
      return `REGEXP_REPLACE(${fieldName}, '[^0-9]', '')`;
    case 'zipCode':
      return `LPAD(CAST(REGEXP_REPLACE(${fieldName}, '[^0-9]', '') AS STRING), 5, '0')`;
    case 'address':
      return `UPPER(REGEXP_REPLACE(TRIM(${fieldName}), '\\s+', ' '))`;
    default:
      return `TRIM(${fieldName})`;
  }
}

/**
 * Gets all potential field names for a semantic type
 * 
 * @param {string} semanticType - The semantic type to get field names for
 * @returns {string[]} - Array of potential field names
 */
function getPotentialFieldNames(semanticType) {
  return semanticTypeMap[semanticType] || [];
}

// Export all functions and constants
module.exports = { 
  semanticTypeMap,
  validationPatterns,
  getSemanticType,
  isSemanticType,
  validateValue,
  standardizeSql,
  getPotentialFieldNames
};