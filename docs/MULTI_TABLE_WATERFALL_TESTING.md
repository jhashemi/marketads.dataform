# Multi-Table Waterfall Strategy Testing Guide

This document provides a comprehensive guide for testing the Multi-Table Waterfall matching strategy in the MarketAds Dataform project.

## Overview

The Multi-Table Waterfall strategy is a complex matching strategy that prioritizes matches based on reference table priority and match confidence. It supports multiple reference tables, each with its own priority, matching rules, field mappings, required fields, and confidence multipliers.

## Recent Updates

As of the latest update, the multi-table waterfall tests have been significantly enhanced:

1. **Improved Error Handling**: The test factory now has robust error handling, with detailed error messages and validation checks.
2. **Enhanced Parameter Validation**: Comprehensive validation of test parameters, including required fields, types, and format checks.
3. **Better Debug Support**: Added debug logging to help troubleshoot test failures.
4. **More Flexible Test Structure**: Tests can now be created with minimal configuration, with reasonable defaults.
5. **Standardized Validation**: Validators have been updated to provide consistent and detailed validation of SQL outputs.

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

#### Advanced Usage with Custom Parameters

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
    maxMatches: 3,
    fieldMappings: {
      verified_customers: [
        { sourceField: "first_name", targetField: "first_name_custom" },
        { sourceField: "last_name", targetField: "last_name_custom" }
      ]
    },
    requiredFields: {
      verified_customers: ["email", "first_name"]
    },
    confidenceMultipliers: {
      verified_customers: 1.5,
      crm_customers: 0.75
    }
  }
}, multiTableTestFactory.createTest({}, validateComprehensive));
```

### Available Validators

The following validators are available in `tests/helpers/multi_table_validators.js`:

- `validateBasicMultiTableStructure`: Validates basic structure of multi-table waterfall SQL
- `validateFieldMapping`: Validates field mapping in multi-table waterfall SQL
- `validateConfidenceMultipliers`: Validates confidence multipliers in multi-table waterfall SQL
- `validateRequiredFields`: Validates required fields in multi-table waterfall SQL
- `validateMultipleMatches`: Validates multiple matches in multi-table waterfall SQL
- `validateComprehensive`: Comprehensive validation of all aspects of multi-table waterfall SQL

### Creating Custom Validators

You can create custom validation functions to check specific aspects of the generated SQL:

```javascript
function validateCustomFeature(sql, params) {
  try {
    // First validate basic structure
    const basicValidation = validateBasicMultiTableStructure(sql, params);
    if (!basicValidation.success) {
      return basicValidation;
    }
    
    // Custom validation logic
    if (!sql.includes('my_special_feature')) {
      throw new Error('SQL must include my_special_feature');
    }
    
    return {
      success: true,
      message: 'Custom feature validation passed'
    };
  } catch (error) {
    return {
      success: false,
      message: error.message,
      error
    };
  }
}
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

To generate a test report:

```bash
node scripts/run_tests.js --test multi_table_waterfall --report
```

## Best Practices

1. **Use the Factory Pattern**: Always use the `MultiTableTestFactory` for creating tests.
2. **Standardize Parameters**: Use the default parameters unless you need specific overrides.
3. **Validate Thoroughly**: Choose the appropriate validator for your test case.
4. **Document Test Purpose**: Include clear comments and descriptions for each test.
5. **Follow Dependencies**: Structure test dependencies logically, with basic tests as prerequisites.
6. **Keep Tests Focused**: Each test should validate a specific aspect of the strategy.
7. **Debug with Logging**: Use the built-in debug logging to troubleshoot test failures.
8. **Regular Maintenance**: Update tests as the strategy evolves to ensure ongoing compatibility.

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

### Common Issues

1. **Missing Parameters**: Check if you've provided all required parameters for the test.
2. **Type Errors**: Make sure parameter types match the expected types (e.g., thresholds are numbers).
3. **Invalid Reference Tables**: Ensure reference tables have the required properties (id, table, priority).
4. **Missing Matching Rules**: Make sure matching rules are defined for all reference tables.
5. **SQL Generation Failure**: Check for syntax errors or invalid parameters in the SQL generation.

### Debug Logging

The test factory includes debug logging that can help identify issues:

```
DEBUG LEGACY TEST: Context object received: {...}
DEBUG LEGACY TEST: Are parameters defined? true
DEBUG LEGACY TEST: Parameters content: {...}
```

If you see errors in the debug output, check the following:

1. **Parameter Structure**: Ensure parameters have the correct structure and types.
2. **Factory Options**: Check factory options (useClassBasedFactoryPattern should be true).
3. **SQL Validation**: Look for validation errors in the SQL output.

## Conclusion

The Multi-Table Waterfall Strategy testing framework provides a comprehensive way to validate this complex matching strategy. By using the factory pattern, validators, and test utilities, you can ensure that changes to the strategy are thoroughly tested and maintain compatibility with existing functionality. 