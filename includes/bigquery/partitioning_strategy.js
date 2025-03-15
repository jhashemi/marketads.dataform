/**
 * @fileoverview BigQuery Partitioning Strategy Module
 * 
 * This module provides functionality to determine and apply optimal partitioning
 * strategies for BigQuery tables based on query patterns, data volume, and access patterns.
 * Proper partitioning can significantly reduce query costs and improve performance.
 */

// Partitioning types supported by BigQuery
const PARTITION_TYPES = {
  TIME: 'time',
  INTEGER_RANGE: 'integer_range',
  INGESTION_TIME: 'ingestion_time',
  NONE: 'none'
};

// Time granularity options for time-based partitioning
const TIME_GRANULARITY = {
  HOURLY: 'HOUR',
  DAILY: 'DAY',
  MONTHLY: 'MONTH',
  YEARLY: 'YEAR'
};

/**
 * Analyzes table schema and query patterns to recommend optimal partitioning strategy
 * 
 * @param {Object} tableSchema - The schema of the table to be partitioned
 * @param {Array} queryHistory - Array of historical queries run against this table
 * @param {Object} dataStats - Statistics about the data (volume, growth rate, etc.)
 * @returns {Object} Recommended partitioning strategy
 */
function recommendPartitioningStrategy(tableSchema, queryHistory, dataStats) {
  // Default to no partitioning if we don't have enough information
  if (!tableSchema || !tableSchema.fields) {
    return { type: PARTITION_TYPES.NONE, reason: 'Insufficient schema information' };
  }

  // Look for timestamp/date fields that could be used for partitioning
  const timeFields = findTimeFields(tableSchema);
  
  // Look for integer fields that could be used for range partitioning
  const integerFields = findIntegerFields(tableSchema);
  
  // Analyze query patterns to see which fields are commonly used in WHERE clauses
  const whereClauseFields = analyzeQueryWhereClauseFields(queryHistory);
  
  // If we have query history, prioritize fields used in WHERE clauses
  if (whereClauseFields && whereClauseFields.length > 0) {
    // Check if any time fields are commonly used in WHERE clauses
    const timeFieldsInWhere = timeFields.filter(field => 
      whereClauseFields.includes(field.name));
    
    if (timeFieldsInWhere.length > 0) {
      return recommendTimePartitioning(timeFieldsInWhere[0], dataStats);
    }
    
    // Check if any integer fields are commonly used in WHERE clauses
    const integerFieldsInWhere = integerFields.filter(field => 
      whereClauseFields.includes(field.name));
    
    if (integerFieldsInWhere.length > 0) {
      return recommendIntegerRangePartitioning(integerFieldsInWhere[0], dataStats);
    }
  }
  
  // If no fields are commonly used in WHERE clauses, fall back to best practices
  if (timeFields.length > 0) {
    // Prefer time-based partitioning if we have timestamp fields
    return recommendTimePartitioning(timeFields[0], dataStats);
  } else if (integerFields.length > 0) {
    // Fall back to integer range partitioning if we have suitable integer fields
    return recommendIntegerRangePartitioning(integerFields[0], dataStats);
  } else if (dataStats && dataStats.rowCount > 1000000) {
    // For large tables with no obvious partition fields, use ingestion time
    return {
      type: PARTITION_TYPES.INGESTION_TIME,
      granularity: TIME_GRANULARITY.DAILY,
      reason: 'Large table with no suitable partition fields'
    };
  }
  
  // For small tables or when we can't determine a good strategy, recommend no partitioning
  return { 
    type: PARTITION_TYPES.NONE, 
    reason: 'Table is too small or no suitable partition fields found'
  };
}

/**
 * Finds timestamp or date fields in the table schema that could be used for partitioning
 * 
 * @param {Object} tableSchema - The schema of the table
 * @returns {Array} Array of fields suitable for time-based partitioning
 */
function findTimeFields(tableSchema) {
  if (!tableSchema || !tableSchema.fields) {
    return [];
  }
  
  return tableSchema.fields.filter(field => {
    const type = field.type.toLowerCase();
    return type === 'timestamp' || type === 'date' || type === 'datetime';
  });
}

/**
 * Finds integer fields in the table schema that could be used for range partitioning
 * 
 * @param {Object} tableSchema - The schema of the table
 * @returns {Array} Array of fields suitable for integer range partitioning
 */
function findIntegerFields(tableSchema) {
  if (!tableSchema || !tableSchema.fields) {
    return [];
  }
  
  return tableSchema.fields.filter(field => {
    const type = field.type.toLowerCase();
    return type === 'integer' || type === 'int64';
  });
}

/**
 * Analyzes query history to identify fields commonly used in WHERE clauses
 * 
 * @param {Array} queryHistory - Array of historical queries
 * @returns {Array} Array of field names commonly used in WHERE clauses
 */
