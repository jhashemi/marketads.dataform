/**
 * Unit tests for enhanced parameter_validator.js
 * 
 * Tests the enhanced parameter validation utility functions including
 * constraint validation and JSON schema validation.
 */

const assert = require('assert');
const {
  validateParameters,
  validateRequiredParameters,
  validateParameterTypes,
  validateConstraints,
  applyDefaults,
  validateSchema
} = require('../../includes/validation/parameter_validator');

// Test helper for asserting errors
function assertThrowsWithMessage(fn, expectedMessage) {
  try {
    fn();
    assert.fail('Expected function to throw an error');
  } catch (error) {
    if (error.message !== expectedMessage) {
      assert.fail(`Expected error message "${expectedMessage}" but got "${error.message}"`);
    }
  }
}

/**
 * Tests for enhanced condition checks in validateRequiredParameters
 */
function validateEnhancedConditionsTest() {
  console.log('Running validateEnhancedConditionsTest...');
  
  // Test ifNotEquals condition
  assertThrowsWithMessage(
    () => validateRequiredParameters(
      { triggerParam: 'notTheValue' },
      { 
        required: [
          { 
            name: 'conditionalParam', 
            condition: { ifNotEquals: { param: 'triggerParam', value: 'specificValue' } } 
          }
        ]
      },
      'TestClass'
    ),
    'TestClass constructor: Missing required parameter "conditionalParam". Please provide the required parameter(s).'
  );
  
  // Test ifOneOf condition
  assertThrowsWithMessage(
    () => validateRequiredParameters(
      { triggerParam: 'value1' },
      { 
        required: [
          { 
            name: 'conditionalParam', 
            condition: { ifOneOf: { param: 'triggerParam', values: ['value1', 'value2'] } } 
          }
        ]
      },
      'TestClass'
    ),
    'TestClass constructor: Missing required parameter "conditionalParam". Please provide the required parameter(s).'
  );
  
  // Test ifAllOf condition
  assertThrowsWithMessage(
    () => validateRequiredParameters(
      { param1: 'value1', param2: 'value2' },
      { 
        required: [
          { 
            name: 'conditionalParam', 
            condition: { 
              ifAllOf: [
                { ifPresent: 'param1' },
                { ifPresent: 'param2' }
              ]
            } 
          }
        ]
      },
      'TestClass'
    ),
    'TestClass constructor: Missing required parameter "conditionalParam". Please provide the required parameter(s).'
  );
  
  // Test ifAnyOf condition
  assertThrowsWithMessage(
    () => validateRequiredParameters(
      { param1: 'value1' },
      { 
        required: [
          { 
            name: 'conditionalParam', 
            condition: { 
              ifAnyOf: [
                { ifPresent: 'param1' },
                { ifPresent: 'param2' }
              ]
            } 
          }
        ]
      },
      'TestClass'
    ),
    'TestClass constructor: Missing required parameter "conditionalParam". Please provide the required parameter(s).'
  );
  
  console.log('validateEnhancedConditionsTest completed successfully');
}

/**
 * Tests for validateConstraints function
 */
