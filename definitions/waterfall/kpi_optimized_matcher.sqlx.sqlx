-- definitions/waterfall/kpi_optimized_matcher.sqlx
config {
  type: "table",
  description: "KPI-optimized waterfall matcher with historical dataset fallback",
  bigquery: {
    partitionBy: "TIMESTAMP_TRUNC(execution_date, DAY)",
    clusterBy: ["customer_id", "strategy_name", "h3_index_bucket"]
  },
  tags: ["record_linkage", "strategy_manager", "kpi_optimized"],
  assertions: {
    uniqueKey: ["execution_id", "customer_id", "record_id"],
    nonNull: ["execution_id", "customer_id", "record_id", "strategy_name"]
  }
}

-- Create geo matching functions
${util.historical_matcher.generateGeoFunctions()}

WITH 

-- Source data to be matched with geospatial indexing
source_data AS (
  SELECT 
    s.*,
    ${util.blocking_keys.generateAllKeys("s", ["zipcode", "name_zip", "phone", "name_dob", "email_prefix"])} AS blocking_keys,
    -- H3 indexing for geospatial matching
    CASE
      WHEN s.latitude IS NOT NULL AND s.longitude IS NOT NULL
      THEN ${util.geo.toH3IndexPartitionKey('s.latitude', 's.longitude', 13)}
      ELSE NULL
    END AS h3_index,
    CASE
      WHEN s.latitude IS NOT NULL AND s.longitude IS NOT NULL
      THEN MOD(${util.geo.toH3IndexPartitionKey('s.latitude', 's.longitude', 13)}, 4000)
      ELSE NULL
    END AS h3_index_bucket
  FROM ${ref("customer_source_dataset")} s
  WHERE batch_date = ${when_partition_filter()}
),

-- Target customer data requiring enhancement
target_data AS (
  SELECT 
    t.*,
    ${util.blocking_keys.generateAllKeys("t", ["zipcode", "name_zip", "phone", "name_dob", "email_prefix"])} AS blocking_keys,
    -- H3 indexing for geospatial matching
    CASE
      WHEN t.latitude IS NOT NULL AND t.longitude IS NOT NULL
      THEN ${util.geo.toH3IndexPartitionKey('t.latitude', 't.longitude', 13)}
      ELSE NULL
    END AS h3_index,
    CASE
      WHEN t.latitude IS NOT NULL AND t.longitude IS NOT NULL
      THEN MOD(${util.geo.toH3IndexPartitionKey('t.latitude', 't.longitude', 13)}, 4000)
      ELSE NULL
    END AS h3_index_bucket
  FROM ${ref("customer_target_dataset")} t
  WHERE batch_date = ${when_partition_filter()}
),

-- Generate blocking pairs efficiently with early KPI-based termination
blocking_pairs AS (
  SELECT
    s.customer_id AS source_customer_id,
    s.record_id AS source_record_id, 
    t.customer_id AS target_customer_id,
    t.record_id AS target_record_id,
    blocking_key,
    s.h3_index AS source_h3_index,
    t.h3_index AS target_h3_index,
    s.h3_index_bucket,
    -- We'll treat geospatial matches differently
    CASE 
      WHEN s.h3_index IS NOT NULL AND t.h3_index IS NOT NULL
      THEN ${self()}.h3_proximity(s.h3_index, t.h3_index)
      ELSE FALSE
    END AS is_geo_match
  FROM 
    source_data s,
    UNNEST(s.blocking_keys) AS blocking_key
  JOIN (
    SELECT 
      t.customer_id,
      t.record_id,
      blocking_key,
      t.h3_index,
      t.h3_index_bucket
    FROM 
      target_data t,
      UNNEST(t.blocking_keys) AS blocking_key
  ) t
  ON s.blocking_key = t.blocking_key
  OR (s.h3_index_bucket = t.h3_index_bucket AND ${self()}.h3_proximity(s.h3_index, t.h3_index))
  GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9
),

-- Strategy 1: Exact Match (highest deterministic confidence)
exact_matches AS (
  SELECT
    bp.source_customer_id,
    bp.source_record_id,
    bp.target_customer_id,
    bp.target_record_id,
    'EXACT_MATCH' AS strategy_name,
    1.0 AS confidence_score,
    FALSE AS is_historical,
    STRUCT(
      TRUE AS exact_match,
      NULL AS standardized_match,
      NULL AS phonetic_match,
      NULL AS rule_based_match,
      NULL AS probabilistic_match,
      NULL AS historical_match,
      NULL AS geo_match
    ) AS match_details,
    bp.h3_index_bucket
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
      ${self()}.zip_match(s.ZipCode, t.ZipCode) AND
      s.DateOfBirth = t.DateOfBirth
    )
    OR
    -- Livingunitid exact match for address matching
    (s.livingunitid IS NOT NULL AND t.livingunitid IS NOT NULL AND s.livingunitid = t.livingunitid)
  GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9
),

-- Strategy 2: Standardized Match
standardized_matches AS (
  SELECT
    bp.source_customer_id,
    bp.source_record_id,
    bp.target_customer_id,
    bp.target_record_id,
    'STANDARDIZED_MATCH' AS strategy_name,
    0.95 AS confidence_score,
    FALSE AS is_historical,
    STRUCT(
      FALSE AS exact_match,
      TRUE AS standardized_match,
      NULL AS phonetic_match,
      NULL AS rule_based_match,
      NULL AS probabilistic_match,
      NULL AS historical_match,
      NULL AS geo_match
    ) AS match_details,
    bp.h3_index_bucket
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
      ${ref("standardization.standardize_address", {input: "s.primaryaddress"})} = ${ref("standardization.standardize_address", {input: "t.primaryaddress"})} AND
      UPPER(TRIM(s.cityname)) = UPPER(TRIM(t.cityname)) AND
      UPPER(TRIM(s.state)) = UPPER(TRIM(t.state))
    )
    OR
    -- Standardized email with fuzzy name match
    (
      ${ref("standardization.standardize_email", {input: "s.EmailAddress"})} = ${ref("standardization.standardize_email", {input: "t.EmailAddress"})} AND
      ${ref("confidence.name_similarity", {name1: "s.FirstName", name2: "t.FirstName"})} > 0.8 AND
      ${ref("confidence.name_similarity", {name1: "s.LastName", name2: "t.LastName"})} > 0.9
    )
  )
  GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9
),

