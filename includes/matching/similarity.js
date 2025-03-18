/**
 * Similarity Functions
 * 
 * SQL templates for calculating similarity between fields
 * using various algorithms optimized for BigQuery.
 */

const standardization = require('../sql/standardization');

/**
 * Generate SQL for calculating exact match similarity
 * @param {string} field1 - First field name
 * @param {string} field2 - Second field name
 * @param {Object} options - Similarity options
 * @returns {string} SQL expression
 */
function exactMatchSimilarity(field1, field2, options = {}) {
  const {
    standardizeFirst = true,
    fieldType = 'string',
    standardizationOptions = {},
    nullEquals = false
  } = options;
  
  let f1 = field1;
  let f2 = field2;
  
  // Apply standardization if requested
  if (standardizeFirst) {
    f1 = standardization.standardizeField(field1, fieldType, standardizationOptions);
    f2 = standardization.standardizeField(field2, fieldType, standardizationOptions);
  }
  
  if (nullEquals) {
    return `
      CASE
        WHEN ${f1} IS NULL AND ${f2} IS NULL THEN 1.0
        WHEN ${f1} IS NULL OR ${f2} IS NULL THEN 0.0
        WHEN ${f1} = ${f2} THEN 1.0
        ELSE 0.0
      END
    `;
  } else {
    return `
      CASE
        WHEN ${f1} IS NULL OR ${f2} IS NULL THEN 0.0
        WHEN ${f1} = ${f2} THEN 1.0
        ELSE 0.0
      END
    `;
  }
}

/**
 * Generate SQL for calculating Levenshtein ratio similarity
 * @param {string} field1 - First field name
 * @param {string} field2 - Second field name
 * @param {Object} options - Similarity options
 * @returns {string} SQL expression
 */
function levenshteinSimilarity(field1, field2, options = {}) {
  const {
    standardizeFirst = true,
    fieldType = 'string',
    standardizationOptions = {},
    caseSensitive = false
  } = options;
  
  let f1 = field1;
  let f2 = field2;
  
  // Apply standardization if requested
  if (standardizeFirst) {
    f1 = standardization.standardizeField(field1, fieldType, standardizationOptions);
    f2 = standardization.standardizeField(field2, fieldType, standardizationOptions);
  }
  
  // Apply case normalization if not case sensitive
  if (!caseSensitive) {
    f1 = `UPPER(${f1})`;
    f2 = `UPPER(${f2})`;
  }
  
  return `
    CASE
      WHEN ${f1} IS NULL OR ${f2} IS NULL THEN 0.0
      WHEN ${f1} = ${f2} THEN 1.0
      ELSE 1.0 - (CAST(LEVENSHTEIN(${f1}, ${f2}) AS FLOAT64) / 
                  GREATEST(LENGTH(${f1}), LENGTH(${f2})))
    END
  `;
}

/**
 * Generate SQL for calculating Jaro-Winkler similarity approximation
 * @param {string} field1 - First field name
 * @param {string} field2 - Second field name
 * @param {Object} options - Similarity options
 * @returns {string} SQL expression
 */
