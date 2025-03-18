# System Tests

This directory contains system tests for the Record Matching System. System tests focus on testing the entire system in a production-like environment.

## Purpose

System tests validate that the entire application works correctly as a whole in a realistic environment. They test the system from end to end, focusing on:

- Complete workflows
- Integration with external systems
- Performance in a production-like environment
- Recovery from failures
- Data flow across all components

## Test Organization

System tests are organized by workflow or scenario:

- `end_to_end_dataform_tests.js`: Tests for end-to-end Dataform workflows
- `bigquery_integration_tests.js`: Tests for BigQuery integration
- `multi_source_matching_tests.js`: Tests for matching across multiple sources
- `resource_limits_tests.js`: Tests for system behavior under resource constraints

## Writing System Tests

When writing system tests:

1. Test the system as a whole, not individual components
2. Use real external dependencies
3. Set up realistic test data
4. Test complete workflows
5. Include error recovery scenarios
6. Test performance characteristics

## Running System Tests

```bash
# Run all system tests
node scripts/run_tests.js --type system

# Run system tests with specific tags
node scripts/run_tests.js --type system --tags bigquery,production

# Generate a report
node scripts/run_tests.js --type system --report
```

## Google BigQuery and Dataform Considerations

System tests should validate that the application works correctly within the constraints of:

1. Google BigQuery
   - Query syntax and functions
   - Resource limits
   - Pricing model

2. Google Dataform
   - SQLX syntax
   - Compilation model
   - Dependency resolution
   - Execution environment 