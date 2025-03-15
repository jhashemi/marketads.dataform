/**
 * Custom SQL Templates
 * 
 * This module provides a flexible way to define and use custom SQL templates
 * with built-in support for different SQL dialects and performance optimizations.
 * It allows for reusable, parameterized SQL templates that can be used across
 * different database systems.
 */

const { SqlGenerationError } = require('../core/errors');
const { getDialectHandler, compileDialectTemplate, DEFAULT_DIALECT } = require('./dialect_handlers');

/**
 * Template registry to store and manage named SQL templates
 */
class TemplateRegistry {
  constructor() {
    this.templates = new Map();
    this.templateCache = new Map();
  }
  
  /**
   * Register a new SQL template
   * @param {string} name - Template name
   * @param {string|Object} template - Template string or object with dialect-specific templates
   * @param {Object} [options] - Registration options
   * @param {boolean} [options.allowOverride=false] - Whether to allow overriding existing templates
   * @returns {boolean} Success indicator
   */
  register(name, template, options = {}) {
    if (!name || typeof name !== 'string') {
      throw new SqlGenerationError('Template name is required', 'templateName');
    }
    
    if (!template) {
      throw new SqlGenerationError('Template content is required', 'template');
    }
    
    const { allowOverride = false } = options;
    
    if (this.templates.has(name) && !allowOverride) {
      throw new SqlGenerationError(`Template '${name}' already exists`, 'templateName');
    }
    
    // Store template - can be string or object with dialect-specific templates
    this.templates.set(name, template);
    
    // Clear cache entries for this template
    this._clearCacheForTemplate(name);
    
    return true;
  }
  
  /**
   * Get a template by name
   * @param {string} name - Template name
   * @param {string} [dialect=DEFAULT_DIALECT] - SQL dialect
   * @returns {string} Template string
   */
  get(name, dialect = DEFAULT_DIALECT) {
    if (!this.templates.has(name)) {
      throw new SqlGenerationError(`Template '${name}' not found`, 'templateName');
    }
    
    const template = this.templates.get(name);
    
    // If template is an object with dialect-specific versions
    if (typeof template === 'object' && !Array.isArray(template)) {
      const dialectKey = dialect.toLowerCase();
      
      // Check for exact dialect match
      if (template[dialectKey]) {
        return template[dialectKey];
      }
      
      // Check for default template
      if (template.default) {
        return template.default;
      }
      
      throw new SqlGenerationError(`No template found for dialect '${dialect}' and no default template exists`, 'dialect');
    }
    
    // If template is a string, return it directly
    return template;
  }
  
  /**
   * Render a template with parameters
   * @param {string} name - Template name
   * @param {Object} params - Parameters to substitute
   * @param {Object} [options] - Render options
   * @param {string} [options.dialect=DEFAULT_DIALECT] - SQL dialect
   * @param {boolean} [options.useCache=true] - Whether to use the template cache
   * @returns {string} Rendered SQL
   */
  render(name, params = {}, options = {}) {
    const { dialect = DEFAULT_DIALECT, useCache = true } = options;
    
    // Create cache key
    const cacheKey = this._createCacheKey(name, params, dialect);
    
    // Check cache if enabled
    if (useCache && this.templateCache.has(cacheKey)) {
      return this.templateCache.get(cacheKey);
    }
    
    // Get template
    const template = this.get(name, dialect);
    
    // Compile template with parameters
    const sql = compileDialectTemplate(template, params, dialect);
    
    // Cache result if caching is enabled
    if (useCache) {
      this.templateCache.set(cacheKey, sql);
    }
    
    return sql;
  }
  
  /**
   * Create a cache key for a template render
   * @private
   * @param {string} name - Template name
   * @param {Object} params - Parameters
   * @param {string} dialect - SQL dialect
   * @returns {string} Cache key
   */
  _createCacheKey(name, params, dialect) {
    const paramsKey = JSON.stringify(params);
    return `${name}:${dialect}:${paramsKey}`;
  }
  
  /**
   * Clear cache entries for a specific template
   * @private
   * @param {string} name - Template name
   */
  _clearCacheForTemplate(name) {
    // Clear all cache entries that start with the template name
    const keysToDelete = [];
    for (const key of this.templateCache.keys()) {
      if (key.startsWith(`${name}:`)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.templateCache.delete(key));
  }
  
  /**
   * Clear the entire template cache
   */
  clearCache() {
    this.templateCache.clear();
  }
  
  /**
   * Delete a template
   * @param {string} name - Template name
   * @returns {boolean} Success indicator
   */
  delete(name) {
    if (!this.templates.has(name)) {
      return false;
    }
    
    this.templates.delete(name);
    this._clearCacheForTemplate(name);
    
    return true;
  }
  
  /**
   * Get all template names
   * @returns {string[]} Template names
   */
  getTemplateNames() {
    return Array.from(this.templates.keys());
  }
}

// Create global template registry
const templateRegistry = new TemplateRegistry();

/**
 * SQL Generator for custom templates
 */
class SqlGenerator {
  constructor(options = {}) {
    this.dialect = options.dialect || DEFAULT_DIALECT;
    this.templateRegistry = options.templateRegistry || templateRegistry;
    this.defaultParams = options.defaultParams || {};
  }
  
  /**
   * Generate SQL using a named template
   * @param {string} templateName - Template name
   * @param {Object} params - Parameters to substitute
   * @param {Object} [options] - Generation options
   * @param {string} [options.dialect] - Override the default SQL dialect
   * @returns {string} Generated SQL
   */
  generate(templateName, params = {}, options = {}) {
    const dialect = options.dialect || this.dialect;
    
    // Merge default params with provided params
    const mergedParams = { ...this.defaultParams, ...params };
    
    return this.templateRegistry.render(templateName, mergedParams, { dialect });
  }
  
