/**
 * Test Helpers for Validation Framework
 * 
 * Provides helper functions for creating standardized tests that correctly
 * implement the class-based factory pattern.
 */

const { ValidationRegistry, TestType, TestPriority } = require('./validation_registry');
const { withErrorHandling } = require('./error_handler');
const { validateParameters } = require('./parameter_validator');

// Import factory classes
const { MatchStrategyFactory } = require('../match_strategy_factory');
const { MatchingSystemFactory } = require('../matching_system_factory');
const { HistoricalMatcherFactory } = require('../historical_matcher_factory');
const { TransitiveMatcherFactory } = require('../matching/transitive_matcher_factory');

// Create shared factory instances
const matchStrategyFactory = new MatchStrategyFactory();
const matchingSystemFactory = new MatchingSystemFactory();
const historicalMatcherFactory = new HistoricalMatcherFactory();
const transitiveMatcherFactory = new TransitiveMatcherFactory();

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
  // Define validation rules
  const validationRules = {
    required: ['sourceTable', 'referenceTables', 'matchingRules', 'thresholds'],
    types: {
      sourceTable: 'string',
      referenceTables: 'array',
      matchingRules: 'object',
      thresholds: 'object',
      fieldMappings: 'object',
      requiredFields: 'object',
      confidenceMultipliers: 'object'
    },
    defaults: {
      fieldMappings: {},
      requiredFields: {},
      confidenceMultipliers: {}
    },
    messages: {
      sourceTable: 'Please provide a source table name for the waterfall test.',
      referenceTables: 'Please provide at least one reference table for the waterfall test.',
      matchingRules: 'Please provide matching rules for the waterfall test.',
      thresholds: 'Please provide confidence thresholds for the waterfall test.'
    }
  };

  // Validate and apply defaults
  return validateParameters(options, validationRules, 'createWaterfallTestConfig');
}

/**
 * Creates a standard test function for waterfall strategy tests
 * @param {Function} validator - Function that validates the generated SQL
 * @returns {Function} Test function
 */
function createWaterfallTestFn(validator) {
  // Define validation rules for validator
  if (typeof validator !== 'function') {
    throw new Error('createWaterfallTestFn: validator must be a function');
  }

  return withErrorHandling(async function(context) {
    const { parameters } = context;
    
    // Validate parameters
    const validatedParams = createWaterfallTestConfig(parameters);
    
    // Create strategy
    const strategy = matchStrategyFactory.createWaterfallStrategy({
      referenceTables: validatedParams.referenceTables,
      matchingRules: validatedParams.matchingRules,
      thresholds: validatedParams.thresholds,
      fieldMappings: validatedParams.fieldMappings,
      requiredFields: validatedParams.requiredFields,
      confidenceMultipliers: validatedParams.confidenceMultipliers
    });
    
    // Generate SQL
    const sql = strategy.generateSql({
      sourceTable: validatedParams.sourceTable,
      sourceAlias: 's',
      targetAlias: 't'
    });
    
    // Validate SQL with provided validator function
    return validator(sql, validatedParams);
  });
}

/**
 * Creates a standard test function for multi-table waterfall strategy tests
 * @param {Function} validator - Function that validates the generated SQL
 * @returns {Function} Test function
 */
function createMultiTableWaterfallTestFn(validator) {
  // Define validation rules for validator
  if (typeof validator !== 'function') {
    throw new Error('createMultiTableWaterfallTestFn: validator must be a function');
  }

  return withErrorHandling(async function(context) {
    const { parameters } = context;
    
    // Validate parameters
    const validatedParams = createWaterfallTestConfig(parameters);
    
    // Create strategy
    const strategy = matchStrategyFactory.createMultiTableWaterfallStrategy({
      referenceTables: validatedParams.referenceTables,
      matchingRules: validatedParams.matchingRules,
      thresholds: validatedParams.thresholds,
      fieldMappings: validatedParams.fieldMappings,
      requiredFields: validatedParams.requiredFields,
      confidenceMultipliers: validatedParams.confidenceMultipliers
    });
    
    // Generate SQL
    const sql = strategy.generateSql({
      sourceTable: validatedParams.sourceTable,
      sourceAlias: 's',
      targetAlias: 't'
    });
    
    // Validate SQL with provided validator function
    return validator(sql, validatedParams);
  });
}

/**
 * Creates a standard test function for matching system tests
 * @param {Function} executor - Function that performs the matching operations
 * @returns {Function} Test function
 */
