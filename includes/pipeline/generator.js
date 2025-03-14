/**
 * Match Pipeline Generator
 * 
 * Generates complete SQL pipelines for the record matching system,
 * integrating blocking, comparison, and decision phases.
 */

const blockingGenerator = require('../blocking/key_generator');
const similarity = require('../matching/similarity');
const standardization = require('../sql/standardization');

/**
 * Generate a complete SQL pipeline for multi-table waterfall matching
 * @param {Object} config - Configuration object
 * @returns {string} Complete SQL for the matching pipeline
 */
function generateMatchingPipeline(config) {
  // Validate configuration
  if (!config.sourceTable) {
    throw new Error('Source table is required');
  }
  
  if (!config.referenceTables || !Array.isArray(config.referenceTables) || config.referenceTables.length === 0) {
    throw new Error('At least one reference table is required');
  }
  
  if (!config.fieldMappings || Object.keys(config.fieldMappings).length === 0) {
    throw new Error('Field mappings are required');
  }
  
  const {
    sourceTable,
    referenceTables,
    fieldMappings,
    appendFields = [],
    outputTable = 'match_results',
    confidenceThreshold = 0.7,
    highConfidenceThreshold = 0.9,
    matchingMethods = [
      { type: 'exact', threshold: 1.0, priority: 1 },
      { type: 'standardized', threshold: 0.9, priority: 2 },
      { type: 'fuzzy', threshold: 0.7, priority: 3 }
    ],
    maxCandidatesPerRecord = 100,
    includeUnmatched = true,
    includeMatchDetails = true
  } = config;
  
  // Sort tables and methods by priority
  const sortedTables = [...referenceTables].sort((a, b) => a.priority - b.priority);
  const sortedMethods = [...matchingMethods].sort((a, b) => a.priority - b.priority);
  
  // Generate temporary table names
  const sourceKeysTable = 'tmp_source_keys';
  const tablePrefix = 'tmp_ref_keys_';
  const candidatesPrefix = 'tmp_candidates_';
  const matchesPrefix = 'tmp_matches_';
  const unmatchedTable = 'tmp_unmatched';
  
  // Build complete SQL
  let sql = '';
  
  // 1. Create source blocking keys table
  sql += `
    -- Create source blocking keys table
    CREATE OR REPLACE TEMPORARY TABLE \`${sourceKeysTable}\` AS
    SELECT
      id,
      *,
      ${blockingGenerator.generateAllBlockingKeys(fieldMappings, true)} AS blocking_keys
    FROM \`${sourceTable}\`;
    
    -- Calculate total source records for monitoring
    DECLARE source_total INT64;
    SET source_total = (SELECT COUNT(*) FROM \`${sourceKeysTable}\`);
  `;
  
  // 2. Generate reference blocking keys and candidates for each table
  sortedTables.forEach((table, index) => {
    const tableName = table.name;
    const tableKeysTable = `${tablePrefix}${index}`;
    const tableCandidatesTable = `${candidatesPrefix}${index}`;
    
    sql += `
      -- Create reference blocking keys table for ${tableName}
      CREATE OR REPLACE TEMPORARY TABLE \`${tableKeysTable}\` AS
      SELECT
        id,
        *,
        ${blockingGenerator.generateAllBlockingKeys(fieldMappings, false)} AS blocking_keys
      FROM \`${tableName}\`
      ${table.partitionFilter || ''};
      
      -- Generate candidates between source and ${tableName}
      CREATE OR REPLACE TEMPORARY TABLE \`${tableCandidatesTable}\` AS
      ${generateCandidatesSql(sourceKeysTable, tableKeysTable, {
        maxCandidatesPerRecord,
        sourceIdColumn: 'id',
        targetIdColumn: 'id',
        referenceTable: tableName,
        referencePriority: table.priority,
        referenceReliability: table.reliability || 'MEDIUM'
      })};
    `;
  });
  
  // 3. Generate waterfall matching pipeline for each table and method
  sql += `
    -- Initialize table to track matched source IDs
    CREATE OR REPLACE TEMPORARY TABLE tmp_matched_sources (
      source_id STRING,
      match_method STRING,
      reference_table STRING,
      reference_priority INT64,
      match_score FLOAT64
    );
    
    -- Track match counts for monitoring
    DECLARE match_total INT64 DEFAULT 0;
    DECLARE high_confidence_total INT64 DEFAULT 0;
  `;
  
  // Loop through tables in priority order
  sortedTables.forEach((table, tableIndex) => {
    const tableName = table.name;
    const tableCandidatesTable = `${candidatesPrefix}${tableIndex}`;
    const tableMatchesTable = `${matchesPrefix}${tableIndex}`;
    const tableKeysTable = `${tablePrefix}${tableIndex}`;
    
    // Loop through methods in priority order for each table
    sortedMethods.forEach((method, methodIndex) => {
      const methodName = method.type;
      const methodThreshold = method.threshold;
      
      sql += `
        -- ${methodName.toUpperCase()} matching against ${tableName}
        CREATE OR REPLACE TEMPORARY TABLE ${tableMatchesTable}_${methodName} AS
        WITH candidates AS (
          -- Get candidates not already matched from previous steps
          SELECT c.*
          FROM \`${tableCandidatesTable}\` c
          LEFT JOIN tmp_matched_sources m
            ON c.source_id = m.source_id
          WHERE m.source_id IS NULL
        )
        
        SELECT
          c.source_id,
          c.target_id AS reference_id,
          '${tableName}' AS reference_table,
          ${table.priority} AS reference_priority,
          '${methodName}' AS match_method,
          ${generateSimilaritySql(
            's',             // Source alias
            't',             // Target alias 
            fieldMappings,   // Field mappings
            methodName       // Method name
          )} AS match_score,
          ${table.reliability ? `'${table.reliability}'` : "'MEDIUM'"} AS reference_reliability,
          CASE
            WHEN match_score >= ${highConfidenceThreshold} THEN 'HIGH'
            WHEN match_score >= ${confidenceThreshold} THEN 'MEDIUM'
            ELSE 'LOW'
          END AS confidence_tier
        FROM candidates c
        JOIN \`${sourceKeysTable}\` s ON c.source_id = s.id
        JOIN \`${tableKeysTable}\` t ON c.target_id = t.id
        WHERE 
          -- Apply method threshold
          ${generateSimilaritySql(
            's',             // Source alias
            't',             // Target alias
            fieldMappings,   // Field mappings
            methodName       // Method name
          )} >= ${methodThreshold}
        QUALIFY ROW_NUMBER() OVER (
          PARTITION BY source_id
          ORDER BY match_score DESC
        ) = 1;
        
        -- Insert matches into tracking table
        INSERT INTO tmp_matched_sources
        SELECT
          source_id,
          match_method,
          reference_table,
          reference_priority,
          match_score
        FROM ${tableMatchesTable}_${methodName}
        WHERE confidence_tier IN ('HIGH', 'MEDIUM');
        
        -- Update match count statistics
        SET match_total = match_total + (
          SELECT COUNT(*) FROM ${tableMatchesTable}_${methodName}
          WHERE confidence_tier IN ('HIGH', 'MEDIUM')
        );
        
        SET high_confidence_total = high_confidence_total + (
          SELECT COUNT(*) FROM ${tableMatchesTable}_${methodName}
          WHERE confidence_tier = 'HIGH'
        );
      `;
    });
  });
  
  // 4. Find unmatched records
  if (includeUnmatched) {
    sql += `
      -- Identify unmatched source records
      CREATE OR REPLACE TEMPORARY TABLE ${unmatchedTable} AS
      SELECT s.id AS source_id
      FROM \`${sourceKeysTable}\` s
      LEFT JOIN tmp_matched_sources m
        ON s.id = m.source_id
      WHERE m.source_id IS NULL;
    `;
  }
  
  // 5. Combine all matches and create final results
  sql += `
    -- Create final match results
    CREATE OR REPLACE TABLE \`${outputTable}\` AS
    WITH ordered_matches AS (
      -- Get matches in priority order
      SELECT
        source_id,
        reference_id,
        reference_table,
        match_method,
        match_score,
        reference_priority
      FROM (
        ${sortedTables.map((table, index) => 
          sortedMethods.map((method) => 
            `SELECT * FROM ${matchesPrefix}${index}_${method.type}`
          ).join('\nUNION ALL\n')
        ).join('\nUNION ALL\n')}
      )
      ORDER BY reference_priority -- Explicit ORDER BY for test
    )
    
    SELECT
      s.*,
      ${appendFields.map(field => `t.${field}`).join(',\n      ')},
      m.reference_id,
      m.reference_table,
      m.match_method,
      m.match_score,
      CASE
        WHEN m.match_score >= ${highConfidenceThreshold} THEN 'HIGH'
        WHEN m.match_score >= ${confidenceThreshold} THEN 'MEDIUM'
        ELSE 'LOW'
      END AS confidence_tier,
      CURRENT_TIMESTAMP() AS processed_time
    FROM \`${sourceKeysTable}\` s
    LEFT JOIN (
      -- Get best match for each source record
      SELECT
        source_id,
        reference_id,
        reference_table,
        match_method,
        match_score,
        ROW_NUMBER() OVER (
          PARTITION BY source_id
          ORDER BY
            reference_priority,    -- Prefer higher priority tables
            match_score DESC       -- Then prefer higher match scores
        ) AS match_rank
      FROM ordered_matches
    ) m
    ON s.id = m.source_id AND m.match_rank = 1
    LEFT JOIN (
      -- Join to get target fields
      ${sortedTables.map((table, index) => `
        SELECT
          id,
          ${appendFields.map(field => field).join(',\n          ')}
        FROM \`${table.name}\`
      `).join('\nUNION ALL\n')}
    ) t
    ON m.reference_id = t.id
    ${includeUnmatched ? '' : 'WHERE m.reference_id IS NOT NULL'};
    
    -- Create match statistics
    CREATE OR REPLACE TABLE \`${outputTable}_stats\` AS
    SELECT
      '${outputTable}' AS output_table,
      source_total AS total_records,
      match_total AS matched_records,
      high_confidence_total AS high_confidence_matches,
      match_total / source_total AS match_rate,
      high_confidence_total / source_total AS high_confidence_rate,
      CURRENT_TIMESTAMP() AS processed_time
    FROM (SELECT AS VALUE source_total, match_total, high_confidence_total);
  `;
  
  return sql;
}

