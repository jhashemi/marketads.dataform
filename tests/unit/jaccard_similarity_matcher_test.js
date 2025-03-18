/**
 * Unit tests for the Jaccard Similarity Matcher
 */
const assert = require('assert');
const { 
  calculateJaccardSimilarity,
  tokenize,
  generateJaccardSimilaritySql,
  getJaccardMatcher
} = require('../../includes/matching/jaccard_similarity_matcher');

// Define test cases as an array for test runner compatibility
const tests = [
  {
    id: 'jaccard_similarity_calculation_test',
    name: 'Calculate Jaccard similarity correctly',
    type: 'unit',
    tags: ['jaccard', 'core'],
    priority: 1,
    testFn: async () => {
      // Test with arrays
      const set1 = ['apple', 'banana', 'orange'];
      const set2 = ['apple', 'orange', 'kiwi'];
      
      // Expected: 2/4 = 0.5 (2 common elements out of 4 unique elements)
      const similarity = calculateJaccardSimilarity(set1, set2);
      assert.strictEqual(similarity, 0.5, 'Jaccard similarity should be 0.5');
      
      // Test with identical sets
      const identicalSimilarity = calculateJaccardSimilarity(['a', 'b', 'c'], ['a', 'b', 'c']);
      assert.strictEqual(identicalSimilarity, 1.0, 'Identical sets should have similarity 1.0');
      
      // Test with disjoint sets
      const disjointSimilarity = calculateJaccardSimilarity(['a', 'b', 'c'], ['d', 'e', 'f']);
      assert.strictEqual(disjointSimilarity, 0.0, 'Disjoint sets should have similarity 0.0');
      
      // Test with strings directly
      const stringSimilarity = calculateJaccardSimilarity(
        'the quick brown fox',
        'the quick red fox',
        { tokenize: true }
      );
      assert.strictEqual(
        Math.round(stringSimilarity * 100) / 100, 
        0.75, 
        'String similarity should tokenize and compare correctly'
      );
      
      // Test with empty inputs
      assert.strictEqual(
        calculateJaccardSimilarity([], []), 
        0, 
        'Empty sets should have similarity 0'
      );
      
      assert.strictEqual(
        calculateJaccardSimilarity('', '', { tokenize: true }), 
        0, 
        'Empty strings should have similarity 0'
      );
      
      return true;
    }
  },
  {
    id: 'tokenization_test',
    name: 'Tokenize strings correctly',
    type: 'unit',
    tags: ['jaccard', 'tokenization'],
    priority: 1,
    testFn: async () => {
      // Test basic tokenization
      const tokens = tokenize('The quick brown fox jumps over the lazy dog');
      assert.deepStrictEqual(
        tokens, 
        ['the', 'quick', 'brown', 'fox', 'jumps', 'over', 'the', 'lazy', 'dog'],
        'Should tokenize with default settings'
      );
      
      // Test with stemming
      const stemmedTokens = tokenize('running runs runner', { stem: true });
      // All of these should stem to 'run'
      assert.strictEqual(
        new Set(stemmedTokens).size, 
        1, 
        'Stemming should reduce word variations to the root'
      );
      
      // Test with stopwords
      const tokensWithoutStopwords = tokenize('the quick brown fox', { 
        removeStopwords: true 
      });
      assert.deepStrictEqual(
        tokensWithoutStopwords, 
        ['quick', 'brown', 'fox'],
        'Should remove stopwords like "the"'
      );
      
      // Test with n-grams
      const bigrams = tokenize('hello world', { 
        ngramSize: 2,
        wordGrams: false
      });
      
      // Expect character bigrams: "he", "el", "ll", "lo", " w", "wo", "or", "rl", "ld"
      assert.strictEqual(
        bigrams.length, 
        9, 
        'Should generate correct number of character bigrams'
      );
      
      // Test with word n-grams
      const wordBigrams = tokenize('the quick brown fox', { 
        ngramSize: 2,
        wordGrams: true
      });
      
      // Expect: ["the quick", "quick brown", "brown fox"]
      assert.strictEqual(
        wordBigrams.length, 
        3, 
        'Should generate correct number of word bigrams'
      );
      
      // Test with custom tokenizer
      const customTokens = tokenize('a-b-c', { 
        tokenizer: text => text.split('-') 
      });
      assert.deepStrictEqual(
        customTokens, 
        ['a', 'b', 'c'],
        'Should use custom tokenizer function'
      );
      
      return true;
    }
  },
  {
    id: 'sql_generation_test',
    name: 'Generate SQL for Jaccard similarity',
    type: 'unit',
    tags: ['jaccard', 'sql'],
    priority: 1,
    testFn: async () => {
      // Generate SQL for Jaccard similarity
      const sql = generateJaccardSimilaritySql(
        'field1',
        'field2',
        { tokenizationType: 'word' }
      );
      
      // Check that SQL includes the right functions
      assert(sql.includes('SPLIT'), 'SQL should include SPLIT function');
      assert(sql.includes('ARRAY_LENGTH'), 'SQL should include ARRAY_LENGTH function');
      assert(sql.includes('ARRAY_INTERSECT'), 'SQL should include ARRAY_INTERSECT function');
      assert(sql.includes('ARRAY_UNION'), 'SQL should include ARRAY_UNION function');
      
      // Check with n-grams
      const ngramSql = generateJaccardSimilaritySql(
        'field1',
        'field2',
        { tokenizationType: 'ngram', ngramSize: 3 }
      );
      
      assert(ngramSql.includes('GENERATE_NGRAMS'), 'SQL should include ngram generation');
      assert(ngramSql.includes('3'), 'SQL should include the ngram size');
      
      // Check with field qualifiers
      const qualifiedSql = generateJaccardSimilaritySql(
        'table1.field1',
        'table2.field2',
        { tokenizationType: 'word' }
      );
      
      assert(qualifiedSql.includes('table1.field1'), 'SQL should preserve table qualifiers');
      assert(qualifiedSql.includes('table2.field2'), 'SQL should preserve table qualifiers');
      
      return true;
    }
  },
  {
    id: 'jaccard_matcher_test',
    name: 'Use Jaccard matcher API correctly',
    type: 'unit',
    tags: ['jaccard', 'api'],
    priority: 1,
    testFn: async () => {
      // Create a matcher with default settings
      const matcher = getJaccardMatcher();
      
      // Test basic matching
      const result = matcher.match('red apple', 'red banana');
      assert(result.score > 0 && result.score < 1, 'Score should be between 0 and 1');
      assert.strictEqual(result.isMatch, result.score >= 0.5, 'isMatch should reflect threshold');
      
      // Test with custom threshold
      const customResult = matcher.match('red apple', 'red banana', { threshold: 0.3 });
      assert.strictEqual(customResult.isMatch, true, 'Should match with lower threshold');
      
      // Test with different tokenization
      const customMatcher = getJaccardMatcher({
        tokenizeOptions: {
          removeStopwords: true,
          stem: true
        },
        defaultThreshold: 0.7
      });
      
      const stemmedResult = customMatcher.match(
        'running quickly',
        'runs fast'
      );
      
      // "running" and "runs" should stem to the same root
      assert(stemmedResult.score > 0, 'Stemming should improve similarity');
      
      // Test SQL generation via the matcher
      const sql = matcher.generateSql('field1', 'field2');
      assert(sql.includes('SPLIT'), 'SQL should include tokenization');
      
      return true;
    }
  }
];

