/**
 * @fileoverview Tests for Validation Schema
 * 
 * This file contains tests for the validation schema functionality.
 */

const assert = require('assert');
const { 
  ValidationSchema, 
  FieldType, 
  ValidationRule 
} = require('../../validation/validation_schema');
const { ValidationError } = require('../../errors/validation_error');

/**
 * Test suite for ValidationSchema
 */
const tests = [
  {
    id: 'validation_schema_creation',
    name: 'Validation Schema - Basic Creation',
    type: 'unit',
    tags: ['validation', 'schema'],
    priority: 1,
    testFn: async () => {
      // Create a simple validation schema
      const schema = new ValidationSchema({
        name: 'UserSchema',
        fields: {
          id: { type: FieldType.STRING, required: true },
          email: { type: FieldType.EMAIL, required: true },
          age: { type: FieldType.NUMBER, min: 18, max: 120 },
          role: { type: FieldType.STRING, enum: ['admin', 'user', 'guest'] }
        }
      });
      
      // Verify schema properties
      assert.strictEqual(schema.name, 'UserSchema', 'Schema name should be set');
      assert(schema.fields.id, 'Schema should have id field');
      assert(schema.fields.email, 'Schema should have email field');
      assert(schema.fields.age, 'Schema should have age field');
      assert(schema.fields.role, 'Schema should have role field');
      
      // Verify field properties
      assert.strictEqual(schema.fields.id.type, FieldType.STRING, 'id field should be STRING type');
      assert.strictEqual(schema.fields.id.required, true, 'id field should be required');
      assert.strictEqual(schema.fields.email.type, FieldType.EMAIL, 'email field should be EMAIL type');
      assert.strictEqual(schema.fields.age.min, 18, 'age field should have min value');
      assert.strictEqual(schema.fields.age.max, 120, 'age field should have max value');
      assert.deepStrictEqual(schema.fields.role.enum, ['admin', 'user', 'guest'], 'role field should have enum values');
      
      return true;
    }
  },
  
  {
    id: 'validation_schema_validate_success',
    name: 'Validation Schema - Successful Validation',
    type: 'unit',
    tags: ['validation', 'schema'],
    priority: 1,
    testFn: async () => {
      // Create a validation schema
      const schema = new ValidationSchema({
        name: 'UserSchema',
        fields: {
          id: { type: FieldType.STRING, required: true },
          email: { type: FieldType.EMAIL, required: true },
          age: { type: FieldType.NUMBER, min: 18, max: 120 },
          role: { type: FieldType.STRING, enum: ['admin', 'user', 'guest'] }
        }
      });
      
      // Valid data
      const validData = {
        id: 'user123',
        email: 'user@example.com',
        age: 30,
        role: 'admin'
      };
      
      // Validate data
      const result = schema.validate(validData);
      
      // Verify validation result
      assert.strictEqual(result.valid, true, 'Validation should succeed');
      assert.strictEqual(result.errors.length, 0, 'There should be no validation errors');
      
      // Validate with extra fields (should ignore them by default)
      const dataWithExtraFields = {
        ...validData,
        extraField: 'extra value'
      };
      
      const resultWithExtra = schema.validate(dataWithExtraFields);
      assert.strictEqual(resultWithExtra.valid, true, 'Validation should succeed with extra fields');
      
      return true;
    }
  },
  
  {
    id: 'validation_schema_validate_failure',
    name: 'Validation Schema - Validation Failures',
    type: 'unit',
    tags: ['validation', 'schema'],
    priority: 1,
    testFn: async () => {
      // Create a validation schema
      const schema = new ValidationSchema({
        name: 'UserSchema',
        fields: {
          id: { type: FieldType.STRING, required: true },
          email: { type: FieldType.EMAIL, required: true },
          age: { type: FieldType.NUMBER, min: 18, max: 120 },
          role: { type: FieldType.STRING, enum: ['admin', 'user', 'guest'] }
        }
      });
      
      // Missing required fields
      const missingRequiredData = {
        id: 'user123',
        // email is missing
        age: 30,
        role: 'admin'
      };
      
      // Validate data
      const missingResult = schema.validate(missingRequiredData);
      
      // Verify validation result
      assert.strictEqual(missingResult.valid, false, 'Validation should fail with missing required field');
      assert.strictEqual(missingResult.errors.length, 1, 'There should be one validation error');
      assert.strictEqual(missingResult.errors[0].field, 'email', 'Error should be for email field');
      assert.strictEqual(missingResult.errors[0].constraint, 'required', 'Error should be for required constraint');
      
      // Invalid field types
      const invalidTypeData = {
        id: 'user123',
        email: 'user@example.com',
        age: 'thirty', // Should be a number
        role: 'admin'
      };
      
      const typeResult = schema.validate(invalidTypeData);
      assert.strictEqual(typeResult.valid, false, 'Validation should fail with invalid field type');
      assert.strictEqual(typeResult.errors.length, 1, 'There should be one validation error');
      assert.strictEqual(typeResult.errors[0].field, 'age', 'Error should be for age field');
      assert.strictEqual(typeResult.errors[0].constraint, 'type', 'Error should be for type constraint');
      
      // Value out of range
      const outOfRangeData = {
        id: 'user123',
        email: 'user@example.com',
        age: 15, // Below minimum
        role: 'admin'
      };
      
      const rangeResult = schema.validate(outOfRangeData);
      assert.strictEqual(rangeResult.valid, false, 'Validation should fail with value out of range');
      assert.strictEqual(rangeResult.errors.length, 1, 'There should be one validation error');
      assert.strictEqual(rangeResult.errors[0].field, 'age', 'Error should be for age field');
      assert.strictEqual(rangeResult.errors[0].constraint, 'min', 'Error should be for min constraint');
      
      // Invalid enum value
      const invalidEnumData = {
        id: 'user123',
        email: 'user@example.com',
        age: 30,
        role: 'superadmin' // Not in enum
      };
      
      const enumResult = schema.validate(invalidEnumData);
      assert.strictEqual(enumResult.valid, false, 'Validation should fail with invalid enum value');
      assert.strictEqual(enumResult.errors.length, 1, 'There should be one validation error');
      assert.strictEqual(enumResult.errors[0].field, 'role', 'Error should be for role field');
      assert.strictEqual(enumResult.errors[0].constraint, 'enum', 'Error should be for enum constraint');
      
      // Multiple errors
      const multipleErrorsData = {
        // id is missing
        email: 'not-an-email',
        age: 150, // Above maximum
        role: 'unknown' // Not in enum
      };
      
      const multipleResult = schema.validate(multipleErrorsData);
      assert.strictEqual(multipleResult.valid, false, 'Validation should fail with multiple errors');
      assert.strictEqual(multipleResult.errors.length, 4, 'There should be four validation errors');
      
      return true;
    }
  },
  
  {
    id: 'validation_schema_strict_mode',
    name: 'Validation Schema - Strict Mode',
    type: 'unit',
    tags: ['validation', 'schema'],
    priority: 1,
    testFn: async () => {
      // Create a validation schema with strict mode
      const schema = new ValidationSchema({
        name: 'UserSchema',
        fields: {
          id: { type: FieldType.STRING, required: true },
          email: { type: FieldType.EMAIL, required: true }
        },
        strict: true // Reject unknown fields
      });
      
      // Valid data
      const validData = {
        id: 'user123',
        email: 'user@example.com'
      };
      
      // Validate data
      const result = schema.validate(validData);
      
      // Verify validation result
      assert.strictEqual(result.valid, true, 'Validation should succeed with valid data');
      
      // Data with extra fields
      const dataWithExtraFields = {
        ...validData,
        extraField: 'extra value'
      };
      
      // Validate data with extra fields
      const extraResult = schema.validate(dataWithExtraFields);
      
      // Verify validation result
      assert.strictEqual(extraResult.valid, false, 'Validation should fail with extra fields in strict mode');
      assert.strictEqual(extraResult.errors.length, 1, 'There should be one validation error');
      assert.strictEqual(extraResult.errors[0].field, 'extraField', 'Error should be for extraField');
      assert.strictEqual(extraResult.errors[0].constraint, 'unknown', 'Error should be for unknown constraint');
      
      return true;
    }
  },
  
  {
    id: 'validation_schema_custom_rules',
    name: 'Validation Schema - Custom Validation Rules',
    type: 'unit',
    tags: ['validation', 'schema'],
    priority: 1,
    testFn: async () => {
      // Create a custom validation rule
      const passwordRule = new ValidationRule({
        name: 'password',
        validate: (value, options) => {
          if (typeof value !== 'string') {
            return { valid: false, message: 'Password must be a string' };
          }
          
          const hasUppercase = /[A-Z]/.test(value);
          const hasLowercase = /[a-z]/.test(value);
          const hasNumber = /[0-9]/.test(value);
          const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value);
          const isLongEnough = value.length >= (options.minLength || 8);
          
          if (hasUppercase && hasLowercase && hasNumber && hasSpecial && isLongEnough) {
            return { valid: true };
          }
          
          return { 
            valid: false, 
            message: 'Password must contain uppercase, lowercase, number, special character, and be at least 8 characters long' 
          };
        }
      });
      
      // Create a validation schema with custom rule
      const schema = new ValidationSchema({
        name: 'UserSchema',
        fields: {
          username: { type: FieldType.STRING, required: true },
          password: { type: FieldType.STRING, required: true, rules: [{ rule: passwordRule, minLength: 8 }] }
        }
      });
      
      // Valid data
      const validData = {
        username: 'user123',
        password: 'P@ssw0rd123'
      };
      
      // Validate data
      const result = schema.validate(validData);
      
      // Verify validation result
      assert.strictEqual(result.valid, true, 'Validation should succeed with valid password');
      
      // Invalid password
      const invalidPasswordData = {
        username: 'user123',
        password: 'password' // Missing uppercase, number, and special character
      };
      
      // Validate data with invalid password
      const invalidResult = schema.validate(invalidPasswordData);
      
      // Verify validation result
      assert.strictEqual(invalidResult.valid, false, 'Validation should fail with invalid password');
      assert.strictEqual(invalidResult.errors.length, 1, 'There should be one validation error');
      assert.strictEqual(invalidResult.errors[0].field, 'password', 'Error should be for password field');
      assert.strictEqual(invalidResult.errors[0].constraint, 'password', 'Error should be for password constraint');
      
      return true;
    }
  },
  
  {
    id: 'validation_schema_nested_objects',
    name: 'Validation Schema - Nested Objects',
    type: 'unit',
    tags: ['validation', 'schema'],
    priority: 1,
    testFn: async () => {
      // Create a nested validation schema
      const addressSchema = new ValidationSchema({
        name: 'AddressSchema',
        fields: {
          street: { type: FieldType.STRING, required: true },
          city: { type: FieldType.STRING, required: true },
          zipCode: { type: FieldType.STRING, pattern: /^\d{5}(-\d{4})?$/ }
        }
      });
      
      const userSchema = new ValidationSchema({
        name: 'UserSchema',
        fields: {
          id: { type: FieldType.STRING, required: true },
          name: { type: FieldType.STRING, required: true },
          address: { type: FieldType.OBJECT, schema: addressSchema }
        }
      });
      
      // Valid data
      const validData = {
        id: 'user123',
        name: 'John Doe',
        address: {
          street: '123 Main St',
          city: 'Anytown',
          zipCode: '12345'
        }
      };
      
      // Validate data
      const result = userSchema.validate(validData);
      
      // Verify validation result
      assert.strictEqual(result.valid, true, 'Validation should succeed with valid nested object');
      
      // Invalid nested object
      const invalidNestedData = {
        id: 'user123',
        name: 'John Doe',
        address: {
          street: '123 Main St',
          // city is missing
          zipCode: 'invalid' // Invalid format
        }
      };
      
      // Validate data with invalid nested object
      const invalidResult = userSchema.validate(invalidNestedData);
      
      // Verify validation result
      assert.strictEqual(invalidResult.valid, false, 'Validation should fail with invalid nested object');
      assert.strictEqual(invalidResult.errors.length, 2, 'There should be two validation errors');
      assert.strictEqual(invalidResult.errors[0].field, 'address.city', 'First error should be for address.city field');
      assert.strictEqual(invalidResult.errors[1].field, 'address.zipCode', 'Second error should be for address.zipCode field');
      
      return true;
    }
  },
  
  {
    id: 'validation_schema_array_validation',
    name: 'Validation Schema - Array Validation',
    type: 'unit',
    tags: ['validation', 'schema'],
    priority: 1,
    testFn: async () => {
      // Create a schema for array items
      const tagSchema = new ValidationSchema({
        name: 'TagSchema',
        fields: {
          id: { type: FieldType.STRING, required: true },
          name: { type: FieldType.STRING, required: true }
        }
      });
      
      // Create a schema with array field
      const postSchema = new ValidationSchema({
        name: 'PostSchema',
        fields: {
          id: { type: FieldType.STRING, required: true },
          title: { type: FieldType.STRING, required: true, minLength: 5, maxLength: 100 },
          tags: { 
            type: FieldType.ARRAY, 
            itemType: FieldType.OBJECT,
            itemSchema: tagSchema,
            minItems: 1,
            maxItems: 5
          },
          categories: {
            type: FieldType.ARRAY,
            itemType: FieldType.STRING,
            enum: ['tech', 'science', 'health', 'business']
          }
        }
      });
      
      // Valid data
      const validData = {
        id: 'post123',
        title: 'My First Post',
        tags: [
          { id: 'tag1', name: 'JavaScript' },
          { id: 'tag2', name: 'Validation' }
        ],
        categories: ['tech', 'science']
      };
      
      // Validate data
      const result = postSchema.validate(validData);
      
      // Verify validation result
      assert.strictEqual(result.valid, true, 'Validation should succeed with valid arrays');
      
      // Invalid array data
      const invalidArrayData = {
        id: 'post123',
        title: 'My First Post',
        tags: [
          { id: 'tag1', name: 'JavaScript' },
          { id: 'tag2' } // Missing name
        ],
        categories: ['tech', 'sports'] // Invalid category
      };
      
      // Validate data with invalid arrays
      const invalidResult = postSchema.validate(invalidArrayData);
      
      // Verify validation result
      assert.strictEqual(invalidResult.valid, false, 'Validation should fail with invalid arrays');
      assert.strictEqual(invalidResult.errors.length, 2, 'There should be two validation errors');
      assert.strictEqual(invalidResult.errors[0].field, 'tags[1].name', 'First error should be for tags[1].name field');
      assert.strictEqual(invalidResult.errors[1].field, 'categories[1]', 'Second error should be for categories[1] field');
      
      // Test array length validation
      const emptyArrayData = {
        id: 'post123',
        title: 'My First Post',
        tags: [], // Empty array (below minItems)
        categories: ['tech']
      };
      
      const emptyArrayResult = postSchema.validate(emptyArrayData);
      assert.strictEqual(emptyArrayResult.valid, false, 'Validation should fail with empty array');
      assert.strictEqual(emptyArrayResult.errors.length, 1, 'There should be one validation error');
      assert.strictEqual(emptyArrayResult.errors[0].field, 'tags', 'Error should be for tags field');
      assert.strictEqual(emptyArrayResult.errors[0].constraint, 'minItems', 'Error should be for minItems constraint');
      
      return true;
    }
  },
  
  {
    id: 'validation_schema_conditional_validation',
    name: 'Validation Schema - Conditional Validation',
    type: 'unit',
    tags: ['validation', 'schema'],
    priority: 1,
    testFn: async () => {
      // Create a schema with conditional validation
      const paymentSchema = new ValidationSchema({
        name: 'PaymentSchema',
        fields: {
          method: { 
            type: FieldType.STRING, 
            required: true,
            enum: ['credit_card', 'bank_transfer', 'paypal']
          },
          creditCardNumber: { 
            type: FieldType.STRING,
            pattern: /^\d{16}$/,
            requiredIf: (data) => data.method === 'credit_card'
          },
          accountNumber: {
            type: FieldType.STRING,
            requiredIf: (data) => data.method === 'bank_transfer'
          },
          paypalEmail: {
            type: FieldType.EMAIL,
            requiredIf: (data) => data.method === 'paypal'
          }
        }
      });
      
      // Valid credit card data
      const validCreditCardData = {
        method: 'credit_card',
        creditCardNumber: '1234567890123456'
      };
      
      // Validate credit card data
      const creditCardResult = paymentSchema.validate(validCreditCardData);
      
      // Verify validation result
      assert.strictEqual(creditCardResult.valid, true, 'Validation should succeed with valid credit card data');
      
      // Valid bank transfer data
      const validBankTransferData = {
        method: 'bank_transfer',
        accountNumber: '987654321'
      };
      
      // Validate bank transfer data
      const bankTransferResult = paymentSchema.validate(validBankTransferData);
      
      // Verify validation result
      assert.strictEqual(bankTransferResult.valid, true, 'Validation should succeed with valid bank transfer data');
      
      // Invalid data (missing required conditional field)
      const invalidData = {
        method: 'paypal'
        // Missing paypalEmail
      };
      
      // Validate invalid data
      const invalidResult = paymentSchema.validate(invalidData);
      
      // Verify validation result
      assert.strictEqual(invalidResult.valid, false, 'Validation should fail with missing conditional field');
      assert.strictEqual(invalidResult.errors.length, 1, 'There should be one validation error');
      assert.strictEqual(invalidResult.errors[0].field, 'paypalEmail', 'Error should be for paypalEmail field');
      assert.strictEqual(invalidResult.errors[0].constraint, 'required', 'Error should be for required constraint');
      
      return true;
    }
  },
  
  {
    id: 'validation_schema_error_formatting',
    name: 'Validation Schema - Error Formatting',
    type: 'unit',
    tags: ['validation', 'schema'],
    priority: 1,
    testFn: async () => {
      // Create a validation schema
      const schema = new ValidationSchema({
        name: 'UserSchema',
        fields: {
          id: { type: FieldType.STRING, required: true },
          email: { type: FieldType.EMAIL, required: true },
          age: { type: FieldType.NUMBER, min: 18, max: 120 }
        }
      });
      
      // Invalid data
      const invalidData = {
        // id is missing
        email: 'not-an-email',
        age: 15 // Below minimum
      };
      
      // Validate data
      const result = schema.validate(invalidData);
      
      // Verify validation result
      assert.strictEqual(result.valid, false, 'Validation should fail');
      assert.strictEqual(result.errors.length, 3, 'There should be three validation errors');
      
      // Get formatted errors
      const formattedErrors = schema.formatErrors(result.errors);
      
      // Verify formatted errors
      assert.strictEqual(formattedErrors.length, 3, 'There should be three formatted errors');
      assert(formattedErrors[0].message, 'Formatted error should have message');
      assert(formattedErrors[0].field, 'Formatted error should have field');
      
      // Get errors as ValidationError objects
      const validationErrors = schema.getValidationErrors(result.errors);
      
      // Verify validation errors
      assert.strictEqual(validationErrors.length, 3, 'There should be three validation errors');
      assert(validationErrors[0] instanceof ValidationError, 'Error should be ValidationError instance');
      assert.strictEqual(validationErrors[0].field, 'id', 'Error should have field property');
      assert.strictEqual(validationErrors[0].constraint, 'required', 'Error should have constraint property');
      
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