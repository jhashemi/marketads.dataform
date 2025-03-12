/**
 * String Similarity SQL Functions for BigQuery
 * 
 * This module provides SQL snippets that implement string similarity 
 * functions using BigQuery's native capabilities for Dataform.
 */

/**
 * Generates SQL for calculating Levenshtein similarity between two strings in BigQuery
 * @param {string} str1Expr - SQL expression for the first string
 * @param {string} str2Expr - SQL expression for the second string
 * @returns {string} SQL snippet for normalized Levenshtein similarity
 */
function levenshteinSimilaritySql(str1Expr, str2Expr) {
  return `
    CASE 
      WHEN ${str1Expr} IS NULL OR ${str2Expr} IS NULL THEN 0
      WHEN LENGTH(${str1Expr}) = 0 AND LENGTH(${str2Expr}) = 0 THEN 1
      ELSE 
        -- Use a normalized Levenshtein distance (as similarity score)
        1.0 - (
          CAST(LEVENSHTEIN(LOWER(TRIM(${str1Expr})), LOWER(TRIM(${str2Expr}))) AS FLOAT64) / 
          CAST(GREATEST(LENGTH(TRIM(${str1Expr})), LENGTH(TRIM(${str2Expr}))) AS FLOAT64)
        )
    END
  `;
}

/**
 * Generates SQL for calculating Jaro-Winkler similarity in BigQuery
 * @param {string} str1Expr - SQL expression for the first string
 * @param {string} str2Expr - SQL expression for the second string
 * @returns {string} SQL snippet for Jaro-Winkler similarity calculation
 */
function jaroWinklerSimilaritySql(str1Expr, str2Expr) {
  // For Jaro-Winkler, we can use BigQuery ML's built-in function if ML API is enabled
  // Otherwise, we fall back to a combination of exact match and token-based similarity
  
  return `
    CASE 
      WHEN ${str1Expr} IS NULL OR ${str2Expr} IS NULL THEN 0
      WHEN LOWER(TRIM(${str1Expr})) = LOWER(TRIM(${str2Expr})) THEN 1
      ELSE (
        -- For projects with ML API access, uncomment this:
        /*
        ML.DISTANCE(
          LOWER(TRIM(${str1Expr})), 
          LOWER(TRIM(${str2Expr})), 
          'JARO_WINKLER'
        )
        */
        
        -- Fallback using token and character similarity
        WITH token_sim AS (
          SELECT
            -- Calculate token-based similarity 
            ARRAY_LENGTH(ARRAY(
              SELECT token
              FROM UNNEST(SPLIT(LOWER(TRIM(${str1Expr})), ' ')) AS token
              INNER JOIN UNNEST(SPLIT(LOWER(TRIM(${str2Expr})), ' ')) AS token2
              ON token = token2
            )) / GREATEST(
              ARRAY_LENGTH(SPLIT(LOWER(TRIM(${str1Expr})), ' ')),
              ARRAY_LENGTH(SPLIT(LOWER(TRIM(${str2Expr})), ' ')), 
              1
            ) AS token_similarity,
            
            -- Calculate character-level bigram similarity
            (
              SELECT COUNT(DISTINCT b1)
              FROM UNNEST(GENERATE_ARRAY(1, LENGTH(LOWER(TRIM(${str1Expr})))-1)) AS i,
              UNNEST([SUBSTR(LOWER(TRIM(${str1Expr})), i, 2)]) AS b1
              INNER JOIN UNNEST(GENERATE_ARRAY(1, LENGTH(LOWER(TRIM(${str2Expr})))-1)) AS j,
              UNNEST([SUBSTR(LOWER(TRIM(${str2Expr})), j, 2)]) AS b2
              ON b1 = b2
            ) / GREATEST(
              LENGTH(LOWER(TRIM(${str1Expr})))-1,
              LENGTH(LOWER(TRIM(${str2Expr})))-1,
              1
            ) AS char_similarity
        )
        
        SELECT 0.6 * token_similarity + 0.4 * char_similarity
        FROM token_sim
      )
    END
  `;
}

/**
 * Generates SQL for different string similarity methods
 * @param {string} str1Expr - SQL expression for the first string
 * @param {string} str2Expr - SQL expression for the second string
 * @param {string} method - Similarity method ('levenshtein', 'jaro_winkler', 'equality', etc.)
 * @returns {string} SQL snippet for calculating similarity
 */