function jaroWinklerSimilarity(field1, field2, options = {}) {
  const {
    standardizeFirst = true,
    fieldType = 'string',
    standardizationOptions = {},
    caseSensitive = false
  } = options;
  
  let f1 = field1;
  let f2 = field2;
  
  // Apply standardization if requested
  if (standardizeFirst) {
    f1 = standardization.standardizeField(field1, fieldType, standardizationOptions);
    f2 = standardization.standardizeField(field2, fieldType, standardizationOptions);
  }
  
  // Apply case normalization if not case sensitive
  if (!caseSensitive) {
    f1 = `UPPER(${f1})`;
    f2 = `UPPER(${f2})`;
  }
  
  // Note: BigQuery doesn't have a native Jaro-Winkler function
  // This is an approximation that weighs character prefix matches more heavily
  return `
    CASE
      WHEN ${f1} IS NULL OR ${f2} IS NULL THEN 0.0
      WHEN ${f1} = ${f2} THEN 1.0
      ELSE (
        -- Base Levenshtein ratio
        (1.0 - (CAST(LEVENSHTEIN(${f1}, ${f2}) AS FLOAT64) / 
                GREATEST(LENGTH(${f1}), LENGTH(${f2})))) *
        
        -- Boost if first characters match (approximating Jaro-Winkler prefix boost)
        CASE
          WHEN LEFT(${f1}, 1) = LEFT(${f2}, 1) THEN 1.25
          ELSE 1.0
        END *
        
        -- Additional boost if first 2 characters match
        CASE
          WHEN LEFT(${f1}, 2) = LEFT(${f2}, 2) THEN 1.1
          ELSE 1.0
        END *
        
        -- Additional boost if first 3 characters match
        CASE
          WHEN LEFT(${f1}, 3) = LEFT(${f2}, 3) THEN 1.05
          ELSE 1.0
        END
      )
    END
  `;
}

/**
 * Generate SQL for calculating phonetic similarity
 * @param {string} field1 - First field name
 * @param {string} field2 - Second field name
 * @param {Object} options - Similarity options
 * @returns {string} SQL expression
 */
function phoneticSimilarity(field1, field2, options = {}) {
  const {
    standardizeFirst = true,
    fieldType = 'string',
    standardizationOptions = {},
    algorithm = 'soundex'
  } = options;
  
  let f1 = field1;
  let f2 = field2;
  
  // Apply standardization if requested
  if (standardizeFirst) {
    f1 = standardization.standardizeField(field1, fieldType, standardizationOptions);
    f2 = standardization.standardizeField(field2, fieldType, standardizationOptions);
  }
  
  switch (algorithm.toLowerCase()) {
    case 'soundex':
      return `
        CASE
          WHEN ${f1} IS NULL OR ${f2} IS NULL THEN 0.0
          WHEN ${f1} = ${f2} THEN 1.0
          WHEN SOUNDEX(${f1}) = SOUNDEX(${f2}) THEN 0.9
          ELSE 0.0
        END
      `;
      
    case 'metaphone':
      // Note: BigQuery doesn't have a native Metaphone function
      // Fallback to Soundex
      return `
        CASE
          WHEN ${f1} IS NULL OR ${f2} IS NULL THEN 0.0
          WHEN ${f1} = ${f2} THEN 1.0
          WHEN SOUNDEX(${f1}) = SOUNDEX(${f2}) THEN 0.9
          ELSE 0.0
        END
      `;
      
    default:
      return `
        CASE
          WHEN ${f1} IS NULL OR ${f2} IS NULL THEN 0.0
          WHEN ${f1} = ${f2} THEN 1.0
          WHEN SOUNDEX(${f1}) = SOUNDEX(${f2}) THEN 0.9
          ELSE 0.0
        END
      `;
  }
}

/**
 * Generate SQL for calculating token similarity
 * @param {string} field1 - First field name
 * @param {string} field2 - Second field name
 * @param {Object} options - Similarity options
 * @returns {string} SQL expression
 */
