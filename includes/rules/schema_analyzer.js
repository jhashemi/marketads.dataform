/**
 * Schema Analyzer Module
 * 
 * Analyzes table schemas to identify common fields, field statistics, and other metadata
 * needed for intelligent rule selection. This module provides insights into the structure
 * of source and reference tables to help determine the most effective matching rules.
 */

/**
 * Generates a SQL query to analyze the schema of the specified tables.
 * @param {string} project_id - The BigQuery project ID.
 * @param {string} dataset_id - The BigQuery dataset ID.
 * @param {string[]} tableIds - The IDs of the tables to analyze.
 * @returns {string} - The SQL query for schema analysis.
 * @throws {Error} - If there is an error generating the SQL query.
 * @throws {TypeError} - If input types are invalid
 */
function generateAnalysisSql(project_id, dataset_id, tableIds) {
  if (typeof project_id !== 'string' || !project_id) {
    throw new TypeError("Expected a non-empty string for project_id");
  }
  if (typeof dataset_id !== 'string' || !dataset_id) {
     throw new TypeError("Expected a non-empty string for dataset_id");
  }
    if (!Array.isArray(tableIds) || tableIds.length === 0 || !tableIds.every(id => typeof id === 'string' && id)) {
    throw new TypeError("Expected a non-empty array of strings for tableIds");
  }
    
  try {
    const queries = tableIds.map(tableId => {
      return `SELECT
        '${tableId}' as table_name,
        column_name as field_name,
        data_type as field_type
      FROM \`${project_id}.${dataset_id}.INFORMATION_SCHEMA.COLUMNS\`
      WHERE table_name = '${tableId}'`;
    });

    return queries.join('\\nUNION ALL\\n');
  } catch (error) {
    console.error("Error generating analysis SQL:", error);
    throw new Error(`Failed to generate analysis SQL: ${error.message}`);
  }
}

/**
 * Analyzes the schema of two tables to identify common fields and gather statistics.
 * @param {string} sourceTableId The ID of the source table.
 * @param {string} referenceTableId The ID of the reference table.
 * @param {string} projectId The ID of the BigQuery project.
 * @param {string} datasetId The ID of the BigQuery dataset.
 * @returns {Promise<Object>} An object containing schema analysis results.
 * @throws {TypeError} - if the inputs are invalid
 */
async function analyzeSchema(sourceTableId, referenceTableId, projectId, datasetId) {
    if (typeof sourceTableId !== 'string' || !sourceTableId) {
        throw new TypeError("Expected a non-empty string for sourceTableId");
    }
    if (typeof referenceTableId !== 'string' || !referenceTableId) {
        throw new TypeError("Expected a non-empty string for referenceTableId");
    }
    if (typeof projectId !== 'string' || !projectId) {
        throw new TypeError("Expected a non-empty string for projectId");
    }
    if (typeof datasetId !== 'string' || !datasetId) {
        throw new TypeError("Expected a non-empty string for datasetId");
    }
  console.log(`Analyzing schema for ${sourceTableId} → ${referenceTableId} in ${projectId}.${datasetId}`);

  // Instead of calling dbConnector, we now return the necessary parameters.
  return {
    sourceTableId,
    referenceTableId,
    projectId,
    datasetId
  };
}

/**
 * Find fields that are common between two schemas
 * @param {Object} sourceSchema - The source table schema
 * @param {Object} referenceSchema - The reference table schema
 * @returns {Array} - Array of common fields
 * @throws {TypeError} - if the schemas or fields are invalid
 */
