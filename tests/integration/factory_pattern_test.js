/**
 * Factory Pattern Test
 * 
 * Tests the basic functionality of the factory pattern
 */

const { TestType, TestPriority } = require('../../includes/validation/validation_registry');
const { MatchStrategyFactory } = require('../../includes/match_strategy_factory');
const { MatchingSystemFactory } = require('../../includes/matching_system_factory');
const { HistoricalMatcherFactory } = require('../../includes/historical_matcher_factory');

// Test function for factory class instantiation
async function testFactoryInstantiation(context) {
  console.log('Testing factory class instantiation...');
  
  try {
    // Create factory instances
    const matchStrategyFactory = new MatchStrategyFactory();
    const matchingSystemFactory = new MatchingSystemFactory();
    const historicalMatcherFactory = new HistoricalMatcherFactory();
    
    // Verify the factories exist
    if (!matchStrategyFactory) {
      throw new Error('Failed to create MatchStrategyFactory');
    }
    
    if (!matchingSystemFactory) {
      throw new Error('Failed to create MatchingSystemFactory');
    }
    
    if (!historicalMatcherFactory) {
      throw new Error('Failed to create HistoricalMatcherFactory');
    }
    
    // Test creating instances from factories
    const matchingSystem = matchingSystemFactory.createMatchingSystem({
      sourceTable: 'test_table',
      targetTables: ['reference_table'],
      outputTable: 'output_table'
    });
    
    const historicalMatcher = historicalMatcherFactory.createHistoricalMatcher({
      sourceTable: 'base_table',
      targetTables: ['reference_table'],
      outputTable: 'output_table',
      incrementalMode: true
    });
    
    // Verify the instances exist and have the expected properties
    if (!matchingSystem || !matchingSystem.sourceTable) {
      throw new Error('Failed to create MatchingSystem instance');
    }
    
    if (!historicalMatcher || !historicalMatcher.sourceTable) {
      throw new Error('Failed to create HistoricalMatcher instance');
    }
    
    return {
      passed: true,
      message: 'Factory pattern test succeeded'
    };
  } catch (error) {
    return {
      passed: false,
      message: `Factory pattern test failed: ${error.message}`
    };
  }
}

// Export tests
exports.tests = [
  {
    id: 'factory_pattern_test',
    name: 'Factory Pattern Test',
    description: 'Tests the basic functionality of the factory pattern',
    type: TestType.INTEGRATION,
    priority: TestPriority.HIGH,
    parameters: {},
    testFn: testFactoryInstantiation
  }
]; 