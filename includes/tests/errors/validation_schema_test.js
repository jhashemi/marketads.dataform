/**
 * @fileoverview Tests for Validation Schema
 * 
 * This file contains tests for the validation schema functionality.
 */

const assert = require('assert');
const { 
  SCHEMA_TYPES, 
  FORMAT_VALIDATORS, 
  validateSchema, 
  validateAndThrow,
  bigQueryTableReference,
  fieldMapping,
  matchingRule,
  queryHistoryEntry
} = require('../../validation/validation_schema');
const { ValidationError } = require('../../errors/error_types');

/**
 * Test suite for Validation Schema
 */
const tests = [
  {
    id: 'validation_schema_types',
    name: 'Validation Schema - Schema Types',
    type: 'unit',
    tags: ['validation', 'schema'],
    priority: 1,
    testFn: async () => {
      // Verify schema types are defined
      assert(SCHEMA_TYPES.STRING, 'STRING schema type should be defined');
      assert(SCHEMA_TYPES.NUMBER, 'NUMBER schema type should be defined');
      assert(SCHEMA_TYPES.BOOLEAN, 'BOOLEAN schema type should be defined');
      assert(SCHEMA_TYPES.OBJECT, 'OBJECT schema type should be defined');
      assert(SCHEMA_TYPES.ARRAY, 'ARRAY schema type should be defined');
      assert(SCHEMA_TYPES.ANY, 'ANY schema type should be defined');
      
      return true;
    }
  },
  
  {
    id: 'validation_schema_format_validators',
    name: 'Validation Schema - Format Validators',
    type: 'unit',
    tags: ['validation', 'schema'],
    priority: 1,
    testFn: async () => {
      // Test email validator
      assert(FORMAT_VALIDATORS.email('test@example.com'), 'Valid email should pass validation');
      assert(!FORMAT_VALIDATORS.email('invalid-email'), 'Invalid email should fail validation');
      
      // Test url validator
      assert(FORMAT_VALIDATORS.url('https://example.com'), 'Valid URL should pass validation');
      assert(!FORMAT_VALIDATORS.url('invalid-url'), 'Invalid URL should fail validation');
      
      // Test date validator
      assert(FORMAT_VALIDATORS.date('2023-01-01'), 'Valid date should pass validation');
      assert(!FORMAT_VALIDATORS.date('invalid-date'), 'Invalid date should fail validation');
      
      // Test time validator
      assert(FORMAT_VALIDATORS.time('12:30:45'), 'Valid time should pass validation');
      assert(!FORMAT_VALIDATORS.time('invalid-time'), 'Invalid time should fail validation');
      
      // Test datetime validator
      assert(FORMAT_VALIDATORS.datetime('2023-01-01T12:30:45Z'), 'Valid datetime should pass validation');
      assert(!FORMAT_VALIDATORS.datetime('invalid-datetime'), 'Invalid datetime should fail validation');
      
      // Test uuid validator
      assert(FORMAT_VALIDATORS.uuid('123e4567-e89b-12d3-a456-426614174000'), 'Valid UUID should pass validation');
      assert(!FORMAT_VALIDATORS.uuid('invalid-uuid'), 'Invalid UUID should fail validation');
      
      // Test bigquery_dataset validator
      assert(FORMAT_VALIDATORS.bigquery_dataset('valid_dataset_123'), 'Valid BigQuery dataset should pass validation');
      assert(!FORMAT_VALIDATORS.bigquery_dataset('invalid-dataset!'), 'Invalid BigQuery dataset should fail validation');
      
      // Test bigquery_table validator
      assert(FORMAT_VALIDATORS.bigquery_table('valid_table_123'), 'Valid BigQuery table should pass validation');
      assert(!FORMAT_VALIDATORS.bigquery_table('invalid-table!'), 'Invalid BigQuery table should fail validation');
      
      // Test bigquery_project validator
      assert(FORMAT_VALIDATORS.bigquery_project('valid-project-123'), 'Valid BigQuery project should pass validation');
      assert(!FORMAT_VALIDATORS.bigquery_project('invalid!project'), 'Invalid BigQuery project should fail validation');
      
      return true;
    }
  },
  
  {
    id: 'validation_schema_validate_schema_basic',
    name: 'Validation Schema - Basic Schema Validation',
    type: 'unit',
    tags: ['validation', 'schema'],
    priority: 1,
    testFn: async () => {
      // Define a simple schema
      const userSchema = {
        type: SCHEMA_TYPES.OBJECT,
        required: true,
        properties: {
          id: { type: SCHEMA_TYPES.STRING, required: true },
          name: { type: SCHEMA_TYPES.STRING, required: true },
          age: { type: SCHEMA_TYPES.NUMBER, required: false },
          active: { type: SCHEMA_TYPES.BOOLEAN, required: false, default: true }
        }
      };
      
      // Test valid object
      const validUser = {
        id: '123',
        name: 'John Doe',
        age: 30,
        active: true
      };
      
      const validationResult = validateSchema(validUser, userSchema);
      assert.strictEqual(validationResult.valid, true, 'Valid object should pass validation');
      assert.strictEqual(validationResult.errors.length, 0, 'Valid object should have no errors');
      
      // Test invalid object (missing required field)
      const invalidUser1 = {
        id: '123',
        // name is missing
        age: 30
      };
      
      const validationResult1 = validateSchema(invalidUser1, userSchema);
      assert.strictEqual(validationResult1.valid, false, 'Invalid object should fail validation');
      assert.strictEqual(validationResult1.errors.length, 1, 'Invalid object should have one error');
      assert(validationResult1.errors[0].includes('name'), 'Error should mention the missing field');
      
      // Test invalid object (wrong type)
      const invalidUser2 = {
        id: '123',
        name: 'John Doe',
        age: 'thirty' // Should be a number
      };
      
      const validationResult2 = validateSchema(invalidUser2, userSchema);
      assert.strictEqual(validationResult2.valid, false, 'Invalid object should fail validation');
      assert.strictEqual(validationResult2.errors.length, 1, 'Invalid object should have one error');
      assert(validationResult2.errors[0].includes('age'), 'Error should mention the field with wrong type');
      
      return true;
    }
  },
  
  {
    id: 'validation_schema_validate_schema_nested',
    name: 'Validation Schema - Nested Schema Validation',
    type: 'unit',
    tags: ['validation', 'schema'],
    priority: 1,
    testFn: async () => {
      // Define a schema with nested objects
      const userSchema = {
        type: SCHEMA_TYPES.OBJECT,
        required: true,
        properties: {
          id: { type: SCHEMA_TYPES.STRING, required: true },
          name: { type: SCHEMA_TYPES.STRING, required: true },
          address: {
            type: SCHEMA_TYPES.OBJECT,
            required: false,
            properties: {
              street: { type: SCHEMA_TYPES.STRING, required: true },
              city: { type: SCHEMA_TYPES.STRING, required: true },
              zipCode: { type: SCHEMA_TYPES.STRING, required: true }
            }
          },
          contacts: {
            type: SCHEMA_TYPES.ARRAY,
            required: false,
            items: {
              type: SCHEMA_TYPES.OBJECT,
              properties: {
                type: { type: SCHEMA_TYPES.STRING, required: true },
                value: { type: SCHEMA_TYPES.STRING, required: true }
              }
            }
          }
        }
      };
      
      // Test valid object with nested structures
      const validUser = {
        id: '123',
        name: 'John Doe',
        address: {
          street: '123 Main St',
          city: 'Anytown',
          zipCode: '12345'
        },
        contacts: [
          { type: 'email', value: 'john@example.com' },
          { type: 'phone', value: '555-1234' }
        ]
      };
      
      const validationResult = validateSchema(validUser, userSchema);
      assert.strictEqual(validationResult.valid, true, 'Valid object should pass validation');
      assert.strictEqual(validationResult.errors.length, 0, 'Valid object should have no errors');
      
      // Test invalid nested object (missing required field in address)
      const invalidUser1 = {
        id: '123',
        name: 'John Doe',
        address: {
          street: '123 Main St',
          // city is missing
          zipCode: '12345'
        }
      };
      
      const validationResult1 = validateSchema(invalidUser1, userSchema);
      assert.strictEqual(validationResult1.valid, false, 'Invalid object should fail validation');
      assert.strictEqual(validationResult1.errors.length, 1, 'Invalid object should have one error');
      assert(validationResult1.errors[0].includes('address.city'), 'Error should mention the nested missing field');
      
      // Test invalid array item (missing required field in contacts)
      const invalidUser2 = {
        id: '123',
        name: 'John Doe',
        contacts: [
          { type: 'email', value: 'john@example.com' },
          { type: 'phone' } // value is missing
        ]
      };
      
      const validationResult2 = validateSchema(invalidUser2, userSchema);
      assert.strictEqual(validationResult2.valid, false, 'Invalid object should fail validation');
      assert.strictEqual(validationResult2.errors.length, 1, 'Invalid object should have one error');
      assert(validationResult2.errors[0].includes('contacts[1].value'), 'Error should mention the array item field');
      
      return true;
    }
  },
  
  {
    id: 'validation_schema_validate_schema_formats',
    name: 'Validation Schema - Format Validation',
    type: 'unit',
    tags: ['validation', 'schema'],
    priority: 1,
    testFn: async () => {
      // Define a schema with format validations
      const userSchema = {
        type: SCHEMA_TYPES.OBJECT,
        required: true,
        properties: {
          id: { type: SCHEMA_TYPES.STRING, required: true, format: 'uuid' },
          email: { type: SCHEMA_TYPES.STRING, required: true, format: 'email' },
          website: { type: SCHEMA_TYPES.STRING, required: false, format: 'url' },
          birthDate: { type: SCHEMA_TYPES.STRING, required: false, format: 'date' }
        }
      };
      
      // Test valid object with correct formats
      const validUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'user@example.com',
        website: 'https://example.com',
        birthDate: '1990-01-01'
      };
      
      const validationResult = validateSchema(validUser, userSchema);
      assert.strictEqual(validationResult.valid, true, 'Valid object should pass validation');
      assert.strictEqual(validationResult.errors.length, 0, 'Valid object should have no errors');
      
      // Test invalid format (email)
      const invalidUser1 = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'invalid-email',
        website: 'https://example.com'
      };
      
      const validationResult1 = validateSchema(invalidUser1, userSchema);
      assert.strictEqual(validationResult1.valid, false, 'Invalid object should fail validation');
      assert.strictEqual(validationResult1.errors.length, 1, 'Invalid object should have one error');
      assert(validationResult1.errors[0].includes('email'), 'Error should mention the field with invalid format');
      
      // Test invalid format (uuid)
      const invalidUser2 = {
        id: 'invalid-uuid',
        email: 'user@example.com',
        website: 'https://example.com'
      };
      
      const validationResult2 = validateSchema(invalidUser2, userSchema);
      assert.strictEqual(validationResult2.valid, false, 'Invalid object should fail validation');
      assert.strictEqual(validationResult2.errors.length, 1, 'Invalid object should have one error');
      assert(validationResult2.errors[0].includes('id'), 'Error should mention the field with invalid format');
      
      return true;
    }
  },
  
  {
    id: 'validation_schema_validate_and_throw',
    name: 'Validation Schema - Validate and Throw',
    type: 'unit',
    tags: ['validation', 'schema'],
    priority: 1,
    testFn: async () => {
      // Define a simple schema
      const userSchema = {
        type: SCHEMA_TYPES.OBJECT,
        required: true,
        properties: {
          id: { type: SCHEMA_TYPES.STRING, required: true },
          name: { type: SCHEMA_TYPES.STRING, required: true },
          age: { type: SCHEMA_TYPES.NUMBER, required: false }
        }
      };
      
      // Test valid object
      const validUser = {
        id: '123',
        name: 'John Doe',
        age: 30
      };
      
      try {
        validateAndThrow(validUser, userSchema, 'User');
        // Should not throw
      } catch (error) {
        assert.fail('validateAndThrow should not throw for valid objects');
      }
      
      // Test invalid object
      const invalidUser = {
        id: '123',
        // name is missing
        age: 30
      };
      
      try {
        validateAndThrow(invalidUser, userSchema, 'User');
        assert.fail('validateAndThrow should throw for invalid objects');
      } catch (error) {
        assert(error instanceof ValidationError, 'Error should be a ValidationError');
        assert(error.message.includes('name'), 'Error message should mention the missing field');
        assert(error.message.includes('User'), 'Error message should include the entity name');
      }
      
      return true;
    }
  },
  
  {
    id: 'validation_schema_common_schemas',
    name: 'Validation Schema - Common Schemas',
    type: 'unit',
    tags: ['validation', 'schema'],
    priority: 1,
    testFn: async () => {
      // Test bigQueryTableReference schema
      const validTableRef = {
        projectId: 'my-project',
        datasetId: 'my_dataset',
        tableId: 'my_table'
      };
      
      const tableRefResult = validateSchema(validTableRef, bigQueryTableReference);
      assert.strictEqual(tableRefResult.valid, true, 'Valid table reference should pass validation');
      
      const invalidTableRef = {
        projectId: 'my-project',
        // datasetId is missing
        tableId: 'my_table'
      };
      
      const invalidTableRefResult = validateSchema(invalidTableRef, bigQueryTableReference);
      assert.strictEqual(invalidTableRefResult.valid, false, 'Invalid table reference should fail validation');
      
      // Test fieldMapping schema
      const validFieldMapping = {
        sourceField: 'source_field',
        targetField: 'target_field',
        transformation: 'UPPER(source_field)'
      };
      
      const fieldMappingResult = validateSchema(validFieldMapping, fieldMapping);
      assert.strictEqual(fieldMappingResult.valid, true, 'Valid field mapping should pass validation');
      
      const invalidFieldMapping = {
        // sourceField is missing
        targetField: 'target_field'
      };
      
      const invalidFieldMappingResult = validateSchema(invalidFieldMapping, fieldMapping);
      assert.strictEqual(invalidFieldMappingResult.valid, false, 'Invalid field mapping should fail validation');
      
      // Test matchingRule schema
      const validMatchingRule = {
        name: 'Exact Match',
        fields: ['email', 'phone'],
        threshold: 1.0,
        weight: 0.8
      };
      
      const matchingRuleResult = validateSchema(validMatchingRule, matchingRule);
      assert.strictEqual(matchingRuleResult.valid, true, 'Valid matching rule should pass validation');
      
      const invalidMatchingRule = {
        name: 'Exact Match',
        // fields is missing
        threshold: 1.0
      };
      
      const invalidMatchingRuleResult = validateSchema(invalidMatchingRule, matchingRule);
      assert.strictEqual(invalidMatchingRuleResult.valid, false, 'Invalid matching rule should fail validation');
      
      // Test queryHistoryEntry schema
      const validQueryHistory = {
        queryId: '123e4567-e89b-12d3-a456-426614174000',
        sql: 'SELECT * FROM table',
        user: 'user@example.com',
        startTime: '2023-01-01T12:00:00Z',
        endTime: '2023-01-01T12:01:00Z',
        bytesProcessed: 1024,
        status: 'SUCCESS'
      };
      
      const queryHistoryResult = validateSchema(validQueryHistory, queryHistoryEntry);
      assert.strictEqual(queryHistoryResult.valid, true, 'Valid query history should pass validation');
      
      const invalidQueryHistory = {
        queryId: '123e4567-e89b-12d3-a456-426614174000',
        // sql is missing
        user: 'user@example.com',
        startTime: '2023-01-01T12:00:00Z'
      };
      
      const invalidQueryHistoryResult = validateSchema(invalidQueryHistory, queryHistoryEntry);
      assert.strictEqual(invalidQueryHistoryResult.valid, false, 'Invalid query history should fail validation');
      
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