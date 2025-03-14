/**
 * Unit tests for parameter_validator.js
 * 
 * Tests the parameter validation utility functions to ensure they
 * correctly validate required parameters, parameter types, and apply defaults.
 */

const assert = require('assert');
const {
  validateParameters,
  validateRequiredParameters,
  validateParameterTypes,
  applyDefaults
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
 * Tests for validateRequiredParameters function
 */
function validateRequiredParametersTest() {
  console.log('Running validateRequiredParametersTest...');
  
  // Test missing options object
  assertThrowsWithMessage(
    () => validateRequiredParameters(null, { required: ['param1'] }, 'TestClass'),
    'TestClass: Options object is required.'
  );
  
  // Test missing required parameters
  assertThrowsWithMessage(
    () => validateRequiredParameters({}, { required: ['param1', 'param2'] }, 'TestClass'),
    'TestClass constructor: Missing required parameters "param1", "param2". Please provide the required parameter(s).'
  );
  
  // Test single missing parameter with custom message
  assertThrowsWithMessage(
    () => validateRequiredParameters(
      { param2: 'value2' },
      { 
        required: ['param1', 'param2'],
        messages: { param1: 'param1 is required for core functionality.' }
      },
      'TestClass'
    ),
    'TestClass constructor: Missing required parameter "param1". param1 is required for core functionality.'
  );
  
  // Test alternative parameters
  const optionsWithAlt = { altParam: 'value' };
  validateRequiredParameters(
    optionsWithAlt,
    { 
      required: ['param1'],
      alternatives: { param1: 'altParam' }
    },
    'TestClass'
  );
  
  // Test multiple alternative parameters
  const optionsWithAlt2 = { altParam2: 'value' };
  validateRequiredParameters(
    optionsWithAlt2,
    { 
      required: ['param1'],
      alternatives: { param1: ['altParam1', 'altParam2'] }
    },
    'TestClass'
  );
  
  // Test conditional parameter - required if another parameter is present
  assertThrowsWithMessage(
    () => validateRequiredParameters(
      { triggerParam: 'value' },
      { 
        required: [
          { name: 'conditionalParam', condition: { ifPresent: 'triggerParam' } }
        ]
      },
      'TestClass'
    ),
    'TestClass constructor: Missing required parameter "conditionalParam". Please provide the required parameter.'
  );
  
  // Test conditional parameter - required if another parameter equals specific value
  assertThrowsWithMessage(
    () => validateRequiredParameters(
      { triggerParam: 'specificValue' },
      { 
        required: [
          { 
            name: 'conditionalParam', 
            condition: { ifEquals: { param: 'triggerParam', value: 'specificValue' } } 
          }
        ]
      },
      'TestClass'
    ),
    'TestClass constructor: Missing required parameter "conditionalParam". Please provide the required parameter.'
  );
  
  // Test conditional parameter - not required if condition isn't met
  validateRequiredParameters(
    { triggerParam: 'differentValue' },
    { 
      required: [
        { 
          name: 'conditionalParam', 
          condition: { ifEquals: { param: 'triggerParam', value: 'specificValue' } } 
        }
      ]
    },
    'TestClass'
  );
  
  console.log('validateRequiredParametersTest completed successfully');
}

/**
 * Tests for validateParameterTypes function
 */
function validateParameterTypesTest() {
  console.log('Running validateParameterTypesTest...');
  
  // Test valid parameter types
  validateParameterTypes(
    {
      stringParam: 'value',
      numberParam: 123,
      booleanParam: true,
      arrayParam: [1, 2, 3],
      objectParam: { key: 'value' },
      functionParam: () => {}
    },
    {
      types: {
        stringParam: 'string',
        numberParam: 'number',
        booleanParam: 'boolean',
        arrayParam: 'array',
        objectParam: 'object',
        functionParam: 'function'
      }
    },
    'TestClass'
  );
  
  // Test invalid string parameter
  assertThrowsWithMessage(
    () => validateParameterTypes(
      { stringParam: 123 },
      { types: { stringParam: 'string' } },
      'TestClass'
    ),
    'TestClass constructor: Invalid parameter type: stringParam (expected string, got number)'
  );
  
  // Test invalid number parameter
  assertThrowsWithMessage(
    () => validateParameterTypes(
      { numberParam: '123' },
      { types: { numberParam: 'number' } },
      'TestClass'
    ),
    'TestClass constructor: Invalid parameter type: numberParam (expected number, got string)'
  );
  
  // Test invalid array parameter
  assertThrowsWithMessage(
    () => validateParameterTypes(
      { arrayParam: { key: 'value' } },
      { types: { arrayParam: 'array' } },
      'TestClass'
    ),
    'TestClass constructor: Invalid parameter type: arrayParam (expected array, got object)'
  );
  
  // Test invalid object parameter
  assertThrowsWithMessage(
    () => validateParameterTypes(
      { objectParam: [1, 2, 3] },
      { types: { objectParam: 'object' } },
      'TestClass'
    ),
    'TestClass constructor: Invalid parameter type: objectParam (expected object, got object)'
  );
  
  // Test invalid function parameter
  assertThrowsWithMessage(
    () => validateParameterTypes(
      { functionParam: 'not a function' },
      { types: { functionParam: 'function' } },
      'TestClass'
    ),
    'TestClass constructor: Invalid parameter type: functionParam (expected function, got string)'
  );
  
  // Test union types
  validateParameterTypes(
    { param: 'string value' },
    { types: { param: ['string', 'number'] } },
    'TestClass'
  );
  
  validateParameterTypes(
    { param: 123 },
    { types: { param: ['string', 'number'] } },
    'TestClass'
  );
  
  assertThrowsWithMessage(
    () => validateParameterTypes(
      { param: true },
      { types: { param: ['string', 'number'] } },
      'TestClass'
    ),
    'TestClass constructor: Invalid parameter type: param (expected string,number, got boolean)'
  );
  
  // Test multiple type errors
  assertThrowsWithMessage(
    () => validateParameterTypes(
      { param1: 123, param2: true },
      { types: { param1: 'string', param2: 'array' } },
      'TestClass'
    ),
    'TestClass constructor: Invalid parameter types: param1 (expected string, got number), param2 (expected array, got boolean)'
  );
  
  console.log('validateParameterTypesTest completed successfully');
}

/**
 * Tests for applyDefaults function
 */
function applyDefaultsTest() {
  console.log('Running applyDefaultsTest...');
  
  // Test basic defaults
  const result1 = applyDefaults(
    { param1: 'custom value' },
    { defaults: { param1: 'default value', param2: 'default value 2' } }
  );
  
  assert.strictEqual(result1.param1, 'custom value', 'Should not override provided values');
  assert.strictEqual(result1.param2, 'default value 2', 'Should apply default for missing parameter');
  
  // Test alternative parameter mapping
  const result2 = applyDefaults(
    { altParam: 'alt value' },
    { 
      defaults: { param1: 'default value' },
      alternatives: { param1: 'altParam' }
    }
  );
  
  assert.strictEqual(result2.param1, 'alt value', 'Should map alternative parameter');
  assert.strictEqual(result2.altParam, 'alt value', 'Should preserve original parameter');
  
  // Test multiple alternative parameters (first match wins)
  const result3 = applyDefaults(
    { altParam2: 'alt value 2' },
    { 
      defaults: { param1: 'default value' },
      alternatives: { param1: ['altParam1', 'altParam2', 'altParam3'] }
    }
  );
  
  assert.strictEqual(result3.param1, 'alt value 2', 'Should map first matching alternative parameter');
  
  // Test parameter transformation
  const result4 = applyDefaults(
    { altParam: '42' },
    { 
      defaults: { param1: 0 },
      alternatives: { param1: 'altParam' },
      transformations: { param1: (val) => parseInt(val, 10) }
    }
  );
  
  assert.strictEqual(result4.param1, 42, 'Should apply transformation to alternative parameter');
  assert.strictEqual(typeof result4.param1, 'number', 'Should change the type through transformation');
  
  console.log('applyDefaultsTest completed successfully');
}

/**
 * Tests for validateParameters function
 */
function validateParametersTest() {
  console.log('Running validateParametersTest...');
  
  // Test comprehensive validation rules
  const validationRules = {
    required: ['requiredParam', { name: 'conditionalParam', condition: { ifPresent: 'triggerParam' } }],
    types: {
      requiredParam: 'string',
      optionalParam: 'number',
      conditionalParam: 'array'
    },
    defaults: {
      optionalParam: 100,
      defaultParam: 'default value'
    },
    alternatives: {
      requiredParam: 'altRequiredParam'
    },
    messages: {
      requiredParam: 'This parameter is essential for operation.'
    }
  };
  
  // Test valid options
  const result1 = validateParameters(
    { requiredParam: 'value', triggerParam: true, conditionalParam: [1, 2, 3] },
    validationRules,
    'TestClass'
  );
  
  assert.strictEqual(result1.requiredParam, 'value', 'Should preserve required parameter');
  assert.strictEqual(result1.optionalParam, 100, 'Should apply default for optional parameter');
  assert.strictEqual(result1.defaultParam, 'default value', 'Should apply default value');
  assert.deepStrictEqual(result1.conditionalParam, [1, 2, 3], 'Should preserve conditional parameter');
  
  // Test with alternative parameter
  const result2 = validateParameters(
    { altRequiredParam: 'alt value', optionalParam: 200 },
    validationRules,
    'TestClass'
  );
  
  assert.strictEqual(result2.requiredParam, 'alt value', 'Should map alternative parameter');
  assert.strictEqual(result2.optionalParam, 200, 'Should preserve provided optional parameter');
  
  // Test missing required parameter
  assertThrowsWithMessage(
    () => validateParameters({}, validationRules, 'TestClass'),
    'TestClass constructor: Missing required parameter "requiredParam". This parameter is essential for operation.'
  );
  
  // Test type validation
  assertThrowsWithMessage(
    () => validateParameters(
      { requiredParam: 123 },
      validationRules,
      'TestClass'
    ),
    'TestClass constructor: Invalid parameter type: requiredParam (expected string, got number)'
  );
  
  // Test conditional parameter validation
  assertThrowsWithMessage(
    () => validateParameters(
      { requiredParam: 'value', triggerParam: true },
      validationRules,
      'TestClass'
    ),
    'TestClass constructor: Missing required parameter "conditionalParam". Please provide the required parameter.'
  );
  
  // Test conditional parameter type validation
  assertThrowsWithMessage(
    () => validateParameters(
      { requiredParam: 'value', triggerParam: true, conditionalParam: 'not an array' },
      validationRules,
      'TestClass'
    ),
    'TestClass constructor: Invalid parameter type: conditionalParam (expected array, got string)'
  );
  
  console.log('validateParametersTest completed successfully');
}

/**
 * Main test function to run all parameter validator tests
 */
function parameterValidatorTest() {
  console.log('RUNNING PARAMETER VALIDATOR TESTS');
  
  try {
    validateRequiredParametersTest();
    validateParameterTypesTest();
    applyDefaultsTest();
    validateParametersTest();
    
    console.log('ALL PARAMETER VALIDATOR TESTS PASSED');
    return true;
  } catch (error) {
    console.error('Parameter validator test failed:', error);
    return false;
  }
}

// Export the test functions
module.exports = {
  parameterValidatorTest,
  validateRequiredParametersTest,
  validateParameterTypesTest,
  applyDefaultsTest,
  validateParametersTest
}; 