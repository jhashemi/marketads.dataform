/**
 * Intelligent Rule Selection System Tests
 * 
 * Tests the functionality of the intelligent rule selection system
 * to ensure it correctly recommends rules based on schemas and user goals.
 */

const assert = require('assert');
const intelligentRuleSelector = require('../rules/intelligent_rule_selector');
const schemaAnalyzer = require('../rules/schema_analyzer');
const fieldTypeInference = require('../rules/field_type_inference');
const goalAnalyzer = require('../rules/goal_analyzer');
const ruleOptimizer = require('../rules/rule_optimizer');
const rulePerformanceTracker = require('../rules/rule_performance_tracker');

// Mock data for testing
const mockSourceTable = 'customers';
const mockReferenceTable = 'customer_records';
const mockGoalDescription = 'Find high quality matches with good balance of precision and recall';
const mockSchemaAnalysis = {
  sourceSchema: {
    fields: [
      { name: 'customer_id', type: 'int64' },
      { name: 'first_name', type: 'string' },
      { name: 'last_name', type: 'string' },
      { name: 'email', type: 'string' },
      { name: 'phone', type: 'string' },
      { name: 'date_of_birth', type: 'date' },
      { name: 'address', type: 'string' },
      { name: 'city', type: 'string' },
      { name: 'postal_code', type: 'string' }
    ]
  },
  referenceSchema: {
    fields: [
      { name: 'id', type: 'int64' },
      { name: 'first_name', type: 'string' },
      { name: 'last_name', type: 'string' },
      { name: 'email_address', type: 'string' },
      { name: 'phone_number', type: 'string' },
      { name: 'birth_date', type: 'date' },
      { name: 'street', type: 'string' },
      { name: 'city', type: 'string' },
      { name: 'zip', type: 'string' }
    ]
  },
  commonFields: [
    { name: 'first_name', type: 'string' },
    { name: 'last_name', type: 'string' },
    { name: 'city', type: 'string' }
  ],
  sourceRowCount: 10000,
  referenceRowCount: 8000,
  fieldStats: {
    fields: {
      'first_name': { uniqueRatio: 0.3, nullRatio: 0.01 },
      'last_name': { uniqueRatio: 0.8, nullRatio: 0.01 },
      'city': { uniqueRatio: 0.1, nullRatio: 0.05 }
    },
    uniqueFieldRatio: 0.4
  }
};

// Mock schema analyzer
schemaAnalyzer.analyzeSchema = async function(sourceTableId, referenceTableId) {
  console.log(`Mock analyzing schema for ${sourceTableId} → ${referenceTableId}`);
  return mockSchemaAnalysis;
};

// Mock rule selection service
const mockRuleSelectionService = {
  executeMatching: async function(config) {
    return {
      totalMatches: 500,
      totalComparisons: 5000,
      executionTime: 1200,
      ruleResults: config.rules.map(rule => ({
        ruleName: rule.name,
        executionTimeMs: 200,
        matchCount: 100,
        comparisonCount: 1000,
        fieldContributions: {}
      }))
    };
  }
};

/**
 * Run all tests
 */