function analyzeQueryWhereClauseFields(queryHistory) {
  if (!queryHistory || queryHistory.length === 0) {
    return [];
  }
  
  // Count occurrences of each field in WHERE clauses
  const fieldCounts = {};
  
  queryHistory.forEach(query => {
    // Simple regex to extract field names from WHERE clauses
    // Note: This is a simplified approach and may need to be enhanced for complex queries
    const whereClauseMatch = query.sql.match(/WHERE\s+(.+?)(?:GROUP BY|ORDER BY|LIMIT|$)/i);
    if (whereClauseMatch && whereClauseMatch[1]) {
      const whereClause = whereClauseMatch[1];
      
      // Extract field names from the WHERE clause
      const fieldMatches = whereClause.match(/\b([a-zA-Z0-9_]+)\b\s*(?:=|>|<|>=|<=|BETWEEN|IN|LIKE)/g);
      if (fieldMatches) {
        fieldMatches.forEach(match => {
          const field = match.trim().split(/\s+/)[0];
          fieldCounts[field] = (fieldCounts[field] || 0) + 1;
        });
      }
    }
  });
  
  // Sort fields by frequency and return the most common ones
  return Object.entries(fieldCounts)
    .sort((a, b) => b[1] - a[1])
    .map(entry => entry[0]);
}

/**
 * Recommends time-based partitioning strategy based on a timestamp field
 * 
 * @param {Object} field - The timestamp field to use for partitioning
 * @param {Object} dataStats - Statistics about the data
 * @returns {Object} Recommended time-based partitioning strategy
 */
function recommendTimePartitioning(field, dataStats) {
  // Default to daily partitioning
  let granularity = TIME_GRANULARITY.DAILY;
  
  if (dataStats) {
    const rowsPerDay = dataStats.rowCount / dataStats.dayCount;
    
    // For very large tables, consider monthly partitioning
    if (rowsPerDay > 100000000) {
      granularity = TIME_GRANULARITY.MONTHLY;
    }
    // For small tables with long time ranges, consider monthly partitioning
    else if (rowsPerDay < 10000 && dataStats.dayCount > 365) {
      granularity = TIME_GRANULARITY.MONTHLY;
    }
    // For tables with high-frequency data, consider hourly partitioning
    else if (rowsPerDay > 1000000 && dataStats.dayCount < 30) {
      granularity = TIME_GRANULARITY.HOURLY;
    }
  }
  
  return {
    type: PARTITION_TYPES.TIME,
    field: field.name,
    granularity: granularity,
    reason: `Field ${field.name} is suitable for time-based partitioning`
  };
}

/**
 * Recommends integer range partitioning strategy based on an integer field
 * 
 * @param {Object} field - The integer field to use for partitioning
 * @param {Object} dataStats - Statistics about the data
 * @returns {Object} Recommended integer range partitioning strategy
 */
function recommendIntegerRangePartitioning(field, dataStats) {
  // Default range settings
  let start = 0;
  let end = 1000000;
  let interval = 10000;
  
  // If we have statistics about the field, use them to set better ranges
  if (dataStats && dataStats.fieldStats && dataStats.fieldStats[field.name]) {
    const stats = dataStats.fieldStats[field.name];
    start = stats.min || 0;
    end = stats.max || 1000000;
    
    // Calculate a reasonable interval based on the range and number of partitions
    // BigQuery supports up to 4000 partitions
    const range = end - start;
    const maxPartitions = 1000; // Using 1000 as a safe limit
    interval = Math.max(1, Math.ceil(range / maxPartitions));
  }
  
  return {
    type: PARTITION_TYPES.INTEGER_RANGE,
    field: field.name,
    start: start,
    end: end,
    interval: interval,
    reason: `Field ${field.name} is suitable for integer range partitioning`
  };
}

/**
 * Generates the SQL DDL statement for creating a partitioned table
 * 
 * @param {string} tableName - The name of the table to create
 * @param {Object} tableSchema - The schema of the table
 * @param {Object} partitionStrategy - The partitioning strategy to apply
 * @returns {string} SQL DDL statement for creating the partitioned table
 */