  /**
   * Register a new template
   * @param {string} name - Template name
   * @param {string|Object} template - Template string or object with dialect-specific templates
   * @param {Object} [options] - Registration options
   * @returns {SqlGenerator} This instance for method chaining
   */
  registerTemplate(name, template, options = {}) {
    this.templateRegistry.register(name, template, options);
    return this;
  }
  
  /**
   * Set the default SQL dialect
   * @param {string} dialect - SQL dialect name
   * @returns {SqlGenerator} This instance for method chaining
   */
  setDialect(dialect) {
    this.dialect = dialect;
    return this;
  }
  
  /**
   * Add default parameters
   * @param {Object} params - Default parameters
   * @param {boolean} [merge=true] - Whether to merge with existing defaults
   * @returns {SqlGenerator} This instance for method chaining
   */
  setDefaultParams(params, merge = true) {
    if (merge) {
      this.defaultParams = { ...this.defaultParams, ...params };
    } else {
      this.defaultParams = params;
    }
    return this;
  }
}

// Register some built-in templates
templateRegistry.register('matchingPipeline', `
-- Matching pipeline with blocking and scoring
WITH source_data AS (
  SELECT *
  FROM {{param:sourceTable}}
),

target_data AS (
  SELECT *
  FROM {{param:targetTable}}
),

-- Apply blocking to reduce comparison space
blocked_pairs AS (
  SELECT
    s.*,
    t.*
  FROM source_data s
  JOIN target_data t
    ON {{param:blockingCondition}}
),

-- Calculate similarity scores
scored_pairs AS (
  SELECT
    *,
    {{param:scoreCalculation}} AS match_score
  FROM blocked_pairs
)

-- Apply confidence thresholds and rank matches
SELECT
  *,
  {{fn:caseWhen(match_score >= param:highThreshold, "'HIGH'", 
                match_score >= param:mediumThreshold, "'MEDIUM'", 
                match_score >= param:lowThreshold, "'LOW'", 
                "'NONE'")}} AS confidence
FROM scored_pairs
WHERE match_score >= {{param:lowThreshold}}
ORDER BY match_score DESC
`);

// Template for transitive closure
templateRegistry.register('transitiveClosure', {
  // BigQuery version (without recursive CTE)
  bigquery: `
-- Transitive closure implementation for BigQuery
WITH direct_matches AS (
  SELECT 
    {{param:sourceIdField}} as source_id,
    {{param:targetIdField}} as target_id,
    {{param:confidenceField}} as confidence,
    1 as depth,
    CONCAT('[', CAST({{param:sourceIdField}} AS STRING), ',', CAST({{param:targetIdField}} AS STRING), ']') as path
  FROM {{param:matchesTable}}
  WHERE {{param:confidenceField}} >= {{param:confidenceThreshold}}
)

-- Generate higher-level matches through iteration (non-recursive approach)
{{param:iterativeCTEs}}

-- Combine all levels of matches
, all_matches AS (
  SELECT * FROM direct_matches
  {{param:unionClauses}}
)

SELECT * FROM all_matches
ORDER BY source_id, target_id, depth
`,

  // PostgreSQL and Snowflake version (with recursive CTE)
  default: `
-- Transitive closure implementation using recursive CTE
WITH RECURSIVE transitive_matches AS (
  -- Base case: direct matches
  SELECT 
    {{param:sourceIdField}} as source_id,
    {{param:targetIdField}} as target_id,
    {{param:confidenceField}} as confidence,
    1 as depth,
    ARRAY[{{param:sourceIdField}}, {{param:targetIdField}}] as path
  FROM {{param:matchesTable}}
  WHERE {{param:confidenceField}} >= {{param:confidenceThreshold}}
  
  UNION ALL
  
  -- Recursive case: extend matches by joining with direct matches
  SELECT 
    tm.source_id,
    dm.{{param:targetIdField}} as target_id,
    tm.confidence * dm.{{param:confidenceField}} as confidence,
    tm.depth + 1 as depth,
    tm.path || dm.{{param:targetIdField}} as path
  FROM transitive_matches tm
  JOIN {{param:matchesTable}} dm ON tm.target_id = dm.{{param:sourceIdField}}
  WHERE tm.depth < {{param:maxDepth}}  -- Limit recursion depth
    AND tm.source_id != dm.{{param:targetIdField}}  -- Prevent direct cycles
    AND NOT {{fn:arrayContains('tm.path', 'dm.' + param:targetIdField)}}  -- Prevent indirect cycles
)

SELECT * FROM transitive_matches
ORDER BY source_id, target_id, depth
`
});

// SQL performance optimization template
templateRegistry.register('optimizedMatching', `
-- Performance-optimized matching with partitioning and indexes
WITH
-- Compute blocking keys with partitioning
partitioned_source AS (
  SELECT
    *,
    {{param:partitionKeyCalculation}} AS partition_key
  FROM {{param:sourceTable}}
),

partitioned_target AS (
  SELECT
    *,
    {{param:partitionKeyCalculation}} AS partition_key
  FROM {{param:targetTable}}
)

-- Efficient partitioned join
SELECT
  s.*,
  t.*,
  {{param:scoreCalculation}} AS match_score
FROM partitioned_source s
JOIN partitioned_target t
  ON s.partition_key = t.partition_key
  AND {{param:joinCondition}}
WHERE {{param:scoreCalculation}} >= {{param:minimumConfidence}}
ORDER BY match_score DESC
`);

module.exports = {
  TemplateRegistry,
  SqlGenerator,
  templateRegistry
}; 