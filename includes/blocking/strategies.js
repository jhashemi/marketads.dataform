/**
 * Blocking Strategies
 * 
 * This module implements various blocking strategies for efficient record matching.
 * Each strategy generates blocking keys that group potentially matching records
 * to reduce the number of comparisons needed.
 */

const { StrategyError } = require('../core/errors');
// Use our mock phonetic algorithms that generate SQL
const phonetic = require('../mocks/phonetic-algorithms');
// Use our mock addresser that generates SQL
const addresser = require('../mocks/addresser');

/**
 * Generates an exact value blocking key
 * @param {string} value - Field value
 * @returns {string|null} Blocking key or null if invalid
 */
function exactBlockingKey(value) {
  if (!value || typeof value !== 'string') return null;
  return value.trim().toLowerCase();
}

/**
 * Generates a prefix-based blocking key
 * @param {string} value - Field value
 * @param {number} [prefixLength=3] - Length of prefix to use
 * @returns {string|null} Blocking key or null if invalid
 */
function prefixBlockingKey(value, prefixLength = 3) {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim().toLowerCase();
  if (trimmed.length < prefixLength) return null;
  return trimmed.substring(0, prefixLength);
}

/**
 * Generates a suffix-based blocking key
 * @param {string} value - Field value
 * @param {number} [suffixLength=3] - Length of suffix to use
 * @returns {string|null} Blocking key or null if invalid
 */
function suffixBlockingKey(value, suffixLength = 3) {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim().toLowerCase();
  if (trimmed.length < suffixLength) return null;
  return trimmed.substring(trimmed.length - suffixLength);
}

/**
 * Generates phonetic blocking keys for name-based fields
 * @param {string} value - Input value
 * @param {Object} options - Options
 * @param {string} [options.algorithm='all'] - Phonetic algorithm to use ('soundex', 'metaphone', 'double_metaphone', 'all')
 * @returns {Array<string>} Array of phonetic blocking keys
 */
function phoneticBlockingKeys(value, options = {}) {
  if (!value) {
    return [];
  }
  
  value = String(value).trim().toLowerCase();
  
  // Default to using all algorithms
  const algorithm = options.algorithm || 'all';
  const results = [];
  
  // Tokenize input and use the first token (typically first name)
  const tokens = value.split(/\s+/);
  const firstToken = tokens[0] || '';
  const lastToken = tokens[tokens.length - 1] || '';
  
  if (algorithm === 'soundex' || algorithm === 'all') {
    // Soundex for the first token
    const soundexValue = phonetic.soundex(firstToken);
    if (soundexValue) results.push(`sdx_${soundexValue}`);
    
    // Soundex for last token if different from first
    if (lastToken && lastToken !== firstToken) {
      const lastSoundex = phonetic.soundex(lastToken);
      if (lastSoundex) results.push(`sdx_last_${lastSoundex}`);
    }
  }
  
  if (algorithm === 'metaphone' || algorithm === 'all') {
    // Metaphone (better for English names)
    const metaphoneValue = phonetic.metaphone(firstToken);
    if (metaphoneValue) results.push(`mph_${metaphoneValue}`);
  }
  
  if (algorithm === 'double_metaphone' || algorithm === 'all') {
    // Double Metaphone (handles multiple cultures better)
    const dmValues = phonetic.doubleMetaphone(firstToken);
    if (dmValues && dmValues.length > 0) {
      dmValues.forEach((dmv, i) => {
        if (dmv) results.push(`dm${i+1}_${dmv}`);
      });
    }
  }
  
  if (algorithm === 'nysiis' || algorithm === 'all') {
    // NYSIIS (New York State Identification and Intelligence System)
    const nysiisValue = phonetic.nysiis(firstToken);
    if (nysiisValue) results.push(`nys_${nysiisValue}`);
  }
  
  return results;
}

/**
 * Generates a Soundex blocking key (legacy compatibility)
 * @param {string} value - Input value
 * @returns {string} Soundex blocking key
 */
function soundexBlockingKey(value) {
  const keys = phoneticBlockingKeys(value, { algorithm: 'soundex' });
  return keys.length > 0 ? keys[0] : '';
}

