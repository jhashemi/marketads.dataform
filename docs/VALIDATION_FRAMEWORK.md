# Validation Framework for Record Matching System

This document provides a comprehensive guide to the validation framework within the Record Matching System. The framework enables automated testing, validation, and quality assurance of the matching functionality.

## Table of Contents

- [Overview](#overview)
- [Key Components](#key-components)
- [Using the Framework](#using-the-framework)
- [Writing Tests](#writing-tests)
- [Running Tests](#running-tests)
- [Configuration](#configuration)
- [Error Handling](#error-handling)
- [Documentation](#documentation)
- [CI/CD Integration](#cicd-integration)
- [Best Practices](#best-practices)

## Overview

The validation framework is designed to provide comprehensive testing capabilities for the Record Matching System. It enables:

- **Unit testing** of individual components and functions
- **Integration testing** of interaction between components
- **Performance testing** to ensure scalability and efficiency
- **End-to-end testing** of complete matching workflows

The framework is built with modularity and separation of concerns in mind, ensuring each component has a clear responsibility and is maintainable independently.

## Key Components

The validation framework consists of the following key components:

### 1. Validation Registry (`validation_registry.js`)

The central registry that manages all validation tests, their dependencies, and execution context. It provides a standardized interface for registering, discovering, and executing validation tests.

Key features:
- Test registration and discovery
- Dependency management between tests
- Parallel and sequential test execution
- Test result aggregation and reporting
- Coverage calculation

### 2. Error Handler (`error_handler.js`)

Provides standardized error handling, classification, and logging across the validation framework.

Key features:
- Error type classification
- Consistent error formatting
- Error logging with context
- Helper functions for specific error types
- Error handling wrappers for async functions

### 3. Configuration Manager (`config_manager.js`)

Centralizes configuration management for the validation framework with configuration validation, defaults, and override capabilities.

Key features:
- Default configuration values
- Configuration validation
- Loading/saving configurations from files
- Environment variable integration
- Override capabilities

### 4. Documentation Manager (`documentation_manager.js`)

Centralizes documentation management, ensuring consistency and providing structured access to documentation.

Key features:
- Documentation organization by section
- Markdown parsing and HTML generation
- Table of contents generation
- Documentation search
- API documentation generation

### 5. Test Executor (`test_executor.js`)

Executes validation tests with appropriate setup and teardown procedures.

Key features:
- Test environment setup and teardown
- BigQuery test environment management
- Temporary test data handling
- Test timing and metrics collection

### 6. Test Generator (`test_generator.js`)

Generates test cases and test data for validation.

Key features:
- Test case generation from templates
- Random test data generation
- Edge case identification and testing
- Test file generation

### 7. Report Generator (`report_generator.js`)

Generates comprehensive test reports in various formats.

Key features:
- HTML report generation
- JSON report generation
- Performance visualization
- Test coverage reporting

## Using the Framework

### Basic Setup

To use the validation framework in your project:

1. Install the required dependencies:

```bash
npm install --save-dev @dataform/cli @google-cloud/bigquery jest
```

2. Initialize the validation framework:

```javascript
const { validationRegistry } = require('./includes/validation/validation_registry');
const { documentationManager } = require('./includes/validation/documentation_manager');

async function initializeValidation() {
  // Initialize the registry with test files
  await validationRegistry.initialize('./tests');
  
  // Initialize documentation manager
  await documentationManager.initialize('./docs');
  
  console.log('Validation framework initialized successfully');
}

initializeValidation().catch(console.error);
```

### Project Structure

Recommended project structure for validation:

```
project_root/
├── tests/
│   ├── unit/
│   │   ├── standardization_tests.js
│   │   ├── similarity_tests.js
│   │   └── blocking_tests.js
│   ├── integration/
│   │   ├── matching_pipeline_tests.js
│   │   └── waterfall_strategy_tests.js
│   └── performance/
│       ├── large_dataset_tests.js
│       └── throughput_tests.js
├── includes/
│   ├── validation/
│   │   ├── error_handler.js
│   │   ├── config_manager.js
│   │   ├── validation_registry.js
│   │   ├── documentation_manager.js
│   │   ├── test_executor.js
│   │   ├── test_generator.js
│   │   └── report_generator.js
│   └── ... (other code)
├── docs/
│   ├── overview/
│   │   └── validation_framework.md
│   ├── validation/
│   │   ├── writing_tests.md
│   │   └── configuration.md
│   └── ... (other docs)
└── scripts/
    ├── generate_test_report.js
    └── run_tests.js
```

## Writing Tests

### Test Structure

Tests are structured as JavaScript modules that export an array of test metadata or a register function:

```javascript
// Example test file: tests/unit/standardization_tests.js
const { TestType, TestPriority } = require('../../includes/validation/validation_registry');

// Example test array export
exports.tests = [
  {
    id: 'standardize_address_test',
    name: 'Standardize Address Function',
    description: 'Tests the standardization of addresses for matching',
    type: TestType.UNIT,
    priority: TestPriority.HIGH,
    tags: ['standardization', 'address'],
    dependencies: [],
    parameters: {
      testCases: [
        { input: '123 Main St.', expected: '123 MAIN ST' },
        { input: '123 Main Street', expected: '123 MAIN ST' },
        { input: '123  MAIN  STREET', expected: '123 MAIN ST' }
      ]
    },
    testFn: async (context) => {
      const { standardizeAddress } = require('../../includes/matching/standardization');
      const { testCases } = this.parameters;
      
      const results = {
        passed: true,
        failures: []
      };
      
      for (const testCase of testCases) {
        const result = standardizeAddress(testCase.input);
        
        if (result !== testCase.expected) {
          results.passed = false;
          results.failures.push({
            input: testCase.input,
            expected: testCase.expected,
            actual: result
          });
        }
      }
      
      return results;
    }
  }
];

// Alternative: Register function export
exports.register = async (registry) => {
  // Register tests with the provided registry
  const testIds = [];
  
  // ... register tests similar to above
  
  return testIds;
};
```

### Test Types

The framework supports different types of tests:

1. **Unit Tests**: Focus on testing individual functions and components in isolation.

2. **Integration Tests**: Test the interaction between components and systems.

3. **Performance Tests**: Focus on performance metrics, throughput, and scalability.

4. **End-to-End Tests**: Test the entire matching workflow from input to output.

### Test SQL Files

For SQL-based tests, you can create `.sqlx` files in the tests directory:

```sql
-- tests/integration/matching_integration_test.sqlx
config {
  type: "test",
  tags: ["integration", "matching"],
  description: "Tests the end-to-end matching process",
  dependencies: ["unit_standardization_test"]
}

-- Create test source table
CREATE OR REPLACE TEMPORARY TABLE ${ref("test_source")} AS
SELECT 'John' as first_name, 'Doe' as last_name, '123 Main St' as address, '12345' as zip
UNION ALL
SELECT 'Jane' as first_name, 'Smith' as last_name, '456 Oak Ave' as address, '67890' as zip;

-- Create test target table
CREATE OR REPLACE TEMPORARY TABLE ${ref("test_target")} AS
SELECT 'John' as first_name, 'Doe' as last_name, '123 Main Street' as address, '12345' as zip
UNION ALL
SELECT 'J' as first_name, 'Smith' as last_name, '456 Oak Avenue' as address, '67890' as zip;

-- Execute matching
CREATE OR REPLACE TEMPORARY TABLE ${ref("test_matches")} AS
SELECT * FROM ${ref("matching_pipeline")}(
  source_table => ${ref("test_source")},
  target_table => ${ref("test_target")},
  options => '{"threshold": 0.8}'
);

-- Validate results
WITH validation AS (
  SELECT COUNT(*) as match_count FROM ${ref("test_matches")}
)
SELECT
  CASE WHEN match_count = 2 THEN TRUE ELSE FALSE END as test_passed,
  match_count as actual_count,
  2 as expected_count
FROM validation;
```

## Running Tests

### Command Line

Run tests using the provided scripts:

```bash
# Run all tests
node scripts/run_tests.js

# Run specific test types
node scripts/run_tests.js --type unit

# Run tests with specific tags
node scripts/run_tests.js --tags standardization,matching

# Generate a report
node scripts/run_tests.js --report
```

### Programmatic API

Run tests programmatically:

```javascript
const { validationRegistry } = require('./includes/validation/validation_registry');

async function runValidationTests() {
  // Initialize the registry
  await validationRegistry.initialize('./tests');
  
  // Run all tests
  const results = await validationRegistry.runTests();
  
  // Get test summary
  const summary = validationRegistry.getTestSummary();
  
  console.log(`Executed ${summary.executed} tests with ${summary.passed} passed and ${summary.failed} failed.`);
  
  return summary;
}

runValidationTests().catch(console.error);
```

## Configuration

The validation framework is configurable through the configuration manager:

```javascript
const { defaultConfigManager } = require('./includes/validation/config_manager');

// Get current configuration
const config = defaultConfigManager.getConfig();
console.log(config);

// Update configuration
defaultConfigManager.update({
  testExecution: {
    parallel: true,
    maxParallelTests: 10
  },
  matchingThresholds: {
    high: 0.9,
    medium: 0.7,
    low: 0.5
  }
});

// Save configuration to file
defaultConfigManager.saveToFile('./config/validation.json');

// Load configuration from file
defaultConfigManager.loadFromFile('./config/validation.json');

// Get specific configuration value
const threshold = defaultConfigManager.get('matchingThresholds.high');
console.log(threshold); // 0.9
```

### Default Configuration

The default configuration includes:

- BigQuery connection settings
- Test execution settings
- Matching thresholds
- Field weights
- Test output settings
- Temporary test data settings

## Error Handling

The error handler provides consistent error handling across the framework:

```javascript
const errorHandler = require('./includes/validation/error_handler');

try {
  // Some code that might throw an error
} catch (error) {
  // Log error with context
  errorHandler.logError(error, {
    component: 'MyComponent',
    operation: 'someOperation',
    inputs: { key: 'value' }
  });
  
  // Create specific error types
  throw errorHandler.createValidationError('Validation failed', error);
}

// Wrap functions with error handling
const safeFn = errorHandler.withErrorHandling(
  async function myRiskyFunction() {
    // Function implementation
  },
  errorHandler.ErrorType.VALIDATION_ERROR,
  { component: 'MyComponent' }
);
```

## Documentation

The documentation manager provides structured access to framework documentation:

```javascript
const { documentationManager, DocSection } = require('./includes/validation/documentation_manager');

async function accessDocumentation() {
  // Initialize documentation manager
  await documentationManager.initialize('./docs');
  
  // Get table of contents
  const toc = documentationManager.getTableOfContents();
  
  // Get a specific document
  const doc = await documentationManager.getDocument(DocSection.VALIDATION, 'writing_tests');
  
  // Generate documentation index
  await documentationManager.generateIndex();
  
  // Consolidate documentation from multiple sources
  await documentationManager.consolidateDocumentation([
    './docs',
    './includes/matching/docs',
    './README.md'
  ]);
}

accessDocumentation().catch(console.error);
```

## CI/CD Integration

The validation framework integrates with CI/CD pipelines through GitHub Actions:

```yaml
# .github/workflows/test.yml
name: Test Record Matching System

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]
  workflow_dispatch:

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Compile Dataform project
        run: npx @dataform/cli compile
      
      - name: Set up Google Cloud SDK
        if: github.event_name != 'pull_request'
        uses: google-github-actions/auth@v1
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}
      
      - name: Run unit tests
        run: |
          mkdir -p test_reports
          node scripts/run_tests.js --type unit --report
      
      - name: Run integration tests
        run: |
          node scripts/run_tests.js --type integration --report
      
      - name: Generate test report
        run: node scripts/generate_test_report.js
      
      - name: Upload test report
        uses: actions/upload-artifact@v3
        with:
          name: test-report
          path: test_reports/

      - name: Publish test summary
        if: always()
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const summary = JSON.parse(fs.readFileSync('./test_reports/summary.json', 'utf8'));
            
            const summaryText = `## Test Results
            - Total tests: ${summary.total}
            - Passed: ${summary.passed}
            - Failed: ${summary.failed}
            - Coverage: ${summary.coverage.percentage}%
            
            [Detailed Test Report](${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID})`;
            
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: summaryText
            });
```

## Best Practices

### Writing Effective Tests

1. **Focus on behavior, not implementation**: Test what the code does, not how it does it.
2. **One assertion per test**: Each test should verify one specific behavior.
3. **Clear test names**: Name tests descriptively to indicate what they're testing.
4. **Independent tests**: Tests should not depend on the state of other tests.
5. **Realistic test data**: Use realistic test data that reflects actual usage.

### Performance Testing

1. **Benchmark against realistic data volumes**: Test with dataset sizes that match production.
2. **Measure key metrics**: Throughput, latency, memory usage, and CPU utilization.
3. **Test scaling behavior**: How performance changes with increasing data volumes.
4. **Profile hotspots**: Identify performance bottlenecks in the code.

### SQL Testing

1. **Use temporary tables**: Create and populate temporary tables for test data.
2. **Verify correctness first**: Test for correct results before optimizing performance.
3. **Test edge cases**: Empty tables, NULL values, maximum string lengths, etc.
4. **Parametrize queries**: Test with different parameter values.

### BigQuery-Specific Practices

1. **Minimize query costs**: Use small datasets and `LIMIT` where possible.
2. **Test slot consumption**: Monitor slot usage for complex queries.
3. **Use billing limits**: Set billing limits to prevent runaway costs during testing.
4. **Test partitioning and clustering**: Verify that partitioning and clustering work as expected.

### Test Organization

1. **Logical grouping**: Group related tests together in the same file.
2. **Clear hierarchy**: Organize tests in a clear directory structure.
3. **Naming conventions**: Use consistent naming conventions for test files and functions.
4. **Tags and metadata**: Use tags to categorize tests for selective execution.

## Troubleshooting

### Common Issues

1. **Tests timing out**: Increase the timeout in the configuration.
2. **BigQuery permission errors**: Verify service account permissions.
3. **Inconsistent test results**: Check for test interdependencies.
4. **Missing dependencies**: Ensure all required libraries are installed.

### Debugging Tests

1. **Enable verbose logging**: Set the log level to debug for more information.
2. **Inspect test context**: Log the test context to understand the environment.
3. **Step-by-step execution**: Run individual test steps manually.
4. **Check test data**: Verify that test data is correct and complete. 