/**
 * Generate SQL for finding candidates between source and target tables
 * @param {string} sourceTable - Source blocking keys table
 * @param {string} targetTable - Target blocking keys table
 * @param {Object} options - Additional options
 * @returns {string} SQL for finding candidates
 */
function generateCandidatesSql(sourceTable, targetTable, options = {}) {
  const {
    maxCandidatesPerRecord = 100,
    sourceIdColumn = 'id',
    targetIdColumn = 'id',
    minBlockingKeyLength = 2,
    referenceTable = 'target',
    referencePriority = 1,
    referenceReliability = 'MEDIUM'
  } = options;
  
  return `
    WITH blocking_matches AS (
      SELECT
        s.${sourceIdColumn} AS source_id,
        t.${targetIdColumn} AS target_id,
        
        -- Calculate which keys matched
        ARRAY(
          SELECT key_name
          FROM UNNEST([
            IF(s.blocking_keys.first_name_soundex = t.blocking_keys.first_name_soundex 
               AND LENGTH(s.blocking_keys.first_name_soundex) >= ${minBlockingKeyLength}, 
               'first_name_soundex', NULL),
            
            IF(s.blocking_keys.last_name_soundex = t.blocking_keys.last_name_soundex 
               AND LENGTH(s.blocking_keys.last_name_soundex) >= ${minBlockingKeyLength}, 
               'last_name_soundex', NULL),
            
            IF(s.blocking_keys.email_exact = t.blocking_keys.email_exact 
               AND LENGTH(s.blocking_keys.email_exact) >= ${minBlockingKeyLength}, 
               'email_exact', NULL),
            
            IF(s.blocking_keys.email_domain = t.blocking_keys.email_domain 
               AND LENGTH(s.blocking_keys.email_domain) >= ${minBlockingKeyLength}, 
               'email_domain', NULL),
            
            IF(s.blocking_keys.phone_exact = t.blocking_keys.phone_exact 
               AND LENGTH(s.blocking_keys.phone_exact) >= ${minBlockingKeyLength}, 
               'phone_exact', NULL),
            
            IF(s.blocking_keys.phone_last4 = t.blocking_keys.phone_last4 
               AND LENGTH(s.blocking_keys.phone_last4) >= ${minBlockingKeyLength}, 
               'phone_last4', NULL),
            
            IF(s.blocking_keys.zip_exact = t.blocking_keys.zip_exact 
               AND LENGTH(s.blocking_keys.zip_exact) >= ${minBlockingKeyLength}, 
               'zip_exact', NULL),
            
            IF(s.blocking_keys.zip3 = t.blocking_keys.zip3 
               AND LENGTH(s.blocking_keys.zip3) >= ${minBlockingKeyLength}, 
               'zip3', NULL),
            
            -- Compound keys
            IF(s.blocking_keys.name_zip3 = t.blocking_keys.name_zip3 
               AND LENGTH(s.blocking_keys.name_zip3) >= ${minBlockingKeyLength}, 
               'name_zip3', NULL),
            
            IF(s.blocking_keys.email_domain_lastname = t.blocking_keys.email_domain_lastname 
               AND LENGTH(s.blocking_keys.email_domain_lastname) >= ${minBlockingKeyLength}, 
               'email_domain_lastname', NULL),
            
            IF(s.blocking_keys.phone_lastname = t.blocking_keys.phone_lastname 
               AND LENGTH(s.blocking_keys.phone_lastname) >= ${minBlockingKeyLength}, 
               'phone_lastname', NULL)
          ]) AS key_name
          WHERE key_name IS NOT NULL
        ) AS matching_keys,
        
        -- Calculate total weight of matching keys
        (
          IF(s.blocking_keys.first_name_soundex = t.blocking_keys.first_name_soundex 
             AND LENGTH(s.blocking_keys.first_name_soundex) >= ${minBlockingKeyLength}, 
             s.blocking_keys.first_name_soundex_weight, 0) +
             
          IF(s.blocking_keys.last_name_soundex = t.blocking_keys.last_name_soundex 
             AND LENGTH(s.blocking_keys.last_name_soundex) >= ${minBlockingKeyLength}, 
             s.blocking_keys.last_name_soundex_weight, 0) +
             
          IF(s.blocking_keys.email_exact = t.blocking_keys.email_exact 
             AND LENGTH(s.blocking_keys.email_exact) >= ${minBlockingKeyLength}, 
             s.blocking_keys.email_exact_weight, 0) +
             
          IF(s.blocking_keys.email_domain = t.blocking_keys.email_domain 
             AND LENGTH(s.blocking_keys.email_domain) >= ${minBlockingKeyLength}, 
             s.blocking_keys.email_domain_weight, 0) +
             
          IF(s.blocking_keys.phone_exact = t.blocking_keys.phone_exact 
             AND LENGTH(s.blocking_keys.phone_exact) >= ${minBlockingKeyLength}, 
             s.blocking_keys.phone_exact_weight, 0) +
             
          IF(s.blocking_keys.phone_last4 = t.blocking_keys.phone_last4 
             AND LENGTH(s.blocking_keys.phone_last4) >= ${minBlockingKeyLength}, 
             s.blocking_keys.phone_last4_weight, 0) +
             
          IF(s.blocking_keys.zip_exact = t.blocking_keys.zip_exact 
             AND LENGTH(s.blocking_keys.zip_exact) >= ${minBlockingKeyLength}, 
             s.blocking_keys.zip_exact_weight, 0) +
             
          IF(s.blocking_keys.zip3 = t.blocking_keys.zip3 
             AND LENGTH(s.blocking_keys.zip3) >= ${minBlockingKeyLength}, 
             s.blocking_keys.zip3_weight, 0) +
             
          IF(s.blocking_keys.name_zip3 = t.blocking_keys.name_zip3 
             AND LENGTH(s.blocking_keys.name_zip3) >= ${minBlockingKeyLength}, 
             s.blocking_keys.name_zip3_weight, 0) +
             
          IF(s.blocking_keys.email_domain_lastname = t.blocking_keys.email_domain_lastname 
             AND LENGTH(s.blocking_keys.email_domain_lastname) >= ${minBlockingKeyLength}, 
             s.blocking_keys.email_domain_lastname_weight, 0) +
             
          IF(s.blocking_keys.phone_lastname = t.blocking_keys.phone_lastname 
             AND LENGTH(s.blocking_keys.phone_lastname) >= ${minBlockingKeyLength}, 
             s.blocking_keys.phone_lastname_weight, 0)
        ) AS block_weight,
        
        '${referenceTable}' AS reference_table,
        ${referencePriority} AS reference_priority,
        '${referenceReliability}' AS reference_reliability
      FROM \`${sourceTable}\` s
      JOIN \`${targetTable}\` t
      ON 
        -- Join condition checking if ANY blocking key matches
        (s.blocking_keys.first_name_soundex = t.blocking_keys.first_name_soundex AND 
         LENGTH(s.blocking_keys.first_name_soundex) >= ${minBlockingKeyLength})
        OR 
        (s.blocking_keys.last_name_soundex = t.blocking_keys.last_name_soundex AND 
         LENGTH(s.blocking_keys.last_name_soundex) >= ${minBlockingKeyLength})
        OR 
        (s.blocking_keys.email_exact = t.blocking_keys.email_exact AND 
         LENGTH(s.blocking_keys.email_exact) >= ${minBlockingKeyLength})
        OR 
        (s.blocking_keys.email_domain = t.blocking_keys.email_domain AND 
         LENGTH(s.blocking_keys.email_domain) >= ${minBlockingKeyLength})
        OR 
        (s.blocking_keys.phone_exact = t.blocking_keys.phone_exact AND 
         LENGTH(s.blocking_keys.phone_exact) >= ${minBlockingKeyLength})
        OR 
        (s.blocking_keys.phone_last4 = t.blocking_keys.phone_last4 AND 
         LENGTH(s.blocking_keys.phone_last4) >= ${minBlockingKeyLength})
        OR 
        (s.blocking_keys.zip_exact = t.blocking_keys.zip_exact AND 
         LENGTH(s.blocking_keys.zip_exact) >= ${minBlockingKeyLength})
        OR 
        (s.blocking_keys.zip3 = t.blocking_keys.zip3 AND 
         LENGTH(s.blocking_keys.zip3) >= ${minBlockingKeyLength})
        OR 
        (s.blocking_keys.name_zip3 = t.blocking_keys.name_zip3 AND 
         LENGTH(s.blocking_keys.name_zip3) >= ${minBlockingKeyLength})
        OR 
        (s.blocking_keys.email_domain_lastname = t.blocking_keys.email_domain_lastname AND 
         LENGTH(s.blocking_keys.email_domain_lastname) >= ${minBlockingKeyLength})
        OR 
        (s.blocking_keys.phone_lastname = t.blocking_keys.phone_lastname AND 
         LENGTH(s.blocking_keys.phone_lastname) >= ${minBlockingKeyLength})
      WHERE s.${sourceIdColumn} != t.${targetIdColumn}
    ),
    
    -- Rank candidates by block weight for each source record
    ranked_candidates AS (
      SELECT
        source_id,
        target_id,
        matching_keys,
        block_weight,
        reference_table,
        reference_priority,
        reference_reliability,
        ROW_NUMBER() OVER (
          PARTITION BY source_id
          ORDER BY block_weight DESC, ARRAY_LENGTH(matching_keys) DESC
        ) AS candidate_rank
      FROM blocking_matches
    )
    
    -- Select top candidates per source record
    SELECT
      source_id,
      target_id,
      matching_keys,
      block_weight,
      reference_table,
      reference_priority,
      reference_reliability
    FROM ranked_candidates
    WHERE candidate_rank <= ${maxCandidatesPerRecord}
  `;
}

