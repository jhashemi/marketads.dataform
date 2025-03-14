/**
 * Multi-Table Waterfall Match Strategy for Record Matching System
 * 
 * Extends the basic waterfall strategy to handle more complex scenarios
 * with multiple reference tables, each with its own priority level and
 * matching criteria. This strategy is designed for complex entity resolution
 * problems where reference data comes from multiple sources of varying quality.
 */

const { WaterfallMatchStrategy } = require('./waterfall_match_strategy');

/**
 * Multi-Table Waterfall Match Strategy
 * @extends WaterfallMatchStrategy
 */
class MultiTableWaterfallStrategy extends WaterfallMatchStrategy {
  /**
   * Create a new MultiTableWaterfallStrategy
   * @param {Object} options - Strategy options
   * @param {Array<Object>} options.referenceTables - Reference tables in priority order
   * @param {Object} options.matchingRules - Matching rules to apply for each table
   * @param {Object} options.thresholds - Match confidence thresholds
   * @param {Object} options.fieldMappings - Field mappings between tables
   * @param {boolean} options.allowMultipleMatches - Whether to allow multiple matches per source record
   * @param {number} options.maxMatches - Maximum number of matches to return per source record
   * @param {string} options.confidenceField - Field to store match confidence
   */
  constructor(options = {}) {
    super(options);
    
    // Override the strategy name
    this.name = 'multi_table_waterfall';
    
    // Additional options specific to multi-table strategy
    this.fieldMappings = options.fieldMappings || {};
    this.allowMultipleMatches = options.allowMultipleMatches || false;
    this.maxMatches = options.maxMatches || 1;
    this.confidenceField = options.confidenceField || 'confidence';
    
    // Enhanced reference table metadata
    if (this.referenceTables.length > 0) {
      this.referenceTables = this.referenceTables.map(table => ({
        ...table,
        tablePriority: table.tablePriority || table.priority || 1,
        confidenceMultiplier: table.confidenceMultiplier || 1.0,
        requiredFields: table.requiredFields || []
      }));
    }
  }
  
  /**
   * Generate SQL for this strategy
   * @param {Object} context - Match context
   * @returns {string} SQL for multi-table waterfall matching
   */
  generateSql(context) {
    const { sourceTable, sourceAlias = 's', targetAlias = 't', options = {} } = context || {};
    
    if (!sourceTable || this.referenceTables.length === 0) {
      throw new Error('Source table and reference tables are required for multi-table waterfall matching');
    }
    
    // Override thresholds with options if provided
    const thresholds = {
      ...this.thresholds,
      ...(options.thresholds || {})
    };
    
    // Start with CTE for source table
    let sql = `
-- Multi-table waterfall match strategy: Match against reference tables with priority tiers
WITH source_data AS (
  SELECT * FROM ${sourceTable}
)`;
    
    // Generate SQL for each reference table match
    const matchCTEs = [];
    
    this.referenceTables.forEach((refTable, index) => {
      const tableAlias = `ref_${index + 1}`;
      const matchCTE = `matches_${index + 1}`;
      const rules = this.matchingRules[refTable.id] || this.matchingRules.default;
      
      if (!rules) {
        throw new Error(`No matching rules defined for reference table ${refTable.id}`);
      }
      
      // Create join conditions incorporating required fields
      const joinCondition = this._generateEnhancedJoinCondition(rules, refTable, sourceAlias, targetAlias);
      
      // Add required field conditions if specified
      const requiredFieldsCondition = this._generateRequiredFieldsCondition(refTable, sourceAlias, targetAlias);
      
      // Generate enhanced score calculation with confidence multiplier
      const scoreCalculation = `(${this._generateScoreSql(rules, sourceAlias, targetAlias)} * ${refTable.confidenceMultiplier || 1.0})`;
      
      // Generate match SQL for this reference table
      const matchSql = `
${matchCTE} AS (
  SELECT 
    ${sourceAlias}.*,
    ${targetAlias}.id AS reference_id,
    ${targetAlias}.${refTable.keyField || 'id'} AS match_key,
    '${refTable.name || refTable.id}' AS data_source,
    ${refTable.tablePriority} AS table_priority,
    ${index + 1} AS match_priority,
    ${scoreCalculation} AS match_score,
    CASE
      WHEN ${scoreCalculation} >= ${thresholds.high} THEN 'HIGH'
      WHEN ${scoreCalculation} >= ${thresholds.medium} THEN 'MEDIUM'
      WHEN ${scoreCalculation} >= ${thresholds.low} THEN 'LOW'
      ELSE 'NONE'
    END AS ${this.confidenceField},
    ${this._generateFieldMappingSelect(refTable, targetAlias)}
  FROM source_data AS ${sourceAlias}
  JOIN ${refTable.table} AS ${targetAlias}
    ON ${joinCondition}
  WHERE ${scoreCalculation} >= ${thresholds.low}
    ${requiredFieldsCondition ? `AND ${requiredFieldsCondition}` : ''}
)`;
      
      matchCTEs.push(matchCTE);
      sql += `\n, ${matchSql}`;
    });
    
    // Generate final waterfall selection - either single best match or multiple matches
    if (this.allowMultipleMatches && this.maxMatches > 1) {
      // Multiple matches with limit per source record
      sql += this._generateMultipleMatchesSQL(matchCTEs);
    } else {
      // Single best match per source record
      sql += this._generateSingleMatchSQL(matchCTEs);
    }
    
    return sql;
  }
  
