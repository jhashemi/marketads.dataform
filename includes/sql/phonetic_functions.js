/**
 * Phonetic Functions for BigQuery
 * 
 * This module provides SQL implementations of phonetic algorithms
 * using BigQuery's native SQL capabilities.
 */

/**
 * Generates a SQL function for Soundex in BigQuery
 * @returns {string} SQL for Soundex function
 */
function createSoundexFunction() {
  // BigQuery has a built-in SOUNDEX function
  return `
    CREATE TEMP FUNCTION IF NOT EXISTS my_soundex(input STRING) AS (
      SOUNDEX(input)
    );
  `;
}

/**
 * Generates a SQL function for Double Metaphone in BigQuery
 * This is a simplified implementation since full Double Metaphone is complex
 * @returns {string} SQL for a simplified Double Metaphone implementation
 */
function createDoubleMetaphoneFunction() {
  return `
    -- A simplified Double Metaphone implementation in SQL
    -- Note: This is not a full implementation but captures key patterns
    CREATE TEMP FUNCTION IF NOT EXISTS double_metaphone(input STRING) AS ((
      WITH input_normalized AS (
        SELECT UPPER(TRIM(input)) as str
      ),
      
      -- First pass: Remove non-alphabetic characters and doubles except 'C'
      cleaned AS (
        SELECT 
          REGEXP_REPLACE(str, '[^A-Z]', '') as text,
          '' as result
        FROM input_normalized
      ),
      
      -- Define common transformations
      -- This is a simplified version of double metaphone
      transformations AS (
        SELECT
          text,
          -- Handle common phonetic patterns
          REGEXP_REPLACE(text, 'PH', 'F') as text1,
          result
        FROM cleaned
      ),
      
      -- Apply more transformations
      transform2 AS (
        SELECT
          text,
          REGEXP_REPLACE(text1, '(SCH|SH|CH)', 'X') as text2,
          result
        FROM transformations
      ),
      
      transform3 AS (
        SELECT
          text,
          REGEXP_REPLACE(text2, '(DG|GH)', 'K') as text3,
          result
        FROM transform2
      ),
      
      transform4 AS (
        SELECT
          text,
          REGEXP_REPLACE(text3, 'CK', 'K') as text4,
          result
        FROM transform3
      ),
      
      transform5 AS (
        SELECT
          text,
          REGEXP_REPLACE(text4, 'WR', 'R') as text5,
          result
        FROM transform4
      ),
      
      transform6 AS (
        SELECT
          text,
          REGEXP_REPLACE(text5, 'NC', 'NK') as text6,
          result
        FROM transform5
      ),
      
      -- Remove vowels except at the beginning
      vowels_removed AS (
        SELECT
          text,
          REGEXP_REPLACE(
            CASE
              WHEN LENGTH(text6) > 0 THEN 
                CONCAT(
                  SUBSTR(text6, 1, 1),
                  REGEXP_REPLACE(SUBSTR(text6, 2), '[AEIOUY]', '')
                )
              ELSE text6
            END,
            '(.)\1+', '\1'  -- Remove consecutive duplicates
          ) as metaphone
        FROM transform6
      )
      
      -- Return the first 4 characters, padded if needed
      SELECT
        CASE
          WHEN LENGTH(metaphone) >= 4 THEN SUBSTR(metaphone, 1, 4)
          ELSE RPAD(metaphone, 4, '0')
        END
      FROM vowels_removed
    ));
  `;
}

/**
 * Generates SQL for a custom metaphone-like function in BigQuery
 * @returns {string} SQL for metaphone function
 */
