/**
 * Waterfall Matching Pipeline
 * 
 * Creates SQL pipelines for waterfall matching across multiple tables
 * with prioritization and confidence-based selection.
 */

const matchStrategyFactory = require('../match_strategy_factory');
const blockingGenerator = require('../blocking/key_generator');
const standardization = require('../sql/standardization');
const { validateConfig } = require('../utils/validation');

/**
 * Schema definition for waterfall pipeline configuration validation
 */
const WATERFALL_CONFIG_SCHEMA = {
  type: 'object',
  required: ['sourceTable', 'referenceTables', 'fieldMappings'],
  properties: {
    sourceTable: { type: 'string' },
    referenceTables: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: ['id', 'table', 'priority'],
        properties: {
          id: { type: 'string' },
          table: { type: 'string' },
          priority: { type: 'number' },
          name: { type: 'string' },
          keyField: { type: 'string' },
          confidenceMultiplier: { type: 'number' },
          requiredFields: {
            type: 'array',
            items: {
              oneOf: [
                { type: 'string' },
                { 
                  type: 'object',
                  properties: {
                    field: { type: 'string' },
                    condition: { type: 'string' }
                  }
                }
              ]
            }
          }
        }
      }
    },
    fieldMappings: {
      type: 'object',
      additionalProperties: {
        type: 'array',
        items: {
          oneOf: [
            { type: 'string' },
            {
              type: 'object',
              required: ['sourceField', 'targetField'],
              properties: {
                sourceField: { type: 'string' },
                targetField: { type: 'string' }
              }
            },
            {
              type: 'object',
              required: ['expression', 'targetField'],
              properties: {
                expression: { type: 'string' },
                targetField: { type: 'string' }
              }
            }
          ]
        }
      }
    },
    matchingRules: {
      type: 'object',
      additionalProperties: {
        type: 'object',
        properties: {
          blocking: {
            type: 'array',
            items: { type: 'object' }
          },
          scoring: {
            type: 'array',
            items: { type: 'object' }
          }
        }
      }
    },
    thresholds: {
      type: 'object',
      properties: {
        high: { type: 'number', minimum: 0, maximum: 1 },
        medium: { type: 'number', minimum: 0, maximum: 1 },
        low: { type: 'number', minimum: 0, maximum: 1 }
      }
    },
    outputTable: { type: 'string' },
    allowMultipleMatches: { type: 'boolean' },
    maxMatches: { type: 'number', minimum: 1 },
    confidenceField: { type: 'string' },
    includeUnmatched: { type: 'boolean' }
  }
};

/**
 * Default configuration for waterfall matching
 */
const DEFAULT_CONFIG = {
  thresholds: {
    high: 0.85,
    medium: 0.70,
    low: 0.55
  },
  outputTable: 'waterfall_match_results',
  allowMultipleMatches: false,
  maxMatches: 1,
  confidenceField: 'confidence',
  includeUnmatched: true
};

/**
 * Generate a waterfall matching pipeline
 * @param {Object} config - Waterfall pipeline configuration
 * @returns {string} SQL for the waterfall matching pipeline
 */
function generateWaterfallPipeline(config) {
  // Validate configuration
  validateConfig(config, WATERFALL_CONFIG_SCHEMA);
  
  // Merge with default configuration
  const finalConfig = {
    ...DEFAULT_CONFIG,
    ...config,
    thresholds: {
      ...DEFAULT_CONFIG.thresholds,
      ...(config.thresholds || {})
    }
  };
  
  const {
    sourceTable,
    referenceTables,
    fieldMappings,
    matchingRules,
    thresholds,
    outputTable,
    allowMultipleMatches,
    maxMatches,
    confidenceField,
    includeUnmatched
  } = finalConfig;
  
  // Create the appropriate waterfall strategy based on configuration
  const strategyOptions = {
    referenceTables,
    matchingRules,
    thresholds,
    fieldMappings,
    allowMultipleMatches,
    maxMatches,
    confidenceField
  };
  
  const strategy = allowMultipleMatches && maxMatches > 1
    ? matchStrategyFactory.createMultiTableWaterfallStrategy(strategyOptions)
    : matchStrategyFactory.createWaterfallStrategy(strategyOptions);
  
  // Generate SQL for the waterfall matching
  let sql = strategy.generateSql({
    sourceTable,
    sourceAlias: 's',
    targetAlias: 't',
    options: { thresholds }
  });
  
  // Add unmatched records if requested
  if (includeUnmatched) {
    sql = generateSqlWithUnmatched(sql, sourceTable, outputTable);
  } else {
    sql = `${sql}\n\n-- Write results to ${outputTable}\nCREATE OR REPLACE TABLE \`${outputTable}\` AS\n${sql}`;
  }
  
  return sql;
}

