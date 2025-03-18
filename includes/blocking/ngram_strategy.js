/**
 * N-gram Blocking Strategy
 * 
 * This module implements n-gram based blocking strategies for efficient record matching.
 * N-grams are sequences of n characters from a string, which are useful for fuzzy matching
 * and handling misspellings, typos, and variations in text data.
 */

const { StrategyError } = require('../core/errors');

/**
 * Generates n-grams from a string
 * @param {string} text - Input text
 * @param {Object} options - N-gram options
 * @param {number} [options.n=2] - Size of n-grams (default is bigrams)
 * @param {boolean} [options.removeSpaces=false] - Whether to remove spaces before processing
 * @param {boolean} [options.normalize=true] - Whether to normalize text (lowercase)
 * @returns {Array<string>} Array of n-grams
 */
function ngramBlockingKey(text, options = {}) {
  if (!text || typeof text !== 'string') {
    return [];
  }
  
  // Set default options
  const n = options.n || 2;
  const removeSpaces = options.removeSpaces || false;
  const normalize = options.normalize !== false; // Default true
  
  // Normalize the text
  let processedText = text;
  if (normalize) {
    processedText = processedText.toLowerCase();
  }
  
  // Remove spaces if requested
  if (removeSpaces) {
    processedText = processedText.replace(/\s+/g, '');
  }
  
  // Handle case where string is shorter than n
  if (processedText.length < n) {
    return processedText.length > 0 ? [processedText] : [];
  }
  
  // Generate n-grams
  const ngrams = [];
  for (let i = 0; i <= processedText.length - n; i++) {
    ngrams.push(processedText.substring(i, i + n));
  }
  
  return ngrams;
}

/**
 * Generates blocking keys using n-grams with various options
 * @param {string} text - Input text
 * @param {Object} options - Blocking options
 * @param {number} [options.n=2] - Size of n-grams
 * @param {number} [options.minBlockingKeys=3] - Minimum number of keys to generate
 * @param {number} [options.maxBlockingKeys=10] - Maximum number of keys to generate
 * @param {boolean} [options.removeSpaces=false] - Whether to remove spaces
 * @param {boolean} [options.normalize=true] - Whether to normalize text
 * @param {boolean} [options.includePrefix=false] - Whether to include a prefix
 * @param {string} [options.keyPrefix=''] - Prefix for keys
 * @param {number} [options.prefixLength=0] - Characters to use from text as prefix
 * @param {number} [options.minFrequency=1] - Minimum frequency of n-gram to be included
 * @returns {Array<string>} Array of blocking keys
 */
function generateNgramBlocks(text, options = {}) {
  if (!text || typeof text !== 'string') {
    return [];
  }
  
  // Set default options
  const {
    n = 2,
    minBlockingKeys = 3,
    maxBlockingKeys = 10,
    removeSpaces = false,
    normalize = true,
    includePrefix = false,
    keyPrefix = '',
    prefixLength = 0,
    minFrequency = 1
  } = options;
  
  // Generate n-grams
  const ngrams = ngramBlockingKey(text, { n, removeSpaces, normalize });
  
  // If no n-grams, return empty array
  if (ngrams.length === 0) {
    return [];
  }
  
  // Count frequency of each n-gram
  const ngramCounts = {};
  for (const gram of ngrams) {
    ngramCounts[gram] = (ngramCounts[gram] || 0) + 1;
  }
  
  // Filter by frequency
  let filteredNgrams = Object.entries(ngramCounts)
    .filter(([gram, count]) => count >= minFrequency)
    .map(([gram]) => gram);
  
  // Make sure we have unique n-grams
  filteredNgrams = [...new Set(filteredNgrams)];
  
  // Apply prefix if requested
  let blockingKeys = filteredNgrams;
  
  // Add text prefix if requested
  if (prefixLength > 0) {
    const textPrefix = normalize ? 
      text.toLowerCase().trim().substring(0, prefixLength) : 
      text.trim().substring(0, prefixLength);
    
    if (textPrefix.length > 0) {
      // Add the prefix as its own key
      blockingKeys.push(textPrefix);
    }
  }
  
  // Apply key prefix if requested
  if (includePrefix && keyPrefix) {
    blockingKeys = blockingKeys.map(key => `${keyPrefix}_${key}`);
  }
  
  // Sort by length (shorter is often better)
  blockingKeys.sort((a, b) => a.length - b.length);
  
  // Limit to min/max keys
  if (blockingKeys.length < minBlockingKeys) {
    // If we have fewer keys than minimum, duplicate some keys
    // This is just to satisfy the minimum requirements
    while (blockingKeys.length < minBlockingKeys && blockingKeys.length > 0) {
      blockingKeys.push(blockingKeys[blockingKeys.length % blockingKeys.length]);
    }
  }
  
  // Limit to max keys
  return blockingKeys.slice(0, maxBlockingKeys);
}

