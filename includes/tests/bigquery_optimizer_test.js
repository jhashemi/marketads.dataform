/**
 * @fileoverview Tests for BigQuery Optimization modules
 * 
 * This file contains tests for the BigQuery optimization modules, including
 * partitioning strategy, clustering strategy, materialized view management,
 * query performance tracking, cost estimation, and the main optimizer.
 */

const assert = require('assert');
const partitioningStrategy = require('../bigquery/partitioning_strategy');
const clusteringStrategy = require('../bigquery/clustering_strategy');
const materializedViewManager = require('../bigquery/materialized_view_manager');
const queryPerformanceTracker = require('../bigquery/query_performance_tracker');
const costEstimator = require('../bigquery/cost_estimator');
const bigqueryOptimizer = require('../bigquery/bigquery_optimizer');

/**
 * Test data: Sample table schema
 */
const sampleTableSchema = [
  { name: 'id', type: 'INTEGER' },
  { name: 'timestamp', type: 'TIMESTAMP' },
  { name: 'date', type: 'DATE' },
  { name: 'customer_id', type: 'INTEGER' },
  { name: 'product_id', type: 'INTEGER' },
  { name: 'region', type: 'STRING' },
  { name: 'country', type: 'STRING' },
  { name: 'amount', type: 'FLOAT' }
];

/**
 * Test data: Sample table info
 */
const sampleTableInfo = {
  projectId: 'test-project',
  datasetId: 'test_dataset',
  tableId: 'test_table',
  schema: sampleTableSchema,
  stats: {
    numRows: 1000000,
    numBytes: 1000000000,
    creationTime: new Date('2023-01-01').getTime(),
    lastModifiedTime: new Date('2023-06-01').getTime(),
    totalBytesProcessed: 5000000000
  }
};

/**
 * Test data: Sample query history
 */
const sampleQueryHistory = [
  {
    sql: 'SELECT * FROM test_dataset.test_table WHERE date BETWEEN "2023-01-01" AND "2023-01-31"',
    jobId: 'job1',
    startTime: new Date('2023-06-01T10:00:00Z').getTime(),
    endTime: new Date('2023-06-01T10:01:00Z').getTime(),
    bytesProcessed: 1000000000,
    status: 'COMPLETED',
    user: 'user1@example.com'
  },
  {
    sql: 'SELECT * FROM test_dataset.test_table WHERE customer_id = 12345',
    jobId: 'job2',
    startTime: new Date('2023-06-01T11:00:00Z').getTime(),
    endTime: new Date('2023-06-01T11:00:30Z').getTime(),
    bytesProcessed: 500000000,
    status: 'COMPLETED',
    user: 'user2@example.com'
  },
  {
    sql: 'SELECT region, SUM(amount) FROM test_dataset.test_table GROUP BY region',
    jobId: 'job3',
    startTime: new Date('2023-06-01T12:00:00Z').getTime(),
    endTime: new Date('2023-06-01T12:02:00Z').getTime(),
    bytesProcessed: 1500000000,
    status: 'COMPLETED',
    user: 'user1@example.com'
  },
  {
    sql: 'SELECT * FROM test_dataset.test_table WHERE date = "2023-05-15" AND region = "EMEA"',
    jobId: 'job4',
    startTime: new Date('2023-06-01T13:00:00Z').getTime(),
    endTime: new Date('2023-06-01T13:00:45Z').getTime(),
    bytesProcessed: 800000000,
    status: 'COMPLETED',
    user: 'user3@example.com'
  },
  {
    sql: 'SELECT customer_id, SUM(amount) FROM test_dataset.test_table GROUP BY customer_id ORDER BY SUM(amount) DESC LIMIT 10',
    jobId: 'job5',
    startTime: new Date('2023-06-01T14:00:00Z').getTime(),
    endTime: new Date('2023-06-01T14:01:30Z').getTime(),
    bytesProcessed: 1200000000,
    status: 'COMPLETED',
    user: 'user2@example.com'
  }
];

/**
 * Test suite for partitioning strategy
 */
