-- definitions/rule_engine/match_functions.sqlx
config {
  type: "operations",
  description: "Defines standardization and similarity functions for the rule engine",
  tags: ["record_linkage", "rule_engine"]
}

-- Import all standardization and similarity functions from the rule engine
${util.rule_engine.generateFunctionDefinitions()}

-- definitions/rule_engine/rule_based_matcher.sqlx
config {
  type: "table",
  description: "Implements the rule-based matcher using the declarative rule engine",
  bigquery: {
    partitionBy: "TIMESTAMP_TRUNC(execution_date, DAY)",
    clusterBy: ["customer_id", "match_strategy"]
  },
  tags: ["record_linkage", "rule_engine", "matcher"],
  assertions: {
    uniqueKey: ["execution_id", "customer_id", "record_id"],
    nonNull: ["execution_id", "customer_id", "record_id"]
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

-- Efficiently generate blocking pairs to reduce comparison space
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

-- Apply the rule engine to generate matches with confidence scores
rule_evaluations AS (
  SELECT
    bp.source_customer_id,
    bp.source_record_id,
    bp.target_customer_id,
    bp.target_record_id,
    -- Calculate confidence scores using the rule engine
    ${util.rule_engine.generateWaterfallSql("s", "t")}
  FROM blocking_pairs bp
  JOIN source_data s 
    ON bp.source_customer_id = s.customer_id 
    AND bp.source_record_id = s.record_id
  JOIN target_data t 
    ON bp.target_customer_id = t.customer_id 
    AND bp.target_record_id = t.record_id
),

-- Select only records that matched with any strategy
matches AS (
  SELECT *
  FROM rule_evaluations
  WHERE match_strategy != 'NO_MATCH'
),

-- If match rate is below target, try matching against historical data
-- This recursive approach implements the historical matching logic
match_with_history AS (
  SELECT
    source_customer_id,
    source_record_id,
    target_customer_id, 
    target_record_id,
    final_confidence,
    match_strategy,
    confidence_details,
    -- Flag as primary match
    TRUE AS is_primary_match
  FROM matches
  
  UNION ALL
  
  -- Only execute this part if primary match rate is below target
  SELECT
    s.customer_id AS source_customer_id,
    s.record_id AS source_record_id,
    h.target_customer_id,
    h.target_record_id,
    h.confidence_score AS final_confidence,
    'HISTORICAL_MATCH' AS match_strategy,
    STRUCT(
      0.0 AS deterministic_confidence,
      0.0 AS rule_based_confidence,
      0.0 AS probabilistic_confidence
    ) AS confidence_details,
    FALSE AS is_primary_match
  FROM source_data s
  -- Left anti-join to exclude already matched records
  LEFT JOIN (
    SELECT DISTINCT source_record_id 
    FROM matches
  ) m ON s.record_id = m.source_record_id
  -- Only include records that haven't matched yet
  WHERE m.source_record_id IS NULL
  -- Join to historical matches
  JOIN ${ref("historical.quarterly_matches")} h
    ON (
      -- Match on standardized identifiers between source and historical source
      ${self()}.standardize_name(h.source_first_name) = ${self()}.standardize_name(s.FirstName) AND
      ${self()}.standardize_name(h.source_last_name) = ${self()}.standardize_name(s.LastName) AND
      (
        -- Plus one of these additional identifiers
        h.source_dob = s.DateOfBirth OR
        h.source_email = s.EmailAddress OR
        ${self()}.standardize_phone(h.source_phone) = ${self()}.standardize_phone(s.PhoneNumber)
      )
    )
  WHERE 
    -- Only use historical matching if primary match rate is below target
    (SELECT COUNT(DISTINCT source_record_id) FROM matches) / 
    (SELECT COUNT(*) FROM source_data) < 0.85
    -- Only use historical matches with sufficient confidence
    AND h.confidence_score >= 0.85
),

-- Take the best match per source record
best_matches AS (
  SELECT *
  FROM (
    SELECT
      *,
      ROW_NUMBER() OVER (
        PARTITION BY source_customer_id, source_record_id
        ORDER BY final_confidence DESC, is_primary_match DESC
      ) AS match_rank
    FROM match_with_history
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
  match_strategy,
  final_confidence AS confidence_score,
  confidence_details,
  is_primary_match,
  -- Add match statistics for monitoring
  (SELECT COUNT(*) FROM source_data) AS total_source_records,
  (SELECT COUNT(*) FROM target_data) AS total_target_records,
  (SELECT COUNT(DISTINCT source_record_id) FROM match_with_history) AS total_matched_records,
  ROUND((SELECT COUNT(DISTINCT source_record_id) FROM match_with_history) / 
        (SELECT COUNT(*) FROM source_data), 4) AS match_rate
FROM best_matches

/* 
 * BigQuery optimization hints to minimize bytes processed
 * Critical for petabyte-scale efficiency
 */
OPTIONS(
  optimize_join_computation_cost = TRUE,
  inference_mode = TRUE, -- Use cached statistics
  require_partition_filter = TRUE
)
