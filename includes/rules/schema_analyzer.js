/**
 * Schema Analyzer Module
 * 
 * Analyzes table schemas to identify common fields, field statistics, and other metadata
 * needed for intelligent rule selection. This module provides insights into the structure
 * of source and reference tables to help determine the most effective matching rules.
 */

// Simulated database connector - in a real implementation, this would connect to the actual database
const dbConnector = {
  /**
   * Get schema information for a table
   * @param {string} tableId - The ID of the table to analyze
   * @returns {Promise<Object>} - The table schema
   */
  getTableSchema: async (tableId) => {
    console.log(`Getting schema for table: ${tableId}`);
    // In a real implementation, this would query the database metadata
    // For now, we'll return a simulated schema
    return {
      fields: [
        { name: 'id', type: 'int64' },
        { name: 'first_name', type: 'string' },
        { name: 'last_name', type: 'string' },
        { name: 'email', type: 'string' },
        { name: 'phone', type: 'string' },
        { name: 'date_of_birth', type: 'date' },
        { name: 'address', type: 'string' },
        { name: 'city', type: 'string' },
        { name: 'postal_code', type: 'string' }
      ]
    };
  },
  
  /**
   * Get row count for a table
   * @param {string} tableId - The ID of the table
   * @returns {Promise<number>} - The number of rows in the table
   */
  getRowCount: async (tableId) => {
    console.log(`Getting row count for table: ${tableId}`);
    // In a real implementation, this would query the database
    // For now, we'll return a simulated count
    return Math.floor(Math.random() * 10000) + 1000;
  },
  
  /**
   * Get sample data from a table
   * @param {string} tableId - The ID of the table
   * @param {number} sampleSize - The number of rows to sample
   * @returns {Promise<Array>} - Sample data from the table
   */
  getSampleData: async (tableId, sampleSize = 100) => {
    console.log(`Getting ${sampleSize} sample rows from table: ${tableId}`);
    // In a real implementation, this would query the database
    // For now, we'll return simulated data
    return Array(sampleSize).fill().map(() => ({
      id: Math.floor(Math.random() * 10000),
      first_name: ['John', 'Jane', 'Michael', 'Emily', 'David'][Math.floor(Math.random() * 5)],
      last_name: ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones'][Math.floor(Math.random() * 5)],
      email: `example${Math.floor(Math.random() * 100)}@example.com`,
      phone: `555-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
      date_of_birth: new Date(1970 + Math.floor(Math.random() * 40), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
      address: `${Math.floor(Math.random() * 1000)} Main St`,
      city: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix'][Math.floor(Math.random() * 5)],
      postal_code: Math.floor(Math.random() * 90000 + 10000).toString()
    }));
  },
  
  /**
   * Get field statistics for a table
   * @param {string} tableId - The ID of the table
   * @param {Array} fields - The fields to analyze
   * @returns {Promise<Object>} - Statistics for each field
   */
  getFieldStats: async (tableId, fields) => {
    console.log(`Getting field statistics for table: ${tableId}`);
    // In a real implementation, this would query the database
    // For now, we'll return simulated statistics
    const stats = {};
    fields.forEach(field => {
      stats[field.name] = {
        uniqueRatio: Math.random() * 0.9 + 0.1, // Between 0.1 and 1.0
        nullRatio: Math.random() * 0.1, // Between 0 and 0.1
        avgLength: field.type === 'string' ? Math.floor(Math.random() * 20) + 5 : null,
        minValue: field.type === 'int64' ? 0 : null,
        maxValue: field.type === 'int64' ? 10000 : null
      };
    });
    return stats;
  }
};

/**
 * Generates a SQL query to analyze the schema of the specified tables.
 * @param {string[]} tableIds - The IDs of the tables to analyze, including project and dataset.
 * @returns {string} - The SQL query for schema analysis.
 */
function generateAnalysisSql(tableIds) {
  // This is a simplified example. In a real implementation, you would
  // dynamically generate SQL based on the database type (BigQuery in this case).
  // You would also likely use INFORMATION_SCHEMA views.

  const queries = tableIds.map(tableId => {
    return `SELECT\n      '${tableId}' as table_name,\n      column_name as field_name,\n      data_type as field_type\n    FROM \`${tableId}.INFORMATION_SCHEMA.COLUMNS\``;
  });

  return queries.join('\nUNION ALL\n');
}


async function analyzeSchema(sourceTableId, referenceTableId) {
  console.log(`Analyzing schema for ${sourceTableId} → ${referenceTableId}`);
  
  // Get schemas for both tables
  const sourceSchema = await dbConnector.getTableSchema(sourceTableId);
  const referenceSchema = await dbConnector.getTableSchema(referenceTableId);
  
  // Get row counts
  const sourceRowCount = await dbConnector.getRowCount(sourceTableId);
  const referenceRowCount = await dbConnector.getRowCount(referenceTableId);
  
  // Identify common fields (by name and type)
  const commonFields = findCommonFields(sourceSchema, referenceSchema);
  
  // Get field statistics for common fields
  const fieldStats = await getFieldStatistics(sourceTableId, referenceTableId, commonFields);
  
  // Calculate schema similarity score
  const schemaSimilarity = calculateSchemaSimilarity(sourceSchema, referenceSchema);
  
  // Identify potential blocking fields
  const potentialBlockingFields = identifyBlockingFields(commonFields, fieldStats);
  
  // Identify potential matching fields
  const potentialMatchingFields = identifyMatchingFields(commonFields, fieldStats);
  
  return {
    sourceSchema,
    referenceSchema,
    commonFields,
    sourceRowCount,
    referenceRowCount,
    fieldStats,
    schemaSimilarity,
    potentialBlockingFields,
    potentialMatchingFields
  };
}

/**
 * Find fields that are common between two schemas
 * @param {Object} sourceSchema - The source table schema
 * @param {Object} referenceSchema - The reference table schema
 * @returns {Array} - Array of common fields
 */
function findCommonFields(sourceSchema, referenceSchema) {
  const commonFields = [];
  const referenceFieldMap = new Map();
  
  // Create a map of reference fields by name
  referenceSchema.fields.forEach(field => {
    referenceFieldMap.set(field.name.toLowerCase(), field);
  });
  
  // Find exact name matches
  sourceSchema.fields.forEach(sourceField => {
    const referenceField = referenceFieldMap.get(sourceField.name.toLowerCase());
    if (referenceField) {
      commonFields.push({
        name: sourceField.name,
        type: sourceField.type,
        sourceField: sourceField.name,
        referenceField: referenceField.name,
        matchType: 'exact'
      });
    }
  });
  
  // Find similar name matches for fields not already matched
  const matchedSourceFields = new Set(commonFields.map(f => f.sourceField.toLowerCase()));
  const matchedReferenceFields = new Set(commonFields.map(f => f.referenceField.toLowerCase()));
  
  sourceSchema.fields.forEach(sourceField => {
    if (!matchedSourceFields.has(sourceField.name.toLowerCase())) {
      // Try to find a similar field name in reference schema
      for (const referenceField of referenceSchema.fields) {
        if (!matchedReferenceFields.has(referenceField.name.toLowerCase())) {
          if (areFieldNamesSimilar(sourceField.name, referenceField.name)) {
            commonFields.push({
              name: sourceField.name,
              type: sourceField.type,
              sourceField: sourceField.name,
              referenceField: referenceField.name,
              matchType: 'similar'
            });
            matchedReferenceFields.add(referenceField.name.toLowerCase());
            break;
          }
        }
      }
    }
  });
  
  return commonFields;
}

/**
 * Check if two field names are similar (ignoring common prefixes/suffixes and underscores)
 * @param {string} name1 - First field name
 * @param {string} name2 - Second field name
 * @returns {boolean} - True if the names are similar
 */
function areFieldNamesSimilar(name1, name2) {
  // Normalize names: lowercase, remove underscores, remove common prefixes/suffixes
  const normalize = (name) => {
    name = name.toLowerCase()
      .replace(/_/g, '')
      .replace(/^(fld|field|col|column|tbl|table)/, '')
      .replace(/(id|key|code|num|number)$/, '');
    return name;
  };
  
  const normalized1 = normalize(name1);
  const normalized2 = normalize(name2);
  
  // Check for exact match after normalization
  if (normalized1 === normalized2) {
    return true;
  }
  
  // Check for common variations
  const variations = {
    'firstname': ['fname', 'first', 'givenname'],
    'lastname': ['lname', 'last', 'surname', 'familyname'],
    'email': ['emailaddress', 'mail'],
    'phone': ['phonenumber', 'telephone', 'tel', 'mobile', 'cell'],
    'address': ['addr', 'street', 'streetaddress'],
    'city': ['town', 'municipality'],
    'state': ['province', 'region'],
    'country': ['nation'],
    'postalcode': ['zip', 'zipcode', 'postcode'],
    'dateofbirth': ['dob', 'birthdate', 'birthday']
  };
  
  // Check if both normalized names map to the same concept
  for (const [concept, aliases] of Object.entries(variations)) {
    const matchesFirst = normalized1 === concept || aliases.includes(normalized1);
    const matchesSecond = normalized2 === concept || aliases.includes(normalized2);
    
    if (matchesFirst && matchesSecond) {
      return true;
    }
  }
  
  // Calculate Levenshtein distance for close matches
  const maxDistance = Math.min(normalized1.length, normalized2.length) <= 4 ? 1 : 2;
  return levenshteinDistance(normalized1, normalized2) <= maxDistance;
}

/**
 * Calculate Levenshtein distance between two strings
 * @param {string} s1 - First string
 * @param {string} s2 - Second string
 * @returns {number} - The Levenshtein distance
 */
function levenshteinDistance(s1, s2) {
  const m = s1.length;
  const n = s2.length;
  
  // Create a matrix of size (m+1) x (n+1)
  const dp = Array(m + 1).fill().map(() => Array(n + 1).fill(0));
  
  // Initialize the matrix
  for (let i = 0; i <= m; i++) {
    dp[i][0] = i;
  }
  
  for (let j = 0; j <= n; j++) {
    dp[0][j] = j;
  }
  
  // Fill the matrix
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(
          dp[i - 1][j],     // deletion
          dp[i][j - 1],     // insertion
          dp[i - 1][j - 1]  // substitution
        );
      }
    }
  }
  
  return dp[m][n];
}

