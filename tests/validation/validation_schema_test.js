/**
 * @fileoverview Tests for validation schema
 */

const assert = require('assert');
const { validateSchema } = require('../../includes/validation/validation_schema');
const { ValidationError } = require('../../includes/errors/validation_error');

/**
 * Test suite for validation schema
 */
const tests = [
  {
    id: 'validation_schema_required_fields',
    name: 'Validation Schema - Required Fields',
    type: 'unit',
    tags: ['validation', 'validation_schema'],
    priority: 1,
    testFn: async () => {
      // Define a test schema with required fields
      const testSchema = {
        name: {
          type: 'string',
          required: true
        },
        age: {
          type: 'number',
          required: true
        },
        address: {
          type: 'object',
          required: false
        }
      };
      
      // Test validation with missing required fields
      const missingFieldsResult = validateSchema({
        address: { street: '123 Main St' }
      }, testSchema);
      
      assert.strictEqual(missingFieldsResult.success, false, 'Should fail with missing required fields');
      assert.ok(missingFieldsResult.errors.length >= 2, 'Should have at least 2 errors');
      
      // Test validation with all required fields
      const validFieldsResult = validateSchema({
        name: 'John Doe',
        age: 30,
        address: { street: '123 Main St' }
      }, testSchema);
      
      assert.strictEqual(validFieldsResult.success, true, 'Should succeed with all required fields');
      assert.strictEqual(validFieldsResult.errors.length, 0, 'Should have no errors');
      
      return true;
    }
  },
  {
    id: 'validation_schema_type_validation',
    name: 'Validation Schema - Type Validation',
    type: 'unit',
    tags: ['validation', 'validation_schema'],
    priority: 1,
    testFn: async () => {
      // Define a test schema with various types
      const testSchema = {
        name: {
          type: 'string'
        },
        age: {
          type: 'number'
        },
        isActive: {
          type: 'boolean'
        },
        tags: {
          type: 'array'
        },
        config: {
          type: 'object'
        }
      };
      
      // Test validation with correct types
      const validTypesResult = validateSchema({
        name: 'John Doe',
        age: 30,
        isActive: true,
        tags: ['user', 'admin'],
        config: { theme: 'dark' }
      }, testSchema);
      
      assert.strictEqual(validTypesResult.success, true, 'Should succeed with correct types');
      
      // Test validation with incorrect types
      const invalidTypesResult = validateSchema({
        name: 123,
        age: 'thirty',
        isActive: 'yes',
        tags: 'user,admin',
        config: 'dark mode'
      }, testSchema);
      
      assert.strictEqual(invalidTypesResult.success, false, 'Should fail with incorrect types');
      assert.ok(invalidTypesResult.errors.length >= 5, 'Should have at least 5 errors');
      
      return true;
    }
  },
  {
    id: 'validation_schema_string_constraints',
    name: 'Validation Schema - String Constraints',
    type: 'unit',
    tags: ['validation', 'validation_schema'],
    priority: 1,
    testFn: async () => {
      // Define a test schema with string constraints
      const testSchema = {
        username: {
          type: 'string',
          minLength: 3,
          maxLength: 20,
          pattern: '^[a-zA-Z0-9_]+$'
        },
        role: {
          type: 'string',
          enum: ['admin', 'user', 'guest']
        }
      };
      
      // Test validation with valid strings
      const validStringsResult = validateSchema({
        username: 'john_doe123',
        role: 'admin'
      }, testSchema);
      
      assert.strictEqual(validStringsResult.success, true, 'Should succeed with valid strings');
      
      // Test validation with invalid strings
      const invalidStringsResult = validateSchema({
        username: 'j@',
        role: 'superuser'
      }, testSchema);
      
      assert.strictEqual(invalidStringsResult.success, false, 'Should fail with invalid strings');
      assert.ok(invalidStringsResult.errors.some(e => e.path === 'username' && e.message.includes('at least')), 
        'Should have min length error');
      assert.ok(invalidStringsResult.errors.some(e => e.path === 'username' && e.message.includes('pattern')), 
        'Should have pattern error');
      assert.ok(invalidStringsResult.errors.some(e => e.path === 'role' && e.message.includes('one of')), 
        'Should have enum error');
      
      return true;
    }
  },
  {
    id: 'validation_schema_number_constraints',
    name: 'Validation Schema - Number Constraints',
    type: 'unit',
    tags: ['validation', 'validation_schema'],
    priority: 1,
    testFn: async () => {
      // Define a test schema with number constraints
      const testSchema = {
        age: {
          type: 'number',
          min: 18,
          max: 65,
          integer: true
        },
        score: {
          type: 'number',
          min: 0,
          max: 1
        }
      };
      
      // Test validation with valid numbers
      const validNumbersResult = validateSchema({
        age: 30,
        score: 0.85
      }, testSchema);
      
      assert.strictEqual(validNumbersResult.success, true, 'Should succeed with valid numbers');
      
      // Test validation with invalid numbers
      const invalidNumbersResult = validateSchema({
        age: 16.5,
        score: 1.5
      }, testSchema);
      
      assert.strictEqual(invalidNumbersResult.success, false, 'Should fail with invalid numbers');
      assert.ok(invalidNumbersResult.errors.some(e => e.path === 'age' && e.message.includes('at least')), 
        'Should have min value error');
      assert.ok(invalidNumbersResult.errors.some(e => e.path === 'age' && e.message.includes('integer')), 
        'Should have integer error');
      assert.ok(invalidNumbersResult.errors.some(e => e.path === 'score' && e.message.includes('at most')), 
        'Should have max value error');
      
      return true;
    }
  },
  {
    id: 'validation_schema_array_constraints',
    name: 'Validation Schema - Array Constraints',
    type: 'unit',
    tags: ['validation', 'validation_schema'],
    priority: 1,
    testFn: async () => {
      // Define a test schema with array constraints
      const testSchema = {
        tags: {
          type: 'array',
          minItems: 1,
          maxItems: 5,
          itemType: 'string',
          uniqueItems: true
        }
      };
      
      // Test validation with valid array
      const validArrayResult = validateSchema({
        tags: ['user', 'admin', 'developer']
      }, testSchema);
      
      assert.strictEqual(validArrayResult.success, true, 'Should succeed with valid array');
      
      // Test validation with invalid array
      const invalidArrayResult = validateSchema({
        tags: ['user', 'user', 123, null, true, {}, []]
      }, testSchema);
      
      assert.strictEqual(invalidArrayResult.success, false, 'Should fail with invalid array');
      assert.ok(invalidArrayResult.errors.some(e => e.path === 'tags' && e.message.includes('unique')), 
        'Should have unique items error');
      assert.ok(invalidArrayResult.errors.some(e => e.message.includes('must be of type string')), 
        'Should have item type error');
      assert.ok(invalidArrayResult.errors.some(e => e.path === 'tags' && e.message.includes('at most')), 
        'Should have max items error');
      
      return true;
    }
  },
  {
    id: 'validation_schema_object_constraints',
    name: 'Validation Schema - Object Constraints',
    type: 'unit',
    tags: ['validation', 'validation_schema'],
    priority: 1,
    testFn: async () => {
      // Define a test schema with object constraints
      const testSchema = {
        user: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              required: true
            },
            email: {
              type: 'string',
              required: true
            },
            settings: {
              type: 'object',
              properties: {
                theme: {
                  type: 'string',
                  enum: ['light', 'dark']
                }
              }
            }
          }
        }
      };
      
      // Test validation with valid object
      const validObjectResult = validateSchema({
        user: {
          name: 'John Doe',
          email: 'john@example.com',
          settings: {
            theme: 'dark'
          }
        }
      }, testSchema);
      
      assert.strictEqual(validObjectResult.success, true, 'Should succeed with valid object');
      
      // Test validation with invalid object
      const invalidObjectResult = validateSchema({
        user: {
          name: 'John Doe',
          settings: {
            theme: 'blue'
          }
        }
      }, testSchema);
      
      assert.strictEqual(invalidObjectResult.success, false, 'Should fail with invalid object');
      assert.ok(invalidObjectResult.errors.some(e => e.path.includes('email') && e.message.includes('required')), 
        'Should have required field error');
      assert.ok(invalidObjectResult.errors.some(e => e.path.includes('theme') && e.message.includes('one of')), 
        'Should have enum error in nested object');
      
      return true;
    }
  },
  {
    id: 'validation_schema_custom_validators',
    name: 'Validation Schema - Custom Validators',
    type: 'unit',
    tags: ['validation', 'validation_schema'],
    priority: 2,
    testFn: async () => {
      // Define a test schema with custom validator
      const testSchema = {
        password: {
          type: 'string',
          validate: (value) => {
            if (!/[A-Z]/.test(value)) {
              throw new Error('Password must contain at least one uppercase letter');
            }
            if (!/[0-9]/.test(value)) {
              throw new Error('Password must contain at least one number');
            }
            if (value.length < 8) {
              throw new Error('Password must be at least 8 characters long');
            }
          }
        },
        confirmPassword: {
          type: 'string',
          validate: (value, allValues) => {
            if (value !== allValues.password) {
              throw new Error('Passwords do not match');
            }
          }
        }
      };
      
      // Test validation with valid passwords
      const validPasswordResult = validateSchema({
        password: 'Password123',
        confirmPassword: 'Password123'
      }, testSchema);
      
      assert.strictEqual(validPasswordResult.success, true, 'Should succeed with valid passwords');
      
      // Test validation with invalid passwords
      const invalidPasswordResult = validateSchema({
        password: 'password',
        confirmPassword: 'password123'
      }, testSchema);
      
      assert.strictEqual(invalidPasswordResult.success, false, 'Should fail with invalid passwords');
      assert.ok(invalidPasswordResult.errors.some(e => e.path === 'password' && e.message.includes('uppercase')), 
        'Should have uppercase error');
      assert.ok(invalidPasswordResult.errors.some(e => e.path === 'password' && e.message.includes('number')), 
        'Should have number error');
      assert.ok(invalidPasswordResult.errors.some(e => e.path === 'confirmPassword' && e.message.includes('match')), 
        'Should have password match error');
      
      return true;
    }
  }
];

module.exports = { tests }; 