/**
 * Generates a token-based blocking key
 * @param {string} value - Field value
 * @param {Object} options - Tokenization options
 * @param {number} [options.minTokens=1] - Minimum number of tokens to consider
 * @param {number} [options.maxTokens=3] - Maximum number of tokens to include
 * @returns {string[]|null} Array of blocking keys or null if invalid
 */
function tokenBlockingKeys(value, options = {}) {
  if (!value || typeof value !== 'string') return null;
  
  const { minTokens = 1, maxTokens = 3 } = options;
  
  // Tokenize string
  const tokens = value.trim().toLowerCase()
    .split(/\s+/)
    .filter(t => t.length > 1); // Filter out single-character tokens
  
  if (tokens.length < minTokens) return null;
  
  // Use a subset of tokens up to maxTokens
  const usedTokens = tokens.slice(0, maxTokens);
  
  // Create individual token keys
  return usedTokens.map(token => token);
}

/**
 * Generates a year-based blocking key for dates
 * @param {string} value - Date value
 * @returns {string|null} Blocking key or null if invalid
 */
function yearBlockingKey(value) {
  if (!value) return null;
  
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) return null;
    
    return date.getFullYear().toString();
  } catch (e) {
    return null;
  }
}

/**
 * Generates a month-based blocking key for dates
 * @param {string} value - Date value
 * @returns {string|null} Blocking key or null if invalid
 */
function monthBlockingKey(value) {
  if (!value) return null;
  
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) return null;
    
    // Format as MM
    return (date.getMonth() + 1).toString().padStart(2, '0');
  } catch (e) {
    return null;
  }
}

/**
 * Generates a day-based blocking key for dates
 * @param {string} value - Date value
 * @returns {string|null} Blocking key or null if invalid
 */
function dayBlockingKey(value) {
  if (!value) return null;
  
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) return null;
    
    // Format as DD
    return date.getDate().toString().padStart(2, '0');
  } catch (e) {
    return null;
  }
}

/**
 * Generates an email domain blocking key
 * @param {string} value - Email value
 * @returns {string|null} Blocking key or null if invalid
 */
function emailDomainBlockingKey(value) {
  if (!value || typeof value !== 'string') return null;
  
  const parts = value.trim().toLowerCase().split('@');
  if (parts.length !== 2) return null;
  
  return parts[1]; // Return the domain part
}

/**
 * Generates the last four digits blocking key for phone numbers
 * @param {string} value - Phone number
 * @returns {string|null} Blocking key or null if invalid
 */
function lastFourDigitsBlockingKey(value) {
  if (!value || typeof value !== 'string') return null;
  
  // Extract digits only
  const digitsOnly = value.replace(/\D/g, '');
  if (digitsOnly.length < 4) return null;
  
  // Return last 4 digits
  return digitsOnly.slice(-4);
}

/**
 * Standardizes an address for blocking or matching
 * @param {string} address - Address string
 * @returns {string} Standardized address
 */
function standardizeAddress(address) {
  if (!address) return '';
  
  address = String(address).trim();
  
  try {
    // Use addresser to parse and standardize the address
    const parsed = addresser.parseAddress(address);
    
    // Create standardized components
    const components = [];
    
    if (parsed.number) components.push(parsed.number);
    
    if (parsed.prefix) components.push(standardizeDirectional(parsed.prefix));
    
    if (parsed.street) {
      // Remove common suffixes like ST, AVE, etc. from street name
      let street = parsed.street.replace(/\b(street|avenue|boulevard|drive|road|lane|place|court|way|circle|terrace)\b/gi, '').trim();
      components.push(street);
    }
    
    if (parsed.type) components.push(standardizeStreetType(parsed.type));
    
    if (parsed.suffix) components.push(standardizeDirectional(parsed.suffix));
    
    if (parsed.sec_unit_type && parsed.sec_unit_num) {
      components.push(standardizeUnitType(parsed.sec_unit_type) + parsed.sec_unit_num);
    }
    
    return components.join(' ').toLowerCase();
  } catch (error) {
    // If parsing fails, perform basic standardization
    return basicAddressStandardization(address);
  }
}

/**
 * Standardizes directionals (N, S, E, W) in addresses
 * @param {string} dir - Directional
 * @returns {string} Standardized directional
 */
