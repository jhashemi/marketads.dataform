-- definitions/waterfall/strategy_manager.sqlx
config {
  type: "table",
  description: "Implements the waterfall strategy manager for record linkage",
  bigquery: {
    partitionBy: "TIMESTAMP_TRUNC(execution_date, DAY)",
    clusterBy: ["customer_id", "strategy_name"]
  },
  tags: ["record_linkage", "strategy_manager"],
  assertions: {
    uniqueKey: ["execution_id", "customer_id", "record_id"],
    nonNull: ["execution_id", "customer_id", "record_id", "strategy_name"]
  }
}

WITH 

-- Source data to be matched
source_data AS (
  SELECT 
    s.*,
    ${util.blocking_keys.generateAllKeys("s", ["zipcode", "name_zip", "phone", "name_dob", "email_prefix"])} AS blocking_keys
  FROM ${ref("customer_source_dataset")} s
  WHERE batch_date = ${when_partition_filter()}
),

-- Target customer data requiring enhancement
target_data AS (
  SELECT 
    t.*,
    ${util.blocking_keys.generateAllKeys("t", ["zipcode", "name_zip", "phone", "name_dob", "email_prefix"])} AS blocking_keys
  FROM ${ref("customer_target_dataset")} t
  WHERE batch_date = ${when_partition_filter()}
),

-- Generate blocking pairs to efficiently narrow comparison space
-- This dramatically reduces the number of comparisons needed
blocking_pairs AS (
  SELECT
    s.customer_id AS source_customer_id,
    s.record_id AS source_record_id, 
    t.customer_id AS target_customer_id,
    t.record_id AS target_record_id,
    blocking_key
  FROM 
    source_data s,
    UNNEST(s.blocking_keys) AS blocking_key
  JOIN (
    SELECT 
      t.customer_id,
      t.record_id,
      blocking_key
    FROM 
      target_data t,
      UNNEST(t.blocking_keys) AS blocking_key
  ) t
  ON s.blocking_key = t.blocking_key
  GROUP BY 1, 2, 3, 4, 5
),

-- Strategy 1: Exact Match
-- Most deterministic approach with highest confidence
exact_matches AS (
  SELECT
    bp.source_customer_id,
    bp.source_record_id,
    bp.target_customer_id,
    bp.target_record_id,
    'EXACT_MATCH' AS strategy_name,
    1.0 AS confidence_score,
    STRUCT(
      TRUE AS exact_match,
      NULL AS standardized_match,
      NULL AS phonetic_match,
      NULL AS rule_based_match,
      NULL AS probabilistic_match
    ) AS match_details
  FROM blocking_pairs bp
  JOIN source_data s ON bp.source_customer_id = s.customer_id AND bp.source_record_id = s.record_id
  JOIN target_data t ON bp.target_customer_id = t.customer_id AND bp.target_record_id = t.record_id
  WHERE
    -- Exact equality on critical identifier fields
    ((s.EmailAddress IS NOT NULL AND t.EmailAddress IS NOT NULL) AND LOWER(TRIM(s.EmailAddress)) = LOWER(TRIM(t.EmailAddress)))
    OR
    ((s.PhoneNumber IS NOT NULL AND t.PhoneNumber IS NOT NULL) AND 
     REGEXP_REPLACE(s.PhoneNumber, r'[^0-9]', '') = REGEXP_REPLACE(t.PhoneNumber, r'[^0-9]', ''))
    OR
    (
      (s.FirstName IS NOT NULL AND t.FirstName IS NOT NULL) AND 
      (s.LastName IS NOT NULL AND t.LastName IS NOT NULL) AND
      (s.ZipCode IS NOT NULL AND t.ZipCode IS NOT NULL) AND
      (s.DateOfBirth IS NOT NULL AND t.DateOfBirth IS NOT NULL) AND
      UPPER(TRIM(s.FirstName)) = UPPER(TRIM(t.FirstName)) AND
      UPPER(TRIM(s.LastName)) = UPPER(TRIM(t.LastName)) AND
      TRIM(s.ZipCode) = TRIM(t.ZipCode) AND
      s.DateOfBirth = t.DateOfBirth
    )
  GROUP BY 1, 2, 3, 4, 5, 6, 7
),

