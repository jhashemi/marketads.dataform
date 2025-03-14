# Integration Testing Strategy

## Overview

This document outlines the integration testing strategy for the MarketAds Matching System. Integration tests validate the interactions between multiple components and ensure that the system works correctly as a whole, focusing particularly on SQL generation patterns and execution.

## Test Categories

Our integration tests focus on several key areas:

1. **Matching Strategies**: Tests for waterfall, multi-table waterfall, and other matching approaches
2. **Transitive Closure**: Tests for identifying indirect relationships between records
3. **Incremental Processing**: Tests for handling data updates efficiently
4. **End-to-End Matching**: Tests for complete matching pipelines from raw data to final matches
5. **Multi-Table Workflows**: Tests for operations spanning multiple tables

## Testing Approach

### SQL Validation

Integration tests primarily validate the SQL generation patterns rather than actual data processing:

1. **Structure Validation**: Checks for the presence of expected SQL components (CTEs, joins, etc.)
2. **Logic Validation**: Ensures that business logic is correctly translated to SQL
3. **SQL Compilation**: Verifies that generated SQL is valid and compiles correctly
4. **Query Organization**: Confirms proper organization of complex queries

### Dependency Management

Tests express dependencies on other tests to ensure proper execution order:

```javascript
test('Multi-Table Waterfall Strategy', { 
  type: TestType.INTEGRATION,
  dependencies: ['basic_waterfall_strategy'],
  // other parameters
}, () => {
  // Test implementation
});
```

### Test Parameters

Tests accept parameters that configure their behavior:

```javascript
{
  referenceTables: [
    { id: 'verified_customers', table: 'verified_customers', priority: 1 }
    // Other tables
  ],
  matchingRules: {
    // Matching rules configuration
  },
  fieldMappings: {
    // Field mapping configuration
  }
}
```

## Test Implementation

### Using the Jest Adapter

Integration tests use the Jest adapter for simplified test definition:

```javascript
require('../../includes/validation/jest_adapter');

describe('Waterfall Strategy', () => {
  test('Basic Waterfall Strategy', { 
    type: TestType.INTEGRATION,
    parameters: { /* test parameters */ }
  }, () => {
    // Test implementation
  });
});
```

### Validation Functions

Tests typically follow this pattern:

1. **Setup**: Configure the component being tested with appropriate parameters
2. **Execution**: Generate SQL or perform the operation being tested
3. **Validation**: Verify the results meet expectations
4. **Reporting**: Return detailed validation results for reporting

## Test Files

Integration tests are located in the `tests/integration/` directory:

- `waterfall_strategy_tests.js`: Tests for the basic and multi-table waterfall strategies
- `transitive_closure_tests.js`: Tests for identifying relationships between indirectly related records
- `multi_table_waterfall_tests.js`: Tests specifically focused on multi-table waterfall operations
- `incremental_processing_tests.js`: Tests for incremental data processing
- `end_to_end_matching_tests.js`: Complete end-to-end tests for the matching pipeline

## Running Integration Tests

Integration tests can be run using the test runner script:

```
node scripts/run_tests.js --type integration
```

## Reporting

Integration test results are included in test reports and can be viewed in HTML format:

```
node scripts/run_tests.js --report
```

## Migration Strategy

We are gradually migrating integration tests to use the Jest adapter for improved readability and maintainability:

1. **Legacy Format**: Tests initially use a custom registration format
2. **Dual Format**: During migration, tests maintain both Jest format and legacy exports
3. **Jest Format**: The end goal is to have all tests using the Jest format exclusively

## Conclusion

Our integration testing strategy ensures that components work together correctly, focusing on SQL generation patterns rather than actual data processing. By using Jest syntax with our custom validation registry, we maintain a balance between developer familiarity and the specific needs of our Dataform-based system. 