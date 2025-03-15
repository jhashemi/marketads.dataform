/**
 * Multi-Table Waterfall Match Strategy for Record Matching System
 * 
 * Extends the basic waterfall strategy to handle more complex scenarios
 * with multiple reference tables, each with its own priority level and
 * matching criteria. This strategy is designed for complex entity resolution
 * problems where reference data comes from multiple sources of varying quality.
 */

const { WaterfallMatchStrategy } = require('./waterfall_match_strategy');
const { validateParameters } = require('../validation/parameter_validator');
const { ValidationError } = require('../validation/validation_errors');

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
   * @param {Object} [options.fieldMappings] - Field mappings between tables
   * @param {Object} [options.requiredFields] - Required fields for each reference table
   * @param {Object} [options.confidenceMultipliers] - Confidence multipliers for each reference table
   * @param {boolean} [options.allowMultipleMatches=false] - Whether to allow multiple matches per source record
   * @param {number} [options.maxMatches=1] - Maximum number of matches to return per source record
   * @param {string} [options.confidenceField='confidence'] - Field to store match confidence
   */
  constructor(options = {}) {
    super(options);
    
    // Validate options with comprehensive parameter validation
    this._validateOptions(options);
    
    // Override the strategy name
    this.name = 'multi_table_waterfall';
    
    // Additional options specific to multi-table strategy
    this.fieldMappings = options.fieldMappings || {};
    this.requiredFields = options.requiredFields || {};
    this.confidenceMultipliers = options.confidenceMultipliers || {};
    this.allowMultipleMatches = options.allowMultipleMatches || false;
    this.maxMatches = options.maxMatches || 1;
    this.confidenceField = options.confidenceField || 'confidence';
    
    // Enhanced reference table metadata
    if (this.referenceTables.length > 0) {
      this.referenceTables = this.referenceTables.map(table => ({
        ...table,
        tablePriority: table.tablePriority || table.priority || 1,
        confidenceMultiplier: this._getConfidenceMultiplier(table.id, table.confidenceMultiplier),
        requiredFields: this._getRequiredFields(table.id, table.requiredFields || [])
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
   * Validate options with comprehensive parameter validation
   * @private
   * @param {Object} options - Strategy options
   * @throws {ValidationError} If validation fails
   */
  _validateOptions(options) {
    const validationRules = {
      required: ['referenceTables', 'matchingRules', 'thresholds'],
      types: {
        referenceTables: 'array',
        matchingRules: 'object',
        thresholds: 'object',
        fieldMappings: 'object',
        requiredFields: 'object',
        confidenceMultipliers: 'object',
        allowMultipleMatches: 'boolean',
        maxMatches: 'number',
        confidenceField: 'string'
      },
      defaults: {
        fieldMappings: {},
        requiredFields: {},
        confidenceMultipliers: {},
        allowMultipleMatches: false,
        maxMatches: 1,
        confidenceField: 'confidence'
      },
      messages: {
        referenceTables: 'Reference tables are required for multi-table waterfall matching',
        matchingRules: 'Matching rules are required for multi-table waterfall matching',
        thresholds: 'Confidence thresholds are required for multi-table waterfall matching'
      }
    };

    validateParameters(options, validationRules, 'MultiTableWaterfallStrategy');

    // Additional validation for nested structures
    if (options.referenceTables.length === 0) {
      throw new ValidationError('At least one reference table is required', 'referenceTables');
    }

    // Validate each reference table
    options.referenceTables.forEach((table, index) => {
      if (!table.id) {
        throw new ValidationError(`Reference table at index ${index} is missing an id`, 'referenceTables');
      }
      if (!table.table) {
        throw new ValidationError(`Reference table '${table.id}' is missing a table name`, 'referenceTables');
      }
    });

    // Validate thresholds
    const { thresholds } = options;
    if (!thresholds.high || !thresholds.medium || !thresholds.low) {
      throw new ValidationError('Thresholds must include high, medium, and low values', 'thresholds');
    }
  }
  
  /**
   * Get confidence multiplier for a reference table
   * @private
   * @param {string} tableId - Reference table ID
   * @param {number} [defaultMultiplier=1.0] - Default multiplier if not specified
   * @returns {number} Confidence multiplier
   */
  _getConfidenceMultiplier(tableId, defaultMultiplier = 1.0) {
    if (this.confidenceMultipliers[tableId]) {
      const multiplier = parseFloat(this.confidenceMultipliers[tableId]);
      return isNaN(multiplier) ? defaultMultiplier : multiplier;
    }
    return parseFloat(defaultMultiplier) || 1.0;
  }
  
  /**
   * Get required fields for a reference table
   * @private
   * @param {string} tableId - Reference table ID
   * @param {Array<string>} defaultFields - Default required fields
   * @returns {Array<string>} Required fields
   */
  _getRequiredFields(tableId, defaultFields = []) {
    return this.requiredFields[tableId] || defaultFields || [];
  }
  
  /**
   * Generate SQL for this strategy
   * @param {Object} context - Match context
   * @returns {string} SQL for multi-table waterfall matching
   */
  generateSql(context) {
    const { sourceTable, sourceAlias = 's', targetAlias = 't', options = {} } = context || {};
    
    if (!sourceTable || this.referenceTables.length === 0) {
      throw new ValidationError('Source table and reference tables are required for multi-table waterfall matching', 'generateSql');
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
    const batchSize = 5;
    
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
          throw new ValidationError(`No matching rules defined for reference table ${refTable.id}`, 'matchingRules');
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
   * Generate enhanced SQL for field mapping from target table
   * @private
   * @param {Object} refTable - Reference table configuration
   * @param {string} targetAlias - Target table alias
   * @returns {string} SQL for field mapping
   */
  _generateFieldMappingSelect(refTable, targetAlias) {
    // Get table-specific field mappings if available
    const mappings = this.fieldMappings[refTable.id] || [];
    
    if (mappings.length === 0) {
      return `${targetAlias}.*`;
    }
    
    const mappingExpressions = mappings.map(mapping => {
      // Handle both simple field mappings and complex expressions
      if (mapping.expression) {
        return `${mapping.expression} AS ${this._escapeFieldName(mapping.as || 'expr')}`;
      } else if (mapping.sourceField && mapping.targetField) {
        return `COALESCE(${targetAlias}.${this._escapeFieldName(mapping.sourceField)}, NULL) AS ${this._escapeFieldName(mapping.targetField)}`;
      }
      return null;
    }).filter(Boolean);
    
    if (mappingExpressions.length === 0) {
      return `${targetAlias}.*`;
    }
    
    return `${targetAlias}.*, ${mappingExpressions.join(', ')}`;
  }
  
  /**
   * Generate required fields condition for WHERE clause
   * @private
   * @param {Object} refTable - Reference table configuration
   * @param {string} sourceAlias - Source table alias
   * @param {string} targetAlias - Target table alias
   * @returns {string|null} SQL for required fields condition or null if none
   */
  _generateRequiredFieldsCondition(refTable, sourceAlias, targetAlias) {
    const requiredFields = refTable.requiredFields || [];
    
    if (requiredFields.length === 0) {
      return null;
    }
    
    const conditions = requiredFields.map(field => {
      // Determine if field is in source or target table
      if (field.includes(':')) {
        const [tableType, fieldName] = field.split(':');
        const alias = tableType.toLowerCase() === 'source' ? sourceAlias : targetAlias;
        return `${alias}.${this._escapeFieldName(fieldName)} IS NOT NULL`;
      }
      
      // Default is to check field in target table
      return `${targetAlias}.${this._escapeFieldName(field)} IS NOT NULL`;
    });
    
    return `(${conditions.join(' AND ')})`;
  }
  
  /**
   * Generate an enhanced join condition that incorporates blocking rules
   * @private
   * @param {Object} rules - Matching rules
   * @param {Object} refTable - Reference table configuration
   * @param {string} sourceAlias - Source table alias
   * @param {string} targetAlias - Target table alias
   * @returns {string} JOIN condition SQL
   */
  _generateEnhancedJoinCondition(rules, refTable, sourceAlias, targetAlias) {
    if (!rules.blocking || rules.blocking.length === 0) {
      // Default to true if no blocking rules (performance warning)
      console.warn(`Warning: No blocking rules defined for ${refTable.id}. This will result in a cross join.`);
      return 'TRUE';
    }
    
    // Create join conditions from blocking rules
    const conditions = rules.blocking.map(block => {
      const { sourceField, targetField, method = 'exact', exact = true } = block;
      
      if (!sourceField || !targetField) {
        throw new ValidationError(`Invalid blocking rule: source and target fields are required`, 'blockingRule');
      }
      
      if (exact || method === 'exact') {
        return `${sourceAlias}.${this._escapeFieldName(sourceField)} = ${targetAlias}.${this._escapeFieldName(targetField)}`;
      } else if (method === 'prefix') {
        return `STARTS_WITH(${sourceAlias}.${this._escapeFieldName(sourceField)}, ${targetAlias}.${this._escapeFieldName(targetField)})`;
      } else if (method === 'contains') {
        return `STRPOS(${sourceAlias}.${this._escapeFieldName(sourceField)}, ${targetAlias}.${this._escapeFieldName(targetField)}) > 0`;
      } else if (method === 'soundex') {
        return `SOUNDEX(${sourceAlias}.${this._escapeFieldName(sourceField)}) = SOUNDEX(${targetAlias}.${this._escapeFieldName(targetField)})`;
      }
      
      // Default to exact match
      return `${sourceAlias}.${this._escapeFieldName(sourceField)} = ${targetAlias}.${this._escapeFieldName(targetField)}`;
    });
    
    return conditions.join(' AND ');
  }
  
  /**
   * Escape field names to handle special characters and keywords
   * @private
   * @param {string} fieldName - Field name to escape
   * @returns {string} Escaped field name
   */
  _escapeFieldName(fieldName) {
    if (!fieldName) return 'id';
    
    // If the field name contains special characters, escape it with backticks for BigQuery
    return fieldName.match(/[-\s.]/) ? `\`${fieldName}\`` : fieldName;
  }
  
  /**
   * Normalize thresholds to ensure valid values in descending order
   * @private
   * @param {Object} thresholds - Threshold values object
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
   * Get source key fields for partitioning
   * @private
   * @param {string} prefix - Prefix for source key fields
   * @returns {string} Source key fields SQL
   */
  _getSourceKeyFields(prefix) {
    // Dynamic implementation based on source key fields
    return 'id'; // Default for now, can be enhanced to use configuration
  }
  
  /**
   * Initialize cache for SQL fragments
   * @private
   */
  _initializeCache() {
    this._cache = {
      matchCTEs: new Map(),
      generatedSQL: new Map()
    };
  }
}

module.exports = { MultiTableWaterfallStrategy }; 