async function runTests() {
  console.log('Running Intelligent Rule Selection tests...');
  
  try {
    await testFieldTypeInference();
    await testGoalAnalysis();
    await testRuleOptimization();
    await testPerformanceTracking();
    await testFullRecommendationProcess();
    
    console.log('All tests passed!');
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

/**
 * Test field type inference functionality
 */
async function testFieldTypeInference() {
  console.log('Testing field type inference...');
  
  // Test inferring from field names
  const fieldType1 = fieldTypeInference.inferTypeFromName('email');
  assert.strictEqual(fieldType1, 'email', 'Should detect email field');
  
  const fieldType2 = fieldTypeInference.inferTypeFromName('first_name');
  assert.strictEqual(fieldType2, 'firstName', 'Should detect firstName field');
  
  const fieldType3 = fieldTypeInference.inferTypeFromName('birth_date');
  assert.strictEqual(fieldType3, 'dateOfBirth', 'Should detect dateOfBirth field');
  
  // Test SQL type mapping
  const semanticType1 = fieldTypeInference.mapSqlTypeToSemanticType('int64');
  assert.strictEqual(semanticType1, 'number', 'Should map int64 to number');
  
  const semanticType2 = fieldTypeInference.mapSqlTypeToSemanticType('string');
  assert.strictEqual(semanticType2, 'string', 'Should map string to string');
  
  // Test getCompatibleTypes
  const compatibleTypes = fieldTypeInference.getCompatibleTypes();
  assert(compatibleTypes.email.includes('email'), 'Should have email compatibility');
  assert(compatibleTypes.firstName.includes('fullName'), 'firstName should be compatible with fullName');
  
  console.log('Field type inference tests passed');
}

/**
 * Test goal analysis functionality
 */
async function testGoalAnalysis() {
  console.log('Testing goal analysis...');
  
  // Test goal type inference
  const goal1 = goalAnalyzer.inferGoalFromDescription('Find exact matches only');
  assert.strictEqual(goal1, 'high_precision', 'Should infer high precision goal');
  
  const goal2 = goalAnalyzer.inferGoalFromDescription('Find as many matches as possible');
  assert.strictEqual(goal2, 'high_recall', 'Should infer high recall goal');
  
  const goal3 = goalAnalyzer.inferGoalFromDescription('Need fast performance');
  assert.strictEqual(goal3, 'performance', 'Should infer performance goal');
  
  // Test configuration generation
  const config1 = goalAnalyzer.getConfigurationForGoal('high_precision');
  assert(config1.thresholds.high > 0.85, 'High precision should have high threshold');
  assert.strictEqual(config1.transitiveMatching, false, 'High precision should disable transitive matching');
  
  const config2 = goalAnalyzer.getConfigurationForGoal('high_recall');
  assert(config2.thresholds.low < 0.5, 'High recall should have low threshold');
  assert.strictEqual(config2.transitiveMatching, true, 'High recall should enable transitive matching');
  
  console.log('Goal analysis tests passed');
}

/**
 * Test rule optimization functionality
 */
async function testRuleOptimization() {
  console.log('Testing rule optimization...');
  
  // Test rule effectiveness calculation
  const rule1 = {
    type: 'exact_match',
    name: 'email_exact',
    fields: [{ name: 'email', weight: 1.0 }],
    algorithm: 'exact',
    confidence: 'high'
  };
  
  const effectiveness1 = ruleOptimizer.calculateRuleEffectiveness(
    rule1, 
    mockSchemaAnalysis, 
    'high_precision'
  );
  
  assert(effectiveness1 > 0, 'Should calculate positive effectiveness');
  
  // Test rule performance calculation
  const performance1 = ruleOptimizer.calculateRulePerformance(
    rule1, 
    mockSchemaAnalysis
  );
  
  assert(performance1 > 0, 'Should calculate positive performance score');
  
  // Test rule combination optimization
  const rules = [
    {
      type: 'exact_match',
      name: 'email_exact',
      fields: [{ name: 'email', weight: 1.0 }],
      algorithm: 'exact',
      confidence: 'high'
    },
    {
      type: 'fuzzy_match',
      name: 'name_fuzzy',
      fields: [
        { name: 'first_name', weight: 0.4 },
        { name: 'last_name', weight: 0.6 }
      ],
      algorithm: 'levenshtein',
      confidence: 'medium'
    },
    {
      type: 'exact_match',
      name: 'phone_exact',
      fields: [{ name: 'phone', weight: 1.0 }],
      algorithm: 'exact',
      confidence: 'high'
    }
  ];
  
  const optimized = ruleOptimizer.optimizeRuleCombination(
    rules.map(rule => ({
      ...rule,
      effectiveness: 0.8,
      performance: 0.7
    })),
    { maxRuleCount: 2, minEffectiveness: 0.7, performanceWeight: 0.3 }
  );
  
  assert(optimized.rules.length <= 2, 'Should respect max rule count');
  assert(optimized.effectiveness > 0, 'Should have positive effectiveness');
  console.log('Rule optimization tests passed');
}

/**
 * Test performance tracking functionality
 */
async function testPerformanceTracking() {
  console.log('Testing performance tracking...');
  
  // Test recording rule performance
  const updatedMetrics = rulePerformanceTracker.recordRulePerformance('email_exact', {
    ruleName: 'email_exact',
    ruleType: 'exact_match',
    executionTimeMs: 200,
    matchCount: 100,
    comparisonCount: 1000,
    precision: 0.9,
    recall: 0.8,
    fields: ['email'],
    fieldMatchContributions: {
      'email': 0.9
    }
  });
  
  assert(updatedMetrics.avgExecutionTimeMs > 0, 'Should calculate average execution time');
  assert(updatedMetrics.avgPrecision > 0, 'Should calculate average precision');
  
  // Test retrieving rule performance
  const retrievedMetrics = rulePerformanceTracker.getRulePerformance('email_exact');
  assert.strictEqual(retrievedMetrics.ruleName, 'email_exact', 'Should retrieve correct rule metrics');
  
  // Test calculating field effectiveness
  const fieldEffectiveness = rulePerformanceTracker.calculateFieldEffectiveness();
  assert(fieldEffectiveness.email, 'Should have effectiveness for email field');
  
  console.log('Performance tracking tests passed');
}

/**
 * Test the full recommendation process
 */
async function testFullRecommendationProcess() {
  console.log('Testing full recommendation process...');
  
  // Test full recommendation process
  const recommendation = await intelligentRuleSelector.recommendRules(
    mockSourceTable,
    mockReferenceTable,
    mockGoalDescription
  );
  
  assert(recommendation.recommendedRules.length > 0, 'Should recommend at least one rule');
  assert(recommendation.recommendedBlocking.length > 0, 'Should recommend at least one blocking strategy');
  assert(recommendation.goal.inferredType === 'balanced', 'Should infer balanced goal type');
  
  // Test explanation generation
  const explanation = intelligentRuleSelector.explainRecommendation(recommendation);
  assert(explanation.includes('Matching Goal'), 'Should include goal section in explanation');
  assert(explanation.includes('Schema Analysis'), 'Should include schema section in explanation');
  assert(explanation.includes('Recommended Rules'), 'Should include rules section in explanation');
  
  console.log('Full recommendation process tests passed');
}

// Run all tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  runTests
}; 