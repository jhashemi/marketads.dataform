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
      
      // Sort tables by priority to optimize matching (highest priority first)
      this.referenceTables.sort((a, b) => a.tablePriority - b.tablePriority);
    }
    
    // Validate that we have matching rules for each reference table
    this._validateMatchingRules();
    
    // Initialize SQL fragment cache
    this._initializeCache();
  }
  
  /**
   * Initialize the SQL fragment cache
   * @private
   */
  _initializeCache() {
    this._cache = {
      // Cache for join conditions by rule set
      joinConditions: new Map(),
      // Cache for required fields conditions by table
      requiredFieldsConditions: new Map(),
      // Cache for field mapping SELECT clauses by table
      fieldMappingSelects: new Map(),
      // Cache for generated match CTEs
      matchCTEs: new Map(),
      // Cache for complete SQL by source table
      generatedSQL: new Map()
    };
  }
  
  /**
   * Validate that we have matching rules for each reference table
   * @private
   */
  _validateMatchingRules() {
    if (!this.matchingRules || Object.keys(this.matchingRules).length === 0) {
      throw new Error('No matching rules defined for any reference table');
    }
    
    // Check each reference table has matching rules
    this.referenceTables.forEach(refTable => {
      if (!this.matchingRules[refTable.id] && !this.matchingRules.default) {
        throw new Error(`No matching rules defined for reference table ${refTable.id}`);
      }
    });
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
    
    // Create a cache key for this specific context
    const cacheKey = `${sourceTable}:${sourceAlias}:${targetAlias}:${JSON.stringify(options)}`;
    
    // Check if we already have cached SQL for this exact context
    if (this._cache.generatedSQL.has(cacheKey)) {
      return this._cache.generatedSQL.get(cacheKey);
    }
    
    // Override thresholds with options if provided
    const thresholds = {
      ...this.thresholds,
      ...(options.thresholds || {})
    };
    
    // Validate and normalize thresholds to ensure they're valid numbers
    this._normalizeThresholds(thresholds);
    
    // Start with CTE for source table
    let sql = `
-- Multi-table waterfall match strategy: Match against reference tables with priority tiers
WITH source_data AS (
  SELECT * FROM ${sourceTable}
)`;
    
    // Generate SQL for each reference table match
    const matchCTEs = [];
    const batchSize = 5; // Process reference tables in batches for better memory usage
    
    // Process reference tables in batches to optimize memory usage for large numbers of tables
    for (let i = 0; i < this.referenceTables.length; i += batchSize) {
      const batch = this.referenceTables.slice(i, i + batchSize);
      
      batch.forEach((refTable, index) => {
        const batchIndex = i + index;
        const tableAlias = `ref_${batchIndex + 1}`;
        const matchCTE = `matches_${batchIndex + 1}`;
        
        // Check if we already have a cached CTE for this reference table and context
        const tableCacheKey = `${refTable.id}:${sourceTable}:${sourceAlias}:${targetAlias}`;
        if (this._cache.matchCTEs.has(tableCacheKey)) {
          const cachedCTE = this._cache.matchCTEs.get(tableCacheKey);
          matchCTEs.push(cachedCTE.name);
          sql += `\n, ${cachedCTE.sql}`;
          return;
        }
        
        const rules = this.matchingRules[refTable.id] || this.matchingRules.default;
        
        if (!rules) {
          throw new Error(`No matching rules defined for reference table ${refTable.id}`);
        }
        
        // Create join conditions incorporating required fields
        const joinCondition = this._generateEnhancedJoinCondition(rules, refTable, sourceAlias, targetAlias);
        
        // Add required field conditions if specified
        const requiredFieldsCondition = this._generateRequiredFieldsCondition(refTable, sourceAlias, targetAlias);
        
        // Generate enhanced score calculation with confidence multiplier
        const confidenceMultiplier = parseFloat(refTable.confidenceMultiplier || 1.0);
        const scoreCalculation = `(${this._generateScoreSql(rules, sourceAlias, targetAlias)} * ${confidenceMultiplier})`;
        
        // Generate field mappings
        const fieldMappingSelect = this._generateFieldMappingSelect(refTable, targetAlias);
        
        // Handle empty reference tables with EXISTS check
        const matchSql = `
${matchCTE} AS (
  SELECT 
    ${sourceAlias}.*,
    ${targetAlias}.id AS reference_id,
    ${targetAlias}.${this._escapeFieldName(refTable.keyField || 'id')} AS match_key,
    '${refTable.name || refTable.id}' AS data_source,
    ${refTable.tablePriority} AS table_priority,
    ${batchIndex + 1} AS match_priority,
    ${scoreCalculation} AS match_score,
    CASE
      WHEN ${scoreCalculation} >= ${thresholds.high} THEN 'HIGH'
      WHEN ${scoreCalculation} >= ${thresholds.medium} THEN 'MEDIUM'
      WHEN ${scoreCalculation} >= ${thresholds.low} THEN 'LOW'
      ELSE 'NONE'
    END AS ${this._escapeFieldName(this.confidenceField)},
    ${fieldMappingSelect}
  FROM source_data AS ${sourceAlias}
  JOIN ${refTable.table} AS ${targetAlias}
    ON ${joinCondition}
  WHERE 
    -- Check if table has data
    EXISTS (SELECT 1 FROM ${refTable.table} LIMIT 1)
    -- Apply score threshold
    AND ${scoreCalculation} >= ${thresholds.low}
    ${requiredFieldsCondition ? `AND ${requiredFieldsCondition}` : ''}
)`;
        
        // Cache the generated CTE
        this._cache.matchCTEs.set(tableCacheKey, { name: matchCTE, sql: matchSql });
        
        matchCTEs.push(matchCTE);
        sql += `\n, ${matchSql}`;
      });
    }
    
    // Generate final waterfall selection - either single best match or multiple matches
    if (this.allowMultipleMatches && this.maxMatches > 1) {
      // Multiple matches with limit per source record
      sql += this._generateMultipleMatchesSQL(matchCTEs);
    } else {
      // Single best match per source record
      sql += this._generateSingleMatchSQL(matchCTEs);
    }
    
    // Cache the complete SQL for this context
    this._cache.generatedSQL.set(cacheKey, sql);
    
    return sql;
  }
  
  /**
   * Normalize thresholds to ensure they're valid numbers
   * @private
   * @param {Object} thresholds - Threshold values
   */
  _normalizeThresholds(thresholds) {
    // Ensure thresholds are valid numbers between 0 and 1
    thresholds.high = Math.min(1, Math.max(0, parseFloat(thresholds.high) || 0.85));
    thresholds.medium = Math.min(1, Math.max(0, parseFloat(thresholds.medium) || 0.70));
    thresholds.low = Math.min(1, Math.max(0, parseFloat(thresholds.low) || 0.55));
    
    // Ensure thresholds are in descending order
    thresholds.high = Math.max(thresholds.high, thresholds.medium, thresholds.low);
    thresholds.medium = Math.min(thresholds.high, Math.max(thresholds.medium, thresholds.low));
    thresholds.low = Math.min(thresholds.high, thresholds.medium, thresholds.low);
  }
  
  /**
   * Generate SQL for multiple matches per source record
   * @private
   * @param {Array<string>} matchCTEs - Match CTE names
   * @returns {string} SQL for multiple matches
   */
  _generateMultipleMatchesSQL(matchCTEs) {
    // Optimize for large numbers of CTEs by batching UNION ALL operations
    const batchSize = 10;
    let unionSQL = '';
    
    // Process match CTEs in batches for better performance with large numbers of tables
    for (let i = 0; i < matchCTEs.length; i += batchSize) {
      const batch = matchCTEs.slice(i, i + batchSize);
      const batchSQL = batch.map(cte => `SELECT * FROM ${cte}`).join('\nUNION ALL\n');
      
      if (unionSQL) {
        unionSQL = `${unionSQL}\nUNION ALL\n${batchSQL}`;
      } else {
        unionSQL = batchSQL;
      }
    }
    
    return `
-- Multiple matches selection with priority and confidence ranking
, ranked_matches AS (
  SELECT 
    *,
    ROW_NUMBER() OVER (
      PARTITION BY ${this._getSourceKeyFields('source_record')}
      ORDER BY 
        table_priority,
        CASE ${this._escapeFieldName(this.confidenceField)}
          WHEN 'HIGH' THEN 1
          WHEN 'MEDIUM' THEN 2
          WHEN 'LOW' THEN 3
          ELSE 4
        END,
        match_score DESC
    ) AS match_rank
  FROM (
    ${unionSQL}
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
    // Optimize for large numbers of CTEs by batching UNION ALL operations
    const batchSize = 10;
    let unionSQL = '';
    
    // Process match CTEs in batches for better performance with large numbers of tables
    for (let i = 0; i < matchCTEs.length; i += batchSize) {
      const batch = matchCTEs.slice(i, i + batchSize);
      const batchSQL = batch.map(cte => `SELECT * FROM ${cte}`).join('\nUNION ALL\n');
      
      if (unionSQL) {
        unionSQL = `${unionSQL}\nUNION ALL\n${batchSQL}`;
      } else {
        unionSQL = batchSQL;
      }
    }
    
    return `
-- Single best match selection - takes the highest priority match for each source record
, ranked_matches AS (
  SELECT 
    *,
    ROW_NUMBER() OVER (
      PARTITION BY ${this._getSourceKeyFields('source_record')}
      ORDER BY 
        table_priority,
        CASE ${this._escapeFieldName(this.confidenceField)}
          WHEN 'HIGH' THEN 1
          WHEN 'MEDIUM' THEN 2
          WHEN 'LOW' THEN 3
          ELSE 4
        END,
        match_score DESC
    ) AS match_rank
  FROM (
    ${unionSQL}
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
    // Create a cache key for this specific join condition
    const cacheKey = `${refTable.id}:${JSON.stringify(rules)}:${sourceAlias}:${targetAlias}`;
    
    // Check if we already have a cached join condition
    if (this._cache.joinConditions.has(cacheKey)) {
      return this._cache.joinConditions.get(cacheKey);
    }
    
    // Start with base join condition from parent class or overridden method
    const baseJoinCondition = this._generateJoinCondition(rules, sourceAlias, targetAlias);
    
    // Add any table-specific blocking conditions
    const tableBlockingConditions = refTable.blockingConditions || [];
    
    if (tableBlockingConditions.length === 0) {
      // Cache and return the base condition
      this._cache.joinConditions.set(cacheKey, baseJoinCondition);
      return baseJoinCondition;
    }
    
    const additionalConditions = tableBlockingConditions
      .map(condition => {
        // Handle different types of blocking conditions
        if (typeof condition === 'string') {
          // Raw SQL condition
          return condition;
        } else if (condition.type === 'exact') {
          return `${sourceAlias}.${this._escapeFieldName(condition.sourceField)} = ${targetAlias}.${this._escapeFieldName(condition.targetField)}`;
        } else if (condition.type === 'null_safe') {
          return `${sourceAlias}.${this._escapeFieldName(condition.sourceField)} <=> ${targetAlias}.${this._escapeFieldName(condition.targetField)}`;
        } else {
          // Default to raw condition if specified
          return condition.condition || 'TRUE';
        }
      })
      .join(' AND ');
    
    const enhancedCondition = `${baseJoinCondition} AND ${additionalConditions}`;
    
    // Cache the result
    this._cache.joinConditions.set(cacheKey, enhancedCondition);
    
    return enhancedCondition;
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
    
    // Create a cache key for this specific required fields condition
    const cacheKey = `${refTable.id}:${sourceAlias}:${targetAlias}`;
    
    // Check if we already have a cached condition
    if (this._cache.requiredFieldsConditions.has(cacheKey)) {
      return this._cache.requiredFieldsConditions.get(cacheKey);
    }
    
    const condition = refTable.requiredFields
      .map(field => {
        if (typeof field === 'string') {
          // Simple required field (must not be null)
          return `${targetAlias}.${this._escapeFieldName(field)} IS NOT NULL`;
        } else if (field.condition) {
          // Custom condition
          return field.condition;
        } else if (field.targetField) {
          // Source to target field comparison
          const operator = field.operator || '=';
          return `${sourceAlias}.${this._escapeFieldName(field.sourceField)} ${operator} ${targetAlias}.${this._escapeFieldName(field.targetField)}`;
        } else {
          // Target field not null check
          return `${targetAlias}.${this._escapeFieldName(field.field)} IS NOT NULL`;
        }
      })
      .join(' AND ');
    
    // Cache the result
    this._cache.requiredFieldsConditions.set(cacheKey, condition);
    
    return condition;
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
    
    // Create a cache key for this specific field mapping SELECT clause
    const cacheKey = `${refTable.id}:${targetAlias}`;
    
    // Check if we already have a cached SELECT clause
    if (this._cache.fieldMappingSelects.has(cacheKey)) {
      return this._cache.fieldMappingSelects.get(cacheKey);
    }
    
    const select = mappings
      .map(mapping => {
        if (typeof mapping === 'string') {
          // Simple field name mapping (same name)
          return `${targetAlias}.${this._escapeFieldName(mapping)} AS ${this._escapeFieldName(mapping)}`;
        } else if (mapping.expression) {
          // Expression-based mapping
          return `${mapping.expression} AS ${this._escapeFieldName(mapping.as || mapping.targetField)}`;
        } else {
          // Source to target field mapping with COALESCE to handle missing fields
          return `COALESCE(${targetAlias}.${this._escapeFieldName(mapping.sourceField)}, NULL) AS ${this._escapeFieldName(mapping.targetField)}`;
        }
      })
      .join(',\n    ');
    
    // Cache the result
    this._cache.fieldMappingSelects.set(cacheKey, select);
    
    return select;
  }
  
  /**
   * Escape field names that contain special characters
   * @private
   * @param {string} fieldName - Field name to escape
   * @returns {string} Escaped field name
   */
  _escapeFieldName(fieldName) {
    if (!fieldName) return 'id';
    
    // If the field name contains special characters, escape it with backticks
    return fieldName.match(/[-\s.]/) ? `\`${fieldName}\`` : fieldName;
  }
  
  /**
   * Override the base class method to handle special characters in field names
   * @private
   * @param {Object} rules - Matching rules
   * @param {string} sourceAlias - Source table alias
   * @param {string} targetAlias - Target table alias
   * @returns {string} SQL join condition
   */
  _generateJoinCondition(rules, sourceAlias, targetAlias) {
    // If no rules or no blocking rules, return TRUE (cross join)
    if (!rules || !rules.blocking || !Array.isArray(rules.blocking) || rules.blocking.length === 0) {
      return 'TRUE';
    }
    
    return rules.blocking
      .map(rule => {
        // Check if custom condition is provided
        if (rule.condition) {
          return rule.condition;
        }
        
        // Get field names and escape them if needed
        const sourceField = this._escapeFieldName(rule.sourceField);
        const targetField = this._escapeFieldName(rule.targetField);
        
        // Check if exact match or other type
        if (rule.exact) {
          return `${sourceAlias}.${sourceField} = ${targetAlias}.${targetField}`;
        } else if (rule.method === 'soundex') {
          return `SOUNDEX(${sourceAlias}.${sourceField}) = SOUNDEX(${targetAlias}.${targetField})`;
        } else if (rule.method === 'substring') {
          const length = rule.length || 3;
          return `SUBSTRING(${sourceAlias}.${sourceField}, 1, ${length}) = SUBSTRING(${targetAlias}.${targetField}, 1, ${length})`;
        } else {
          // Default to equality
          return `${sourceAlias}.${sourceField} = ${targetAlias}.${targetField}`;
        }
      })
      .join(' AND ');
  }
  
  /**
   * Clear the SQL fragment cache
   * This can be useful when configuration changes
   */
  clearCache() {
    this._initializeCache();
  }
}

module.exports = { MultiTableWaterfallStrategy }; 