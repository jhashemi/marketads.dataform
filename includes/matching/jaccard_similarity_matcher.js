/**
 * Jaccard Similarity Matcher
 * 
 * This module provides functionality for comparing string similarity using the Jaccard similarity coefficient.
 * The Jaccard similarity is calculated as the size of the intersection divided by the size of the union
 * of two sets, making it effective for comparing text that can be tokenized into sets.
 */

// Import natural for NLP operations (stemming, stopwords)
const natural = require('natural');
const { PorterStemmer } = natural;
const stopwords = require('../utils/stopwords').english;

/**
 * Tokenize a string into an array of tokens
 * @param {string} text - Input text to tokenize
 * @param {Object} [options={}] - Tokenization options
 * @param {boolean} [options.lowercase=true] - Convert to lowercase before tokenizing
 * @param {boolean} [options.stem=false] - Apply stemming to tokens
 * @param {boolean} [options.removeStopwords=false] - Remove common stopwords
 * @param {number} [options.ngramSize=1] - Size of n-grams to generate (1 = words/chars, 2+ = n-grams)
 * @param {boolean} [options.wordGrams=true] - Whether to use word n-grams (true) or character n-grams (false)
 * @param {Function} [options.tokenizer] - Custom tokenizer function
 * @returns {string[]} Array of tokens
 */
function tokenize(text, options = {}) {
  const {
    lowercase = true,
    stem = false,
    removeStopwords = false,
    ngramSize = 1,
    wordGrams = true,
    tokenizer = null
  } = options;
  
  if (!text) {
    return [];
  }
  
  let workingText = text;
  
  // Apply lowercase if requested
  if (lowercase) {
    workingText = workingText.toLowerCase();
  }
  
  // Use custom tokenizer if provided
  if (typeof tokenizer === 'function') {
    return tokenizer(workingText);
  }
  
  // Generate character n-grams if requested
  if (!wordGrams && ngramSize > 1) {
    return generateCharNgrams(workingText, ngramSize);
  }
  
  // Default word tokenization (split on whitespace and punctuation)
  let tokens;
  if (natural.WordTokenizer) {
    // Use natural's tokenizer if available
    const wordTokenizer = new natural.WordTokenizer();
    tokens = wordTokenizer.tokenize(workingText);
  } else {
    // Fallback tokenizer
    tokens = workingText.split(/[\s\p{P}]+/u).filter(Boolean);
  }
  
  // Apply stopword removal if requested
  if (removeStopwords) {
    tokens = tokens.filter(token => !stopwords.includes(token));
  }
  
  // Apply stemming if requested
  if (stem) {
    tokens = tokens.map(token => PorterStemmer.stem(token));
  }
  
  // Generate word n-grams if requested
  if (wordGrams && ngramSize > 1) {
    return generateWordNgrams(tokens, ngramSize);
  }
  
  return tokens;
}

/**
 * Generate character n-grams from a string
 * @param {string} text - Input text
 * @param {number} n - Size of n-grams
 * @returns {string[]} Array of character n-grams
 */
function generateCharNgrams(text, n) {
  if (!text || n <= 0 || text.length < n) {
    return [];
  }
  
  const ngrams = [];
  for (let i = 0; i <= text.length - n; i++) {
    ngrams.push(text.substring(i, i + n));
  }
  
  return ngrams;
}

/**
 * Generate word n-grams from an array of tokens
 * @param {string[]} tokens - Array of word tokens
 * @param {number} n - Size of n-grams
 * @returns {string[]} Array of word n-grams
 */
function generateWordNgrams(tokens, n) {
  if (!tokens || !tokens.length || n <= 0 || tokens.length < n) {
    return [];
  }
  
  const ngrams = [];
  for (let i = 0; i <= tokens.length - n; i++) {
    ngrams.push(tokens.slice(i, i + n).join(' '));
  }
  
  return ngrams;
}

