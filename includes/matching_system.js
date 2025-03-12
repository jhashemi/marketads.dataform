/**
 * Unified Matching System
 * 
 * This module provides a comprehensive record matching system that integrates:
 * 1. Blocking strategies to reduce comparison space
 * 2. Multiple matching algorithms (exact, fuzzy, phonetic)
 * 3. Configurable rule-based scoring
 * 4. Historical matching with quality weights
 * 5. Automatic field type detection and standardization
 * 
 * The system is designed to achieve a 65%+ date of birth append rate
 * while maintaining high precision.
 */

const semanticTypes = require('./semantic_types');
const blockingFunctions = require('./blocking_functions');
const MatchStrategyFactory = require('./match_strategy_factory');
const config = require('./config');

/**
 * Generates SQL for creating blocking keys
 * 
 * @param {string} sourceTable - Source table name
 * @param {Object} sourceFields - Mapping of semantic field types to actual field names
 * @returns {string} - SQL for generating blocking keys
 */
function generateBlockingKeysSql(sourceTable, sourceFields) {
  const blockingStrategies = config.BLOCKING.STRATEGIES;
  const blockingColumns = [];
  
  // Generate SQL for each blocking strategy
  for (const strategy of blockingStrategies) {
    switch (strategy) {
      case 'zipLast3':
        if (sourceFields.zipCode && sourceFields.lastName) {
          blockingColumns.push(`
            ${blockingFunctions.zipLast3(sourceFields.zipCode, sourceFields.lastName)} AS zip_last3
          `);
        }
        break;
        
      case 'zipSoundexLastName':
        if (sourceFields.zipCode && sourceFields.lastName) {
          blockingColumns.push(`
            ${blockingFunctions.zipSoundexLastName(sourceFields.zipCode, sourceFields.lastName)} AS zip_soundex_lastname
          `);
        }
        break;
        
      case 'stateLast3First3':
        if (sourceFields.state && sourceFields.lastName && sourceFields.firstName) {
          blockingColumns.push(`
            ${blockingFunctions.stateLast3First3(sourceFields.state, sourceFields.lastName, sourceFields.firstName)} AS state_last3_first3
          `);
        }
        break;
        
      case 'zipStreet5':
        if (sourceFields.zipCode && sourceFields.address) {
          blockingColumns.push(`
            ${blockingFunctions.zipStreet5(sourceFields.zipCode, sourceFields.address)} AS zip_street5
          `);
        }
        break;
        
      case 'last3SoundexFirstCity':
        if (sourceFields.lastName && sourceFields.firstName && sourceFields.city) {
          blockingColumns.push(`
            ${blockingFunctions.last3SoundexFirstCity(sourceFields.lastName, sourceFields.firstName, sourceFields.city)} AS last3_soundexfirst_city
          `);
        }
        break;
    }
  }
  
  // Generate the complete SQL
  return `
    SELECT
      *,
      ${blockingColumns.join(',\n      ')}
    FROM ${sourceTable}
  `;
}

/**
 * Generates SQL for matching records between two tables
 * 
 * @param {string} sourceTable - Source table name
 * @param {string} targetTable - Target table name
 * @param {Object} sourceFields - Mapping of semantic field types to source field names
 * @param {Object} targetFields - Mapping of semantic field types to target field names
 * @param {Object} options - Additional options
 * @returns {string} - SQL for matching records
 */
