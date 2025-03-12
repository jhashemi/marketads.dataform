# Validation Framework for Record Matching System

This document provides a comprehensive guide to validating and testing the record matching system.

## Table of Contents

1. [Overview](#overview)
2. [Validation Components](#validation-components)
3. [Test Types](#test-types)
4. [Setting Up Tests](#setting-up-tests)
5. [Running Tests](#running-tests)
6. [Analyzing Results](#analyzing-results)
7. [Best Practices](#best-practices)

## Overview

The validation framework is designed to ensure the accuracy, performance, and reliability of the record matching system. It provides tools for creating, running, and analyzing tests for different components of the system, from individual functions to end-to-end matching workflows.

## Validation Components

The validation framework consists of several key components:

### 1. Validation Engine (`includes/validation/validation_engine.js`)

The core component that manages test cases, runs validations, and generates reports. It provides:

- Test case registration
- Test execution orchestration
- Result aggregation and metrics calculation
- Report generation in various formats (HTML, SQL, JSON)

### 2. Test Executor (`includes/validation/test_executor.js`)

Handles the execution of test cases in BigQuery, including:

- Creating temporary test tables
- Running matching SQL
- Comparing actual results with expected results
- Calculating precision, recall, and F1 score

### 3. Test Generator (`includes/validation/test_generator.js`)

Provides predefined test cases for common matching scenarios:

- Name variation tests
- Address variation tests
- Edge case tests (missing data, special characters)
- International character tests

### 4. Test Runner (`includes/validation/test_runner.js`)

A command-line tool for running tests in batch mode and generating reports.

### 5. SQL Test Cases (`definitions/tests/`)

SQL-based tests for specific components:

- String similarity functions
- Phonetic functions
- Address standardization
- End-to-end matching pipeline

## Test Types

The framework supports different types of tests:

### Unit Tests

Test individual components in isolation, such as:

- String similarity functions
- Phonetic encoding algorithms
- Address standardization
- Blocking key generation

### Integration Tests

Test interactions between components, such as:

- Candidate generation with blocking
- Match scoring and ranking

### End-to-End Tests

Test the complete matching pipeline from input to final matches:

- Matching with name variations
- Matching with address variations
- Matching with different data quality levels

### Performance Tests

Measure the efficiency and scalability of the matching system:

- Processing time
- Memory usage
- Scaling with dataset size

## Setting Up Tests

### Creating JavaScript Test Cases

Use the validation engine to create test cases:

```javascript
const { createTestCase } = require('./includes/validation/validation_engine');
const { executeTestCase } = require('./includes/validation/test_executor');

// Create a test case
const nameVariationTest = createTestCase({
  name: "Name Variation Test",
  description: "Tests matching with common name variations and nicknames",
  sourceRecords: [
    { id: "s1", first_name: "John", last_name: "Smith" },
    // Additional records...
  ],
  targetRecords: [
    { id: "t1", first_name: "Johnny", last_name: "Smith" },
    // Additional records...
  ],
  expectedMatches: [
    { source_id: "s1", target_id: "t1", confidence: 0.9 },
    // Additional expected matches...
  ],
  fieldMappings: [
    { sourceField: "first_name", targetField: "first_name", type: "firstName", weight: 1.5 },
    { sourceField: "last_name", targetField: "last_name", type: "lastName", weight: 2.0 }
  ]
});
```

### Creating SQL Test Cases

For SQL-based testing, create a `.sqlx` file in the `definitions/tests/` directory:

```sql
config {
  type: "operations",
  description: "Test for string similarity functions",
  tags: ["test", "string_similarity"]
}

-- Create test data
CREATE TEMP TABLE test_cases AS (
  SELECT * FROM UNNEST([
    STRUCT("John" AS string1, "Johnny" AS string2, 0.8 AS expected_similarity)
    -- Additional test cases...
  ])
);

-- Execute tests
-- [Test implementation...]

-- Report results
SELECT
  'Test Results' AS test_name,
  COUNT(*) AS total_tests,
  COUNTIF(passed) AS passed_tests
FROM test_results;
```

## Running Tests

### Running JavaScript Tests

Use the test runner to execute test cases:

```javascript
const { createTestRunner } = require('./includes/validation/test_runner');

// Create a test runner
const runner = createTestRunner({
  projectId: 'your-project-id',
  datasetId: 'test_dataset',
  outputDir: './test_reports'
});

// Add tests
runner.addStandardTestSuite();

// Run tests with your matching function
runner.runTests(yourMatchingFunction).then(results => {
  console.log(`Average F1 score: ${results.summary.averageF1.toFixed(2)}`);
  
  // Generate a report
  const reportPath = runner.generateReport('html');
  console.log(`Report generated at: ${reportPath}`);
});
```

### Running SQL Tests

Execute SQL test files using Dataform:

```bash
dataform run --tags test
```

To run specific test categories:

```bash
dataform run --tags test,string_similarity
```

## Analyzing Results

The validation framework provides several metrics to evaluate matching performance:

### Precision

Measures the accuracy of the matches found:

```
Precision = True Positives / (True Positives + False Positives)
```

### Recall

Measures the completeness of the matches found:

```
Recall = True Positives / (True Positives + False Negatives)
```

### F1 Score

The harmonic mean of precision and recall:

```
F1 Score = 2 * (Precision * Recall) / (Precision + Recall)
```

### Confusion Matrix

A table showing:

- True Positives (correctly identified matches)
- False Positives (incorrectly identified matches)
- False Negatives (missed matches)

## Best Practices

1. **Test Comprehensively**: Include tests for common variations, edge cases, and different data quality levels.

2. **Maintain a Golden Dataset**: Create a well-vetted set of test records with known matches for regression testing.

3. **Test Incrementally**: Test individual components before testing the entire pipeline.

4. **Use Representative Data**: Ensure test data reflects the characteristics of your actual data.

5. **Automate Testing**: Integrate tests into your CI/CD pipeline to catch regressions early.

6. **Set Performance Baselines**: Establish baseline metrics for precision, recall, and F1 score.

7. **Tune for Your Use Case**: Adjust match thresholds based on whether precision or recall is more important for your application.

8. **Document Test Cases**: Document the rationale behind each test case and expected matches.

9. **Review False Positives/Negatives**: Analyze matching errors to improve the system.

10. **Regular Revalidation**: Periodically revalidate the system with new test cases as you encounter new matching challenges. 