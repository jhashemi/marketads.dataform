# Functional Tests

This directory contains functional tests for the Record Matching System. Functional tests focus on testing the system's functionality from a business perspective, ensuring that business requirements are met.

## Purpose

Functional tests validate that the system meets business requirements and functions correctly from an end-user perspective. They test the system's behavior rather than its implementation details, focusing on:

- Feature completeness
- Business rule compliance
- Workflow validation
- Usecase coverage

## Test Organization

Functional tests are organized by feature area:

- `matching_feature_tests.js`: Tests for core matching features
- `data_transformation_tests.js`: Tests for data transformation functionality
- `workflow_tests.js`: Tests for end-to-end workflows
- `business_rule_tests.js`: Tests for business rule implementation

## Writing Functional Tests

When writing functional tests:

1. Focus on testing business requirements
2. Use high-level APIs rather than internal implementation
3. Test complete features rather than individual functions
4. Validate output based on business expectations
5. Include positive and negative test cases

## Running Functional Tests

```bash
# Run all functional tests
node scripts/run_tests.js --type functional

# Run functional tests with specific tags
node scripts/run_tests.js --type functional --tags matching,business_rules

# Generate a report
node scripts/run_tests.js --type functional --report
``` 