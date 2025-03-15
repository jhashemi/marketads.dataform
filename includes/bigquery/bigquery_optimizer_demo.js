/**
 * @fileoverview BigQuery Optimizer Demo
 * 
 * This script demonstrates the BigQuery optimization functionality using sample data.
 * It shows how to use the optimizer to analyze tables, recommend optimizations,
 * and generate an implementation plan.
 */

const bigqueryOptimizer = require('./bigquery_optimizer');

/**
 * Sample project information
 */
const projectInfo = {
  projectId: 'marketads-analytics',
  datasets: [
    { datasetId: 'marketing_data' },
    { datasetId: 'sales_data' },
    { datasetId: 'user_data' }
  ]
};

/**
 * Sample table schemas
 */
const tableSchemas = {
  // Marketing campaign table
  campaigns: [
    { name: 'campaign_id', type: 'INTEGER' },
    { name: 'campaign_name', type: 'STRING' },
    { name: 'start_date', type: 'DATE' },
    { name: 'end_date', type: 'DATE' },
    { name: 'budget', type: 'FLOAT' },
    { name: 'channel', type: 'STRING' },
    { name: 'region', type: 'STRING' }
  ],
  
  // Ad impressions table
  impressions: [
    { name: 'impression_id', type: 'INTEGER' },
    { name: 'campaign_id', type: 'INTEGER' },
    { name: 'timestamp', type: 'TIMESTAMP' },
    { name: 'user_id', type: 'INTEGER' },
    { name: 'ad_id', type: 'INTEGER' },
    { name: 'device_type', type: 'STRING' },
    { name: 'browser', type: 'STRING' },
    { name: 'country', type: 'STRING' },
    { name: 'region', type: 'STRING' },
    { name: 'city', type: 'STRING' },
    { name: 'is_click', type: 'BOOLEAN' },
    { name: 'cost', type: 'FLOAT' }
  ],
  
  // User events table
  events: [
    { name: 'event_id', type: 'INTEGER' },
    { name: 'user_id', type: 'INTEGER' },
    { name: 'timestamp', type: 'TIMESTAMP' },
    { name: 'event_type', type: 'STRING' },
    { name: 'product_id', type: 'INTEGER' },
    { name: 'category_id', type: 'INTEGER' },
    { name: 'quantity', type: 'INTEGER' },
    { name: 'price', type: 'FLOAT' },
    { name: 'revenue', type: 'FLOAT' },
    { name: 'device_type', type: 'STRING' },
    { name: 'country', type: 'STRING' }
  ],
  
  // Sales data table
  sales: [
    { name: 'sale_id', type: 'INTEGER' },
    { name: 'user_id', type: 'INTEGER' },
    { name: 'sale_date', type: 'DATE' },
    { name: 'product_id', type: 'INTEGER' },
    { name: 'quantity', type: 'INTEGER' },
    { name: 'unit_price', type: 'FLOAT' },
    { name: 'total_amount', type: 'FLOAT' },
    { name: 'discount', type: 'FLOAT' },
    { name: 'campaign_id', type: 'INTEGER' },
    { name: 'region', type: 'STRING' },
    { name: 'store_id', type: 'INTEGER' }
  ]
};

/**
 * Sample table information
 */
const tableInfos = [
  {
    projectId: 'marketads-analytics',
    datasetId: 'marketing_data',
    tableId: 'campaigns',
    schema: tableSchemas.campaigns,
    stats: {
      numRows: 500,
      numBytes: 250000,
      creationTime: new Date('2023-01-01').getTime(),
      lastModifiedTime: new Date('2023-06-01').getTime(),
      totalBytesProcessed: 1000000
    }
  },
  {
    projectId: 'marketads-analytics',
    datasetId: 'marketing_data',
    tableId: 'impressions',
    schema: tableSchemas.impressions,
    stats: {
      numRows: 50000000,
      numBytes: 15000000000,
      creationTime: new Date('2023-01-01').getTime(),
      lastModifiedTime: new Date('2023-06-01').getTime(),
      totalBytesProcessed: 75000000000
    }
  },
  {
    projectId: 'marketads-analytics',
    datasetId: 'user_data',
    tableId: 'events',
    schema: tableSchemas.events,
    stats: {
      numRows: 25000000,
      numBytes: 10000000000,
      creationTime: new Date('2023-01-01').getTime(),
      lastModifiedTime: new Date('2023-06-01').getTime(),
      totalBytesProcessed: 50000000000
    }
  },
  {
    projectId: 'marketads-analytics',
    datasetId: 'sales_data',
    tableId: 'sales',
    schema: tableSchemas.sales,
    stats: {
      numRows: 10000000,
      numBytes: 5000000000,
      creationTime: new Date('2023-01-01').getTime(),
      lastModifiedTime: new Date('2023-06-01').getTime(),
      totalBytesProcessed: 25000000000
    }
  }
];

