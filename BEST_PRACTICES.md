# Testing Best Practices for BigQuery/Dataform Record Matching

## General Testing Principles

1. **Isolation**: Each test should run in isolation, creating its own temporary test data.
2. **Determinism**: Tests should produce the same result each time they run.
3. **Performance**: Tests should be optimized to minimize BigQuery processing costs.
4. **Coverage**: Tests should cover all critical components of the matching system.
5. **Realism**: Test data should represent real-world scenarios.

## BigQuery-Specific Practices

### 1. Use Temporary Tables

Always use temporary tables for test data and intermediate results:

```sql
CREATE OR REPLACE TEMPORARY TABLE test_data AS
SELECT ...
```

This ensures:
- Tests don't leave artifacts in your BigQuery project
- Tests can be run in parallel without name conflicts
- Reduced costs since temporary tables don't incur storage charges

### 2. Optimize Query Execution

- Use `LIMIT` appropriately in test queries
- Filter early in your query execution plan
- Avoid `SELECT *` - specify only required columns
- Be mindful of JOIN performance with test data

### 3. Mock Large Datasets Efficiently

For performance tests, generate synthetic data efficiently:

```sql
-- Generate test data with CROSS JOIN for combinatorial expansion
CREATE OR REPLACE TEMPORARY TABLE synthetic_test_data AS
WITH names AS (
  SELECT name FROM UNNEST(['John', 'Jane', 'Michael', 'Sarah']) AS name
),
domains AS (
  SELECT domain FROM UNNEST(['example.com', 'gmail.com']) AS domain
)
SELECT 
  CONCAT('ID', CAST(ROW_NUMBER() OVER() AS STRING)) AS id,
  name AS first_name,
  domain AS email_domain
FROM names CROSS JOIN domains;
```

### 4. Validate Results with Assertions

Add assertions as SQL queries that return a single result:

```sql
SELECT
  CASE
    WHEN condition_1_failed THEN 'FAIL: Description of failure'
    WHEN condition_2_failed THEN 'FAIL: Description of failure'
    ELSE 'PASS: All conditions met'
  END AS test_result;
```

### 5. Tag Tests Appropriately

Use Dataform tags to organize and selectively run tests:

```javascript
config {
  type: "test",
  tags: ["unit", "matching", "blocking"]
}
```

This allows running specific test categories:

dataform run --tags unit
dataform run --tags matching

## Dataform-Specific Practices

### 1. Structure Test Files

Organize tests in appropriate directories:
- `definitions/tests/unit/` - Unit tests
- `definitions/tests/integration/` - Integration tests
- `definitions/tests/performance/` - Performance tests

### 2. Test Reusable SQL Components

Create helper JavaScript functions to generate frequently used test patterns:

```javascript
// includes/tests/test_utils.js

function generateTestData(size = 100) {
  return `
    CREATE OR REPLACE TEMPORARY TABLE test_source AS
    WITH synthetic_data AS (
      -- Data generation logic here
    )
    SELECT * FROM synthetic_data
    LIMIT ${size};
  `;
}

module.exports = {
  generateTestData
};
```

### 3. Parallelize Testing Safely

When running many tests, ensure they don't conflict:
- Use unique table names or temporary tables
- Add unique suffixes based on test name
- Ensure tests run independently

### 4. Monitor Costs

- Track BigQuery usage during test runs
- Consider using a separate project for testing
- Set BigQuery quotas to avoid unexpected costs

### 5. Continuous Integration

In CI pipelines:
- Run unit tests on every PR
- Run integration tests for significant changes
- Run performance tests on a schedule (not every commit)
- Archive test results for historical comparison
