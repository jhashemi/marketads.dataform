/**
 * Parameter Validation Utility
 * 
 * Provides standardized parameter validation functionality for use across the codebase.
 * This ensures consistent error messages and validation behavior in all classes.
 */

/**
 * Validates that required parameters are present in options object
 * @param {Object} options - The options object to validate
 * @param {Object} validationRules - Validation rules for parameters
 * @param {string} className - Name of the class for error messages
 * @throws {Error} If required parameters are missing
 */
function validateRequiredParameters(options, validationRules, className) {
  if (!options) {
    throw new Error(`${className}: Options object is required.`);
  }

  const missingParams = [];
  
  // Check for missing required parameters
  for (const param of validationRules.required || []) {
    if (typeof param === 'string') {
      // Simple required parameter
      if (options[param] === undefined && 
          !hasAlternativeParameter(options, validationRules.alternatives, param)) {
        missingParams.push(param);
      }
    } else if (typeof param === 'object' && param.name) {
      // Parameter with conditional requirements
      if (options[param.name] === undefined && 
          !hasAlternativeParameter(options, validationRules.alternatives, param.name) &&
          isConditionMet(options, param.condition)) {
        missingParams.push(param.name);
      }
    }
  }
  
  if (missingParams.length > 0) {
    throw new Error(
      `${className} constructor: Missing required parameter${missingParams.length > 1 ? 's' : ''} ` +
      `"${missingParams.join('", "')}". ${getCustomMessage(missingParams, validationRules.messages)}`
    );
  }
}

/**
 * Checks if an alternative parameter is present
 * @param {Object} options - The options object
 * @param {Object} alternatives - Alternative parameters mapping
 * @param {string} paramName - Parameter name to check
 * @returns {boolean} True if an alternative is present
 */
function hasAlternativeParameter(options, alternatives, paramName) {
  if (!alternatives || !alternatives[paramName]) {
    return false;
  }
  
  const altParams = Array.isArray(alternatives[paramName]) 
    ? alternatives[paramName] 
    : [alternatives[paramName]];
    
  return altParams.some(alt => options[alt] !== undefined);
}

/**
 * Checks if a condition is met for conditional parameter requirements
 * @param {Object} options - The options object
 * @param {Object} condition - Condition to check
 * @returns {boolean} True if condition is met
 */
function isConditionMet(options, condition) {
  if (!condition) {
    return true; // No condition means always required
  }
  
  if (condition.ifPresent) {
    return options[condition.ifPresent] !== undefined;
  }
  
  if (condition.ifEquals) {
    const { param, value } = condition.ifEquals;
    return options[param] === value;
  }
  
  if (condition.ifNotEquals) {
    const { param, value } = condition.ifNotEquals;
    return options[param] !== value;
  }
  
  if (condition.ifOneOf) {
    const { param, values } = condition.ifOneOf;
    return Array.isArray(values) && values.includes(options[param]);
  }
  
  if (condition.ifAllOf) {
    const conditions = Array.isArray(condition.ifAllOf) ? condition.ifAllOf : [];
    return conditions.every(cond => isConditionMet(options, cond));
  }
  
  if (condition.ifAnyOf) {
    const conditions = Array.isArray(condition.ifAnyOf) ? condition.ifAnyOf : [];
    return conditions.some(cond => isConditionMet(options, cond));
  }
  
  return true; // Default to required if condition is not recognized
}

/**
 * Gets custom error message for missing parameters
 * @param {Array<string>} missingParams - Missing parameter names
 * @param {Object} messages - Custom messages by parameter
 * @returns {string} Custom error message
 */
function getCustomMessage(missingParams, messages) {
  if (!messages || missingParams.length !== 1) {
    return 'Please provide the required parameter(s).';
  }
  
  return messages[missingParams[0]] || 'Please provide the required parameter.';
}

/**
 * Validates that parameter values are of the correct type
 * @param {Object} options - The options object to validate
 * @param {Object} validationRules - Validation rules for parameters
 * @param {string} className - Name of the class for error messages
 * @throws {Error} If parameters are of incorrect type
 */
