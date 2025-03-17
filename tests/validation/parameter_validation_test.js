/**
 * @fileoverview Tests for parameter validation utilities
 */

const assert = require('assert');
const { validateMatchingParameters } = require('../../includes/validation/parameter_validation');
const { ValidationError } = require('../../includes/errors/validation_error');

/**
 * Test suite for parameter validation
 */
const tests = [
  {
    id: 'parameter_validation_required_params',
    name: 'Parameter Validation - Required Parameters',
    type: 'unit',
    tags: ['validation', 'parameter_validation'],
    priority: 1,
    testFn: async () => {
      // Test with missing required parameters
      const emptyResult = validateMatchingParameters({});
      assert.strictEqual(emptyResult.isValid, false, 'Empty parameters should be invalid');
      assert.ok(emptyResult.errors.length >= 2, 'Should have at least 2 errors for missing required params');
      
      // Test with required parameters
      const validResult = validateMatchingParameters({
        sourceTable: 'test_source',
        outputTable: 'test_output'
      });
      
      assert.strictEqual(validResult.isValid, true, 'Should be valid with required parameters');
      assert.strictEqual(validResult.errors.length, 0, 'Should have no errors with required parameters');
      
      return true;
    }
  },
  {
    id: 'parameter_validation_table_existence',
    name: 'Parameter Validation - Table Existence',
    type: 'unit',
    tags: ['validation', 'parameter_validation'],
    priority: 1,
    testFn: async () => {
      // Test with non-existent table
      const invalidTableResult = validateMatchingParameters({
        sourceTable: 'nonexistent_table',
        outputTable: 'test_output'
      });
      
      assert.strictEqual(invalidTableResult.isValid, false, 'Should be invalid with non-existent table');
      assert.ok(invalidTableResult.errors.some(e => e.code === 'TABLE_NOT_FOUND'), 
        'Should have TABLE_NOT_FOUND error');
      
      // Test with existing table
      const validTableResult = validateMatchingParameters({
        sourceTable: 'test_source',
        outputTable: 'test_output'
      });
      
      assert.strictEqual(validTableResult.isValid, true, 'Should be valid with existing table');
      
      return true;
    }
  },
  {
    id: 'parameter_validation_field_mappings',
    name: 'Parameter Validation - Field Mappings',
    type: 'unit',
    tags: ['validation', 'parameter_validation'],
    priority: 1,
    testFn: async () => {
      // Test with invalid field mapping
      const invalidFieldResult = validateMatchingParameters({
        sourceTable: 'test_source',
        outputTable: 'test_output',
        fieldMappings: {
          nonexistent_field: 'email'
        }
      });
      
      assert.strictEqual(invalidFieldResult.isValid, false, 'Should be invalid with nonexistent field');
      assert.ok(invalidFieldResult.errors.some(e => e.code === 'INVALID_FIELD_MAPPING'), 
        'Should have INVALID_FIELD_MAPPING error');
      
      // Test with valid field mapping
      const validFieldResult = validateMatchingParameters({
        sourceTable: 'test_source',
        outputTable: 'test_output',
        fieldMappings: {
          source_id: 'ref_id',
          email: 'email_address'
        }
      });
      
      assert.strictEqual(validFieldResult.isValid, true, 'Should be valid with valid field mapping');
      
      return true;
    }
  },
  {
    id: 'parameter_validation_threshold',
    name: 'Parameter Validation - Confidence Threshold',
    type: 'unit',
    tags: ['validation', 'parameter_validation'],
    priority: 1,
    testFn: async () => {
      // Test with invalid threshold
      const invalidThresholdResult = validateMatchingParameters({
        sourceTable: 'test_source',
        outputTable: 'test_output',
        confidenceThreshold: 1.5
      });
      
      assert.strictEqual(invalidThresholdResult.isValid, false, 'Should be invalid with threshold > 1');
      assert.ok(invalidThresholdResult.errors.some(e => e.code === 'INVALID_THRESHOLD'), 
        'Should have INVALID_THRESHOLD error');
      
      // Test with negative threshold
      const negativeThresholdResult = validateMatchingParameters({
        sourceTable: 'test_source',
        outputTable: 'test_output',
        confidenceThreshold: -0.5
      });
      
      assert.strictEqual(negativeThresholdResult.isValid, false, 'Should be invalid with threshold < 0');
      assert.ok(negativeThresholdResult.errors.some(e => e.code === 'INVALID_THRESHOLD'), 
        'Should have INVALID_THRESHOLD error');
      
      // Test with valid threshold
      const validThresholdResult = validateMatchingParameters({
        sourceTable: 'test_source',
        outputTable: 'test_output',
        confidenceThreshold: 0.8
      });
      
      assert.strictEqual(validThresholdResult.isValid, true, 'Should be valid with threshold between 0 and 1');
      
      return true;
    }
  },
  {
    id: 'parameter_validation_reference_tables',
    name: 'Parameter Validation - Reference Tables',
    type: 'unit',
    tags: ['validation', 'parameter_validation'],
    priority: 1,
    testFn: async () => {
      // Test with duplicate priorities
      const duplicatePriorityResult = validateMatchingParameters({
        sourceTable: 'test_source',
        outputTable: 'test_output',
        referenceTables: [
          { name: 'test_ref1', priority: 1 },
          { name: 'test_ref2', priority: 1 }
        ]
      });
      
      assert.strictEqual(duplicatePriorityResult.isValid, false, 'Should be invalid with duplicate priorities');
      assert.ok(duplicatePriorityResult.errors.some(e => e.code === 'DUPLICATE_PRIORITY'), 
        'Should have DUPLICATE_PRIORITY error');
      
      // Test with unique priorities
      const uniquePriorityResult = validateMatchingParameters({
        sourceTable: 'test_source',
        outputTable: 'test_output',
        referenceTables: [
          { name: 'test_ref1', priority: 1 },
          { name: 'test_ref2', priority: 2 }
        ]
      });
      
      assert.strictEqual(uniquePriorityResult.isValid, true, 'Should be valid with unique priorities');
      
      return true;
    }
  },
  {
    id: 'parameter_validation_max_depth',
    name: 'Parameter Validation - Max Depth',
    type: 'unit',
    tags: ['validation', 'parameter_validation'],
    priority: 1,
    testFn: async () => {
      // Test with invalid depth
      const invalidDepthResult = validateMatchingParameters({
        sourceTable: 'test_source',
        outputTable: 'test_output',
        maxDepth: 0
      });
      
      assert.strictEqual(invalidDepthResult.isValid, false, 'Should be invalid with maxDepth <= 0');
      assert.ok(invalidDepthResult.errors.some(e => e.code === 'INVALID_DEPTH'), 
        'Should have INVALID_DEPTH error');
      
      // Test with warning threshold
      const warningDepthResult = validateMatchingParameters({
        sourceTable: 'test_source',
        outputTable: 'test_output',
        maxDepth: 6
      });
      
      assert.strictEqual(warningDepthResult.isValid, true, 'Should be valid with high maxDepth');
      assert.ok(warningDepthResult.warnings.some(w => w.code === 'HIGH_DEPTH'), 
        'Should have HIGH_DEPTH warning');
      
      // Test with valid depth
      const validDepthResult = validateMatchingParameters({
        sourceTable: 'test_source',
        outputTable: 'test_output',
        maxDepth: 3
      });
      
      assert.strictEqual(validDepthResult.isValid, true, 'Should be valid with reasonable maxDepth');
      assert.strictEqual(validDepthResult.warnings.length, 0, 'Should have no warnings with reasonable maxDepth');
      
      return true;
    }
  },
  {
    id: 'parameter_validation_combined',
    name: 'Parameter Validation - Combined Parameters',
    type: 'unit',
    tags: ['validation', 'parameter_validation'],
    priority: 2,
    testFn: async () => {
      // Test with multiple invalid parameters
      const invalidCombinedResult = validateMatchingParameters({
        sourceTable: 'nonexistent_table',
        outputTable: 'test_output',
        confidenceThreshold: 1.5,
        maxDepth: 0
      });
      
      assert.strictEqual(invalidCombinedResult.isValid, false, 'Should be invalid with multiple issues');
      assert.ok(invalidCombinedResult.errors.length >= 2, 'Should have multiple errors');
      
      // Test with all valid parameters
      const validCombinedResult = validateMatchingParameters({
        sourceTable: 'test_source',
        outputTable: 'test_output',
        confidenceThreshold: 0.85,
        maxDepth: 3,
        referenceTables: [
          { name: 'test_ref1', priority: 1 },
          { name: 'test_ref2', priority: 2 }
        ],
        fieldMappings: {
          source_id: 'ref_id',
          email: 'email_address'
        }
      });
      
      assert.strictEqual(validCombinedResult.isValid, true, 'Should be valid with all valid parameters');
      assert.strictEqual(validCombinedResult.errors.length, 0, 'Should have no errors');
      assert.strictEqual(validCombinedResult.warnings.length, 0, 'Should have no warnings');
      
      return true;
    }
  }
];

module.exports = { tests }; 