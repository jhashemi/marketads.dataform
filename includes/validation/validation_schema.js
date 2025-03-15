/**
 * @fileoverview Validation Schema for MarketAds Dataform
 * 
 * This module provides standardized validation schemas for the MarketAds Dataform project.
 * It defines schemas for various components and provides utilities for schema validation.
 */

const { ValidationError } = require('../errors/error_types');

/**
 * Schema types for validation
 */
const SCHEMA_TYPES = {
  STRING: 'string',
  NUMBER: 'number',
  BOOLEAN: 'boolean',
  OBJECT: 'object',
  ARRAY: 'array',
  FUNCTION: 'function',
  ANY: 'any',
  NULL: 'null',
  UNDEFINED: 'undefined',
  DATE: 'date',
  REGEX: 'regex'
};

/**
 * Format validators for string values
 */
const FORMAT_VALIDATORS = {
  /**
   * Validate email format
   * @param {string} value - Value to validate
   * @returns {boolean} Whether the value is a valid email
   */
  email: (value) => {
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value);
  },
  
  /**
   * Validate URL format
   * @param {string} value - Value to validate
   * @returns {boolean} Whether the value is a valid URL
   */
  url: (value) => {
    try {
      new URL(value);
      return true;
    } catch (e) {
      return false;
    }
  },
  
  /**
   * Validate date format
   * @param {string} value - Value to validate
   * @returns {boolean} Whether the value is a valid date
   */
  date: (value) => {
    const date = new Date(value);
    return !isNaN(date.getTime());
  },
  
  /**
   * Validate time format (HH:MM:SS)
   * @param {string} value - Value to validate
   * @returns {boolean} Whether the value is a valid time
   */
  time: (value) => {
    return /^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/.test(value);
  },
  
  /**
   * Validate datetime format (ISO 8601)
   * @param {string} value - Value to validate
   * @returns {boolean} Whether the value is a valid datetime
   */
  datetime: (value) => {
    const date = new Date(value);
    return !isNaN(date.getTime()) && value.includes('T');
  },
  
  /**
   * Validate UUID format
   * @param {string} value - Value to validate
   * @returns {boolean} Whether the value is a valid UUID
   */
  uuid: (value) => {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  },
  
  /**
   * Validate BigQuery table name format
   * @param {string} value - Value to validate
   * @returns {boolean} Whether the value is a valid BigQuery table name
   */
  bigqueryTable: (value) => {
    return /^[a-zA-Z0-9_]+$/.test(value);
  },
  
  /**
   * Validate BigQuery dataset name format
   * @param {string} value - Value to validate
   * @returns {boolean} Whether the value is a valid BigQuery dataset name
   */
  bigqueryDataset: (value) => {
    return /^[a-zA-Z0-9_]+$/.test(value);
  },
  
  /**
   * Validate BigQuery project ID format
   * @param {string} value - Value to validate
   * @returns {boolean} Whether the value is a valid BigQuery project ID
   */
  bigqueryProject: (value) => {
    return /^[a-zA-Z0-9-]+$/.test(value);
  },
  
  /**
   * Validate SQL identifier format
   * @param {string} value - Value to validate
   * @returns {boolean} Whether the value is a valid SQL identifier
   */
  sqlIdentifier: (value) => {
    return /^[a-zA-Z0-9_]+$/.test(value);
  }
};

/**
 * Common validation schemas for reuse
 */