function validateParameterTypes(options, validationRules, className) {
  if (!validationRules.types) {
    return;
  }
  
  const typeErrors = [];
  
  for (const [param, expectedType] of Object.entries(validationRules.types)) {
    if (options[param] !== undefined) {
      let valid = true;
      let actualType = typeof options[param];
      
      if (expectedType === 'array') {
        valid = Array.isArray(options[param]);
        actualType = valid ? 'array' : actualType;
      } else if (expectedType === 'number') {
        valid = typeof options[param] === 'number';
      } else if (expectedType === 'string') {
        valid = typeof options[param] === 'string';
      } else if (expectedType === 'boolean') {
        valid = typeof options[param] === 'boolean';
      } else if (expectedType === 'object') {
        valid = typeof options[param] === 'object' && !Array.isArray(options[param]);
      } else if (expectedType === 'function') {
        valid = typeof options[param] === 'function';
      } else if (expectedType === 'date') {
        valid = options[param] instanceof Date;
        actualType = valid ? 'date' : actualType;
      } else if (expectedType === 'regexp') {
        valid = options[param] instanceof RegExp;
        actualType = valid ? 'regexp' : actualType;
      } else if (Array.isArray(expectedType)) {
        // Union type
        valid = expectedType.some(type => {
          if (type === 'array') return Array.isArray(options[param]);
          if (type === 'date') return options[param] instanceof Date;
          if (type === 'regexp') return options[param] instanceof RegExp;
          return typeof options[param] === type;
        });
      }
      
      if (!valid) {
        typeErrors.push(`${param} (expected ${expectedType}, got ${actualType})`);
      }
    }
  }
  
  if (typeErrors.length > 0) {
    throw new Error(
      `${className} constructor: Invalid parameter type${typeErrors.length > 1 ? 's' : ''}: ${typeErrors.join(', ')}`
    );
  }
}

/**
 * Applies defaults to options object
 * @param {Object} options - The options object
 * @param {Object} validationRules - Validation rules with defaults
 * @returns {Object} Options object with defaults applied
 */
function applyDefaults(options, validationRules) {
  const result = { ...options };
  
  if (validationRules.defaults) {
    for (const [param, defaultValue] of Object.entries(validationRules.defaults)) {
      if (result[param] === undefined) {
        result[param] = defaultValue;
      }
    }
  }
  
  // Handle alternative parameter mappings
  if (validationRules.alternatives) {
    for (const [param, alternatives] of Object.entries(validationRules.alternatives)) {
      if (result[param] === undefined) {
        const altParams = Array.isArray(alternatives) ? alternatives : [alternatives];
        
        for (const alt of altParams) {
          if (result[alt] !== undefined) {
            if (validationRules.transformations && validationRules.transformations[param]) {
              // Apply transformation if defined
              result[param] = validationRules.transformations[param](result[alt]);
            } else {
              result[param] = result[alt];
            }
            break;
          }
        }
      }
    }
  }
  
  return result;
}

/**
 * Validates parameters according to validation rules
 * @param {Object} options - The options object to validate
 * @param {Object} validationRules - Validation rules
 * @param {string} className - Name of the class for error messages
 * @returns {Object} Validated options with defaults applied
 */
function validateParameters(options, validationRules, className) {
  validateRequiredParameters(options, validationRules, className);
  validateParameterTypes(options, validationRules, className);
  validateConstraints(options, validationRules, className);
  return applyDefaults(options, validationRules);
}

/**
 * Validates parameter constraints (min, max, pattern, enum, etc.)
 * @param {Object} options - The options object to validate
 * @param {Object} validationRules - Validation rules for parameters
 * @param {string} className - Name of the class for error messages
 * @throws {Error} If parameters fail constraint validation
 */
