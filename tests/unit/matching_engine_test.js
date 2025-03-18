const { MatchEngine, calculateSimilarity, calculateJaccardSimilarity } = require('../../includes/matching/engine');
const assert = require('assert');

describe('Matching Engine - calculateSimilarity', () => {

  it('should use jaccardSimilarity for address_components', () => {
    const value1 = ['123', 'Main', 'St'];
    const value2 = ['123', 'Main', 'Street'];
    const semanticType = 'address_components';

    // Expected Jaccard similarity: 2/4 = 0.5
    const expectedSimilarity = 0.5;
    const similarity = calculateSimilarity(value1, value2, semanticType);
    assert.strictEqual(similarity, expectedSimilarity, "Jaccard similarity calculation failed");
  });

  it('should use calculateLevenshteinSimilarity for unknown types', () => {
    const value1 = "test1";
    const value2 = "test2";
    const semanticType = "unknown_type";

    // For unknown types, it should fallback to levenshtein
    const expectedSimilarity = 1 - (1 / 5); // Levenshtein distance of 1, max length 5
    const similarity = calculateSimilarity(value1, value2, semanticType);
    assert.strictEqual(similarity, expectedSimilarity, "Levenshtein similarity calculation failed");
  });

  it('should return 0 for null values', () => {
    assert.strictEqual(calculateSimilarity(null, "test", "any"), 0, "Null value 1 failed");
    assert.strictEqual(calculateSimilarity("test", null, "any"), 0, "Null value 2 failed");
    assert.strictEqual(calculateSimilarity(null, null, "any"), 0, "Null value both failed");
  });

  it('should return 1 for exact string matches', () => {
    assert.strictEqual(calculateSimilarity("test", "test", "any"), 1.0, "Exact match failed");
  });
});

describe('Matching Engine - calculateJaccardSimilarity', () => {
  it('should calculate Jaccard similarity correctly for overlapping arrays', () => {
    const arr1 = ['apple', 'banana', 'orange'];
    const arr2 = ['apple', 'orange', 'grape'];
    // Intersection: ['apple', 'orange'] = 2 elements
    // Union: ['apple', 'banana', 'orange', 'grape'] = 4 elements
    // Jaccard similarity = 2/4 = 0.5
    const expectedSimilarity = 0.5;
    assert.strictEqual(calculateJaccardSimilarity(arr1, arr2), expectedSimilarity);
  });

  it('should return 1 for identical arrays', () => {
    const arr1 = ['apple', 'banana', 'orange'];
    const arr2 = ['apple', 'banana', 'orange'];
    assert.strictEqual(calculateJaccardSimilarity(arr1, arr2), 1.0);
  });

  it('should return 0 for completely different arrays', () => {
    const arr1 = ['apple', 'banana', 'orange'];
    const arr2 = ['grape', 'kiwi', 'mango'];
    assert.strictEqual(calculateJaccardSimilarity(arr1, arr2), 0.0);
  });

  it('should handle empty arrays properly', () => {
    // Both empty arrays should have similarity 1 (they're identical)
    assert.strictEqual(calculateJaccardSimilarity([], []), 1.0);
    // One empty array should have similarity 0 (no overlap)
    assert.strictEqual(calculateJaccardSimilarity(['apple'], []), 0.0);
    assert.strictEqual(calculateJaccardSimilarity([], ['apple']), 0.0);
  });

  it('should handle non-array inputs', () => {
    // Return 0 for non-array inputs
    assert.strictEqual(calculateJaccardSimilarity('string', []), 0.0);
    assert.strictEqual(calculateJaccardSimilarity([], 'string'), 0.0);
    assert.strictEqual(calculateJaccardSimilarity(null, []), 0.0);
    assert.strictEqual(calculateJaccardSimilarity(undefined, []), 0.0);
    assert.strictEqual(calculateJaccardSimilarity({}, []), 0.0);
  });

  it('should be case insensitive', () => {
    const arr1 = ['Apple', 'BANANA', 'orange'];
    const arr2 = ['apple', 'banana', 'ORANGE'];
    assert.strictEqual(calculateJaccardSimilarity(arr1, arr2), 1.0);
  });

  it('should handle arrays with duplicate values', () => {
    // Duplicates should be treated as a single element in the set
    const arr1 = ['apple', 'apple', 'banana', 'orange'];
    const arr2 = ['apple', 'orange', 'orange', 'grape'];
    // Sets become: ['apple', 'banana', 'orange'] and ['apple', 'orange', 'grape']
    // Intersection: ['apple', 'orange'] = 2 elements
    // Union: ['apple', 'banana', 'orange', 'grape'] = 4 elements
    // Jaccard similarity = 2/4 = 0.5
    assert.strictEqual(calculateJaccardSimilarity(arr1, arr2), 0.5);
  });
});