function findCommonFields(sourceSchema, referenceSchema) {
    if (!sourceSchema || typeof sourceSchema !== 'object' || !Array.isArray(sourceSchema.fields)) {
        throw new TypeError("Expected sourceSchema to be an object with a 'fields' array.");
    }
    if (!referenceSchema || typeof referenceSchema !== 'object' || !Array.isArray(referenceSchema.fields)) {
        throw new TypeError("Expected referenceSchema to be an object with a 'fields' array.");
    }
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
  // TODO: Consider using a more robust string similarity library if needed in the future.
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
 * Get statistics for fields in both tables.  This function is kept, but will not be directly used
 * in the Dataform context. It will be used for additional analysis within Dataform if needed.
 * @param {string} sourceTableId - The ID of the source table
 * @param {string} referenceTableId - The ID of the reference table
 * @param {Array} commonFields - Array of common fields
 * @returns {Promise<Object>} - Field statistics.  Currently a placeholder.
 */
async function getFieldStatistics(sourceTableId, referenceTableId, commonFields, projectId, datasetId) {
  if (typeof sourceTableId !== 'string' || !sourceTableId) {
    throw new TypeError("Expected a non-empty string for sourceTableId");
  }
  if (typeof referenceTableId !== 'string' || !referenceTableId) {
      throw new TypeError("Expected a non-empty string for referenceTableId");
  }
    if (typeof projectId !== 'string' || !projectId) {
        throw new TypeError("Expected a non-empty string for projectId");
    }
    if (typeof datasetId !== 'string' || !datasetId) {
        throw new TypeError("Expected a non-empty string for datasetId");
    }
  if (!Array.isArray(commonFields)) {
    throw new TypeError("Expected commonFields to be an array");
  }

  // Return the necessary parameters for Dataform to use.
  return {
    sourceTableId,
    referenceTableId,
    commonFields,
    projectId,
    datasetId
  };
}

/**
 * Generates SQL to retrieve field statistics for common fields between two tables.
 * @param {string} projectId - The BigQuery project ID.
 * @param {string} datasetId - The BigQuery dataset ID.
 * @param {string} sourceTableId - The ID of the source table.
 * @param {string} referenceTableId - The ID of the reference table.
 * @param {Array} commonFields - Array of common fields objects.
 * @returns {string} - The SQL query for retrieving field statistics.
 * @throws {TypeError} - If input types are invalid.
 */
function generateFieldStatisticsSql(projectId, datasetId, sourceTableId, referenceTableId, commonFields) {
    if (typeof projectId !== 'string' || !projectId) {
        throw new TypeError("Expected a non-empty string for projectId");
    }
    if (typeof datasetId !== 'string' || !datasetId) {
        throw new TypeError("Expected a non-empty string for datasetId");
    }
    if (typeof sourceTableId !== 'string' || !sourceTableId) {
        throw new TypeError("Expected a non-empty string for sourceTableId");
    }
    if (typeof referenceTableId !== 'string' || !referenceTableId) {
        throw new TypeError("Expected a non-empty string for referenceTableId");
    }
    if (!Array.isArray(commonFields)) {
        throw new TypeError("Expected commonFields to be an array");
    }

    if (commonFields.length === 0) {
        return ''; // Return empty string if no common fields
    }

    const sourceFields = commonFields.map(field => `'${field.sourceField}'`).join(',');
    const refFields = commonFields.map(field => `'${field.referenceField}'`).join(',');

    // For simplicity, we'll just get data_type for now.  More advanced stats can be added later.
    const query = `
WITH
  SourceFields AS (
  SELECT
    column_name,
    data_type
  FROM
    \`${projectId}.${datasetId}.INFORMATION_SCHEMA.COLUMNS\`
  WHERE
    table_name = '${sourceTableId}' AND column_name IN (${sourceFields})
  ),
  ReferenceFields AS (
  SELECT
    column_name,
    data_type
  FROM
    \`${projectId}.${datasetId}.INFORMATION_SCHEMA.COLUMNS\`
  WHERE
    table_name = '${referenceTableId}' AND column_name IN (${refFields})
  )
SELECT
  'source' as source,
  sf.column_name,
  sf.data_type
FROM
  SourceFields sf
UNION ALL
SELECT
  'reference' as source,
  rf.column_name,
  rf.data_type
FROM
  ReferenceFields rf
`;
    return query;
}

/**
* Calculate a similarity score between two schemas. This function is kept as it is.
* @param {Object} sourceSchema - The source table schema
* @param {Object} referenceSchema - The reference table schema
* @returns {number} - Similarity score between 0 and 1
* @throws {TypeError} - if the schemas are invalid
*/
function calculateSchemaSimilarity(sourceSchema, referenceSchema) {
    if (!sourceSchema || typeof sourceSchema !== 'object' || !Array.isArray(sourceSchema.fields)) {
        throw new TypeError("Expected sourceSchema to be an object with a 'fields' array.");
    }
    if (!referenceSchema || typeof referenceSchema !== 'object' || !Array.isArray(referenceSchema.fields)) {
        throw new TypeError("Expected referenceSchema to be an object with a 'fields' array.");
    }
  // Implementation remains the same as it's logic-based, not DB interaction.
  const sourceFieldCount = sourceSchema.fields.length;
  const referenceFieldCount = referenceSchema.fields.length;

  const sourceFieldNames = new Set(sourceSchema.fields.map(f => f.name.toLowerCase()));
  const referenceFieldNames = new Set(referenceSchema.fields.map(f => f.name.toLowerCase()));

  let exactMatches = 0;
  sourceFieldNames.forEach(name => {
    if (referenceFieldNames.has(name)) {
      exactMatches++;
    }
  });

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

  const union = new Set([...sourceFieldNames, ...referenceFieldNames]);
    const intersection = new Set();
    sourceFieldNames.forEach(name => {
        if (referenceFieldNames.has(name)) {
            intersection.add(name);
        }
    });

  const jaccardSimilarity = intersection.size / union.size;
    const exactMatchScore = exactMatches / Math.min(sourceFieldCount, referenceFieldCount);
    const typeMatchScore = typeMatches / Math.min(sourceFieldCount, referenceFieldCount);

    return (exactMatchScore * 0.6) + (typeMatchScore * 0.2) + (jaccardSimilarity * 0.2);
}

/**
 * Identify fields that are good candidates for blocking. This function is kept as it is.
 * @param {Array} commonFields - Array of common fields
 * @param {Object} fieldStats - Field statistics
 * @returns {Array} - Array of potential blocking fields
 * @throws {TypeError} - if the inputs are invalid
 */
function identifyBlockingFields(commonFields, fieldStats) {
    if (!Array.isArray(commonFields)) {
        throw new TypeError("Expected commonFields to be an array");
    }
    if(typeof fieldStats !== 'object' || fieldStats === null) {
        throw new TypeError ("Expected fieldStats to be an object")
    }
    // Implementation remains the same
    const potentialBlockingFields = [];

    commonFields.forEach(field => {
        const stats = fieldStats.fields ? fieldStats.fields[field.name] : undefined; // Handle potential undefined
        if (!stats) return;

        const uniquenessScore = stats.uniqueRatio > 0.1 && stats.uniqueRatio < 0.8 ?
            1 - Math.abs(0.5 - stats.uniqueRatio) : 0;
        const nullScore = 1 - stats.nullRatio;
        const lengthConsistency = (stats.sourceStats?.avgLength && stats.referenceStats?.avgLength) ?
            1 - Math.abs(stats.sourceStats.avgLength - stats.referenceStats.avgLength) / Math.max(stats.sourceStats.avgLength, stats.referenceStats.avgLength) : 0.5;
        const blockingScore = (uniquenessScore * 0.5) + (nullScore * 0.3) + (lengthConsistency * 0.2);

        if (blockingScore > 0.6) {
            potentialBlockingFields.push({
                field: field.name,
                sourceField: field.sourceField,
                referenceField: field.referenceField,
                score: blockingScore,
                stats: { uniquenessScore, nullScore, lengthConsistency }
            });
        }
    });
    return potentialBlockingFields.sort((a, b) => b.score - a.score);
}

/**
 * Identify fields that are good candidates for matching.
 * @param {Array} commonFields - Array of common fields
 * @param {Object} fieldStats - Field statistics
 * @returns {Array} - Array of potential matching fields
 * @throws {TypeError} - if inputs are invalid
*/
function identifyMatchingFields(commonFields, fieldStats) {
    if (!Array.isArray(commonFields)) {
        throw new TypeError("Expected commonFields to be an array");
    }
    if (typeof fieldStats !== 'object' || fieldStats === null) {
        throw new TypeError("Expected fieldStats to be an object");
    }
  // Implementation remains the same
    const potentialMatchingFields = [];

    commonFields.forEach(field => {
        const stats = fieldStats.fields ? fieldStats.fields[field.name] : undefined; // Handle potential undefined.
        if (!stats) return;

        const uniquenessScore = stats.uniqueRatio;
        const nullScore = 1 - stats.nullRatio;
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
                stats: { uniquenessScore, nullScore, typeScore }
            });
        }
    });
    return potentialMatchingFields.sort((a, b) => b.score - a.score);
}

