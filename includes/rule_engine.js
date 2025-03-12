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
      
      strategySql.push(`
        -- ${strategy} matching strategy
        CASE
          ${caseClauses}
          ELSE 0
        END AS ${strategy}_confidence
      `);
    });
    
    // Generate the final waterfall SQL
    return `
    CASE
      WHEN deterministic_confidence > 0 THEN deterministic_confidence
      WHEN rule_based_confidence > 0 THEN rule_based_confidence
      WHEN probabilistic_confidence >= 0.85 THEN probabilistic_confidence
      ELSE 0
    END AS final_confidence,
    CASE
      WHEN deterministic_confidence > 0 THEN 'DETERMINISTIC'
      WHEN rule_based_confidence > 0 THEN 'RULE_BASED'
      WHEN probabilistic_confidence >= 0.85 THEN 'PROBABILISTIC'
      ELSE 'NO_MATCH'
    END AS match_strategy,
    STRUCT(
      deterministic_confidence,
      rule_based_confidence, 
      probabilistic_confidence
    ) AS confidence_details
    `;
  }
  
  /**
   * Generate all standardizer and similarity function SQL definitions
   * @returns {string} SQL definitions
   */
  generateFunctionDefinitions() {
    const standardizerSql = Object.entries(this.standardizers).map(([name, def]) => {
      return `
      -- Standardizer: ${name}
      CREATE OR REPLACE FUNCTION \${self()}.${name}(input STRING)
      RETURNS STRING AS (
        ${def}
      );
      `;
    });
    
    const similaritySql = Object.entries(this.similarityFunctions).map(([name, def]) => {
      return `
      -- Similarity function: ${name}
      CREATE OR REPLACE FUNCTION \${self()}.${name}(s1 STRING, s2 STRING)
      RETURNS FLOAT64 AS (
        ${def}
      );
      `;
    });
    
    return standardizerSql.join('\n\n') + '\n\n' + similaritySql.join('\n\n');
  }
}

// Export a singleton instance
const ruleEngine = new RuleEngine();

// Add common standardizers
ruleEngine.addStandardizer('standardize_name', `
  IF(input IS NULL, NULL,
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        UPPER(TRIM(input)),
        r'^(MR|MRS|MS|DR|PROF)\.?\s+', ''
      ),
      r'\s+(JR|SR|I|II|III|IV|V|ESQ|MD|PHD)\.?$', ''
    )
  )
`);

ruleEngine.addStandardizer('standardize_address', `
  IF(input IS NULL, NULL,
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          UPPER(TRIM(input)),
          r'\bAPARTMENT\b|\bAPT\b', 'APT'
        ),
        r'\bAVENUE\b|\bAVE\b', 'AVE'
      ),
      r'\bSTREET\b|\bST\b', 'ST'
    )
  )
`);

ruleEngine.addStandardizer('standardize_phone', `
  IF(input IS NULL, NULL,
    REGEXP_REPLACE(input, r'[^0-9]', '')
  )
`);

// Add similarity functions
ruleEngine.addSimilarityFunction('jaro_winkler', `
  -- Using BigQuery's built-in ML.SIMILARITY function
  IF(
    s1 IS NULL OR s2 IS NULL OR LENGTH(TRIM(s1)) = 0 OR LENGTH(TRIM(s2)) = 0,
    0,
    IF(
      UPPER(TRIM(s1)) = UPPER(TRIM(s2)),
      1.0,
      (1.0 - REGEXP_EXTRACT(CAST(ML.SIMILARITY(UPPER(TRIM(s1)), UPPER(TRIM(s2))) AS STRING), r'distance: ([0-9.]+)') / 
        GREATEST(LENGTH(TRIM(s1)), LENGTH(TRIM(s2))))
    )
  )
`);

// Define common deterministic rules
ruleEngine.addRule(createRule({
  name: "exact_email_match",
  description: "Exact match on email address",
  confidence: 1.0,
  strategy: "deterministic",
  priority: 1000,
  generateSql: (s, t) => `
    ${s}.EmailAddress IS NOT NULL AND ${t}.EmailAddress IS NOT NULL AND
    LOWER(TRIM(${s}.EmailAddress)) = LOWER(TRIM(${t}.EmailAddress))
  `
}));

ruleEngine.addRule(createRule({
  name: "exact_phone_match",
  description: "Exact match on standardized phone number",
  confidence: 0.98,
  strategy: "deterministic",
  priority: 990,
  generateSql: (s, t) => `
    ${s}.PhoneNumber IS NOT NULL AND ${t}.PhoneNumber IS NOT NULL AND
    \${self()}.standardize_phone(${s}.PhoneNumber) = \${self()}.standardize_phone(${t}.PhoneNumber)
  `
}));

