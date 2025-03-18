/**
 * Unit tests for embedding and advanced blocking strategies
 */

const assert = require('assert');
const { 
  embeddingLshBlockingKeys, 
  ngramBlockingKeys, 
  compoundBlockingKeys 
} = require('../../includes/blocking/strategies');

// Define tests in format compatible with both Jest and custom test runner
const tests = [
  {
    id: 'embedding_lsh_test',
    name: 'Embedding LSH Blocking Keys',
    type: 'unit',
    tags: ['blocking', 'embedding', 'lsh'],
    priority: 1,
    testFn: async () => {
      // Test with a mock embedding
      const embedding = [0.1, 0.2, 0.3, 0.4, 0.5];
      
      // Basic test with default options
      const keys1 = embeddingLshBlockingKeys(embedding);
      assert.ok(Array.isArray(keys1), 'Should return an array of keys');
      assert.strictEqual(keys1.length, 3, 'Should return 3 keys with default options');
      
      // Test with custom options
      const keys2 = embeddingLshBlockingKeys(embedding, { 
        numBuckets: 5, 
        numPlanes: 2, 
        seed: 'test' 
      });
      assert.ok(Array.isArray(keys2), 'Should return an array of keys');
      assert.strictEqual(keys2.length, 2, 'Should return 2 keys with numPlanes=2');
      
      // Test with same seed produces consistent results
      const keys3 = embeddingLshBlockingKeys(embedding, { 
        numBuckets: 5, 
        numPlanes: 2, 
        seed: 'test' 
      });
      assert.deepStrictEqual(keys2, keys3, 'Same seed should produce consistent results');
      
      // Test with invalid input
      assert.strictEqual(embeddingLshBlockingKeys(null), null, 'Should return null for null input');
      assert.strictEqual(embeddingLshBlockingKeys([]), null, 'Should return null for empty array');
      assert.strictEqual(embeddingLshBlockingKeys("not an array"), null, 'Should return null for non-array input');
      
      return true;
    }
  },
  {
    id: 'ngram_blocking_test',
    name: 'N-gram Blocking Keys',
    type: 'unit',
    tags: ['blocking', 'ngram'],
    priority: 1,
    testFn: async () => {
      // Test with various input strings
      const keys1 = ngramBlockingKeys('hello');
      assert.ok(Array.isArray(keys1), 'Should return an array of keys');
      assert.strictEqual(keys1.length, 3, 'Should return 3 keys for "hello" with default n=3');
      assert.deepStrictEqual(keys1, ['hel', 'ell', 'llo'], 'Should return correct 3-grams');
      
      // Test with custom n value
      const keys2 = ngramBlockingKeys('hello', { n: 2 });
      assert.ok(Array.isArray(keys2), 'Should return an array of keys');
      assert.strictEqual(keys2.length, 4, 'Should return 4 keys for "hello" with n=2');
      assert.deepStrictEqual(keys2, ['he', 'el', 'll', 'lo'], 'Should return correct 2-grams');
      
      // Test with maxGrams
      const keys3 = ngramBlockingKeys('hello world', { n: 2, maxGrams: 3 });
      assert.ok(Array.isArray(keys3), 'Should return an array of keys');
      assert.strictEqual(keys3.length, 3, 'Should respect maxGrams limit');
      
      // Test with short string
      const keys4 = ngramBlockingKeys('hi', { n: 3 });
      assert.ok(Array.isArray(keys4), 'Should return an array of keys');
      assert.strictEqual(keys4.length, 1, 'Should return whole string if shorter than n');
      assert.deepStrictEqual(keys4, ['hi'], 'Should return whole string if shorter than n');
      
      // Test with invalid input
      assert.strictEqual(ngramBlockingKeys(null), null, 'Should return null for null input');
      assert.strictEqual(ngramBlockingKeys(''), null, 'Should return null for empty string');
      assert.strictEqual(ngramBlockingKeys(123), null, 'Should return null for non-string input');
      
      return true;
    }
  },
  {
    id: 'compound_blocking_test',
    name: 'Compound Blocking Keys',
    type: 'unit',
    tags: ['blocking', 'compound'],
    priority: 1,
    testFn: async () => {
      // Test with default options (exact + prefix)
      const keys1 = compoundBlockingKeys('hello');
      assert.ok(Array.isArray(keys1), 'Should return an array of keys');
      assert.strictEqual(keys1.length, 1, 'Should return 1 key with default options');
      
      // Test with custom strategies
      const keys2 = compoundBlockingKeys('hello', { 
        strategies: ['exact', 'prefix', 'suffix'],
        strategyOptions: {
          prefix: { prefixLength: 2 },
          suffix: { suffixLength: 2 }
        }
      });
      assert.ok(Array.isArray(keys2), 'Should return an array of keys');
      assert.strictEqual(keys2.length, 1, 'Should return 1 key with combined strategies');
      assert.ok(keys2[0].includes('_'), 'Key should contain separator');
      
      // Test with custom separator
      const keys3 = compoundBlockingKeys('hello', { 
        strategies: ['exact', 'prefix'],
        separator: '|'
      });
      assert.ok(keys3[0].includes('|'), 'Key should contain custom separator');
      
      // Test with invalid input
      assert.strictEqual(compoundBlockingKeys(null), null, 'Should return null for null input');
      assert.strictEqual(compoundBlockingKeys('', { strategies: [] }), null, 'Should return null for empty strategies');
      
      return true;
    }
  }
];