  /**
   * Generate SQL for multiple matches per source record
   * @private
   * @param {Array<string>} matchCTEs - Match CTE names
   * @returns {string} SQL for multiple matches
   */
  _generateMultipleMatchesSQL(matchCTEs) {
    return `
-- Multiple matches selection with priority and confidence ranking
, ranked_matches AS (
  SELECT 
    *,
    ROW_NUMBER() OVER (
      PARTITION BY ${this._getSourceKeyFields('source_record')}
      ORDER BY 
        table_priority,
        CASE ${this.confidenceField}
          WHEN 'HIGH' THEN 1
          WHEN 'MEDIUM' THEN 2
          WHEN 'LOW' THEN 3
          ELSE 4
        END,
        match_score DESC
    ) AS match_rank
  FROM (
    ${matchCTEs.map(cte => `SELECT * FROM ${cte}`).join('\nUNION ALL\n')}
  ) all_matches
)

-- Final result - up to max_matches per source record
SELECT * EXCEPT(match_rank)
FROM ranked_matches
WHERE match_rank <= ${this.maxMatches}
ORDER BY 
  ${this._getSourceKeyFields('source_record')},
  match_rank
`;
  }
  
  /**
   * Generate SQL for single best match per source record
   * @private
   * @param {Array<string>} matchCTEs - Match CTE names
   * @returns {string} SQL for single match
   */
  _generateSingleMatchSQL(matchCTEs) {
    return `
-- Single best match selection - takes the highest priority match for each source record
, ranked_matches AS (
  SELECT 
    *,
    ROW_NUMBER() OVER (
      PARTITION BY ${this._getSourceKeyFields('source_record')}
      ORDER BY 
        table_priority,
        CASE ${this.confidenceField}
          WHEN 'HIGH' THEN 1
          WHEN 'MEDIUM' THEN 2
          WHEN 'LOW' THEN 3
          ELSE 4
        END,
        match_score DESC
    ) AS match_rank
  FROM (
    ${matchCTEs.map(cte => `SELECT * FROM ${cte}`).join('\nUNION ALL\n')}
  ) all_matches
)

-- Final result - only the best match for each source record
SELECT * EXCEPT(match_rank)
FROM ranked_matches
WHERE match_rank = 1
`;
  }
  
  /**
   * Generate enhanced join condition with additional blocking fields
   * @private
   * @param {Object} rules - Matching rules
   * @param {Object} refTable - Reference table configuration
   * @param {string} sourceAlias - Source table alias
   * @param {string} targetAlias - Target table alias
   * @returns {string} SQL join condition
   */
  _generateEnhancedJoinCondition(rules, refTable, sourceAlias, targetAlias) {
    // Start with base join condition from parent class
    const baseJoinCondition = this._generateJoinCondition(rules, sourceAlias, targetAlias);
    
    // Add any table-specific blocking conditions
    const tableBlockingConditions = refTable.blockingConditions || [];
    
    if (tableBlockingConditions.length === 0) {
      return baseJoinCondition;
    }
    
    const additionalConditions = tableBlockingConditions
      .map(condition => {
        // Handle different types of blocking conditions
        if (typeof condition === 'string') {
          // Raw SQL condition
          return condition;
        } else if (condition.type === 'exact') {
          return `${sourceAlias}.${condition.sourceField} = ${targetAlias}.${condition.targetField}`;
        } else if (condition.type === 'null_safe') {
          return `${sourceAlias}.${condition.sourceField} <=> ${targetAlias}.${condition.targetField}`;
        } else {
          // Default to raw condition if specified
          return condition.condition || 'TRUE';
        }
      })
      .join(' AND ');
    
    return `${baseJoinCondition} AND ${additionalConditions}`;
  }
  
  /**
   * Generate required fields condition
   * @private
   * @param {Object} refTable - Reference table configuration
   * @param {string} sourceAlias - Source table alias
   * @param {string} targetAlias - Target table alias
   * @returns {string} SQL condition or empty string
   */
  _generateRequiredFieldsCondition(refTable, sourceAlias, targetAlias) {
    if (!refTable.requiredFields || refTable.requiredFields.length === 0) {
      return '';
    }
    
    return refTable.requiredFields
      .map(field => {
        if (typeof field === 'string') {
          // Simple required field (must not be null)
          return `${targetAlias}.${field} IS NOT NULL`;
        } else if (field.condition) {
          // Custom condition
          return field.condition;
        } else if (field.targetField) {
          // Source to target field comparison
          const operator = field.operator || '=';
          return `${sourceAlias}.${field.sourceField} ${operator} ${targetAlias}.${field.targetField}`;
        } else {
          // Target field not null check
          return `${targetAlias}.${field.field} IS NOT NULL`;
        }
      })
      .join(' AND ');
  }
  
  /**
   * Generate field mapping SELECT clause
   * @private
   * @param {Object} refTable - Reference table configuration
   * @param {string} targetAlias - Target table alias
   * @returns {string} SQL SELECT clause for mapped fields
   */
  _generateFieldMappingSelect(refTable, targetAlias) {
    const mappings = this.fieldMappings[refTable.id] || [];
    
    if (mappings.length === 0) {
      return '';
    }
    
    return mappings
      .map(mapping => {
        if (typeof mapping === 'string') {
          // Simple field name mapping (same name)
          return `${targetAlias}.${mapping} AS ${mapping}`;
        } else if (mapping.expression) {
          // Expression-based mapping
          return `${mapping.expression} AS ${mapping.as || mapping.targetField}`;
        } else {
          // Source to target field mapping
          return `${targetAlias}.${mapping.sourceField} AS ${mapping.targetField}`;
        }
      })
      .join(',\n    ');
  }
}

module.exports = { MultiTableWaterfallStrategy }; 