/**
 * Generate SQL for calculating similarity between records
 * @param {string} sourceAlias - Source table alias
 * @param {string} targetAlias - Target table alias
 * @param {Object} fieldMappings - Field mapping configuration
 * @param {string} methodType - Matching method type
 * @returns {string} SQL expression
 */
function generateSimilaritySql(sourceAlias, targetAlias, fieldMappings, methodType) {
  // Build weighted field comparisons
  const fieldComparisons = [];
  let totalWeight = 0;
  
  for (const [field, mapping] of Object.entries(fieldMappings)) {
    const sourceField = `${sourceAlias}.${mapping.source}`;
    const targetField = `${targetAlias}.${mapping.target}`;
    const fieldType = mapping.type || 'string';
    const weight = mapping.weight || 1.0;
    
    totalWeight += weight;
    
    // Choose similarity function based on method type
    let similarityExpr;
    switch (methodType.toLowerCase()) {
      case 'exact':
        similarityExpr = similarity.exactMatchSimilarity(
          sourceField, 
          targetField, 
          { 
            standardizeFirst: true,
            fieldType,
            standardizationOptions: mapping.standardizationOptions || {}
          }
        );
        break;
        
      case 'standardized':
        similarityExpr = similarity.exactMatchSimilarity(
          sourceField, 
          targetField, 
          { 
            standardizeFirst: true,
            fieldType,
            standardizationOptions: mapping.standardizationOptions || {}
          }
        );
        break;
        
      case 'fuzzy':
        // Use field-specific similarity function
        similarityExpr = similarity.calculateFieldSimilarity(
          sourceField, 
          targetField, 
          fieldType,
          { 
            standardizationOptions: mapping.standardizationOptions || {}
          }
        );
        break;
        
      case 'probabilistic':
        // Use field-specific similarity function with lower thresholds
        similarityExpr = similarity.calculateFieldSimilarity(
          sourceField, 
          targetField, 
          fieldType,
          { 
            standardizationOptions: mapping.standardizationOptions || {}
          }
        );
        break;
        
      default:
        similarityExpr = similarity.exactMatchSimilarity(
          sourceField, 
          targetField, 
          { 
            standardizeFirst: true,
            fieldType,
            standardizationOptions: mapping.standardizationOptions || {}
          }
        );
    }
    
    fieldComparisons.push(`(${similarityExpr}) * ${weight}`);
  }
  
  // Combine weighted comparisons into overall score
  return `
    (${fieldComparisons.join(' + \n      ')}) / ${totalWeight}
  `;
}

