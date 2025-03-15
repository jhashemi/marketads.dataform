/**
 * @fileoverview BigQuery Optimizer
 * 
 * This module serves as the main entry point for BigQuery optimization functionality.
 * It integrates all optimization components (partitioning, clustering, materialized views,
 * query performance tracking, and cost estimation) to provide a comprehensive
 * optimization solution for BigQuery workloads.
 */

const partitioningStrategy = require('./partitioning_strategy');
const clusteringStrategy = require('./clustering_strategy');
const materializedViewManager = require('./materialized_view_manager');
const queryPerformanceTracker = require('./query_performance_tracker');
const costEstimator = require('./cost_estimator');

/**
 * Analyzes a BigQuery table and provides comprehensive optimization recommendations
 * 
 * @param {Object} tableInfo - Information about the table to optimize
 * @param {string} tableInfo.projectId - Google Cloud project ID
 * @param {string} tableInfo.datasetId - BigQuery dataset ID
 * @param {string} tableInfo.tableId - BigQuery table ID
 * @param {Array} tableInfo.schema - Table schema
 * @param {Object} tableInfo.stats - Table statistics
 * @param {Array} queryHistory - Query history for the table
 * @param {Object} options - Optimization options
 * @returns {Object} Comprehensive optimization recommendations
 */
function analyzeTableOptimizations(tableInfo, queryHistory = [], options = {}) {
  if (!tableInfo || !tableInfo.projectId || !tableInfo.datasetId || !tableInfo.tableId) {
    throw new Error('Table information must include projectId, datasetId, and tableId');
  }
  
  // Get partitioning recommendations
  const partitioningRecommendation = partitioningStrategy.recommendPartitioningStrategy(
    tableInfo.schema,
    queryHistory,
    tableInfo.stats
  );
  
  // Get clustering recommendations
  const clusteringRecommendation = clusteringStrategy.recommendClusteringStrategy(
    tableInfo.schema,
    queryHistory
  );
  
  // Get materialized view recommendations
  const materializedViewRecommendations = materializedViewManager.recommendMaterializedViews(
    tableInfo,
    queryHistory
  );
  
  // Estimate benefits
  const partitioningBenefits = partitioningStrategy.estimatePartitioningBenefits(
    tableInfo,
    partitioningRecommendation,
    queryHistory
  );
  
  const clusteringBenefits = clusteringStrategy.estimateClusteringBenefits(
    tableInfo,
    clusteringRecommendation,
    queryHistory
  );
  
  const materializedViewBenefits = materializedViewManager.estimateMaterializedViewBenefits(
    materializedViewRecommendations,
    queryHistory
  );
  
  // Generate DDL statements
  const partitioningDDL = partitioningRecommendation.fields.length > 0 ?
    partitioningStrategy.generatePartitionedTableDDL(tableInfo, partitioningRecommendation) : null;
  
  const clusteringDDL = clusteringRecommendation.fields.length > 0 ?
    clusteringStrategy.generateClusteredTableDDL(tableInfo, clusteringRecommendation) : null;
  
  const materializedViewDDLs = materializedViewRecommendations.map(view => 
    materializedViewManager.generateMaterializedViewDDL(view)
  );
  
  // Combine recommendations
  return {
    tableInfo: {
      projectId: tableInfo.projectId,
      datasetId: tableInfo.datasetId,
      tableId: tableInfo.tableId,
      fullPath: `${tableInfo.projectId}.${tableInfo.datasetId}.${tableInfo.tableId}`
    },
    recommendations: {
      partitioning: partitioningRecommendation,
      clustering: clusteringRecommendation,
      materializedViews: materializedViewRecommendations
    },
    benefits: {
      partitioning: partitioningBenefits,
      clustering: clusteringBenefits,
      materializedViews: materializedViewBenefits,
      combined: {
        estimatedCostSavingsPercent: calculateCombinedSavings([
          partitioningBenefits.estimatedCostSavingsPercent,
          clusteringBenefits.estimatedCostSavingsPercent,
          materializedViewBenefits.estimatedCostSavingsPercent
        ]),
        estimatedPerformanceImprovementPercent: calculateCombinedPerformance([
          partitioningBenefits.estimatedPerformanceImprovementPercent,
          clusteringBenefits.estimatedPerformanceImprovementPercent,
          materializedViewBenefits.estimatedPerformanceImprovementPercent
        ])
      }
    },
    implementation: {
      partitioningDDL,
      clusteringDDL,
      materializedViewDDLs
    },
    priority: determinePriority(partitioningBenefits, clusteringBenefits, materializedViewBenefits)
  };
}