-- Strategy 2: Standardized Match
-- Match on standardized versions of fields to account for formatting differences
standardized_matches AS (
  SELECT
    bp.source_customer_id,
    bp.source_record_id,
    bp.target_customer_id,
    bp.target_record_id,
    'STANDARDIZED_MATCH' AS strategy_name,
    0.95 AS confidence_score,
    STRUCT(
      FALSE AS exact_match,
      TRUE AS standardized_match,
      NULL AS phonetic_match,
      NULL AS rule_based_match,
      NULL AS probabilistic_match
    ) AS match_details
  FROM blocking_pairs bp
  JOIN source_data s ON bp.source_customer_id = s.customer_id AND bp.source_record_id = s.record_id
  JOIN target_data t ON bp.target_customer_id = t.customer_id AND bp.target_record_id = t.record_id
  LEFT JOIN exact_matches em 
    ON bp.source_customer_id = em.source_customer_id 
    AND bp.source_record_id = em.source_record_id
    AND bp.target_customer_id = em.target_customer_id
    AND bp.target_record_id = em.target_record_id
  WHERE em.source_record_id IS NULL
  AND (
    -- Standardized name + address match
    (
      ${ref("standardization.standardize_name", {input: "s.FirstName"})} = ${ref("standardization.standardize_name", {input: "t.FirstName"})} AND
      ${ref("standardization.standardize_name", {input: "s.LastName"})} = ${ref("standardization.standardize_name", {input: "t.LastName"})} AND
      ${ref("standardization.standardize_address", {input: "s.AddressLine1"})} = ${ref("standardization.standardize_address", {input: "t.AddressLine1"})} AND
      UPPER(TRIM(s.City)) = UPPER(TRIM(t.City)) AND
      UPPER(TRIM(s.State)) = UPPER(TRIM(t.State))
    )
    OR
    -- Standardized email with fuzzy name match
    (
      ${ref("standardization.standardize_email", {input: "s.EmailAddress"})} = ${ref("standardization.standardize_email", {input: "t.EmailAddress"})} AND
      ${ref("confidence.name_similarity", {name1: "s.FirstName", name2: "t.FirstName"})} > 0.8 AND
      ${ref("confidence.name_similarity", {name1: "s.LastName", name2: "t.LastName"})} > 0.9
    )
  )
  GROUP BY 1, 2, 3, 4, 5, 6, 7
),

-- Strategy 3: Phonetic Match
-- Match on phonetic encodings of names to handle spelling variations
phonetic_matches AS (
  SELECT
    bp.source_customer_id,
    bp.source_record_id,
    bp.target_customer_id,
    bp.target_record_id,
    'PHONETIC_MATCH' AS strategy_name,
    0.90 AS confidence_score,
    STRUCT(
      FALSE AS exact_match,
      FALSE AS standardized_match,
      TRUE AS phonetic_match,
      NULL AS rule_based_match,
      NULL AS probabilistic_match
    ) AS match_details
  FROM blocking_pairs bp
  JOIN source_data s ON bp.source_customer_id = s.customer_id AND bp.source_record_id = s.record_id
  JOIN target_data t ON bp.target_customer_id = t.customer_id AND bp.target_record_id = t.record_id
  LEFT JOIN exact_matches em 
    ON bp.source_customer_id = em.source_customer_id 
    AND bp.source_record_id = em.source_record_id
    AND bp.target_customer_id = em.target_customer_id
    AND bp.target_record_id = em.target_record_id
  LEFT JOIN standardized_matches sm
    ON bp.source_customer_id = sm.source_customer_id 
    AND bp.source_record_id = sm.source_record_id
    AND bp.target_customer_id = sm.target_customer_id
    AND bp.target_record_id = sm.target_record_id
  WHERE em.source_record_id IS NULL
  AND sm.source_record_id IS NULL
  AND (
    -- Phonetic name match with additional corroborating evidence
    (
      ${ref("phonetic.encode", {name: "s.FirstName", algorithm: "METAPHONE"})} = ${ref("phonetic.encode", {name: "t.FirstName", algorithm: "METAPHONE"})} AND
      ${ref("phonetic.encode", {name: "s.LastName", algorithm: "METAPHONE"})} = ${ref("phonetic.encode", {name: "t.LastName", algorithm: "METAPHONE"})} AND
      (
        -- Plus partial address match
        ${ref("confidence.address_similarity", {addr1: "s.AddressLine1", addr2: "t.AddressLine1"})} > 0.7 AND
        UPPER(TRIM(s.City)) = UPPER(TRIM(t.City)) AND
        UPPER(TRIM(s.State)) = UPPER(TRIM(t.State))
        OR
        -- Or matching date of birth and zip
        s.DateOfBirth = t.DateOfBirth AND
        SUBSTR(s.ZipCode, 1, 5) = SUBSTR(t.ZipCode, 1, 5)
      )
    )
  )
  GROUP BY 1, 2, 3, 4, 5, 6, 7
),