/**
 * Calculate Jaccard similarity between two arrays or strings
 * @param {Array|string} set1 - First set or string
 * @param {Array|string} set2 - Second set or string
 * @param {Object} [options={}] - Calculation options
 * @param {boolean} [options.tokenize=false] - Whether to tokenize strings
 * @param {Object} [options.tokenizeOptions={}] - Options for tokenization
 * @returns {number} Jaccard similarity (0-1)
 */
function calculateJaccardSimilarity(set1, set2, options = {}) {
  const { tokenize: shouldTokenize = false, tokenizeOptions = {} } = options;
  
  // Handle string inputs
  if (shouldTokenize && typeof set1 === 'string' && typeof set2 === 'string') {
    // Tokenize strings into arrays
    set1 = tokenize(set1, tokenizeOptions);
    set2 = tokenize(set2, tokenizeOptions);
  }
  
  // Handle edge cases
  if (!Array.isArray(set1) || !Array.isArray(set2)) {
    return 0;
  }
  
  if (set1.length === 0 && set2.length === 0) {
    return 0; // Both empty sets
  }
  
  // Convert to sets to get unique elements
  const uniqueSet1 = new Set(set1);
  const uniqueSet2 = new Set(set2);
  
  // Calculate intersection
  const intersection = new Set([...uniqueSet1].filter(item => uniqueSet2.has(item)));
  
  // Calculate union
  const union = new Set([...uniqueSet1, ...uniqueSet2]);
  
  // Jaccard similarity = |intersection| / |union|
  return intersection.size / union.size;
}

/**
 * Generate SQL for calculating Jaccard similarity
 * @param {string} field1 - First field expression
 * @param {string} field2 - Second field expression
 * @param {Object} [options={}] - SQL generation options
 * @param {string} [options.tokenizationType='word'] - Type of tokenization ('word', 'ngram')
 * @param {number} [options.ngramSize=3] - Size of n-grams (if using ngrams)
 * @param {boolean} [options.lowercase=true] - Convert to lowercase
 * @param {boolean} [options.removeStopwords=false] - Remove stopwords
 * @returns {string} SQL for Jaccard similarity
 */
function generateJaccardSimilaritySql(field1, field2, options = {}) {
  const {
    tokenizationType = 'word',
    ngramSize = 3,
    lowercase = true,
    removeStopwords = false
  } = options;
  
  let expr1 = field1;
  let expr2 = field2;
  
  // Apply lowercase if requested
  if (lowercase) {
    expr1 = `LOWER(${expr1})`;
    expr2 = `LOWER(${expr2})`;
  }
  
  // Generate tokenization expression based on type
  let tokenizeExpr1, tokenizeExpr2;
  
  if (tokenizationType === 'ngram') {
    // Use n-gram tokenization
    tokenizeExpr1 = `GENERATE_NGRAMS(${expr1}, ${ngramSize})`;
    tokenizeExpr2 = `GENERATE_NGRAMS(${expr2}, ${ngramSize})`;
  } else {
    // Use word tokenization
    tokenizeExpr1 = `SPLIT(${expr1}, ' ')`;
    tokenizeExpr2 = `SPLIT(${expr2}, ' ')`;
    
    // Add stopword removal if requested
    if (removeStopwords) {
      // This is a simplified approximation of stopword removal in SQL
      // A proper implementation would define the stopwords list
      tokenizeExpr1 = `ARRAY(SELECT token FROM UNNEST(${tokenizeExpr1}) AS token WHERE token NOT IN ('the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were'))`;
      tokenizeExpr2 = `ARRAY(SELECT token FROM UNNEST(${tokenizeExpr2}) AS token WHERE token NOT IN ('the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were'))`;
    }
  }
  
  // Generate Jaccard similarity expression
  const sql = `
    CASE
      WHEN ${expr1} IS NULL OR ${expr2} IS NULL THEN 0
      WHEN LENGTH(TRIM(COALESCE(${expr1}, ''))) = 0 OR LENGTH(TRIM(COALESCE(${expr2}, ''))) = 0 THEN 0
      ELSE (
        -- Calculate Jaccard similarity as |intersection| / |union|
        SAFE_DIVIDE(
          ARRAY_LENGTH(ARRAY_INTERSECT(${tokenizeExpr1}, ${tokenizeExpr2})),
          ARRAY_LENGTH(ARRAY_UNION(${tokenizeExpr1}, ${tokenizeExpr2}))
        )
      )
    END
  `;
  
  return sql;
}