/**
 * Generate multi-table waterfall pipeline
 * @param {Object} config - Multi-table waterfall pipeline configuration
 * @returns {string} SQL for the multi-table waterfall matching pipeline
 */
function generateMultiTableWaterfallPipeline(config) {
  // For the multi-table case, we always use the multi-table strategy
  return generateWaterfallPipeline({
    ...config,
    allowMultipleMatches: true,
    maxMatches: config.maxMatches || 3
  });
}

/**
 * Generate SQL that includes unmatched records
 * @param {string} matchesSql - SQL for matched records
 * @param {string} sourceTable - Source table name
 * @param {string} outputTable - Output table name
 * @returns {string} SQL including unmatched records
 */
function generateSqlWithUnmatched(matchesSql, sourceTable, outputTable) {
  return `
-- Original matches
WITH matches AS (
${matchesSql}
),

-- Identify unmatched records
unmatched AS (
  SELECT
    source.*,
    NULL AS reference_id,
    NULL AS match_key,
    'UNMATCHED' AS data_source,
    999 AS table_priority,
    999 AS match_priority,
    0 AS match_score,
    'NONE' AS confidence
  FROM \`${sourceTable}\` AS source
  LEFT JOIN matches ON source.id = matches.id
  WHERE matches.id IS NULL
)

-- Combine matched and unmatched records
CREATE OR REPLACE TABLE \`${outputTable}\` AS
SELECT * FROM matches
UNION ALL
SELECT * FROM unmatched
`;
}

/**
 * Generate a historical waterfall matching pipeline
 * @param {Object} config - Historical waterfall pipeline configuration
 * @returns {string} SQL for the historical waterfall matching pipeline
 */
function generateHistoricalWaterfallPipeline(config) {
  // Validate configuration
  if (!config.historicalTables || !Array.isArray(config.historicalTables) || config.historicalTables.length === 0) {
    throw new Error('At least one historical table is required');
  }
  
  // Add configuration for historical matching
  const historicalConfig = {
    ...config,
    referenceTables: [
      ...config.referenceTables,
      ...config.historicalTables.map((table, index) => ({
        ...table,
        // Ensure historical tables have lower priority than main reference tables
        priority: Math.max(...config.referenceTables.map(t => t.priority)) + index + 1
      }))
    ]
  };
  
  // Use multi-table strategy for historical matching
  return generateMultiTableWaterfallPipeline(historicalConfig);
}

/**
 * Generate deterministic first, then probabilistic matching pipeline
 * @param {Object} config - Configuration for combined deterministic-probabilistic approach
 * @returns {string} SQL for the combined matching pipeline
 */