function validateConstraints(options, validationRules, className) {
  if (!validationRules.constraints) {
    return;
  }
  
  const constraintErrors = [];
  
  for (const [param, constraints] of Object.entries(validationRules.constraints)) {
    const value = options[param];
    
    if (value === undefined) {
      continue; // Skip validation for undefined parameters
    }
    
    // Numeric constraints
    if (typeof value === 'number') {
      if (constraints.min !== undefined && value < constraints.min) {
        constraintErrors.push(`${param} must be at least ${constraints.min}`);
      }
      
      if (constraints.max !== undefined && value > constraints.max) {
        constraintErrors.push(`${param} must be at most ${constraints.max}`);
      }
      
      if (constraints.integer === true && !Number.isInteger(value)) {
        constraintErrors.push(`${param} must be an integer`);
      }
      
      if (constraints.positive === true && value <= 0) {
        constraintErrors.push(`${param} must be positive`);
      }
      
      if (constraints.negative === true && value >= 0) {
        constraintErrors.push(`${param} must be negative`);
      }
    }
    
    // String constraints
    if (typeof value === 'string') {
      if (constraints.minLength !== undefined && value.length < constraints.minLength) {
        constraintErrors.push(`${param} must have a minimum length of ${constraints.minLength}`);
      }
      
      if (constraints.maxLength !== undefined && value.length > constraints.maxLength) {
        constraintErrors.push(`${param} must have a maximum length of ${constraints.maxLength}`);
      }
      
      if (constraints.pattern && !new RegExp(constraints.pattern).test(value)) {
        constraintErrors.push(`${param} must match pattern ${constraints.pattern}`);
      }
      
      if (constraints.format) {
        const formatValidators = {
          email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
          url: (v) => /^https?:\/\/\S+$/.test(v),
          alpha: (v) => /^[a-zA-Z]+$/.test(v),
          alphanumeric: (v) => /^[a-zA-Z0-9]+$/.test(v),
          numeric: (v) => /^[0-9]+$/.test(v)
        };
        
        const validator = formatValidators[constraints.format];
        if (validator && !validator(value)) {
          constraintErrors.push(`${param} must be a valid ${constraints.format}`);
        }
      }
    }
    
    // Array constraints
    if (Array.isArray(value)) {
      if (constraints.minItems !== undefined && value.length < constraints.minItems) {
        constraintErrors.push(`${param} must have at least ${constraints.minItems} items`);
      }
      
      if (constraints.maxItems !== undefined && value.length > constraints.maxItems) {
        constraintErrors.push(`${param} must have at most ${constraints.maxItems} items`);
      }
      
      if (constraints.uniqueItems === true && new Set(value).size !== value.length) {
        constraintErrors.push(`${param} must contain unique items`);
      }
    }
    
    // Enum constraints
    if (constraints.enum && Array.isArray(constraints.enum) && !constraints.enum.includes(value)) {
      constraintErrors.push(`${param} must be one of: ${constraints.enum.join(', ')}`);
    }
    
    // Custom validator
    if (typeof constraints.validator === 'function') {
      try {
        const result = constraints.validator(value);
        if (result !== true) {
          constraintErrors.push(`${param}: ${result || 'Invalid value'}`);
        }
      } catch (error) {
        constraintErrors.push(`${param}: ${error.message || 'Validation failed'}`);
      }
    }
  }
  
  if (constraintErrors.length > 0) {
    throw new Error(
      `${className} constructor: Constraint violation${constraintErrors.length > 1 ? 's' : ''}: ${constraintErrors.join('; ')}`
    );
  }
}

/**
 * Validates an object against a JSON schema
 * @param {Object} obj - The object to validate
 * @param {Object} schema - JSON schema
 * @param {string} className - Name of the class for error messages
 * @returns {Object} Validated object
 * @throws {Error} If validation fails
 */
