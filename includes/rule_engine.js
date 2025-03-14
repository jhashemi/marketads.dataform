// includes/rule_engine.js
// A declarative rule engine for record linkage within Dataform

/**
 * Rule definition schema for matching logic
 * @typedef {Object} Rule
 * @property {string} name - Rule name
 * @property {string} description - Rule description
 * @property {number} confidence - Confidence score when rule matches
 * @property {Object} conditions - Field conditions for matching
 * @property {string[]} requiredFields - Fields that must be present for rule to apply
 * @property {Function} generateSql - Function that generates SQL for this rule
 */

/**
 * Creates a new rule for the matching engine
 * @param {Object} config - Rule configuration
 * @returns {Rule} - A configured rule
 */
function createRule(config) {
  // Validate rule configuration
  if (!config.name) throw new Error("Rule must have a name");
  if (!config.confidence || config.confidence < 0 || config.confidence > 1) 
    throw new Error("Rule must have a confidence between 0 and 1");
  
  // Default SQL generator based on conditions if not provided
  const generateSql = config.generateSql || function(sourceAlias, targetAlias) {
    const conditions = [];
    
    // Process exact match conditions
    if (config.exactMatches) {
      for (const field of config.exactMatches) {
        conditions.push(`
          (${sourceAlias}.${field} IS NOT NULL AND ${targetAlias}.${field} IS NOT NULL AND
           UPPER(TRIM(${sourceAlias}.${field})) = UPPER(TRIM(${targetAlias}.${field})))
        `);
      }
    }
    
    // Process standardized match conditions
    if (config.standardizedMatches) {
      for (const [field, standardizer] of Object.entries(config.standardizedMatches)) {
        conditions.push(`
          (${sourceAlias}.${field} IS NOT NULL AND ${targetAlias}.${field} IS NOT NULL AND
           ${standardizer}(${sourceAlias}.${field}) = ${standardizer}(${targetAlias}.${field}))
        `);
      }
    }
    
    // Process similarity matches with thresholds
    if (config.similarityMatches) {
      for (const [field, details] of Object.entries(config.similarityMatches)) {
        const {function: simFunc, threshold} = details;
        conditions.push(`
          (${sourceAlias}.${field} IS NOT NULL AND ${targetAlias}.${field} IS NOT NULL AND
           ${simFunc}(${sourceAlias}.${field}, ${targetAlias}.${field}) >= ${threshold})
        `);
      }
    }
    
    // Custom conditions
    if (config.customConditions) {
      conditions.push(config.customConditions(sourceAlias, targetAlias));
    }
    
    // Join all conditions with AND or OR based on configuration
    const operator = config.matchType === 'ANY' ? 'OR' : 'AND';
    return conditions.join(` ${operator} `);
  };
  
  return {
    name: config.name,
    description: config.description || "",
    confidence: config.confidence,
    requiredFields: config.requiredFields || [],
    generateSql: generateSql,
    priority: config.priority || config.confidence * 100, // Default priority based on confidence
    strategy: config.strategy || "deterministic"
  };
}

/**
 * The Rule Engine for managing all matching rules
 */
class RuleEngine {
  constructor() {
    this.rules = [];
    this.standardizers = {};
    this.similarityFunctions = {};
  }
  
  /**
   * Add a rule to the engine
   * @param {Rule} rule - The rule to add
   */
  addRule(rule) {
    this.rules.push(rule);
    // Sort rules by priority descending
    this.rules.sort((a, b) => b.priority - a.priority);
  }
  
  /**
   * Add a standardizer function definition
   * @param {string} name - Standardizer name
   * @param {string} sqlDefinition - SQL definition for the standardizer
   */
  addStandardizer(name, sqlDefinition) {
    this.standardizers[name] = sqlDefinition;
  }
  
  /**
   * Add a similarity function definition
   * @param {string} name - Function name
   * @param {string} sqlDefinition - SQL definition for the function
   */
  addSimilarityFunction(name, sqlDefinition) {
    this.similarityFunctions[name] = sqlDefinition;
  }
  
  /**
   * Generate SQL for all rules in the waterfall pattern
   * @param {string} sourceAlias - SQL alias for source table
   * @param {string} targetAlias - SQL alias for target table
   * @returns {string} - SQL for waterfall rule evaluation
   */
  generateWaterfallSql(sourceAlias, targetAlias) {
    // Group rules by strategy for the waterfall
    const strategies = {};
    this.rules.forEach(rule => {
      if (!strategies[rule.strategy]) {
        strategies[rule.strategy] = [];
      }
      strategies[rule.strategy].push(rule);
    });
    
    // Generate SQL for each strategy level
    const strategySql = [];
    Object.entries(strategies).forEach(([strategy, rules]) => {
      const caseClauses = rules.map(rule => {
        return `WHEN ${rule.generateSql(sourceAlias, targetAlias)} THEN ${rule.confidence}`;
      }).join('\n');
      strategySql.push(`-- ${strategy} matching strategy\nCASE\n  ${caseClauses}\n  ELSE 0\nEND AS ${strategy}_confidence`);
    });
    
    // Return the concatenated SQL from all strategy groups
    return strategySql.join('\n\n');
  }
  
  /**
   * Generate all standardizer and similarity function SQL definitions
   * @returns {string} SQL definitions
   */
  generateFunctionDefinitions() {
    let definitions = '';
    Object.entries(this.standardizers).forEach(([name, sql]) => {
      definitions += `${name}: ${sql}\n`;
    });
    Object.entries(this.similarityFunctions).forEach(([name, sql]) => {
      definitions += `${name}: ${sql}\n`;
    });
    return definitions;
  }
}

// Remove any singleton instance export and export only createRule and RuleEngine
module.exports = {
  createRule: createRule,
  RuleEngine: RuleEngine
};