function stringSimilaritySql(str1Expr, str2Expr, method) {
  switch (method.toLowerCase()) {
    case 'levenshtein':
      return levenshteinSimilaritySql(str1Expr, str2Expr);
    
    case 'jaro_winkler':
      return jaroWinklerSimilaritySql(str1Expr, str2Expr);
    
    case 'equality':
      return `
        CASE 
          WHEN LOWER(TRIM(${str1Expr})) = LOWER(TRIM(${str2Expr})) THEN 1
          ELSE 0
        END
      `;
      
    case 'contains':
      return `
        CASE
          WHEN ${str1Expr} IS NULL OR ${str2Expr} IS NULL THEN 0
          WHEN CONTAINS_SUBSTR(LOWER(TRIM(${str1Expr})), LOWER(TRIM(${str2Expr})))
            OR CONTAINS_SUBSTR(LOWER(TRIM(${str2Expr})), LOWER(TRIM(${str1Expr}))) THEN 1
          ELSE 0
        END
      `;
      
    case 'soundex':
      return `
        CASE
          WHEN ${str1Expr} IS NULL OR ${str2Expr} IS NULL THEN 0
          WHEN SOUNDEX(LOWER(TRIM(${str1Expr}))) = SOUNDEX(LOWER(TRIM(${str2Expr}))) THEN 1
          ELSE 0
        END
      `;
      
    default:
      return levenshteinSimilaritySql(str1Expr, str2Expr);
  }
}

/**
 * Generates SQL for creating blocking keys in BigQuery
 * @param {string} columnExpr - SQL expression for the column to create keys from
 * @param {string} method - Blocking method (e.g., 'exact', 'prefix', 'phonetic')
 * @param {Object} options - Additional options
 * @returns {string} SQL snippet for creating blocking keys
 */
function blockingKeySql(columnExpr, method, options = {}) {
  const prefixLength = options.length || 3;
  
  switch (method.toLowerCase()) {
    case 'exact':
      return `LOWER(TRIM(${columnExpr}))`;
    
    case 'prefix':
      return `SUBSTR(LOWER(TRIM(${columnExpr})), 1, ${prefixLength})`;
    
    case 'last4':
      return `
        CASE
          WHEN ${columnExpr} IS NULL THEN NULL
          ELSE SUBSTR(REGEXP_REPLACE(${columnExpr}, '[^0-9]', ''), -4)
        END
      `;
    
    case 'email_domain':
      return `
        CASE 
          WHEN ${columnExpr} IS NULL THEN NULL
          WHEN INSTR(LOWER(TRIM(${columnExpr})), '@') > 0
          THEN SUBSTR(
            LOWER(TRIM(${columnExpr})), 
            INSTR(LOWER(TRIM(${columnExpr})), '@') + 1
          )
          ELSE NULL
        END
      `;
    
    case 'year':
      return `
        CASE
          WHEN ${columnExpr} IS NULL THEN NULL
          WHEN SAFE_CAST(${columnExpr} AS DATE) IS NOT NULL 
            THEN CAST(EXTRACT(YEAR FROM SAFE_CAST(${columnExpr} AS DATE)) AS STRING)
          WHEN REGEXP_CONTAINS(${columnExpr}, '\\d{4}')
            THEN REGEXP_EXTRACT(${columnExpr}, '(\\d{4})')
          ELSE NULL
        END
      `;
    
    case 'soundex':
      // Using BigQuery's SOUNDEX function
      return `SOUNDEX(LOWER(TRIM(${columnExpr})))`;
      
    default:
      return `LOWER(TRIM(${columnExpr}))`;
  }
}

/**
 * Creates SQL for address standardization in BigQuery
 * @param {string} addressExpr - SQL expression for the address
 * @returns {string} SQL for standardizing an address
 */