/**
 * Get statistics for fields in both tables
 * @param {string} sourceTableId - The ID of the source table
 * @param {string} referenceTableId - The ID of the reference table
 * @param {Array} commonFields - Array of common fields
 * @returns {Promise<Object>} - Field statistics
 */
async function getFieldStatistics(sourceTableId, referenceTableId, commonFields) {
  // Get field statistics for source table
  const sourceFieldStats = await dbConnector.getFieldStats(
    sourceTableId, 
    commonFields.map(f => ({ name: f.sourceField, type: f.type }))
  );
  
  // Get field statistics for reference table
  const referenceFieldStats = await dbConnector.getFieldStats(
    referenceTableId,
    commonFields.map(f => ({ name: f.referenceField, type: f.type }))
  );
  
  // Combine statistics
  const fieldStats = {
    fields: {}
  };
  
  commonFields.forEach(field => {
    const sourceStats = sourceFieldStats[field.sourceField];
    const referenceStats = referenceFieldStats[field.referenceField];
    
    fieldStats.fields[field.name] = {
      uniqueRatio: (sourceStats.uniqueRatio + referenceStats.uniqueRatio) / 2,
      nullRatio: (sourceStats.nullRatio + referenceStats.nullRatio) / 2,
      avgLength: sourceStats.avgLength,
      sourceStats,
      referenceStats
    };
  });
  
  // Calculate overall unique field ratio
  const uniqueRatios = Object.values(fieldStats.fields).map(stats => stats.uniqueRatio);
  fieldStats.uniqueFieldRatio = uniqueRatios.reduce((sum, ratio) => sum + ratio, 0) / uniqueRatios.length;
  
  return fieldStats;
}

