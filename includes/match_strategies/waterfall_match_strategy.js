/**
 * Waterfall Match Strategy for Record Matching System
 * 
 * Implements the strategy for matching across multiple reference tables
 * in order of confidence/priority. Records are matched against reference
 * tables in sequence, with matches from higher priority sources taking
 * precedence over lower priority sources.
 */

const { MatchStrategy } = require('../match_strategy');

/**
 * Waterfall Match Strategy
 * @extends MatchStrategy
 */
class WaterfallMatchStrategy extends MatchStrategy {
  /**
   * Create a new WaterfallMatchStrategy
   * @param {Object} options - Strategy options
   * @param {Array<Object>} options.referenceTables - Reference tables in priority order
   * @param {Object} options.matchingRules - Matching rules to apply for each table
   * @param {Object} options.thresholds - Match confidence thresholds
   */
  constructor(options = {}) {
    super('waterfall', options);
    
    this.referenceTables = options.referenceTables || [];
    this.matchingRules = options.matchingRules || {};
    this.thresholds = options.thresholds || {
      high: 0.85,
      medium: 0.70,
      low: 0.55
    };
    
    // Sort reference tables by priority if not already sorted
    if (this.referenceTables.length > 0 && !('priority' in this.referenceTables[0])) {
      this.referenceTables = this.referenceTables.map((table, index) => ({
        ...table,
        priority: index + 1
      }));
    } else {
      this.referenceTables.sort((a, b) => a.priority - b.priority);
    }
  }
  