const COMMON_SCHEMAS = {
  /**
   * Schema for BigQuery table reference
   */
  bigQueryTableReference: {
    type: SCHEMA_TYPES.OBJECT,
    required: true,
    properties: {
      projectId: {
        type: SCHEMA_TYPES.STRING,
        required: true,
        format: 'bigqueryProject'
      },
      datasetId: {
        type: SCHEMA_TYPES.STRING,
        required: true,
        format: 'bigqueryDataset'
      },
      tableId: {
        type: SCHEMA_TYPES.STRING,
        required: true,
        format: 'bigqueryTable'
      }
    }
  },
  
  /**
   * Schema for field mapping
   */
  fieldMapping: {
    type: SCHEMA_TYPES.OBJECT,
    required: true,
    properties: {
      sourceField: {
        type: SCHEMA_TYPES.STRING,
        required: true
      },
      targetField: {
        type: SCHEMA_TYPES.STRING,
        required: true
      },
      type: {
        type: SCHEMA_TYPES.STRING,
        required: false,
        enum: ['string', 'number', 'boolean', 'date', 'timestamp', 'array', 'object']
      },
      weight: {
        type: SCHEMA_TYPES.NUMBER,
        required: false,
        min: 0
      }
    }
  },
  
  /**
   * Schema for matching rule
   */
  matchingRule: {
    type: SCHEMA_TYPES.OBJECT,
    required: true,
    properties: {
      id: {
        type: SCHEMA_TYPES.STRING,
        required: true
      },
      name: {
        type: SCHEMA_TYPES.STRING,
        required: true
      },
      description: {
        type: SCHEMA_TYPES.STRING,
        required: false
      },
      fields: {
        type: SCHEMA_TYPES.ARRAY,
        required: true,
        items: {
          type: SCHEMA_TYPES.STRING
        },
        minItems: 1
      },
      threshold: {
        type: SCHEMA_TYPES.NUMBER,
        required: true,
        min: 0,
        max: 1
      },
      weight: {
        type: SCHEMA_TYPES.NUMBER,
        required: false,
        min: 0
      },
      enabled: {
        type: SCHEMA_TYPES.BOOLEAN,
        required: false,
        default: true
      }
    }
  },
  
  /**
   * Schema for query history entry
   */
  queryHistoryEntry: {
    type: SCHEMA_TYPES.OBJECT,
    required: true,
    properties: {
      sql: {
        type: SCHEMA_TYPES.STRING,
        required: true
      },
      jobId: {
        type: SCHEMA_TYPES.STRING,
        required: false
      },
      startTime: {
        type: [SCHEMA_TYPES.NUMBER, SCHEMA_TYPES.DATE],
        required: true
      },
      endTime: {
        type: [SCHEMA_TYPES.NUMBER, SCHEMA_TYPES.DATE],
        required: true
      },
      bytesProcessed: {
        type: SCHEMA_TYPES.NUMBER,
        required: false
      },
      status: {
        type: SCHEMA_TYPES.STRING,
        required: false,
        enum: ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED']
      },
      user: {
        type: SCHEMA_TYPES.STRING,
        required: false
      }
    }
  }
};

/**
 * Validate a value against a schema
 * @param {*} value - Value to validate
 * @param {Object} schema - Schema to validate against
 * @param {string} path - Current path in the object (for error messages)
 * @returns {Object} Validation result with success flag and errors
 */