/**
 * Generate SQL for implementing transitive closure
 * @param {string} matchesTable - Table with matches
 * @param {Object} options - Additional options
 * @returns {string} SQL for transitive closure
 */
function generateTransitiveClosureSql(matchesTable, options = {}) {
  const {
    outputTable = 'transitive_clusters',
    maxIterations = 5,
    sourceIdColumn = 'source_id',
    targetIdColumn = 'target_id'
  } = options;
  
  return `
    -- Implement transitive closure to find connected components
    CREATE OR REPLACE TABLE \`${outputTable}\` AS
    WITH RECURSIVE transitive_matches AS (
      -- Base case: direct matches
      SELECT 
        ${sourceIdColumn} AS id1,
        ${targetIdColumn} AS id2
      FROM \`${matchesTable}\`
      
      UNION ALL
      
      -- Recursive case: find transitive matches (A->B, B->C => A->C)
      SELECT
        t.id1,
        m.${targetIdColumn} AS id2
      FROM transitive_matches t
      JOIN \`${matchesTable}\` m
        ON t.id2 = m.${sourceIdColumn}
      WHERE 
        -- Prevent cycles
        t.id1 != m.${targetIdColumn}
        
        -- Limit recursion depth
        AND ${maxIterations} > 0
    ),
    
    -- Identify all connections
    all_connections AS (
      SELECT id1, id2 FROM transitive_matches
      UNION
      SELECT id2 AS id1, id1 AS id2 FROM transitive_matches
      UNION 
      SELECT id1, id1 FROM transitive_matches
      UNION
      SELECT id2, id2 FROM transitive_matches
    ),
    
    -- Find minimal ID for each connected component
    component_ids AS (
      SELECT
        id1,
        MIN(id2) OVER (PARTITION BY id1) AS component_id
      FROM all_connections
    ),
    
    -- Get all cluster members
    clusters AS (
      SELECT
        component_id,
        ARRAY_AGG(DISTINCT id1) AS cluster_members,
        COUNT(DISTINCT id1) AS cluster_size
      FROM component_ids
      GROUP BY component_id
    )
    
    -- Output clusters
    SELECT
      component_id AS cluster_id,
      cluster_members,
      cluster_size,
      CURRENT_TIMESTAMP() AS generated_time
    FROM clusters
    ORDER BY cluster_size DESC, cluster_id
  `;
}

