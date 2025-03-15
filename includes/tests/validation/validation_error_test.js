/**
 * @fileoverview Tests for Validation Error
 * 
 * This file contains tests for the validation error functionality.
 */

const assert = require('assert');
const { ValidationError } = require('../../errors/validation_error');
const { MarketAdsError } = require('../../errors/error_types');

/**
 * Test suite for ValidationError
 */
const tests = [
  {
    id: 'validation_error_creation',
    name: 'Validation Error - Basic Creation',
    type: 'unit',
    tags: ['validation', 'error'],
    priority: 1,
    testFn: async () => {
      // Create a basic validation error
      const error = new ValidationError('Invalid input');
      
      // Verify error properties
      assert.strictEqual(error.name, 'ValidationError', 'Error name should be ValidationError');
      assert.strictEqual(error.message, 'Invalid input', 'Error message should be preserved');
      assert.strictEqual(error.code, 'VALIDATION_ERROR', 'Default code should be VALIDATION_ERROR');
      assert.strictEqual(error.severity, 'WARNING', 'Default severity should be WARNING');
      assert(error instanceof MarketAdsError, 'ValidationError should inherit from MarketAdsError');
      assert(error.stack, 'Error should have a stack trace');
      
      return true;
    }
  },
  
  {
    id: 'validation_error_with_field',
    name: 'Validation Error - Field Information',
    type: 'unit',
    tags: ['validation', 'error'],
    priority: 1,
    testFn: async () => {
      // Create a validation error with field information
      const error = new ValidationError('Invalid email format', {
        field: 'email',
        value: 'not-an-email',
        constraint: 'format'
      });
      
      // Verify field properties
      assert.strictEqual(error.field, 'email', 'Field name should be set');
      assert.strictEqual(error.value, 'not-an-email', 'Field value should be set');
      assert.strictEqual(error.constraint, 'format', 'Constraint should be set');
      
      // Create a validation error with nested field
      const nestedError = new ValidationError('Invalid city', {
        field: 'address.city',
        value: '',
        constraint: 'required'
      });
      
      // Verify nested field properties
      assert.strictEqual(nestedError.field, 'address.city', 'Nested field name should be preserved');
      assert.strictEqual(nestedError.value, '', 'Field value should be set');
      assert.strictEqual(nestedError.constraint, 'required', 'Constraint should be set');
      
      // Create a validation error with array field
      const arrayError = new ValidationError('Invalid item', {
        field: 'items[2].name',
        value: '',
        constraint: 'required'
      });
      
      // Verify array field properties
      assert.strictEqual(arrayError.field, 'items[2].name', 'Array field name should be preserved');
      assert.strictEqual(arrayError.value, '', 'Field value should be set');
      assert.strictEqual(arrayError.constraint, 'required', 'Constraint should be set');
      
      return true;
    }
  },
  
  {
    id: 'validation_error_with_custom_code',
    name: 'Validation Error - Custom Error Code',
    type: 'unit',
    tags: ['validation', 'error'],
    priority: 1,
    testFn: async () => {
      // Create a validation error with custom code
      const error = new ValidationError('Password too weak', {
        field: 'password',
        code: 'PASSWORD_STRENGTH_ERROR',
        constraint: 'strength'
      });
      
      // Verify custom code
      assert.strictEqual(error.code, 'PASSWORD_STRENGTH_ERROR', 'Custom code should be used');
      
      return true;
    }
  },
  
  {
    id: 'validation_error_with_custom_severity',
    name: 'Validation Error - Custom Severity',
    type: 'unit',
    tags: ['validation', 'error'],
    priority: 1,
    testFn: async () => {
      // Create a validation error with custom severity
      const error = new ValidationError('Critical validation failure', {
        severity: 'ERROR'
      });
      
      // Verify custom severity
      assert.strictEqual(error.severity, 'ERROR', 'Custom severity should be used');
      
      return true;
    }
  },
  
  {
    id: 'validation_error_to_json',
    name: 'Validation Error - JSON Serialization',
    type: 'unit',
    tags: ['validation', 'error'],
    priority: 1,
    testFn: async () => {
      // Create a validation error with all properties
      const error = new ValidationError('Invalid input', {
        field: 'email',
        value: 'not-an-email',
        constraint: 'format',
        code: 'EMAIL_FORMAT_ERROR',
        component: 'user-registration',
        context: { userId: '123' }
      });
      
      // Convert to JSON
      const json = error.toJSON();
      
      // Verify JSON properties
      assert.strictEqual(json.name, 'ValidationError', 'JSON should include name');
      assert.strictEqual(json.message, 'Invalid input', 'JSON should include message');
      assert.strictEqual(json.code, 'EMAIL_FORMAT_ERROR', 'JSON should include code');
      assert.strictEqual(json.field, 'email', 'JSON should include field');
      assert.strictEqual(json.value, 'not-an-email', 'JSON should include value');
      assert.strictEqual(json.constraint, 'format', 'JSON should include constraint');
      assert.strictEqual(json.component, 'user-registration', 'JSON should include component');
      assert.deepStrictEqual(json.context, { userId: '123' }, 'JSON should include context');
      assert(json.timestamp, 'JSON should include timestamp');
      assert(json.stack, 'JSON should include stack');
      
      return true;
    }
  },
  
  {
    id: 'validation_error_format_message',
    name: 'Validation Error - Message Formatting',
    type: 'unit',
    tags: ['validation', 'error'],
    priority: 1,
    testFn: async () => {
      // Create a validation error
      const error = new ValidationError('Invalid input', {
        field: 'email',
        value: 'not-an-email',
        constraint: 'format'
      });
      
      // Get formatted message
      const formatted = error.formatMessage();
      
      // Verify formatted message
      assert(formatted.includes('email'), 'Formatted message should include field name');
      assert(formatted.includes('not-an-email'), 'Formatted message should include field value');
      assert(formatted.includes('format'), 'Formatted message should include constraint');
      
      // Create a validation error with custom message formatter
      const customError = new ValidationError('Invalid input', {
        field: 'email',
        value: 'not-an-email',
        constraint: 'format',
        messageFormatter: (err) => `Custom format: ${err.field} failed ${err.constraint} check with value "${err.value}"`
      });
      
      // Get custom formatted message
      const customFormatted = customError.formatMessage();
      
      // Verify custom formatted message
      assert.strictEqual(
        customFormatted,
        'Custom format: email failed format check with value "not-an-email"',
        'Custom message formatter should be used'
      );
      
      return true;
    }
  },
  
  {
    id: 'validation_error_from_validation_result',
    name: 'Validation Error - From Validation Result',
    type: 'unit',
    tags: ['validation', 'error'],
    priority: 1,
    testFn: async () => {
      // Create a validation result (similar to what would come from a schema validation)
      const validationResult = {
        valid: false,
        errors: [
          {
            field: 'email',
            value: 'not-an-email',
            constraint: 'format',
            message: 'Invalid email format'
          },
          {
            field: 'password',
            value: 'weak',
            constraint: 'strength',
            message: 'Password too weak'
          }
        ]
      };
      
      // Create validation errors from result
      const errors = ValidationError.fromValidationResult(validationResult);
      
      // Verify errors
      assert.strictEqual(errors.length, 2, 'Should create two errors');
      assert(errors[0] instanceof ValidationError, 'Should create ValidationError instances');
      assert.strictEqual(errors[0].field, 'email', 'First error should have correct field');
      assert.strictEqual(errors[0].constraint, 'format', 'First error should have correct constraint');
      assert.strictEqual(errors[0].message, 'Invalid email format', 'First error should have correct message');
      assert.strictEqual(errors[1].field, 'password', 'Second error should have correct field');
      
      return true;
    }
  },
  
  {
    id: 'validation_error_with_cause',
    name: 'Validation Error - With Cause',
    type: 'unit',
    tags: ['validation', 'error'],
    priority: 1,
    testFn: async () => {
      // Create an original error
      const originalError = new Error('Original error');
      
      // Create a validation error with cause
      const error = new ValidationError('Validation failed', {
        cause: originalError
      });
      
      // Verify cause
      assert.strictEqual(error.cause, originalError, 'Cause should be set');
      
      // Verify JSON includes cause
      const json = error.toJSON();
      assert(json.cause, 'JSON should include cause');
      
      return true;
    }
  },
  
  {
    id: 'validation_error_with_custom_properties',
    name: 'Validation Error - Custom Properties',
    type: 'unit',
    tags: ['validation', 'error'],
    priority: 1,
    testFn: async () => {
      // Create a validation error with custom properties
      const error = new ValidationError('Validation failed', {
        field: 'password',
        constraint: 'strength',
        customProp1: 'custom value 1',
        customProp2: 'custom value 2'
      });
      
      // Verify custom properties
      assert.strictEqual(error.customProp1, 'custom value 1', 'Custom property 1 should be set');
      assert.strictEqual(error.customProp2, 'custom value 2', 'Custom property 2 should be set');
      
      // Verify JSON includes custom properties
      const json = error.toJSON();
      assert.strictEqual(json.customProp1, 'custom value 1', 'JSON should include custom property 1');
      assert.strictEqual(json.customProp2, 'custom value 2', 'JSON should include custom property 2');
      
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