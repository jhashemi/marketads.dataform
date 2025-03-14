# Class-Based Factory Pattern Implementation

## Overview

This document describes the implementation of the Class-Based Factory Pattern in the MarketAds Dataform project. The pattern provides a standardized way to create and manage instances of key classes used in the matching system.

## Implemented Components

### Core Classes

1. **MatchingSystem**
   - Purpose: Executes matching operations between source and target tables
   - Key methods: `executeMatching()`, `generateSql()`
   - Location: `includes/matching_system.js`

2. **HistoricalMatcher**
   - Purpose: Executes incremental matches with historical data
   - Key methods: `executeMatching()`, `generateSql()`, `generateHistoricalMatchSql()`
   - Location: `includes/historical_matcher.js`

### Factory Classes

1. **MatchingSystemFactory**
   - Purpose: Creates instances of MatchingSystem with appropriate configuration
   - Key methods: `createMatchingSystem(options)`
   - Location: `includes/matching_system_factory.js`

2. **HistoricalMatcherFactory**
   - Purpose: Creates instances of HistoricalMatcher with appropriate configuration
   - Key methods: `createHistoricalMatcher(options)`
   - Location: `includes/historical_matcher_factory.js`

3. **MatchStrategyFactory**
   - Purpose: Creates instances of matching strategies based on requirements
   - Key methods: `createStrategy(type, options)`
   - Location: `includes/match_strategy_factory.js`

### Test Infrastructure

1. **Factory Pattern Test**
   - Purpose: Verifies the basic functionality of the factory pattern
   - Location: `tests/integration/factory_pattern_test.js`

2. **Test Helpers**
   - Purpose: Provides standardized functions for creating test configurations
   - Key functions: `createWaterfallTestConfig()`, `createMatchingSystemTestFn()`, etc.
   - Location: `includes/validation/test_helpers.js`

## Usage

### Creating a MatchingSystem

```javascript
const { MatchingSystemFactory } = require('./includes/matching_system_factory');

const factory = new MatchingSystemFactory();
const matchingSystem = factory.createMatchingSystem({
  sourceTable: 'customer_data',
  targetTables: ['reference_data'],
  outputTable: 'match_results'
});

const results = await matchingSystem.executeMatching();
```

### Creating a HistoricalMatcher

```javascript
const { HistoricalMatcherFactory } = require('./includes/historical_matcher_factory');

const factory = new HistoricalMatcherFactory();
const historicalMatcher = factory.createHistoricalMatcher({
  sourceTable: 'customer_data',
  targetTables: ['reference_data'],
  outputTable: 'match_results',
  incrementalMode: true,
  timestampColumn: 'last_updated'
});

const results = await historicalMatcher.executeMatching();
```

## Remaining Work

The following items still need to be addressed:

1. **Implement Missing Functionality**
   - Transitive closure matching
   - Multi-table waterfall matching
   - Performance utilities

2. **Update Existing Tests**
   - Update test parameters to work with the new class-based approach
   - Fix test data initialization

3. **Documentation**
   - Add JSDoc comments to all classes and methods
   - Create examples for common use cases

4. **Error Handling**
   - Standardize error handling across all classes
   - Implement validation for required parameters

## Migration Guide

For existing code that needs to be migrated to the new class-based factory pattern:

1. Replace direct instantiation:
   ```javascript
   // Old approach
   const matcher = createMatcher(options);
   
   // New approach
   const factory = new MatchingSystemFactory();
   const matcher = factory.createMatchingSystem(options);
   ```

2. Update test functions:
   ```javascript
   // Old approach
   function testMatching(params) {
     const matcher = createMatcher(params);
     return matcher.execute();
   }
   
   // New approach
   function testMatching(params) {
     const factory = new MatchingSystemFactory();
     const matcher = factory.createMatchingSystem(params);
     return matcher.executeMatching();
   }
   ```

## Conclusion

The Class-Based Factory Pattern provides a more maintainable and extensible approach to creating and managing the core components of the matching system. By standardizing the creation process, we can ensure consistent behavior across the application and make it easier to test and extend the system in the future.