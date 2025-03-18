# Test Strategy for MarketAds Dataform Project

This document outlines the test strategy for the MarketAds Dataform project, including test categories, organization, and best practices.

## Testing Philosophy

Our testing philosophy is based on the following principles:

1. **Test-Driven Development (TDD)**: We follow strict TDD practices with RED-GREEN-REFACTOR cycles.
2. **Test Pyramid**: We emphasize having more unit tests than integration tests, and more integration tests than system tests.
3. **Test for Behavior**: Tests focus on behavior rather than implementation details.
4. **Comprehensive Coverage**: We maintain tests for all levels of the test pyramid.
5. **Environment Compatibility**: Tests validate compatibility with Google BigQuery and Dataform environments.

## Test Categories

The project includes the following test categories:

### Unit Tests

- **Purpose**: Test individual functions, classes, and methods in isolation.
- **Location**: `tests/unit/`
- **Key Files**: 
  - `matching_functions_test.js`: Tests for core matching functions
  - `blocking_functions_test.js`: Tests for blocking functionality
  - `string_similarity_tests.js`: Tests for string similarity algorithms

### Integration Tests

- **Purpose**: Test interactions between components.
- **Location**: `tests/integration/`
- **Key Files**: 
  - `end_to_end_matching_tests.js`: Tests for complete matching workflows
  - `transitive_closure_tests.js`: Tests for transitive relationship detection
  - `waterfall_strategy_tests.js`: Tests for waterfall matching strategy

### Performance Tests

- **Purpose**: Test system performance under various conditions.
- **Location**: `tests/performance/`
- **Key Files**: 
  - `scalability_tests.js`: Tests for system scalability
  - `optimization_tests.js`: Tests for performance optimizations
  - `multi_table_performance_test.js`: Tests for multi-table performance

### Functional Tests

- **Purpose**: Test system functionality from a business perspective.
- **Location**: `tests/functional/`
- **Key Files**: 
  - `matching_feature_tests.js`: Tests for core matching features

### Component Tests

- **Purpose**: Test individual components or subsystems in isolation with real dependencies.
- **Location**: `tests/component/`
- **Key Files**: 
  - `matcher_component_tests.js`: Tests for the matcher component

### System Tests

- **Purpose**: Test the entire system in a production-like environment.
- **Location**: `tests/system/`
- **Key Files**: 
  - `end_to_end_dataform_tests.js`: Tests for end-to-end Dataform workflows

## Test Organization

Tests are organized by type in the corresponding directories. Each test file follows a consistent pattern:

1. **Test ID**: Unique identifier for each test
2. **Test Name**: Human-readable name describing the test
3. **Test Description**: Detailed description of what the test is validating
4. **Test Type**: The category of the test (unit, integration, etc.)
5. **Test Tags**: Tags for filtering and organization
6. **Test Priority**: Importance level (high, medium, low)
7. **Test Function**: The actual test implementation

## BigQuery and Dataform Testing

Special attention is given to testing compatibility with Google BigQuery and Dataform environments:

### BigQuery Testing

- Testing BigQuery-specific SQL syntax
- Testing partitioning and clustering strategies
- Testing query performance optimization
- Testing within BigQuery resource limits

### Dataform Testing

- Testing SQLX compilation
- Testing Dataform dependencies
- Testing incremental table building
- Testing Dataform workflows

## Running Tests

Tests can be run using either Jest or our custom test runner:

### Using Jest

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration
```

### Using Custom Test Runner

```bash
# Run all tests
node scripts/run_tests.js

# Run specific test types
node scripts/run_tests.js --type unit
node scripts/run_tests.js --type integration
node scripts/run_tests.js --type functional
node scripts/run_tests.js --type component
node scripts/run_tests.js --type system

# Run tests with specific tags
node scripts/run_tests.js --tags matching,bigquery

# Generate a test report
node scripts/run_tests.js --report
```

## Test Coverage

We maintain high test coverage across all areas of the codebase:

| Area | Coverage |
|------|----------|
| Core Matching Functions | >95% |
| Factory Classes | >90% |
| BigQuery Integration | >85% |
| Dataform Compilation | >85% |
| Error Handling | 100% |
| Parameter Validation | 100% |

## Test Reports

Test reports are generated in HTML format and stored in the `test_reports` directory. Reports include:

- Test execution summary
- Test coverage statistics
- Performance metrics
- Failure details

## Handling Test Failures

When test failures occur, we follow a structured approach to resolve them:

1. **Identify and Isolate**: Run the specific failing test to confirm the issue and isolate it from other tests.
   ```bash
   node scripts/run_tests.js --test test_id
   ```

2. **Root Cause Analysis**: 
   - Examine the test output and error messages
   - Check the test expectations against the actual implementation
   - Review recent code changes that might have affected the test
   - Look for environment-specific issues

3. **Fix Implementation, Not Tests**: 
   - Follow the TDD principle of fixing the implementation to match test expectations
   - Avoid modifying tests to make them pass unless the test expectations are incorrect
   - Document any test modifications with clear reasoning

4. **Verification**:
   - Verify that the specific failing test now passes
   - Run the full test suite to ensure no regressions were introduced
   - Generate a new test report to document the fix

5. **Documentation**:
   - Document significant fixes in the codebase (using comments or documentation files)
   - Update the TODO.md file to reflect completed fixes
   - For significant issues, create a dedicated bug fix documentation file (e.g., `docs/BUGFIX_*.md`)

### Recent Example: SQL Generation Fix

A recent example of this process was fixing the SQL generation for exact matching:

1. **Issue**: The `sql_generation_test` was failing because the generated SQL didn't include the expected `CASE WHEN` syntax pattern.
2. **Root Cause**: The SQL generation was formatting the SQL with newlines between `CASE` and `WHEN` keywords.
3. **Fix**: Modified the SQL template to ensure `CASE WHEN` appears together without intervening whitespace.
4. **Verification**: Verified both the specific test and full test suite now pass.
5. **Documentation**: Documented the fix in `docs/BUGFIX_SQL_GENERATION.md` and updated `TODO.md`.

## Best Practices

1. **Write tests first**: Always write tests before implementing functionality.
2. **One behavior per test**: Each test should test only one behavior.
3. **Test isolation**: Tests should not depend on each other.
4. **Test real behavior**: Focus on testing behavior rather than implementation details.
5. **Cleanup resources**: Always clean up resources created during tests.
6. **Use descriptive names**: Use clear, descriptive names for tests.
7. **Test edge cases**: Include tests for edge cases and error conditions.

## Continuous Integration

Tests are run automatically on:

1. **Pull requests**: All tests must pass before merging.
2. **Main branch commits**: Full test suite runs after each commit.
3. **Nightly builds**: Comprehensive performance tests run nightly.

## Test Maintenance

Tests are maintained alongside code changes:

1. **Update tests when code changes**: Tests should be updated when code changes.
2. **Review test coverage regularly**: Test coverage is reviewed weekly.
3. **Refactor tests**: Tests are refactored as needed for clarity and maintainability.
4. **Add tests for bugs**: New tests are added for each bug fix. 