/**
 * Waterfall Strategy Integration Tests
 * 
 * Tests the waterfall and multi-table waterfall matching strategies
 * to ensure they correctly prioritize matches based on reference table 
 * priority and match confidence.
 */

const { TestType, TestPriority } = require('../../includes/validation/validation_registry');
const matchStrategyFactory = require('../../includes/match_strategy_factory');
const { withErrorHandling } = require('../../includes/validation/error_handler');

// Test waterfall matching strategies
exports.tests = [
  {
    id: 'waterfall_strategy_basic_test',
    name: 'Basic Waterfall Strategy',
    description: 'Tests the basic waterfall strategy with simple priority-based matching',
    type: TestType.INTEGRATION,
    priority: TestPriority.HIGH,
    tags: ['matching', 'waterfall', 'strategy'],
    dependencies: [],
    parameters: {
      referenceTables: [
        { id: 'verified_customers', table: 'verified_customers', priority: 1, name: 'VERIFIED' },
        { id: 'historical_data', table: 'historical_data', priority: 2, name: 'HISTORICAL' },
        { id: 'third_party', table: 'third_party_data', priority: 3, name: 'THIRD_PARTY' }
      ],
      matchingRules: {
        'verified_customers': {
          blocking: [
            { sourceField: 'zip', targetField: 'zip', exact: true }
          ],
          scoring: [
            { sourceField: 'first_name', targetField: 'first_name', method: 'jaro_winkler', weight: 1.5 },
            { sourceField: 'last_name', targetField: 'last_name', method: 'jaro_winkler', weight: 2.0 },
            { sourceField: 'street_address', targetField: 'address', method: 'token', weight: 1.0 }
          ]
        },
        'historical_data': {
          blocking: [
            { sourceField: 'zip', targetField: 'postal_code', exact: true }
          ],
          scoring: [
            { sourceField: 'first_name', targetField: 'firstname', method: 'jaro_winkler', weight: 1.5 },
            { sourceField: 'last_name', targetField: 'lastname', method: 'jaro_winkler', weight: 2.0 },
            { sourceField: 'street_address', targetField: 'street', method: 'token', weight: 1.0 }
          ]
        },
        'third_party': {
          blocking: [
            { sourceField: 'zip', targetField: 'zipcode', exact: true }
          ],
          scoring: [
            { sourceField: 'first_name', targetField: 'first', method: 'jaro_winkler', weight: 1.5 },
            { sourceField: 'last_name', targetField: 'last', method: 'jaro_winkler', weight: 2.0 },
            { sourceField: 'street_address', targetField: 'address_line', method: 'token', weight: 1.0 }
          ]
        }
      }
    },
    testFn: async (context) => {
      // Create waterfall strategy
      const strategy = matchStrategyFactory.createWaterfallStrategy({
        referenceTables: this.parameters.referenceTables,
        matchingRules: this.parameters.matchingRules,
        thresholds: { high: 0.85, medium: 0.7, low: 0.55 }
      });
      
      // Generate SQL for strategy
      const sql = strategy.generateSql({
        sourceTable: 'my_source_table',
        sourceAlias: 's',
        targetAlias: 't'
      });
      
      // Validate SQL structure
      const validationResults = {
        hasCTEsForAllTables: true,
        hasProperPrioritization: true,
        hasProperScoring: true,
        issues: []
      };
      
      // Validate SQL has CTEs for all reference tables
      for (const refTable of this.parameters.referenceTables) {
        if (!sql.includes(`FROM ${refTable.table}`)) {
          validationResults.hasCTEsForAllTables = false;
          validationResults.issues.push(`Missing CTE for reference table: ${refTable.table}`);
        }
      }
      
      // Validate SQL has proper prioritization
      if (!sql.includes('ORDER BY') || !sql.includes('priority')) {
        validationResults.hasProperPrioritization = false;
        validationResults.issues.push('Missing proper ORDER BY prioritization');
      }
      
      // Validate SQL has proper scoring
      if (!sql.includes('match_score') || !sql.includes('confidence')) {
        validationResults.hasProperScoring = false;
        validationResults.issues.push('Missing proper scoring calculations');
      }
      
      return {
        passed: validationResults.hasCTEsForAllTables && 
                validationResults.hasProperPrioritization && 
                validationResults.hasProperScoring,
        validationResults,
        generatedSql: sql
      };
    }
  },
  
  {
    id: 'multi_table_waterfall_strategy_test',
    name: 'Multi-Table Waterfall Strategy',
    description: 'Tests the multi-table waterfall strategy with complex priority and confidence-based matching',
    type: TestType.INTEGRATION,
    priority: TestPriority.HIGH,
    tags: ['matching', 'waterfall', 'multi-table', 'strategy'],
    dependencies: ['waterfall_strategy_basic_test'],
    parameters: {
      referenceTables: [
        { 
          id: 'verified_customers', 
          table: 'verified_customers', 
          tablePriority: 1, 
          name: 'VERIFIED',
          confidenceMultiplier: 1.2,
          requiredFields: ['email', 'phone']
        },
        { 
          id: 'historical_data', 
          table: 'historical_data', 
          tablePriority: 2, 
          name: 'HISTORICAL',
          confidenceMultiplier: 1.0,
          requiredFields: ['email']
        },
        { 
          id: 'third_party', 
          table: 'third_party_data', 
          tablePriority: 3, 
          name: 'THIRD_PARTY',
          confidenceMultiplier: 0.9,
          requiredFields: []
        }
      ],
      matchingRules: {
        'verified_customers': {
          blocking: [
            { sourceField: 'zip', targetField: 'zip', exact: true }
          ],
          scoring: [
            { sourceField: 'first_name', targetField: 'first_name', method: 'jaro_winkler', weight: 1.5 },
            { sourceField: 'last_name', targetField: 'last_name', method: 'jaro_winkler', weight: 2.0 },
            { sourceField: 'email', targetField: 'email', method: 'exact', weight: 3.0 },
            { sourceField: 'street_address', targetField: 'address', method: 'token', weight: 1.0 }
          ]
        },
        'historical_data': {
          blocking: [
            { sourceField: 'zip', targetField: 'postal_code', exact: true }
          ],
          scoring: [
            { sourceField: 'first_name', targetField: 'firstname', method: 'jaro_winkler', weight: 1.5 },
            { sourceField: 'last_name', targetField: 'lastname', method: 'jaro_winkler', weight: 2.0 },
            { sourceField: 'email', targetField: 'email_address', method: 'exact', weight: 3.0 },
            { sourceField: 'street_address', targetField: 'street', method: 'token', weight: 1.0 }
          ]
        },
        'third_party': {
          blocking: [
            { sourceField: 'zip', targetField: 'zipcode', exact: true }
          ],
          scoring: [
            { sourceField: 'first_name', targetField: 'first', method: 'jaro_winkler', weight: 1.5 },
            { sourceField: 'last_name', targetField: 'last', method: 'jaro_winkler', weight: 2.0 },
            { sourceField: 'street_address', targetField: 'address_line', method: 'token', weight: 1.0 }
          ]
        }
      },
      fieldMappings: {
        'verified_customers': [
          { sourceField: 'email', targetField: 'email_verified' },
          { sourceField: 'phone', targetField: 'phone_verified' },
          { sourceField: 'customer_id', targetField: 'verified_customer_id' }
        ],
        'historical_data': [
          { sourceField: 'email_address', targetField: 'email_historical' },
          { sourceField: 'customer_id', targetField: 'historical_customer_id' }
        ],
        'third_party': [
          { sourceField: 'unique_id', targetField: 'third_party_id' }
        ]
      }
    },
    testFn: async (context) => {
      // Create multi-table waterfall strategy
      const strategy = matchStrategyFactory.createMultiTableWaterfallStrategy({
        referenceTables: this.parameters.referenceTables,
        matchingRules: this.parameters.matchingRules,
        thresholds: { high: 0.85, medium: 0.7, low: 0.55 },
        fieldMappings: this.parameters.fieldMappings,
        allowMultipleMatches: true,
        maxMatches: 3,
        confidenceField: 'match_confidence'
      });
      
      // Generate SQL for strategy
      const sql = strategy.generateSql({
        sourceTable: 'my_source_table',
        sourceAlias: 's',
        targetAlias: 't'
      });
      
      // Validate SQL structure
      const validationResults = {
        hasCTEsForAllTables: true,
        hasProperPrioritization: true,
        hasProperScoring: true,
        hasFieldMappings: true,
        hasRequiredFieldsCheck: true,
        hasConfidenceMultiplier: true,
        hasMultipleMatchesLogic: true,
        issues: []
      };
      
      // Validate SQL has CTEs for all reference tables
      for (const refTable of this.parameters.referenceTables) {
        if (!sql.includes(`FROM ${refTable.table}`)) {
          validationResults.hasCTEsForAllTables = false;
          validationResults.issues.push(`Missing CTE for reference table: ${refTable.table}`);
        }
      }
      
      // Validate SQL has proper prioritization
      if (!sql.includes('ORDER BY') || !sql.includes('table_priority')) {
        validationResults.hasProperPrioritization = false;
        validationResults.issues.push('Missing proper ORDER BY prioritization with table_priority');
      }
      
      // Validate SQL has proper scoring
      if (!sql.includes('match_score') || !sql.includes('match_confidence')) {
        validationResults.hasProperScoring = false;
        validationResults.issues.push('Missing proper scoring calculations or confidence field');
      }
      
      // Validate field mappings
      const mappingFields = [
        'email_verified', 'phone_verified', 'verified_customer_id', 
        'email_historical', 'historical_customer_id', 'third_party_id'
      ];
      
      const missingFields = mappingFields.filter(field => !sql.includes(field));
      
      if (missingFields.length > 0) {
        validationResults.hasFieldMappings = false;
        validationResults.issues.push(`Missing field mappings: ${missingFields.join(', ')}`);
      }
      
      // Validate required fields check
      if (!sql.includes('IS NOT NULL')) {
        validationResults.hasRequiredFieldsCheck = false;
        validationResults.issues.push('Missing required fields check');
      }
      
      // Validate confidence multiplier
      if (!sql.includes('* 1.2') && !sql.includes('* 0.9')) {
        validationResults.hasConfidenceMultiplier = false;
        validationResults.issues.push('Missing confidence multiplier application');
      }
      
      // Validate multiple matches logic
      if (!sql.includes('match_rank <= 3')) {
        validationResults.hasMultipleMatchesLogic = false;
        validationResults.issues.push('Missing logic for multiple matches with limit');
      }
      
      return {
        passed: Object.values(validationResults)
          .filter(value => typeof value === 'boolean')
          .every(value => value === true),
        validationResults,
        generatedSql: sql
      };
    }
  }
];

// Register tests with validation registry
exports.register = async (registry) => {
  const testIds = [];
  
  // Register each test with error handling
  for (const test of exports.tests) {
    try {
      const testId = registry.registerTest({
        ...test,
        testFn: withErrorHandling(test.testFn, 'TEST_ERROR', { testId: test.id })
      });
      
      testIds.push(testId);
    } catch (error) {
      console.error(`Failed to register test ${test.id}: ${error.message}`);
    }
  }
  
  return testIds;
}; 