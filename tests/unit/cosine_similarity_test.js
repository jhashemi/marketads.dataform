const assert = require('assert');
const { cosineSimilarity } = require('../../includes/matching/cosine_similarity');

describe('Cosine Similarity', () => {
  it('should return 1.0 for identical vectors', () => {
    const vec1 = [1, 2, 3];
    const vec2 = [1, 2, 3];
    assert.strictEqual(cosineSimilarity(vec1, vec2), 1.0);
  });

  it('should return 0.0 for orthogonal vectors', () => {
    const vec1 = [1, 0, 0];
    const vec2 = [0, 1, 0];
    assert.strictEqual(cosineSimilarity(vec1, vec2), 0.0);
  });

  it('should handle empty vectors', () => {
    const vec1 = [];
    const vec2 = [];
    assert.strictEqual(cosineSimilarity(vec1, vec2), 0.0);
  });

  it('should handle text similarity', () => {
    const text1 = "apple banana carrot";
    const text2 = "apple banana orange";
    // When converted to vectors, this should have high but not perfect similarity
    const result = cosineSimilarity(
      text1.split(' ').map(w => w.toLowerCase()),
      text2.split(' ').map(w => w.toLowerCase())
    );
    assert(result > 0.5 && result < 1.0);
  });
  
  it('should correctly compute similarity between different vectors', () => {
    const vec1 = [1, 2, 3];
    const vec2 = [4, 5, 6];
    // Cosine similarity should be: 
    // (1*4 + 2*5 + 3*6) / (sqrt(1^2 + 2^2 + 3^2) * sqrt(4^2 + 5^2 + 6^2))
    // = 32 / (sqrt(14) * sqrt(77)) ≈ 0.974
    const expected = 32 / (Math.sqrt(14) * Math.sqrt(77));
    assert.strictEqual(Math.round(cosineSimilarity(vec1, vec2) * 1000) / 1000, 
                       Math.round(expected * 1000) / 1000);
  });
});