/**
 * Sample query history
 */
const queryHistory = [
  // Impression analysis queries
  {
    sql: 'SELECT DATE(timestamp) as day, COUNT(*) as impressions, SUM(CASE WHEN is_click THEN 1 ELSE 0 END) as clicks FROM marketing_data.impressions WHERE DATE(timestamp) BETWEEN "2023-05-01" AND "2023-05-31" GROUP BY day ORDER BY day',
    jobId: 'job1',
    startTime: new Date('2023-06-01T10:00:00Z').getTime(),
    endTime: new Date('2023-06-01T10:01:30Z').getTime(),
    bytesProcessed: 12000000000,
    status: 'COMPLETED',
    user: 'analyst1@marketads.com'
  },
  {
    sql: 'SELECT campaign_id, COUNT(*) as impressions, SUM(CASE WHEN is_click THEN 1 ELSE 0 END) as clicks, SUM(cost) as total_cost FROM marketing_data.impressions WHERE DATE(timestamp) BETWEEN "2023-05-01" AND "2023-05-31" GROUP BY campaign_id',
    jobId: 'job2',
    startTime: new Date('2023-06-01T11:00:00Z').getTime(),
    endTime: new Date('2023-06-01T11:02:00Z').getTime(),
    bytesProcessed: 12500000000,
    status: 'COMPLETED',
    user: 'analyst2@marketads.com'
  },
  {
    sql: 'SELECT region, device_type, COUNT(*) as impressions FROM marketing_data.impressions WHERE DATE(timestamp) = "2023-05-15" GROUP BY region, device_type ORDER BY impressions DESC',
    jobId: 'job3',
    startTime: new Date('2023-06-01T12:00:00Z').getTime(),
    endTime: new Date('2023-06-01T12:00:45Z').getTime(),
    bytesProcessed: 5000000000,
    status: 'COMPLETED',
    user: 'analyst1@marketads.com'
  },
  
  // Campaign analysis queries
  {
    sql: 'SELECT c.campaign_id, c.campaign_name, c.channel, COUNT(i.impression_id) as impressions, SUM(CASE WHEN i.is_click THEN 1 ELSE 0 END) as clicks FROM marketing_data.campaigns c JOIN marketing_data.impressions i ON c.campaign_id = i.campaign_id WHERE c.start_date <= "2023-05-15" AND c.end_date >= "2023-05-15" GROUP BY c.campaign_id, c.campaign_name, c.channel',
    jobId: 'job4',
    startTime: new Date('2023-06-01T13:00:00Z').getTime(),
    endTime: new Date('2023-06-01T13:03:00Z').getTime(),
    bytesProcessed: 15000000000,
    status: 'COMPLETED',
    user: 'manager1@marketads.com'
  },
  
  // User event analysis queries
  {
    sql: 'SELECT DATE(timestamp) as day, event_type, COUNT(*) as event_count FROM user_data.events WHERE DATE(timestamp) BETWEEN "2023-05-01" AND "2023-05-31" GROUP BY day, event_type ORDER BY day, event_type',
    jobId: 'job5',
    startTime: new Date('2023-06-01T14:00:00Z').getTime(),
    endTime: new Date('2023-06-01T14:01:15Z').getTime(),
    bytesProcessed: 8000000000,
    status: 'COMPLETED',
    user: 'analyst3@marketads.com'
  },
  {
    sql: 'SELECT e.user_id, COUNT(*) as event_count, SUM(e.revenue) as total_revenue FROM user_data.events e WHERE e.event_type = "purchase" AND DATE(e.timestamp) BETWEEN "2023-05-01" AND "2023-05-31" GROUP BY e.user_id ORDER BY total_revenue DESC LIMIT 100',
    jobId: 'job6',
    startTime: new Date('2023-06-01T15:00:00Z').getTime(),
    endTime: new Date('2023-06-01T15:00:50Z').getTime(),
    bytesProcessed: 7500000000,
    status: 'COMPLETED',
    user: 'analyst2@marketads.com'
  },
  
  // Sales analysis queries
  {
    sql: 'SELECT DATE(sale_date) as day, SUM(total_amount) as daily_sales FROM sales_data.sales WHERE sale_date BETWEEN "2023-05-01" AND "2023-05-31" GROUP BY day ORDER BY day',
    jobId: 'job7',
    startTime: new Date('2023-06-01T16:00:00Z').getTime(),
    endTime: new Date('2023-06-01T16:00:40Z').getTime(),
    bytesProcessed: 4000000000,
    status: 'COMPLETED',
    user: 'analyst4@marketads.com'
  },
  {
    sql: 'SELECT s.region, SUM(s.total_amount) as region_sales, COUNT(DISTINCT s.user_id) as unique_customers FROM sales_data.sales s WHERE s.sale_date BETWEEN "2023-05-01" AND "2023-05-31" GROUP BY s.region ORDER BY region_sales DESC',
    jobId: 'job8',
    startTime: new Date('2023-06-01T17:00:00Z').getTime(),
    endTime: new Date('2023-06-01T17:00:35Z').getTime(),
    bytesProcessed: 4200000000,
    status: 'COMPLETED',
    user: 'manager2@marketads.com'
  },
  
  // Cross-table analysis queries
  {
    sql: 'SELECT c.campaign_id, c.campaign_name, COUNT(DISTINCT s.user_id) as customers, SUM(s.total_amount) as sales FROM marketing_data.campaigns c JOIN marketing_data.impressions i ON c.campaign_id = i.campaign_id JOIN sales_data.sales s ON i.user_id = s.user_id AND s.campaign_id = c.campaign_id WHERE c.start_date <= s.sale_date AND c.end_date >= s.sale_date AND s.sale_date BETWEEN "2023-05-01" AND "2023-05-31" GROUP BY c.campaign_id, c.campaign_name ORDER BY sales DESC',
    jobId: 'job9',
    startTime: new Date('2023-06-01T18:00:00Z').getTime(),
    endTime: new Date('2023-06-01T18:05:00Z').getTime(),
    bytesProcessed: 30000000000,
    status: 'COMPLETED',
    user: 'director@marketads.com'
  },
  {
    sql: 'SELECT e.device_type, COUNT(DISTINCT e.user_id) as users, AVG(e.revenue) as avg_revenue FROM user_data.events e WHERE e.event_type = "purchase" AND DATE(e.timestamp) BETWEEN "2023-05-01" AND "2023-05-31" GROUP BY e.device_type ORDER BY users DESC',
    jobId: 'job10',
    startTime: new Date('2023-06-01T19:00:00Z').getTime(),
    endTime: new Date('2023-06-01T19:01:10Z').getTime(),
    bytesProcessed: 7800000000,
    status: 'COMPLETED',
    user: 'analyst3@marketads.com'
  }
];

