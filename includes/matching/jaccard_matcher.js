/**
 * Jaccard Similarity Matcher
 * 
 * This module provides functions for calculating Jaccard similarity between sets
 * and generating SQL for set-based matching in BigQuery.
 * 
 * Jaccard similarity is defined as the size of the intersection divided by the size of the union:
 *   J(A,B) = |A ∩ B| / |A ∪ B|
 * 
 * It's particularly useful for comparing sets of tokens like keywords, interests, or categories.
 */

/**
 * Calculates Jaccard similarity between two sets
 * @param {Array|string} set1 - First set (array or string)
 * @param {Array|string} set2 - Second set (array or string)
 * @param {Object} options - Options for calculation
 * @param {boolean} [options.tokenize=false] - Whether to tokenize strings
 * @param {string} [options.delimiter=' '] - Delimiter for tokenization
 * @param {Object} [options.weights={}] - Weights for each element
 * @returns {number} Similarity score between 0 and 1
 */
function calculateJaccardSimilarity(set1, set2, options = {}) {
  const { tokenize = false, delimiter = ' ', weights = {} } = options;
  
  // Convert strings to arrays if tokenization is enabled
  if (tokenize && typeof set1 === 'string' && typeof set2 === 'string') {
    set1 = set1.split(delimiter).map(s => s.trim()).filter(Boolean);
    set2 = set2.split(delimiter).map(s => s.trim()).filter(Boolean);
  }
  
  // Ensure inputs are arrays
  if (!Array.isArray(set1) || !Array.isArray(set2)) {
    throw new Error('Inputs must be arrays or tokenizable strings');
  }
  
  // Handle edge cases
  if (set1.length === 0 && set2.length === 0) return 1.0;
  if (set1.length === 0 || set2.length === 0) return 0.0;
  
  // Convert arrays to Sets for set operations
  const set1Set = new Set(set1);
  const set2Set = new Set(set2);
  
  // Calculate intersection
  const intersection = new Set();
  for (const item of set1Set) {
    if (set2Set.has(item)) {
      intersection.add(item);
    }
  }
  
  // Calculate union
  const union = new Set([...set1Set, ...set2Set]);
  
  // Calculate similarity
  if (Object.keys(weights).length === 0) {
    // Unweighted Jaccard
    return intersection.size / union.size;
  } else {
    // Weighted Jaccard
    let intersectionWeight = 0;
    let unionWeight = 0;
    
    // Calculate weighted intersection
    for (const item of intersection) {
      intersectionWeight += weights[item] || 1.0;
    }
    
    // Calculate weighted union
    for (const item of union) {
      unionWeight += weights[item] || 1.0;
    }
    
    return intersectionWeight / unionWeight;
  }
}

/**
 * Generates SQL for calculating Jaccard similarity in BigQuery
 * @param {string} field1 - First field expression
 * @param {string} field2 - Second field expression
 * @param {Object} options - SQL generation options
 * @param {boolean} [options.tokenize=false] - Whether fields are strings that need tokenization
 * @param {string} [options.delimiter=' '] - Delimiter for tokenization
 * @param {string} [options.weightExpr=null] - SQL expression for element weights
 * @returns {string} SQL expression for Jaccard similarity
 */
function generateJaccardSql(field1, field2, options = {}) {
  const { 
    tokenize = false, 
    delimiter = ' ', 
    weightExpr = null
  } = options;
  
  let f1 = field1;
  let f2 = field2;
  
  // Apply tokenization if needed
  if (tokenize) {
    f1 = `SPLIT(${field1}, '${delimiter}')`;
    f2 = `SPLIT(${field2}, '${delimiter}')`;
  }
  
  if (weightExpr) {
    // Weighted Jaccard implementation
    return `
      (
        SELECT
          IFNULL(SUM(weight), 0) / NULLIF((SELECT SUM(weight) FROM UNNEST(all_elements) AS elem
            CROSS JOIN (${weightExpr}) AS weights), 0)
        FROM (
          SELECT DISTINCT elem
          FROM UNNEST(ARRAY_INTERSECT(${f1}, ${f2})) AS elem
        ) intersect_elements
        CROSS JOIN (${weightExpr}) AS weights
      )
    `;
  } else {
    // Standard Jaccard implementation
    return `
      SAFE_DIVIDE(
        ARRAY_LENGTH(ARRAY_INTERSECT(${f1}, ${f2})),
        ARRAY_LENGTH(ARRAY_UNION(${f1}, ${f2}))
      )
    `;
  }
}

/**
 * Creates a matcher for calculating and comparing Jaccard similarity
 * @param {Object} config - Configuration options
 * @param {string} [config.defaultDelimiter=' '] - Default delimiter for tokenization
 * @param {number} [config.defaultThreshold=0.5] - Default threshold for similarity
 * @param {Object} [config.defaultWeights={}] - Default weights for elements
 * @returns {Object} Jaccard matcher object
 */
