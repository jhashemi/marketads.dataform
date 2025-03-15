/**
 * Field Type Inference Module
 * 
 * Provides advanced field type detection beyond basic SQL types.
 * This module identifies semantic types like firstName, lastName, email, etc.
 * to enable more intelligent matching rule selection.
 */

const { isString, isNumber, isDate, isEmail, isPhoneNumber, isPostalCode } = require('../utils/validation');

/**
 * Main field type inference function
 * @param {Object} tableSchema - Schema information for the table
 * @param {Array<Object>} sampleData - Sample rows from the table (for pattern detection)
 * @returns {Object} Enhanced schema with inferred semantic types
 */
function inferFieldTypes(tableSchema, sampleData = []) {
  if (!tableSchema || !tableSchema.fields || !Array.isArray(tableSchema.fields)) {
    throw new Error('Invalid table schema provided');
  }
  
  // Ensure we have sample data to work with
  if (!Array.isArray(sampleData) || sampleData.length === 0) {
    return tableSchema; // Can't infer without samples
  }
  
  // Enhance each field with inferred type information
  const enhancedFields = tableSchema.fields.map(field => {
    // Extract sample values for this field
    const fieldSamples = sampleData.map(row => row[field.name]).filter(val => val !== null && val !== undefined);
    
    // Skip inference if no samples available
    if (fieldSamples.length === 0) {
      return field;
    }
    
    // Infer semantic type
    const semanticType = inferSemanticType(field, fieldSamples);
    
    // Return enhanced field with semantic type
    return {
      ...field,
      semanticType
    };
  });
  
  return {
    ...tableSchema,
    fields: enhancedFields
  };
}

/**
 * Infer semantic type for a field based on name and sample values
 * @param {Object} field - Field schema information
 * @param {Array<*>} samples - Sample values for the field
 * @returns {Object} Semantic type information
 */
function inferSemanticType(field, samples) {
  // First check by field name patterns
  const nameBasedType = inferTypeFromName(field.name);
  if (nameBasedType) {
    // Validate that samples match the inferred type
    if (validateSamplesMatchType(samples, nameBasedType)) {
      return {
        type: nameBasedType,
        confidence: 'high',
        source: 'name'
      };
    }
  }
  
  // Then try to infer from content patterns
  const contentBasedType = inferTypeFromContent(samples, field.type);
  if (contentBasedType) {
    return {
      type: contentBasedType,
      confidence: 'medium',
      source: 'content'
    };
  }
  
  // If all else fails, use the generic SQL type
  return {
    type: mapSqlTypeToSemanticType(field.type),
    confidence: 'low',
    source: 'sql_type'
  };
}

/**
 * Infer field type based on field name
 * @param {string} fieldName - Name of the field
 * @returns {string|null} Inferred semantic type or null if can't determine
 */
function inferTypeFromName(fieldName) {
  // Normalize field name (remove prefixes, underscores, make lowercase)
  const normalizedName = fieldName.toLowerCase()
    .replace(/^(fld_|field_|col_|column_|tbl_|f_|c_)/, '')
    .replace(/_/g, '');
    
  // Name matching for person fields
  if (/^(first|given|fore)name$/.test(normalizedName)) return 'firstName';
  if (/^(last|family|sur)name$/.test(normalizedName)) return 'lastName';
  if (/^(middle|mid)name$/.test(normalizedName)) return 'middleName';
  if (/^fullname$/.test(normalizedName)) return 'fullName';
  if (/^name$/.test(normalizedName)) return 'name';
  
  // Contact information
  if (/^(email|emailaddress|e_?mail)$/.test(normalizedName)) return 'email';
  if (/^(phone|telephone|phonenumber|phoneno|tel|telno)$/.test(normalizedName)) return 'phoneNumber';
  
  // Address fields
  if (/^(address|addr|streetaddress|street)$/.test(normalizedName)) return 'streetAddress';
  if (/^(city|town|municipality)$/.test(normalizedName)) return 'city';
  if (/^(state|province|region)$/.test(normalizedName)) return 'state';
  if (/^(zip|zipcode|postal|postalcode|postcode)$/.test(normalizedName)) return 'postalCode';
  if (/^country$/.test(normalizedName)) return 'country';
  
  // Identifier fields
  if (/^(id|identifier|key)$/.test(normalizedName)) return 'id';
  if (/^(customerid|clientid)$/.test(normalizedName)) return 'customerId';
  if (/^(userid|username)$/.test(normalizedName)) return 'userId';
  
  // Date fields
  if (/^(date|dt)$/.test(normalizedName)) return 'date';
  if (/^(dob|dateofbirth|birthdate|birthdt)$/.test(normalizedName)) return 'dateOfBirth';
  if (/^(created|createdat|creationdate|created_date)$/.test(normalizedName)) return 'createdDate';
  if (/^(updated|updatedat|lastupdate|modified|modifiedat)$/.test(normalizedName)) return 'modifiedDate';
  
  // Amount fields
  if (/^(amount|total|sum|price|cost)$/.test(normalizedName)) return 'amount';
  
  // Status fields
  if (/^(status|state|condition)$/.test(normalizedName)) return 'status';
  
  // Return null if no match found
  return null;
}

