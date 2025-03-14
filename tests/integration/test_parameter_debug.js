/**
 * Debug file to understand how parameters are passed to tests
 */

// Import Jest adapter
require('../../includes/validation/jest_adapter');

const { TestType, TestPriority } = require('../../includes/validation/validation_registry');
const { withErrorHandling } = require('../../includes/validation/error_handler');

// Test to check parameters
describe('Parameter Debug', () => {
  test('Debug Test Parameters', { 
    type: TestType.INTEGRATION,
    parameters: {
      sourceTable: 'debug_source_table',
      targetTable: 'debug_target_table',
      testConfig: {
        nested: 'value'
      }
    }
  }, withErrorHandling(function(context) {
    // Log the context object
    console.log('DEBUG TEST: Context object received:');
    console.log(JSON.stringify(context, null, 2));
    
    // Check if parameters are defined
    console.log('DEBUG TEST: Are parameters defined?', !!context.parameters);
    
    if (context.parameters) {
      console.log('DEBUG TEST: Parameters content:');
      console.log(JSON.stringify(context.parameters, null, 2));
    }
    
    return { passed: true };
  }));
});

// Legacy export format for comparison
exports.tests = [
  {
    id: 'debug_test_legacy',
    name: 'Debug Test Legacy Format',
    description: 'Tests how parameters are passed in legacy format',
    type: TestType.INTEGRATION,
    priority: TestPriority.HIGH,
    parameters: {
      sourceTable: 'legacy_source_table',
      targetTable: 'legacy_target_table',
      testConfig: {
        nested: 'legacy_value'
      }
    },
    testFn: async (context) => {
      // Log the context object
      console.log('DEBUG LEGACY TEST: Context object received:');
      console.log(JSON.stringify(context, null, 2));
      
      // Check if parameters are defined
      console.log('DEBUG LEGACY TEST: Are parameters defined?', !!context.parameters);
      
      if (context.parameters) {
        console.log('DEBUG LEGACY TEST: Parameters content:');
        console.log(JSON.stringify(context.parameters, null, 2));
      }
      
      return { passed: true };
    }
  }
]; 