function validateSchema(obj, schema, className) {
  if (!obj || typeof obj !== 'object') {
    throw new Error(`${className}: Object is required.`);
  }
  
  if (!schema || typeof schema !== 'object') {
    throw new Error(`${className}: Schema is required.`);
  }
  
  const errors = [];
  
  // Check required properties
  if (Array.isArray(schema.required)) {
    for (const requiredProp of schema.required) {
      if (obj[requiredProp] === undefined) {
        errors.push(`Missing required property: ${requiredProp}`);
      }
    }
  }
  
  // Validate properties
  if (schema.properties && typeof schema.properties === 'object') {
    for (const [propName, propSchema] of Object.entries(schema.properties)) {
      const value = obj[propName];
      
      // Skip validation if property is not present and not required
      if (value === undefined) {
        continue;
      }
      
      // Type validation
      if (propSchema.type) {
        const typeValid = validateType(value, propSchema.type);
        if (!typeValid) {
          errors.push(`Property ${propName}: Expected type ${propSchema.type}, got ${getValueType(value)}`);
          continue; // Skip further validation for this property
        }
      }
      
      // String validations
      if (propSchema.type === 'string' && typeof value === 'string') {
        if (propSchema.minLength !== undefined && value.length < propSchema.minLength) {
          errors.push(`Property ${propName}: String is too short (minimum length: ${propSchema.minLength})`);
        }
        
        if (propSchema.maxLength !== undefined && value.length > propSchema.maxLength) {
          errors.push(`Property ${propName}: String is too long (maximum length: ${propSchema.maxLength})`);
        }
        
        if (propSchema.pattern && !new RegExp(propSchema.pattern).test(value)) {
          errors.push(`Property ${propName}: String does not match pattern: ${propSchema.pattern}`);
        }
        
        if (propSchema.format) {
          const formatValid = validateFormat(value, propSchema.format);
          if (!formatValid) {
            errors.push(`Property ${propName}: Invalid format (expected: ${propSchema.format})`);
          }
        }
      }
      
      // Number validations
      if ((propSchema.type === 'number' || propSchema.type === 'integer') && typeof value === 'number') {
        if (propSchema.type === 'integer' && !Number.isInteger(value)) {
          errors.push(`Property ${propName}: Expected integer, got float`);
        }
        
        if (propSchema.minimum !== undefined && value < propSchema.minimum) {
          errors.push(`Property ${propName}: Value is too small (minimum: ${propSchema.minimum})`);
        }
        
        if (propSchema.maximum !== undefined && value > propSchema.maximum) {
          errors.push(`Property ${propName}: Value is too large (maximum: ${propSchema.maximum})`);
        }
        
        if (propSchema.exclusiveMinimum !== undefined && value <= propSchema.exclusiveMinimum) {
          errors.push(`Property ${propName}: Value must be greater than ${propSchema.exclusiveMinimum}`);
        }
        
        if (propSchema.exclusiveMaximum !== undefined && value >= propSchema.exclusiveMaximum) {
          errors.push(`Property ${propName}: Value must be less than ${propSchema.exclusiveMaximum}`);
        }
        
        if (propSchema.multipleOf !== undefined && value % propSchema.multipleOf !== 0) {
          errors.push(`Property ${propName}: Value must be a multiple of ${propSchema.multipleOf}`);
        }
      }
      
      // Array validations
      if (propSchema.type === 'array' && Array.isArray(value)) {
        if (propSchema.minItems !== undefined && value.length < propSchema.minItems) {
          errors.push(`Property ${propName}: Array is too short (minimum items: ${propSchema.minItems})`);
        }
        
        if (propSchema.maxItems !== undefined && value.length > propSchema.maxItems) {
          errors.push(`Property ${propName}: Array is too long (maximum items: ${propSchema.maxItems})`);
        }
        
        if (propSchema.uniqueItems === true && new Set(value).size !== value.length) {
          errors.push(`Property ${propName}: Array items must be unique`);
        }
        
        // Validate array items
        if (propSchema.items && value.length > 0) {
          for (let i = 0; i < value.length; i++) {
            const itemValue = value[i];
            
            if (typeof propSchema.items === 'object') {
              // Single schema for all items
              if (propSchema.items.type) {
                const itemTypeValid = validateType(itemValue, propSchema.items.type);
                if (!itemTypeValid) {
                  errors.push(`Property ${propName}[${i}]: Expected type ${propSchema.items.type}, got ${getValueType(itemValue)}`);
                }
              }
              
              // Recursive validation for object items
              if (propSchema.items.type === 'object' && propSchema.items.properties && typeof itemValue === 'object') {
                const itemErrors = validateSchema(itemValue, propSchema.items, className);
                if (itemErrors.length > 0) {
                  errors.push(`Property ${propName}[${i}]: ${itemErrors.join('; ')}`);
                }
              }
            }
          }
        }
      }
      
      // Object validations
      if (propSchema.type === 'object' && typeof value === 'object' && !Array.isArray(value)) {
        // Recursive validation for nested objects
        if (propSchema.properties) {
          const nestedErrors = validateSchema(value, propSchema, className);
          if (nestedErrors.length > 0) {
            errors.push(`Property ${propName}: ${nestedErrors.join('; ')}`);
          }
        }
      }
      
      // Enum validation
      if (propSchema.enum && Array.isArray(propSchema.enum) && !propSchema.enum.includes(value)) {
        errors.push(`Property ${propName}: Value must be one of: ${propSchema.enum.join(', ')}`);
      }
    }
  }
  
  if (errors.length > 0) {
    throw new Error(`${className} schema validation error: ${errors.join('; ')}`);
  }
  
  return obj;
}

/**
 * Validates a value against a type
 * @param {*} value - The value to validate
 * @param {string|Array<string>} type - The expected type(s)
 * @returns {boolean} True if valid
 */
function validateType(value, type) {
  if (Array.isArray(type)) {
    // Union type
    return type.some(t => validateType(value, t));
  }
  
  switch (type) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number';
    case 'integer':
      return typeof value === 'number' && Number.isInteger(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'array':
      return Array.isArray(value);
    case 'object':
      return typeof value === 'object' && value !== null && !Array.isArray(value);
    case 'null':
      return value === null;
    default:
      return false;
  }
}

/**
 * Gets the type of a value
 * @param {*} value - The value
 * @returns {string} The type
 */
function getValueType(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (value instanceof Date) return 'date';
  return typeof value;
}

/**
 * Validates a string against a format
 * @param {string} value - The string to validate
 * @param {string} format - The format
 * @returns {boolean} True if valid
 */
function validateFormat(value, format) {
  switch (format) {
    case 'email':
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    case 'uri':
    case 'url':
      return /^https?:\/\/\S+$/.test(value);
    case 'date-time':
      return !isNaN(Date.parse(value));
    case 'date':
      return /^\d{4}-\d{2}-\d{2}$/.test(value);
    case 'time':
      return /^\d{2}:\d{2}:\d{2}$/.test(value);
    case 'ipv4':
      return /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(value);
    case 'ipv6':
      return /^(?:[A-F0-9]{1,4}:){7}[A-F0-9]{1,4}$/i.test(value);
    case 'hostname':
      return /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(value);
    default:
      return true; // Unknown format, assume valid
  }
}

// Export the validation functions
module.exports = {
  validateParameters,
  validateRequiredParameters,
  validateParameterTypes,
  validateConstraints,
  applyDefaults,
  validateSchema
}; 