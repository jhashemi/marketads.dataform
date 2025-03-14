# Class-Based Factory Pattern for Testing

## Overview

The Class-Based Factory Pattern is a design pattern implemented in our testing infrastructure to ensure consistent instantiation of key classes across tests. This pattern helps maintain test reliability by providing a standardized way to create and configure instances of core system components.

## Key Components

### 1. Factory Classes

- **MatchStrategyFactory**: Creates and configures instances of matching strategies
- **MatchingSystemFactory**: Creates and configures instances of the MatchingSystem class
- **HistoricalMatcherFactory**: Creates and configures instances of the HistoricalMatcher class

### 2. Helper Functions

The `test_helpers.js` module provides standardized functions for creating test configurations and test functions:

- `createWaterfallTestConfig`: Creates a standardized configuration for waterfall tests
- `createWaterfallTestFn`: Creates a test function for waterfall strategy tests
- `createMultiTableWaterfallTestFn`: Creates a test function for multi-table waterfall strategy tests
- `createMatchingSystemTestFn`: Creates a test function for matching system tests
- `createHistoricalMatcherTestFn`: Creates a test function for historical matcher tests

## Implementation

### Factory Initialization

The test runner initializes factory classes during the framework initialization phase:

```javascript
function ensureClassBasedFactoryPattern() {
  try {
    // Import factory classes
    const { MatchStrategyFactory } = require('../includes/match_strategies/match_strategy_factory');
    const { MatchingSystemFactory } = require('../includes/matching/matching_system_factory');
    const { HistoricalMatcherFactory } = require('../includes/matching/historical_matcher_factory');
    
    // Create global factory instances
    global.matchStrategyFactory = new MatchStrategyFactory();
    global.matchingSystemFactory = new MatchingSystemFactory();
    global.historicalMatcherFactory = new HistoricalMatcherFactory();
    
    console.log('Class-based factory pattern initialized successfully.');
  } catch (error) {
    console.error('Error initializing class-based factory pattern:', error.message);
    throw error;
  }
}
```

### Test Helper Usage

Test files can use the helper functions to create standardized tests:

```javascript
const {
  createWaterfallTestConfig,
  createMultiTableWaterfallTestFn
} = require('../../includes/validation/test_helpers');

// Create test configuration
const waterfallTestConfig = createWaterfallTestConfig({
  sourceTable: 'test_customer_data',
  referenceTables: [
    // Reference table configurations
  ],
  // Other configuration options
});

// Export tests
exports.tests = [
  {
    id: 'standardized_waterfall_test',
    name: 'Standardized Multi-Table Waterfall Test',
    description: 'Tests the multi-table waterfall strategy using the standardized test helpers',
    type: TestType.INTEGRATION,
    priority: TestPriority.HIGH,
    parameters: waterfallTestConfig,
    testFn: createMultiTableWaterfallTestFn(validateJoins)
  }
];
```

## Benefits

1. **Consistency**: Ensures all tests use the same instantiation pattern for core classes
2. **Maintainability**: Centralizes class creation logic, making it easier to update
3. **Error Reduction**: Prevents common errors related to class instantiation
4. **Standardization**: Provides a consistent structure for test configurations
5. **Reusability**: Enables sharing of test logic across different test files

## Best Practices

1. Always use the factory classes to create instances of core system components
2. Use the helper functions in `test_helpers.js` to create standardized tests
3. Follow the standardized parameter format for test configurations
4. Implement custom validators as needed for specific test requirements
5. Keep test functions focused on validating specific behaviors

## Example: Standardized Test Structure

```javascript
// Import test helpers
const {
  createWaterfallTestConfig,
  createMultiTableWaterfallTestFn
} = require('../../includes/validation/test_helpers');

// Create test configuration
const testConfig = createWaterfallTestConfig({
  // Configuration parameters
});

// Create custom validator
function validateSpecificBehavior(sql, parameters) {
  // Validation logic
  return {
    passed: true,
    message: 'Validation passed'
  };
}

// Export tests
exports.tests = [
  {
    id: 'my_test',
    name: 'My Test',
    description: 'Tests specific behavior',
    type: TestType.INTEGRATION,
    priority: TestPriority.HIGH,
    parameters: testConfig,
    testFn: createMultiTableWaterfallTestFn(validateSpecificBehavior)
  }
];
``` 