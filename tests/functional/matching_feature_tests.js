/**
 * Functional Tests for Matching Features
 * 
 * Tests the matching features from a business requirements perspective.
 */

const assert = require('assert');
const { TestType, TestPriority } = require('../../includes/validation/validation_registry');
const { matchingSystemFactory } = require('../../includes');

// Define tests for custom test runner
const tests = [
  {
    id: 'matching_feature_exact_matching',
    name: 'Exact Matching Feature',
    description: 'Tests that the exact matching feature meets business requirements',
    type: TestType.FUNCTIONAL,
    tags: ['matching', 'exact_match', 'feature'],
    priority: TestPriority.HIGH,
    testFn: async (context) => {
      // Test exact matching with business requirements
      const matchingSystem = matchingSystemFactory.create({
        strategy: 'exact',
        threshold: 0.9,
        fields: ['email', 'phone', 'customerID']
      });
      
      const sourceRecords = [
        { id: 1, email: 'john.doe@example.com', phone: '555-1234', customerID: 'CUST-001' },
        { id: 2, email: 'jane.smith@example.com', phone: '555-5678', customerID: 'CUST-002' }
      ];
      
      const targetRecords = [
        { id: 101, email: 'john.doe@example.com', phone: '555-1234', customerID: 'CUST-001' },
        { id: 102, email: 'jane.smith@example.com', phone: null, customerID: 'CUST-002' }
      ];
      
      const results = await matchingSystem.matchRecords(sourceRecords, targetRecords);
      
      // Verify business requirements
      assert.strictEqual(results.length, 2, 'Should match both records');
      assert.strictEqual(results[0].sourceId, 1, 'First match should be for source ID 1');
      assert.strictEqual(results[0].targetId, 101, 'First match should be with target ID 101');
      assert.strictEqual(results[0].confidence, 1.0, 'First match confidence should be 1.0');
      assert.strictEqual(results[1].sourceId, 2, 'Second match should be for source ID 2');
      assert.strictEqual(results[1].targetId, 102, 'Second match should be with target ID 102');
      // Business requirement: match confidence is proportional to matched fields count
      assert.ok(results[1].confidence < 1.0, 'Second match confidence should be less than 1.0 due to missing phone');
      
      return true;
    }
  },
  
  {
    id: 'matching_feature_fuzzy_matching',
    name: 'Fuzzy Matching Feature',
    description: 'Tests that the fuzzy matching feature meets business requirements',
    type: TestType.FUNCTIONAL,
    tags: ['matching', 'fuzzy_match', 'feature'],
    priority: TestPriority.HIGH,
    testFn: async (context) => {
      // Test fuzzy matching with business requirements
      const matchingSystem = matchingSystemFactory.create({
        strategy: 'fuzzy',
        threshold: 0.7,
        fields: ['firstName', 'lastName', 'address']
      });
      
      const sourceRecords = [
        { id: 1, firstName: 'John', lastName: 'Doe', address: '123 Main St' },
        { id: 2, firstName: 'Jane', lastName: 'Smith', address: '456 Oak Ave' }
      ];
      
      const targetRecords = [
        { id: 101, firstName: 'Jon', lastName: 'Doe', address: '123 Main Street' }, // Fuzzy match
        { id: 102, firstName: 'Jane', lastName: 'Smyth', address: '456 Oak Avenue' }, // Fuzzy match
        { id: 103, firstName: 'Sarah', lastName: 'Williams', address: '789 Pine Rd' } // No match
      ];
      
      const results = await matchingSystem.matchRecords(sourceRecords, targetRecords);
      
      // Verify business requirements
      assert.strictEqual(results.length, 2, 'Should match two records');
      assert.strictEqual(results[0].sourceId, 1, 'First match should be for source ID 1');
      assert.strictEqual(results[0].targetId, 101, 'First match should be with target ID 101');
      assert.ok(results[0].confidence >= 0.7, 'First match confidence should meet threshold');
      assert.strictEqual(results[1].sourceId, 2, 'Second match should be for source ID 2');
      assert.strictEqual(results[1].targetId, 102, 'Second match should be with target ID 102');
      assert.ok(results[1].confidence >= 0.7, 'Second match confidence should meet threshold');
      
      // Verify no false positives
      const noMatches = results.filter(r => r.targetId === 103);
      assert.strictEqual(noMatches.length, 0, 'Should not match with Sarah Williams');
      
      return true;
    }
  },
  
  {
    id: 'matching_feature_business_rules',
    name: 'Business Rules in Matching',
    description: 'Tests that the matching system correctly applies business rules',
    type: TestType.FUNCTIONAL,
    tags: ['matching', 'business_rules', 'feature'],
    priority: TestPriority.MEDIUM,
    testFn: async (context) => {
      // Business requirement: Apply specific match weights to different fields
      const matchingSystem = matchingSystemFactory.create({
        strategy: 'weighted',
        threshold: 0.6,
        fields: [
          { name: 'email', weight: 2.5 },
          { name: 'phone', weight: 1.5 },
          { name: 'name', weight: 1.0 }
        ]
      });
      
      const sourceRecords = [
        { id: 1, email: 'john.doe@example.com', phone: '555-1234', name: 'John Doe' },
        { id: 2, email: 'jane.smith@example.com', phone: '555-5678', name: 'Jane Smith' }
      ];
      
      const targetRecords = [
        { id: 101, email: 'john.doe@example.com', phone: '555-9999', name: 'Johnny Doe' }, // Email match, others differ
        { id: 102, email: 'smith.j@example.com', phone: '555-5678', name: 'Jane Smith' } // Phone and name match, email differs
      ];
      
      const results = await matchingSystem.matchRecords(sourceRecords, targetRecords);
      
      // Business rule: Email is weighted higher than phone+name combined
      assert.strictEqual(results.length, 2, 'Should match both records');
      assert.strictEqual(results[0].sourceId, 1, 'First match should be for source ID 1');
      assert.strictEqual(results[0].targetId, 101, 'First match should be with target ID 101');
      assert.strictEqual(results[1].sourceId, 2, 'Second match should be for source ID 2');
      assert.strictEqual(results[1].targetId, 102, 'Second match should be with target ID 102');
      
      // Business rule: Email match score should be higher due to weighting
      assert.ok(
        results[0].confidence > results[1].confidence, 
        'Email match should have higher confidence than phone+name due to weighting'
      );
      
      return true;
    }
  }
];

// For Jest compatibility
describe('Matching Features', () => {
  test('Exact Matching Feature', async () => {
    const result = await tests[0].testFn({});
    expect(result).toBe(true);
  });
  
  test('Fuzzy Matching Feature', async () => {
    const result = await tests[1].testFn({});
    expect(result).toBe(true);
  });
  
  test('Business Rules in Matching', async () => {
    const result = await tests[2].testFn({});
    expect(result).toBe(true);
  });
});

// For manual testing
if (require.main === module) {
  const testFn = async () => {
    for (const test of tests) {
      console.log(`Running test: ${test.name}`);
      try {
        const result = await test.testFn({});
        console.log(`Test ${test.name}: ${result ? 'PASSED' : 'FAILED'}`);
      } catch (error) {
        console.error(`Test ${test.name} failed with error:`, error);
      }
    }
  };
  
  testFn();
}

module.exports = { tests }; 