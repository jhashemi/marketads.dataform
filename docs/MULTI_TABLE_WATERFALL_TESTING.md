# Multi-Table Waterfall Strategy Testing Guide

This document outlines the approach for testing the Multi-Table Waterfall matching strategy in the MarketAds Dataform project.

## Overview

The Multi-Table Waterfall strategy is a complex matching strategy that prioritizes matches based on reference table priority and match confidence. It supports multiple reference tables, each with its own priority, matching rules, field mappings, required fields, and confidence multipliers.

## Test Components

The integration tests for the Multi-Table Waterfall strategy are located in `tests/integration/multi_table_waterfall_tests.js`. They validate the following components:

1. **Basic Multi-Table Waterfall Test** (`multi_table_waterfall_basic_test`): Validates the core functionality of the strategy, including:
   - SQL generation for multiple reference tables
   - Proper prioritization of matches
   - Correct scoring calculations

2. **Field Mapping Test** (`multi_table_waterfall_field_mapping_test`): Validates that the strategy correctly handles field mappings between different tables.

3. **Confidence Test** (`multi_table_waterfall_confidence_test`): Validates that the strategy applies confidence multipliers per reference table.

4. **Required Fields Test** (`multi_table_waterfall_required_fields_test`): Validates that the strategy correctly enforces required fields for matches.

5. **Multiple Matches Test** (`multi_table_waterfall_multiple_matches_test`): Validates that the strategy can return multiple matches per source record.

6. **Large Scale Test** (`multi_table_waterfall_large_scale_test`): Combines all the above features to validate that they work together.

## Factory Pattern Implementation

The tests now use a factory pattern for creating and executing multi-table waterfall tests. This approach provides several benefits:

1. **Standardized Test Structure**: All tests follow a consistent pattern, making them easier to understand and maintain.
2. **Default Parameters**: Common test parameters are defined once and reused across tests.
3. **Parameter Validation**: The factory validates required parameters before executing tests.
4. **Specialized Validators**: Validator functions for specific test cases ensure comprehensive validation.

### Using the Multi-Table Test Factory

The factory is implemented in `tests/helpers/multi_table_test_factory.js` and includes:

- `MultiTableTestFactory`: Class for creating multi-table waterfall tests
- `DEFAULT_TEST_PARAMETERS`: Default parameters for multi-table waterfall tests

#### Basic Usage

```javascript
const { MultiTableTestFactory } = require('../helpers/multi_table_test_factory');
const { validateBasicMultiTableStructure } = require('../helpers/multi_table_validators');

// Create test factory instance
const multiTableTestFactory = new MultiTableTestFactory();

// Create a basic test
test('My Multi-Table Test', {
  type: TestType.INTEGRATION,
  id: 'my_multi_table_test',
  priority: 1,
  parameters: {
    sourceTable: "my_source_table"
  }
}, multiTableTestFactory.createTest({}, validateBasicMultiTableStructure));
```

#### Custom Test Parameters

You can override default parameters by specifying them in the test parameters:

```javascript
test('Custom Multi-Table Test', {
  type: TestType.INTEGRATION,
  id: 'custom_multi_table_test',
  priority: 1,
  parameters: {
    sourceTable: "custom_source_table",
    thresholds: {
      high: 0.9,
      medium: 0.75,
      low: 0.6
    },
    allowMultipleMatches: true,
    maxMatches: 3
  }
}, multiTableTestFactory.createTest({}, validateMultipleMatches));
```

#### Custom Validation

You can create custom validation functions or use the built-in validators from `tests/helpers/multi_table_validators.js`:

```javascript
test('Custom Validation Test', {
  type: TestType.INTEGRATION,
  id: 'custom_validation_test',
  priority: 1,
  parameters: {
    sourceTable: "custom_source_table"
  }
}, multiTableTestFactory.createTest({}, (sql, params) => {
  // Basic validation
  validateBasicMultiTableStructure(sql, params);
  
  // Custom validations
  expect(sql.includes('my_specific_condition')).toBe(true);
  
  return {
    success: true,
    message: 'Custom validation passed'
  };
}));
```

### Available Validators

The following validators are available in `tests/helpers/multi_table_validators.js`:

- `validateBasicMultiTableStructure`: Validates basic structure of multi-table waterfall SQL
- `validateFieldMapping`: Validates field mapping in multi-table waterfall SQL
- `validateConfidenceMultipliers`: Validates confidence multipliers in multi-table waterfall SQL
- `validateRequiredFields`: Validates required fields in multi-table waterfall SQL
- `validateMultipleMatches`: Validates multiple matches in multi-table waterfall SQL
- `validateComprehensive`: Comprehensive validation of all aspects of multi-table waterfall SQL