/**
 * Create a SQL function for Jaccard similarity
 * @param {string} functionName - Name for the SQL function
 * @param {Object} [options={}] - SQL function options
 * @returns {string} SQL CREATE FUNCTION statement
 */
function createJaccardSimilaritySqlFunction(functionName, options = {}) {
  const {
    tokenizationType = 'word',
    ngramSize = 3,
    lowercase = true,
    removeStopwords = false
  } = options;
  
  return `
    CREATE OR REPLACE FUNCTION \`\${self()}.${functionName}\`(
      text1 STRING, 
      text2 STRING
    )
    RETURNS FLOAT64
    AS (
      ${generateJaccardSimilaritySql('text1', 'text2', {
        tokenizationType,
        ngramSize,
        lowercase,
        removeStopwords
      })}
    );
  `;
}

/**
 * Get a Jaccard similarity matcher with the specified configuration
 * @param {Object} [config={}] - Matcher configuration
 * @param {Object} [config.tokenizeOptions={}] - Options for tokenization
 * @param {number} [config.defaultThreshold=0.5] - Default threshold for isMatch
 * @returns {Object} Jaccard similarity matcher object
 */
function getJaccardMatcher(config = {}) {
  const {
    tokenizeOptions = {},
    defaultThreshold = 0.5
  } = config;
  
  return {
    /**
     * Match two strings using Jaccard similarity
     * @param {string} str1 - First string
     * @param {string} str2 - Second string
     * @param {Object} [options={}] - Match options
     * @param {number} [options.threshold] - Threshold for match classification
     * @param {Object} [options.tokenizeOptions] - Override default tokenization options
     * @returns {Object} Match result with score and isMatch
     */
    match(str1, str2, options = {}) {
      const matchOptions = {
        tokenize: true,
        tokenizeOptions: {
          ...tokenizeOptions,
          ...(options.tokenizeOptions || {})
        }
      };
      
      const score = calculateJaccardSimilarity(str1, str2, matchOptions);
      const threshold = options.threshold || defaultThreshold;
      
      return {
        score,
        isMatch: score >= threshold,
        value1: str1,
        value2: str2,
        threshold
      };
    },
    
    /**
     * Generate SQL for Jaccard similarity
     * @param {string} field1 - First field expression
     * @param {string} field2 - Second field expression
     * @param {Object} [options={}] - SQL generation options
     * @returns {string} SQL for Jaccard similarity
     */
    generateSql(field1, field2, options = {}) {
      const sqlOptions = {
        tokenizationType: 'word',
        ...tokenizeOptions,
        ...options
      };
      
      return generateJaccardSimilaritySql(field1, field2, sqlOptions);
    },
    
    /**
     * Create a SQL function for Jaccard similarity
     * @param {string} functionName - Name for the SQL function
     * @param {Object} [options={}] - SQL function options
     * @returns {string} SQL CREATE FUNCTION statement
     */
    createSqlFunction(functionName, options = {}) {
      const sqlOptions = {
        tokenizationType: 'word',
        ...tokenizeOptions,
        ...options
      };
      
      return createJaccardSimilaritySqlFunction(functionName, sqlOptions);
    },
    
    /**
     * Get the configuration for this matcher
     * @returns {Object} Current configuration
     */
    getConfig() {
      return {
        tokenizeOptions,
        defaultThreshold
      };
    }
  };
}

module.exports = {
  tokenize,
  generateCharNgrams,
  generateWordNgrams,
  calculateJaccardSimilarity,
  generateJaccardSimilaritySql,
  createJaccardSimilaritySqlFunction,
  getJaccardMatcher
};