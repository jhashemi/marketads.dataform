/**
 * @fileoverview BigQuery Clustering Strategy Module
 * 
 * This module provides functionality to determine and apply optimal clustering
 * strategies for BigQuery tables based on query patterns and data characteristics.
 * Proper clustering can significantly improve query performance by co-locating
 * related data on disk.
 */

// Maximum number of clustering columns supported by BigQuery
const MAX_CLUSTERING_COLUMNS = 4;

// Data types that can be used for clustering in BigQuery
const CLUSTERABLE_TYPES = [
  'string', 
  'integer', 
  'int64', 
  'float', 
  'float64', 
  'numeric', 
  'bignumeric', 
  'bool', 
  'boolean',
  'date', 
  'datetime', 
  'timestamp'
];

/**
 * Analyzes table schema and query patterns to recommend optimal clustering strategy
 * 
 * @param {Object} tableSchema - The schema of the table to be clustered
 * @param {Array} queryHistory - Array of historical queries run against this table
 * @param {Object} partitionStrategy - The partitioning strategy being used (if any)
 * @returns {Object} Recommended clustering strategy
 */
function recommendClusteringStrategy(tableSchema, queryHistory, partitionStrategy) {
  // Default to no clustering if we don't have enough information
  if (!tableSchema || !tableSchema.fields) {
    return { 
      columns: [],
      reason: 'Insufficient schema information'
    };
  }
  
  // Find fields that can be used for clustering
  const clusterableFields = findClusterableFields(tableSchema);
  
  if (clusterableFields.length === 0) {
    return {
      columns: [],
      reason: 'No suitable fields for clustering found in schema'
    };
  }
  
  // If we have query history, analyze it to find the best clustering columns
  if (queryHistory && queryHistory.length > 0) {
    // Analyze WHERE, JOIN, and GROUP BY clauses to find commonly used fields
    const whereClauseFields = analyzeWhereClauseFields(queryHistory);
    const joinClauseFields = analyzeJoinClauseFields(queryHistory);
    const groupByFields = analyzeGroupByFields(queryHistory);
    const orderByFields = analyzeOrderByFields(queryHistory);
    
    // Combine all field usage with different weights
    const fieldUsage = combineFieldUsage(
      whereClauseFields, 
      joinClauseFields, 
      groupByFields,
      orderByFields
    );
    
    // Filter to only include clusterable fields and sort by usage
    const candidateColumns = Object.entries(fieldUsage)
      .filter(([fieldName]) => 
        clusterableFields.some(field => field.name === fieldName))
      .sort((a, b) => b[1] - a[1])
      .map(entry => entry[0]);
    
    // If we have a partition field, make sure we don't include it in clustering
    const partitionField = partitionStrategy && partitionStrategy.field;
    const clusteringColumns = candidateColumns
      .filter(col => col !== partitionField)
      .slice(0, MAX_CLUSTERING_COLUMNS);
    
    if (clusteringColumns.length > 0) {
      return {
        columns: clusteringColumns,
        reason: `Selected based on query pattern analysis of ${queryHistory.length} queries`
      };
    }
  }
  
  // If we don't have query history or couldn't find good candidates,
  // use heuristics based on field types and cardinality
  return recommendClusteringByHeuristics(clusterableFields, partitionStrategy);
}

/**
 * Finds fields in the table schema that can be used for clustering
 * 
 * @param {Object} tableSchema - The schema of the table
 * @returns {Array} Array of fields suitable for clustering
 */
function findClusterableFields(tableSchema) {
  if (!tableSchema || !tableSchema.fields) {
    return [];
  }
  
  return tableSchema.fields.filter(field => {
    const type = field.type.toLowerCase();
    return CLUSTERABLE_TYPES.includes(type);
  });
}

/**
 * Analyzes WHERE clauses in query history to identify commonly filtered fields
 * 
 * @param {Array} queryHistory - Array of historical queries
 * @returns {Object} Map of field names to usage count in WHERE clauses
 */
