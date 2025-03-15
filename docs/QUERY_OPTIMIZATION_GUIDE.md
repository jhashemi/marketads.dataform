# Query Optimization Guide

This guide outlines best practices for optimizing BigQuery performance using approximate functions and efficient data strategies.

## Table of Contents

1. [Overview](#overview)
2. [Approximate Functions](#approximate-functions)
3. [Data Type Optimization](#data-type-optimization)
4. [Join Optimization](#join-optimization)
5. [Performance Testing](#performance-testing)
6. [Implementation Guide](#implementation-guide)

## Overview

The query optimization framework provides tools and strategies for improving query performance while maintaining acceptable accuracy. Key features include:

- Approximate aggregation functions for faster processing
- Data type optimization for efficient joins
- Performance testing and validation
- Accuracy monitoring

## Approximate Functions

### APPROX_COUNT_DISTINCT vs COUNT(DISTINCT)

Use `APPROX_COUNT_DISTINCT` when:
- Dealing with high cardinality columns
- Exact precision isn't required
- Performance is critical

```sql
-- Instead of this (slower):
SELECT COUNT(DISTINCT user_id) as user_count
FROM `large_table`

-- Use this (faster):
SELECT APPROX_COUNT_DISTINCT(user_id) as user_count
FROM `large_table`
```

Expected improvement: 40-60% faster with ~2% error rate

### APPROX_QUANTILES vs NTILE

Use `APPROX_QUANTILES` when:
- Calculating percentiles or distributions
- Working with large datasets
- Approximate results are acceptable

```sql
-- Instead of this (slower):
SELECT
  value,
  NTILE(100) OVER (ORDER BY value) as percentile
FROM `large_table`

-- Use this (faster):
WITH QuantInfo AS (
  SELECT
    o, qval
  FROM UNNEST((
    SELECT APPROX_QUANTILES(value, 100)
    FROM `large_table`
  )) AS qval
  WITH OFFSET o
  WHERE o > 0
)
SELECT
  value,
  (SELECT (101 - MIN(o)) FROM QuantInfo WHERE value <= qval) as percentile
FROM `large_table`
```

Expected improvement: 30-50% faster with ~2% error rate

## Data Type Optimization

### Join Key Data Types

Choose appropriate data types for join keys:

1. **Integer Keys (Preferred)**
   - Use INT64 for numeric identifiers
   - Fastest join performance
   - Minimal storage overhead

2. **String Keys (When Required)**
   - Keep strings short (< 50 characters)
   - Consider hashing long strings
   - Use fixed-length when possible

```sql
-- Instead of this (slower):
SELECT *
FROM table1 t1
JOIN table2 t2
ON t1.string_id = t2.string_id

-- Use this (faster):
SELECT *
FROM table1 t1
JOIN table2 t2
ON t1.int64_id = t2.int64_id
```

### Data Type Guidelines

| Data Type | Best For | Avoid For |
|-----------|----------|-----------|
| INT64 | IDs, counts, small numbers | Decimal values |
| FLOAT64 | Scientific calculations | Currency |
| STRING | Text data | Numeric IDs |
| TIMESTAMP | Date/time values | Unix timestamps |
| BOOL | True/false flags | Numeric states |

## Join Optimization

### Best Practices

1. **Join Key Selection**
   - Use unique keys when possible
   - Prefer single-column joins
   - Ensure consistent data types

2. **Join Order**
   - Start with the largest filtered table
   - Join smaller tables next
   - Use subqueries for complex filters

3. **Cardinality Analysis**
   ```sql
   SELECT
     'table_name' as table,
     APPROX_COUNT_DISTINCT(join_key) as distinct_keys,
     COUNT(*) as total_rows,
     COUNT(*) / APPROX_COUNT_DISTINCT(join_key) as avg_duplicates
   FROM `table_name`
   ```

### Performance Monitoring

Track join performance using:

```sql
SELECT
  job_id,
  query,
  total_slot_ms,
  total_bytes_processed,
  total_bytes_billed
FROM `region-us`.INFORMATION_SCHEMA.JOBS_BY_PROJECT
WHERE creation_time > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 HOUR)
  AND query_type = 'SELECT'
  AND state = 'DONE'
ORDER BY total_slot_ms DESC
LIMIT 10
```

## Performance Testing

### Test Framework

The test framework (`performance_optimization_test.sqlx`) provides:

1. **Baseline Tests**
   - Traditional implementations
   - Performance metrics
   - Resource usage

2. **Optimized Tests**
   - Improved implementations
   - Comparative metrics
   - Accuracy validation

3. **Validation**
   - Performance improvement %
   - Error rate calculation
   - Pass/fail criteria

### Running Tests

```bash
# Run all optimization tests
npm run test:performance

# Run specific test cases
npm run test:performance -- --tags optimization

# Generate performance report
npm run test:performance -- --report
```

## Implementation Guide

### Using the Query Optimizer

```javascript
const { 
  optimizePercentileQuery,
  optimizeDistinctCountQuery,
  generateOptimizedJoinQuery
} = require('./includes/utils/query_optimizer');

// Optimize percentile calculation
const percentileQuery = optimizePercentileQuery({
  tableName: 'sales_data',
  valueColumn: 'amount',
  buckets: 100
});

// Optimize distinct counts
const distinctCountQuery = optimizeDistinctCountQuery({
  tableName: 'user_events',
  countColumns: ['user_id', 'event_type'],
  groupByColumns: ['date']
});

// Optimize joins
const joinQuery = generateOptimizedJoinQuery({
  sourceTable: 'orders',
  targetTable: 'customers',
  joinKeys: [
    { sourceColumn: 'customer_id', targetColumn: 'id', type: 'int64' }
  ],
  selectColumns: ['orders.id', 'customers.name']
});
```

### Validation

```javascript
const { validateOptimization } = require('./includes/utils/query_optimizer');

const results = validateOptimization({
  baseline: {
    executionTime: 1000,
    result: 50000
  },
  optimized: {
    executionTime: 600,
    result: 49100
  }
});

console.log(results);
// {
//   isValid: true,
//   metrics: {
//     performanceImprovement: 0.4,
//     errorRate: 0.018,
//     baseline: 1000,
//     optimized: 600
//   }
// }
```

### Configuration

Customize optimization settings in `DEFAULT_CONFIG`:

```javascript
const DEFAULT_CONFIG = {
  approximationErrorThreshold: 0.02,  // 2% error tolerance
  minRowsForApproximation: 10000,    // Min rows for approximation
  defaultQuantileBuckets: 100,       // Default quantile buckets
  maxJoinKeyLength: 50               // Max string join key length
};
```

## Best Practices Summary

1. **Use Approximate Functions When:**
   - Exact precision isn't required
   - Working with large datasets
   - Performance is critical
   - Error rate < 2% is acceptable

2. **Optimize Data Types:**
   - Use appropriate types for joins
   - Minimize string lengths
   - Consider data distribution

3. **Monitor Performance:**
   - Track query execution time
   - Monitor resource usage
   - Validate accuracy
   - Test with representative data

4. **Regular Maintenance:**
   - Update statistics regularly
   - Review query patterns
   - Adjust optimization strategies
   - Monitor error rates 