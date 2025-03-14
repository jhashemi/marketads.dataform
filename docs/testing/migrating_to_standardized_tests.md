# Migrating to Standardized Tests

This guide provides step-by-step instructions for migrating existing tests to the new standardized test format that implements the Class-Based Factory Pattern.

## Why Migrate?

Migrating to the standardized test format offers several benefits:

1. **Improved Reliability**: Tests become more resilient to changes in class implementations
2. **Reduced Duplication**: Common test setup logic is centralized
3. **Consistent Structure**: All tests follow the same pattern, making them easier to understand
4. **Better Error Handling**: Standardized error handling improves test diagnostics
5. **Easier Maintenance**: Updates to test infrastructure only need to be made in one place

## Migration Steps

### 1. Identify Test Type

First, determine which type of test you're migrating:

- **Multi-Table Waterfall Strategy Test**: Tests for the multi-table waterfall matching strategy
- **Matching System Test**: Tests for the end-to-end matching system
- **Historical Matcher Test**: Tests for incremental processing with historical data

### 2. Convert Test Configuration

#### For Multi-Table Waterfall Strategy Tests:

```javascript
// Before
const testParameters = {
  sourceTable: 'test_customer_data',
  referenceTables: {
    verified_customers: {
      table: 'verified_customers',
      priority: 1,
      keyField: 'customer_id'
    },
    crm_customers: {
      table: 'crm_customers',
      priority: 2,
      keyField: 'customer_id'
    }
  },
  // Other parameters...
};

// After
const { createWaterfallTestConfig } = require('../../includes/validation/test_helpers');

const testConfig = createWaterfallTestConfig({
  sourceTable: 'test_customer_data',
  referenceTables: [
    {
      id: 'verified_customers',
      table: 'verified_customers',
      priority: 1,
      name: 'Verified Customers',
      keyField: 'customer_id'
    },
    {
      id: 'crm_customers',
      table: 'crm_customers',
      priority: 2,
      name: 'CRM Customers',
      keyField: 'customer_id'
    }
  ],
  // Other parameters...
});
```

#### For Matching System Tests:

```javascript
// Before
const testParameters = {
  sourceTable: 'test_customer_data',
  referenceTable: 'verified_customers',
  expectedMatchCount: 75
};

// After
// No conversion needed, use the original parameters
```

#### For Historical Matcher Tests:

```javascript
// Before
const testParameters = {
  baseTable: 'test_base_customers',
  referenceTable: 'verified_customers',
  expectedMatchRate: 0.7
};

// After
// No conversion needed, use the original parameters
```

### 3. Convert Test Function

#### For Multi-Table Waterfall Strategy Tests:

```javascript
// Before
async function testFn(context) {
  const { parameters } = context;
  
  // Create strategy instance
  const strategy = new MultiTableWaterfallStrategy(parameters);
  
  // Generate SQL
  const sql = strategy.generateSQL();
  
  // Validate SQL
  if (!sql.includes('JOIN verified_customers')) {
    throw new Error('Missing JOIN for verified_customers');
  }
  
  return {
    passed: true,
    message: 'SQL generation successful'
  };
}

// After
const { createMultiTableWaterfallTestFn } = require('../../includes/validation/test_helpers');

function validateJoins(sql, parameters) {
  // Check for JOINs for all reference tables
  for (const refTable of parameters.referenceTables) {
    if (!sql.includes(`JOIN ${refTable.table}`)) {
      throw new Error(`Missing JOIN for reference table: ${refTable.table}`);
    }
  }
  
  return {
    passed: true,
    message: 'All reference tables found in SQL JOINs'
  };
}

const testFn = createMultiTableWaterfallTestFn(validateJoins);
```

#### For Matching System Tests:

```javascript
// Before
async function testFn(context) {
  const { parameters } = context;
  
  // Create matching system
  const matchingSystem = new MatchingSystem({
    sourceTable: parameters.sourceTable,
    referenceTable: parameters.referenceTable
  });
  
  // Execute matching
  const results = await matchingSystem.executeMatching();
  
  // Validate results
  const matchRate = results.matchedRecords / results.totalRecords;
  const expectedRate = parameters.expectedMatchCount / 100;
  
  return {
    passed: matchRate >= expectedRate,
    message: `Match rate: ${matchRate * 100}%`
  };
}

// After
const { createMatchingSystemTestFn } = require('../../includes/validation/test_helpers');

const testFn = createMatchingSystemTestFn(async (matchingSystem, context) => {
  const { parameters } = context;
  
  // Execute matching
  const results = await matchingSystem.executeMatching();
  
  // Calculate match rate
  const matchRate = results.matchedRecords / results.totalRecords;
  const expectedRate = parameters.expectedMatchCount / 100;
  
  return {
    passed: matchRate >= expectedRate,
    message: matchRate >= expectedRate
      ? `Successfully matched ${matchRate * 100}% of records (target: ${parameters.expectedMatchCount}%)`
      : `Failed to meet match rate target: ${(matchRate * 100).toFixed(2)}% vs ${parameters.expectedMatchCount}% expected`
  };
});
```

#### For Historical Matcher Tests:

```javascript
// Before
async function testFn(context) {
  const { parameters } = context;
  
  // Create historical matcher
  const historicalMatcher = new HistoricalMatcher({
    baseTable: parameters.baseTable,
    referenceTable: parameters.referenceTable
  });
  
  // Execute matching
  const results = await historicalMatcher.executeMatching();
  
  // Validate results
  const matchRate = results.matchedRecords / results.totalRecords;
  
  return {
    passed: matchRate >= parameters.expectedMatchRate,
    message: `Match rate: ${matchRate * 100}%`
  };
}

// After
const { createHistoricalMatcherTestFn } = require('../../includes/validation/test_helpers');

const testFn = createHistoricalMatcherTestFn(async (historicalMatcher, context) => {
  const { parameters } = context;
  
  // Execute matching
  const results = await historicalMatcher.executeMatching();
  
  // Calculate match rate
  const matchRate = results.matchedRecords / results.totalRecords;
  const expectedRate = parameters.expectedMatchRate;
  
  return {
    passed: matchRate >= expectedRate,
    message: matchRate >= expectedRate
      ? `Successfully matched ${matchRate * 100}% of records (target: ${expectedRate * 100}%)`
      : `Failed to meet match rate target: ${(matchRate * 100).toFixed(2)}% vs ${expectedRate * 100}% expected`
  };
});
```

### 4. Update Test Export

```javascript
// Before
exports.tests = [
  {
    id: 'my_test',
    name: 'My Test',
    description: 'Tests specific behavior',
    type: TestType.INTEGRATION,
    priority: TestPriority.HIGH,
    parameters: testParameters,
    testFn: testFn
  }
];

// After
exports.tests = [
  {
    id: 'my_test',
    name: 'My Test',
    description: 'Tests specific behavior',
    type: TestType.INTEGRATION,
    priority: TestPriority.HIGH,
    parameters: testConfig, // Use the converted config
    testFn: testFn // Use the converted test function
  }
];
```

## Example: Complete Migration

### Before Migration

```javascript
const { TestType, TestPriority } = require('../../includes/validation/validation_registry');
const { MultiTableWaterfallStrategy } = require('../../includes/match_strategies/multi_table_waterfall_strategy');

// Test parameters
const testParameters = {
  sourceTable: 'test_customer_data',
  referenceTables: {
    verified_customers: {
      table: 'verified_customers',
      priority: 1,
      keyField: 'customer_id'
    },
    crm_customers: {
      table: 'crm_customers',
      priority: 2,
      keyField: 'customer_id'
    }
  },
  matchingRules: {
    'verified_customers': {
      blocking: [
        { sourceField: 'postal_code', targetField: 'postal_code', exact: true }
      ],
      scoring: [
        { sourceField: 'first_name', targetField: 'first_name', method: 'jaro_winkler', weight: 1.5 }
      ]
    }
  }
};

// Test function
async function testFn(context) {
  const { parameters } = context;
  
  // Create strategy instance
  const strategy = new MultiTableWaterfallStrategy(parameters);
  
  // Generate SQL
  const sql = strategy.generateSQL();
  
  // Validate SQL
  if (!sql.includes('JOIN verified_customers')) {
    throw new Error('Missing JOIN for verified_customers');
  }
  
  return {
    passed: true,
    message: 'SQL generation successful'
  };
}

// Export tests
exports.tests = [
  {
    id: 'my_waterfall_test',
    name: 'My Waterfall Test',
    description: 'Tests the multi-table waterfall strategy',
    type: TestType.INTEGRATION,
    priority: TestPriority.HIGH,
    parameters: testParameters,
    testFn: testFn
  }
];
```

### After Migration

```javascript
const { TestType, TestPriority } = require('../../includes/validation/validation_registry');
const {
  createWaterfallTestConfig,
  createMultiTableWaterfallTestFn
} = require('../../includes/validation/test_helpers');

// Create test configuration
const testConfig = createWaterfallTestConfig({
  sourceTable: 'test_customer_data',
  referenceTables: [
    {
      id: 'verified_customers',
      table: 'verified_customers',
      priority: 1,
      name: 'Verified Customers',
      keyField: 'customer_id'
    },
    {
      id: 'crm_customers',
      table: 'crm_customers',
      priority: 2,
      name: 'CRM Customers',
      keyField: 'customer_id'
    }
  ],
  matchingRules: {
    'verified_customers': {
      blocking: [
        { sourceField: 'postal_code', targetField: 'postal_code', exact: true }
      ],
      scoring: [
        { sourceField: 'first_name', targetField: 'first_name', method: 'jaro_winkler', weight: 1.5 }
      ]
    }
  }
});

// Create validator function
function validateJoins(sql, parameters) {
  // Check for JOINs for all reference tables
  for (const refTable of parameters.referenceTables) {
    if (!sql.includes(`JOIN ${refTable.table}`)) {
      throw new Error(`Missing JOIN for reference table: ${refTable.table}`);
    }
  }
  
  return {
    passed: true,
    message: 'All reference tables found in SQL JOINs'
  };
}

// Export tests
exports.tests = [
  {
    id: 'my_waterfall_test',
    name: 'My Waterfall Test',
    description: 'Tests the multi-table waterfall strategy',
    type: TestType.INTEGRATION,
    priority: TestPriority.HIGH,
    parameters: testConfig,
    testFn: createMultiTableWaterfallTestFn(validateJoins)
  }
];
```

## Common Issues and Solutions

### Issue: "MatchingSystem is not a constructor"

**Solution**: Ensure the test is using the `createMatchingSystemTestFn` helper function, which properly initializes the MatchingSystem class using the factory pattern.

### Issue: "HistoricalMatcher is not a constructor"

**Solution**: Ensure the test is using the `createHistoricalMatcherTestFn` helper function, which properly initializes the HistoricalMatcher class using the factory pattern.

### Issue: "Source table and reference tables are required"

**Solution**: Ensure the test configuration includes all required fields. Use the `createWaterfallTestConfig` helper function to create a properly structured configuration.

### Issue: "mappings.map is not a function"

**Solution**: Ensure field mappings are provided as arrays of objects with `sourceField` and `targetField` properties, not as objects.

## Need Help?

If you encounter issues during migration, refer to the example tests in `tests/integration/standardized_tests.js` or consult the Class-Based Factory Pattern documentation. 