function analyzeWhereClauseFields(queryHistory) {
  const fieldCounts = {};
  
  queryHistory.forEach(query => {
    // Extract WHERE clause
    const whereClauseMatch = query.sql.match(/WHERE\s+(.+?)(?:GROUP BY|ORDER BY|LIMIT|$)/i);
    if (whereClauseMatch && whereClauseMatch[1]) {
      const whereClause = whereClauseMatch[1];
      
      // Extract field names from the WHERE clause
      const fieldMatches = whereClause.match(/\b([a-zA-Z0-9_]+)\b\s*(?:=|>|<|>=|<=|BETWEEN|IN|LIKE)/g);
      if (fieldMatches) {
        fieldMatches.forEach(match => {
          const field = match.trim().split(/\s+/)[0];
          fieldCounts[field] = (fieldCounts[field] || 0) + 3; // Higher weight for WHERE clauses
        });
      }
    }
  });
  
  return fieldCounts;
}

/**
 * Analyzes JOIN clauses in query history to identify commonly joined fields
 * 
 * @param {Array} queryHistory - Array of historical queries
 * @returns {Object} Map of field names to usage count in JOIN clauses
 */
function analyzeJoinClauseFields(queryHistory) {
  const fieldCounts = {};
  
  queryHistory.forEach(query => {
    // Extract JOIN conditions
    const joinMatches = query.sql.match(/JOIN\s+.+?\s+ON\s+(.+?)(?:WHERE|GROUP BY|ORDER BY|LIMIT|JOIN|$)/gi);
    if (joinMatches) {
      joinMatches.forEach(joinClause => {
        // Extract field names from the ON condition
        const onMatch = joinClause.match(/ON\s+(.+?)(?:WHERE|GROUP BY|ORDER BY|LIMIT|JOIN|$)/i);
        if (onMatch && onMatch[1]) {
          const onCondition = onMatch[1];
          const fieldMatches = onCondition.match(/\b([a-zA-Z0-9_]+)\b\s*(?:=|>|<|>=|<=)/g);
          
          if (fieldMatches) {
            fieldMatches.forEach(match => {
              const field = match.trim().split(/\s+/)[0];
              fieldCounts[field] = (fieldCounts[field] || 0) + 2; // Medium weight for JOIN clauses
            });
          }
        }
      });
    }
  });
  
  return fieldCounts;
}

/**
 * Analyzes GROUP BY clauses in query history to identify commonly grouped fields
 * 
 * @param {Array} queryHistory - Array of historical queries
 * @returns {Object} Map of field names to usage count in GROUP BY clauses
 */
function analyzeGroupByFields(queryHistory) {
  const fieldCounts = {};
  
  queryHistory.forEach(query => {
    // Extract GROUP BY clause
    const groupByMatch = query.sql.match(/GROUP BY\s+(.+?)(?:HAVING|ORDER BY|LIMIT|$)/i);
    if (groupByMatch && groupByMatch[1]) {
      const groupByClause = groupByMatch[1];
      
      // Extract field names from the GROUP BY clause
      const fields = groupByClause.split(',').map(f => f.trim());
      fields.forEach(field => {
        // Remove any functions or aliases
        const cleanField = field.replace(/^[^(]+\(([^)]+)\).*$/, '$1').trim();
        if (/^[a-zA-Z0-9_]+$/.test(cleanField)) {
          fieldCounts[cleanField] = (fieldCounts[cleanField] || 0) + 2; // Medium weight for GROUP BY
        }
      });
    }
  });
  
  return fieldCounts;
}

/**
 * Analyzes ORDER BY clauses in query history to identify commonly sorted fields
 * 
 * @param {Array} queryHistory - Array of historical queries
 * @returns {Object} Map of field names to usage count in ORDER BY clauses
 */
