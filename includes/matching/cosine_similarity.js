/**
 * Cosine Similarity Module
 * 
 * Implements cosine similarity for vector comparison, useful for text matching
 * and other vector-based similarity calculations.
 */

/**
 * Calculates the cosine similarity between two vectors
 * @param {Array<number>|Array<string>} vec1 - First vector or array of tokens
 * @param {Array<string>|Array<number>} vec2 - Second vector or array of tokens
 * @returns {number} Similarity score between 0 and 1
 */
function cosineSimilarity(vec1, vec2) {
  // Handle empty vectors
  if (!vec1 || !vec2 || vec1.length === 0 || vec2.length === 0) {
    return 0.0;
  }

  // Convert string vectors to term frequency vectors if needed
  if (typeof vec1[0] === 'string' || typeof vec2[0] === 'string') {
    const allTerms = [...new Set([...vec1, ...vec2])];
    const freqVec1 = createTermFrequencyVector(vec1, allTerms);
    const freqVec2 = createTermFrequencyVector(vec2, allTerms);
    
    return calculateCosineSimilarity(freqVec1, freqVec2);
  }
  
  // For numeric vectors, calculate directly
  return calculateCosineSimilarity(vec1, vec2);
}

/**
 * Creates a term frequency vector from an array of terms
 * @param {Array<string>} terms - Array of terms
 * @param {Array<string>} vocabulary - Complete vocabulary
 * @returns {Array<number>} Term frequency vector
 */
function createTermFrequencyVector(terms, vocabulary) {
  const vector = new Array(vocabulary.length).fill(0);
  
  for (const term of terms) {
    const index = vocabulary.indexOf(term);
    if (index !== -1) {
      vector[index]++;
    }
  }
  
  return vector;
}

/**
 * Calculates cosine similarity between two numeric vectors
 * @param {Array<number>} vec1 - First vector
 * @param {Array<number>} vec2 - Second vector
 * @returns {number} Similarity score between 0 and 1
 */
function calculateCosineSimilarity(vec1, vec2) {
  if (vec1.length !== vec2.length) {
    throw new Error('Vectors must have the same length');
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    normA += vec1[i] * vec1[i];
    normB += vec2[i] * vec2[i];
  }
  
  // Avoid division by zero
  if (normA === 0 || normB === 0) {
    return 0;
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

module.exports = {
  cosineSimilarity,
  calculateCosineSimilarity,
  createTermFrequencyVector
};