-- Strategy 3: Geospatial Match (address proximity within threshold)
-- This is a new strategy specifically for address/geospatial matching
geo_matches AS (
  SELECT
    bp.source_customer_id,
    bp.source_record_id,
    bp.target_customer_id,
    bp.target_record_id,
    'GEOSPATIAL_MATCH' AS strategy_name,
    0.93 AS confidence_score,
    FALSE AS is_historical,
    STRUCT(
      FALSE AS exact_match,
      FALSE AS standardized_match,
      NULL AS phonetic_match,
      NULL AS rule_based_match,
      NULL AS probabilistic_match,
      NULL AS historical_match,
      TRUE AS geo_match
    ) AS match_details,
    bp.h3_index_bucket
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
  AND bp.is_geo_match = TRUE
  AND (
    -- Geospatial match with name similarity
    (
      ${ref("confidence.name_similarity", {name1: "s.FirstName", name2: "t.FirstName"})} > 0.7 AND
      ${ref("confidence.name_similarity", {name1: "s.LastName", name2: "t.LastName"})} > 0.8 AND
      ${self()}.geo_distance(s.latitude, s.longitude, t.latitude, t.longitude) < 0.1 -- ~100m
    )
    OR
    -- Very close geospatial match with partial name
    (
      (${ref("confidence.name_similarity", {name1: "s.LastName", name2: "t.LastName"})} > 0.9 OR
       ${ref("confidence.name_similarity", {name1: "s.FirstName", name2: "t.FirstName"})} > 0.9) AND
      ${self()}.geo_distance(s.latitude, s.longitude, t.latitude, t.longitude) < 0.03 -- ~30m
    )
  )
  GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9
),

-- Continue with other strategies (phonetic, rule-based, probabilistic)
-- ... existing strategy definitions ...

-- Combine all matches from primary strategies
primary_matches AS (
  SELECT * FROM exact_matches
  UNION ALL
  SELECT * FROM standardized_matches
  UNION ALL
  SELECT * FROM geo_matches
  -- UNION ALL with other strategies ...
),

-- Calculate current match rate for KPI evaluation
match_rate_assessment AS (
  SELECT
    COUNT(DISTINCT source_record_id) AS matched_records,
    (SELECT COUNT(*) FROM source_data) AS total_records,
    SAFE_DIVIDE(COUNT(DISTINCT source_record_id), (SELECT COUNT(*) FROM source_data)) AS current_match_rate
  FROM primary_matches
),

-- Take best primary match per source record
best_primary_matches AS (
  SELECT *
  FROM (
    SELECT
      *,
      ROW_NUMBER() OVER (
        PARTITION BY source_customer_id, source_record_id
        ORDER BY confidence_score DESC
      ) AS match_rank
    FROM primary_matches
  )
  WHERE match_rank = 1
),

-- Apply historical matching if KPI goal not achieved
${util.historical_matcher.generateHistoricalMatchSql("source_data", 
  "(SELECT current_match_rate FROM match_rate_assessment)")},

-- Combine primary and historical matches
all_matches AS (
  SELECT
    source_customer_id,
    source_record_id,
    target_customer_id, 
    target_record_id,
    strategy_name,
    confidence_score,
    is_historical,
    match_details,
    h3_index_bucket
  FROM best_primary_matches
  
  UNION ALL
  
  SELECT
    source_customer_id,
    source_record_id,
    target_customer_id,
    target_record_id,
    'HISTORICAL_MATCH' AS strategy_name,
    adjusted_confidence AS confidence_score,
    TRUE AS is_historical,
    STRUCT(
      FALSE AS exact_match,
      FALSE AS standardized_match,
      FALSE AS phonetic_match,
      FALSE AS rule_based_match,
      FALSE AS probabilistic_match,
      TRUE AS historical_match,
      FALSE AS geo_match
    ) AS match_details,
    NULL AS h3_index_bucket
  FROM best_historical_matches
),

-- Take the highest confidence match for each source record
best_matches AS (
  SELECT *
  FROM (
    SELECT
      *,
      ROW_NUMBER() OVER (
        PARTITION BY source_customer_id, source_record_id
        ORDER BY confidence_score DESC, is_historical ASC
      ) AS match_rank
    FROM all_matches
  )
  WHERE match_rank = 1
),

-- Generate KPI statistics
${util.historical_matcher.generateKpiMonitoringSql()}

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
  is_historical,
  match_details,
  h3_index_bucket,
  -- Include KPI metrics in output
  (SELECT kpi_goal_achieved FROM kpi_stats) AS kpi_goal_achieved,
  (SELECT overall_match_rate FROM kpi_stats) AS overall_match_rate,
  (SELECT target_match_rate FROM kpi_stats) AS target_match_rate
FROM best_matches

/* 
 * BigQuery optimization hints for petabyte-scale efficiency
 */
OPTIONS(
  require_partition_filter = TRUE,
  optimize_join_computation_cost = TRUE
)
