# Record Matching System Tests

This directory contains tests for the Record Matching System. The tests are organized by type (unit, integration, performance) and can be run using either Jest or the custom test runner.

## Test Structure

Tests are written in two compatible formats:

1. **Custom Test Runner Format**: Tests are defined as an array of test objects with properties like `id`, `name`, `type`, `tags`, `priority`, and `testFn`.

2. **Jest Format**: Tests are defined using Jest's `describe` and `it` functions.

## Running Tests

### Using Jest

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Using Custom Test Runner

```bash
# Run all tests
npm run test:runner

# Run unit tests only
npm run test:runner:unit

# Run integration tests only
npm run test:runner:integration

# Run tests with specific tags
node scripts/run_tests.js --tags matching,core

# Run tests with specific priority
node scripts/run_tests.js --priority 1

# Generate a test report
npm run test:report
```

## Test Files

### Unit Tests

- `blocking_functions_test.js`: Tests for blocking functions used in record linkage
- `blocking_tests.js`: Tests for blocking strategies
- `config_test.js`: Tests for configuration management
- `docs_test.js`: Tests for documentation and metadata
- `matching_functions_test.js`: Tests for matching functions
- `pipeline_tests.js`: Tests for data processing pipeline
- `regex_pattern_tests.js`: Tests for regular expression patterns
- `rule_engine_test.js`: Tests for business rule processing
- `standardization_tests.js`: Tests for data standardization functions

### Integration Tests

- `end_to_end_matching_tests.js`: End-to-end tests for the matching process
- `incremental_processing_tests.js`: Tests for incremental data processing
- `multi_table_waterfall_tests.js`: Tests for multi-table waterfall matching
- `transitive_closure_tests.js`: Tests for transitive closure functionality
- `waterfall_strategy_tests.js`: Tests for waterfall matching strategy

### Performance Tests

- `optimization_tests.js`: Tests for performance optimizations
- `scalability_tests.js`: Tests for system scalability

## Writing New Tests

When writing new tests, make sure they are compatible with both test systems:

1. Define tests as an array of test objects for the custom test runner
2. Add Jest-style tests using `describe` and `it` functions
3. Export the tests array using `module.exports = { tests }`

Example:

```javascript
const assert = require('assert');
const myModule = require('../../includes/my_module');

// Define tests for custom test runner
const tests = [
  {
    id: 'my_module_test',
    name: 'my function test',
    type: 'unit',
    tags: ['my_module', 'core'],
    priority: 1,
    testFn: async () => {
      assert.strictEqual(myModule.myFunction(1, 2), 3, 'Should add numbers correctly');
      return true;
    }
  }
];

// Jest-style tests
describe('My Module', () => {
  it('should add numbers correctly', () => {
    assert.strictEqual(myModule.myFunction(1, 2), 3);
  });
});

// For manual testing
if (require.main === module) {
  // Run tests manually
}

module.exports = { tests }; 