function analyzeOrderByFields(queryHistory) {
  const fieldCounts = {};
  
  queryHistory.forEach(query => {
    // Extract ORDER BY clause
    const orderByMatch = query.sql.match(/ORDER BY\s+(.+?)(?:LIMIT|$)/i);
    if (orderByMatch && orderByMatch[1]) {
      const orderByClause = orderByMatch[1];
      
      // Extract field names from the ORDER BY clause
      const fields = orderByClause.split(',').map(f => f.trim());
      fields.forEach(field => {
        // Remove any ASC/DESC and functions
        const cleanField = field.replace(/\s+(ASC|DESC)$/i, '')
                               .replace(/^[^(]+\(([^)]+)\).*$/, '$1')
                               .trim();
        if (/^[a-zA-Z0-9_]+$/.test(cleanField)) {
          fieldCounts[cleanField] = (fieldCounts[cleanField] || 0) + 1; // Lower weight for ORDER BY
        }
      });
    }
  });
  
  return fieldCounts;
}

/**
 * Combines field usage counts from different clause types with appropriate weighting
 * 
 * @param {Object} whereFields - Fields used in WHERE clauses
 * @param {Object} joinFields - Fields used in JOIN clauses
 * @param {Object} groupByFields - Fields used in GROUP BY clauses
 * @param {Object} orderByFields - Fields used in ORDER BY clauses
 * @returns {Object} Combined field usage counts
 */
function combineFieldUsage(whereFields, joinFields, groupByFields, orderByFields) {
  const combinedUsage = {};
  
  // Combine all field usages
  [whereFields, joinFields, groupByFields, orderByFields].forEach(fieldSet => {
    Object.entries(fieldSet).forEach(([field, count]) => {
      combinedUsage[field] = (combinedUsage[field] || 0) + count;
    });
  });
  
  return combinedUsage;
}

/**
 * Recommends clustering columns based on heuristics when query history is not available
 * 
 * @param {Array} clusterableFields - Fields that can be used for clustering
 * @param {Object} partitionStrategy - The partitioning strategy being used (if any)
 * @returns {Object} Recommended clustering strategy
 */
function recommendClusteringByHeuristics(clusterableFields, partitionStrategy) {
  // If we have a partition field, exclude it from clustering candidates
  const partitionField = partitionStrategy && partitionStrategy.field;
  const candidates = clusterableFields.filter(field => field.name !== partitionField);
  
  if (candidates.length === 0) {
    return {
      columns: [],
      reason: 'No suitable clustering columns found after excluding partition field'
    };
  }
  
  // Prioritize fields by type (categorical fields are better for clustering)
  const prioritizedFields = [];
  
  // First priority: string/boolean fields (likely categorical)
  const categoricalFields = candidates.filter(field => {
    const type = field.type.toLowerCase();
    return type === 'string' || type === 'bool' || type === 'boolean';
  });
  prioritizedFields.push(...categoricalFields.map(f => f.name));
  
  // Second priority: date/timestamp fields
  const timeFields = candidates.filter(field => {
    const type = field.type.toLowerCase();
    return type === 'date' || type === 'datetime' || type === 'timestamp';
  });
  prioritizedFields.push(...timeFields.map(f => f.name));
  
  // Third priority: numeric fields
  const numericFields = candidates.filter(field => {
    const type = field.type.toLowerCase();
    return type === 'integer' || type === 'int64' || type === 'float' || 
           type === 'float64' || type === 'numeric' || type === 'bignumeric';
  });
  prioritizedFields.push(...numericFields.map(f => f.name));
  
  // Take up to MAX_CLUSTERING_COLUMNS unique fields
  const uniqueFields = [...new Set(prioritizedFields)];
  const clusteringColumns = uniqueFields.slice(0, MAX_CLUSTERING_COLUMNS);
  
  return {
    columns: clusteringColumns,
    reason: 'Selected based on field type heuristics (categorical > temporal > numeric)'
  };
}

/**
 * Generates the SQL DDL statement for creating a clustered table
 * 
 * @param {string} tableName - The name of the table to create
 * @param {Object} tableSchema - The schema of the table
 * @param {Object} partitionStrategy - The partitioning strategy to apply (if any)
 * @param {Object} clusteringStrategy - The clustering strategy to apply
 * @returns {string} SQL DDL statement for creating the clustered table
 */