function testPartitioningStrategy() {
  console.log('Testing Partitioning Strategy...');
  
  // Test finding time fields
  const timeFields = partitioningStrategy.findTimeFields(sampleTableSchema);
  assert(timeFields.includes('timestamp'), 'Should identify timestamp as a time field');
  assert(timeFields.includes('date'), 'Should identify date as a time field');
  
  // Test finding integer fields
  const integerFields = partitioningStrategy.findIntegerFields(sampleTableSchema);
  assert(integerFields.includes('id'), 'Should identify id as an integer field');
  assert(integerFields.includes('customer_id'), 'Should identify customer_id as an integer field');
  assert(integerFields.includes('product_id'), 'Should identify product_id as an integer field');
  
  // Test analyzing query where clause fields
  const whereClauseFields = partitioningStrategy.analyzeQueryWhereClauseFields(sampleQueryHistory);
  assert(whereClauseFields['date'] > 0, 'Should count date in where clauses');
  assert(whereClauseFields['customer_id'] > 0, 'Should count customer_id in where clauses');
  assert(whereClauseFields['region'] > 0, 'Should count region in where clauses');
  
  // Test recommending partitioning strategy
  const partitioningRecommendation = partitioningStrategy.recommendPartitioningStrategy(
    sampleTableSchema,
    sampleQueryHistory,
    sampleTableInfo.stats
  );
  
  assert(partitioningRecommendation.type !== 'NONE', 'Should recommend a partitioning type');
  assert(partitioningRecommendation.fields.length > 0, 'Should recommend partitioning fields');
  
  // Test generating partitioned table DDL
  const partitioningDDL = partitioningStrategy.generatePartitionedTableDDL(
    sampleTableInfo,
    partitioningRecommendation
  );
  
  assert(partitioningDDL.includes('CREATE OR REPLACE TABLE'), 'DDL should include CREATE statement');
  assert(partitioningDDL.includes('PARTITION BY'), 'DDL should include PARTITION BY clause');
  
  // Test estimating partitioning benefits
  const partitioningBenefits = partitioningStrategy.estimatePartitioningBenefits(
    sampleTableInfo,
    partitioningRecommendation,
    sampleQueryHistory
  );
  
  assert(partitioningBenefits.estimatedCostSavingsPercent > 0, 'Should estimate cost savings');
  assert(partitioningBenefits.estimatedPerformanceImprovementPercent > 0, 'Should estimate performance improvement');
  
  console.log('Partitioning Strategy tests passed!');
}

/**
 * Test suite for clustering strategy
 */
function testClusteringStrategy() {
  console.log('Testing Clustering Strategy...');
  
  // Test finding clusterable fields
  const clusterableFields = clusteringStrategy.findClusterableFields(sampleTableSchema);
  assert(clusterableFields.includes('id'), 'Should identify id as clusterable');
  assert(clusterableFields.includes('customer_id'), 'Should identify customer_id as clusterable');
  assert(clusterableFields.includes('region'), 'Should identify region as clusterable');
  
  // Test analyzing where clause fields
  const whereClauseFields = clusteringStrategy.analyzeWhereClauseFields(sampleQueryHistory);
  assert(whereClauseFields['date'] > 0, 'Should count date in where clauses');
  assert(whereClauseFields['customer_id'] > 0, 'Should count customer_id in where clauses');
  assert(whereClauseFields['region'] > 0, 'Should count region in where clauses');
  
  // Test analyzing group by fields
  const groupByFields = clusteringStrategy.analyzeGroupByFields(sampleQueryHistory);
  assert(groupByFields['region'] > 0, 'Should count region in group by clauses');
  assert(groupByFields['customer_id'] > 0, 'Should count customer_id in group by clauses');
  
  // Test recommending clustering strategy
  const clusteringRecommendation = clusteringStrategy.recommendClusteringStrategy(
    sampleTableSchema,
    sampleQueryHistory
  );
  
  assert(clusteringRecommendation.fields.length > 0, 'Should recommend clustering fields');
  assert(clusteringRecommendation.fields.length <= 4, 'Should recommend no more than 4 clustering fields');
  
  // Test generating clustered table DDL
  const clusteringDDL = clusteringStrategy.generateClusteredTableDDL(
    sampleTableInfo,
    clusteringRecommendation
  );
  
  assert(clusteringDDL.includes('CREATE OR REPLACE TABLE'), 'DDL should include CREATE statement');
  assert(clusteringDDL.includes('CLUSTER BY'), 'DDL should include CLUSTER BY clause');
  
  // Test estimating clustering benefits
  const clusteringBenefits = clusteringStrategy.estimateClusteringBenefits(
    sampleTableInfo,
    clusteringRecommendation,
    sampleQueryHistory
  );
  
  assert(clusteringBenefits.estimatedCostSavingsPercent > 0, 'Should estimate cost savings');
  assert(clusteringBenefits.estimatedPerformanceImprovementPercent > 0, 'Should estimate performance improvement');
  
  console.log('Clustering Strategy tests passed!');
}