function tokenSimilarity(field1, field2, options = {}) {
  const {
    standardizeFirst = true,
    fieldType = 'string',
    standardizationOptions = {},
    orderSensitive = false
  } = options;
  
  let f1 = field1;
  let f2 = field2;
  
  // Apply standardization if requested
  if (standardizeFirst) {
    f1 = standardization.standardizeField(field1, fieldType, standardizationOptions);
    f2 = standardization.standardizeField(field2, fieldType, standardizationOptions);
  }
  
  if (orderSensitive) {
    // Preserve token order (better for structured text)
    return `
      CASE
        WHEN ${f1} IS NULL OR ${f2} IS NULL THEN 0.0
        WHEN ${f1} = ${f2} THEN 1.0
        ELSE (
          -- Count matching words
          WITH words1 AS (
            SELECT word, ROW_NUMBER() OVER() AS position
            FROM UNNEST(SPLIT(${f1}, ' ')) AS word
            WHERE TRIM(word) != ''
          ),
          words2 AS (
            SELECT word, ROW_NUMBER() OVER() AS position
            FROM UNNEST(SPLIT(${f2}, ' ')) AS word
            WHERE TRIM(word) != ''
          ),
          matches AS (
            SELECT 
              COUNT(*) AS matching_words,
              COUNT(*) / NULLIF(GREATEST(
                (SELECT COUNT(*) FROM words1),
                (SELECT COUNT(*) FROM words2)
              ), 0) AS word_ratio
            FROM words1 w1
            JOIN words2 w2
            ON UPPER(w1.word) = UPPER(w2.word) AND w1.position = w2.position
          )
          
          SELECT word_ratio FROM matches
        )
      END
    `;
  } else {
    // Ignore token order (better for names, addresses)
    return `
      CASE
        WHEN ${f1} IS NULL OR ${f2} IS NULL THEN 0.0
        WHEN ${f1} = ${f2} THEN 1.0
        ELSE (
          -- Count matching words regardless of order
          WITH words1 AS (
            SELECT UPPER(word) AS word
            FROM UNNEST(SPLIT(${f1}, ' ')) AS word
            WHERE TRIM(word) != ''
          ),
          words2 AS (
            SELECT UPPER(word) AS word
            FROM UNNEST(SPLIT(${f2}, ' ')) AS word
            WHERE TRIM(word) != ''
          ),
          all_words AS (
            SELECT word FROM words1
            UNION ALL
            SELECT word FROM words2
          ),
          unique_words AS (
            SELECT word, COUNT(*) AS occurences
            FROM all_words
            GROUP BY word
          ),
          word_counts AS (
            SELECT
              (SELECT COUNT(*) FROM words1) AS count1,
              (SELECT COUNT(*) FROM words2) AS count2,
              (SELECT COUNT(*) FROM unique_words WHERE occurences = 2) AS common_count
          )
          
          SELECT 
            common_count / NULLIF(GREATEST(count1, count2), 0)
          FROM word_counts
        )
      END
    `;
  }
}

/**
 * Generate SQL for calculating numeric similarity
 * @param {string} field1 - First field name
 * @param {string} field2 - Second field name
 * @param {Object} options - Similarity options
 * @returns {string} SQL expression
 */
function numericSimilarity(field1, field2, options = {}) {
  const {
    standardizeFirst = true,
    fieldType = 'numeric',
    standardizationOptions = {},
    maxDifference = 10.0,
    percentage = false
  } = options;
  
  let f1 = field1;
  let f2 = field2;
  
  // Apply standardization if requested
  if (standardizeFirst) {
    f1 = standardization.standardizeField(field1, fieldType, standardizationOptions);
    f2 = standardization.standardizeField(field2, fieldType, standardizationOptions);
  }
  
  if (percentage) {
    // Calculate similarity as percentage difference
    return `
      CASE
        WHEN ${f1} IS NULL OR ${f2} IS NULL THEN 0.0
        WHEN ${f1} = ${f2} THEN 1.0
        WHEN ${f1} = 0 OR ${f2} = 0 THEN 0.0
        ELSE 1.0 - LEAST(1.0, ABS(${f1} - ${f2}) / GREATEST(ABS(${f1}), ABS(${f2})))
      END
    `;
  } else {
    // Calculate similarity as absolute difference relative to max difference
    return `
      CASE
        WHEN ${f1} IS NULL OR ${f2} IS NULL THEN 0.0
        WHEN ${f1} = ${f2} THEN 1.0
        ELSE GREATEST(0.0, 1.0 - ABS(${f1} - ${f2}) / ${maxDifference})
      END
    `;
  }
}

/**
 * Generate SQL for calculating date similarity
 * @param {string} field1 - First field name
 * @param {string} field2 - Second field name
 * @param {Object} options - Similarity options
 * @returns {string} SQL expression
 */