/**
 * Calculate a similarity score between two schemas
 * @param {Object} sourceSchema - The source table schema
 * @param {Object} referenceSchema - The reference table schema
 * @returns {number} - Similarity score between 0 and 1
 */
function calculateSchemaSimilarity(sourceSchema, referenceSchema) {
  const sourceFieldCount = sourceSchema.fields.length;
  const referenceFieldCount = referenceSchema.fields.length;
  
  // Find exact name matches
  const sourceFieldNames = new Set(sourceSchema.fields.map(f => f.name.toLowerCase()));
  const referenceFieldNames = new Set(referenceSchema.fields.map(f => f.name.toLowerCase()));
  
  let exactMatches = 0;
  sourceFieldNames.forEach(name => {
    if (referenceFieldNames.has(name)) {
      exactMatches++;
    }
  });
  
  // Find type matches
  const sourceFieldTypes = sourceSchema.fields.map(f => f.type);
  const referenceFieldTypes = referenceSchema.fields.map(f => f.type);
  
  const typeDistribution = {};
  sourceFieldTypes.forEach(type => {
    typeDistribution[type] = (typeDistribution[type] || 0) + 1;
  });
  
  let typeMatches = 0;
  referenceFieldTypes.forEach(type => {
    if (typeDistribution[type]) {
      typeMatches++;
      typeDistribution[type]--;
    }
  });
  
  // Calculate Jaccard similarity for field names
  const union = new Set([...sourceFieldNames, ...referenceFieldNames]);
  const intersection = new Set();
  sourceFieldNames.forEach(name => {
    if (referenceFieldNames.has(name)) {
      intersection.add(name);
    }
  });
  
  const jaccardSimilarity = intersection.size / union.size;
  
  // Calculate overall similarity score
  const exactMatchScore = exactMatches / Math.min(sourceFieldCount, referenceFieldCount);
  const typeMatchScore = typeMatches / Math.min(sourceFieldCount, referenceFieldCount);
  
  return (exactMatchScore * 0.6) + (typeMatchScore * 0.2) + (jaccardSimilarity * 0.2);
}