function standardizeDirectional(dir) {
  if (!dir) return '';
  
  const map = {
    'north': 'n',
    'south': 's',
    'east': 'e',
    'west': 'w',
    'northeast': 'ne',
    'northwest': 'nw',
    'southeast': 'se',
    'southwest': 'sw'
  };
  
  const lower = dir.toLowerCase();
  return map[lower] || lower;
}

/**
 * Standardizes street types
 * @param {string} type - Street type
 * @returns {string} Standardized street type
 */
function standardizeStreetType(type) {
  if (!type) return '';
  
  const map = {
    'avenue': 'ave',
    'boulevard': 'blvd',
    'circle': 'cir',
    'court': 'ct',
    'drive': 'dr',
    'lane': 'ln',
    'place': 'pl',
    'road': 'rd',
    'square': 'sq',
    'street': 'st',
    'terrace': 'ter',
    'way': 'way'
  };
  
  const lower = type.toLowerCase();
  return map[lower] || lower;
}

/**
 * Standardizes unit types
 * @param {string} type - Unit type
 * @returns {string} Standardized unit type
 */
function standardizeUnitType(type) {
  if (!type) return '';
  
  const map = {
    'apartment': 'apt',
    'building': 'bldg',
    'department': 'dept',
    'floor': 'fl',
    'room': 'rm',
    'suite': 'ste',
    'unit': 'unit'
  };
  
  const lower = type.toLowerCase();
  return map[lower] || lower;
}

/**
 * Performs basic address standardization for cases where parsing fails
 * @param {string} address - Address string
 * @returns {string} Basically standardized address
 */
function basicAddressStandardization(address) {
  return address
    .toLowerCase()
    .replace(/\b(street|avenue|boulevard|drive|road|lane|place|court|way|circle|terrace)\b/gi, m => {
      // Map common street types to abbreviations
      const abbrevMap = {
        'street': 'st',
        'avenue': 'ave',
        'boulevard': 'blvd',
        'drive': 'dr',
        'road': 'rd',
        'lane': 'ln',
        'place': 'pl',
        'court': 'ct',
        'way': 'way',
        'circle': 'cir',
        'terrace': 'ter'
      };
      return abbrevMap[m.toLowerCase()] || m;
    })
    .replace(/\b(north|south|east|west|northeast|northwest|southeast|southwest)\b/gi, m => {
      // Map directionals to abbreviations
      const dirMap = {
        'north': 'n',
        'south': 's',
        'east': 'e',
        'west': 'w',
        'northeast': 'ne',
        'northwest': 'nw',
        'southeast': 'se',
        'southwest': 'sw'
      };
      return dirMap[m.toLowerCase()] || m;
    })
    .replace(/\b(apartment|building|suite|unit|room|floor|department)\b/gi, m => {
      // Map unit types to abbreviations
      const unitMap = {
        'apartment': 'apt',
        'building': 'bldg',
        'suite': 'ste',
        'unit': 'unit',
        'room': 'rm',
        'floor': 'fl',
        'department': 'dept'
      };
      return unitMap[m.toLowerCase()] || m;
    })
    .replace(/[^\w\s]/g, ' ') // Replace non-alphanumerics with spaces
    .replace(/\s+/g, ' ')     // Collapse multiple spaces
    .trim();
}

/**
 * Generates standardized address blocking key
 * @param {string} value - Address string
 * @returns {string} Standardized address blocking key
 */
function standardizedAddressBlockingKey(value) {
  if (!value) return null;
  return standardizeAddress(value);
}

/**
 * Generates blocking keys based on locality-sensitive hashing of embeddings
 * @param {Array<number>} embedding - Vector embedding
 * @param {Object} options - LSH options
 * @param {number} [options.numBuckets=10] - Number of hash buckets
 * @param {number} [options.numPlanes=3] - Number of random planes for LSH
 * @param {string} [options.seed='default'] - Seed for random plane generation
 * @returns {Array<string>|null} Array of LSH blocking keys or null if invalid
 */