function validateConstraintsTest() {
  console.log('Running validateConstraintsTest...');
  
  // Test numeric constraints
  assertThrowsWithMessage(
    () => validateConstraints(
      { numParam: 5 },
      { 
        constraints: {
          numParam: { min: 10 }
        }
      },
      'TestClass'
    ),
    'TestClass constructor: Constraint violation: numParam must be at least 10'
  );
  
  assertThrowsWithMessage(
    () => validateConstraints(
      { numParam: 15 },
      { 
        constraints: {
          numParam: { max: 10 }
        }
      },
      'TestClass'
    ),
    'TestClass constructor: Constraint violation: numParam must be at most 10'
  );
  
  assertThrowsWithMessage(
    () => validateConstraints(
      { numParam: 10.5 },
      { 
        constraints: {
          numParam: { integer: true }
        }
      },
      'TestClass'
    ),
    'TestClass constructor: Constraint violation: numParam must be an integer'
  );
  
  assertThrowsWithMessage(
    () => validateConstraints(
      { numParam: 0 },
      { 
        constraints: {
          numParam: { positive: true }
        }
      },
      'TestClass'
    ),
    'TestClass constructor: Constraint violation: numParam must be positive'
  );
  
  assertThrowsWithMessage(
    () => validateConstraints(
      { numParam: 0 },
      { 
        constraints: {
          numParam: { negative: true }
        }
      },
      'TestClass'
    ),
    'TestClass constructor: Constraint violation: numParam must be negative'
  );
  
  // Test string constraints
  assertThrowsWithMessage(
    () => validateConstraints(
      { strParam: 'abc' },
      { 
        constraints: {
          strParam: { minLength: 5 }
        }
      },
      'TestClass'
    ),
    'TestClass constructor: Constraint violation: strParam must have a minimum length of 5'
  );
  
  assertThrowsWithMessage(
    () => validateConstraints(
      { strParam: 'abcdefgh' },
      { 
        constraints: {
          strParam: { maxLength: 5 }
        }
      },
      'TestClass'
    ),
    'TestClass constructor: Constraint violation: strParam must have a maximum length of 5'
  );
  
  assertThrowsWithMessage(
    () => validateConstraints(
      { strParam: 'abc123' },
      { 
        constraints: {
          strParam: { pattern: '^[a-z]+$' }
        }
      },
      'TestClass'
    ),
    'TestClass constructor: Constraint violation: strParam must match pattern ^[a-z]+$'
  );
  
  assertThrowsWithMessage(
    () => validateConstraints(
      { strParam: 'notanemail' },
      { 
        constraints: {
          strParam: { format: 'email' }
        }
      },
      'TestClass'
    ),
    'TestClass constructor: Constraint violation: strParam must be a valid email'
  );
  
  // Test array constraints
  assertThrowsWithMessage(
    () => validateConstraints(
      { arrParam: [1, 2] },
      { 
        constraints: {
          arrParam: { minItems: 3 }
        }
      },
      'TestClass'
    ),
    'TestClass constructor: Constraint violation: arrParam must have at least 3 items'
  );
  
  assertThrowsWithMessage(
    () => validateConstraints(
      { arrParam: [1, 2, 3, 4] },
      { 
        constraints: {
          arrParam: { maxItems: 3 }
        }
      },
      'TestClass'
    ),
    'TestClass constructor: Constraint violation: arrParam must have at most 3 items'
  );
  
  assertThrowsWithMessage(
    () => validateConstraints(
      { arrParam: [1, 2, 2, 3] },
      { 
        constraints: {
          arrParam: { uniqueItems: true }
        }
      },
      'TestClass'
    ),
    'TestClass constructor: Constraint violation: arrParam must contain unique items'
  );
  
  // Test enum constraints
  assertThrowsWithMessage(
    () => validateConstraints(
      { enumParam: 'invalid' },
      { 
        constraints: {
          enumParam: { enum: ['valid1', 'valid2', 'valid3'] }
        }
      },
      'TestClass'
    ),
    'TestClass constructor: Constraint violation: enumParam must be one of: valid1, valid2, valid3'
  );
  
  // Test custom validator
  assertThrowsWithMessage(
    () => validateConstraints(
      { customParam: 'invalid' },
      { 
        constraints: {
          customParam: { 
            validator: (value) => value === 'valid' || 'Value must be "valid"'
          }
        }
      },
      'TestClass'
    ),
    'TestClass constructor: Constraint violation: customParam: Value must be "valid"'
  );
  
  // Test multiple constraint violations
  assertThrowsWithMessage(
    () => validateConstraints(
      { 
        numParam: 5,
        strParam: 'abc'
      },
      { 
        constraints: {
          numParam: { min: 10 },
          strParam: { minLength: 5 }
        }
      },
      'TestClass'
    ),
    'TestClass constructor: Constraint violations: numParam must be at least 10; strParam must have a minimum length of 5'
  );
  
  console.log('validateConstraintsTest completed successfully');
}

/**
 * Tests for validateSchema function
 */
