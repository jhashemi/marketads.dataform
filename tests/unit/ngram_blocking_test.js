const assert = require('assert');
const { ngramBlockingKey, generateNgramBlocks, ngramSimilarity } = require('../../includes/blocking/ngram_strategy');

describe('N-gram Blocking Strategy', () => {
  describe('ngramBlockingKey', () => {
    it('should generate bigram blocking key for simple string', () => {
      const result = ngramBlockingKey('test', { n: 2 });
      assert.deepStrictEqual(result, ['te', 'es', 'st']);
    });

    it('should generate trigram blocking key', () => {
      const result = ngramBlockingKey('testing', { n: 3 });
      assert.deepStrictEqual(result, ['tes', 'est', 'sti', 'tin', 'ing']);
    });

    it('should handle short strings', () => {
      const result = ngramBlockingKey('ab', { n: 3 });
      assert.deepStrictEqual(result, ['ab']); // Returns the string itself if shorter than n
    });

    it('should handle spaces and normalize', () => {
      const result = ngramBlockingKey('Hello World', { n: 2, removeSpaces: true });
      assert.deepStrictEqual(result, ['he', 'el', 'll', 'lo', 'ow', 'wo', 'or', 'rl', 'ld']);
    });

    it('should return empty array for empty input', () => {
      const result = ngramBlockingKey('', { n: 2 });
      assert.deepStrictEqual(result, []);
    });

    it('should normalize text by default', () => {
      const result = ngramBlockingKey('TEST', { n: 2 });
      assert.deepStrictEqual(result, ['te', 'es', 'st']);
    });
  });

  describe('generateNgramBlocks', () => {
    it('should generate a set of blocking keys', () => {
      const result = generateNgramBlocks('John Smith', { n: 2, minBlockingKeys: 3, maxBlockingKeys: 5 });
      assert(result.length >= 3);
      assert(result.length <= 5);
      assert(result.every(key => typeof key === 'string'));
    });

    it('should generate blocks with prefixes', () => {
      const result = generateNgramBlocks('test@example.com', { 
        n: 2, 
        includePrefix: true,
        prefixLength: 3,
        keyPrefix: 'email'
      });
      
      assert(result.some(key => key.startsWith('email_')));
      assert(result.some(key => key.includes('tes'))); // First 3 chars
    });

    it('should deduplicate blocks', () => {
      const result = generateNgramBlocks('aaaa', { n: 2 });
      assert.strictEqual(result.length, 1); // Only 'aa' should be generated
    });

    it('should generate correct number of keys with minFrequency', () => {
      const result = generateNgramBlocks('testing testing', { 
        n: 2, 
        minFrequency: 2, // Only n-grams that appear at least twice
        removeSpaces: true
      });
      
      // 'te', 'es', 'st', 'ti', 'in', 'ng' appear twice, but we deduplicate
      assert(result.length <= 6);
    });
  });

  describe('ngramSimilarity', () => {
    it('should return 1.0 for identical strings', () => {
      const result = ngramSimilarity('test', 'test', { n: 2 });
      assert.strictEqual(result, 1.0);
    });

    it('should return high similarity for similar strings', () => {
      const result = ngramSimilarity('Smith', 'Smyth', { n: 2 });
      assert(result > 0.6);
    });

    it('should return low similarity for different strings', () => {
      const result = ngramSimilarity('apple', 'orange', { n: 2 });
      assert(result < 0.3);
    });

    it('should handle case differences', () => {
      const result = ngramSimilarity('TEST', 'test', { n: 2 });
      assert.strictEqual(result, 1.0);
    });

    it('should handle empty strings', () => {
      assert.strictEqual(ngramSimilarity('', '', { n: 2 }), 1.0);
      assert.strictEqual(ngramSimilarity('test', '', { n: 2 }), 0.0);
    });
  });
});