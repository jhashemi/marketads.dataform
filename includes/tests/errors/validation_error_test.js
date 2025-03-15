/**
 * @fileoverview Tests for Validation Error Handler
 * 
 * This file contains tests for the validation error handler functionality.
 */

const assert = require('assert');
const { ValidationErrorHandler } = require('../../errors/validation_error');
const { ValidationError } = require('../../errors/error_types');

/**
 * Test suite for ValidationErrorHandler
 */
const tests = [
  {
    id: 'validation_error_handler_required',
    name: 'Validation Error Handler - Required Fields',
    type: 'unit',
    tags: ['validation', 'error_handling'],
    priority: 1,
    testFn: async () => {
      const validator = new ValidationErrorHandler();
      
      // Test validateRequired with missing value
      try {
        validator.validateRequired(undefined, 'username', 'User');
        assert.fail('validateRequired should throw for undefined values');
      } catch (error) {
        assert(error instanceof ValidationError, 'Error should be a ValidationError');
        assert.strictEqual(error.message, 'User username is required', 'Error message should be formatted correctly');
        assert.strictEqual(error.field, 'username', 'Error field should be set');
        assert.strictEqual(error.constraint, 'required', 'Error constraint should be set');
      }
      
      // Test validateRequired with null value
      try {
        validator.validateRequired(null, 'email', 'User');
        assert.fail('validateRequired should throw for null values');
      } catch (error) {
        assert(error instanceof ValidationError, 'Error should be a ValidationError');
        assert.strictEqual(error.message, 'User email is required', 'Error message should be formatted correctly');
      }
      
      // Test validateRequired with empty string
      try {
        validator.validateRequired('', 'password', 'User');
        assert.fail('validateRequired should throw for empty strings');
      } catch (error) {
        assert(error instanceof ValidationError, 'Error should be a ValidationError');
        assert.strictEqual(error.message, 'User password is required', 'Error message should be formatted correctly');
      }
      
      // Test validateRequired with valid value
      try {
        validator.validateRequired('test', 'username', 'User');
        // Should not throw
      } catch (error) {
        assert.fail('validateRequired should not throw for valid values');
      }
      
      return true;
    }
  },
  
  {
    id: 'validation_error_handler_type',
    name: 'Validation Error Handler - Type Validation',
    type: 'unit',
    tags: ['validation', 'error_handling'],
    priority: 1,
    testFn: async () => {
      const validator = new ValidationErrorHandler();
      
      // Test validateType with string type
      try {
        validator.validateType(123, 'string', 'name', 'User');
        assert.fail('validateType should throw for incorrect types');
      } catch (error) {
        assert(error instanceof ValidationError, 'Error should be a ValidationError');
        assert.strictEqual(error.message, 'User name must be a string', 'Error message should be formatted correctly');
        assert.strictEqual(error.field, 'name', 'Error field should be set');
        assert.strictEqual(error.constraint, 'type', 'Error constraint should be set');
        assert.strictEqual(error.expectedType, 'string', 'Expected type should be set');
        assert.strictEqual(error.actualType, 'number', 'Actual type should be set');
      }
      
      // Test validateType with number type
      try {
        validator.validateType('123', 'number', 'age', 'User');
        assert.fail('validateType should throw for incorrect types');
      } catch (error) {
        assert(error instanceof ValidationError, 'Error should be a ValidationError');
        assert.strictEqual(error.message, 'User age must be a number', 'Error message should be formatted correctly');
      }
      
      // Test validateType with boolean type
      try {
        validator.validateType('true', 'boolean', 'active', 'User');
        assert.fail('validateType should throw for incorrect types');
      } catch (error) {
        assert(error instanceof ValidationError, 'Error should be a ValidationError');
        assert.strictEqual(error.message, 'User active must be a boolean', 'Error message should be formatted correctly');
      }
      
      // Test validateType with object type
      try {
        validator.validateType('{}', 'object', 'settings', 'User');
        assert.fail('validateType should throw for incorrect types');
      } catch (error) {
        assert(error instanceof ValidationError, 'Error should be a ValidationError');
        assert.strictEqual(error.message, 'User settings must be an object', 'Error message should be formatted correctly');
      }
      
      // Test validateType with array type
      try {
        validator.validateType({}, 'array', 'roles', 'User');
        assert.fail('validateType should throw for incorrect types');
      } catch (error) {
        assert(error instanceof ValidationError, 'Error should be a ValidationError');
        assert.strictEqual(error.message, 'User roles must be an array', 'Error message should be formatted correctly');
      }
      
      // Test validateType with valid values
      try {
        validator.validateType('test', 'string', 'name', 'User');
        validator.validateType(123, 'number', 'age', 'User');
        validator.validateType(true, 'boolean', 'active', 'User');
        validator.validateType({}, 'object', 'settings', 'User');
        validator.validateType([], 'array', 'roles', 'User');
        // Should not throw
      } catch (error) {
        assert.fail('validateType should not throw for valid values');
      }
      
      return true;
    }
  },
  
  {
    id: 'validation_error_handler_range',
    name: 'Validation Error Handler - Range Validation',
    type: 'unit',
    tags: ['validation', 'error_handling'],
    priority: 1,
    testFn: async () => {
      const validator = new ValidationErrorHandler();
      
      // Test validateRange with value below min
      try {
        validator.validateRange(5, 10, 100, 'age', 'User');
        assert.fail('validateRange should throw for values below min');
      } catch (error) {
        assert(error instanceof ValidationError, 'Error should be a ValidationError');
        assert.strictEqual(error.message, 'User age must be between 10 and 100', 'Error message should be formatted correctly');
        assert.strictEqual(error.field, 'age', 'Error field should be set');
        assert.strictEqual(error.constraint, 'range', 'Error constraint should be set');
        assert.strictEqual(error.min, 10, 'Min value should be set');
        assert.strictEqual(error.max, 100, 'Max value should be set');
        assert.strictEqual(error.value, 5, 'Actual value should be set');
      }
      
      // Test validateRange with value above max
      try {
        validator.validateRange(150, 10, 100, 'age', 'User');
        assert.fail('validateRange should throw for values above max');
      } catch (error) {
        assert(error instanceof ValidationError, 'Error should be a ValidationError');
        assert.strictEqual(error.message, 'User age must be between 10 and 100', 'Error message should be formatted correctly');
      }
      
      // Test validateRange with valid values
      try {
        validator.validateRange(10, 10, 100, 'age', 'User'); // Min boundary
        validator.validateRange(50, 10, 100, 'age', 'User'); // Middle
        validator.validateRange(100, 10, 100, 'age', 'User'); // Max boundary
        // Should not throw
      } catch (error) {
        assert.fail('validateRange should not throw for valid values');
      }
      
      return true;
    }
  },
  
  {
    id: 'validation_error_handler_length',
    name: 'Validation Error Handler - Length Validation',
    type: 'unit',
    tags: ['validation', 'error_handling'],
    priority: 1,
    testFn: async () => {
      const validator = new ValidationErrorHandler();
      
      // Test validateLength with string too short
      try {
        validator.validateLength('abc', 5, 20, 'password', 'User');
        assert.fail('validateLength should throw for strings that are too short');
      } catch (error) {
        assert(error instanceof ValidationError, 'Error should be a ValidationError');
        assert.strictEqual(error.message, 'User password must be between 5 and 20 characters', 'Error message should be formatted correctly');
        assert.strictEqual(error.field, 'password', 'Error field should be set');
        assert.strictEqual(error.constraint, 'length', 'Error constraint should be set');
        assert.strictEqual(error.minLength, 5, 'Min length should be set');
        assert.strictEqual(error.maxLength, 20, 'Max length should be set');
        assert.strictEqual(error.actualLength, 3, 'Actual length should be set');
      }
      
      // Test validateLength with string too long
      try {
        validator.validateLength('abcdefghijklmnopqrstuvwxyz', 5, 20, 'password', 'User');
        assert.fail('validateLength should throw for strings that are too long');
      } catch (error) {
        assert(error instanceof ValidationError, 'Error should be a ValidationError');
        assert.strictEqual(error.message, 'User password must be between 5 and 20 characters', 'Error message should be formatted correctly');
      }
      
      // Test validateLength with array too short
      try {
        validator.validateLength([1, 2], 3, 10, 'roles', 'User');
        assert.fail('validateLength should throw for arrays that are too short');
      } catch (error) {
        assert(error instanceof ValidationError, 'Error should be a ValidationError');
        assert.strictEqual(error.message, 'User roles must have between 3 and 10 items', 'Error message should be formatted correctly');
      }
      
      // Test validateLength with array too long
      try {
        validator.validateLength([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], 3, 10, 'roles', 'User');
        assert.fail('validateLength should throw for arrays that are too long');
      } catch (error) {
        assert(error instanceof ValidationError, 'Error should be a ValidationError');
        assert.strictEqual(error.message, 'User roles must have between 3 and 10 items', 'Error message should be formatted correctly');
      }
      
      // Test validateLength with valid values
      try {
        validator.validateLength('abcde', 5, 20, 'password', 'User'); // Min boundary
        validator.validateLength('abcdefghij', 5, 20, 'password', 'User'); // Middle
        validator.validateLength('abcdefghijklmnopqrst', 5, 20, 'password', 'User'); // Max boundary
        validator.validateLength([1, 2, 3], 3, 10, 'roles', 'User'); // Min boundary
        validator.validateLength([1, 2, 3, 4, 5], 3, 10, 'roles', 'User'); // Middle
        validator.validateLength([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 3, 10, 'roles', 'User'); // Max boundary
        // Should not throw
      } catch (error) {
        assert.fail('validateLength should not throw for valid values');
      }
      
      return true;
    }
  },
  
  {
    id: 'validation_error_handler_enum',
    name: 'Validation Error Handler - Enum Validation',
    type: 'unit',
    tags: ['validation', 'error_handling'],
    priority: 1,
    testFn: async () => {
      const validator = new ValidationErrorHandler();
      
      // Test validateEnum with invalid value
      try {
        validator.validateEnum('admin', ['user', 'moderator', 'guest'], 'role', 'User');
        assert.fail('validateEnum should throw for values not in the enum');
      } catch (error) {
        assert(error instanceof ValidationError, 'Error should be a ValidationError');
        assert.strictEqual(error.message, 'User role must be one of: user, moderator, guest', 'Error message should be formatted correctly');
        assert.strictEqual(error.field, 'role', 'Error field should be set');
        assert.strictEqual(error.constraint, 'enum', 'Error constraint should be set');
        assert.deepStrictEqual(error.allowedValues, ['user', 'moderator', 'guest'], 'Allowed values should be set');
        assert.strictEqual(error.value, 'admin', 'Actual value should be set');
      }
      
      // Test validateEnum with valid values
      try {
        validator.validateEnum('user', ['user', 'moderator', 'guest'], 'role', 'User');
        validator.validateEnum('moderator', ['user', 'moderator', 'guest'], 'role', 'User');
        validator.validateEnum('guest', ['user', 'moderator', 'guest'], 'role', 'User');
        // Should not throw
      } catch (error) {
        assert.fail('validateEnum should not throw for valid values');
      }
      
      return true;
    }
  },
  
  {
    id: 'validation_error_handler_pattern',
    name: 'Validation Error Handler - Pattern Validation',
    type: 'unit',
    tags: ['validation', 'error_handling'],
    priority: 1,
    testFn: async () => {
      const validator = new ValidationErrorHandler();
      
      // Test validatePattern with invalid value
      try {
        validator.validatePattern('abc123', /^[A-Za-z]+$/, 'name', 'User');
        assert.fail('validatePattern should throw for values that do not match the pattern');
      } catch (error) {
        assert(error instanceof ValidationError, 'Error should be a ValidationError');
        assert.strictEqual(error.message, 'User name has an invalid format', 'Error message should be formatted correctly');
        assert.strictEqual(error.field, 'name', 'Error field should be set');
        assert.strictEqual(error.constraint, 'pattern', 'Error constraint should be set');
        assert.strictEqual(error.value, 'abc123', 'Actual value should be set');
      }
      
      // Test validatePattern with custom message
      try {
        validator.validatePattern('abc123', /^[A-Za-z]+$/, 'name', 'User', 'must contain only letters');
        assert.fail('validatePattern should throw for values that do not match the pattern');
      } catch (error) {
        assert(error instanceof ValidationError, 'Error should be a ValidationError');
        assert.strictEqual(error.message, 'User name must contain only letters', 'Custom error message should be used');
      }
      
      // Test validatePattern with valid values
      try {
        validator.validatePattern('abcdef', /^[A-Za-z]+$/, 'name', 'User');
        // Should not throw
      } catch (error) {
        assert.fail('validatePattern should not throw for valid values');
      }
      
      return true;
    }
  },
  
  {
    id: 'validation_error_handler_array',
    name: 'Validation Error Handler - Array Validation',
    type: 'unit',
    tags: ['validation', 'error_handling'],
    priority: 1,
    testFn: async () => {
      const validator = new ValidationErrorHandler();
      
      // Test validateArray with non-array value
      try {
        validator.validateArray('not an array', 'roles', 'User');
        assert.fail('validateArray should throw for non-array values');
      } catch (error) {
        assert(error instanceof ValidationError, 'Error should be a ValidationError');
        assert.strictEqual(error.message, 'User roles must be an array', 'Error message should be formatted correctly');
        assert.strictEqual(error.field, 'roles', 'Error field should be set');
        assert.strictEqual(error.constraint, 'type', 'Error constraint should be set');
        assert.strictEqual(error.expectedType, 'array', 'Expected type should be set');
        assert.strictEqual(error.actualType, 'string', 'Actual type should be set');
      }
      
      // Test validateArray with item validator that fails
      const itemValidator = (item, index) => {
        if (typeof item !== 'string') {
          throw new ValidationError(`Item at index ${index} must be a string`, {
            field: `roles[${index}]`,
            constraint: 'type',
            expectedType: 'string',
            actualType: typeof item
          });
        }
      };
      
      try {
        validator.validateArray(['user', 123, 'admin'], 'roles', 'User', itemValidator);
        assert.fail('validateArray should throw when item validator fails');
      } catch (error) {
        assert(error instanceof ValidationError, 'Error should be a ValidationError');
        assert.strictEqual(error.message, 'Item at index 1 must be a string', 'Error message should be from item validator');
        assert.strictEqual(error.field, 'roles[1]', 'Error field should include index');
      }
      
      // Test validateArray with valid values
      try {
        validator.validateArray([], 'roles', 'User');
        validator.validateArray(['user', 'admin'], 'roles', 'User');
        validator.validateArray(['user', 'admin'], 'roles', 'User', (item) => {
          if (typeof item !== 'string') {
            throw new ValidationError('Item must be a string');
          }
        });
        // Should not throw
      } catch (error) {
        assert.fail('validateArray should not throw for valid values');
      }
      
      return true;
    }
  },
  
  {
    id: 'validation_error_handler_object',
    name: 'Validation Error Handler - Object Validation',
    type: 'unit',
    tags: ['validation', 'error_handling'],
    priority: 1,
    testFn: async () => {
      const validator = new ValidationErrorHandler();
      
      // Test validateObject with non-object value
      try {
        validator.validateObject('not an object', 'settings', 'User');
        assert.fail('validateObject should throw for non-object values');
      } catch (error) {
        assert(error instanceof ValidationError, 'Error should be a ValidationError');
        assert.strictEqual(error.message, 'User settings must be an object', 'Error message should be formatted correctly');
        assert.strictEqual(error.field, 'settings', 'Error field should be set');
        assert.strictEqual(error.constraint, 'type', 'Error constraint should be set');
        assert.strictEqual(error.expectedType, 'object', 'Expected type should be set');
        assert.strictEqual(error.actualType, 'string', 'Actual type should be set');
      }
      
      // Test validateObject with property validator that fails
      const propertyValidator = (obj) => {
        if (!obj.hasOwnProperty('theme')) {
          throw new ValidationError('Settings must include a theme', {
            field: 'settings.theme',
            constraint: 'required'
          });
        }
        
        if (typeof obj.theme !== 'string') {
          throw new ValidationError('Theme must be a string', {
            field: 'settings.theme',
            constraint: 'type',
            expectedType: 'string',
            actualType: typeof obj.theme
          });
        }
      };
      
      try {
        validator.validateObject({}, 'settings', 'User', propertyValidator);
        assert.fail('validateObject should throw when property validator fails');
      } catch (error) {
        assert(error instanceof ValidationError, 'Error should be a ValidationError');
        assert.strictEqual(error.message, 'Settings must include a theme', 'Error message should be from property validator');
        assert.strictEqual(error.field, 'settings.theme', 'Error field should include property path');
      }
      
      try {
        validator.validateObject({ theme: 123 }, 'settings', 'User', propertyValidator);
        assert.fail('validateObject should throw when property validator fails');
      } catch (error) {
        assert(error instanceof ValidationError, 'Error should be a ValidationError');
        assert.strictEqual(error.message, 'Theme must be a string', 'Error message should be from property validator');
        assert.strictEqual(error.field, 'settings.theme', 'Error field should include property path');
      }
      
      // Test validateObject with valid values
      try {
        validator.validateObject({}, 'settings', 'User');
        validator.validateObject({ theme: 'dark' }, 'settings', 'User');
        validator.validateObject({ theme: 'dark' }, 'settings', 'User', propertyValidator);
        // Should not throw
      } catch (error) {
        assert.fail('validateObject should not throw for valid values');
      }
      
      return true;
    }
  },
  
  {
    id: 'validation_error_handler_create_error',
    name: 'Validation Error Handler - Create Error',
    type: 'unit',
    tags: ['validation', 'error_handling'],
    priority: 1,
    testFn: async () => {
      const validator = new ValidationErrorHandler();
      
      // Test createValidationError with basic message
      const error1 = validator.createValidationError('Invalid input');
      assert(error1 instanceof ValidationError, 'Error should be a ValidationError');
      assert.strictEqual(error1.message, 'Invalid input', 'Error message should be set');
      
      // Test createValidationError with details
      const error2 = validator.createValidationError('Invalid age', {
        field: 'age',
        constraint: 'range',
        min: 18,
        max: 65,
        value: 16
      });
      assert(error2 instanceof ValidationError, 'Error should be a ValidationError');
      assert.strictEqual(error2.message, 'Invalid age', 'Error message should be set');
      assert.strictEqual(error2.field, 'age', 'Error field should be set');
      assert.strictEqual(error2.constraint, 'range', 'Error constraint should be set');
      assert.strictEqual(error2.min, 18, 'Min value should be set');
      assert.strictEqual(error2.max, 65, 'Max value should be set');
      assert.strictEqual(error2.value, 16, 'Actual value should be set');
      
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