/**
 * Runs the BigQuery Optimizer demo
 */
function runDemo() {
  console.log('=== BigQuery Optimizer Demo ===');
  console.log('Analyzing tables and query patterns to recommend optimizations...\n');
  
  // Generate optimization plan
  const optimizationPlan = bigqueryOptimizer.generateOptimizationPlan(
    projectInfo,
    tableInfos,
    queryHistory
  );
  
  // Display summary
  console.log('=== Optimization Summary ===');
  console.log(`Project: ${optimizationPlan.projectInfo.projectId}`);
  console.log(`Datasets: ${optimizationPlan.projectInfo.datasetCount}`);
  console.log(`Tables: ${optimizationPlan.summary.totalTables}`);
  console.log(`Tables with recommendations: ${optimizationPlan.summary.tablesWithRecommendations}`);
  console.log(`Potential cost savings: $${optimizationPlan.summary.potentialCostSavings.toFixed(2)} (${optimizationPlan.summary.potentialCostSavingsPercent.toFixed(2)}%)`);
  console.log(`Potential performance improvement: ${optimizationPlan.summary.potentialPerformanceImprovement.toFixed(2)}%\n`);
  
  // Display project recommendations
  console.log('=== Project Recommendations ===');
  optimizationPlan.projectRecommendations.forEach((recommendation, index) => {
    console.log(`${index + 1}. [${recommendation.priority.toUpperCase()}] ${recommendation.description}`);
    
    if (recommendation.tables) {
      console.log('   Affected tables:');
      recommendation.tables.forEach(table => {
        console.log(`   - ${table}`);
      });
    }
    
    if (recommendation.estimatedSavings) {
      console.log(`   Estimated savings: $${recommendation.estimatedSavings.toFixed(2)} (${recommendation.estimatedSavingsPercent.toFixed(2)}%)`);
    }
    
    console.log('');
  });
  
  // Display table-specific recommendations
  console.log('=== Table-Specific Recommendations ===');
  optimizationPlan.tableOptimizations.slice(0, 3).forEach((tableOpt, index) => {
    console.log(`${index + 1}. Table: ${tableOpt.tableInfo.fullPath} [${tableOpt.priority.level.toUpperCase()}]`);
    
    // Partitioning recommendations
    if (tableOpt.recommendations.partitioning.fields.length > 0) {
      console.log(`   Partitioning: ${tableOpt.recommendations.partitioning.type} on ${tableOpt.recommendations.partitioning.fields.join(', ')}`);
      console.log(`   Estimated partitioning benefits:`);
      console.log(`   - Cost savings: ${tableOpt.benefits.partitioning.estimatedCostSavingsPercent.toFixed(2)}%`);
      console.log(`   - Performance improvement: ${tableOpt.benefits.partitioning.estimatedPerformanceImprovementPercent.toFixed(2)}%`);
    }
    
    // Clustering recommendations
    if (tableOpt.recommendations.clustering.fields.length > 0) {
      console.log(`   Clustering on: ${tableOpt.recommendations.clustering.fields.join(', ')}`);
      console.log(`   Estimated clustering benefits:`);
      console.log(`   - Cost savings: ${tableOpt.benefits.clustering.estimatedCostSavingsPercent.toFixed(2)}%`);
      console.log(`   - Performance improvement: ${tableOpt.benefits.clustering.estimatedPerformanceImprovementPercent.toFixed(2)}%`);
    }
    
    // Materialized view recommendations
    if (tableOpt.recommendations.materializedViews.length > 0) {
      console.log(`   Materialized views: ${tableOpt.recommendations.materializedViews.length} recommended`);
      tableOpt.recommendations.materializedViews.forEach((view, viewIndex) => {
        console.log(`   - View ${viewIndex + 1}: ${view.name}`);
        console.log(`     Query pattern: ${view.query.substring(0, 100)}...`);
      });
      console.log(`   Estimated materialized view benefits:`);
      console.log(`   - Cost savings: ${tableOpt.benefits.materializedViews.estimatedCostSavingsPercent.toFixed(2)}%`);
      console.log(`   - Performance improvement: ${tableOpt.benefits.materializedViews.estimatedPerformanceImprovementPercent.toFixed(2)}%`);
    }
    
    // Combined benefits
    console.log(`   Combined benefits:`);
    console.log(`   - Total cost savings: ${tableOpt.benefits.combined.estimatedCostSavingsPercent.toFixed(2)}%`);
    console.log(`   - Total performance improvement: ${tableOpt.benefits.combined.estimatedPerformanceImprovementPercent.toFixed(2)}%`);
    
    console.log('');
  });
  
  // Display implementation plan
  console.log('=== Implementation Plan ===');
  console.log(`Total estimated effort: ${optimizationPlan.implementationPlan.estimatedEffort.totalPersonDays.toFixed(2)} person-days`);
  console.log('Optimization counts:');
  console.log(`- Partitioning: ${optimizationPlan.implementationPlan.estimatedEffort.optimizationCounts.partitioning}`);
  console.log(`- Clustering: ${optimizationPlan.implementationPlan.estimatedEffort.optimizationCounts.clustering}`);
  console.log(`- Materialized views: ${optimizationPlan.implementationPlan.estimatedEffort.optimizationCounts.materializedViews}`);
  
  console.log('\nPhased implementation:');
  optimizationPlan.implementationPlan.phases.forEach((phase, index) => {
    console.log(`${phase.name} (${optimizationPlan.implementationPlan.estimatedEffort.phaseBreakdown[`phase${index + 1}`].toFixed(2)} person-days)`);
    console.log(`- ${phase.description}`);
    console.log(`- Tables: ${phase.tables.length}`);
    console.log('');
  });
  
  // Display sample DDL for the highest priority table
  if (optimizationPlan.tableOptimizations.length > 0) {
    const highestPriorityTable = optimizationPlan.tableOptimizations[0];
    console.log('=== Sample Implementation DDL ===');
    console.log(`Table: ${highestPriorityTable.tableInfo.fullPath}\n`);
    
    if (highestPriorityTable.implementation.partitioningDDL) {
      console.log('Partitioning DDL:');
      console.log(highestPriorityTable.implementation.partitioningDDL);
      console.log('');
    }
    
    if (highestPriorityTable.implementation.clusteringDDL) {
      console.log('Clustering DDL:');
      console.log(highestPriorityTable.implementation.clusteringDDL);
      console.log('');
    }
    
    if (highestPriorityTable.implementation.materializedViewDDLs && 
        highestPriorityTable.implementation.materializedViewDDLs.length > 0) {
      console.log('Materialized View DDL (first view):');
      console.log(highestPriorityTable.implementation.materializedViewDDLs[0]);
      console.log('');
    }
  }
  
  // Display query performance analysis
  console.log('=== Query Performance Analysis ===');
  const performanceAnalysis = optimizationPlan.performanceAnalysis;
  console.log(`Total queries analyzed: ${performanceAnalysis.totalQueries}`);
  console.log(`Slow queries identified: ${performanceAnalysis.slowQueries.length}`);
  console.log(`Expensive queries identified: ${performanceAnalysis.expensiveQueries.length}`);
  
  if (performanceAnalysis.slowQueries.length > 0) {
    console.log('\nTop 3 slowest queries:');
    performanceAnalysis.slowQueries.slice(0, 3).forEach((query, index) => {
      console.log(`${index + 1}. Execution time: ${(query.executionTimeMs / 1000).toFixed(2)} seconds`);
      console.log(`   Bytes processed: ${(query.bytesProcessed / 1000000000).toFixed(2)} GB`);
      console.log(`   Query: ${query.normalizedQuery.substring(0, 100)}...`);
      console.log('');
    });
  }
  
  // Display cost analysis
  console.log('=== Cost Analysis ===');
  const costAnalysis = optimizationPlan.costAnalysis;
  console.log(`Estimated monthly cost: $${costAnalysis.estimatedMonthlyCost.toFixed(2)}`);
  console.log(`Estimated monthly bytes processed: ${(costAnalysis.estimatedMonthlyBytesProcessed / 1000000000000).toFixed(2)} TB`);
  
  if (costAnalysis.costliestPatterns && costAnalysis.costliestPatterns.length > 0) {
    console.log('\nTop 3 costliest query patterns:');
    costAnalysis.costliestPatterns.slice(0, 3).forEach((pattern, index) => {
      console.log(`${index + 1}. Monthly cost: $${pattern.estimatedMonthlyCost.toFixed(2)}`);
      console.log(`   Execution count: ${pattern.count}`);
      console.log(`   Bytes processed: ${(pattern.totalBytesProcessed / 1000000000).toFixed(2)} GB`);
      console.log(`   Query: ${pattern.sampleQuery.substring(0, 100)}...`);
      console.log('');
    });
  }
  
  if (costAnalysis.optimizationSuggestions && costAnalysis.optimizationSuggestions.length > 0) {
    console.log('Cost optimization suggestions:');
    costAnalysis.optimizationSuggestions.forEach((suggestion, index) => {
      console.log(`${index + 1}. [${suggestion.priority.toUpperCase()}] ${suggestion.description}`);
      if (suggestion.estimatedMonthlySavings) {
        console.log(`   Estimated monthly savings: $${suggestion.estimatedMonthlySavings.toFixed(2)}`);
      }
      console.log('');
    });
  }
  
  console.log('=== Demo Complete ===');
}

// Run the demo
runDemo(); 