function createMatchingSystemTestFn(executor) {
  // Define validation rules for executor
  if (typeof executor !== 'function') {
    throw new Error('createMatchingSystemTestFn: executor must be a function');
  }

  return withErrorHandling(async function(context) {
    const { parameters } = context;
    
    // Define validation rules
    const validationRules = {
      required: ['sourceTable', 'referenceTable'],
      types: {
        sourceTable: 'string',
        referenceTable: 'string',
        outputTable: 'string',
        minimumConfidence: 'number',
        fieldMappings: 'object'
      },
      defaults: {
        outputTable: 'test_output',
        minimumConfidence: 0.7
      },
      messages: {
        sourceTable: 'Source table is required for MatchingSystem tests.',
        referenceTable: 'Reference table is required for MatchingSystem tests.'
      }
    };

    // Validate and apply defaults
    const validatedParams = validateParameters(parameters, validationRules, 'MatchingSystemTest');
    
    // Create matching system for executor to use
    const matchingSystem = matchingSystemFactory.createMatchingSystem({
      sourceTable: validatedParams.sourceTable,
      targetTables: [validatedParams.referenceTable],
      outputTable: validatedParams.outputTable,
      minimumConfidence: validatedParams.minimumConfidence,
      fieldMappings: validatedParams.fieldMappings
    });
    
    // Execute test with matching system
    return await executor(matchingSystem, { ...context, parameters: validatedParams });
  });
}

/**
 * Creates a standard test function for historical matcher tests
 * @param {Function} executor - Function that performs the historical matching operations
 * @returns {Function} Test function
 */
function createHistoricalMatcherTestFn(executor) {
  // Define validation rules for executor
  if (typeof executor !== 'function') {
    throw new Error('createHistoricalMatcherTestFn: executor must be a function');
  }

  return withErrorHandling(async function(context) {
    const { parameters } = context;
    
    // Define validation rules
    const validationRules = {
      required: [
        { name: 'sourceTable', condition: { ifPresent: 'baseTable', ifEquals: false } }
      ],
      alternatives: {
        sourceTable: 'baseTable'
      },
      required: ['referenceTable'],
      types: {
        sourceTable: 'string',
        baseTable: 'string',
        referenceTable: 'string',
        outputTable: 'string',
        incrementalMode: 'boolean',
        timestampColumn: 'string'
      },
      defaults: {
        outputTable: 'test_output',
        incrementalMode: true,
        timestampColumn: 'last_updated'
      },
      messages: {
        sourceTable: 'Source table or base table is required for HistoricalMatcher tests.',
        referenceTable: 'Reference table is required for HistoricalMatcher tests.'
      }
    };

    // Validate and apply defaults
    const validatedParams = validateParameters(parameters, validationRules, 'HistoricalMatcherTest');
    
    // Create historical matcher for executor to use
    const historicalMatcher = historicalMatcherFactory.createHistoricalMatcher({
      sourceTable: validatedParams.sourceTable || validatedParams.baseTable,
      targetTables: [validatedParams.referenceTable],
      outputTable: validatedParams.outputTable,
      incrementalMode: validatedParams.incrementalMode,
      timestampColumn: validatedParams.timestampColumn
    });
    
    // Execute test with historical matcher
    return await executor(historicalMatcher, { ...context, parameters: validatedParams });
  });
}

/**
 * Creates a standard test function for transitive matcher tests
 * @param {Function} executor - Function that performs transitive matcher operations
 * @returns {Function} Test function
 */
function createTransitiveMatcherTestFn(executor) {
  // Define validation rules for executor
  if (typeof executor !== 'function') {
    throw new Error('createTransitiveMatcherTestFn: executor must be a function');
  }

  return withErrorHandling(async function(context) {
    const { parameters } = context;
    
    // Define validation rules
    const validationRules = {
      required: ['matchResultsTable', 'confidenceThreshold'],
      types: {
        matchResultsTable: 'string',
        confidenceThreshold: 'number',
        outputTable: 'string',
        maxDepth: 'number',
        includeDirectMatches: 'boolean',
        sourceIdField: 'string',
        targetIdField: 'string',
        confidenceField: 'string'
      },
      defaults: {
        outputTable: 'transitive_matches',
        maxDepth: 3,
        includeDirectMatches: true,
        sourceIdField: 'source_id',
        targetIdField: 'target_id',
        confidenceField: 'confidence'
      },
      messages: {
        matchResultsTable: 'Match results table is required for TransitiveMatcher tests.',
        confidenceThreshold: 'Confidence threshold is required for TransitiveMatcher tests.'
      }
    };

    // Validate and apply defaults
    const validatedParams = validateParameters(parameters, validationRules, 'TransitiveMatcherTest');
    
    // Create transitive matcher for executor to use
    const transitiveMatcher = transitiveMatcherFactory.createTransitiveMatcher({
      matchResultsTable: validatedParams.matchResultsTable,
      confidenceThreshold: validatedParams.confidenceThreshold,
      outputTable: validatedParams.outputTable,
      maxDepth: validatedParams.maxDepth,
      includeDirectMatches: validatedParams.includeDirectMatches,
      sourceIdField: validatedParams.sourceIdField,
      targetIdField: validatedParams.targetIdField,
      confidenceField: validatedParams.confidenceField
    });
    
    // Execute test with transitive matcher
    return await executor(transitiveMatcher, { ...context, parameters: validatedParams });
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
  matchStrategyFactory,
  matchingSystemFactory,
  historicalMatcherFactory,
  transitiveMatcherFactory
};