ruleEngine.addRule(createRule({
  name: "name_dob_address_match",
  description: "Exact match on standardized full name, DOB and address",
  confidence: 0.97,
  strategy: "deterministic",
  priority: 980,
  generateSql: (s, t) => `
    ${s}.FirstName IS NOT NULL AND ${t}.FirstName IS NOT NULL AND
    ${s}.LastName IS NOT NULL AND ${t}.LastName IS NOT NULL AND
    ${s}.DateOfBirth IS NOT NULL AND ${t}.DateOfBirth IS NOT NULL AND
    ${s}.AddressLine1 IS NOT NULL AND ${t}.AddressLine1 IS NOT NULL AND
    \${self()}.standardize_name(${s}.FirstName) = \${self()}.standardize_name(${t}.FirstName) AND
    \${self()}.standardize_name(${s}.LastName) = \${self()}.standardize_name(${t}.LastName) AND
    ${s}.DateOfBirth = ${t}.DateOfBirth AND
    \${self()}.standardize_address(${s}.AddressLine1) = \${self()}.standardize_address(${t}.AddressLine1)
  `
}));

// Define rule-based matches
ruleEngine.addRule(createRule({
  name: "last_name_first_initial_address",
  description: "Match on last name, first initial, and full address",
  confidence: 0.92,
  strategy: "rule_based",
  priority: 920,
  generateSql: (s, t) => `
    ${s}.LastName IS NOT NULL AND ${t}.LastName IS NOT NULL AND
    ${s}.FirstName IS NOT NULL AND ${t}.FirstName IS NOT NULL AND
    ${s}.AddressLine1 IS NOT NULL AND ${t}.AddressLine1 IS NOT NULL AND
    ${s}.City IS NOT NULL AND ${t}.City IS NOT NULL AND
    ${s}.State IS NOT NULL AND ${t}.State IS NOT NULL AND
    ${s}.ZipCode IS NOT NULL AND ${t}.ZipCode IS NOT NULL AND
    \${self()}.standardize_name(${s}.LastName) = \${self()}.standardize_name(${t}.LastName) AND
    SUBSTR(\${self()}.standardize_name(${s}.FirstName), 1, 1) = SUBSTR(\${self()}.standardize_name(${t}.FirstName), 1, 1) AND
    \${self()}.standardize_address(${s}.AddressLine1) = \${self()}.standardize_address(${t}.AddressLine1) AND
    UPPER(TRIM(${s}.City)) = UPPER(TRIM(${t}.City)) AND
    UPPER(TRIM(${s}.State)) = UPPER(TRIM(${t}.State)) AND
    SUBSTR(${s}.ZipCode, 1, 5) = SUBSTR(${t}.ZipCode, 1, 5)
  `
}));

ruleEngine.addRule(createRule({
  name: "email_username_last_name",
  description: "Match on email username part and last name",
  confidence: 0.90,
  strategy: "rule_based",
  priority: 900,
  generateSql: (s, t) => `
    ${s}.EmailAddress IS NOT NULL AND ${t}.EmailAddress IS NOT NULL AND
    ${s}.LastName IS NOT NULL AND ${t}.LastName IS NOT NULL AND
    SPLIT(LOWER(TRIM(${s}.EmailAddress)), '@')[OFFSET(0)] = SPLIT(LOWER(TRIM(${t}.EmailAddress)), '@')[OFFSET(0)] AND
    \${self()}.jaro_winkler(\${self()}.standardize_name(${s}.LastName), \${self()}.standardize_name(${t}.LastName)) > 0.9
  `
}));

// Define probabilistic matching
ruleEngine.addRule(createRule({
  name: "name_address_similarity",
  description: "Probabilistic match on name and address with high similarity",
  confidence: 0.88,
  strategy: "probabilistic",
  priority: 880,
  generateSql: (s, t) => `
    ${s}.FirstName IS NOT NULL AND ${t}.FirstName IS NOT NULL AND
    ${s}.LastName IS NOT NULL AND ${t}.LastName IS NOT NULL AND
    ${s}.AddressLine1 IS NOT NULL AND ${t}.AddressLine1 IS NOT NULL AND
    \${self()}.jaro_winkler(\${self()}.standardize_name(${s}.FirstName), \${self()}.standardize_name(${t}.FirstName)) > 0.85 AND
    \${self()}.jaro_winkler(\${self()}.standardize_name(${s}.LastName), \${self()}.standardize_name(${t}.LastName)) > 0.90 AND
    \${self()}.jaro_winkler(\${self()}.standardize_address(${s}.AddressLine1), \${self()}.standardize_address(${t}.AddressLine1)) > 0.80
  `
}));

ruleEngine.addRule(createRule({
  name: "full_name_dob_similarity",
  description: "Probabilistic match on full name and DOB with high similarity",
  confidence: 0.87,
  strategy: "probabilistic",
  priority: 870,
  generateSql: (s, t) => `
    ${s}.FirstName IS NOT NULL AND ${t}.FirstName IS NOT NULL AND
    ${s}.LastName IS NOT NULL AND ${t}.LastName IS NOT NULL AND
    ${s}.DateOfBirth IS NOT NULL AND ${t}.DateOfBirth IS NOT NULL AND
    \${self()}.jaro_winkler(\${self()}.standardize_name(${s}.FirstName), \${self()}.standardize_name(${t}.FirstName)) > 0.90 AND
    \${self()}.jaro_winkler(\${self()}.standardize_name(${s}.LastName), \${self()}.standardize_name(${t}.LastName)) > 0.90 AND
    ${s}.DateOfBirth = ${t}.DateOfBirth
  `
}));

module.exports = ruleEngine;
