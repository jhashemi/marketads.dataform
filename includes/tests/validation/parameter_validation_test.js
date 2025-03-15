/**
 * @fileoverview Tests for Parameter Validation
 * 
 * This file contains tests for the parameter validation functionality.
 */

const assert = require('assert');
const { 
  validateParameter, 
  validateObject, 
  validateArray,
  validateFunction,
  validateString,
  validateNumber,
  validateBoolean,
  validateEnum,
  validateOptional,
  createValidator
} = require('../../validation/parameter_validation');
const { ValidationError } = require('../../errors/validation_error');

/**
 * Test suite for Parameter Validation
 */
const tests = [
  {
    id: 'validate_parameter_basic',
    name: 'Parameter Validation - Basic Validation',
    type: 'unit',
    tags: ['validation', 'parameters'],
    priority: 1,
    testFn: async () => {
      // Test string validation
      assert.doesNotThrow(() => {
        validateParameter('test', 'string', 'testParam');
      }, 'Valid string should not throw');
      
      assert.throws(() => {
        validateParameter(123, 'string', 'testParam');
      }, ValidationError, 'Non-string should throw ValidationError');
      
      // Test number validation
      assert.doesNotThrow(() => {
        validateParameter(123, 'number', 'testParam');
      }, 'Valid number should not throw');
      
      assert.throws(() => {
        validateParameter('123', 'number', 'testParam');
      }, ValidationError, 'Non-number should throw ValidationError');
      
      // Test boolean validation
      assert.doesNotThrow(() => {
        validateParameter(true, 'boolean', 'testParam');
      }, 'Valid boolean should not throw');
      
      assert.throws(() => {
        validateParameter('true', 'boolean', 'testParam');
      }, ValidationError, 'Non-boolean should throw ValidationError');
      
      // Test object validation
      assert.doesNotThrow(() => {
        validateParameter({}, 'object', 'testParam');
      }, 'Valid object should not throw');
      
      assert.throws(() => {
        validateParameter(123, 'object', 'testParam');
      }, ValidationError, 'Non-object should throw ValidationError');
      
      // Test array validation
      assert.doesNotThrow(() => {
        validateParameter([], 'array', 'testParam');
      }, 'Valid array should not throw');
      
      assert.throws(() => {
        validateParameter({}, 'array', 'testParam');
      }, ValidationError, 'Non-array should throw ValidationError');
      
      // Test function validation
      assert.doesNotThrow(() => {
        validateParameter(() => {}, 'function', 'testParam');
      }, 'Valid function should not throw');
      
      assert.throws(() => {
        validateParameter({}, 'function', 'testParam');
      }, ValidationError, 'Non-function should throw ValidationError');
      
      return true;
    }
  },
  
  {
    id: 'validate_string',
    name: 'Parameter Validation - String Validation',
    type: 'unit',
    tags: ['validation', 'parameters', 'string'],
    priority: 1,
    testFn: async () => {
      // Test basic string validation
      assert.doesNotThrow(() => {
        validateString('test', 'testParam');
      }, 'Valid string should not throw');
      
      assert.throws(() => {
        validateString(123, 'testParam');
      }, ValidationError, 'Non-string should throw ValidationError');
      
      // Test minLength
      assert.doesNotThrow(() => {
        validateString('test', 'testParam', { minLength: 4 });
      }, 'String with valid minLength should not throw');
      
      assert.throws(() => {
        validateString('test', 'testParam', { minLength: 5 });
      }, ValidationError, 'String below minLength should throw ValidationError');
      
      // Test maxLength
      assert.doesNotThrow(() => {
        validateString('test', 'testParam', { maxLength: 4 });
      }, 'String with valid maxLength should not throw');
      
      assert.throws(() => {
        validateString('test', 'testParam', { maxLength: 3 });
      }, ValidationError, 'String above maxLength should throw ValidationError');
      
      // Test pattern
      assert.doesNotThrow(() => {
        validateString('test123', 'testParam', { pattern: /^[a-z]+\d+$/ });
      }, 'String matching pattern should not throw');
      
      assert.throws(() => {
        validateString('123test', 'testParam', { pattern: /^[a-z]+\d+$/ });
      }, ValidationError, 'String not matching pattern should throw ValidationError');
      
      // Test enum
      assert.doesNotThrow(() => {
        validateString('test', 'testParam', { enum: ['test', 'example'] });
      }, 'String in enum should not throw');
      
      assert.throws(() => {
        validateString('invalid', 'testParam', { enum: ['test', 'example'] });
      }, ValidationError, 'String not in enum should throw ValidationError');
      
      return true;
    }
  },
  
  {
    id: 'validate_number',
    name: 'Parameter Validation - Number Validation',
    type: 'unit',
    tags: ['validation', 'parameters', 'number'],
    priority: 1,
    testFn: async () => {
      // Test basic number validation
      assert.doesNotThrow(() => {
        validateNumber(123, 'testParam');
      }, 'Valid number should not throw');
      
      assert.throws(() => {
        validateNumber('123', 'testParam');
      }, ValidationError, 'Non-number should throw ValidationError');
      
      // Test min
      assert.doesNotThrow(() => {
        validateNumber(5, 'testParam', { min: 5 });
      }, 'Number with valid min should not throw');
      
      assert.throws(() => {
        validateNumber(4, 'testParam', { min: 5 });
      }, ValidationError, 'Number below min should throw ValidationError');
      
      // Test max
      assert.doesNotThrow(() => {
        validateNumber(5, 'testParam', { max: 5 });
      }, 'Number with valid max should not throw');
      
      assert.throws(() => {
        validateNumber(6, 'testParam', { max: 5 });
      }, ValidationError, 'Number above max should throw ValidationError');
      
      // Test integer
      assert.doesNotThrow(() => {
        validateNumber(5, 'testParam', { integer: true });
      }, 'Integer should not throw with integer: true');
      
      assert.throws(() => {
        validateNumber(5.5, 'testParam', { integer: true });
      }, ValidationError, 'Float should throw ValidationError with integer: true');
      
      // Test positive
      assert.doesNotThrow(() => {
        validateNumber(5, 'testParam', { positive: true });
      }, 'Positive number should not throw with positive: true');
      
      assert.throws(() => {
        validateNumber(-5, 'testParam', { positive: true });
      }, ValidationError, 'Negative number should throw ValidationError with positive: true');
      
      // Test multiple constraints
      assert.doesNotThrow(() => {
        validateNumber(5, 'testParam', { min: 1, max: 10, integer: true, positive: true });
      }, 'Number meeting all constraints should not throw');
      
      assert.throws(() => {
        validateNumber(5.5, 'testParam', { min: 1, max: 10, integer: true, positive: true });
      }, ValidationError, 'Number not meeting all constraints should throw ValidationError');
      
      return true;
    }
  },
  
  {
    id: 'validate_object',
    name: 'Parameter Validation - Object Validation',
    type: 'unit',
    tags: ['validation', 'parameters', 'object'],
    priority: 1,
    testFn: async () => {
      // Test basic object validation
      assert.doesNotThrow(() => {
        validateObject({}, 'testParam');
      }, 'Valid object should not throw');
      
      assert.throws(() => {
        validateObject(123, 'testParam');
      }, ValidationError, 'Non-object should throw ValidationError');
      
      // Test required properties
      assert.doesNotThrow(() => {
        validateObject({ name: 'test', age: 30 }, 'testParam', { 
          required: ['name', 'age'] 
        });
      }, 'Object with all required properties should not throw');
      
      assert.throws(() => {
        validateObject({ name: 'test' }, 'testParam', { 
          required: ['name', 'age'] 
        });
      }, ValidationError, 'Object missing required property should throw ValidationError');
      
      // Test property types
      assert.doesNotThrow(() => {
        validateObject({ name: 'test', age: 30 }, 'testParam', { 
          properties: {
            name: { type: 'string' },
            age: { type: 'number' }
          }
        });
      }, 'Object with correct property types should not throw');
      
      assert.throws(() => {
        validateObject({ name: 'test', age: '30' }, 'testParam', { 
          properties: {
            name: { type: 'string' },
            age: { type: 'number' }
          }
        });
      }, ValidationError, 'Object with incorrect property type should throw ValidationError');
      
      // Test nested property validation
      assert.doesNotThrow(() => {
        validateObject({ 
          name: 'test', 
          address: { 
            street: '123 Main St', 
            city: 'Anytown' 
          } 
        }, 'testParam', { 
          properties: {
            name: { type: 'string' },
            address: { 
              type: 'object',
              properties: {
                street: { type: 'string' },
                city: { type: 'string' }
              }
            }
          }
        });
      }, 'Object with valid nested properties should not throw');
      
      assert.throws(() => {
        validateObject({ 
          name: 'test', 
          address: { 
            street: '123 Main St', 
            city: 123 // Should be string
          } 
        }, 'testParam', { 
          properties: {
            name: { type: 'string' },
            address: { 
              type: 'object',
              properties: {
                street: { type: 'string' },
                city: { type: 'string' }
              }
            }
          }
        });
      }, ValidationError, 'Object with invalid nested property should throw ValidationError');
      
      return true;
    }
  },
  
  {
    id: 'validate_array',
    name: 'Parameter Validation - Array Validation',
    type: 'unit',
    tags: ['validation', 'parameters', 'array'],
    priority: 1,
    testFn: async () => {
      // Test basic array validation
      assert.doesNotThrow(() => {
        validateArray([], 'testParam');
      }, 'Valid array should not throw');
      
      assert.throws(() => {
        validateArray({}, 'testParam');
      }, ValidationError, 'Non-array should throw ValidationError');
      
      // Test minLength
      assert.doesNotThrow(() => {
        validateArray([1, 2, 3], 'testParam', { minLength: 3 });
      }, 'Array with valid minLength should not throw');
      
      assert.throws(() => {
        validateArray([1, 2], 'testParam', { minLength: 3 });
      }, ValidationError, 'Array below minLength should throw ValidationError');
      
      // Test maxLength
      assert.doesNotThrow(() => {
        validateArray([1, 2, 3], 'testParam', { maxLength: 3 });
      }, 'Array with valid maxLength should not throw');
      
      assert.throws(() => {
        validateArray([1, 2, 3, 4], 'testParam', { maxLength: 3 });
      }, ValidationError, 'Array above maxLength should throw ValidationError');
      
      // Test itemType
      assert.doesNotThrow(() => {
        validateArray(['a', 'b', 'c'], 'testParam', { itemType: 'string' });
      }, 'Array with valid item types should not throw');
      
      assert.throws(() => {
        validateArray(['a', 'b', 3], 'testParam', { itemType: 'string' });
      }, ValidationError, 'Array with invalid item type should throw ValidationError');
      
      // Test itemSchema for objects
      assert.doesNotThrow(() => {
        validateArray([
          { id: 1, name: 'Item 1' },
          { id: 2, name: 'Item 2' }
        ], 'testParam', { 
          itemType: 'object',
          itemSchema: {
            required: ['id', 'name'],
            properties: {
              id: { type: 'number' },
              name: { type: 'string' }
            }
          }
        });
      }, 'Array with valid item schema should not throw');
      
      assert.throws(() => {
        validateArray([
          { id: 1, name: 'Item 1' },
          { id: '2', name: 'Item 2' } // id should be number
        ], 'testParam', { 
          itemType: 'object',
          itemSchema: {
            required: ['id', 'name'],
            properties: {
              id: { type: 'number' },
              name: { type: 'string' }
            }
          }
        });
      }, ValidationError, 'Array with invalid item schema should throw ValidationError');
      
      return true;
    }
  },
  
  {
    id: 'validate_function',
    name: 'Parameter Validation - Function Validation',
    type: 'unit',
    tags: ['validation', 'parameters', 'function'],
    priority: 1,
    testFn: async () => {
      // Test basic function validation
      assert.doesNotThrow(() => {
        validateFunction(() => {}, 'testParam');
      }, 'Valid function should not throw');
      
      assert.throws(() => {
        validateFunction({}, 'testParam');
      }, ValidationError, 'Non-function should throw ValidationError');
      
      // Test async option
      const asyncFn = async () => {};
      const syncFn = () => {};
      
      assert.doesNotThrow(() => {
        validateFunction(asyncFn, 'testParam', { async: true });
      }, 'Async function should not throw with async: true');
      
      assert.doesNotThrow(() => {
        validateFunction(syncFn, 'testParam', { async: false });
      }, 'Sync function should not throw with async: false');
      
      // Note: It's difficult to reliably test if a function is async in JavaScript
      // The best we can do is check if it returns a Promise, but even sync functions
      // can return Promises. This test is more for coverage than actual validation.
      
      return true;
    }
  },
  
  {
    id: 'validate_enum',
    name: 'Parameter Validation - Enum Validation',
    type: 'unit',
    tags: ['validation', 'parameters', 'enum'],
    priority: 1,
    testFn: async () => {
      // Test enum validation with strings
      assert.doesNotThrow(() => {
        validateEnum('apple', 'testParam', ['apple', 'banana', 'orange']);
      }, 'Valid enum value should not throw');
      
      assert.throws(() => {
        validateEnum('grape', 'testParam', ['apple', 'banana', 'orange']);
      }, ValidationError, 'Invalid enum value should throw ValidationError');
      
      // Test enum validation with numbers
      assert.doesNotThrow(() => {
        validateEnum(1, 'testParam', [1, 2, 3]);
      }, 'Valid numeric enum value should not throw');
      
      assert.throws(() => {
        validateEnum(4, 'testParam', [1, 2, 3]);
      }, ValidationError, 'Invalid numeric enum value should throw ValidationError');
      
      // Test enum validation with mixed types
      assert.doesNotThrow(() => {
        validateEnum('1', 'testParam', [1, '1', true]);
      }, 'Valid mixed enum value should not throw');
      
      assert.throws(() => {
        validateEnum(false, 'testParam', [1, '1', true]);
      }, ValidationError, 'Invalid mixed enum value should throw ValidationError');
      
      return true;
    }
  },
  
  {
    id: 'validate_optional',
    name: 'Parameter Validation - Optional Parameters',
    type: 'unit',
    tags: ['validation', 'parameters', 'optional'],
    priority: 1,
    testFn: async () => {
      // Test optional parameter with undefined
      assert.doesNotThrow(() => {
        validateOptional(undefined, 'string', 'testParam');
      }, 'Undefined optional parameter should not throw');
      
      // Test optional parameter with null
      assert.doesNotThrow(() => {
        validateOptional(null, 'string', 'testParam');
      }, 'Null optional parameter should not throw');
      
      // Test optional parameter with valid value
      assert.doesNotThrow(() => {
        validateOptional('test', 'string', 'testParam');
      }, 'Valid optional parameter should not throw');
      
      // Test optional parameter with invalid value
      assert.throws(() => {
        validateOptional(123, 'string', 'testParam');
      }, ValidationError, 'Invalid optional parameter should throw ValidationError');
      
      // Test optional parameter with options
      assert.doesNotThrow(() => {
        validateOptional('test', 'string', 'testParam', { minLength: 4 });
      }, 'Valid optional parameter with options should not throw');
      
      assert.throws(() => {
        validateOptional('test', 'string', 'testParam', { minLength: 5 });
      }, ValidationError, 'Invalid optional parameter with options should throw ValidationError');
      
      return true;
    }
  },
  
  {
    id: 'create_validator',
    name: 'Parameter Validation - Create Validator',
    type: 'unit',
    tags: ['validation', 'parameters', 'factory'],
    priority: 1,
    testFn: async () => {
      // Create a validator for a function
      const validateUserFunction = createValidator({
        name: 'string',
        age: 'number',
        email: { type: 'string', optional: true },
        roles: { 
          type: 'array', 
          itemType: 'string',
          optional: true
        }
      });
      
      // Test with valid parameters
      assert.doesNotThrow(() => {
        validateUserFunction({
          name: 'John Doe',
          age: 30,
          email: 'john@example.com',
          roles: ['admin', 'user']
        });
      }, 'Valid parameters should not throw');
      
      // Test with minimal valid parameters
      assert.doesNotThrow(() => {
        validateUserFunction({
          name: 'John Doe',
          age: 30
        });
      }, 'Minimal valid parameters should not throw');
      
      // Test with invalid parameters
      assert.throws(() => {
        validateUserFunction({
          name: 'John Doe',
          age: '30' // Should be number
        });
      }, ValidationError, 'Invalid parameters should throw ValidationError');
      
      // Test with missing required parameter
      assert.throws(() => {
        validateUserFunction({
          name: 'John Doe'
          // Missing age
        });
      }, ValidationError, 'Missing required parameter should throw ValidationError');
      
      // Create a validator with complex schema
      const validateComplexObject = createValidator({
        id: 'string',
        user: {
          type: 'object',
          properties: {
            name: 'string',
            age: { type: 'number', min: 18 }
          },
          required: ['name', 'age']
        },
        items: {
          type: 'array',
          itemType: 'object',
          itemSchema: {
            properties: {
              id: 'string',
              quantity: { type: 'number', min: 1 }
            },
            required: ['id', 'quantity']
          }
        }
      });
      
      // Test with valid complex object
      assert.doesNotThrow(() => {
        validateComplexObject({
          id: '123',
          user: {
            name: 'John Doe',
            age: 30
          },
          items: [
            { id: 'item1', quantity: 2 },
            { id: 'item2', quantity: 1 }
          ]
        });
      }, 'Valid complex object should not throw');
      
      // Test with invalid complex object
      assert.throws(() => {
        validateComplexObject({
          id: '123',
          user: {
            name: 'John Doe',
            age: 16 // Below minimum
          },
          items: [
            { id: 'item1', quantity: 2 },
            { id: 'item2', quantity: 0 } // Below minimum
          ]
        });
      }, ValidationError, 'Invalid complex object should throw ValidationError');
      
      return true;
    }
  }
];

// For manual testing
if (require.main === module) {
  (async () => {
    for (const test of tests) {
      console.log(`Running test: ${test.name}`);
      try {
        const result = await test.testFn();
        console.log(`Test ${test.name} ${result ? 'PASSED' : 'FAILED'}`);
      } catch (error) {
        console.error(`Test ${test.name} FAILED with error:`, error);
      }
    }
  })();
}

module.exports = { tests }; 