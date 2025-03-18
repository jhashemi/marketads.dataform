/**
 * Cosine Similarity Matcher
 * 
 * This module provides functionality for comparing string similarity using cosine similarity.
 * Cosine similarity measures the cosine of the angle between two vectors in a multi-dimensional space,
 * making it effective for text comparison, especially when word frequency matters more than order.
 */

// Import natural for NLP operations (stemming, stopwords)
const natural = require('natural');
const { PorterStemmer } = natural;
const stopwords = require('../utils/stopwords').english;

/**
 * Create a feature vector from an array of features
 * @param {Array<string>} features - Array of features
 * @param {Array<number>} [weights] - Optional weights for each feature
 * @returns {Object} Feature vector as an object mapping features to weights
 */
function createFeatureVector(features, weights) {
  if (!Array.isArray(features)) {
    return {};
  }
  
  const vector = {};
  
  features.forEach((feature, index) => {
    // Skip invalid features (null, undefined, etc.)
    if (feature == null || feature === '') {
      return;
    }
    
    const key = String(feature);
    
    // If weights are provided, use them
    if (Array.isArray(weights) && index < weights.length) {
      vector[key] = (vector[key] || 0) + weights[index];
    } else {
      // Otherwise, count occurrences
      vector[key] = (vector[key] || 0) + 1;
    }
  });
  
  return vector;
}

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
 * Vectorize text into a feature vector
 * @param {string} text - Input text
 * @param {Object} [options={}] - Vectorization options
 * @param {boolean} [options.lowercase=true] - Convert to lowercase before tokenizing
 * @param {boolean} [options.stem=false] - Apply stemming to tokens
 * @param {boolean} [options.removeStopwords=false] - Remove common stopwords
 * @param {number} [options.ngramSize=1] - Size of n-grams to generate
 * @param {boolean} [options.wordGrams=true] - Use word n-grams or character n-grams
 * @param {boolean} [options.useTfIdf=false] - Use TF-IDF weighting
 * @returns {Object} Feature vector
 */
function vectorizeText(text, options = {}) {
  const tokens = tokenize(text, options);
  return createFeatureVector(tokens);
}

/**
 * Calculate dot product of two feature vectors
 * @param {Object} vector1 - First feature vector
 * @param {Object} vector2 - Second feature vector
 * @returns {number} Dot product
 */
function dotProduct(vector1, vector2) {
  let product = 0;
  
  // Iterate through the smaller vector for efficiency
  const smallerVector = Object.keys(vector1).length < Object.keys(vector2).length ? vector1 : vector2;
  const largerVector = smallerVector === vector1 ? vector2 : vector1;
  
  for (const feature in smallerVector) {
    if (largerVector[feature]) {
      product += smallerVector[feature] * largerVector[feature];
    }
  }
  
  return product;
}

/**
 * Calculate the magnitude (Euclidean norm) of a feature vector
 * @param {Object} vector - Feature vector
 * @returns {number} Vector magnitude
 */
function magnitude(vector) {
  let sum = 0;
  
  for (const feature in vector) {
    const value = vector[feature];
    sum += value * value;
  }
  
  return Math.sqrt(sum);
}

/**
 * Calculate cosine similarity between two feature vectors
 * @param {Object} vector1 - First feature vector
 * @param {Object} vector2 - Second feature vector
 * @returns {number} Cosine similarity (0-1)
 */
function calculateCosineSimilarity(vector1, vector2) {
  // Handle empty vectors
  if (!vector1 || !vector2 || 
      typeof vector1 !== 'object' || typeof vector2 !== 'object' ||
      Object.keys(vector1).length === 0 || Object.keys(vector2).length === 0) {
    return 0;
  }
  
  const dot = dotProduct(vector1, vector2);
  const mag1 = magnitude(vector1);
  const mag2 = magnitude(vector2);
  
  if (mag1 === 0 || mag2 === 0) {
    return 0;
  }
  
  // Cosine similarity = dot product / (magnitude1 * magnitude2)
  return dot / (mag1 * mag2);
}