/**
 * Identify fields that are good candidates for blocking
 * @param {Array} commonFields - Array of common fields
 * @param {Object} fieldStats - Field statistics
 * @returns {Array} - Array of potential blocking fields
 */
function identifyBlockingFields(commonFields, fieldStats) {
  const potentialBlockingFields = [];
  
  commonFields.forEach(field => {
    const stats = fieldStats.fields[field.name];
    if (!stats) return;
    
    // Good blocking fields have:
    // 1. High uniqueness (but not too high)
    // 2. Low null ratio
    // 3. Consistent format across tables
    const uniquenessScore = stats.uniqueRatio > 0.1 && stats.uniqueRatio < 0.8 ? 
      1 - Math.abs(0.5 - stats.uniqueRatio) : 0;
    
    const nullScore = 1 - stats.nullRatio;
    
    // Calculate consistency between source and reference tables
    const sourceAvgLength = stats.sourceStats.avgLength;
    const referenceAvgLength = stats.referenceStats.avgLength;
    const lengthConsistency = sourceAvgLength && referenceAvgLength ? 
      1 - Math.abs(sourceAvgLength - referenceAvgLength) / Math.max(sourceAvgLength, referenceAvgLength) : 0.5;
    
    const blockingScore = (uniquenessScore * 0.5) + (nullScore * 0.3) + (lengthConsistency * 0.2);
    
    if (blockingScore > 0.6) {
      potentialBlockingFields.push({
        field: field.name,
        sourceField: field.sourceField,
        referenceField: field.referenceField,
        score: blockingScore,
        stats: {
          uniquenessScore,
          nullScore,
          lengthConsistency
        }
      });
    }
  });
  
  // Sort by blocking score (descending)
  return potentialBlockingFields.sort((a, b) => b.score - a.score);
}

/**
 * Identify fields that are good candidates for matching
 * @param {Array} commonFields - Array of common fields
 * @param {Object} fieldStats - Field statistics
 * @returns {Array} - Array of potential matching fields
 */
function identifyMatchingFields(commonFields, fieldStats) {
  const potentialMatchingFields = [];
  
  commonFields.forEach(field => {
    const stats = fieldStats.fields[field.name];
    if (!stats) return;
    
    // Good matching fields have:
    // 1. High uniqueness
    // 2. Low null ratio
    // 3. Appropriate type for matching
    const uniquenessScore = stats.uniqueRatio;
    const nullScore = 1 - stats.nullRatio;
    
    // Determine if the field type is suitable for matching
    const matchableTypes = ['string', 'int64', 'float64', 'date', 'timestamp'];
    const typeScore = matchableTypes.includes(field.type) ? 1 : 0.2;
    
    const matchingScore = (uniquenessScore * 0.4) + (nullScore * 0.3) + (typeScore * 0.3);
    
    if (matchingScore > 0.5) {
      potentialMatchingFields.push({
        field: field.name,
        sourceField: field.sourceField,
        referenceField: field.referenceField,
        type: field.type,
        score: matchingScore,
        stats: {
          uniquenessScore,
          nullScore,
          typeScore
        }
      });
    }
  });
  
  // Sort by matching score (descending)
  return potentialMatchingFields.sort((a, b) => b.score - a.score);
}