function dateSimilarity(field1, field2, options = {}) {
  const {
    standardizeFirst = true,
    fieldType = 'date',
    standardizationOptions = {},
    maxDaysDifference = 30
  } = options;
  
  let f1 = field1;
  let f2 = field2;
  
  // Apply standardization if requested
  if (standardizeFirst) {
    f1 = standardization.standardizeField(field1, fieldType, standardizationOptions);
    f2 = standardization.standardizeField(field2, fieldType, standardizationOptions);
  }
  
  return `
    CASE
      WHEN ${f1} IS NULL OR ${f2} IS NULL THEN 0.0
      WHEN ${f1} = ${f2} THEN 1.0
      ELSE GREATEST(0.0, 1.0 - 
                    (ABS(DATE_DIFF(SAFE_CAST(${f1} AS DATE), 
                                   SAFE_CAST(${f2} AS DATE), DAY)) / 
                     ${maxDaysDifference}))
    END
  `;
}

/**
 * Generate SQL for calculating cosine similarity between two vectors
 * @param {string} array1 - First array field name
 * @param {string} array2 - Second array field name
 * @param {Object} options - Similarity options
 * @returns {string} SQL expression
 */
function cosineSimilarity(array1, array2, options = {}) {
  const {
    standardizeFirst = false,
    ignoreNulls = false
  } = options;
  
  // Build SQL for cosine similarity
  return `
    CASE
      WHEN ${array1} IS NULL OR ${array2} IS NULL THEN NULL
      WHEN ARRAY_LENGTH(${array1}) = 0 OR ARRAY_LENGTH(${array2}) = 0 THEN NULL
      ELSE (
        -- Calculate dot product
        (
          SELECT SUM(a * b)
          FROM UNNEST(
            ARRAY(SELECT element FROM UNNEST(${array1}) element WITH OFFSET pos
                  WHERE ${ignoreNulls ? 'element IS NOT NULL' : 'TRUE'})
          ) a WITH OFFSET pos1
          JOIN UNNEST(
            ARRAY(SELECT element FROM UNNEST(${array2}) element WITH OFFSET pos
                  WHERE ${ignoreNulls ? 'element IS NOT NULL' : 'TRUE'})
          ) b WITH OFFSET pos2
          ON pos1 = pos2
        ) /
        (
          -- Calculate magnitudes and multiply them
          SQRT(
            (SELECT SUM(element * element)
             FROM UNNEST(${array1}) element
             WHERE ${ignoreNulls ? 'element IS NOT NULL' : 'TRUE'})
          ) *
          SQRT(
            (SELECT SUM(element * element)
             FROM UNNEST(${array2}) element
             WHERE ${ignoreNulls ? 'element IS NOT NULL' : 'TRUE'})
          )
        )
      )
    END
  `;
}

/**
 * Generate SQL for calculating field similarity based on field type
 * @param {string} field1 - First field name
 * @param {string} field2 - Second field name
 * @param {string} fieldType - Type of field
 * @param {Object} options - Additional options
 * @returns {string} SQL expression
 */