function standardizeAddressSql(addressExpr) {
  return `
    CASE
      WHEN ${addressExpr} IS NULL THEN NULL
      ELSE (
        WITH cleaned AS (
          SELECT LOWER(TRIM(${addressExpr})) as addr
        )
        
        SELECT
          -- Apply a series of standardizations
          (
            -- Replace common street types
            SELECT REGEXP_REPLACE(
              REGEXP_REPLACE(
                REGEXP_REPLACE(
                  REGEXP_REPLACE(
                    REGEXP_REPLACE(
                      REGEXP_REPLACE(
                        REGEXP_REPLACE(
                          REGEXP_REPLACE(
                            REGEXP_REPLACE(
                              REGEXP_REPLACE(
                                -- Clean up spaces first
                                REGEXP_REPLACE(addr, '\\s+', ' '),
                                '\\bstreet\\b', 'st'
                              ),
                              '\\bavenue\\b', 'ave'
                            ),
                            '\\broad\\b', 'rd'
                          ),
                          '\\bdrive\\b', 'dr'
                        ),
                        '\\bboulevard\\b', 'blvd'
                      ),
                      '\\blane\\b', 'ln'
                    ),
                    '\\bplace\\b', 'pl'
                  ),
                  '\\bcourt\\b', 'ct'
                ),
                '\\bcircle\\b', 'cir'
              ),
              '\\bterrace\\b', 'ter'
            ) as addr
            FROM cleaned
          )
          
          -- Replace directionals
          REGEXP_REPLACE(
            REGEXP_REPLACE(
              REGEXP_REPLACE(
                REGEXP_REPLACE(
                  REGEXP_REPLACE(
                    REGEXP_REPLACE(
                      REGEXP_REPLACE(
                        REGEXP_REPLACE(
                          addr,
                          '\\bnorth\\b', 'n'
                        ),
                        '\\bsouth\\b', 's'
                      ),
                      '\\beast\\b', 'e'
                    ),
                    '\\bwest\\b', 'w'
                  ),
                  '\\bnortheast\\b', 'ne'
                ),
                '\\bnorthwest\\b', 'nw'
              ),
              '\\bsoutheast\\b', 'se'
            ),
            '\\bsouthwest\\b', 'sw'
          )
      )
    END
  `;
}

/**
 * Generates SQL for a complete match pipeline in BigQuery
 * @param {string} sourceTableRef - Source table reference in Dataform
 * @param {string} targetTableRef - Target table reference in Dataform
 * @param {Array} fieldMappings - Array of field mapping objects with semantic types and weights
 * @param {Object} options - Additional options for matching
 * @returns {string} Complete matching SQL for Dataform
 */