/**
 * Analyzes query performance for a set of queries
 * 
 * @param {Array} queryHistory - Array of query execution records
 * @param {Object} options - Analysis options
 * @returns {Object} Query performance analysis
 */
function analyzeQueryPerformance(queryHistory, options = {}) {
  return queryPerformanceTracker.analyzeQueryPerformance(queryHistory, options);
}

/**
 * Analyzes costs for a set of queries
 * 
 * @param {Array} queryHistory - Array of query execution records
 * @param {Object} options - Analysis options
 * @returns {Object} Cost analysis and optimization suggestions
 */
function analyzeQueryCosts(queryHistory, options = {}) {
  return costEstimator.analyzeQueryCosts(queryHistory, options);
}

/**
 * Generates a comprehensive optimization plan for a BigQuery project
 * 
 * @param {Object} projectInfo - Information about the project
 * @param {string} projectInfo.projectId - Google Cloud project ID
 * @param {Array} projectInfo.datasets - Array of datasets in the project
 * @param {Array} tableInfos - Array of table information objects
 * @param {Array} queryHistory - Query history for the project
 * @param {Object} options - Optimization options
 * @returns {Object} Comprehensive optimization plan
 */
function generateOptimizationPlan(projectInfo, tableInfos, queryHistory, options = {}) {
  if (!projectInfo || !projectInfo.projectId || !tableInfos || tableInfos.length === 0) {
    throw new Error('Project information and table information are required');
  }
  
  // Analyze each table
  const tableOptimizations = tableInfos.map(tableInfo => 
    analyzeTableOptimizations(tableInfo, filterQueryHistoryForTable(queryHistory, tableInfo), options)
  );
  
  // Analyze overall query performance
  const performanceAnalysis = analyzeQueryPerformance(queryHistory, options);
  
  // Analyze overall costs
  const costAnalysis = analyzeQueryCosts(queryHistory, options);
  
  // Generate project-level recommendations
  const projectRecommendations = generateProjectRecommendations(
    projectInfo,
    tableOptimizations,
    performanceAnalysis,
    costAnalysis
  );
  
  // Sort table optimizations by priority
  const prioritizedTableOptimizations = [...tableOptimizations]
    .sort((a, b) => b.priority.score - a.priority.score);
  
  // Calculate potential project-wide savings
  const potentialSavings = calculateProjectWideSavings(tableOptimizations, costAnalysis);
  
  return {
    projectInfo: {
      projectId: projectInfo.projectId,
      datasetCount: projectInfo.datasets ? projectInfo.datasets.length : 0,
      tableCount: tableInfos.length
    },
    summary: {
      totalTables: tableInfos.length,
      tablesWithRecommendations: tableOptimizations.filter(t => 
        t.recommendations.partitioning.fields.length > 0 ||
        t.recommendations.clustering.fields.length > 0 ||
        t.recommendations.materializedViews.length > 0
      ).length,
      potentialCostSavings: potentialSavings.costSavings,
      potentialCostSavingsPercent: potentialSavings.costSavingsPercent,
      potentialPerformanceImprovement: potentialSavings.performanceImprovement
    },
    projectRecommendations,
    tableOptimizations: prioritizedTableOptimizations,
    performanceAnalysis,
    costAnalysis,
    implementationPlan: generateImplementationPlan(prioritizedTableOptimizations)
  };
}