function createMetaphoneFunction() {
  return `
    CREATE TEMP FUNCTION IF NOT EXISTS metaphone(input STRING) AS ((
      WITH input_normalized AS (
        SELECT UPPER(TRIM(input)) as str
      ),
      
      -- First pass: Remove non-alphabetic characters
      cleaned AS (
        SELECT REGEXP_REPLACE(str, '[^A-Z]', '') as text
        FROM input_normalized
      ),
      
      -- Apply key transformations for Metaphone
      transform1 AS (
        SELECT 
          -- Initial transformations
          REGEXP_REPLACE(text, 'PH', 'F') as text
        FROM cleaned
      ),
      
      transform2 AS (
        SELECT 
          REGEXP_REPLACE(text, '[AEIOUWHYaeiouwhy]', '') as text
        FROM transform1
      ),
      
      transform3 AS (
        SELECT 
          REGEXP_REPLACE(text, '[bfpv]', 'B') as text
        FROM transform2
      ),
      
      transform4 AS (
        SELECT 
          REGEXP_REPLACE(text, '[cgjkqsxz]', 'K') as text
        FROM transform3
      ),
      
      transform5 AS (
        SELECT 
          REGEXP_REPLACE(text, '[dt]', 'T') as text
        FROM transform4
      ),
      
      transform6 AS (
        SELECT 
          REGEXP_REPLACE(text, '[l]', 'L') as text
        FROM transform5
      ),
      
      transform7 AS (
        SELECT 
          REGEXP_REPLACE(text, '[mn]', 'M') as text
        FROM transform6
      ),
      
      transform8 AS (
        SELECT 
          REGEXP_REPLACE(text, '[r]', 'R') as text
        FROM transform7
      ),
      
      -- Remove duplicates
      final_transform AS (
        SELECT
          REGEXP_REPLACE(text, '(.)\1+', '\1') as metaphone
        FROM transform8
      )
      
      -- Return result, limit to 6 characters
      SELECT SUBSTR(metaphone, 1, 6)
      FROM final_transform
    ));
  `;
}

/**
 * Generates SQL for creating a NYSIIS function in BigQuery
 * @returns {string} SQL for a simplified NYSIIS implementation
 */
function createNysiisFunction() {
  return `
    CREATE TEMP FUNCTION IF NOT EXISTS nysiis(input STRING) AS ((
      WITH input_normalized AS (
        SELECT UPPER(TRIM(input)) as str
      ),
      
      -- First pass: Remove non-alphabetic characters
      cleaned AS (
        SELECT REGEXP_REPLACE(str, '[^A-Z]', '') as text
        FROM input_normalized
      ),
      
      -- Step 1: Translate first characters
      step1 AS (
        SELECT
          CASE
            WHEN STARTS_WITH(text, 'MAC') THEN CONCAT('MCC', SUBSTR(text, 4))
            WHEN STARTS_WITH(text, 'KN') THEN CONCAT('NN', SUBSTR(text, 3))
            WHEN STARTS_WITH(text, 'K') THEN CONCAT('C', SUBSTR(text, 2))
            WHEN STARTS_WITH(text, 'PH') THEN CONCAT('FF', SUBSTR(text, 3))
            WHEN STARTS_WITH(text, 'PF') THEN CONCAT('FF', SUBSTR(text, 3))
            WHEN STARTS_WITH(text, 'SCH') THEN CONCAT('SSS', SUBSTR(text, 4))
            ELSE text
          END as text
        FROM cleaned
      ),
      
      -- Step 2: Translate last characters
      step2 AS (
        SELECT
          CASE
            WHEN ENDS_WITH(text, 'EE') THEN SUBSTR(text, 1, LENGTH(text) - 2) || 'Y'
            WHEN ENDS_WITH(text, 'IE') THEN SUBSTR(text, 1, LENGTH(text) - 2) || 'Y'
            WHEN ENDS_WITH(text, 'DT') THEN SUBSTR(text, 1, LENGTH(text) - 2) || 'D'
            WHEN ENDS_WITH(text, 'RT') THEN SUBSTR(text, 1, LENGTH(text) - 2) || 'D'
            WHEN ENDS_WITH(text, 'RD') THEN SUBSTR(text, 1, LENGTH(text) - 2) || 'D'
            WHEN ENDS_WITH(text, 'NT') THEN SUBSTR(text, 1, LENGTH(text) - 2) || 'D'
            WHEN ENDS_WITH(text, 'ND') THEN SUBSTR(text, 1, LENGTH(text) - 2) || 'D'
            ELSE text
          END as text
        FROM step1
      ),
      
      -- Step 3: First character of key = first character of name
      step3 AS (
        SELECT
          CASE
            WHEN LENGTH(text) > 0 THEN SUBSTR(text, 1, 1)
            ELSE ''
          END as first_char,
          CASE
            WHEN LENGTH(text) > 1 THEN SUBSTR(text, 2)
            ELSE ''
          END as rest
        FROM step2
      ),
      
      -- Step 4: Replace characters
      step4 AS (
        SELECT
          first_char,
          REGEXP_REPLACE(rest, 'EV', 'AF') as rest
        FROM step3
      ),
      
      step5 AS (
        SELECT
          first_char,
          REGEXP_REPLACE(rest, '[AEIOU]', 'A') as rest
        FROM step4
      ),
      
      step6 AS (
        SELECT
          first_char,
          REGEXP_REPLACE(rest, 'Q', 'G') as rest
        FROM step5
      ),
      
      step7 AS (
        SELECT
          first_char,
          REGEXP_REPLACE(rest, 'Z', 'S') as rest
        FROM step6
      ),
      
      step8 AS (
        SELECT
          first_char,
          REGEXP_REPLACE(rest, 'M', 'N') as rest
        FROM step7
      ),
      
      step9 AS (
        SELECT
          first_char,
          REGEXP_REPLACE(rest, 'KN', 'N') as rest
        FROM step8
      ),
      
      step10 AS (
        SELECT
          first_char,
          REGEXP_REPLACE(rest, 'K', 'C') as rest
        FROM step9
      ),
      
      -- Step 11: Remove duplicates
      step11 AS (
        SELECT
          first_char,
          REGEXP_REPLACE(rest, '(.)\1+', '\1') as rest
        FROM step10
      ),
      
      -- Final: Combine and return
      combined AS (
        SELECT
          CONCAT(first_char, rest) as nysiis
        FROM step11
      )
      
      -- Return the result, truncated to 6 chars
      SELECT SUBSTR(nysiis, 1, 6)
      FROM combined
    ));
  `;
}