function generateMatchingPipeline(sourceTableRef, targetTableRef, fieldMappings, options = {}) {
  const { thresholds = { high: 0.9, medium: 0.7, low: 0.5 } } = options;
  
  // Generate field comparison expressions
  const fieldComparisons = fieldMappings.map(mapping => {
    const { sourceField, targetField, type, weight = 1 } = mapping;
    
    let similarityExpr;
    
    // Choose appropriate similarity function based on semantic type
    switch (type) {
      case 'email':
        similarityExpr = `CASE 
          WHEN LOWER(TRIM(s.${sourceField})) = LOWER(TRIM(t.${targetField})) THEN 1.0
          WHEN REGEXP_EXTRACT(LOWER(TRIM(s.${sourceField})), r'@(.+)$') = 
               REGEXP_EXTRACT(LOWER(TRIM(t.${targetField})), r'@(.+)$') THEN 0.5
          ELSE 0.0 
        END`;
        break;
      
      case 'phone':
        similarityExpr = `CASE 
          WHEN REGEXP_REPLACE(s.${sourceField}, r'[^0-9]', '') = 
               REGEXP_REPLACE(t.${targetField}, r'[^0-9]', '') THEN 1.0
          WHEN SUBSTR(REGEXP_REPLACE(s.${sourceField}, r'[^0-9]', ''), -4) = 
               SUBSTR(REGEXP_REPLACE(t.${targetField}, r'[^0-9]', ''), -4) THEN 0.7
          ELSE 0.0 
        END`;
        break;
      
      case 'name':
      case 'firstName':
      case 'lastName':
        similarityExpr = `CASE 
          WHEN LOWER(TRIM(s.${sourceField})) = LOWER(TRIM(t.${targetField})) THEN 1.0
          WHEN SOUNDEX(LOWER(TRIM(s.${sourceField}))) = SOUNDEX(LOWER(TRIM(t.${targetField}))) THEN 0.8
          ELSE ${levenshteinSimilaritySql(`s.${sourceField}`, `t.${targetField}`)}
        END`;
        break;
        
      case 'address':
        similarityExpr = `CASE 
          WHEN LOWER(TRIM(s.${sourceField})) = LOWER(TRIM(t.${targetField})) THEN 1.0
          ELSE ${levenshteinSimilaritySql(
            standardizeAddressSql(`s.${sourceField}`), 
            standardizeAddressSql(`t.${targetField}`)
          )}
        END`;
        break;
        
      case 'date':
      case 'dateOfBirth':
        similarityExpr = `CASE 
          WHEN SAFE_CAST(s.${sourceField} AS DATE) = SAFE_CAST(t.${targetField} AS DATE) THEN 1.0
          WHEN EXTRACT(YEAR FROM SAFE_CAST(s.${sourceField} AS DATE)) = 
               EXTRACT(YEAR FROM SAFE_CAST(t.${targetField} AS DATE)) 
            AND EXTRACT(MONTH FROM SAFE_CAST(s.${sourceField} AS DATE)) = 
                EXTRACT(MONTH FROM SAFE_CAST(t.${targetField} AS DATE)) THEN 0.8
          WHEN EXTRACT(YEAR FROM SAFE_CAST(s.${sourceField} AS DATE)) = 
               EXTRACT(YEAR FROM SAFE_CAST(t.${targetField} AS DATE)) THEN 0.4
          ELSE 0.0 
        END`;
        break;
        
      default:
        similarityExpr = `CASE 
          WHEN LOWER(TRIM(s.${sourceField})) = LOWER(TRIM(t.${targetField})) THEN 1.0
          ELSE ${levenshteinSimilaritySql(`s.${sourceField}`, `t.${targetField}`)}
        END`;
    }
    
    return {
      expression: similarityExpr,
      field: sourceField,
      weight,
      type
    };
  });
  
  // Generate blocking condition if specified
  let blockingCondition = '';
  if (options.blocking) {
    const { field, method } = options.blocking;
    if (field && method) {
      // Use blocking key SQL to create a blocking condition
      const sourceBlockingKey = blockingKeySql(`s.${field.source}`, method, options.blocking);
      const targetBlockingKey = blockingKeySql(`t.${field.target}`, method, options.blocking);
      
      blockingCondition = `
      WHERE ${sourceBlockingKey} = ${targetBlockingKey}
        AND ${sourceBlockingKey} IS NOT NULL
        AND ${targetBlockingKey} IS NOT NULL
      `;
    }
  }
  
  // Create the SQL for the weighted score calculation
  const weightsSum = fieldComparisons.reduce((sum, { weight }) => sum + weight, 0);
  
  const fieldCalculations = fieldComparisons.map(({ expression, field, weight }) => {
    return `${expression} * ${weight} as ${field}_score`;
  }).join(',\n      ');
  
  const weightedScoreExpr = fieldComparisons.map(({ field }) => {
    return `${field}_score`;
  }).join(' + ');
  
  // Build full SQL query for Dataform
  return `
    -- Calculate similarity scores for each field
    WITH field_scores AS (
      SELECT
        s.id as source_id,
        t.id as target_id,
        ${fieldCalculations}
      FROM \`{{ ref("${sourceTableRef}") }}\` s
      CROSS JOIN \`{{ ref("${targetTableRef}") }}\` t
      ${blockingCondition}
    ),
    
    -- Calculate overall match score
    match_scores AS (
      SELECT
        source_id,
        target_id,
        (${weightedScoreExpr}) / ${weightsSum} as confidence,
        ${fieldComparisons.map(({ field }) => `${field}_score`).join(',\n        ')}
      FROM field_scores
    ),
    
    -- Classify matches by confidence tier
    classified_matches AS (
      SELECT
        source_id,
        target_id,
        confidence,
        CASE
          WHEN confidence >= ${thresholds.high} THEN 'HIGH'
          WHEN confidence >= ${thresholds.medium} THEN 'MEDIUM'
          WHEN confidence >= ${thresholds.low} THEN 'LOW'
          ELSE 'NO_MATCH'
        END as tier,
        ${fieldComparisons.map(({ field }) => `${field}_score`).join(',\n        ')}
      FROM match_scores
    )
    
    -- Return only valid matches above minimum threshold
    SELECT * FROM classified_matches
    WHERE tier != 'NO_MATCH'
    ORDER BY confidence DESC
  `;
}

module.exports = {
  levenshteinSimilaritySql,
  jaroWinklerSimilaritySql,
  stringSimilaritySql,
  blockingKeySql,
  standardizeAddressSql,
  generateMatchingPipeline
}; 