/**
 * Filters query history for a specific table
 * 
 * @param {Array} queryHistory - Full query history
 * @param {Object} tableInfo - Table information
 * @returns {Array} Filtered query history
 */
function filterQueryHistoryForTable(queryHistory, tableInfo) {
  if (!queryHistory || !tableInfo) {
    return [];
  }
  
  const tablePattern = new RegExp(
    `\\b${tableInfo.projectId}\\.${tableInfo.datasetId}\\.${tableInfo.tableId}\\b|` +
    `\\b${tableInfo.datasetId}\\.${tableInfo.tableId}\\b|` +
    `\\b${tableInfo.tableId}\\b`,
    'i'
  );
  
  return queryHistory.filter(query => 
    query.sql && tablePattern.test(query.sql)
  );
}

/**
 * Calculates combined cost savings percentage
 * 
 * @param {Array} savingsPercentages - Array of savings percentages
 * @returns {number} Combined savings percentage
 */
function calculateCombinedSavings(savingsPercentages) {
  // Filter out undefined or null values
  const validPercentages = savingsPercentages.filter(p => p !== undefined && p !== null);
  
  if (validPercentages.length === 0) {
    return 0;
  }
  
  // Use a diminishing returns formula for combined savings
  // Each subsequent optimization has less impact
  let combinedSavings = 0;
  let remainingCost = 100;
  
  validPercentages.sort((a, b) => b - a); // Sort in descending order
  
  validPercentages.forEach(savingsPercent => {
    const savings = remainingCost * (savingsPercent / 100);
    combinedSavings += savings;
    remainingCost -= savings;
  });
  
  return Math.min(99, combinedSavings); // Cap at 99% savings
}

/**
 * Calculates combined performance improvement percentage
 * 
 * @param {Array} performancePercentages - Array of performance improvement percentages
 * @returns {number} Combined performance improvement percentage
 */
function calculateCombinedPerformance(performancePercentages) {
  // Filter out undefined or null values
  const validPercentages = performancePercentages.filter(p => p !== undefined && p !== null);
  
  if (validPercentages.length === 0) {
    return 0;
  }
  
  // Use a diminishing returns formula for combined performance
  // Each subsequent optimization has less impact
  let combinedImprovement = 0;
  let remainingImprovement = 100;
  
  validPercentages.sort((a, b) => b - a); // Sort in descending order
  
  validPercentages.forEach(improvementPercent => {
    const improvement = remainingImprovement * (improvementPercent / 100);
    combinedImprovement += improvement;
    remainingImprovement -= improvement;
  });
  
  return Math.min(99, combinedImprovement); // Cap at 99% improvement
}

/**
 * Determines the priority of optimizations for a table
 * 
 * @param {Object} partitioningBenefits - Partitioning benefits
 * @param {Object} clusteringBenefits - Clustering benefits
 * @param {Object} materializedViewBenefits - Materialized view benefits
 * @returns {Object} Priority information
 */
function determinePriority(partitioningBenefits, clusteringBenefits, materializedViewBenefits) {
  // Calculate a score based on cost savings and performance improvements
  const costSavingsWeight = 0.7;
  const performanceWeight = 0.3;
  
  const partitioningScore = (
    (partitioningBenefits.estimatedCostSavingsPercent || 0) * costSavingsWeight +
    (partitioningBenefits.estimatedPerformanceImprovementPercent || 0) * performanceWeight
  );
  
  const clusteringScore = (
    (clusteringBenefits.estimatedCostSavingsPercent || 0) * costSavingsWeight +
    (clusteringBenefits.estimatedPerformanceImprovementPercent || 0) * performanceWeight
  );
  
  const materializedViewScore = (
    (materializedViewBenefits.estimatedCostSavingsPercent || 0) * costSavingsWeight +
    (materializedViewBenefits.estimatedPerformanceImprovementPercent || 0) * performanceWeight
  );
  
  const totalScore = partitioningScore + clusteringScore + materializedViewScore;
  
  // Determine priority level
  let level;
  if (totalScore >= 50) {
    level = 'high';
  } else if (totalScore >= 20) {
    level = 'medium';
  } else {
    level = 'low';
  }
  
  return {
    level,
    score: totalScore,
    components: {
      partitioning: partitioningScore,
      clustering: clusteringScore,
      materializedViews: materializedViewScore
    }
  };
}