function validateSchema(value, schema, path = '') {
  const result = {
    success: true,
    errors: []
  };
  
  // Check if schema is a reference to a common schema
  if (typeof schema === 'string' && COMMON_SCHEMAS[schema]) {
    schema = COMMON_SCHEMAS[schema];
  }
  
  // Check if value is required
  if (schema.required && (value === undefined || value === null)) {
    result.success = false;
    result.errors.push({
      path,
      message: `${path || 'Value'} is required`
    });
    return result;
  }
  
  // If value is not required and not provided, skip validation
  if (!schema.required && (value === undefined || value === null)) {
    return result;
  }
  
  // Validate type
  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    const valueType = getValueType(value);
    
    if (!types.includes(valueType) && !types.includes(SCHEMA_TYPES.ANY)) {
      result.success = false;
      result.errors.push({
        path,
        message: `${path || 'Value'} should be of type ${types.join(' or ')}, but got ${valueType}`
      });
      return result;
    }
  }
  
  // Validate enum
  if (schema.enum && !schema.enum.includes(value)) {
    result.success = false;
    result.errors.push({
      path,
      message: `${path || 'Value'} should be one of [${schema.enum.join(', ')}], but got ${value}`
    });
    return result;
  }
  
  // Validate format
  if (schema.format && typeof value === 'string') {
    const formatValidator = FORMAT_VALIDATORS[schema.format];
    if (formatValidator && !formatValidator(value)) {
      result.success = false;
      result.errors.push({
        path,
        message: `${path || 'Value'} does not match format ${schema.format}`
      });
      return result;
    }
  }
  
  // Validate min/max for numbers
  if (typeof value === 'number') {
    if (schema.min !== undefined && value < schema.min) {
      result.success = false;
      result.errors.push({
        path,
        message: `${path || 'Value'} should be >= ${schema.min}, but got ${value}`
      });
    }
    
    if (schema.max !== undefined && value > schema.max) {
      result.success = false;
      result.errors.push({
        path,
        message: `${path || 'Value'} should be <= ${schema.max}, but got ${value}`
      });
    }
  }
  
  // Validate minLength/maxLength for strings
  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      result.success = false;
      result.errors.push({
        path,
        message: `${path || 'Value'} should have length >= ${schema.minLength}, but got ${value.length}`
      });
    }
    
    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      result.success = false;
      result.errors.push({
        path,
        message: `${path || 'Value'} should have length <= ${schema.maxLength}, but got ${value.length}`
      });
    }
    
    if (schema.pattern) {
      const regex = new RegExp(schema.pattern);
      if (!regex.test(value)) {
        result.success = false;
        result.errors.push({
          path,
          message: `${path || 'Value'} does not match pattern ${schema.pattern}`
        });
      }
    }
  }
  
  // Validate minItems/maxItems for arrays
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      result.success = false;
      result.errors.push({
        path,
        message: `${path || 'Array'} should have >= ${schema.minItems} items, but got ${value.length}`
      });
    }
    
    if (schema.maxItems !== undefined && value.length > schema.maxItems) {
      result.success = false;
      result.errors.push({
        path,
        message: `${path || 'Array'} should have <= ${schema.maxItems} items, but got ${value.length}`
      });
    }
    
    // Validate array items
    if (schema.items && result.success) {
      value.forEach((item, index) => {
        const itemPath = path ? `${path}[${index}]` : `[${index}]`;
        const itemResult = validateSchema(item, schema.items, itemPath);
        
        if (!itemResult.success) {
          result.success = false;
          result.errors = result.errors.concat(itemResult.errors);
        }
      });
    }
  }
  
  // Validate object properties
  if (typeof value === 'object' && value !== null && !Array.isArray(value) && schema.properties) {
    // Check required properties
    Object.entries(schema.properties).forEach(([propName, propSchema]) => {
      if (propSchema.required && !(propName in value)) {
        result.success = false;
        result.errors.push({
          path: path ? `${path}.${propName}` : propName,
          message: `Property ${propName} is required`
        });
      }
    });
    
    // Validate each property
    Object.entries(value).forEach(([propName, propValue]) => {
      if (schema.properties[propName]) {
        const propPath = path ? `${path}.${propName}` : propName;
        const propResult = validateSchema(propValue, schema.properties[propName], propPath);
        
        if (!propResult.success) {
          result.success = false;
          result.errors = result.errors.concat(propResult.errors);
        }
      } else if (schema.additionalProperties === false) {
        result.success = false;
        result.errors.push({
          path: path ? `${path}.${propName}` : propName,
          message: `Additional property ${propName} is not allowed`
        });
      }
    });
  }
  
  return result;
}

/**
 * Get the type of a value
 * @param {*} value - Value to get type of
 * @returns {string} Type of the value
 */
function getValueType(value) {
  if (value === null) {
    return SCHEMA_TYPES.NULL;
  }
  
  if (value === undefined) {
    return SCHEMA_TYPES.UNDEFINED;
  }
  
  if (Array.isArray(value)) {
    return SCHEMA_TYPES.ARRAY;
  }
  
  if (value instanceof Date) {
    return SCHEMA_TYPES.DATE;
  }
  
  if (value instanceof RegExp) {
    return SCHEMA_TYPES.REGEX;
  }
  
  return typeof value;
}

/**
 * Validate a value against a schema and throw a ValidationError if invalid
 * @param {*} value - Value to validate
 * @param {Object} schema - Schema to validate against
 * @param {string} fieldName - Field name for error messages
 * @param {Object} options - Additional options
 * @param {string} options.component - Component name for error context
 * @throws {ValidationError} If validation fails
 */
function validateAndThrow(value, schema, fieldName, options = {}) {
  const result = validateSchema(value, schema, fieldName);
  
  if (!result.success) {
    throw new ValidationError(`Validation failed for ${fieldName}`, {
      field: fieldName,
      value,
      component: options.component,
      context: {
        errors: result.errors
      }
    });
  }
  
  return true;
}

module.exports = {
  SCHEMA_TYPES,
  FORMAT_VALIDATORS,
  COMMON_SCHEMAS,
  validateSchema,
  validateAndThrow,
  getValueType
}; 