/**
 * Get sample data from both tables for the specified fields
 * @param {string} sourceTableId - The ID of the source table
 * @param {string} referenceTableId - The ID of the reference table
 * @param {Array} fields - Array of field objects
 * @param {number} sampleSize - Number of rows to sample
 * @returns {Promise<Object>} - Sample data from both tables
 */
async function getSampleData(sourceTableId, referenceTableId, fields, sampleSize = 100) {
  // Get sample data from source table
  const sourceSample = await dbConnector.getSampleData(sourceTableId, sampleSize);
  
  // Get sample data from reference table
  const referenceSample = await dbConnector.getSampleData(referenceTableId, sampleSize);
  
  // Extract only the specified fields
  const sourceFieldNames = fields.map(f => f.sourceField);
  const referenceFieldNames = fields.map(f => f.referenceField);
  
  const filteredSourceSample = sourceSample.map(row => {
    const filtered = {};
    sourceFieldNames.forEach(field => {
      filtered[field] = row[field];
    });
    return filtered;
  });
  
  const filteredReferenceSample = referenceSample.map(row => {
    const filtered = {};
    referenceFieldNames.forEach(field => {
      filtered[field] = row[field];
    });
    return filtered;
  });
  
  return {
    sourceSample: filteredSourceSample,
    referenceSample: filteredReferenceSample
  };
}

/**
 * Analyze the distribution of values in a field
 * @param {Array} samples - Array of sample data
 * @param {string} fieldName - The name of the field to analyze
 * @returns {Object} - Distribution statistics
 */
function analyzeValueDistribution(samples, fieldName) {
  const values = samples.map(sample => sample[fieldName]).filter(Boolean);
  
  if (values.length === 0) {
    return {
      uniqueCount: 0,
      uniqueRatio: 0,
      mostCommon: [],
      distribution: {}
    };
  }
  
  // Count occurrences of each value
  const valueCounts = {};
  values.forEach(value => {
    valueCounts[value] = (valueCounts[value] || 0) + 1;
  });
  
  // Calculate unique count and ratio
  const uniqueCount = Object.keys(valueCounts).length;
  const uniqueRatio = uniqueCount / values.length;
  
  // Find most common values
  const mostCommon = Object.entries(valueCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([value, count]) => ({ value, count, frequency: count / values.length }));
  
  return {
    uniqueCount,
    uniqueRatio,
    mostCommon,
    distribution: valueCounts
  };
}

/**
 * Analyze the format of string values in a field
 * @param {Array} samples - Array of sample data
 * @param {string} fieldName - The name of the field to analyze
 * @returns {Object} - Format statistics
 */
function analyzeStringFormat(samples, fieldName) {
  const values = samples.map(sample => sample[fieldName])
    .filter(value => typeof value === 'string' && value.trim().length > 0);
  
  if (values.length === 0) {
    return {
      avgLength: 0,
      patterns: []
    };
  }
  
  // Calculate average length
  const totalLength = values.reduce((sum, value) => sum + value.length, 0);
  const avgLength = totalLength / values.length;
  
  // Detect common patterns
  const patternCounts = {};
  values.forEach(value => {
    const pattern = detectPattern(value);
    patternCounts[pattern] = (patternCounts[pattern] || 0) + 1;
  });
  
  // Find most common patterns
  const patterns = Object.entries(patternCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([pattern, count]) => ({ pattern, count, frequency: count / values.length }));
  
  return {
    avgLength,
    patterns
  };
}

/**
 * Detect the pattern of a string value
 * @param {string} value - The string value
 * @returns {string} - The detected pattern
 */
function detectPattern(value) {
  // Replace characters with pattern symbols
  let pattern = value
    .replace(/[A-Z]/g, 'A')
    .replace(/[a-z]/g, 'a')
    .replace(/[0-9]/g, '9')
    .replace(/[^A-Za-z0-9]/g, match => match);
  
  // Compress repeated patterns
  pattern = pattern.replace(/(.)\1+/g, '$1+');
  
  return pattern;
}

module.exports = {
  analyzeSchema,
  findCommonFields,
  getFieldStatistics,
  calculateSchemaSimilarity,
  identifyBlockingFields,
  identifyMatchingFields,
  getSampleData,
  analyzeValueDistribution,
  analyzeStringFormat,
  generateAnalysisSql
};