// Jest-style tests for the same functionality
describe('Jaccard Similarity Matcher', () => {
  describe('calculateJaccardSimilarity', () => {
    test('calculates similarity between arrays correctly', () => {
      const set1 = ['apple', 'banana', 'orange'];
      const set2 = ['apple', 'orange', 'kiwi'];
      
      expect(calculateJaccardSimilarity(set1, set2)).toBe(0.5);
    });
    
    test('handles identical sets correctly', () => {
      expect(calculateJaccardSimilarity(['a', 'b', 'c'], ['a', 'b', 'c'])).toBe(1.0);
    });
    
    test('handles disjoint sets correctly', () => {
      expect(calculateJaccardSimilarity(['a', 'b', 'c'], ['d', 'e', 'f'])).toBe(0.0);
    });
    
    test('handles string inputs with tokenization', () => {
      const similarity = calculateJaccardSimilarity(
        'the quick brown fox',
        'the quick red fox',
        { tokenize: true }
      );
      expect(similarity).toBeCloseTo(0.75, 2);
    });
    
    test('handles empty inputs', () => {
      expect(calculateJaccardSimilarity([], [])).toBe(0);
      expect(calculateJaccardSimilarity('', '', { tokenize: true })).toBe(0);
    });
  });
  
  describe('tokenize function', () => {
    test('tokenizes strings into words correctly', () => {
      const tokens = tokenize('The quick brown fox');
      expect(tokens).toEqual(['the', 'quick', 'brown', 'fox']);
    });
    
    test('supports stemming', () => {
      const tokens = tokenize('running runs runner', { stem: true });
      expect(new Set(tokens).size).toBe(1);
    });
    
    test('supports stopword removal', () => {
      const tokens = tokenize('the quick brown fox', { removeStopwords: true });
      expect(tokens).toEqual(['quick', 'brown', 'fox']);
    });
    
    test('supports n-grams', () => {
      const tokens = tokenize('hello', { ngramSize: 2, wordGrams: false });
      expect(tokens).toEqual(['he', 'el', 'll', 'lo']);
    });
  });
  
  describe('SQL generation', () => {
    test('generates valid SQL for word tokenization', () => {
      const sql = generateJaccardSimilaritySql('field1', 'field2', { 
        tokenizationType: 'word' 
      });
      
      expect(sql).toContain('SPLIT');
      expect(sql).toContain('ARRAY_INTERSECT');
    });
    
    test('generates valid SQL for n-gram tokenization', () => {
      const sql = generateJaccardSimilaritySql('field1', 'field2', { 
        tokenizationType: 'ngram',
        ngramSize: 3
      });
      
      expect(sql).toContain('GENERATE_NGRAMS');
      expect(sql).toContain('3');
    });
  });
  
  describe('Jaccard matcher API', () => {
    test('provides a functional matcher interface', () => {
      const matcher = getJaccardMatcher();
      
      const result = matcher.match('red apple', 'red banana');
      expect(result.score).toBeGreaterThan(0);
      expect(result.score).toBeLessThan(1);
      
      const sql = matcher.generateSql('field1', 'field2');
      expect(sql).toContain('SPLIT');
    });
    
    test('honors custom configuration', () => {
      const matcher = getJaccardMatcher({
        tokenizeOptions: { removeStopwords: true },
        defaultThreshold: 0.3
      });
      
      const result = matcher.match('the red apple', 'the red banana');
      expect(result.isMatch).toBe(true);
    });
  });
});