  /**
   * Generate SQL for this strategy
   * @param {Object} context - Match context
   * @returns {string} SQL for waterfall matching
   */
  generateSql(context) {
    const { sourceTable, sourceAlias = 's', targetAlias = 't', options = {} } = context || {};
    
    if (!sourceTable || this.referenceTables.length === 0) {
      throw new Error('Source table and reference tables are required for waterfall matching');
    }
    
    // Override thresholds with options if provided
    const thresholds = {
      ...this.thresholds,
      ...(options.thresholds || {})
    };
    
    // Start with CTE for source table
    let sql = `
-- Waterfall match strategy: Match against reference tables in priority order
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
      
      // Generate match SQL for this reference table
      const matchSql = `
${matchCTE} AS (
  SELECT 
    ${sourceAlias}.*,
    ${targetAlias}.id AS reference_id,
    ${targetAlias}.${refTable.keyField || 'id'} AS match_key,
    '${refTable.name || refTable.id}' AS data_source,
    ${index + 1} AS priority,
    ${this._generateScoreSql(rules, sourceAlias, targetAlias)} AS match_score,
    CASE
      WHEN ${this._generateScoreSql(rules, sourceAlias, targetAlias)} >= ${thresholds.high} THEN 'HIGH'
      WHEN ${this._generateScoreSql(rules, sourceAlias, targetAlias)} >= ${thresholds.medium} THEN 'MEDIUM'
      WHEN ${this._generateScoreSql(rules, sourceAlias, targetAlias)} >= ${thresholds.low} THEN 'LOW'
      ELSE 'NONE'
    END AS confidence
  FROM source_data AS ${sourceAlias}
  JOIN ${refTable.table} AS ${targetAlias}
    ON ${this._generateJoinCondition(rules, sourceAlias, targetAlias)}
  WHERE ${this._generateScoreSql(rules, sourceAlias, targetAlias)} >= ${thresholds.low}
)`;
      
      matchCTEs.push(matchCTE);
      sql += `\n, ${matchSql}`;
    });
    
    // Generate final waterfall selection
    sql += `
-- Final waterfall selection - takes the highest priority match for each source record
, ranked_matches AS (
  SELECT 
    *,
    ROW_NUMBER() OVER (
      PARTITION BY ${this._getSourceKeyFields(sourceAlias)}
      ORDER BY 
        CASE confidence
          WHEN 'HIGH' THEN 1
          WHEN 'MEDIUM' THEN 2
          WHEN 'LOW' THEN 3
          ELSE 4
        END,
        priority,
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
    
    return sql;
  }
  
  /**
   * Generate the join condition for a reference table
   * @private
   * @param {Object} rules - Matching rules
   * @param {string} sourceAlias - Source table alias
   * @param {string} targetAlias - Target table alias
   * @returns {string} SQL join condition
   */
  _generateJoinCondition(rules, sourceAlias, targetAlias) {
    // Generate join conditions from blocking rules
    if (!rules.blocking || rules.blocking.length === 0) {
      // Default to true if no blocking rules (cross join)
      return 'TRUE';
    }
    
    return rules.blocking
      .map(block => {
        // Handle different types of blocking rules
        if (block.exact) {
          return `${sourceAlias}.${block.sourceField} = ${targetAlias}.${block.targetField}`;
        } else if (block.prefix) {
          const length = block.length || 3;
          return `SUBSTR(${sourceAlias}.${block.sourceField}, 1, ${length}) = SUBSTR(${targetAlias}.${block.targetField}, 1, ${length})`;
        } else if (block.phonetic) {
          return `${block.phoneticFunction}(${sourceAlias}.${block.sourceField}) = ${block.phoneticFunction}(${targetAlias}.${block.targetField})`;
        } else {
          // Default to exact match
          return `${sourceAlias}.${block.sourceField} = ${targetAlias}.${block.targetField}`;
        }
      })
      .join(' AND ');
  }
  
  /**
   * Generate the score calculation SQL
   * @private
   * @param {Object} rules - Matching rules
   * @param {string} sourceAlias - Source table alias
   * @param {string} targetAlias - Target table alias
   * @returns {string} SQL for score calculation
   */
  _generateScoreSql(rules, sourceAlias, targetAlias) {
    if (!rules.scoring || rules.scoring.length === 0) {
      return '1.0'; // Default perfect score if no scoring rules
    }
    
    // Calculate weighted sum of individual field scores
    const totalWeight = rules.scoring.reduce((sum, rule) => sum + (rule.weight || 1), 0);
    
    const fieldScores = rules.scoring.map(rule => {
      const weight = rule.weight || 1;
      const normalizedWeight = weight / totalWeight;
      
      // Generate appropriate similarity function based on rule type
      let similarityFn;
      
      switch (rule.method) {
        case 'exact':
          similarityFn = `CASE WHEN ${sourceAlias}.${rule.sourceField} = ${targetAlias}.${rule.targetField} THEN 1.0 ELSE 0.0 END`;
          break;
        case 'levenshtein':
          similarityFn = `(1.0 - LEAST(LEVENSHTEIN(${sourceAlias}.${rule.sourceField}, ${targetAlias}.${rule.targetField}) / GREATEST(LENGTH(${sourceAlias}.${rule.sourceField}), LENGTH(${targetAlias}.${rule.targetField}), 1.0), 1.0))`;
          break;
        case 'jaro_winkler':
          similarityFn = `ML.JARO_WINKLER_SIMILARITY(${sourceAlias}.${rule.sourceField}, ${targetAlias}.${rule.targetField})`;
          break;
        case 'token':
          similarityFn = `ARRAY_LENGTH(ARRAY(
            SELECT token 
            FROM UNNEST(SPLIT(UPPER(${sourceAlias}.${rule.sourceField}), ' ')) token
            INTERSECT DISTINCT
            SELECT token 
            FROM UNNEST(SPLIT(UPPER(${targetAlias}.${rule.targetField}), ' ')) token
          )) / GREATEST(
            GREATEST(
              ARRAY_LENGTH(SPLIT(UPPER(${sourceAlias}.${rule.sourceField}), ' ')),
              ARRAY_LENGTH(SPLIT(UPPER(${targetAlias}.${rule.targetField}), ' '))
            ), 1.0)`;
          break;
        default:
          similarityFn = `CASE WHEN ${sourceAlias}.${rule.sourceField} = ${targetAlias}.${rule.targetField} THEN 1.0 ELSE 0.0 END`;
      }
      
      return `(${normalizedWeight} * ${similarityFn})`;
    });
    
    return fieldScores.join(' + ');
  }
  
  /**
   * Get source key fields
   * @private
   * @param {string} sourceAlias - Source table alias
   * @returns {string} SQL for key fields
   */
  _getSourceKeyFields(sourceAlias) {
    // Use ID field if available, otherwise use all fields
    return 'id'; // This should be customized based on the actual key fields
  }
}

module.exports = WaterfallMatchStrategy; 