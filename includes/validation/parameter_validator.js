/**
 * Parameter Validator Module
 * 
 * This module provides consistent parameter validation for function calls
 * throughout the codebase, utilizing semantic types for better validation.
 */

const semanticTypes = require('../semantic_types');
const { projectConfig } = require("dataform");

/**
 * Validates parameters against a set of rules
 * @param {Object} params - Parameters to validate
 * @param {Object} rules - Validation rules
 * @param {Array<string>} [rules.required] - List of required parameters
 * @param {Object} [rules.types] - Type constraints (param: type)
 * @param {Object} [rules.constraints] - Additional constraints (enum, min, max, pattern)
 * @param {string} functionName - Name of function being validated
 * @returns {boolean} - true if parameters are valid
 * @throws {Error} - If parameters are invalid
 */
function validateParameters(params, rules = {}, functionName = 'unknown') {
  // Use strict validation in non-development environments
  const isStrict = projectConfig.vars?.environment !== 'development';
  const errors = [];
  
  // Check required parameters
  if (rules.required && Array.isArray(rules.required)) {
    for (const param of rules.required) {
      if (params[param] === undefined || params[param] === null) {
        errors.push(`Required parameter '${param}' is missing`);
      }
    }
  }
  
  // Check parameter types
  if (rules.types && typeof rules.types === 'object') {
    for (const [param, expectedType] of Object.entries(rules.types)) {
      if (params[param] !== undefined && params[param] !== null) {
        if (expectedType === 'object' && typeof params[param] !== 'object') {
          errors.push(`Parameter '${param}' must be an object, got ${typeof params[param]}`);
        } else if (expectedType === 'array' && !Array.isArray(params[param])) {
          errors.push(`Parameter '${param}' must be an array, got ${typeof params[param]}`);
        } else if (expectedType === 'string' && typeof params[param] !== 'string') {
          errors.push(`Parameter '${param}' must be a string, got ${typeof params[param]}`);
        } else if (expectedType === 'number' && typeof params[param] !== 'number') {
          errors.push(`Parameter '${param}' must be a number, got ${typeof params[param]}`);
        } else if (expectedType === 'boolean' && typeof params[param] !== 'boolean') {
          errors.push(`Parameter '${param}' must be a boolean, got ${typeof params[param]}`);
        } else if (expectedType === 'function' && typeof params[param] !== 'function') {
          errors.push(`Parameter '${param}' must be a function, got ${typeof params[param]}`);
        } else if (expectedType.startsWith('semantic:')) {
          // Check against semantic type
          const semanticTypeKey = expectedType.replace('semantic:', '');
          if (!semanticTypes.validateBySemanticType(semanticTypeKey, params[param])) {
            errors.push(`Parameter '${param}' must be a valid ${semanticTypeKey}`);
          }
        }
      }
    }
  }
  
  // Check additional constraints
  if (rules.constraints && typeof rules.constraints === 'object') {
    for (const [param, constraints] of Object.entries(rules.constraints)) {
      if (params[param] !== undefined && params[param] !== null) {
        // Check enum constraints
        if (constraints.enum && Array.isArray(constraints.enum)) {
          if (!constraints.enum.includes(params[param])) {
            errors.push(`Parameter '${param}' must be one of: ${constraints.enum.join(', ')}`);
          }
        }
        
        // Check numeric range constraints
        if (typeof params[param] === 'number') {
          if (constraints.min !== undefined && params[param] < constraints.min) {
            errors.push(`Parameter '${param}' must be at least ${constraints.min}`);
          }
          if (constraints.max !== undefined && params[param] > constraints.max) {
            errors.push(`Parameter '${param}' must be at most ${constraints.max}`);
          }
        }
        
        // Check string pattern constraints
        if (typeof params[param] === 'string' && constraints.pattern) {
          if (!new RegExp(constraints.pattern).test(params[param])) {
            errors.push(`Parameter '${param}' must match pattern: ${constraints.pattern}`);
          }
        }
        
        // Check string length constraints
        if (typeof params[param] === 'string') {
          if (constraints.minLength !== undefined && params[param].length < constraints.minLength) {
            errors.push(`Parameter '${param}' must be at least ${constraints.minLength} characters long`);
          }
          if (constraints.maxLength !== undefined && params[param].length > constraints.maxLength) {
            errors.push(`Parameter '${param}' must be at most ${constraints.maxLength} characters long`);
          }
        }
        
        // Check array length constraints
        if (Array.isArray(params[param])) {
          if (constraints.minItems !== undefined && params[param].length < constraints.minItems) {
            errors.push(`Parameter '${param}' must contain at least ${constraints.minItems} items`);
          }
          if (constraints.maxItems !== undefined && params[param].length > constraints.maxItems) {
            errors.push(`Parameter '${param}' must contain at most ${constraints.maxItems} items`);
          }
        }
      }
    }
  }
  
  // Handle validation errors
  if (errors.length > 0) {
    const errorMessage = `Validation failed for function '${functionName}': ${errors.join('; ')}`;
    
    // In development, log errors but continue (unless required params are missing)
    const hasRequiredErrors = rules.required && errors.some(err => err.includes('Required parameter'));
    
    if (isStrict || hasRequiredErrors) {
      throw new Error(errorMessage);
    } else {
      console.warn(errorMessage);
    }
  }
  
  return true;
}

module.exports = {
  validateParameters
}; 