/**
 * Calculate cosine similarity between two text strings
 * @param {string} text1 - First text
 * @param {string} text2 - Second text
 * @param {Object} [options={}] - Vectorization options
 * @returns {number} Cosine similarity (0-1)
 */
function calculateTextCosineSimilarity(text1, text2, options = {}) {
  const vector1 = vectorizeText(text1, options);
  const vector2 = vectorizeText(text2, options);
  
  return calculateCosineSimilarity(vector1, vector2);
}

/**
 * Generate SQL for calculating cosine similarity
 * @param {string} field1 - First field expression
 * @param {string} field2 - Second field expression
 * @param {Object} [options={}] - SQL generation options
 * @param {string} [options.vectorizationType='word'] - Type of vectorization ('word', 'ngram')
 * @param {number} [options.ngramSize=3] - Size of n-grams (if using ngrams)
 * @param {boolean} [options.lowercase=true] - Convert to lowercase
 * @param {boolean} [options.removeStopwords=false] - Remove stopwords
 * @param {boolean} [options.useTfIdf=false] - Use TF-IDF weighting
 * @returns {string} SQL for cosine similarity
 */
function generateCosineSimilaritySql(field1, field2, options = {}) {
  const {
    vectorizationType = 'word',
    ngramSize = 3,
    lowercase = true,
    removeStopwords = false,
    useTfIdf = false
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
  
  if (vectorizationType === 'ngram') {
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
  
  // If TF-IDF weighting is required, the SQL is more complex
  if (useTfIdf) {
    return `
      CASE
        WHEN ${expr1} IS NULL OR ${expr2} IS NULL THEN 0
        WHEN LENGTH(TRIM(COALESCE(${expr1}, ''))) = 0 OR LENGTH(TRIM(COALESCE(${expr2}, ''))) = 0 THEN 0
        ELSE (
          -- Calculate cosine similarity using TF-IDF weights
          WITH tokens1 AS (
            SELECT token, COUNT(*) as term_freq
            FROM UNNEST(${tokenizeExpr1}) AS token
            GROUP BY token
          ),
          tokens2 AS (
            SELECT token, COUNT(*) as term_freq
            FROM UNNEST(${tokenizeExpr2}) AS token
            GROUP BY token
          ),
          -- Calculate IDF-weighted tokens
          weighted_tokens AS (
            SELECT 
              COALESCE(t1.token, t2.token) AS token,
              COALESCE(t1.term_freq, 0) * LOG(2.0) AS weight1,
              COALESCE(t2.term_freq, 0) * LOG(2.0) AS weight2
            FROM tokens1 t1
            FULL OUTER JOIN tokens2 t2 USING(token)
          ),
          -- Calculate vector magnitudes
          magnitudes AS (
            SELECT
              SQRT(SUM(POW(weight1, 2))) AS mag1,
              SQRT(SUM(POW(weight2, 2))) AS mag2,
              SUM(weight1 * weight2) AS dot_product
            FROM weighted_tokens
          )
          SELECT
            CASE 
              WHEN mag1 = 0 OR mag2 = 0 THEN 0
              ELSE dot_product / (mag1 * mag2)
            END
          FROM magnitudes
        )
      END
    `;
  } else {
    // Simpler SQL for standard cosine similarity
    return `
      CASE
        WHEN ${expr1} IS NULL OR ${expr2} IS NULL THEN 0
        WHEN LENGTH(TRIM(COALESCE(${expr1}, ''))) = 0 OR LENGTH(TRIM(COALESCE(${expr2}, ''))) = 0 THEN 0
        ELSE (
          -- Calculate dot product
          WITH tokens1 AS (
            SELECT token, COUNT(*) as weight
            FROM UNNEST(${tokenizeExpr1}) AS token
            GROUP BY token
          ),
          tokens2 AS (
            SELECT token, COUNT(*) as weight
            FROM UNNEST(${tokenizeExpr2}) AS token
            GROUP BY token
          ),
          -- Join the tokens to get the dot product
          dot_product AS (
            SELECT SUM(t1.weight * t2.weight) as dot
            FROM tokens1 t1
            JOIN tokens2 t2 USING (token)
          ),
          -- Calculate magnitudes
          magnitudes AS (
            SELECT 
              SQRT(SUM(POW(weight, 2))) as mag1
            FROM tokens1
          ),
          magnitudes2 AS (
            SELECT 
              SQRT(SUM(POW(weight, 2))) as mag2
            FROM tokens2
          )
          
          -- Cosine similarity = dot product / (magnitude1 * magnitude2)
          SELECT
            SAFE_DIVIDE(
              (SELECT dot FROM dot_product),
              (SELECT mag1 FROM magnitudes) * (SELECT mag2 FROM magnitudes2)
            )
        )
      END
    `;
  }
}

/**
 * Create a SQL function for cosine similarity
 * @param {string} functionName - Name for the SQL function
 * @param {Object} [options={}] - SQL function options
 * @returns {string} SQL CREATE FUNCTION statement
 */
function createCosineSimilaritySqlFunction(functionName, options = {}) {
  const {
    vectorizationType = 'word',
    ngramSize = 3,
    lowercase = true,
    removeStopwords = false,
    useTfIdf = false
  } = options;
  
  return `
    CREATE OR REPLACE FUNCTION \`\${self()}.${functionName}\`(
      text1 STRING, 
      text2 STRING
    )
    RETURNS FLOAT64
    AS (
      ${generateCosineSimilaritySql('text1', 'text2', {
        vectorizationType,
        ngramSize,
        lowercase,
        removeStopwords,
        useTfIdf
      })}
    );
  `;
}

/**
 * Get a cosine similarity matcher with the specified configuration
 * @param {Object} [config={}] - Matcher configuration
 * @param {Object} [config.vectorizeOptions={}] - Options for vectorization
 * @param {number} [config.defaultThreshold=0.5] - Default threshold for isMatch
 * @returns {Object} Cosine similarity matcher object
 */
function getCosineMatcher(config = {}) {
  const {
    vectorizeOptions = {},
    defaultThreshold = 0.5
  } = config;
  
  return {
    /**
     * Match two strings using cosine similarity
     * @param {string} str1 - First string
     * @param {string} str2 - Second string
     * @param {Object} [options={}] - Match options
     * @param {number} [options.threshold] - Threshold for match classification
     * @param {Object} [options.vectorizeOptions] - Override default vectorization options
     * @returns {Object} Match result with score and isMatch
     */
    match(str1, str2, options = {}) {
      const matchOptions = {
        ...vectorizeOptions,
        ...(options.vectorizeOptions || {})
      };
      
      const score = calculateTextCosineSimilarity(str1, str2, matchOptions);
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
     * Generate SQL for cosine similarity
     * @param {string} field1 - First field expression
     * @param {string} field2 - Second field expression
     * @param {Object} [options={}] - SQL generation options
     * @returns {string} SQL for cosine similarity
     */
    generateSql(field1, field2, options = {}) {
      const sqlOptions = {
        vectorizationType: 'word',
        ...vectorizeOptions,
        ...options
      };
      
      return generateCosineSimilaritySql(field1, field2, sqlOptions);
    },
    
    /**
     * Create a SQL function for cosine similarity
     * @param {string} functionName - Name for the SQL function
     * @param {Object} [options={}] - SQL function options
     * @returns {string} SQL CREATE FUNCTION statement
     */
    createSqlFunction(functionName, options = {}) {
      const sqlOptions = {
        vectorizationType: 'word',
        ...vectorizeOptions,
        ...options
      };
      
      return createCosineSimilaritySqlFunction(functionName, sqlOptions);
    },
    
    /**
     * Get the configuration for this matcher
     * @returns {Object} Current configuration
     */
    getConfig() {
      return {
        vectorizeOptions,
        defaultThreshold
      };
    }
  };
}

module.exports = {
  createFeatureVector,
  tokenize,
  generateCharNgrams,
  generateWordNgrams,
  vectorizeText,
  dotProduct,
  magnitude,
  calculateCosineSimilarity,
  calculateTextCosineSimilarity,
  generateCosineSimilaritySql,
  createCosineSimilaritySqlFunction,
  getCosineMatcher
};