function generateClusteredTableDDL(tableName, tableSchema, partitionStrategy, clusteringStrategy) {
  if (!tableName || !tableSchema || !clusteringStrategy || clusteringStrategy.columns.length === 0) {
    throw new Error('Missing required parameters for generating clustered table DDL');
  }
  
  // Start building the CREATE TABLE statement
  let ddl = `CREATE TABLE \`${tableName}\` (\n`;
  
  // Add field definitions
  if (tableSchema.fields && tableSchema.fields.length > 0) {
    ddl += tableSchema.fields.map(field => 
      `  ${field.name} ${field.type}${field.mode === 'REQUIRED' ? ' NOT NULL' : ''}`
    ).join(',\n');
  }
  
  ddl += '\n)';
  
  // Add partitioning clause if provided
  if (partitionStrategy && partitionStrategy.type && partitionStrategy.type !== 'none') {
    switch (partitionStrategy.type) {
      case 'time':
        ddl += `\nPARTITION BY ${partitionStrategy.granularity}(${partitionStrategy.field})`;
        break;
        
      case 'integer_range':
        ddl += `\nPARTITION BY RANGE_BUCKET(${partitionStrategy.field}, GENERATE_ARRAY(${partitionStrategy.start}, ${partitionStrategy.end}, ${partitionStrategy.interval}))`;
        break;
        
      case 'ingestion_time':
        ddl += `\nPARTITION BY ${partitionStrategy.granularity}(_PARTITIONTIME)`;
        break;
    }
  }
  
  // Add clustering clause
  ddl += `\nCLUSTER BY ${clusteringStrategy.columns.join(', ')}`;
  
  return ddl;
}

/**
 * Estimates the performance benefits from implementing the recommended clustering strategy
 * 
 * @param {Object} clusteringStrategy - The recommended clustering strategy
 * @param {Array} queryHistory - Array of historical queries
 * @returns {Object} Estimated performance improvements
 */
function estimateClusteringBenefits(clusteringStrategy, queryHistory) {
  if (!clusteringStrategy || !clusteringStrategy.columns || clusteringStrategy.columns.length === 0) {
    return {
      performanceImprovementPercent: 0,
      costSavingsPercent: 0,
      explanation: 'No clustering strategy applied'
    };
  }
  
  // Default values
  let performanceImprovementPercent = 0;
  let costSavingsPercent = 0;
  let explanation = '';
  
  // If we have query history, analyze how many queries would benefit from clustering
  if (queryHistory && queryHistory.length > 0) {
    const benefitingQueries = countQueriesBenefitingFromClustering(queryHistory, clusteringStrategy.columns);
    const benefitRatio = benefitingQueries / queryHistory.length;
    
    // Estimate performance improvement based on the ratio of queries that would benefit
    // Clustering typically provides 20-50% improvement for benefiting queries
    performanceImprovementPercent = Math.round(benefitRatio * 40);
    
    // Cost savings are typically lower than performance improvements for clustering
    costSavingsPercent = Math.round(benefitRatio * 30);
    
    explanation = `Clustering on columns [${clusteringStrategy.columns.join(', ')}] would benefit approximately ${benefitingQueries} out of ${queryHistory.length} queries (${Math.round(benefitRatio * 100)}%).`;
  } else {
    // Without query history, provide a generic estimate based on the number of clustering columns
    const columnCount = clusteringStrategy.columns.length;
    
    // More columns generally provide better filtering capabilities
    performanceImprovementPercent = Math.min(40, columnCount * 10);
    costSavingsPercent = Math.min(30, columnCount * 7);
    
    explanation = `Clustering on columns [${clusteringStrategy.columns.join(', ')}] is estimated to provide moderate performance improvements based on field type analysis.`;
  }
  
  return {
    performanceImprovementPercent,
    costSavingsPercent,
    explanation
  };
}

/**
 * Counts how many queries in the history would benefit from the clustering strategy
 * 
 * @param {Array} queryHistory - Array of historical queries
 * @param {Array} clusteringColumns - The columns used for clustering
 * @returns {number} Count of queries that would benefit
 */