function generateDeterministicThenProbabilisticPipeline(config) {
  // Validate configuration
  if (!config.deterministicRules || Object.keys(config.deterministicRules).length === 0) {
    throw new Error('Deterministic rules are required');
  }
  
  const {
    sourceTable,
    referenceTables,
    deterministicRules,
    fieldMappings,
    thresholds,
    outputTable,
    includeUnmatched
  } = config;
  
  // Step 1: Generate deterministic matching SQL
  const deterministicSql = generateDeterministicMatchingSql(
    sourceTable,
    referenceTables,
    deterministicRules,
    fieldMappings
  );
  
  // Step 2: Generate probabilistic matching SQL for remaining records
  const probabilisticSql = generateProbabilisticMatchingSql(
    sourceTable,
    referenceTables,
    config
  );
  
  // Step 3: Combine both approaches
  return `
-- Step 1: Deterministic matching
WITH deterministic_matches AS (
${deterministicSql}
),

-- Step 2: Find records that didn't match deterministically
unmatched_records AS (
  SELECT *
  FROM \`${sourceTable}\`
  WHERE id NOT IN (SELECT id FROM deterministic_matches)
),

-- Step 3: Probabilistic matching for remaining records
probabilistic_matches AS (
${probabilisticSql.replace('\`${sourceTable}\`', 'unmatched_records')}
),

-- Step 4: Combine all matches
all_matches AS (
  SELECT *, 'DETERMINISTIC' AS match_type FROM deterministic_matches
  UNION ALL
  SELECT *, 'PROBABILISTIC' AS match_type FROM probabilistic_matches
)

-- Final result
CREATE OR REPLACE TABLE \`${outputTable}\` AS
SELECT * FROM all_matches
${includeUnmatched ? `
UNION ALL
-- Include unmatched records
SELECT
  source.*,
  NULL AS reference_id,
  NULL AS match_key,
  'UNMATCHED' AS data_source,
  999 AS table_priority,
  999 AS match_priority,
  0 AS match_score,
  'NONE' AS confidence,
  'UNMATCHED' AS match_type
FROM \`${sourceTable}\` AS source
LEFT JOIN all_matches ON source.id = all_matches.id
WHERE all_matches.id IS NULL
` : ''}
`;
}

/**
 * Generate SQL for deterministic matching
 * @private
 * @param {string} sourceTable - Source table name
 * @param {Array<Object>} referenceTables - Reference tables
 * @param {Object} deterministicRules - Deterministic matching rules
 * @param {Object} fieldMappings - Field mappings
 * @returns {string} SQL for deterministic matching
 */
function generateDeterministicMatchingSql(sourceTable, referenceTables, deterministicRules, fieldMappings) {
  // Implementation details for deterministic matching
  let sql = '';
  let unionKeyword = '';
  
  // Loop through each reference table and its rules
  referenceTables.forEach((refTable, index) => {
    const tableRules = deterministicRules[refTable.id] || [];
    
    // Skip if no rules defined
    if (tableRules.length === 0) return;
    
    // Generate SQL for each rule
    tableRules.forEach((rule, ruleIndex) => {
      // Build join conditions
      const joinConditions = rule.conditions.map(cond => {
        if (cond.exact) {
          return `s.${cond.sourceField} = t.${cond.targetField}`;
        } else if (cond.standardized) {
          return `UPPER(TRIM(s.${cond.sourceField})) = UPPER(TRIM(t.${cond.targetField}))`;
        } else {
          return cond.condition || `s.${cond.sourceField} = t.${cond.targetField}`;
        }
      }).join(' AND ');
      
      // Generate field mappings for this table
      const fieldMappingSelects = (fieldMappings[refTable.id] || [])
        .map(mapping => {
          if (typeof mapping === 'string') {
            return `t.${mapping} AS ${mapping}`;
          } else if (mapping.expression) {
            return `${mapping.expression} AS ${mapping.targetField}`;
          } else {
            return `t.${mapping.sourceField} AS ${mapping.targetField}`;
          }
        })
        .join(',\n    ');
      
      // Add SQL for this rule
      sql += `${unionKeyword}
-- Deterministic match for ${refTable.name || refTable.id} (Rule ${ruleIndex + 1})
SELECT
  s.*,
  t.id AS reference_id,
  t.${refTable.keyField || 'id'} AS match_key,
  '${refTable.name || refTable.id}' AS data_source,
  ${refTable.priority} AS table_priority,
  ${ruleIndex + 1} AS match_priority,
  1.0 AS match_score,
  'HIGH' AS confidence
  ${fieldMappingSelects ? `,\n    ${fieldMappingSelects}` : ''}
FROM \`${sourceTable}\` s
JOIN \`${refTable.table}\` t
  ON ${joinConditions}
`;
      
      unionKeyword = 'UNION ALL\n';
    });
  });
  
  return sql;
}

/**
 * Generate SQL for probabilistic matching
 * @private
 * @param {string} sourceTable - Source table name
 * @param {Array<Object>} referenceTables - Reference tables
 * @param {Object} config - Configuration
 * @returns {string} SQL for probabilistic matching
 */
function generateProbabilisticMatchingSql(sourceTable, referenceTables, config) {
  // Use the waterfall strategy for probabilistic matching
  const probabilisticConfig = {
    sourceTable,
    referenceTables,
    fieldMappings: config.fieldMappings,
    matchingRules: config.matchingRules || {},
    thresholds: config.thresholds
  };
  
  // Get the strategy
  const strategy = matchStrategyFactory.createMultiTableWaterfallStrategy({
    referenceTables,
    matchingRules: probabilisticConfig.matchingRules,
    thresholds: probabilisticConfig.thresholds,
    fieldMappings: probabilisticConfig.fieldMappings
  });
  
  // Generate the SQL
  return strategy.generateSql({
    sourceTable,
    sourceAlias: 's',
    targetAlias: 't'
  });
}

module.exports = {
  generateWaterfallPipeline,
  generateMultiTableWaterfallPipeline,
  generateHistoricalWaterfallPipeline,
  generateDeterministicThenProbabilisticPipeline
}; 