// For manual testing
if (require.main === module) {
  const testRunner = tests => {
    tests.forEach(test => {
      console.log(`Running test: ${test.name}`);
      try {
        const result = test.testFn();
        console.log(`Test ${test.id}: ${result ? 'PASSED' : 'FAILED'}`);
      } catch (error) {
        console.error(`Test ${test.id} failed:`, error);
      }
    });
  };
  
  testRunner(tests);
}

module.exports = { tests };
  
describe('handles empty inputs', () => {    
    test('handles empty inputs', () => {
      expect(calculateJaccardSimilarity([], [])).toBe(0);
      expect(calculateJaccardSimilarity('', '', { tokenize: true })).toBe(0);
    });
  });
  
  describe('tokenize function', () => {
    test('tokenizes strings into words correctly', () => {
      const tokens = tokenize('The quick brown fox');
      expect(tokens).toEqual(['the', 'quick', 'brown', 'fox']);
    });
    
    test('supports stemming', () => {
      const tokens = tokenize('running runs runner', { stem: true });
      expect(new Set(tokens).size).toBe(1);
    });
    
    test('supports stopword removal', () => {
      const tokens = tokenize('the quick brown fox', { removeStopwords: true });
      expect(tokens).toEqual(['quick', 'brown', 'fox']);
    });
    
    test('supports n-grams', () => {
      const tokens = tokenize('hello', { ngramSize: 2, wordGrams: false });
      expect(tokens).toEqual(['he', 'el', 'll', 'lo']);
    });
  });
  
  describe('SQL generation', () => {
    test('generates valid SQL for word tokenization', () => {
      const sql = generateJaccardSimilaritySql('field1', 'field2', { 
        tokenizationType: 'word' 
      });
      
      expect(sql).toContain('SPLIT');
      expect(sql).toContain('ARRAY_INTERSECT');
    });
    
    test('generates valid SQL for n-gram tokenization', () => {
      const sql = generateJaccardSimilaritySql('field1', 'field2', { 
        tokenizationType: 'ngram',
        ngramSize: 3
      });
      
      expect(sql).toContain('GENERATE_NGRAMS');
      expect(sql).toContain('3');
    });
  });
  
  describe('Jaccard matcher API', () => {
    test('provides a functional matcher interface', () => {
      const matcher = getJaccardMatcher();
      
      const result = matcher.match('red apple', 'red banana');
      expect(result.score).toBeGreaterThan(0);
      expect(result.score).toBeLessThan(1);
      
      const sql = matcher.generateSql('field1', 'field2');
      expect(sql).toContain('SPLIT');
    });
    
    test('honors custom configuration', () => {
      const matcher = getJaccardMatcher({
        tokenizeOptions: { removeStopwords: true },
        defaultThreshold: 0.3
      });
      
      const result = matcher.match('the red apple', 'the red banana');
      expect(result.isMatch).toBe(true);
    });
  });

// For manual testing
if (require.main === module) {
  const testRunner = tests => {
    tests.forEach(test => {
      console.log(`Running test: ${test.name}`);
      try {
        const result = test.testFn();
        console.log(`Test ${test.id}: ${result ? 'PASSED' : 'FAILED'}`);
      } catch (error) {
        console.error(`Test ${test.id} failed:`, error);
      }
    });
  };
  
  testRunner(tests);
}

module.exports = { tests };