function getJaccardMatcher(config = {}) {
  const {
    defaultDelimiter = ' ',
    defaultThreshold = 0.5,
    defaultWeights = {}
  } = config;
  
  return {
    /**
     * Calculate Jaccard similarity between two values
     * @param {Array|string} value1 - First value
     * @param {Array|string} value2 - Second value
     * @param {Object} options - Calculation options
     * @returns {number} Similarity score
     */
    calculateSimilarity(value1, value2, options = {}) {
      return calculateJaccardSimilarity(value1, value2, {
        tokenize: typeof value1 === 'string' && typeof value2 === 'string',
        delimiter: defaultDelimiter,
        weights: defaultWeights,
        ...options
      });
    },
    
    /**
     * Generate SQL for Jaccard similarity
     * @param {string} field1 - First field
     * @param {string} field2 - Second field
     * @param {Object} options - SQL options
     * @returns {string} SQL expression
     */
    generateSql(field1, field2, options = {}) {
      return generateJaccardSql(field1, field2, {
        delimiter: defaultDelimiter,
        ...options
      });
    },
    
    /**
     * Compare two arrays using Jaccard similarity
     * @param {Array} array1 - First array
     * @param {Array} array2 - Second array
     * @param {Object} options - Comparison options
     * @returns {Object} Comparison result with score and details
     */
    compareArrays(array1, array2, options = {}) {
      const { threshold = defaultThreshold, weights = defaultWeights } = options;
      
      const similarity = calculateJaccardSimilarity(array1, array2, { weights });
      
      // Calculate shared and unique elements
      const set1 = new Set(array1);
      const set2 = new Set(array2);
      
      const shared = Array.from(set1).filter(item => set2.has(item));
      const uniqueToFirst = Array.from(set1).filter(item => !set2.has(item));
      const uniqueToSecond = Array.from(set2).filter(item => !set1.has(item));
      
      return {
        similarity,
        isMatch: similarity >= threshold,
        shared,
        uniqueToFirst,
        uniqueToSecond,
        threshold
      };
    },
    
    /**
     * Compare two strings using tokenized Jaccard similarity
     * @param {string} string1 - First string
     * @param {string} string2 - Second string
     * @param {Object} options - Comparison options
     * @returns {Object} Comparison result with score and details
     */
    compareStrings(string1, string2, options = {}) {
      const { 
        threshold = defaultThreshold, 
        delimiter = defaultDelimiter,
        weights = defaultWeights,
        caseSensitive = false
      } = options;
      
      // Normalize strings
      const str1 = caseSensitive ? string1 : string1.toLowerCase();
      const str2 = caseSensitive ? string2 : string2.toLowerCase();
      
      // Tokenize
      const tokens1 = str1.split(delimiter).map(s => s.trim()).filter(Boolean);
      const tokens2 = str2.split(delimiter).map(s => s.trim()).filter(Boolean);
      
      // Use array comparison
      return this.compareArrays(tokens1, tokens2, { threshold, weights });
    }
  };
}

/**
 * Creates a BigQuery SQL function for Jaccard similarity
 * @param {string} functionName - Name for the SQL function
 * @param {boolean} [weighted=false] - Whether to create a weighted version
 * @returns {string} SQL CREATE FUNCTION statement
 */
function createJaccardSqlFunction(functionName, weighted = false) {
  if (weighted) {
    return `
      CREATE OR REPLACE FUNCTION \`\${self()}.${functionName}\`(arr1 ARRAY<STRING>, arr2 ARRAY<STRING>, weights ARRAY<STRUCT<token STRING, weight FLOAT64>>)
      RETURNS FLOAT64
      AS (
        (
          SELECT
            IFNULL(SUM(weight_map.weight), 0) / 
            NULLIF((SELECT SUM(weight_map.weight) FROM UNNEST(ARRAY_UNION(arr1, arr2)) AS token
                   LEFT JOIN UNNEST(weights) AS weight_map ON token = weight_map.token), 0)
          FROM
            UNNEST(ARRAY_INTERSECT(arr1, arr2)) AS token
            LEFT JOIN UNNEST(weights) AS weight_map ON token = weight_map.token
        )
      );
    `;
  } else {
    return `
      CREATE OR REPLACE FUNCTION \`\${self()}.${functionName}\`(arr1 ARRAY<STRING>, arr2 ARRAY<STRING>)
      RETURNS FLOAT64
      AS (
        SAFE_DIVIDE(
          ARRAY_LENGTH(ARRAY_INTERSECT(arr1, arr2)),
          ARRAY_LENGTH(ARRAY_UNION(arr1, arr2))
        )
      );
    `;
  }
}

module.exports = {
  calculateJaccardSimilarity,
  generateJaccardSql,
  getJaccardMatcher,
  createJaccardSqlFunction
};