/**
 * Generates SQL for a complete phonetic blocking pipeline
 * @param {string} tableRef - Reference to the table to process
 * @param {string} nameColumn - Name of the column containing names
 * @returns {string} SQL for generating phonetic blocking keys
 */
function generatePhoneticBlocking(tableRef, nameColumn) {
  return `
    -- First create the phonetic functions
    ${createSoundexFunction()}
    ${createMetaphoneFunction()}
    ${createDoubleMetaphoneFunction()}
    ${createNysiisFunction()}
    
    -- Then generate the blocking keys
    WITH name_parts AS (
      SELECT
        id,
        ${nameColumn} as full_name,
        -- Get first token (typically first name)
        ARRAY_TO_STRING(ARRAY(
          SELECT part 
          FROM UNNEST(SPLIT(TRIM(${nameColumn}), ' ')) AS part
          WITH OFFSET pos
          WHERE pos = 0
        ), '') as first_token,
        -- Get last token (typically last name)
        ARRAY_TO_STRING(ARRAY(
          SELECT part
          FROM UNNEST(SPLIT(TRIM(${nameColumn}), ' ')) AS part
          WITH OFFSET pos
          ORDER BY pos DESC
          LIMIT 1
        ), '') as last_token
      FROM \`{{ ref("${tableRef}") }}\`
    ),
    
    -- Generate phonetic codes for blocking
    phonetic_keys AS (
      SELECT
        id,
        full_name,
        -- Native Soundex
        SOUNDEX(first_token) as soundex_first,
        SOUNDEX(last_token) as soundex_last,
        -- Custom Metaphone
        metaphone(first_token) as metaphone_first,
        metaphone(last_token) as metaphone_last,
        -- Double Metaphone approximation
        double_metaphone(first_token) as dm_first,
        double_metaphone(last_token) as dm_last,
        -- NYSIIS approximation
        nysiis(first_token) as nysiis_first,
        nysiis(last_token) as nysiis_last
      FROM name_parts
    )
    
    -- Output all the blocking keys
    SELECT 
      id,
      full_name,
      CONCAT('SDX1_', soundex_first) as blocking_key
    FROM phonetic_keys
    UNION ALL
    SELECT 
      id,
      full_name,
      CONCAT('SDXL_', soundex_last) as blocking_key
    FROM phonetic_keys
    UNION ALL
    SELECT 
      id,
      full_name,
      CONCAT('MPH1_', metaphone_first) as blocking_key
    FROM phonetic_keys
    UNION ALL
    SELECT 
      id,
      full_name,
      CONCAT('MPHL_', metaphone_last) as blocking_key
    FROM phonetic_keys
    UNION ALL
    SELECT 
      id,
      full_name,
      CONCAT('DM1_', dm_first) as blocking_key
    FROM phonetic_keys
    UNION ALL
    SELECT 
      id,
      full_name,
      CONCAT('DML_', dm_last) as blocking_key
    FROM phonetic_keys
    UNION ALL
    SELECT 
      id,
      full_name,
      CONCAT('NYS1_', nysiis_first) as blocking_key
    FROM phonetic_keys
    UNION ALL
    SELECT 
      id,
      full_name,
      CONCAT('NYSL_', nysiis_last) as blocking_key
    FROM phonetic_keys
  `;
}

module.exports = {
  createSoundexFunction,
  createMetaphoneFunction,
  createDoubleMetaphoneFunction,
  createNysiisFunction,
  generatePhoneticBlocking
}; 