-- Strategy 4: Rule-Based Match
-- Custom rules based on domain knowledge
rule_based_matches AS (
  SELECT
    bp.source_customer_id,
    bp.source_record_id,
    bp.target_customer_id,
    bp.target_record_id,
    'RULE_BASED_MATCH' AS strategy_name,
    0.88 AS confidence_score,
    STRUCT(
      FALSE AS exact_match,
      FALSE AS standardized_match,
      FALSE AS phonetic_match,
      TRUE AS rule_based_match,
      NULL AS probabilistic_match
    ) AS match_details
  FROM blocking_pairs bp
  JOIN source_data s ON bp.source_customer_id = s.customer_id AND bp.source_record_id = s.record_id
  JOIN target_data t ON bp.target_customer_id = t.customer_id AND bp.target_record_id = t.record_id
  LEFT JOIN exact_matches em 
    ON bp.source_customer_id = em.source_customer_id 
    AND bp.source_record_id = em.source_record_id
    AND bp.target_customer_id = em.target_customer_id
    AND bp.target_record_id = em.target_record_id
  LEFT JOIN standardized_matches sm
    ON bp.source_customer_id = sm.source_customer_id 
    AND bp.source_record_id = sm.source_record_id
    AND bp.target_customer_id = sm.target_customer_id
    AND bp.target_record_id = sm.target_record_id
  LEFT JOIN phonetic_matches pm
    ON bp.source_customer_id = pm.source_customer_id 
    AND bp.source_record_id = pm.source_record_id
    AND bp.target_customer_id = pm.target_customer_id
    AND bp.target_record_id = pm.target_record_id
  WHERE em.source_record_id IS NULL
  AND sm.source_record_id IS NULL
  AND pm.source_record_id IS NULL
  AND (
    -- Rule 1: Last name + First initial + Full address
    (
      UPPER(TRIM(s.LastName)) = UPPER(TRIM(t.LastName)) AND
      SUBSTR(UPPER(TRIM(s.FirstName)), 1, 1) = SUBSTR(UPPER(TRIM(t.FirstName)), 1, 1) AND
      ${ref("standardization.standardize_address", {input: "s.AddressLine1"})} = ${ref("standardization.standardize_address", {input: "t.AddressLine1"})} AND
      UPPER(TRIM(s.City)) = UPPER(TRIM(t.City)) AND
      UPPER(TRIM(s.State)) = UPPER(TRIM(t.State)) AND
      SUBSTR(s.ZipCode, 1, 5) = SUBSTR(t.ZipCode, 1, 5)
    )
    OR
    -- Rule 2: Email username part match + Last name
    (
      SPLIT(LOWER(TRIM(s.EmailAddress)), '@')[OFFSET(0)] = SPLIT(LOWER(TRIM(t.EmailAddress)), '@')[OFFSET(0)] AND
      ${ref("confidence.name_similarity", {name1: "s.LastName", name2: "t.LastName"})} > 0.8
    )
    OR
    -- Rule 3: Phone number last 7 digits + First name
    (
      SUBSTR(REGEXP_REPLACE(s.PhoneNumber, r'[^0-9]', ''), -7) = SUBSTR(REGEXP_REPLACE(t.PhoneNumber, r'[^0-9]', ''), -7) AND
      ${ref("confidence.name_similarity", {name1: "s.FirstName", name2: "t.FirstName"})} > 0.8
    )
  )
  GROUP BY 1, 2, 3, 4, 5, 6, 7
),