function generateMatchingSql(sourceTable, targetTable, sourceFields, targetFields, options = {}) {
  const strategyFactory = new MatchStrategyFactory();
  const matchConditions = [];
  const scoreComponents = [];
  
  // Generate match conditions for each field pair
  for (const [semanticType, weight] of Object.entries(config.FIELD_WEIGHTS)) {
    const sourceField = sourceFields[semanticType];
    const targetField = targetFields[semanticType];
    
    if (sourceField && targetField) {
      try {
        // Get appropriate strategy for this field type
        const strategy = strategyFactory.getStrategy(sourceField, targetField);
        
        // Add match condition
        matchConditions.push(`
          -- Match condition for ${semanticType}
          (
            ${strategy.match({ c1: 's', c2: 't' })}
          )`);
        
        // Add score component
        scoreComponents.push(`
          -- Score component for ${semanticType}
          CASE
            WHEN ${strategy.match({ c1: 's', c2: 't' })} THEN ${weight}
            ELSE 0
          END * ${weight}`);
      } catch (error) {
        // Skip if no strategy available
        console.log(`No strategy available for ${semanticType}: ${error.message}`);
      }
    }
  }
  
  // Get environment-specific configuration
  const envConfig = config.getEnvironmentConfig();
  
  // Apply row limit if specified in environment config
  const rowLimitClause = envConfig.maxRowsPerRun 
    ? `LIMIT ${envConfig.maxRowsPerRun}` 
    : '';
  
  // Generate the complete SQL with blocking and scoring
  return `
    WITH source_blocked AS (
      ${generateBlockingKeysSql(sourceTable, sourceFields)}
      ${rowLimitClause}
    ),
    target_blocked AS (
      ${generateBlockingKeysSql(targetTable, targetFields)}
    ),
    matches AS (
      SELECT
        s.*,
        t.*,
        -- Calculate composite match score
        (${scoreComponents.join(' +\n        ')}) / 
        (${Object.values(config.FIELD_WEIGHTS).filter(w => w > 0).reduce((sum, w) => sum + w, 0)}) AS match_confidence
      FROM source_blocked s
      JOIN target_blocked t
        ON (
          -- Join on blocking keys (any match is sufficient)
          s.zip_last3 = t.zip_last3 OR
          s.zip_soundex_lastname = t.zip_soundex_lastname OR
          s.state_last3_first3 = t.state_last3_first3 OR
          s.zip_street5 = t.zip_street5 OR
          s.last3_soundexfirst_city = t.last3_soundexfirst_city
        )
      WHERE
        -- Apply match conditions
        (${matchConditions.join(' OR\n        ')})
    )
    
    -- Return matches above confidence threshold
    SELECT * FROM matches
    WHERE match_confidence >= ${options.minimumConfidence || config.CONFIDENCE.MINIMUM}
    ORDER BY match_confidence DESC
  `;
}

/**
 * Auto-detects field mappings from a table schema
 * 
 * @param {Array} tableSchema - Array of column definitions
 * @returns {Object} - Mapping of semantic types to field names
 */
function detectFieldMappings(tableSchema) {
  const fieldMappings = {};
  
  for (const column of tableSchema) {
    const semanticType = semanticTypes.getSemanticType(column.name);
    if (semanticType) {
      fieldMappings[semanticType] = column.name;
    }
  }
  
  return fieldMappings;
}

/**
 * Calculates match metrics including DOB append rate
 * 
 * @param {string} matchResultsTable - Table containing match results
 * @param {string} sourceIdField - Source ID field name
 * @param {string} targetDobField - Target DOB field name
 * @returns {string} - SQL for calculating match metrics
 */
function calculateMatchMetricsSql(matchResultsTable, sourceIdField, targetDobField) {
  return `
    WITH match_counts AS (
      SELECT
        COUNT(DISTINCT ${sourceIdField}) AS total_source_records,
        COUNT(DISTINCT CASE WHEN match_confidence >= ${config.CONFIDENCE.HIGH} THEN ${sourceIdField} END) AS high_confidence_matches,
        COUNT(DISTINCT CASE WHEN match_confidence >= ${config.CONFIDENCE.MEDIUM} THEN ${sourceIdField} END) AS medium_confidence_matches,
        COUNT(DISTINCT CASE WHEN match_confidence >= ${config.CONFIDENCE.LOW} THEN ${sourceIdField} END) AS low_confidence_matches,
        COUNT(DISTINCT CASE WHEN ${targetDobField} IS NOT NULL AND match_confidence >= ${config.CONFIDENCE.MEDIUM} THEN ${sourceIdField} END) AS dob_appends
      FROM ${matchResultsTable}
    )
    
    SELECT
      total_source_records,
      high_confidence_matches,
      medium_confidence_matches,
      low_confidence_matches,
      dob_appends,
      SAFE_DIVIDE(high_confidence_matches, total_source_records) AS high_confidence_match_rate,
      SAFE_DIVIDE(medium_confidence_matches, total_source_records) AS medium_confidence_match_rate,
      SAFE_DIVIDE(low_confidence_matches, total_source_records) AS low_confidence_match_rate,
      SAFE_DIVIDE(dob_appends, total_source_records) AS dob_append_rate,
      -- Check if we met our target
      SAFE_DIVIDE(dob_appends, total_source_records) >= ${config.TARGETS.DOB_APPEND_RATE} AS met_dob_append_target
    FROM match_counts
  `;
}

// Export the module functions
module.exports = {
  generateBlockingKeysSql,
  generateMatchingSql,
  detectFieldMappings,
  calculateMatchMetricsSql
}; 