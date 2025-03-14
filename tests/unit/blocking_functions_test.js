const assert = require('assert');
const {
  zipLast3,
  zipSoundexLastName,
  stateLast3First3,
  zipStreet5,
  last3SoundexFirstCity,
  approximateLevenshtein,
  similarityRatio,
  extractFirstLastName
} = require('../../includes/blocking_functions');
const { TestType, TestPriority } = require('../../includes/validation/validation_registry');

/**
 * Test file for the blocking functions
 */
const tests = [
  {
    id: 'blocking_functions_zipLast3',
    name: 'zipLast3 function',
    type: 'unit',
    tags: ['blocking', 'core'],
    priority: 1,
    testFn: async () => {
      // Test with valid inputs
      const result1 = zipLast3('12345', 'Smith');
      assert.strictEqual(result1, '`12345Smi`', 'Should concatenate zip code with first 3 chars of last name');
      
      // Test with null/empty inputs
      const result2 = zipLast3(null, 'Smith');
      assert.strictEqual(result2, '`Smi`', 'Should handle null zip code');
      
      const result3 = zipLast3('12345', null);
      assert.strictEqual(result3, '`12345`', 'Should handle null last name');
      
      const result4 = zipLast3(null, null);
      assert.strictEqual(result4, '``', 'Should handle all null inputs');
      
      // Test with short last name
      const result5 = zipLast3('12345', 'Li');
      assert.strictEqual(result5, '`12345Li`', 'Should handle short last names correctly');
      
      return true;
    }
  },
  {
    id: 'blocking_functions_stateLast3First3',
    name: 'stateLast3First3 function',
    type: 'unit',
    tags: ['blocking', 'core'],
    priority: 1,
    testFn: async () => {
      // Test with valid inputs
      const result1 = stateLast3First3('CA', 'Smith', 'John');
      assert.strictEqual(result1, '`CASmiJoh`', 'Should concatenate state with first 3 chars of last and first names');
      
      // Test with null/empty inputs
      const result2 = stateLast3First3(null, 'Smith', 'John');
      assert.strictEqual(result2, '`SmiJoh`', 'Should handle null state');
      
      const result3 = stateLast3First3('CA', null, 'John');
      assert.strictEqual(result3, '`CAJoh`', 'Should handle null last name');
      
      const result4 = stateLast3First3('CA', 'Smith', null);
      assert.strictEqual(result4, '`CASmi`', 'Should handle null first name');
      
      const result5 = stateLast3First3(null, null, null);
      assert.strictEqual(result5, '``', 'Should handle all null inputs');
      
      // Test with short names
      const result6 = stateLast3First3('CA', 'Li', 'Jo');
      assert.strictEqual(result6, '`CALiJo`', 'Should handle short names correctly');
      
      return true;
    }
  },
  {
    id: 'blocking_functions_approximateLevenshtein',
    name: 'approximateLevenshtein function',
    type: 'unit',
    tags: ['blocking', 'core', 'similarity'],
    priority: 1,
    testFn: async () => {
      // Test with column references
      const result1 = approximateLevenshtein('a.name', 'b.name').trim();
      
      // Check that it contains the expected SQL components
      assert.ok(result1.includes('ML.SIMILARITY(a.name, b.name, \'LEVENSHTEIN\')'), 
        'Should use ML.SIMILARITY for Levenshtein distance');
      
      assert.ok(result1.includes('WHEN a.name IS NULL OR b.name IS NULL THEN 999999'), 
        'Should handle NULL inputs with a large distance value');
      
      assert.ok(result1.includes('WHEN LENGTH(a.name) = 0 AND LENGTH(b.name) = 0 THEN 0'), 
        'Should handle empty strings with 0 distance');
      
      // Test with more complex expressions
      const result2 = approximateLevenshtein('LOWER(a.name)', 'CONCAT(b.first_name, \' \', b.last_name)').trim();
      
      assert.ok(result2.includes('ML.SIMILARITY(LOWER(a.name), CONCAT(b.first_name, \' \', b.last_name), \'LEVENSHTEIN\')'), 
        'Should work with complex SQL expressions');
      
      return true;
    }
  },
  {
    id: 'blocking_functions_similarityRatio',
    name: 'similarityRatio function',
    type: 'unit',
    tags: ['blocking', 'core', 'similarity'],
    priority: 1,
    testFn: async () => {
      // Test with column references
      const result1 = similarityRatio('a.name', 'b.name').trim();
      
      // Check that it contains the expected SQL components
      assert.ok(result1.includes('ML.SIMILARITY(a.name, b.name, \'LEVENSHTEIN\')'), 
        'Should use ML.SIMILARITY for similarity ratio');
      
      assert.ok(result1.includes('WHEN a.name IS NULL OR b.name IS NULL THEN 0.0'), 
        'Should handle NULL inputs with 0.0 similarity');
      
      assert.ok(result1.includes('WHEN a.name = b.name THEN 1.0'), 
        'Should handle identical strings with 1.0 similarity');
      
      // Test with more complex expressions
      const result2 = similarityRatio('LOWER(a.name)', 'CONCAT(b.first_name, \' \', b.last_name)').trim();
      
      assert.ok(result2.includes('ML.SIMILARITY(LOWER(a.name), CONCAT(b.first_name, \' \', b.last_name), \'LEVENSHTEIN\')'), 
        'Should work with complex SQL expressions');
      
      return true;
    }
  }
];

// Add Jest compatibility layer
if (typeof describe === 'function') {
  describe('Blocking Functions', () => {
    tests.forEach(test => {
      it(test.name, async () => {
        const result = await test.testFn();
        expect(result).toBeTruthy();
      });
    });
  });
}

// For manual testing only
if (require.main === module) {
  console.log("\n=== Running Blocking Functions Tests ===\n");
  
  (async () => {
    let passed = 0;
    let failed = 0;
    
    for (const test of tests) {
      try {
        console.log(`Running test: ${test.name}`);
        const result = await test.testFn();
        console.log(`✅ Test passed: ${test.name}\n`);
        passed++;
      } catch (error) {
        console.error(`❌ Test failed: ${test.name}`);
        console.error(`   Error: ${error.message}`);
        console.error(`   Stack: ${error.stack}\n`);
        failed++;
      }
    }
    
    console.log("=== Test Summary ===");
    console.log(`Total: ${tests.length}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    
    // Return non-zero exit code if any tests failed
    if (failed > 0) {
      process.exit(1);
    }
  })();
}

module.exports = { tests };