-- Strategy 5: Probabilistic Match
-- Weighted scoring of multiple fields
probabilistic_matches AS (
  SELECT
    bp.source_customer_id,
    bp.source_record_id,
    bp.target_customer_id,
    bp.target_record_id,
    'PROBABILISTIC_MATCH' AS strategy_name,
    confidence_score,
    STRUCT(
      FALSE AS exact_match,
      FALSE AS standardized_match,
      FALSE AS phonetic_match,
      FALSE AS rule_based_match,
      TRUE AS probabilistic_match
    ) AS match_details
  FROM blocking_pairs bp
  JOIN source_data s ON bp.source_customer_id = s.customer_id AND bp.source_record_id = s.record_id
  JOIN target_data t ON bp.target_customer_id = t.customer_id AND bp.target_record_id = t.record_id
  LEFT JOIN exact_matches em 
    ON bp.source_customer_id = em.source_customer_id 
    AND bp.source_record_id = em.source_record_id
    AND bp.target_customer_id = em.target_customer_id
    AND bp.target_record_id = em.target_record_id
  LEFT JOIN standardized_matches sm
    ON bp.source_customer_id = sm.source_customer_id 
    AND bp.source_record_id = sm.source_record_id
    AND bp.target_customer_id = sm.target_customer_id
    AND bp.target_record_id = sm.target_record_id
  LEFT JOIN phonetic_matches pm
    ON bp.source_customer_id = pm.source_customer_id 
    AND bp.source_record_id = pm.source_record_id
    AND bp.target_customer_id = pm.target_customer_id
    AND bp.target_record_id = pm.target_record_id
  LEFT JOIN rule_based_matches rm
    ON bp.source_customer_id = rm.source_customer_id 
    AND bp.source_record_id = rm.source_record_id
    AND bp.target_customer_id = rm.target_customer_id
    AND bp.target_record_id = rm.target_record_id
  CROSS JOIN (
    SELECT ${ref("confidence.calculate_weighted_score", {
      source: "s",
      target: "t",
      weights: `STRUCT(
        0.25 AS FirstName,
        0.25 AS LastName,
        0.20 AS AddressLine1,
        0.05 AS City,
        0.05 AS State,
        0.10 AS ZipCode,
        0.05 AS DateOfBirth,
        0.05 AS PhoneNumber
      )`
    })} AS confidence_score
  )
  WHERE em.source_record_id IS NULL
  AND sm.source_record_id IS NULL
  AND pm.source_record_id IS NULL
  AND rm.source_record_id IS NULL
  AND confidence_score >= 0.85  -- Confidence threshold from requirements
  GROUP BY 1, 2, 3, 4, 5, 6, 7
),