## Adding New Tests

To add a new multi-table waterfall test:

1. Import the factory and validators:
```javascript
const { MultiTableTestFactory } = require('../helpers/multi_table_test_factory');
const { validateBasicMultiTableStructure } = require('../helpers/multi_table_validators');
```

2. Create a test factory instance:
```javascript
const multiTableTestFactory = new MultiTableTestFactory();
```

3. Define the test using the factory:
```javascript
test('My New Test', {
  type: TestType.INTEGRATION,
  id: 'my_new_test',
  priority: 1,
  dependencies: ['multi_table_waterfall_basic_test'], // Optional dependencies
  parameters: {
    sourceTable: "my_source_table",
    // Additional parameters as needed
  }
}, multiTableTestFactory.createTest({}, validateBasicMultiTableStructure));
```

## Running Tests

To run the multi-table waterfall tests:

```bash
node scripts/run_tests.js --test multi_table_waterfall
```

To run a specific test:

```bash
node scripts/run_tests.js --test multi_table_waterfall_basic_test
```

## Best Practices

1. **Use the Factory Pattern**: Always use the `MultiTableTestFactory` for creating tests.
2. **Standardize Parameters**: Use the default parameters unless you need specific overrides.
3. **Validate Thoroughly**: Choose the appropriate validator for your test case.
4. **Document Test Purpose**: Include clear comments and descriptions for each test.
5. **Follow Dependencies**: Structure test dependencies logically, with basic tests as prerequisites.
6. **Keep Tests Focused**: Each test should validate a specific aspect of the strategy.

## Implementation Details

### Factory Pattern

The `MatchStrategyFactory` class is used to create instances of the `MultiTableWaterfallStrategy` class. This allows for consistent instantiation and configuration of the strategy.

```javascript
// Import as a class
const { MatchStrategyFactory } = require('../../includes/match_strategy_factory');

// Create an instance
const matchStrategyFactory = new MatchStrategyFactory();

// Create strategy with options
const strategy = matchStrategyFactory.createMultiTableWaterfallStrategy({
  referenceTables: parameters.referenceTables,
  matchingRules: parameters.matchingRules,
  thresholds: parameters.thresholds,
  // Additional options as needed
  fieldMappings: parameters.fieldMappings,
  requiredFields: parameters.requiredFields,
  confidenceMultipliers: parameters.confidenceMultipliers
});
```

### Field Mappings

Field mappings should be provided as an object with reference table IDs as keys and arrays of mapping objects as values:

```javascript
fieldMappings: {
  'verified_customers': [
    { sourceField: 'first_name', targetField: 'first_name_mapped' },
    { sourceField: 'last_name', targetField: 'last_name_mapped' },
    { sourceField: 'email', targetField: 'email_mapped' }
  ],
  'crm_customers': [
    { sourceField: 'fname', targetField: 'first_name_mapped' },
    { sourceField: 'lname', targetField: 'last_name_mapped' },
    { sourceField: 'phone_number', targetField: 'phone_mapped' }
  ]
}
```

### Required Fields

Required fields should be provided as an object with reference table IDs as keys and arrays of field names as values:

```javascript
requiredFields: {
  'verified_customers': ['email'],
  'crm_customers': ['phone']
}
```

### Confidence Multipliers

Confidence multipliers should be provided as an object with reference table IDs as keys and numeric multiplier values as values:

```javascript
confidenceMultipliers: {
  'verified_customers': 1.2,
  'crm_customers': 0.9
}
```

## Testing Approach

The tests validate the SQL generated by the strategy, checking for specific patterns that indicate correct implementation:

1. **Reference Tables**: SQL should include JOINs for all reference tables
2. **Prioritization**: SQL should include ORDER BY clauses for proper prioritization
3. **Scoring**: SQL should include match score calculations
4. **Field Mappings**: SQL should reference mapped field names
5. **Required Fields**: SQL should include conditions to check for required fields
6. **Confidence Multipliers**: SQL should include confidence calculations

## Troubleshooting

If tests fail with "Cannot read properties of undefined" errors, check:

1. Parameter passing: Ensure parameters are correctly passed to the strategy
2. Class instantiation: Make sure to instantiate the `MatchStrategyFactory` class
3. Field format: Check that field mappings, required fields, and confidence multipliers have the correct format

When testing required fields or confidence multipliers, use flexible validation patterns as the exact implementation details (like SQL query structure) might change over time. 