/**
 * Infer field type based on content patterns in sample data
 * @param {Array<*>} samples - Sample values
 * @param {string} sqlType - SQL type of the field
 * @returns {string|null} Inferred semantic type or null if can't determine
 */
function inferTypeFromContent(samples, sqlType) {
  // Only proceed if we have sample data
  if (!samples || samples.length === 0) {
    return null;
  }
  
  // Get string samples (since most pattern detection works on strings)
  const stringSamples = samples
    .filter(sample => sample !== null && sample !== undefined)
    .map(sample => String(sample));
  
  if (stringSamples.length === 0) {
    return null;
  }
  
  // Test for email pattern
  const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (stringSamples.filter(s => emailPattern.test(s)).length / stringSamples.length >= 0.8) {
    return 'email';
  }
  
  // Test for phone pattern (simplified for demo)
  const phonePattern = /^\+?[0-9]{7,15}$|^\+?[0-9]{3}[-. ][0-9]{3}[-. ][0-9]{4}$/;
  if (stringSamples.filter(s => phonePattern.test(s)).length / stringSamples.length >= 0.8) {
    return 'phoneNumber';
  }
  
  // Test for postal/zip code pattern
  const postalPattern = /^[0-9]{5}(-[0-9]{4})?$|^[A-Z][0-9][A-Z] [0-9][A-Z][0-9]$/;
  if (stringSamples.filter(s => postalPattern.test(s)).length / stringSamples.length >= 0.8) {
    return 'postalCode';
  }
  
  // Test for date of birth (people are typically under 100 years old)
  if (sqlType === 'date' || sqlType === 'timestamp') {
    try {
      const dates = stringSamples.map(s => new Date(s)).filter(d => !isNaN(d.getTime()));
      const now = new Date();
      const yearsSince = dates.map(d => (now - d) / (1000 * 60 * 60 * 24 * 365));
      if (yearsSince.every(years => years > 0 && years < 100)) {
        return 'dateOfBirth';
      }
    } catch (e) {
      // Ignore date parsing errors
    }
  }
  
  // Test for name patterns
  if (sqlType.includes('char') || sqlType.includes('string')) {
    // Check if looks like first name (single word, capitalized)
    const firstNamePattern = /^[A-Z][a-z]+$/;
    if (stringSamples.filter(s => firstNamePattern.test(s)).length / stringSamples.length >= 0.8) {
      return 'firstName';
    }
    
    // Check if looks like full name (multiple words, capitalized)
    const fullNamePattern = /^[A-Z][a-z]+([ ][A-Z][a-z]+)+$/;
    if (stringSamples.filter(s => fullNamePattern.test(s)).length / stringSamples.length >= 0.8) {
      return 'fullName';
    }
  }
  
  // Return null if no pattern detected
  return null;
}

/**
 * Validate that samples match the inferred type
 * @param {Array<*>} samples - Sample values
 * @param {string} type - Semantic type to validate against
 * @returns {boolean} Whether samples match the inferred type
 */