/**
 * Generates project-level recommendations
 * 
 * @param {Object} projectInfo - Project information
 * @param {Array} tableOptimizations - Table optimization results
 * @param {Object} performanceAnalysis - Query performance analysis
 * @param {Object} costAnalysis - Cost analysis
 * @returns {Array} Project-level recommendations
 */
function generateProjectRecommendations(projectInfo, tableOptimizations, performanceAnalysis, costAnalysis) {
  const recommendations = [];
  
  // Check if flat-rate pricing would be beneficial
  if (costAnalysis.pricingComparison && 
      costAnalysis.pricingComparison.recommendation.model !== 'on_demand') {
    recommendations.push({
      type: 'pricing_model',
      priority: 'high',
      description: `Consider switching to ${costAnalysis.pricingComparison.recommendation.model.replace('_', ' ')} pricing`,
      estimatedSavings: costAnalysis.pricingComparison.recommendation.savingsAmount,
      estimatedSavingsPercent: costAnalysis.pricingComparison.recommendation.savingsPercent
    });
  }
  
  // Check for slow queries across the project
  if (performanceAnalysis.slowQueries && performanceAnalysis.slowQueries.length > 0) {
    recommendations.push({
      type: 'query_optimization',
      priority: 'high',
      description: `Optimize ${performanceAnalysis.slowQueries.length} slow queries identified across the project`,
      queries: performanceAnalysis.slowQueries.slice(0, 5).map(q => q.normalizedQuery) // Top 5 slow queries
    });
  }
  
  // Check for tables that would benefit from partitioning
  const tablesNeedingPartitioning = tableOptimizations.filter(t => 
    t.recommendations.partitioning.fields.length > 0 && 
    t.benefits.partitioning.estimatedCostSavingsPercent > 20
  );
  
  if (tablesNeedingPartitioning.length > 0) {
    recommendations.push({
      type: 'partitioning',
      priority: 'high',
      description: `Implement partitioning for ${tablesNeedingPartitioning.length} tables`,
      tables: tablesNeedingPartitioning.slice(0, 5).map(t => t.tableInfo.fullPath) // Top 5 tables
    });
  }
  
  // Check for tables that would benefit from clustering
  const tablesNeedingClustering = tableOptimizations.filter(t => 
    t.recommendations.clustering.fields.length > 0 && 
    t.benefits.clustering.estimatedCostSavingsPercent > 15
  );
  
  if (tablesNeedingClustering.length > 0) {
    recommendations.push({
      type: 'clustering',
      priority: 'medium',
      description: `Implement clustering for ${tablesNeedingClustering.length} tables`,
      tables: tablesNeedingClustering.slice(0, 5).map(t => t.tableInfo.fullPath) // Top 5 tables
    });
  }
  
  // Check for potential materialized views
  const tablesNeedingMaterializedViews = tableOptimizations.filter(t => 
    t.recommendations.materializedViews.length > 0
  );
  
  if (tablesNeedingMaterializedViews.length > 0) {
    const totalViewCount = tablesNeedingMaterializedViews.reduce(
      (sum, t) => sum + t.recommendations.materializedViews.length, 0
    );
    
    recommendations.push({
      type: 'materialized_views',
      priority: 'medium',
      description: `Create ${totalViewCount} materialized views across ${tablesNeedingMaterializedViews.length} tables`,
      tables: tablesNeedingMaterializedViews.slice(0, 5).map(t => t.tableInfo.fullPath) // Top 5 tables
    });
  }
  
  // Sort recommendations by priority
  return recommendations.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

/**
 * Calculates potential project-wide savings
 * 
 * @param {Array} tableOptimizations - Table optimization results
 * @param {Object} costAnalysis - Cost analysis
 * @returns {Object} Project-wide savings estimates
 */
function calculateProjectWideSavings(tableOptimizations, costAnalysis) {
  // Calculate weighted average of cost savings percentages
  let totalBytesProcessed = 0;
  let weightedSavingsSum = 0;
  let weightedPerformanceSum = 0;
  
  tableOptimizations.forEach(optimization => {
    const bytesProcessed = optimization.tableInfo.stats ? 
      optimization.tableInfo.stats.totalBytesProcessed || 0 : 0;
    
    if (bytesProcessed > 0) {
      totalBytesProcessed += bytesProcessed;
      weightedSavingsSum += bytesProcessed * (optimization.benefits.combined.estimatedCostSavingsPercent || 0);
      weightedPerformanceSum += bytesProcessed * (optimization.benefits.combined.estimatedPerformanceImprovementPercent || 0);
    }
  });
  
  let costSavingsPercent = 0;
  let performanceImprovement = 0;
  
  if (totalBytesProcessed > 0) {
    costSavingsPercent = weightedSavingsSum / totalBytesProcessed;
    performanceImprovement = weightedPerformanceSum / totalBytesProcessed;
  }
  
  // Calculate absolute cost savings
  const monthlyCost = costAnalysis.estimatedMonthlyCost || 0;
  const costSavings = monthlyCost * (costSavingsPercent / 100);
  
  return {
    costSavings,
    costSavingsPercent,
    performanceImprovement
  };
}

/**
 * Generates an implementation plan for the recommended optimizations
 * 
 * @param {Array} prioritizedTableOptimizations - Prioritized table optimization results
 * @returns {Object} Implementation plan
 */
function generateImplementationPlan(prioritizedTableOptimizations) {
  // Group optimizations into phases
  const highPriorityOptimizations = prioritizedTableOptimizations.filter(o => o.priority.level === 'high');
  const mediumPriorityOptimizations = prioritizedTableOptimizations.filter(o => o.priority.level === 'medium');
  const lowPriorityOptimizations = prioritizedTableOptimizations.filter(o => o.priority.level === 'low');
  
  // Create implementation phases
  return {
    phases: [
      {
        name: 'Phase 1: High Priority Optimizations',
        description: 'Implement high-impact optimizations for critical tables',
        tables: highPriorityOptimizations.map(o => ({
          tableName: o.tableInfo.fullPath,
          optimizations: getOptimizationTypes(o),
          ddlStatements: getDDLStatements(o)
        }))
      },
      {
        name: 'Phase 2: Medium Priority Optimizations',
        description: 'Implement moderate-impact optimizations',
        tables: mediumPriorityOptimizations.map(o => ({
          tableName: o.tableInfo.fullPath,
          optimizations: getOptimizationTypes(o),
          ddlStatements: getDDLStatements(o)
        }))
      },
      {
        name: 'Phase 3: Low Priority Optimizations',
        description: 'Implement remaining optimizations',
        tables: lowPriorityOptimizations.map(o => ({
          tableName: o.tableInfo.fullPath,
          optimizations: getOptimizationTypes(o),
          ddlStatements: getDDLStatements(o)
        }))
      }
    ],
    estimatedEffort: estimateImplementationEffort(
      highPriorityOptimizations,
      mediumPriorityOptimizations,
      lowPriorityOptimizations
    )
  };
}

/**
 * Gets the types of optimizations recommended for a table
 * 
 * @param {Object} optimization - Table optimization result
 * @returns {Array} Optimization types
 */
function getOptimizationTypes(optimization) {
  const types = [];
  
  if (optimization.recommendations.partitioning.fields.length > 0) {
    types.push('partitioning');
  }
  
  if (optimization.recommendations.clustering.fields.length > 0) {
    types.push('clustering');
  }
  
  if (optimization.recommendations.materializedViews.length > 0) {
    types.push('materialized_views');
  }
  
  return types;
}

/**
 * Gets the DDL statements for a table optimization
 * 
 * @param {Object} optimization - Table optimization result
 * @returns {Array} DDL statements
 */
function getDDLStatements(optimization) {
  const statements = [];
  
  if (optimization.implementation.partitioningDDL) {
    statements.push({
      type: 'partitioning',
      ddl: optimization.implementation.partitioningDDL
    });
  }
  
  if (optimization.implementation.clusteringDDL) {
    statements.push({
      type: 'clustering',
      ddl: optimization.implementation.clusteringDDL
    });
  }
  
  if (optimization.implementation.materializedViewDDLs && 
      optimization.implementation.materializedViewDDLs.length > 0) {
    optimization.implementation.materializedViewDDLs.forEach(ddl => {
      statements.push({
        type: 'materialized_view',
        ddl
      });
    });
  }
  
  return statements;
}

/**
 * Estimates the effort required to implement the optimization plan
 * 
 * @param {Array} highPriorityOptimizations - High priority optimizations
 * @param {Array} mediumPriorityOptimizations - Medium priority optimizations
 * @param {Array} lowPriorityOptimizations - Low priority optimizations
 * @returns {Object} Effort estimate
 */
function estimateImplementationEffort(highPriorityOptimizations, mediumPriorityOptimizations, lowPriorityOptimizations) {
  // Estimate effort in person-days
  const effortPerPartitioning = 0.5; // 0.5 person-days per partitioning
  const effortPerClustering = 0.25; // 0.25 person-days per clustering
  const effortPerMaterializedView = 0.75; // 0.75 person-days per materialized view
  
  // Count optimizations
  const countOptimizations = (optimizations) => {
    return {
      partitioning: optimizations.filter(o => 
        o.recommendations.partitioning.fields.length > 0
      ).length,
      clustering: optimizations.filter(o => 
        o.recommendations.clustering.fields.length > 0
      ).length,
      materializedViews: optimizations.reduce(
        (sum, o) => sum + o.recommendations.materializedViews.length, 0
      )
    };
  };
  
  const highCounts = countOptimizations(highPriorityOptimizations);
  const mediumCounts = countOptimizations(mediumPriorityOptimizations);
  const lowCounts = countOptimizations(lowPriorityOptimizations);
  
  // Calculate effort
  const calculateEffort = (counts) => {
    return (
      counts.partitioning * effortPerPartitioning +
      counts.clustering * effortPerClustering +
      counts.materializedViews * effortPerMaterializedView
    );
  };
  
  const highEffort = calculateEffort(highCounts);
  const mediumEffort = calculateEffort(mediumCounts);
  const lowEffort = calculateEffort(lowCounts);
  const totalEffort = highEffort + mediumEffort + lowEffort;
  
  return {
    totalPersonDays: totalEffort,
    phaseBreakdown: {
      phase1: highEffort,
      phase2: mediumEffort,
      phase3: lowEffort
    },
    optimizationCounts: {
      partitioning: highCounts.partitioning + mediumCounts.partitioning + lowCounts.partitioning,
      clustering: highCounts.clustering + mediumCounts.clustering + lowCounts.clustering,
      materializedViews: highCounts.materializedViews + mediumCounts.materializedViews + lowCounts.materializedViews
    }
  };
}

module.exports = {
  analyzeTableOptimizations,
  analyzeQueryPerformance,
  analyzeQueryCosts,
  generateOptimizationPlan
}; 