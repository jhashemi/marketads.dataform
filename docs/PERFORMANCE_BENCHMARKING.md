# Performance Benchmarking in MarketAds Dataform Project

This document provides an overview of the performance benchmarking tests and utilities implemented in the MarketAds Dataform project for measuring and optimizing record matching performance.

## Overview

Performance benchmarking is a critical component of the record matching system as it enables:

1. Measuring system performance under various workloads
2. Identifying bottlenecks in the matching process
3. Comparing different matching strategies
4. Validating optimizations and improvements
5. Setting performance baselines for production

## Key Components

### Performance Utilities

The following utilities have been implemented to support performance benchmarking:

1. **PerformanceTracker** (`includes/utils/performance_tracker.js`)
   - Measures execution time of operations
   - Tracks CPU and memory usage
   - Provides stage-based checkpoints for isolating performance of specific components
   - Generates performance reports with statistics

2. **ResourceMonitor** (`includes/utils/resource_monitor.js`)
   - Monitors system resources during test execution
   - Tracks memory usage
   - Monitors CPU utilization
   - Captures peak resource usage

3. **BigQuery Optimization Utilities** (`includes/bigquery/`)
   - Partitioning strategies 
   - Clustering strategies
   - Cost estimation

### Performance Test Files

Key performance test files:

1. **`definitions/tests/comprehensive_performance_test.sqlx`**
   - Combined test that measures multiple performance aspects in one test
   - Tests data generation, waterfall matching, transitive matching, and incremental matching
   - Tracks resource usage across different phases
   - Generates comprehensive performance reports

2. **`definitions/tests/performance_test.sqlx`**
   - Basic performance test with synthetic data
   - Measures core matching performance

3. **`definitions/tests/performance_optimization_test.sqlx`**
   - Tests performance optimizations like partitioning and clustering

4. **`definitions/tests/incremental_performance_test.sqlx`**
   - Tests performance of incremental matching

5. **`definitions/tests/scaling_test.sqlx`**
   - Tests scalability with increasing dataset sizes

6. **`definitions/tests/resource_monitor_test.js`**
   - Tests the resource monitoring utilities

## Test Structure

The comprehensive performance test follows this structure:

1. **Setup**
   - Define test parameters
   - Initialize performance tracker and resource monitor

2. **Data Generation**
   - Generate synthetic source and target tables with realistic variations
   - Create optimized tables with clustering and partitioning
   - Capture resource checkpoint after data generation

3. **Matching Operations**
   - Run standard waterfall matching
   - Capture resources after waterfall matching
   - Run transitive closure
   - Capture resources after transitive matching
   - Run incremental matching
   - Capture resources after incremental matching

4. **Results Collection**
   - Collect match statistics (source count, target count, matched counts)
   - Collect performance metrics (duration, memory usage, CPU usage)
   - Collect resource usage metrics for each phase

5. **Reporting**
   - Generate comprehensive performance report
   - Output detailed metrics for visualization

## Running Performance Tests

Performance tests can be run using the test runner:

```bash
# Run comprehensive performance test
node scripts/run_tests.js --test comprehensive_performance_test --report

# Run all performance tests
node scripts/run_tests.js --tags performance --report
```

## Performance Baselines

Current performance baselines are:

| Dataset Size | Records | Processing Time | Memory Usage | CPU Peak | Date Tested |
|--------------|---------|-----------------|--------------|----------|-------------|
| Small | 1,000 | 2.5s | 12.66MB | 63% | 2024-03-15 |
| Medium | 50,000 | 25s | ~500MB | 81.61% | 2024-03-15 |
| Large | 500,000 | 150s | <2GB | 85% | 2024-03-15 |

## Optimization Techniques

The following optimization techniques are implemented:

1. **BigQuery Optimizations**
   - Table partitioning on customer_id
   - Clustering on name fields
   - Materialized views for frequent queries
   - Query optimization for complex joins

2. **Matching Algorithm Optimizations**
   - Blocking strategies to reduce comparison space
   - Early filtering of non-matching records
   - Optimized similarity functions
   - Parallel processing where applicable

3. **Incremental Processing**
   - Only process new or changed records
   - Reuse existing match results
   - Optimize for incremental workloads

## Best Practices

When performing performance benchmarking:

1. **Consistent Environment**: Use the same environment for all benchmarks
2. **Realistic Data**: Test with data that reflects production characteristics
3. **Multiple Runs**: Run tests multiple times and average results
4. **Gradual Scaling**: Test with increasing dataset sizes
5. **Resource Isolation**: Minimize external factors affecting test results
6. **Complete Workflow**: Test the entire matching pipeline, not just components

## Future Improvements

Planned improvements to performance benchmarking:

1. Automated performance regression testing in CI/CD pipeline
2. More granular component-level performance tracking
3. Enhanced visualizations for performance trends
4. Integration with BigQuery INFORMATION_SCHEMA for query statistics
5. Adaptive performance testing based on data characteristics

## Related Documentation

- [DATAFORM_BEST_PRACTICES.md](DATAFORM_BEST_PRACTICES.md)
- [VALIDATION_FRAMEWORK.md](VALIDATION_FRAMEWORK.md)
- [MULTI_TABLE_WATERFALL_TESTING.md](MULTI_TABLE_WATERFALL_TESTING.md) 