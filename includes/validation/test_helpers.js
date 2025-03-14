/**
 * Test Helpers for Validation Framework
 * 
 * Provides helper functions for creating standardized tests that correctly
 * implement the class-based factory pattern.
 */

const { ValidationRegistry, TestType, TestPriority } = require('./validation_registry');
const { withErrorHandling } = require('./error_handler');

// Import factory classes
const { MatchStrategyFactory } = require('../match_strategy_factory');
const { MatchingSystemFactory } = require('../matching_system_factory');
const { HistoricalMatcherFactory } = require('../historical_matcher_factory');

// Create shared factory instances
const matchStrategyFactory = new MatchStrategyFactory();
const matchingSystemFactory = new MatchingSystemFactory();
const historicalMatcherFactory = new HistoricalMatcherFactory();

/**
 * Creates a standard test configuration for waterfall strategy tests
 * @param {Object} options - Test options
 * @param {string} options.sourceTable - Source table name
 * @param {Array<Object>} options.referenceTables - Reference tables
 * @param {Object} options.matchingRules - Matching rules
 * @param {Object} options.thresholds - Confidence thresholds
 * @param {Object} [options.fieldMappings] - Field mappings
 * @param {Object} [options.requiredFields] - Required fields
 * @param {Object} [options.confidenceMultipliers] - Confidence multipliers
 * @returns {Object} Test configuration
 */
function createWaterfallTestConfig(options) {
  return {
    sourceTable: options.sourceTable,
    referenceTables: options.referenceTables,
    matchingRules: options.matchingRules,
    thresholds: options.thresholds,
    fieldMappings: options.fieldMappings || {},
    requiredFields: options.requiredFields || {},
    confidenceMultipliers: options.confidenceMultipliers || {}
  };
}

/**
 * Creates a standard test function for waterfall strategy tests
 * @param {Function} validator - Function that validates the generated SQL
 * @returns {Function} Test function
 */
function createWaterfallTestFn(validator) {
  return withErrorHandling(async function(context) {
    const { parameters } = context;
    
    // Create strategy
    const strategy = matchStrategyFactory.createWaterfallStrategy({
      referenceTables: parameters.referenceTables,
      matchingRules: parameters.matchingRules,
      thresholds: parameters.thresholds,
      fieldMappings: parameters.fieldMappings,
      requiredFields: parameters.requiredFields,
      confidenceMultipliers: parameters.confidenceMultipliers
    });
    
    // Generate SQL
    const sql = strategy.generateSql({
      sourceTable: parameters.sourceTable,
      sourceAlias: 's',
      targetAlias: 't'
    });
    
    // Validate SQL with provided validator function
    return validator(sql, parameters);
  });
}

/**
 * Creates a standard test function for multi-table waterfall strategy tests
 * @param {Function} validator - Function that validates the generated SQL
 * @returns {Function} Test function
 */
function createMultiTableWaterfallTestFn(validator) {
  return withErrorHandling(async function(context) {
    const { parameters } = context;
    
    // Create strategy
    const strategy = matchStrategyFactory.createMultiTableWaterfallStrategy({
      referenceTables: parameters.referenceTables,
      matchingRules: parameters.matchingRules,
      thresholds: parameters.thresholds,
      fieldMappings: parameters.fieldMappings,
      requiredFields: parameters.requiredFields,
      confidenceMultipliers: parameters.confidenceMultipliers
    });
    
    // Generate SQL
    const sql = strategy.generateSql({
      sourceTable: parameters.sourceTable,
      sourceAlias: 's',
      targetAlias: 't'
    });
    
    // Validate SQL with provided validator function
    return validator(sql, parameters);
  });
}

/**
 * Creates a standard test function for matching system tests
 * @param {Function} executor - Function that performs the matching operations
 * @returns {Function} Test function
 */
function createMatchingSystemTestFn(executor) {
  return withErrorHandling(async function(context) {
    const { parameters } = context;
    if (!parameters.sourceTable) {
      throw new Error('Source table is required for MatchingSystem tests.');
    }
    if (!parameters.referenceTable) {
      throw new Error('Reference table is required for MatchingSystem tests.');
    }
    // Create matching system for executor to use
    const matchingSystem = matchingSystemFactory.createMatchingSystem({
      sourceTable: parameters.sourceTable,
      targetTables: [parameters.referenceTable],
      outputTable: 'test_output'
    });
    
    // Execute test with matching system
    return await executor(matchingSystem, context);
  });
}

/**
 * Creates a standard test function for historical matcher tests
 * @param {Function} executor - Function that performs the historical matching operations
 * @returns {Function} Test function
 */
function createHistoricalMatcherTestFn(executor) {
  return withErrorHandling(async function(context) {
    const { parameters } = context;
    if (!parameters.sourceTable && !parameters.baseTable) {
      throw new Error('Source table or base table is required for HistoricalMatcher tests.');
    }
    if (!parameters.referenceTable) {
      throw new Error('Reference table is required for HistoricalMatcher tests.');
    }
    // Create historical matcher for executor to use
    const historicalMatcher = historicalMatcherFactory.createHistoricalMatcher({
      sourceTable: parameters.sourceTable || parameters.baseTable,
      targetTables: [parameters.referenceTable],
      outputTable: 'test_output',
      incrementalMode: true,
      timestampColumn: 'last_updated'
    });
    
    // Execute test with historical matcher
    return await executor(historicalMatcher, context);
  });
}

/**
 * Creates a standard test function for transitive matcher tests
 * @param {Function} executor - Function that performs transitive matcher operations
 * @returns {Function} Test function
 */
function createTransitiveMatcherTestFn(executor) {
  return withErrorHandling(async function(context) {
    const { parameters } = context;
    if (!parameters.matchResultsTable) {
      throw new Error('Match results table is required for TransitiveMatcher tests.');
    }
    if (!parameters.confidenceThreshold) {
      throw new Error('Confidence threshold is required for TransitiveMatcher tests.');
    }
    // Create transitive matcher for executor to use
    const transitiveMatcher = new TransitiveMatcher({ // Directly use constructor since factory might not be needed for tests
      matchResultsTable: parameters.matchResultsTable,
      confidenceThreshold: parameters.confidenceThreshold,
    });

    // Execute test with transitive matcher
    return await executor(transitiveMatcher, context);
  });
}

// Export test helpers
module.exports = {
  createWaterfallTestConfig,
  createWaterfallTestFn,
  createMultiTableWaterfallTestFn,
  createMatchingSystemTestFn,
  createHistoricalMatcherTestFn,
  createTransitiveMatcherTestFn,
  matchStrategyFactory
};