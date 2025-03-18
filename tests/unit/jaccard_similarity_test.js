const assert = require('assert');
const { 
  calculateJaccardSimilarity,
  generateJaccardSql,
  getJaccardMatcher
} = require('../../includes/matching/jaccard_matcher');

describe('Jaccard Similarity Matcher', () => {
  describe('calculateJaccardSimilarity', () => {
    it('should calculate similarity for arrays', () => {
      const set1 = ['apple', 'banana', 'orange'];
      const set2 = ['banana', 'orange', 'grape'];
      
      const similarity = calculateJaccardSimilarity(set1, set2);
      // Intersection: banana, orange (2 items)
      // Union: apple, banana, orange, grape (4 items)
      // Jaccard: 2/4 = 0.5
      assert.strictEqual(similarity, 0.5);
    });

    it('should handle empty arrays', () => {
      assert.strictEqual(calculateJaccardSimilarity([], []), 1.0); // By convention, empty sets match perfectly
      assert.strictEqual(calculateJaccardSimilarity(['apple'], []), 0.0);
      assert.strictEqual(calculateJaccardSimilarity([], ['apple']), 0.0);
    });

    it('should handle identical arrays', () => {
      const set = ['apple', 'banana', 'orange'];
      assert.strictEqual(calculateJaccardSimilarity(set, set), 1.0);
      assert.strictEqual(calculateJaccardSimilarity(set, [...set]), 1.0);
    });

    it('should handle completely different arrays', () => {
      const set1 = ['apple', 'banana', 'orange'];
      const set2 = ['grape', 'kiwi', 'mango'];
      assert.strictEqual(calculateJaccardSimilarity(set1, set2), 0.0);
    });

    it('should handle string inputs by tokenizing', () => {
      const str1 = 'apple banana orange';
      const str2 = 'banana orange grape';
      
      const similarity = calculateJaccardSimilarity(str1, str2, { tokenize: true });
      assert.strictEqual(similarity, 0.5);
    });

    it('should apply custom weights', () => {
      const set1 = ['apple', 'banana', 'orange'];
      const set2 = ['banana', 'orange', 'grape'];
      
      const weights = {
        'apple': 0.5,
        'banana': 2.0,
        'orange': 1.0,
        'grape': 0.5
      };
      
      const similarity = calculateJaccardSimilarity(set1, set2, { weights });
      // Weighted intersection: banana (2.0) + orange (1.0) = 3.0
      // Weighted union: apple (0.5) + banana (2.0) + orange (1.0) + grape (0.5) = 4.0
      // Weighted Jaccard: 3.0/4.0 = 0.75
      assert.strictEqual(similarity, 0.75);
    });
  });

  describe('generateJaccardSql', () => {
    it('should generate SQL for array fields', () => {
      const sql = generateJaccardSql('source_table.tags', 'target_table.categories');
      
      assert(sql.includes('ARRAY_LENGTH'));
      assert(sql.includes('ARRAY_INTERSECT'));
      assert(sql.includes('ARRAY_UNION'));
      assert(sql.includes('source_table.tags'));
      assert(sql.includes('target_table.categories'));
    });

    it('should generate SQL for string fields with tokenization', () => {
      const sql = generateJaccardSql(
        'source_table.keywords', 
        'target_table.interests', 
        { tokenize: true, delimiter: ',' }
      );
      
      assert(sql.includes('SPLIT'));
      assert(sql.includes(','));
    });

    it('should include weight expressions when provided', () => {
      const sql = generateJaccardSql(
        'source_table.tags', 
        'target_table.tags', 
        { 
          weightExpr: `
            CASE
              WHEN tag = 'important' THEN 2.0
              WHEN tag = 'minor' THEN 0.5
              ELSE 1.0
            END
          `
        }
      );
      
      assert(sql.includes('WHEN tag = \'important\''));
      assert(sql.includes('THEN 2.0'));
    });
  });

  describe('getJaccardMatcher', () => {
    it('should return a matcher object with required methods', () => {
      const matcher = getJaccardMatcher();
      
      assert.strictEqual(typeof matcher.calculateSimilarity, 'function');
      assert.strictEqual(typeof matcher.generateSql, 'function');
      assert.strictEqual(typeof matcher.compareArrays, 'function');
      assert.strictEqual(typeof matcher.compareStrings, 'function');
    });
    
    it('should accept custom configuration', () => {
      const matcher = getJaccardMatcher({
        defaultDelimiter: '|',
        defaultThreshold: 0.7,
        defaultWeights: { 'important': 2.0 }
      });
      
      assert(matcher);
      // Configuration would affect behavior of methods, but we can't easily test that directly
    });
  });
});