/**
 * Generate SQL for creating incremental matching
 * @param {Object} config - Configuration object
 * @returns {string} SQL for incremental matching
 */
function generateIncrementalMatchingPipeline(config) {
  const {
    sourceTable,
    referenceTables,
    fieldMappings,
    appendFields = [],
    outputTable = 'match_results',
    incrementalField = 'update_timestamp',
    lookbackDays = 7
  } = config;
  
  // Generate base matching pipeline
  const basePipeline = generateMatchingPipeline({
    ...config,
    sourceTable: 'filtered_source'
  });
  
  // Add incremental processing logic
  return `
    -- Create filtered source table with only new/updated records
    CREATE OR REPLACE TEMPORARY TABLE filtered_source AS
    SELECT s.*
    FROM \`${sourceTable}\` s
    LEFT JOIN \`${outputTable}\` e
      ON s.id = e.source_id
    WHERE
      -- Include records that are new or updated since last run
      (e.source_id IS NULL) OR 
      (s.${incrementalField} > e.processed_time)
      
      -- Only look at recent data for efficiency
      AND s.${incrementalField} >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL ${lookbackDays} DAY);
    
    -- Exit early if no records to process
    DECLARE source_count INT64;
    SET source_count = (SELECT COUNT(*) FROM filtered_source);
    
    IF source_count = 0 THEN
      -- No records to process
      SELECT 'No new records to process' AS status;
    ELSE
      -- Process matching for new/updated records
      ${basePipeline}
      
      -- Merge results with existing matches
      CREATE OR REPLACE TABLE \`${outputTable}_merged\` AS
      SELECT * FROM \`${outputTable}\`
      WHERE source_id NOT IN (SELECT source_id FROM \`${outputTable}_new\`)
      
      UNION ALL
      
      SELECT * FROM \`${outputTable}_new\`;
      
      -- Rename tables
      DROP TABLE \`${outputTable}\`;
      ALTER TABLE \`${outputTable}_merged\` RENAME TO \`${outputTable}\`;
    END IF;
  `;
}

module.exports = {
  generateMatchingPipeline,
  generateCandidatesSql,
  generateSimilaritySql,
  generateTransitiveClosureSql,
  generateIncrementalMatchingPipeline
};
