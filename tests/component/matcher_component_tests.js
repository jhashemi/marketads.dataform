/**
 * Component Tests for Matcher Component
 * 
 * Tests the matcher component as a standalone subsystem with all its internal dependencies.
 */

const assert = require('assert');
const { TestType, TestPriority } = require('../../includes/validation/validation_registry');
const { MatchingSystem } = require('../../includes/matching_system');
const { HistoricalMatcher } = require('../../includes/historical_matcher');
const { JaccardSimilarityMatcher } = require('../../includes/matchers/jaccard_similarity_matcher');

// Define tests for custom test runner
const tests = [
  {
    id: 'matcher_component_basic_functionality',
    name: 'Matcher Component Basic Functionality',
    description: 'Tests the basic functionality of the matcher component',
    type: TestType.COMPONENT,
    tags: ['matcher', 'component', 'core'],
    priority: TestPriority.HIGH,
    testFn: async (context) => {
      // Initialize the matcher component with its dependencies
      const similarityMatcher = new JaccardSimilarityMatcher({
        fields: ['name', 'email'],
        thresholds: { high: 0.9, medium: 0.7, low: 0.5 }
      });
      
      const matchingSystem = new MatchingSystem({
        matcher: similarityMatcher,
        options: {
          threshold: 0.7,
          deduplication: true
        }
      });
      
      // Test component with sample data
      const sourceRecords = [
        { id: 'src1', name: 'John Doe', email: 'john.doe@example.com', address: '123 Main St' },
        { id: 'src2', name: 'Jane Smith', email: 'jane.smith@example.com', address: '456 Oak Ave' }
      ];
      
      const targetRecords = [
        { id: 'tgt1', name: 'John Doe', email: 'john.doe@example.com', address: '123 Main Street' },
        { id: 'tgt2', name: 'Jane Smith', email: 'different@example.com', address: '456 Oak Avenue' }
      ];
      
      const results = await matchingSystem.match(sourceRecords, targetRecords);
      
      // Verify component behavior
      assert.strictEqual(results.length, 2, 'Should return results for all source records');
      
      // First match should be exact on name and email
      const match1 = results.find(r => r.sourceId === 'src1');
      assert.ok(match1, 'First source record should have a match');
      assert.strictEqual(match1.targetId, 'tgt1', 'First record should match with first target');
      assert.ok(match1.confidence > 0.9, 'Match confidence should be high for exact name and email match');
      
      // Second match should be based only on name
      const match2 = results.find(r => r.sourceId === 'src2');
      assert.ok(match2, 'Second source record should have a match');
      assert.strictEqual(match2.targetId, 'tgt2', 'Second record should match with second target');
      assert.ok(match2.confidence >= 0.7 && match2.confidence < 0.9, 
                'Match confidence should be medium for partial match');
      
      return true;
    }
  },
  
  {
    id: 'matcher_component_historical_matching',
    name: 'Matcher Component with Historical Matching',
    description: 'Tests the matcher component with historical matching capability',
    type: TestType.COMPONENT,
    tags: ['matcher', 'component', 'historical'],
    priority: TestPriority.MEDIUM,
    testFn: async (context) => {
      // Initialize the matcher component with historical matching
      const similarityMatcher = new JaccardSimilarityMatcher({
        fields: ['name', 'email'],
        thresholds: { high: 0.9, medium: 0.7, low: 0.5 }
      });
      
      const historicalMatcher = new HistoricalMatcher({
        matcher: similarityMatcher,
        historyTable: 'match_history',
        options: {
          retainConfidence: true,
          updateExisting: true
        }
      });
      
      // Mock history data
      const historyData = [
        { sourceId: 'src1', targetId: 'tgt1', confidence: 0.95, matchDate: '2024-01-01' },
        { sourceId: 'src3', targetId: 'tgt3', confidence: 0.85, matchDate: '2024-01-01' }
      ];
      
      // Mock the history table access
      historicalMatcher.getHistory = async () => historyData;
      historicalMatcher.saveHistory = async (records) => true;
      
      // Test component with sample data
      const sourceRecords = [
        { id: 'src1', name: 'John Doe', email: 'changed@example.com' }, // Changed from history
        { id: 'src2', name: 'Jane Smith', email: 'jane.smith@example.com' }, // New record
        { id: 'src3', name: 'Bob Brown', email: 'bob.brown@example.com' } // In history
      ];
      
      const targetRecords = [
        { id: 'tgt1', name: 'John Doe', email: 'john.doe@example.com' },
        { id: 'tgt2', name: 'Jane Smith', email: 'jane.smith@example.com' },
        { id: 'tgt3', name: 'Bob Brown', email: 'bob.brown@example.com' },
        { id: 'tgt4', name: 'Alice Johnson', email: 'alice@example.com' }
      ];
      
      const results = await historicalMatcher.matchWithHistory(sourceRecords, targetRecords);
      
      // Verify component behavior
      assert.strictEqual(results.length, 3, 'Should return results for all source records');
      
      // First record should have updated match with different confidence
      const match1 = results.find(r => r.sourceId === 'src1');
      assert.ok(match1, 'First source record should have a match');
      assert.strictEqual(match1.targetId, 'tgt1', 'First record should maintain historical match');
      assert.ok(match1.confidence < 0.95, 'Match confidence should be lower due to email change');
      assert.ok(match1.updatedFromHistory, 'Match should be marked as updated from history');
      
      // Second record should have new match
      const match2 = results.find(r => r.sourceId === 'src2');
      assert.ok(match2, 'Second source record should have a match');
      assert.strictEqual(match2.targetId, 'tgt2', 'Second record should match with second target');
      assert.ok(!match2.fromHistory, 'Match should not be from history');
      
      // Third record should retain historical match
      const match3 = results.find(r => r.sourceId === 'src3');
      assert.ok(match3, 'Third source record should have a match');
      assert.strictEqual(match3.targetId, 'tgt3', 'Third record should retain historical match');
      assert.strictEqual(match3.confidence, 0.85, 'Match confidence should be retained from history');
      assert.ok(match3.fromHistory, 'Match should be marked as from history');
      
      return true;
    }
  },
  
  {
    id: 'matcher_component_error_handling',
    name: 'Matcher Component Error Handling',
    description: 'Tests error handling within the matcher component',
    type: TestType.COMPONENT,
    tags: ['matcher', 'component', 'error_handling'],
    priority: TestPriority.MEDIUM,
    testFn: async (context) => {
      // Create a problematic matcher for testing error handling
      const problematicMatcher = {
        match: async (source, target) => {
          if (source.id === 'problem_record') {
            throw new Error('Matching failed for problem record');
          }
          return { sourceId: source.id, targetId: target.id, confidence: 0.9 };
        }
      };
      
      const matchingSystem = new MatchingSystem({
        matcher: problematicMatcher,
        options: {
          threshold: 0.7,
          deduplication: true,
          errorHandling: 'graceful' // Should handle errors gracefully
        }
      });
      
      // Test component with sample data including problematic record
      const sourceRecords = [
        { id: 'src1', name: 'John Doe' },
        { id: 'problem_record', name: 'Problem Record' },
        { id: 'src2', name: 'Jane Smith' }
      ];
      
      const targetRecords = [
        { id: 'tgt1', name: 'John Doe' }
      ];
      
      // The component should handle the error gracefully
      const results = await matchingSystem.match(sourceRecords, targetRecords);
      
      // Verify error handling behavior
      assert.ok(results.length >= 1, 'Should return results for non-problematic records');
      
      // First record should have a match
      const match1 = results.find(r => r.sourceId === 'src1');
      assert.ok(match1, 'First source record should have a match');
      
      // Problematic record should be handled according to error handling policy
      const problemMatch = results.find(r => r.sourceId === 'problem_record');
      if (problemMatch) {
        assert.ok(problemMatch.error, 'Problem record should have error information');
        assert.ok(!problemMatch.targetId, 'Problem record should not have target ID');
      }
      
      // Last record should still be processed
      const match2 = results.find(r => r.sourceId === 'src2');
      assert.ok(match2, 'Last source record should have a match');
      
      return true;
    }
  }
];

// For Jest compatibility
describe('Matcher Component', () => {
  test('Basic Functionality', async () => {
    const result = await tests[0].testFn({});
    expect(result).toBe(true);
  });
  
  test('Historical Matching', async () => {
    const result = await tests[1].testFn({});
    expect(result).toBe(true);
  });
  
  test('Error Handling', async () => {
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