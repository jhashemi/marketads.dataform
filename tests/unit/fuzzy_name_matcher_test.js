const assert = require('assert');
const { calculatePhoneticSimilarity, soundexSimilarity, metaphoneSimilarity, fuzzyNameMatch } = require('../../includes/matching/fuzzy_name_matcher');

describe('Fuzzy Name Matcher', () => {
  describe('calculatePhoneticSimilarity', () => {
    it('should return 1.0 for identical names', () => {
      assert.strictEqual(calculatePhoneticSimilarity('John', 'John'), 1.0);
    });

    it('should return high similarity for phonetically similar names', () => {
      const score = calculatePhoneticSimilarity('Catherine', 'Katherine');
      assert(score > 0.7, `Expected similarity > 0.7, got ${score}`);
    });

    it('should return low similarity for different names', () => {
      const score = calculatePhoneticSimilarity('John', 'Michael');
      assert(score < 0.3, `Expected similarity < 0.3, got ${score}`);
    });

    it('should handle empty strings', () => {
      assert.strictEqual(calculatePhoneticSimilarity('', ''), 0.0);
      assert.strictEqual(calculatePhoneticSimilarity('John', ''), 0.0);
    });
  });

  describe('soundexSimilarity', () => {
    it('should return 1.0 for identical soundex codes', () => {
      assert.strictEqual(soundexSimilarity('Smith', 'Smith'), 1.0);
    });

    it('should return 1.0 for names with the same soundex code', () => {
      assert.strictEqual(soundexSimilarity('Smith', 'Smyth'), 1.0);
    });

    it('should return 0.0 for completely different soundex codes', () => {
      assert.strictEqual(soundexSimilarity('Smith', 'Jones'), 0.0);
    });
  });

  describe('metaphoneSimilarity', () => {
    it('should return 1.0 for identical metaphone codes', () => {
      assert.strictEqual(metaphoneSimilarity('Williams', 'Williams'), 1.0);
    });

    it('should return 1.0 for names with the same metaphone code', () => {
      assert.strictEqual(metaphoneSimilarity('Williams', 'Williems'), 1.0);
    });

    it('should return 0.0 for completely different metaphone codes', () => {
      assert.strictEqual(metaphoneSimilarity('Williams', 'Johnson'), 0.0);
    });
  });

  describe('fuzzyNameMatch', () => {
    it('should match exact names with high confidence', () => {
      const result = fuzzyNameMatch(
        { firstName: 'John', lastName: 'Smith' }, 
        { firstName: 'John', lastName: 'Smith' }
      );
      assert.strictEqual(result.confidence, 1.0);
      assert.strictEqual(result.tier, 'HIGH');
    });

    it('should match phonetically similar names with medium-high confidence', () => {
      const result = fuzzyNameMatch(
        { firstName: 'Catherine', lastName: 'Smith' }, 
        { firstName: 'Katherine', lastName: 'Smyth' }
      );
      assert(result.confidence > 0.7);
      assert(['HIGH', 'MEDIUM'].includes(result.tier));
    });

    it('should handle missing first names by using only last names', () => {
      const result = fuzzyNameMatch(
        { lastName: 'Smith' }, 
        { lastName: 'Smith' }
      );
      assert(result.confidence > 0);
      assert(result.tier !== 'NO_MATCH');
    });

    it('should handle nicknames and common name variations', () => {
      const result = fuzzyNameMatch(
        { firstName: 'William', lastName: 'Jones' }, 
        { firstName: 'Bill', lastName: 'Jones' }
      );
      assert(result.confidence > 0.6);
      assert(['HIGH', 'MEDIUM'].includes(result.tier));
    });

    it('should return low confidence for completely different names', () => {
      const result = fuzzyNameMatch(
        { firstName: 'John', lastName: 'Smith' }, 
        { firstName: 'Michael', lastName: 'Williams' }
      );
      assert(result.confidence < 0.5);
      assert(['LOW', 'MINIMUM', 'NO_MATCH'].includes(result.tier));
    });
  });
});