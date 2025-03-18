/**
 * Unit tests for the Cosine Similarity Matcher
 */
const assert = require('assert');
const { 
  calculateCosineSimilarity,
  createFeatureVector,
  vectorizeText,
  generateCosineSimilaritySql,
  getCosineMatcher
} = require('../../includes/matching/cosine_similarity_matcher');

// Define test cases as an array for test runner compatibility
const tests = [
  {
    id: 'cosine_similarity_calculation_test',
    name: 'Calculate Cosine similarity correctly',
    type: 'unit',
    tags: ['cosine', 'vector', 'core'],
    priority: 1,
    testFn: async () => {
      // Test with simple vectors
      const vec1 = { apple: 1, banana: 2, orange: 3 };
      const vec2 = { apple: 2, orange: 2, kiwi: 1 };
      
      // Expected value:
      // Dot product = (1*2) + (0*0) + (3*2) + (0*1) = 2 + 0 + 6 + 0 = 8
      // |vec1| = sqrt(1^2 + 2^2 + 3^2) = sqrt(14)
      // |vec2| = sqrt(2^2 + 0^2 + 2^2 + 1^2) = sqrt(9)
      // cosine = 8 / (sqrt(14) * sqrt(9)) = 8 / sqrt(126) ≈ 0.7127
      const similarity = calculateCosineSimilarity(vec1, vec2);
      assert(
        Math.abs(similarity - 0.7127) < 0.01, 
        `Expected similarity close to 0.7127, got ${similarity}`
      );
      
      // Test with identical vectors
      const identicalSimilarity = calculateCosineSimilarity(
        { a: 1, b: 2, c: 3 }, 
        { a: 1, b: 2, c: 3 }
      );
      assert.strictEqual(
        Math.round(identicalSimilarity * 1000) / 1000, 
        1.0, 
        'Identical vectors should have similarity 1.0'
      );
      
      // Test with orthogonal vectors
      const orthogonalSimilarity = calculateCosineSimilarity(
        { a: 1, b: 0 }, 
        { a: 0, b: 1 }
      );
      assert.strictEqual(
        orthogonalSimilarity, 
        0.0, 
        'Orthogonal vectors should have similarity 0.0'
      );
      
      // Test with empty inputs
      assert.strictEqual(
        calculateCosineSimilarity({}, {}), 
        0, 
        'Empty vectors should have similarity 0'
      );
      
      return true;
    }
  },
  {
    id: 'vectorization_test',
    name: 'Vectorize text correctly',
    type: 'unit',
    tags: ['cosine', 'vector', 'tokenization'],
    priority: 1,
    testFn: async () => {
      // Test basic vectorization
      const vector = vectorizeText('the quick brown fox jumps over the lazy dog');
      assert(vector.the === 2, 'Should count word frequency correctly');
      assert(vector.quick === 1, 'Should count single words correctly');
      assert(vector.brown === 1, 'Should tokenize correctly');
      
      // Test with case insensitivity
      const caseVector = vectorizeText('The QUICK brown FOX');
      assert(caseVector.the === 1, 'Should be case insensitive');
      assert(caseVector.quick === 1, 'Should handle uppercase words');
      
      // Test with stopwords removal
      const noStopwordsVector = vectorizeText('the quick brown fox jumps over the lazy dog', {
        removeStopwords: true
      });
      assert(noStopwordsVector.the === undefined, 'Should remove stopwords');
      assert(noStopwordsVector.quick === 1, 'Should keep non-stopwords');
      
      // Test with stemming
      const stemmedVector = vectorizeText('running runs runner run', {
        stem: true
      });
      // All forms should stem to 'run'
      assert(stemmedVector.run === 4, 'Should stem words to their root');
      
      // Test with n-grams
      const bigramVector = vectorizeText('hello world', {
        ngramSize: 2,
        wordGrams: true
      });
      assert(bigramVector['hello world'] === 1, 'Should create word bigrams');
      
      // Test with character n-grams
      const charNgramVector = vectorizeText('hello', {
        ngramSize: 2,
        wordGrams: false
      });
      assert(charNgramVector.he === 1, 'Should create character bigrams');
      assert(charNgramVector.el === 1, 'Should create all consecutive character bigrams');
      
      return true;
    }
  },
  {
    id: 'feature_vector_creation_test',
    name: 'Create feature vectors correctly',
    type: 'unit',
    tags: ['cosine', 'vector'],
    priority: 1,
    testFn: async () => {
      // Test basic feature creation
      const features = createFeatureVector(['apple', 'banana', 'apple', 'orange']);
      assert.deepStrictEqual(
        features, 
        { apple: 2, banana: 1, orange: 1 },
        'Should count occurrences correctly'
      );
      
      // Test with numeric features
      const numericFeatures = createFeatureVector(
        ['item1', 'item2', 'item3'],
        [5, 2, 3]
      );
      assert.deepStrictEqual(
        numericFeatures,
        { item1: 5, item2: 2, item3: 3 },
        'Should use provided weights'
      );
      
      // Test with empty arrays
      assert.deepStrictEqual(
        createFeatureVector([]),
        {},
        'Should handle empty arrays'
      );
      
      // Test with values that are not valid keys
      const mixedFeatures = createFeatureVector([null, undefined, 'valid', 0, '']);
      assert.deepStrictEqual(
        mixedFeatures,
        { valid: 1 },
        'Should ignore invalid keys'
      );
      
      return true;
    }
  },
  {
    id: 'sql_generation_test',
    name: 'Generate SQL for Cosine similarity',
    type: 'unit',
    tags: ['cosine', 'sql'],
    priority: 1,
    testFn: async () => {
      // Generate SQL for Cosine similarity
      const sql = generateCosineSimilaritySql(
        'field1',
        'field2',
        { vectorizationType: 'word' }
      );
      
      // Check that SQL includes typical vector calculation functions
      assert(sql.includes('SPLIT'), 'SQL should include tokenization');
      assert(sql.includes('SUM'), 'SQL should include dot product calculation');
      assert(sql.includes('SQRT'), 'SQL should include vector magnitude calculation');
      
      // Check with TF-IDF option
      const tfidfSql = generateCosineSimilaritySql(
        'field1',
        'field2',
        { useTfIdf: true }
      );
      
      assert(tfidfSql.includes('LOG'), 'SQL should include TF-IDF calculation');
      
      // Check with field qualifiers
      const qualifiedSql = generateCosineSimilaritySql(
        'table1.field1',
        'table2.field2'
      );
      
      assert(qualifiedSql.includes('table1.field1'), 'SQL should preserve table qualifiers');
      assert(qualifiedSql.includes('table2.field2'), 'SQL should preserve table qualifiers');
      
      return true;
    }
  },
  {
    id: 'cosine_matcher_api_test',
    name: 'Use Cosine matcher API correctly',
    type: 'unit',
    tags: ['cosine', 'api'],
    priority: 1,
    testFn: async () => {
      // Create a matcher with default settings
      const matcher = getCosineMatcher();
      
      // Test basic matching
      const result = matcher.match('red apple', 'red banana');
      assert(result.score > 0 && result.score < 1, 'Score should be between 0 and 1');
      assert.strictEqual(result.isMatch, result.score >= 0.5, 'isMatch should reflect threshold');
      
      // Test with custom threshold
      const customResult = matcher.match('red apple', 'red banana', { threshold: 0.3 });
      assert.strictEqual(customResult.isMatch, true, 'Should match with lower threshold');
      
      // Test with different vectorization
      const customMatcher = getCosineMatcher({
        vectorizeOptions: {
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
describe('Cosine Similarity Matcher', () => {
  describe('calculateCosineSimilarity', () => {
    test('calculates similarity between vectors correctly', () => {
      const vec1 = { apple: 1, banana: 2, orange: 3 };
      const vec2 = { apple: 2, orange: 2, kiwi: 1 };
      
      const similarity = calculateCosineSimilarity(vec1, vec2);
      expect(similarity).toBeCloseTo(0.7127, 2);
    });
    
    test('handles identical vectors correctly', () => {
      expect(calculateCosineSimilarity(
        { a: 1, b: 2, c: 3 }, 
        { a: 1, b: 2, c: 3 }
      )).toBeCloseTo(1.0, 3);
    });
    
    test('handles orthogonal vectors correctly', () => {
      expect(calculateCosineSimilarity(
        { a: 1, b: 0 }, 
        { a: 0, b: 1 }
      )).toBe(0);
    });
    
    test('handles empty inputs', () => {
      expect(calculateCosineSimilarity({}, {})).toBe(0);
    });
  });
  
  describe('vectorizeText function', () => {
    test('vectorizes strings into word frequency maps', () => {
      const vector = vectorizeText('the quick brown fox jumps over the lazy dog');
      
      expect(vector.the).toBe(2);
      expect(vector.quick).toBe(1);
      expect(vector.fox).toBe(1);
    });
    
    test('supports stemming', () => {
      const vector = vectorizeText('running runs runner run', { stem: true });
      expect(vector.run).toBe(4);
    });
    
    test('supports stopword removal', () => {
      const vector = vectorizeText('the quick brown fox', { removeStopwords: true });
      expect(vector.the).toBeUndefined();
      expect(vector.quick).toBe(1);
    });
  });
  
  describe('SQL generation', () => {
    test('generates valid SQL for word tokenization', () => {
      const sql = generateCosineSimilaritySql('field1', 'field2', { 
        vectorizationType: 'word' 
      });
      
      expect(sql).toContain('SPLIT');
      expect(sql).toContain('SUM');
      expect(sql).toContain('SQRT');
    });
    
    test('supports TF-IDF weighting', () => {
      const sql = generateCosineSimilaritySql('field1', 'field2', { 
        useTfIdf: true
      });
      
      expect(sql).toContain('LOG');
    });
  });
  
  describe('Cosine matcher API', () => {
    test('provides a functional matcher interface', () => {
      const matcher = getCosineMatcher();
      
      const result = matcher.match('red apple', 'red banana');
      expect(result.score).toBeGreaterThan(0);
      expect(result.score).toBeLessThan(1);
      
      const sql = matcher.generateSql('field1', 'field2');
      expect(sql).toContain('SPLIT');
    });
    
    test('honors custom configuration', () => {
      const matcher = getCosineMatcher({
        vectorizeOptions: { removeStopwords: true },
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