function validateSchemaTest() {
  console.log('Running validateSchemaTest...');
  
  // Test basic schema validation
  const basicSchema = {
    type: 'object',
    required: ['requiredProp'],
    properties: {
      requiredProp: { type: 'string' },
      numberProp: { type: 'number' },
      booleanProp: { type: 'boolean' }
    }
  };
  
  // Valid object
  const validObj = {
    requiredProp: 'value',
    numberProp: 123,
    booleanProp: true
  };
  
  const result = validateSchema(validObj, basicSchema, 'TestClass');
  assert.deepStrictEqual(result, validObj, 'Should return the validated object unchanged');
  
  // Missing required property
  assertThrowsWithMessage(
    () => validateSchema(
      { numberProp: 123 },
      basicSchema,
      'TestClass'
    ),
    'TestClass schema validation error: Missing required property: requiredProp'
  );
  
  // Invalid property type
  assertThrowsWithMessage(
    () => validateSchema(
      { 
        requiredProp: 'value',
        numberProp: 'not a number'
      },
      basicSchema,
      'TestClass'
    ),
    'TestClass schema validation error: Property numberProp: Expected type number, got string'
  );
  
  // Test string validations
  const stringSchema = {
    type: 'object',
    properties: {
      stringProp: {
        type: 'string',
        minLength: 3,
        maxLength: 10,
        pattern: '^[a-z]+$'
      },
      emailProp: {
        type: 'string',
        format: 'email'
      }
    }
  };
  
  assertThrowsWithMessage(
    () => validateSchema(
      { 
        stringProp: 'ab',
        emailProp: 'test@example.com'
      },
      stringSchema,
      'TestClass'
    ),
    'TestClass schema validation error: Property stringProp: String is too short (minimum length: 3)'
  );
  
  assertThrowsWithMessage(
    () => validateSchema(
      { 
        stringProp: 'abcdefghijk',
        emailProp: 'test@example.com'
      },
      stringSchema,
      'TestClass'
    ),
    'TestClass schema validation error: Property stringProp: String is too long (maximum length: 10)'
  );
  
  assertThrowsWithMessage(
    () => validateSchema(
      { 
        stringProp: 'abc123',
        emailProp: 'test@example.com'
      },
      stringSchema,
      'TestClass'
    ),
    'TestClass schema validation error: Property stringProp: String does not match pattern: ^[a-z]+$'
  );
  
  assertThrowsWithMessage(
    () => validateSchema(
      { 
        stringProp: 'abcdef',
        emailProp: 'invalid-email'
      },
      stringSchema,
      'TestClass'
    ),
    'TestClass schema validation error: Property emailProp: Invalid format (expected: email)'
  );
  
  // Test number validations
  const numberSchema = {
    type: 'object',
    properties: {
      integerProp: {
        type: 'integer',
        minimum: 1,
        maximum: 100,
        multipleOf: 5
      },
      numberProp: {
        type: 'number',
        exclusiveMinimum: 0,
        exclusiveMaximum: 10
      }
    }
  };
  
  assertThrowsWithMessage(
    () => validateSchema(
      { 
        integerProp: 0.5,
        numberProp: 5
      },
      numberSchema,
      'TestClass'
    ),
    'TestClass schema validation error: Property integerProp: Expected type integer, got number'
  );
  
  assertThrowsWithMessage(
    () => validateSchema(
      { 
        integerProp: 0,
        numberProp: 5
      },
      numberSchema,
      'TestClass'
    ),
    'TestClass schema validation error: Property integerProp: Value is too small (minimum: 1)'
  );
  
  assertThrowsWithMessage(
    () => validateSchema(
      { 
        integerProp: 101,
        numberProp: 5
      },
      numberSchema,
      'TestClass'
    ),
    'TestClass schema validation error: Property integerProp: Value is too large (maximum: 100); Property integerProp: Value must be a multiple of 5'
  );
  
  assertThrowsWithMessage(
    () => validateSchema(
      { 
        integerProp: 7,
        numberProp: 5
      },
      numberSchema,
      'TestClass'
    ),
    'TestClass schema validation error: Property integerProp: Value must be a multiple of 5'
  );
  
  assertThrowsWithMessage(
    () => validateSchema(
      { 
        integerProp: 5,
        numberProp: 0
      },
      numberSchema,
      'TestClass'
    ),
    'TestClass schema validation error: Property numberProp: Value must be greater than 0'
  );
  
  assertThrowsWithMessage(
    () => validateSchema(
      { 
        integerProp: 5,
        numberProp: 10
      },
      numberSchema,
      'TestClass'
    ),
    'TestClass schema validation error: Property numberProp: Value must be less than 10'
  );
  
  // Test array validations
  const arraySchema = {
    type: 'object',
    properties: {
      arrayProp: {
        type: 'array',
        minItems: 2,
        maxItems: 5,
        uniqueItems: true,
        items: {
          type: 'number'
        }
      }
    }
  };
  
  assertThrowsWithMessage(
    () => validateSchema(
      { 
        arrayProp: [1]
      },
      arraySchema,
      'TestClass'
    ),
    'TestClass schema validation error: Property arrayProp: Array is too short (minimum items: 2)'
  );
  
  assertThrowsWithMessage(
    () => validateSchema(
      { 
        arrayProp: [1, 2, 3, 4, 5, 6]
      },
      arraySchema,
      'TestClass'
    ),
    'TestClass schema validation error: Property arrayProp: Array is too long (maximum items: 5)'
  );
  
  assertThrowsWithMessage(
    () => validateSchema(
      { 
        arrayProp: [1, 2, 2, 3]
      },
      arraySchema,
      'TestClass'
    ),
    'TestClass schema validation error: Property arrayProp: Array items must be unique'
  );
  
  assertThrowsWithMessage(
    () => validateSchema(
      { 
        arrayProp: [1, 'string']
      },
      arraySchema,
      'TestClass'
    ),
    'TestClass schema validation error: Property arrayProp[1]: Expected type number, got string'
  );
  
  // Test nested object validations
  const nestedSchema = {
    type: 'object',
    properties: {
      nestedObj: {
        type: 'object',
        required: ['nestedRequired'],
        properties: {
          nestedRequired: { type: 'string' },
          nestedNumber: { type: 'number' }
        }
      }
    }
  };
  
  assertThrowsWithMessage(
    () => validateSchema(
      { 
        nestedObj: {
          nestedNumber: 123
        }
      },
      nestedSchema,
      'TestClass'
    ),
    'TestClass schema validation error: Missing required property: nestedRequired'
  );
  
  // Test enum validation
  const enumSchema = {
    type: 'object',
    properties: {
      enumProp: {
        type: 'string',
        enum: ['option1', 'option2', 'option3']
      }
    }
  };
  
  assertThrowsWithMessage(
    () => validateSchema(
      { 
        enumProp: 'invalid'
      },
      enumSchema,
      'TestClass'
    ),
    'TestClass schema validation error: Property enumProp: Value must be one of: option1, option2, option3'
  );
  
  console.log('validateSchemaTest completed successfully');
}