function countQueriesBenefitingFromClustering(queryHistory, clusteringColumns) {
  if (!queryHistory || queryHistory.length === 0 || !clusteringColumns || clusteringColumns.length === 0) {
    return 0;
  }
  
  return queryHistory.filter(query => {
    // A query benefits from clustering if it filters, joins, or groups by any clustering column
    return clusteringColumns.some(column => {
      const columnRegex = new RegExp(`\\b${column}\\b\\s*(?:=|>|<|>=|<=|BETWEEN|IN|LIKE|ON|GROUP BY|ORDER BY)`, 'i');
      return columnRegex.test(query.sql);
    });
  }).length;
}

/**
 * Analyzes an existing table's query patterns to suggest clustering improvements
 * 
 * @param {string} tableName - The name of the table to analyze
 * @param {Array} queryHistory - Array of historical queries
 * @param {Object} currentClustering - The current clustering configuration (if any)
 * @returns {Object} Suggested clustering improvements
 */
function suggestClusteringImprovements(tableName, queryHistory, currentClustering) {
  if (!tableName || !queryHistory || queryHistory.length === 0) {
    return {
      suggestedChanges: [],
      explanation: 'Insufficient data to suggest improvements'
    };
  }
  
  // Extract current clustering columns
  const currentColumns = currentClustering && currentClustering.columns ? 
    currentClustering.columns : [];
  
  // Analyze query patterns to find commonly used fields
  const whereClauseFields = analyzeWhereClauseFields(queryHistory);
  const joinClauseFields = analyzeJoinClauseFields(queryHistory);
  const groupByFields = analyzeGroupByFields(queryHistory);
  const orderByFields = analyzeOrderByFields(queryHistory);
  
  // Combine all field usage
  const fieldUsage = combineFieldUsage(
    whereClauseFields, 
    joinClauseFields, 
    groupByFields,
    orderByFields
  );
  
  // Sort fields by usage
  const sortedFields = Object.entries(fieldUsage)
    .sort((a, b) => b[1] - a[1])
    .map(entry => entry[0]);
  
  // Find fields that are frequently used but not in current clustering
  const missingImportantFields = sortedFields
    .filter(field => !currentColumns.includes(field))
    .slice(0, 3); // Top 3 missing fields
  
  // Find fields in current clustering that are rarely used
  const rarelyUsedFields = currentColumns
    .filter(field => !sortedFields.includes(field) || 
      fieldUsage[field] < 3); // Threshold for "rarely used"
  
  const suggestedChanges = [];
  
  // Suggest adding important missing fields
  missingImportantFields.forEach(field => {
    suggestedChanges.push({
      action: 'add',
      field: field,
      reason: `Field "${field}" is frequently used in queries but not included in clustering`
    });
  });
  
  // Suggest removing rarely used fields
  rarelyUsedFields.forEach(field => {
    suggestedChanges.push({
      action: 'remove',
      field: field,
      reason: `Field "${field}" is rarely used in queries but included in clustering`
    });
  });
  
  // If we have both additions and removals, suggest reordering
  if (missingImportantFields.length > 0 && currentColumns.length > 0) {
    // Optimal order: most frequently used fields first
    const optimalOrder = sortedFields
      .filter(field => currentColumns.includes(field) || 
               missingImportantFields.includes(field))
      .slice(0, MAX_CLUSTERING_COLUMNS);
    
    if (optimalOrder.length > 1) {
      suggestedChanges.push({
        action: 'reorder',
        suggestedOrder: optimalOrder,
        reason: 'Ordering clustering columns by frequency of use in queries'
      });
    }
  }
  
  return {
    suggestedChanges,
    explanation: suggestedChanges.length > 0 ? 
      `Analysis of ${queryHistory.length} queries suggests ${suggestedChanges.length} improvements to clustering` :
      'Current clustering configuration appears optimal based on query patterns'
  };
}

module.exports = {
  MAX_CLUSTERING_COLUMNS,
  CLUSTERABLE_TYPES,
  recommendClusteringStrategy,
  findClusterableFields,
  analyzeWhereClauseFields,
  analyzeJoinClauseFields,
  analyzeGroupByFields,
  generateClusteredTableDDL,
  estimateClusteringBenefits,
  suggestClusteringImprovements
}; 