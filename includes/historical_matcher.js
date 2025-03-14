// includes/historical_matcher.js
/**
 * Enhanced historical matcher that implements:
 * 1. Multi-dataset historical matching
 * 2. KPI-driven optimization with early pushdown
 * 3. Geospatial matching capabilities
 * 4. Progressive confidence scoring
 */

const historicalMatcher = {
  /**
   * Configuration for KPI targets and thresholds
   */
  kpiConfig: {
    targetMatchRate: 0.90, // Overall target match rate (KPI goal)
    confidenceThreshold: 0.85, // Minimum acceptable confidence
    matchRateCheckpoint: 0.70, // Checkpoint to activate additional strategies
    earlyTerminationThreshold: 0.95 // Terminate early if match rate exceeds this
  },

  /**
   * Generates SQL that looks up historical datasets in prioritized order
   * @param {string} sourceAlias - Source table alias
   * @param {string} checkpointRate - SQL expression that calculates current match rate
   * @returns {string} SQL for historical matching
   */
  generateHistoricalMatchSql(sourceAlias, checkpointRate) {
    // Define datasets in priority order (newest to oldest, gold/normalized first)
    const historicalDatasets = [
      // Gold/normalized datasets (highest quality)
      { table: "trustfinancial.consumer2022q4_voter_gold", quality: 0.95, weightMultiplier: 1.0 },
      { table: "trustfinancial.consumer2022_q2_gold", quality: 0.93, weightMultiplier: 1.0 },
      { table: "trustfinancial.consumer2022q4_voter_normalized", quality: 0.90, weightMultiplier: 0.98 },
      
      // Regular datasets in reverse chronological order
      { table: "trustfinancial.ConsumerQ1_2023", quality: 0.92, weightMultiplier: 0.97 },
      { table: "trustfinancial.consumer2022_q4", quality: 0.88, weightMultiplier: 0.95 },
      { table: "trustfinancial.consumer2022q4_voter", quality: 0.87, weightMultiplier: 0.94 },
      { table: "trustfinancial.Consumer2022_q2", quality: 0.85, weightMultiplier: 0.92 },
      { table: "trustfinancial.Consumer2022q2", quality: 0.85, weightMultiplier: 0.92 },
      { table: "trustfinancial.consumer2021q3_2", quality: 0.83, weightMultiplier: 0.90 },
      { table: "trustfinancial.consumer2021q3", quality: 0.83, weightMultiplier: 0.90 },
      { table: "trustfinancial.Consumer_2021_q3", quality: 0.83, weightMultiplier: 0.90 },
      { table: "trustfinancial.Consumer_2021_Q1_final", quality: 0.80, weightMultiplier: 0.88 },
      { table: "trustfinancial.Consumer_2021_Q1_fix", quality: 0.80, weightMultiplier: 0.88 },
      { table: "trustfinancial.Consumer_Q4_fix", quality: 0.78, weightMultiplier: 0.86 },
      { table: "trustfinancial.Consumer_Q4", quality: 0.75, weightMultiplier: 0.85 }
    ];

    // Generate the SQL for historical matching with early termination
    let historicalSql = `
      -- KPI-driven historical matching with pushdown optimization
      WITH match_kpi_evaluation AS (
        SELECT
          ${checkpointRate} AS current_match_rate,
          ${this.kpiConfig.targetMatchRate} AS target_match_rate,
          ${this.kpiConfig.confidenceThreshold} AS min_confidence,
          ${this.kpiConfig.matchRateCheckpoint} AS checkpoint_rate,
          ${this.kpiConfig.earlyTerminationThreshold} AS early_termination_rate
      ),
      
      -- Only proceed with historical matching if we're below checkpoint
      proceed_with_historical AS (
        SELECT current_match_rate < checkpoint_rate AS should_proceed
        FROM match_kpi_evaluation
      ),
      
      -- Unmatched source records needing a match
      unmatched_source AS (
        SELECT *
        FROM ${sourceAlias} s
        WHERE NOT EXISTS (
          SELECT 1 FROM best_matches bm
          WHERE bm.source_record_id = s.record_id
        )
        -- Early pushdown filter - only try historical matching if we're short of goal
        AND (SELECT should_proceed FROM proceed_with_historical)
      )`;

    // Generate separate CTE for each historical dataset with progressive termination
    historicalDatasets.forEach((dataset, index) => {
      const datasetAlias = `hist_${index}`;
      const matchesAlias = `hist_matches_${index}`;
      
      historicalSql += `
      -- Historical dataset ${index + 1}: ${dataset.table}
      ${index > 0 ? ', ' : ''}${matchesAlias} AS (
        SELECT
          s.customer_id AS source_customer_id,
          s.record_id AS source_record_id,
          h.target_customer_id,
          h.target_record_id,
          h.confidence_score * ${dataset.weightMultiplier} AS adjusted_confidence,
          '${dataset.table}' AS historical_source
        FROM unmatched_source s
        -- Join to historical matches from this dataset
        JOIN ${dataset.table} h ON (
          -- Match on standardized personal identifiers
          (
            ${self()}.standardize_name(h.FirstName) = ${self()}.standardize_name(s.FirstName) AND
            ${self()}.standardize_name(h.LastName) = ${self()}.standardize_name(s.LastName)
          ) OR
          
          -- Match on address identifiers
          (
            h.livingunitid = s.livingunitid OR
            (
              h.primaryaddress IS NOT NULL AND s.primaryaddress IS NOT NULL AND
              h.state IS NOT NULL AND s.state IS NOT NULL AND
              ${self()}.standardize_address(h.primaryaddress) = ${self()}.standardize_address(s.primaryaddress) AND
              UPPER(TRIM(h.state)) = UPPER(TRIM(s.state)) AND
              ${self()}.zip_match(h.ZipCode, s.ZipCode)
            )
          ) OR
          
          -- Match on geospatial proximity when coordinates available
          (
            h.latitude IS NOT NULL AND h.longitude IS NOT NULL AND
            s.latitude IS NOT NULL AND s.longitude IS NOT NULL AND
            ${self()}.geo_distance(h.latitude, h.longitude, s.latitude, s.longitude) < 0.05 -- ~50m radius
          ) OR
          
          -- Match on contact identifier
          ${self()}.standardize_phone(h.PhoneNumber) = ${self()}.standardize_phone(s.PhoneNumber) OR
          LOWER(TRIM(h.EmailAddress)) = LOWER(TRIM(s.EmailAddress))
        )
        -- Only include if confidence meets threshold requirement
        WHERE h.confidence_score * ${dataset.weightMultiplier} >= (SELECT min_confidence FROM match_kpi_evaluation)
        
        -- Early termination check - don't process remaining historical datasets if we hit goal
        ${index > 0 ? `AND NOT (
          SELECT 
            (COUNT(DISTINCT m.source_record_id) + 
             (SELECT COUNT(DISTINCT source_record_id) FROM best_matches)) / 
            (SELECT COUNT(*) FROM ${sourceAlias})
             >= early_termination_rate
          FROM hist_matches_0 m
          JOIN match_kpi_evaluation
        )` : ''}
      )`;
    });

    // Combine all historical matches with deduplication
    historicalSql += `
      
      -- Combine all historical matches
      all_historical_matches AS (
        ${historicalDatasets.map((_, index) => 
          `SELECT * FROM hist_matches_${index}`
        ).join(' UNION ALL ')}
      ),
      
      -- Take the highest confidence match from historical data
      best_historical_matches AS (
        SELECT *
        FROM (
          SELECT
            *,
            ROW_NUMBER() OVER (
              PARTITION BY source_customer_id, source_record_id
              ORDER BY adjusted_confidence DESC
            ) AS match_rank
          FROM all_historical_matches
        )
        WHERE match_rank = 1 AND adjusted_confidence >= (SELECT min_confidence FROM match_kpi_evaluation)
      )
    `;

    return historicalSql;
  },

  /**
   * Creates SQL UDFs for geospatial matching
   * @returns {string} SQL for creating geospatial functions
   */
  generateGeoFunctions() {
    return `
      -- Calculate distance between two lat/long points in kilometers
      CREATE OR REPLACE FUNCTION \${self()}.geo_distance(lat1 FLOAT64, lng1 FLOAT64, lat2 FLOAT64, lng2 FLOAT64)
      RETURNS FLOAT64 AS (
        -- Haversine formula
        2 * 6371 * ASIN(
          SQRT(
            POW(SIN((RADIANS(lat2) - RADIANS(lat1)) / 2), 2) +
            COS(RADIANS(lat1)) * COS(RADIANS(lat2)) *
            POW(SIN((RADIANS(lng2) - RADIANS(lng1)) / 2), 2)
          )
        )
      );
      
      -- Check if zipcodes match (first 5 digits)
      CREATE OR REPLACE FUNCTION \${self()}.zip_match(zip1 STRING, zip2 STRING)
      RETURNS BOOLEAN AS (
        SUBSTR(REGEXP_REPLACE(COALESCE(zip1, ''), r'[^0-9]', ''), 1, 5) = 
        SUBSTR(REGEXP_REPLACE(COALESCE(zip2, ''), r'[^0-9]', ''), 1, 5)
      );
      
      -- H3 Index proximity check
      CREATE OR REPLACE FUNCTION \${self()}.h3_proximity(h3_1 INT64, h3_2 INT64)
      RETURNS BOOLEAN AS (
        -- Check if H3 indexes are the same or neighbors (simplified)
        h3_1 = h3_2 OR ABS(h3_1 - h3_2) < 20
      );
    `;
  },

  /**
   * Generates KPI monitoring SQL
   * @returns {string} SQL for tracking match rate KPI
   */
  generateKpiMonitoringSql() {
    return `
      -- KPI monitoring and statistics
      kpi_stats AS (
        SELECT
          CURRENT_TIMESTAMP() AS execution_timestamp,
          '${util.execution_id()}' AS execution_id,
          total_source_records,
          total_matched_primary,
          total_matched_historical,
          total_matched_primary + total_matched_historical AS total_matched,
          ROUND((total_matched_primary + total_matched_historical) / total_source_records, 4) AS overall_match_rate,
          ROUND(total_matched_primary / total_source_records, 4) AS primary_match_rate,
          ROUND(total_matched_historical / total_source_records, 4) AS historical_match_rate,
          ${this.kpiConfig.targetMatchRate} AS target_match_rate,
          CASE
            WHEN ROUND((total_matched_primary + total_matched_historical) / total_source_records, 4) >= ${this.kpiConfig.targetMatchRate}
            THEN TRUE ELSE FALSE
          END AS kpi_goal_achieved
        FROM (
          SELECT
            (SELECT COUNT(*) FROM source_data) AS total_source_records,
            (SELECT COUNT(DISTINCT source_record_id) FROM best_matches WHERE NOT is_historical) AS total_matched_primary,
            (SELECT COUNT(DISTINCT source_record_id) FROM best_matches WHERE is_historical) AS total_matched_historical
        )
      )
    `;
  }
};

module.exports = historicalMatcher;