-- Strategy 6: Historical Match
-- Try to match against previously matched records in quarterly revision datasets
historical_matches AS (
  SELECT
    bp.source_customer_id,
    bp.source_record_id,
    bp.target_customer_id,
    bp.target_record_id,
    'HISTORICAL_MATCH' AS strategy_name,
    h.confidence_score,
    STRUCT(
      FALSE AS exact_match,
      FALSE AS standardized_match,
      FALSE AS phonetic_match,
      FALSE AS rule_based_match,
      FALSE AS probabilistic_match
    ) AS match_details
  FROM blocking_pairs bp
  JOIN source_data s ON bp.source_customer_id = s.customer_id AND bp.source_record_id = s.record_id
  JOIN target_data t ON bp.target_customer_id = t.customer_id AND bp.target_record_id = t.record_id
  LEFT JOIN exact_matches em 
    ON bp.source_customer_id = em.source_customer_id 
    AND bp.source_record_id = em.source_record_id
    AND bp.target_customer_id = em.target_customer_id
    AND bp.target_record_id = em.target_record_id
  LEFT JOIN standardized_matches sm
    ON bp.source_customer_id = sm.source_customer_id 
    AND bp.source_record_id = sm.source_record_id
    AND bp.target_customer_id = sm.target_customer_id
    AND bp.target_record_id = sm.target_record_id
  LEFT JOIN phonetic_matches pm
    ON bp.source_customer_id = pm.source_customer_id 
    AND bp.source_record_id = pm.source_record_id
    AND bp.target_customer_id = pm.target_customer_id
    AND bp.target_record_id = pm.target_record_id
  LEFT JOIN rule_based_matches rm
    ON bp.source_customer_id = rm.source_customer_id 
    AND bp.source_record_id = rm.source_record_id
    AND bp.target_customer_id = rm.target_customer_id
    AND bp.target_record_id = rm.target_record_id
  LEFT JOIN probabilistic_matches pbm
    ON bp.source_customer_id = pbm.source_customer_id 
    AND bp.source_record_id = pbm.source_record_id
    AND bp.target_customer_id = pbm.target_customer_id
    AND bp.target_record_id = pbm.target_record_id
  -- Join to historical matches from previous quarters
  JOIN ${ref("historical.quarterly_matches")} h
    ON (
      -- Match on source identifier to historical record
      h.source_customer_id = s.customer_id OR
      h.source_record_id = s.IndividualId OR
      
      -- Match on standardized personal identifiers
      (
        ${ref("standardization.standardize_name", {input: "h.FirstName"})} = ${ref("standardization.standardize_name", {input: "s.FirstName"})} AND
        ${ref("standardization.standardize_name", {input: "h.LastName"})} = ${ref("standardization.standardize_name", {input: "s.LastName"})} AND
        h.DateOfBirth = s.DateOfBirth
      ) OR
      
      -- Match on contact information
      h.EmailAddress = s.EmailAddress OR
      ${ref("standardization.standardize_phone", {input: "h.PhoneNumber"})} = ${ref("standardization.standardize_phone", {input: "s.PhoneNumber"})}
    )
    AND (
      -- Match target record to historical matched target
      h.target_customer_id = t.customer_id OR
      h.target_record_id = t.IndividualId
    )
  WHERE em.source_record_id IS NULL
  AND sm.source_record_id IS NULL
  AND pm.source_record_id IS NULL
  AND rm.source_record_id IS NULL
  AND pbm.source_record_id IS NULL
  AND h.confidence_score >= 0.85  -- Maintain confidence threshold
  GROUP BY 1, 2, 3, 4, 5, 6, 7
),

-- Combine all matches in order of waterfall strategy
all_matches AS (
  SELECT * FROM exact_matches
  UNION ALL
  SELECT * FROM standardized_matches
  UNION ALL
  SELECT * FROM phonetic_matches
  UNION ALL
  SELECT * FROM rule_based_matches
  UNION ALL
  SELECT * FROM probabilistic_matches
  UNION ALL
  SELECT * FROM historical_matches
),

-- Take only the highest-confidence match per source record
best_matches AS (
  SELECT *
  FROM (
    SELECT
      *,
      ROW_NUMBER() OVER (
        PARTITION BY source_customer_id, source_record_id
        ORDER BY confidence_score DESC
      ) AS match_rank
    FROM all_matches
  )
  WHERE match_rank = 1
)

-- Final output with execution metadata
SELECT
  ${util.execution_id()} AS execution_id,
  CURRENT_TIMESTAMP() AS execution_date,
  source_customer_id AS customer_id,
  source_record_id AS record_id,
  target_customer_id,
  target_record_id,
  strategy_name,
  confidence_score,
  match_details,
  -- Add match statistics for monitoring
  (SELECT COUNT(*) FROM source_data) AS total_source_records,
  (SELECT COUNT(*) FROM target_data) AS total_target_records,
  (SELECT COUNT(DISTINCT source_record_id) FROM all_matches) AS total_matched_records,
  ROUND((SELECT COUNT(DISTINCT source_record_id) FROM all_matches) / 
        (SELECT COUNT(*) FROM source_data), 4) AS match_rate
FROM best_matches