function embeddingLshBlockingKeys(embedding, options = {}) {
  if (!embedding || !Array.isArray(embedding) || embedding.length === 0) {
    return null;
  }
  
  const { 
    numBuckets = 10, 
    numPlanes = 3,
    seed = 'default'
  } = options;
  
  // Generate a deterministic hash from the seed
  const hashSeed = (seed) => {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = ((hash << 5) - hash) + seed.charCodeAt(i);
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
  };
  
  // Create blocking keys using locality-sensitive hashing
  const keys = [];
  
  for (let i = 0; i < numPlanes; i++) {
    // Create a deterministic random vector from the seed
    const randomVector = [];
    const planeSeed = hashSeed(`${seed}_plane_${i}`);
    
    for (let j = 0; j < embedding.length; j++) {
      // Use deterministic random value based on seed and position
      const randomValue = Math.sin(planeSeed * (j + 1)) * 2 - 1;
      randomVector.push(randomValue);
    }
    
    // Calculate dot product between embedding and random vector
    let dotProduct = 0;
    for (let j = 0; j < embedding.length; j++) {
      dotProduct += embedding[j] * randomVector[j];
    }
    
    // Get hash bucket based on dot product sign and bucketing
    const normalizedDot = (Math.atan2(dotProduct, 1) / Math.PI + 0.5) * numBuckets;
    const bucketId = Math.floor(normalizedDot) % numBuckets;
    
    // Create key with plane number to avoid collisions between planes
    keys.push(`lsh_${i}_${bucketId}`);
  }
  
  return keys;
}

/**
 * Generates n-gram based blocking keys
 * @param {string} value - Input string
 * @param {Object} options - Options
 * @param {number} [options.n=3] - Size of n-grams
 * @param {number} [options.maxGrams=5] - Maximum number of n-grams to use
 * @returns {Array<string>|null} Array of n-gram blocking keys or null if invalid
 */
function ngramBlockingKeys(value, options = {}) {
  if (!value || typeof value !== 'string') {
    return null;
  }
  
  const { n = 3, maxGrams = 5 } = options;
  
  // Normalize the string
  value = value.trim().toLowerCase();
  
  // If string is shorter than n, return the whole string
  if (value.length < n) {
    return [value];
  }
  
  // Generate n-grams
  const ngrams = [];
  for (let i = 0; i <= value.length - n; i++) {
    ngrams.push(value.slice(i, i + n));
  }
  
  // Limit the number of n-grams
  return ngrams.slice(0, maxGrams);
}

/**
 * Generates compound blocking keys by combining multiple strategies
 * @param {string} value - Input value
 * @param {Object} options - Options
 * @param {Array<string>} [options.strategies=['exact', 'prefix']] - Strategies to combine
 * @param {Object} [options.strategyOptions={}] - Options for each strategy
 * @param {string} [options.separator='_'] - Separator between strategy keys
 * @returns {Array<string>|null} Array of compound blocking keys or null if invalid
 */
function compoundBlockingKeys(value, options = {}) {
  if (!value) {
    return null;
  }
  
  const {
    strategies = ['exact', 'prefix'],
    strategyOptions = {},
    separator = '_'
  } = options;
  
  if (!strategies || !Array.isArray(strategies) || strategies.length === 0) {
    return null;
  }
  
  // Apply each strategy and collect results
  const strategyResults = [];
  
  for (const strategy of strategies) {
    let result;
    const strategyOpts = strategyOptions[strategy] || {};
    
    try {
      // Call the appropriate blocking function
      switch (strategy) {
        case 'exact':
          result = exactBlockingKey(value);
          break;
        case 'prefix':
          result = prefixBlockingKey(value, strategyOpts.prefixLength);
          break;
        case 'suffix':
          result = suffixBlockingKey(value, strategyOpts.suffixLength);
          break;
        case 'soundex':
          result = soundexBlockingKey(value);
          break;
        case 'token':
          // Take the first token only for compound keys
          const tokens = tokenBlockingKeys(value, strategyOpts);
          result = tokens && tokens.length > 0 ? tokens[0] : null;
          break;
        case 'emailDomain':
          result = emailDomainBlockingKey(value);
          break;
        default:
          // Try to get the strategy function and call it
          const strategyFn = BLOCKING_STRATEGIES[strategy];
          if (strategyFn && typeof strategyFn === 'function') {
            result = strategyFn(value, strategyOpts);
            // Handle array results by taking first item
            if (Array.isArray(result) && result.length > 0) {
              result = result[0];
            }
          }
      }
      
      if (result) {
        strategyResults.push(result);
      }
    } catch (error) {
      console.warn(`Error applying compound strategy ${strategy}:`, error);
    }
  }
  
  // If no strategies produced results, return null
  if (strategyResults.length === 0) {
    return null;
  }
  
  // Combine all strategy results into a single compound key
  return [strategyResults.join(separator)];
}