function validateSamplesMatchType(samples, type) {
  // For small samples or empty samples, assume valid
  if (!samples || samples.length < 3) {
    return true;
  }
  
  // Convert samples to strings for validation
  const stringSamples = samples
    .filter(sample => sample !== null && sample !== undefined)
    .map(sample => String(sample));
  
  if (stringSamples.length === 0) {
    return true;
  }
  
  // Type-specific validation
  switch (type) {
    case 'email':
      return validateTypePattern(stringSamples, /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/);
    
    case 'phoneNumber':
      return validateTypePattern(stringSamples, /^\+?[0-9]{7,15}$|^\+?[0-9]{3}[-. ][0-9]{3}[-. ][0-9]{4}$/);
    
    case 'postalCode':
      return validateTypePattern(stringSamples, /^[0-9]{5}(-[0-9]{4})?$|^[A-Z][0-9][A-Z] [0-9][A-Z][0-9]$/);
    
    case 'firstName':
      return validateTypePattern(stringSamples, /^[A-Z][a-z]+$/i);
    
    case 'lastName':
      return validateTypePattern(stringSamples, /^[A-Z][a-z]+$/i);
    
    case 'fullName':
      return validateTypePattern(stringSamples, /^[A-Za-z]+([ ][A-Za-z]+)+$/);
    
    case 'dateOfBirth':
      try {
        const validDates = stringSamples
          .map(s => new Date(s))
          .filter(d => !isNaN(d.getTime()));
        return validDates.length / stringSamples.length >= 0.8;
      } catch (e) {
        return false;
      }
    
    default:
      return true; // For types without specific validation
  }
}

/**
 * Validate samples against a pattern with a threshold
 * @param {Array<string>} samples - Sample values as strings
 * @param {RegExp} pattern - Pattern to test
 * @param {number} threshold - Minimum ratio of matches required
 * @returns {boolean} Whether samples match the pattern at the threshold
 */
function validateTypePattern(samples, pattern, threshold = 0.8) {
  const matchCount = samples.filter(sample => pattern.test(sample)).length;
  return matchCount / samples.length >= threshold;
}

/**
 * Map SQL type to generic semantic type
 * @param {string} sqlType - SQL data type
 * @returns {string} General semantic type
 */
function mapSqlTypeToSemanticType(sqlType) {
  if (!sqlType) return 'unknown';
  
  const type = sqlType.toLowerCase();
  
  if (type.includes('int') || type.includes('decimal') || type.includes('number') || type.includes('float') || type.includes('double')) {
    return 'number';
  }
  
  if (type.includes('char') || type.includes('text') || type.includes('string')) {
    return 'string';
  }
  
  if (type.includes('date') || type.includes('time')) {
    return 'date';
  }
  
  if (type.includes('bool')) {
    return 'boolean';
  }
  
  return 'unknown';
}

/**
 * Get semantic types that are compatible for matching
 * @returns {Object} Map of semantic types to their compatible types
 */
function getCompatibleTypes() {
  return {
    firstName: ['firstName', 'name', 'fullName'],
    lastName: ['lastName', 'name', 'fullName'],
    middleName: ['middleName', 'name', 'fullName'],
    fullName: ['fullName', 'name'],
    email: ['email'],
    phoneNumber: ['phoneNumber'],
    streetAddress: ['streetAddress', 'address'],
    city: ['city'],
    state: ['state'],
    postalCode: ['postalCode', 'zipCode'],
    country: ['country'],
    id: ['id', 'customerId', 'userId'],
    customerId: ['customerId', 'id'],
    userId: ['userId', 'id'],
    date: ['date'],
    dateOfBirth: ['dateOfBirth'],
    createdDate: ['createdDate', 'date'],
    modifiedDate: ['modifiedDate', 'date'],
    amount: ['amount', 'number'],
    status: ['status']
  };
}

/**
 * Get recommended matching algorithms for semantic types
 * @returns {Object} Map of semantic types to recommended algorithms
 */
function getRecommendedAlgorithms() {
  return {
    firstName: ['levenshtein', 'jaro', 'soundex'],
    lastName: ['levenshtein', 'jaro', 'soundex'],
    middleName: ['levenshtein', 'jaro', 'soundex'],
    fullName: ['levenshtein', 'jaro', 'soundex'],
    email: ['exact', 'levenshtein'],
    phoneNumber: ['exact', 'lastN'],
    streetAddress: ['token_sort', 'levenshtein'],
    city: ['levenshtein', 'soundex'],
    state: ['exact'],
    postalCode: ['exact', 'startsWith'],
    country: ['exact'],
    id: ['exact'],
    customerId: ['exact'],
    userId: ['exact'],
    date: ['exact', 'dateWithinRange'],
    dateOfBirth: ['exact', 'dateWithinRange'],
    createdDate: ['dateWithinRange'],
    modifiedDate: ['dateWithinRange'],
    amount: ['numeric', 'range'],
    status: ['exact']
  };
}

module.exports = {
  inferFieldTypes,
  inferSemanticType,
  inferTypeFromName,
  inferTypeFromContent,
  validateSamplesMatchType,
  mapSqlTypeToSemanticType,
  getCompatibleTypes,
  getRecommendedAlgorithms
}; 