/**
 * Test suite for materialized view manager
 */
function testMaterializedViewManager() {
  console.log('Testing Materialized View Manager...');
  
  // Test identifying candidate queries
  const candidateQueries = materializedViewManager.identifyCandidateQueries(sampleQueryHistory);
  assert(candidateQueries.length > 0, 'Should identify candidate queries for materialized views');
  
  // Test recommending materialized views
  const materializedViewRecommendations = materializedViewManager.recommendMaterializedViews(
    sampleTableInfo,
    sampleQueryHistory
  );
  
  assert(Array.isArray(materializedViewRecommendations), 'Should return an array of recommendations');
  
  if (materializedViewRecommendations.length > 0) {
    const firstView = materializedViewRecommendations[0];
    assert(firstView.name, 'View recommendation should have a name');
    assert(firstView.query, 'View recommendation should have a query');
    
    // Test generating materialized view DDL
    const viewDDL = materializedViewManager.generateMaterializedViewDDL(firstView);
    assert(viewDDL.includes('CREATE MATERIALIZED VIEW'), 'DDL should include CREATE MATERIALIZED VIEW statement');
    
    // Test estimating materialized view benefits
    const viewBenefits = materializedViewManager.estimateMaterializedViewBenefits(
      materializedViewRecommendations,
      sampleQueryHistory
    );
    
    assert(viewBenefits.estimatedCostSavingsPercent >= 0, 'Should estimate cost savings');
    assert(viewBenefits.estimatedPerformanceImprovementPercent >= 0, 'Should estimate performance improvement');
  }
  
  console.log('Materialized View Manager tests passed!');
}

/**
 * Test suite for query performance tracker
 */
function testQueryPerformanceTracker() {
  console.log('Testing Query Performance Tracker...');
  
  // Test recording query performance
  const queryInfo = {
    sql: 'SELECT * FROM test_dataset.test_table WHERE date = "2023-06-01"',
    jobId: 'job6',
    startTime: new Date('2023-06-02T10:00:00Z').getTime(),
    endTime: new Date('2023-06-02T10:01:00Z').getTime(),
    bytesProcessed: 1200000000,
    status: 'COMPLETED',
    user: 'user1@example.com'
  };
  
  const performanceRecord = queryPerformanceTracker.recordQueryPerformance(queryInfo);
  assert(performanceRecord.executionTimeMs > 0, 'Should calculate execution time');
  assert(performanceRecord.normalizedQuery, 'Should normalize the query');
  
  // Test normalizing query
  const normalizedQuery = queryPerformanceTracker.normalizeQueryForGrouping(queryInfo.sql);
  assert(!normalizedQuery.includes('"2023-06-01"'), 'Should replace literals with placeholders');
  
  // Test classifying query performance
  const classification = queryPerformanceTracker.classifyQueryPerformance(performanceRecord);
  assert(classification.category, 'Should classify the query performance');
  
  // Test analyzing query performance
  const performanceAnalysis = queryPerformanceTracker.analyzeQueryPerformance(
    [...sampleQueryHistory, queryInfo]
  );
  
  assert(performanceAnalysis.totalQueries === 6, 'Should count all queries');
  assert(Array.isArray(performanceAnalysis.slowQueries), 'Should identify slow queries');
  assert(Array.isArray(performanceAnalysis.expensiveQueries), 'Should identify expensive queries');
  
  console.log('Query Performance Tracker tests passed!');
}