/**
 * Calculates similarity between two strings using n-gram overlap
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @param {Object} options - Similarity options
 * @param {number} [options.n=2] - Size of n-grams
 * @param {boolean} [options.normalize=true] - Whether to normalize text
 * @returns {number} Similarity score between 0 and 1
 */
function ngramSimilarity(str1, str2, options = {}) {
  if (str1 === str2) return 1.0;
  
  if (!str1 || !str2) {
    // Both empty strings are treated as identical
    if (str1 === '' && str2 === '') return 1.0;
    return 0.0;
  }
  
  // Set default options
  const n = options.n || 2;
  const normalize = options.normalize !== false;
  
  // Generate n-grams for both strings
  const ngrams1 = ngramBlockingKey(str1, { n, normalize });
  const ngrams2 = ngramBlockingKey(str2, { n, normalize });
  
  // If either set is empty, no similarity
  if (ngrams1.length === 0 || ngrams2.length === 0) {
    return 0.0;
  }
  
  // Calculate Jaccard similarity (intersection/union)
  const set1 = new Set(ngrams1);
  const set2 = new Set(ngrams2);
  
  // Calculate intersection
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  
  // Calculate union
  const union = new Set([...set1, ...set2]);
  
  // Jaccard similarity
  return intersection.size / union.size;
}

/**
 * Creates SQL for generating n-gram blocking keys
 * @param {string} fieldName - Field name to generate keys for
 * @param {Object} options - N-gram options
 * @returns {string} SQL expression for generating n-gram keys
 */
function generateNgramSql(fieldName, options = {}) {
  const n = options.n || 2;
  const normalize = options.normalize !== false;
  const removeSpaces = options.removeSpaces || false;
  
  let fieldExpr = fieldName;
  
  // Apply normalization
  if (normalize) {
    fieldExpr = `LOWER(${fieldExpr})`;
  }
  
  // Apply space removal
  if (removeSpaces) {
    fieldExpr = `REPLACE(${fieldExpr}, ' ', '')`;
  }
  
  // Generate n-gram SQL
  // This is a simplified approach - in a real database you might use
  // a custom function or more complex SQL
  return `
    WITH chars AS (
      SELECT 
        ROW_NUMBER() OVER() as pos,
        SUBSTRING(${fieldExpr}, ROW_NUMBER() OVER(), 1) as char
      FROM 
        UNNEST(GENERATE_ARRAY(1, LENGTH(${fieldExpr}))) as nums
    ),
    ngrams AS (
      SELECT
        STRING_AGG(char, '' ORDER BY pos ASC) as ngram
      FROM
        chars
      GROUP BY
        FLOOR(pos / ${n})
      HAVING
        LENGTH(STRING_AGG(char, '' ORDER BY pos ASC)) = ${n}
    )
    SELECT ARRAY_AGG(ngram) FROM ngrams
  `;
}

/**
 * Register n-gram blocking strategy with the strategy registry
 * @param {Object} strategyRegistry - Strategy registry
 */
function registerNgramStrategy(strategyRegistry) {
  if (!strategyRegistry) {
    throw new Error('Strategy registry is required');
  }
  
  strategyRegistry.register('ngram', {
    generateKey: ngramBlockingKey,
    generateBlocks: generateNgramBlocks,
    generateSql: generateNgramSql,
    calculateSimilarity: ngramSimilarity
  });
}

module.exports = {
  ngramBlockingKey,
  generateNgramBlocks,
  ngramSimilarity,
  generateNgramSql,
  registerNgramStrategy
};