/**
 * Generates tag-based blocking keys from an array of tags
 * @param {Array<string>} tags - Array of tag values
 * @param {Object} options - Options for tag blocking
 * @param {boolean} [options.lowercase=false] - Whether to convert tags to lowercase
 * @param {string} [options.prefix=''] - Prefix to add to each tag
 * @param {number} [options.maxTags=0] - Maximum number of tags to use (0 = unlimited)
 * @returns {Array<string>} Array of blocking keys
 */
function tagBlockingKeys(tags, options = {}) {
  if (!tags || !Array.isArray(tags)) {
    return [];
  }
  
  const {
    lowercase = false,
    prefix = '',
    maxTags = 0
  } = options;
  
  // Process the tags
  let processedTags = [...tags];
  
  // Apply lowercase if requested
  if (lowercase) {
    processedTags = processedTags.map(tag => String(tag).toLowerCase());
  }
  
  // Apply prefix if provided
  if (prefix) {
    processedTags = processedTags.map(tag => `${prefix}${tag}`);
  }
  
  // Limit number of tags if maxTags is specified
  if (maxTags > 0 && processedTags.length > maxTags) {
    processedTags = processedTags.slice(0, maxTags);
  }
  
  return processedTags;
}

/**
 * Map of supported blocking strategies to their implementation functions
 */
const BLOCKING_STRATEGIES = {
  exact: exactBlockingKey,
  prefix: prefixBlockingKey,
  suffix: suffixBlockingKey,
  soundex: soundexBlockingKey,
  token: tokenBlockingKeys,
  year: yearBlockingKey,
  month: monthBlockingKey,
  day: dayBlockingKey,
  emailDomain: emailDomainBlockingKey,
  lastFourDigits: lastFourDigitsBlockingKey,
  phonetic: phoneticBlockingKeys,
  standardizedAddress: standardizedAddressBlockingKey,
  embedding: embeddingLshBlockingKeys,
  ngram: ngramBlockingKeys,
  compound: compoundBlockingKeys,
  tag: tagBlockingKeys
};

/**
 * Gets a blocking strategy function by name
 * @param {string} strategyName - Name of the blocking strategy
 * @returns {Function} Strategy function
 * @throws {StrategyError} If strategy doesn't exist
 */
function getBlockingStrategy(strategyName) {
  const strategy = BLOCKING_STRATEGIES[strategyName];
  
  if (!strategy) {
    throw new StrategyError(`Blocking strategy not found: ${strategyName}`, strategyName);
  }
  
  return strategy;
}

/**
 * Gets all available blocking strategy names
 * @returns {string[]} Array of strategy names
 */
function getAvailableBlockingStrategies() {
  return Object.keys(BLOCKING_STRATEGIES);
}

/**
 * Applies a blocking strategy to a value
 * @param {string} strategyName - Name of the blocking strategy
 * @param {string} value - Value to generate key from
 * @param {Object} [options] - Strategy-specific options
 * @returns {string|string[]|null} Blocking key(s) or null if invalid
 */
function applyBlockingStrategy(strategyName, value, options = {}) {
  try {
    const strategy = getBlockingStrategy(strategyName);
    return strategy(value, options);
  } catch (error) {
    if (error instanceof StrategyError) {
      throw error;
    }
    return null;
  }
}

module.exports = {
  applyBlockingStrategy,
  getBlockingStrategy,
  getAvailableBlockingStrategies,
  BLOCKING_STRATEGIES,
  
  // Export individual strategies for direct use
  exactBlockingKey,
  prefixBlockingKey,
  suffixBlockingKey,
  soundexBlockingKey,
  tokenBlockingKeys,
  yearBlockingKey,
  monthBlockingKey,
  dayBlockingKey,
  emailDomainBlockingKey,
  lastFourDigitsBlockingKey,
  phoneticBlockingKeys,
  standardizedAddressBlockingKey,
  embeddingLshBlockingKeys,
  ngramBlockingKeys,
  compoundBlockingKeys,
  tagBlockingKeys
};