/**
 * Test suite for cost estimator
 */
function testCostEstimator() {
  console.log('Testing Cost Estimator...');
  
  // Test estimating query cost
  const queryCost = costEstimator.estimateQueryCost(1000000000); // 1 GB
  assert(queryCost.cost > 0, 'Should estimate query cost');
  
  // Test estimating storage cost
  const storageCost = costEstimator.estimateStorageCost({
    activeStorageBytes: 10000000000, // 10 GB
    longTermStorageBytes: 5000000000 // 5 GB
  });
  
  assert(storageCost.totalCost > 0, 'Should estimate storage cost');
  
  // Test estimating streaming cost
  const streamingCost = costEstimator.estimateStreamingCost(1000000000); // 1 GB
  assert(streamingCost.cost > 0, 'Should estimate streaming cost');
  
  // Test comparing on-demand vs flat-rate pricing
  const pricingComparison = costEstimator.compareOnDemandVsFlatRate({
    monthlyBytesProcessed: 100 * costEstimator.BYTES.TB, // 100 TB
    peakConcurrentQueries: 10
  });
  
  assert(pricingComparison.recommendation.model, 'Should recommend a pricing model');
  
  // Test analyzing query costs
  const costAnalysis = costEstimator.analyzeQueryCosts(sampleQueryHistory);
  assert(costAnalysis.totalQueries === 5, 'Should count all queries');
  assert(costAnalysis.estimatedMonthlyCost > 0, 'Should estimate monthly cost');
  assert(Array.isArray(costAnalysis.optimizationSuggestions), 'Should provide optimization suggestions');
  
  console.log('Cost Estimator tests passed!');
}

/**
 * Test suite for the main BigQuery optimizer
 */
function testBigQueryOptimizer() {
  console.log('Testing BigQuery Optimizer...');
  
  // Test analyzing table optimizations
  const tableOptimizations = bigqueryOptimizer.analyzeTableOptimizations(
    sampleTableInfo,
    sampleQueryHistory
  );
  
  assert(tableOptimizations.recommendations, 'Should provide recommendations');
  assert(tableOptimizations.benefits, 'Should estimate benefits');
  assert(tableOptimizations.implementation, 'Should provide implementation details');
  assert(tableOptimizations.priority, 'Should assign priority');
  
  // Test analyzing query performance
  const performanceAnalysis = bigqueryOptimizer.analyzeQueryPerformance(sampleQueryHistory);
  assert(performanceAnalysis.totalQueries === 5, 'Should analyze all queries');
  
  // Test analyzing query costs
  const costAnalysis = bigqueryOptimizer.analyzeQueryCosts(sampleQueryHistory);
  assert(costAnalysis.totalQueries === 5, 'Should analyze all queries');
  
  // Test generating optimization plan
  const projectInfo = {
    projectId: 'test-project',
    datasets: [{ datasetId: 'test_dataset' }]
  };
  
  const optimizationPlan = bigqueryOptimizer.generateOptimizationPlan(
    projectInfo,
    [sampleTableInfo],
    sampleQueryHistory
  );
  
  assert(optimizationPlan.summary, 'Should provide a summary');
  assert(Array.isArray(optimizationPlan.projectRecommendations), 'Should provide project recommendations');
  assert(Array.isArray(optimizationPlan.tableOptimizations), 'Should provide table optimizations');
  assert(optimizationPlan.implementationPlan, 'Should provide an implementation plan');
  
  console.log('BigQuery Optimizer tests passed!');
}

/**
 * Run all tests
 */
function runTests() {
  console.log('Starting BigQuery Optimization tests...');
  
  try {
    testPartitioningStrategy();
    testClusteringStrategy();
    testMaterializedViewManager();
    testQueryPerformanceTracker();
    testCostEstimator();
    testBigQueryOptimizer();
    
    console.log('All BigQuery Optimization tests passed!');
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

// Run the tests
runTests(); 