function generatePartitionedTableDDL(tableName, tableSchema, partitionStrategy) {
  if (!tableName || !tableSchema || !partitionStrategy) {
    throw new Error('Missing required parameters for generating partitioned table DDL');
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
  
  // Add partitioning clause based on the strategy
  switch (partitionStrategy.type) {
    case PARTITION_TYPES.TIME:
      ddl += `\nPARTITION BY ${partitionStrategy.granularity}(${partitionStrategy.field})`;
      break;
      
    case PARTITION_TYPES.INTEGER_RANGE:
      ddl += `\nPARTITION BY RANGE_BUCKET(${partitionStrategy.field}, GENERATE_ARRAY(${partitionStrategy.start}, ${partitionStrategy.end}, ${partitionStrategy.interval}))`;
      break;
      
    case PARTITION_TYPES.INGESTION_TIME:
      ddl += `\nPARTITION BY ${partitionStrategy.granularity}(_PARTITIONTIME)`;
      break;
      
    case PARTITION_TYPES.NONE:
    default:
      // No partitioning clause
      break;
  }
  
  return ddl;
}

/**
 * Estimates the cost savings from implementing the recommended partitioning strategy
 * 
 * @param {Object} partitionStrategy - The recommended partitioning strategy
 * @param {Object} dataStats - Statistics about the data
 * @param {Array} queryHistory - Array of historical queries
 * @returns {Object} Estimated cost savings and performance improvements
 */
function estimatePartitioningBenefits(partitionStrategy, dataStats, queryHistory) {
  if (!partitionStrategy || partitionStrategy.type === PARTITION_TYPES.NONE) {
    return {
      costSavingsPercent: 0,
      performanceImprovementPercent: 0,
      explanation: 'No partitioning strategy applied'
    };
  }
  
  // Default values
  let costSavingsPercent = 0;
  let performanceImprovementPercent = 0;
  let explanation = '';
  
  // Estimate benefits based on the partitioning type and query patterns
  switch (partitionStrategy.type) {
    case PARTITION_TYPES.TIME:
      // Analyze query history to see how many queries would benefit from time partitioning
      const timeFilteredQueries = countQueriesWithTimeFilter(queryHistory, partitionStrategy.field);
      const timeFilterRatio = queryHistory.length > 0 ? timeFilteredQueries / queryHistory.length : 0;
      
      // Estimate cost savings based on the ratio of queries that use time filters
      costSavingsPercent = Math.round(timeFilterRatio * 80); // Up to 80% savings for time-partitioned queries
      performanceImprovementPercent = Math.round(timeFilterRatio * 70); // Up to 70% performance improvement
      
      explanation = `Time-based partitioning on field ${partitionStrategy.field} would benefit approximately ${timeFilteredQueries} out of ${queryHistory.length} queries (${Math.round(timeFilterRatio * 100)}%).`;
      break;
      
    case PARTITION_TYPES.INTEGER_RANGE:
      // Analyze query history to see how many queries would benefit from integer range partitioning
      const intFilteredQueries = countQueriesWithIntegerFilter(queryHistory, partitionStrategy.field);
      const intFilterRatio = queryHistory.length > 0 ? intFilteredQueries / queryHistory.length : 0;
      
      // Estimate cost savings based on the ratio of queries that use integer filters
      costSavingsPercent = Math.round(intFilterRatio * 70); // Up to 70% savings for integer-partitioned queries
      performanceImprovementPercent = Math.round(intFilterRatio * 60); // Up to 60% performance improvement
      
      explanation = `Integer range partitioning on field ${partitionStrategy.field} would benefit approximately ${intFilteredQueries} out of ${queryHistory.length} queries (${Math.round(intFilterRatio * 100)}%).`;
      break;
      
    case PARTITION_TYPES.INGESTION_TIME:
      // Ingestion time partitioning benefits depend on how often queries filter by ingestion time
      // Since this is less common, we estimate lower benefits
      costSavingsPercent = 30; // Estimate 30% savings
      performanceImprovementPercent = 25; // Estimate 25% performance improvement
      
      explanation = 'Ingestion time partitioning provides moderate benefits for large tables, especially for time-series analysis and data retention policies.';
      break;
  }
  
  return {
    costSavingsPercent,
    performanceImprovementPercent,
    explanation
  };
}

/**
 * Counts how many queries in the history would benefit from time-based partitioning
 * 
 * @param {Array} queryHistory - Array of historical queries
 * @param {string} fieldName - The field name used for partitioning
 * @returns {number} Count of queries that would benefit
 */
function countQueriesWithTimeFilter(queryHistory, fieldName) {
  if (!queryHistory || queryHistory.length === 0) {
    return 0;
  }
  
  return queryHistory.filter(query => {
    // Look for time-based filters in the WHERE clause
    const regex = new RegExp(`WHERE\\s+.*\\b${fieldName}\\b\\s*(?:=|>|<|>=|<=|BETWEEN)`, 'i');
    return regex.test(query.sql);
  }).length;
}

/**
 * Counts how many queries in the history would benefit from integer range partitioning
 * 
 * @param {Array} queryHistory - Array of historical queries
 * @param {string} fieldName - The field name used for partitioning
 * @returns {number} Count of queries that would benefit
 */
function countQueriesWithIntegerFilter(queryHistory, fieldName) {
  if (!queryHistory || queryHistory.length === 0) {
    return 0;
  }
  
  return queryHistory.filter(query => {
    // Look for integer-based filters in the WHERE clause
    const regex = new RegExp(`WHERE\\s+.*\\b${fieldName}\\b\\s*(?:=|>|<|>=|<=|BETWEEN|IN)`, 'i');
    return regex.test(query.sql);
  }).length;
}

module.exports = {
  PARTITION_TYPES,
  TIME_GRANULARITY,
  recommendPartitioningStrategy,
  findTimeFields,
  findIntegerFields,
  analyzeQueryWhereClauseFields,
  generatePartitionedTableDDL,
  estimatePartitioningBenefits
}; 