/**
 * Tests for validateParameters with constraints
 */
function validateParametersWithConstraintsTest() {
  console.log('Running validateParametersWithConstraintsTest...');
  
  // Test comprehensive validation rules with constraints
  const validationRules = {
    required: ['requiredParam'],
    types: {
      requiredParam: 'string',
      numberParam: 'number',
      arrayParam: 'array'
    },
    constraints: {
      requiredParam: { 
        minLength: 3,
        maxLength: 10,
        pattern: '^[a-zA-Z]+$'
      },
      numberParam: {
        min: 1,
        max: 100,
        integer: true
      },
      arrayParam: {
        minItems: 1,
        maxItems: 5,
        uniqueItems: true
      }
    },
    defaults: {
      numberParam: 50,
      arrayParam: [1, 2, 3]
    }
  };
  
  // Test valid options
  const result = validateParameters(
    { 
      requiredParam: 'valid',
      numberParam: 42,
      arrayParam: [4, 5]
    },
    validationRules,
    'TestClass'
  );
  
  assert.strictEqual(result.requiredParam, 'valid', 'Should preserve required parameter');
  assert.strictEqual(result.numberParam, 42, 'Should preserve number parameter');
  assert.deepStrictEqual(result.arrayParam, [4, 5], 'Should preserve array parameter');
  
  // Test constraint violations
  assertThrowsWithMessage(
    () => validateParameters(
      { 
        requiredParam: 'ab',
        numberParam: 42
      },
      validationRules,
      'TestClass'
    ),
    'TestClass constructor: Constraint violation: requiredParam must have a minimum length of 3'
  );
  
  assertThrowsWithMessage(
    () => validateParameters(
      { 
        requiredParam: 'valid',
        numberParam: 0
      },
      validationRules,
      'TestClass'
    ),
    'TestClass constructor: Constraint violation: numberParam must be at least 1'
  );
  
  assertThrowsWithMessage(
    () => validateParameters(
      { 
        requiredParam: 'valid',
        arrayParam: []
      },
      validationRules,
      'TestClass'
    ),
    'TestClass constructor: Constraint violation: arrayParam must have at least 1 items'
  );
  
  // Test multiple constraint violations
  assertThrowsWithMessage(
    () => validateParameters(
      { 
        requiredParam: 'ab',
        numberParam: 0,
        arrayParam: []
      },
      validationRules,
      'TestClass'
    ),
    'TestClass constructor: Constraint violations: requiredParam must have a minimum length of 3; numberParam must be at least 1; arrayParam must have at least 1 items'
  );
  
  console.log('validateParametersWithConstraintsTest completed successfully');
}

/**
 * Main test function to run all enhanced parameter validator tests
 */
function parameterValidatorEnhancedTest() {
  console.log('RUNNING ENHANCED PARAMETER VALIDATOR TESTS');
  
  try {
    validateEnhancedConditionsTest();
    validateConstraintsTest();
    validateSchemaTest();
    validateParametersWithConstraintsTest();
    
    console.log('ALL ENHANCED PARAMETER VALIDATOR TESTS PASSED');
    return true;
  } catch (error) {
    console.error('Enhanced parameter validator test failed:', error);
    return false;
  }
}

// Run the tests
parameterValidatorEnhancedTest(); 