// Jest-style tests for compatibility
describe('Advanced Blocking Strategies', () => {
  describe('Embedding LSH Blocking Keys', () => {
    test('Returns appropriate keys for valid embedding', () => {
      const embedding = [0.1, 0.2, 0.3, 0.4, 0.5];
      const keys = embeddingLshBlockingKeys(embedding);
      
      expect(Array.isArray(keys)).toBe(true);
      expect(keys.length).toBe(3);
      expect(keys.every(k => k.startsWith('lsh_'))).toBe(true);
    });
    
    test('Returns consistent results with same seed', () => {
      const embedding = [0.1, 0.2, 0.3, 0.4, 0.5];
      const options = { numBuckets: 5, numPlanes: 2, seed: 'test' };
      
      const keys1 = embeddingLshBlockingKeys(embedding, options);
      const keys2 = embeddingLshBlockingKeys(embedding, options);
      
      expect(keys1).toEqual(keys2);
    });
    
    test('Handles invalid inputs gracefully', () => {
      expect(embeddingLshBlockingKeys(null)).toBeNull();
      expect(embeddingLshBlockingKeys([])).toBeNull();
      expect(embeddingLshBlockingKeys("not an array")).toBeNull();
    });
  });
  
  describe('N-gram Blocking Keys', () => {
    test('Generates correct n-grams with default options', () => {
      const keys = ngramBlockingKeys('hello');
      
      expect(keys).toEqual(['hel', 'ell', 'llo']);
    });
    
    test('Handles custom n value', () => {
      const keys = ngramBlockingKeys('hello', { n: 2 });
      
      expect(keys).toEqual(['he', 'el', 'll', 'lo']);
    });
    
    test('Respects maxGrams limit', () => {
      const keys = ngramBlockingKeys('hello world', { n: 2, maxGrams: 3 });
      
      expect(keys.length).toBe(3);
    });
    
    test('Handles short strings', () => {
      const keys = ngramBlockingKeys('hi', { n: 3 });
      
      expect(keys).toEqual(['hi']);
    });
  });
  
  describe('Compound Blocking Keys', () => {
    test('Combines multiple strategies', () => {
      const keys = compoundBlockingKeys('hello', { 
        strategies: ['exact', 'prefix', 'suffix']
      });
      
      expect(keys.length).toBe(1);
      expect(keys[0].split('_').length).toBe(3);
    });
    
    test('Uses custom separator', () => {
      const keys = compoundBlockingKeys('hello', { 
        strategies: ['exact', 'prefix'],
        separator: '|'
      });
      
      expect(keys[0].includes('|')).toBe(true);
    });
    
    test('Handles invalid inputs', () => {
      expect(compoundBlockingKeys(null)).toBeNull();
      expect(compoundBlockingKeys('', { strategies: [] })).toBeNull();
    });
  });
});

// For manual testing
if (require.main === module) {
  console.log('Running embedding blocking tests...');
  Promise.all(tests.map(async (test) => {
    try {
      const result = await test.testFn();
      console.log(`${test.name}: ${result ? 'PASS' : 'FAIL'}`);
    } catch (error) {
      console.error(`${test.name}: ERROR`, error);
    }
  }));
}

module.exports = { tests };