function calculateFieldSimilarity(field1, field2, fieldType, options = {}) {
  switch (fieldType.toLowerCase()) {
    case 'first_name':
    case 'last_name':
    case 'name':
      return jaroWinklerSimilarity(field1, field2, {
        standardizeFirst: true,
        fieldType: fieldType,
        standardizationOptions: options.standardizationOptions
      });
      
    case 'email':
      return exactMatchSimilarity(field1, field2, {
        standardizeFirst: true,
        fieldType: fieldType,
        standardizationOptions: options.standardizationOptions
      });
      
    case 'phone':
      return exactMatchSimilarity(field1, field2, {
        standardizeFirst: true,
        fieldType: fieldType,
        standardizationOptions: options.standardizationOptions
      });
      
    case 'address':
      // Use token similarity for addresses
      return tokenSimilarity(field1, field2, {
        standardizeFirst: true,
        fieldType: fieldType,
        standardizationOptions: options.standardizationOptions,
        orderSensitive: false
      });
    case 'address_components':
        // Use Jaccard similarity for address components (arrays of tokens)
        return jaccardSimilarity(field1, field2);
      
    case 'vector':
    case 'embedding':
    case 'array':
        // Use cosine similarity for numeric vectors/embeddings
        return cosineSimilarity(field1, field2, {
          ignoreNulls: options.ignoreNulls || false
        });
      
    case 'city':
      return levenshteinSimilarity(field1, field2, {
        standardizeFirst: true,
        fieldType: fieldType,
        standardizationOptions: options.standardizationOptions
      });
      
    case 'state':
    case 'country':
    case 'zip':
      return exactMatchSimilarity(field1, field2, {
        standardizeFirst: true,
        fieldType: fieldType,
        standardizationOptions: options.standardizationOptions
      });
      
    case 'date':
    case 'date_of_birth':
      return dateSimilarity(field1, field2, {
        standardizeFirst: true,
        fieldType: fieldType,
        standardizationOptions: options.standardizationOptions
      });
      
    case 'numeric':
    case 'age':
      return numericSimilarity(field1, field2, {
        standardizeFirst: true,
        fieldType: fieldType,
        standardizationOptions: options.standardizationOptions
      });
      
    default:
      return levenshteinSimilarity(field1, field2, {
        standardizeFirst: true,
        fieldType: 'string',
        standardizationOptions: options.standardizationOptions
      });
  }
}

/**
 * Generate SQL for calculating Jaccard similarity between two arrays.
 * @param {string} field1 - First field name (should be an ARRAY)
 * @param {string} field2 - Second field name (should be an ARRAY)
 * @param {Object} options - Similarity options
 * @param {boolean} [options.ignoreCase=false] - Whether to ignore case when comparing
 * @param {boolean} [options.ignoreOrder=true] - Whether to ignore order of elements
 * @param {number} [options.minSimilarity=0.0] - Minimum similarity threshold
 * @returns {string} SQL expression
 */
function jaccardSimilarity(field1, field2, options = {}) {
  const {
    ignoreCase = false,
    ignoreOrder = true,
    minSimilarity = 0.0
  } = options;
  
  // Handle case sensitivity
  let f1 = field1;
  let f2 = field2;
  
  if (ignoreCase) {
    // Apply case normalization to array elements
    f1 = `ARRAY(SELECT UPPER(element) FROM UNNEST(${field1}) AS element)`;
    f2 = `ARRAY(SELECT UPPER(element) FROM UNNEST(${field2}) AS element)`;
  }
  
  return `
    CASE
      -- Handle NULL values
      WHEN ${f1} IS NULL OR ${f2} IS NULL THEN 0.0
      -- Handle empty arrays
      WHEN ARRAY_LENGTH(${f1}) = 0 AND ARRAY_LENGTH(${f2}) = 0 THEN 1.0
      WHEN ARRAY_LENGTH(${f1}) = 0 OR ARRAY_LENGTH(${f2}) = 0 THEN 0.0
      ELSE
        -- Calculate Jaccard similarity: |intersection| / |union|
        COALESCE(
          CAST(ARRAY_LENGTH(ARRAY_INTERSECT(${f1}, ${f2})) AS FLOAT64) /
          NULLIF(CAST(ARRAY_LENGTH(ARRAY_UNION(${f1}, ${f2})) AS FLOAT64), 0),
          0.0
        )
    END
    ${minSimilarity > 0 ? `* CASE WHEN (
      CAST(ARRAY_LENGTH(ARRAY_INTERSECT(${f1}, ${f2})) AS FLOAT64) /
      NULLIF(CAST(ARRAY_LENGTH(ARRAY_UNION(${f1}, ${f2})) AS FLOAT64), 0)
    ) >= ${minSimilarity} THEN 1 ELSE 0 END` : ''}
  `;
}

module.exports = {
  exactMatchSimilarity,
  levenshteinSimilarity,
  jaroWinklerSimilarity,
  phoneticSimilarity,
  tokenSimilarity,
  numericSimilarity,
  dateSimilarity,
  calculateFieldSimilarity,
  jaccardSimilarity,
  cosineSimilarity
};