/**
 * Get sample data from both tables for the specified fields. Placeholder - will likely not be used directly.
 * @param {string} sourceTableId
 * @param {string} referenceTableId
 * @param {Array} fields
 * @param {number} sampleSize
 */
async function getSampleData(sourceTableId, referenceTableId, fields, sampleSize = 100) {
    // Placeholder for now.  We might not need sample data directly in this module,
    // as Dataform will handle the query execution.
    console.log(`getSampleData called with ${sourceTableId}, ${referenceTableId}, ${JSON.stringify(fields)}, ${sampleSize}`);
    return {};
}

/**
 * Analyze the distribution of values in a field.
 * @param {Array} samples - Array of sample data
 * @param {string} fieldName - The name of the field to analyze
 * @returns {Object} - Distribution statistics
 * @throws {TypeError} - if inputs are invalid
 */
function analyzeValueDistribution(samples, fieldName) {
    if(!Array.isArray(samples)){
        throw new TypeError("Expected samples to be an array");
    }
    if (typeof fieldName !== 'string' || !fieldName) {
        throw new TypeError("Expected fieldName to be a non-empty string");
    }
    // Implementation remains the same.
  const values = samples.map(sample => sample[fieldName]).filter(Boolean);

  if (values.length === 0) {
    return {
      uniqueCount: 0,
      uniqueRatio: 0,
      mostCommon: [],
      distribution: {}
    };
  }

  const valueCounts = {};
  values.forEach(value => {
    valueCounts[value] = (valueCounts[value] || 0) + 1;
  });

  const uniqueCount = Object.keys(valueCounts).length;
  const uniqueRatio = uniqueCount / values.length;

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
 * Analyze the format of string values in a field.
 * @param {Array} samples - Array of sample data
 * @param {string} fieldName - The name of the field to analyze
 * @returns {Object} - Format statistics
 * @throws {TypeError} - if inputs are invalid
 */
function analyzeStringFormat(samples, fieldName) {
    if(!Array.isArray(samples)){
        throw new TypeError("Expected samples to be an array");
    }
    if (typeof fieldName !== 'string' || !fieldName) {
        throw new TypeError("Expected fieldName to be a non-empty string");
    }
    // Implementation remains the same.
  const values = samples.map(sample => sample[fieldName])
    .filter(value => typeof value === 'string' && value.trim().length > 0);

  if (values.length === 0) {
    return {
      avgLength: 0,
      patterns: []
    };
  }

  const totalLength = values.reduce((sum, value) => sum + value.length, 0);
  const avgLength = totalLength / values.length;

  const patternCounts = {};
  values.forEach(value => {
    const pattern = detectPattern(value);
    patternCounts[pattern] = (patternCounts[pattern] || 0) + 1;
  });

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
 * Detect the pattern of a string value.
 * @param {string} value - The string value
 * @returns {string} - The detected pattern
 */
function detectPattern(value) {
    // Implementation remains the same.
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
