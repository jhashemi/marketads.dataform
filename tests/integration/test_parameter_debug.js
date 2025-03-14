/**
 * Debug file to understand how parameters are passed to tests
 * Includes standardized factory pattern parameters
 */

// Import Jest adapter
require('../../includes/validation/jest_adapter');

const { TestType, TestPriority } = require('../../includes/validation/validation_registry');
const { withErrorHandling } = require('../../includes/validation/error_handler');
const { MatchingSystemFactory } = require('../../includes/matching_system_factory');
const { HistoricalMatcherFactory } = require('../../includes/historical_matcher_factory');
const { MatchStrategyFactory } = require('../../includes/match_strategy_factory');

// Test to check factory pattern parameters
describe('Parameter Debug with Factory Pattern', () => {
  test('Debug Factory Pattern Parameters', { 
    type: TestType.INTEGRATION,
    parameters: {
      sourceTable: 'debug_source_table',
      targetTable: 'debug_target_table',
      factoryOptions: {
        useClassBasedFactoryPattern: true,
        matchingSystemFactory: 'MatchingSystemFactory',
        historicalMatcherFactory: 'HistoricalMatcherFactory',
        matchStrategyFactory: 'MatchStrategyFactory'
      },
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
      
      // Create factories if using factory pattern
      if (context.parameters.factoryOptions?.useClassBasedFactoryPattern) {
        const matchingSystemFactory = new MatchingSystemFactory();
        const historicalMatcherFactory = new HistoricalMatcherFactory();
        const matchStrategyFactory = new MatchStrategyFactory();
        
        console.log('DEBUG TEST: Created factories successfully');
        
        // Create instances with factories
        const matchingSystem = matchingSystemFactory.create({
          sourceTable: context.parameters.sourceTable,
          targetTable: context.parameters.targetTable
        });
        
        console.log('DEBUG TEST: Created matchingSystem successfully:', 
          matchingSystem ? 'YES' : 'NO');
      }
    }
    
    return { passed: true };
  }));
});

// Updated legacy export format with factory pattern
exports.tests = [
  {
    id: 'debug_test_factory_pattern',
    name: 'Debug Test Factory Pattern Format',
    description: 'Tests parameter passing with factory pattern implementation',
    type: TestType.INTEGRATION,
    priority: TestPriority.HIGH,
    parameters: {
      sourceTable: 'factory_source_table',
      targetTable: 'factory_target_table',
      factoryOptions: {
        useClassBasedFactoryPattern: true
      },
      testConfig: {
        nested: 'factory_value'
      }
    },
    testFn: async (context) => {
      // Log the context object
      console.log('DEBUG FACTORY TEST: Context object received:');
      console.log(JSON.stringify(context, null, 2));
      
      // Create instances with factories
      if (context.parameters.factoryOptions?.useClassBasedFactoryPattern) {
        const matchingSystemFactory = new MatchingSystemFactory();
        console.log('DEBUG FACTORY TEST: Created factory successfully');
      }
      
      return { passed: true };
    }
  }
]; 