/**
 * Address Matcher
 * 
 * This module implements specialized matching for addresses,
 * combining token-based and standardization-based approaches
 * to handle common address format variations.
 */

const { MissingFieldError } = require('../core/errors');
const { distance } = require('fastest-levenshtein');
const natural = require('natural');
const jaroWinkler = natural.JaroWinklerDistance;
const tokenizer = new natural.WordTokenizer();

// Common address abbreviations and their standardized forms
const ADDRESS_ABBREVIATIONS = {
  // Street types
  'st': 'street',
  'street': 'street',
  'ave': 'avenue',
  'avenue': 'avenue',
  'blvd': 'boulevard',
  'boulevard': 'boulevard',
  'rd': 'road',
  'road': 'road',
  'ln': 'lane',
  'lane': 'lane',
  'dr': 'drive',
  'drive': 'drive',
  'cir': 'circle',
  'circle': 'circle',
  'ct': 'court',
  'court': 'court',
  'pl': 'place',
  'place': 'place',
  'ter': 'terrace',
  'terrace': 'terrace',
  'way': 'way',
  'hwy': 'highway',
  'highway': 'highway',
  'pkwy': 'parkway',
  'parkway': 'parkway',
  'trl': 'trail',
  'trail': 'trail',
  'sq': 'square',
  'square': 'square',
  
  // Directionals
  'n': 'north',
  'north': 'north',
  's': 'south',
  'south': 'south',
  'e': 'east',
  'east': 'east',
  'w': 'west',
  'west': 'west',
  'ne': 'northeast',
  'northeast': 'northeast',
  'nw': 'northwest',
  'northwest': 'northwest',
  'se': 'southeast',
  'southeast': 'southeast',
  'sw': 'southwest',
  'southwest': 'southwest',
  
  // Units
  'apt': 'apartment',
  'apartment': 'apartment',
  'unit': 'unit',
  'ste': 'suite',
  'suite': 'suite',
  'rm': 'room',
  'room': 'room',
  'fl': 'floor',
  'floor': 'floor',
  'bldg': 'building',
  'building': 'building'
};

/**
 * Parse address into components
 * @param {string} address - Full address to parse
 * @returns {Object} Object with parsed address components
 */
function parseAddress(address) {
  if (!address) {
    return { 
      streetNumber: '',
      streetName: '',
      streetType: '',
      unit: '',
      unitNumber: '',
      city: '',
      state: '',
      zip: ''
    };
  }
  
  // Basic extraction of components
  // This is a simplified implementation - real address parsing requires more sophisticated logic
  const components = {
    streetNumber: '',
    streetName: '',
    streetType: '',
    unit: '',
    unitNumber: '',
    city: '',
    state: '',
    zip: ''
  };
  
  // Normalize the address for parsing
  address = String(address).trim();
  
  // Try to extract street number + street name
  const streetMatch = address.match(/^(\d+(?:-\d+)?)\s+([^,]+?)(?:,|\s+(?:apt|apartment|unit|suite|ste|#|rm|room|fl|floor)|\s+\d+|\s*$)/i);
  if (streetMatch) {
    components.streetNumber = streetMatch[1];
    
    // Extract street type if present
    const streetParts = streetMatch[2].trim().split(/\s+/);
    if (streetParts.length > 1) {
      const lastPart = streetParts[streetParts.length - 1].toLowerCase().replace(/\W/g, '');
      if (ADDRESS_ABBREVIATIONS[lastPart]) {
        components.streetType = ADDRESS_ABBREVIATIONS[lastPart];
        components.streetName = streetParts.slice(0, -1).join(' ');
      } else {
        components.streetName = streetParts.join(' ');
      }
    } else {
      components.streetName = streetParts[0];
    }
  }
  
  // Try to extract unit information
  const unitMatch = address.match(/(?:apt|apartment|unit|suite|ste|#|rm|room|fl|floor)\s*[#]?\s*([a-z0-9-]+)/i);
  if (unitMatch) {
    const unitPrefix = unitMatch[0].match(/^(apt|apartment|unit|suite|ste|#|rm|room|fl|floor)/i)[0].toLowerCase();
    components.unit = ADDRESS_ABBREVIATIONS[unitPrefix] || unitPrefix;
    components.unitNumber = unitMatch[1];
  }
  
  // Try to extract zip code
  const zipMatch = address.match(/\b(\d{5}(?:-\d{4})?)\b/);
  if (zipMatch) {
    components.zip = zipMatch[1];
  }
  
  // Try to extract state (2-letter abbreviation)
  const stateMatch = address.match(/\b([A-Z]{2})\b/);
  if (stateMatch) {
    components.state = stateMatch[1];
  }
  
  // Try to extract city - everything between street and state/zip
  // This is a very simplistic approach and will need improvement
  if (streetMatch && (stateMatch || zipMatch)) {
    const afterStreet = address.substring(streetMatch.index + streetMatch[0].length);
    let cityEnd = afterStreet.length;
    
    if (stateMatch) {
      const stateIndex = afterStreet.indexOf(stateMatch[1]);
      if (stateIndex !== -1 && stateIndex < cityEnd) {
        cityEnd = stateIndex;
      }
    }
    
    if (zipMatch) {
      const zipIndex = afterStreet.indexOf(zipMatch[1]);
      if (zipIndex !== -1 && zipIndex < cityEnd) {
        cityEnd = zipIndex;
      }
    }
    
    // Extract city and clean up commas, etc.
    const cityRaw = afterStreet.substring(0, cityEnd)
      .replace(/^[,\s]+|[,\s]+$/g, '') // Remove leading/trailing commas and whitespace
      .replace(/\s+/g, ' '); // Normalize spaces
    
    if (cityRaw) {
      components.city = cityRaw;
    }
  }
  
  return components;
}

/**
 * Standardizes an address string
 * @param {string} address - Address to standardize
 * @returns {string} Standardized address
 */
function standardizeAddress(address) {
  if (!address) return '';
  
  address = String(address).trim().toLowerCase();
  
  // Replace standard abbreviations
  let standardized = address;
  
  // Create regex for whole word replacements
  const abbreviationRegex = new RegExp(
    '\\b(' + Object.keys(ADDRESS_ABBREVIATIONS).join('|') + ')\\b', 
    'gi'
  );
  
  // Replace abbreviations with standardized forms
  standardized = standardized.replace(abbreviationRegex, match => {
    return ADDRESS_ABBREVIATIONS[match.toLowerCase()] || match;
  });
  
  // Remove common punctuation and normalize spaces
  standardized = standardized
    .replace(/[.,#]/g, ' ') // Replace punctuation with spaces
    .replace(/\s+/g, ' ')   // Normalize spaces
    .trim();
  
  return standardized;
}

/**
 * Calculates token-based similarity between two addresses
 * @param {string} address1 - First address
 * @param {string} address2 - Second address
 * @returns {number} Similarity score between 0 and 1
 */
function calculateAddressTokenSimilarity(address1, address2) {
  if (!address1 && !address2) return 1.0;
  if (!address1 || !address2) return 0.0;
  
  // Standardize and tokenize addresses
  const tokens1 = tokenizer.tokenize(standardizeAddress(address1)) || [];
  const tokens2 = tokenizer.tokenize(standardizeAddress(address2)) || [];
  
  // If either has no tokens, fall back to string similarity
  if (tokens1.length === 0 || tokens2.length === 0) {
    return jaroWinkler(
      String(address1).toLowerCase(), 
      String(address2).toLowerCase()
    );
  }
  
  // Calculate token overlap (Jaccard similarity)
  const set1 = new Set(tokens1);
  const set2 = new Set(tokens2);
  
  const intersection = new Set(
    [...set1].filter(token => set2.has(token))
  );
  
  const union = new Set([...set1, ...set2]);
  
  // Weighted by importance of tokens
  // Street numbers and unit numbers are especially important
  let importantMatchCount = 0;
  let importantTokenCount = 0;
  
  // Check for street number match (very important)
  const num1 = tokens1.find(t => /^\d+(-\d+)?$/.test(t));
  const num2 = tokens2.find(t => /^\d+(-\d+)?$/.test(t));
  
  if (num1 && num2) {
    importantTokenCount += 2;
    if (num1 === num2) {
      importantMatchCount += 2;
    }
  }
  
  // Calculate base Jaccard similarity
  const jaccardScore = intersection.size / union.size;
  
  // Add weight for important tokens
  const importantScore = importantTokenCount > 0 ? 
    importantMatchCount / importantTokenCount : 0;
  
  // Weighted combination
  return (jaccardScore * 0.6) + (importantScore * 0.4);
}

/**
 * Calculates component-based similarity between two addresses
 * @param {string} address1 - First address
 * @param {string} address2 - Second address
 * @returns {number} Similarity score between 0 and 1
 */
function calculateAddressComponentSimilarity(address1, address2) {
  if (!address1 && !address2) return 1.0;
  if (!address1 || !address2) return 0.0;
  
  // Parse addresses into components
  const components1 = parseAddress(address1);
  const components2 = parseAddress(address2);
  
  // Component weights
  const weights = {
    streetNumber: 0.25,
    streetName: 0.25,
    streetType: 0.10,
    unit: 0.05,
    unitNumber: 0.15,
    city: 0.10,
    state: 0.05,
    zip: 0.05
  };
  
  // Calculate component similarities
  const similarities = {};
  let totalWeight = 0;
  let weightedSum = 0;
  
  // Street number - exact match only
  if (components1.streetNumber && components2.streetNumber) {
    similarities.streetNumber = 
      components1.streetNumber === components2.streetNumber ? 1.0 : 0.0;
    totalWeight += weights.streetNumber;
    weightedSum += similarities.streetNumber * weights.streetNumber;
  }
  
  // Street name - fuzzy match
  if (components1.streetName && components2.streetName) {
    similarities.streetName = jaroWinkler(
      components1.streetName.toLowerCase(),
      components2.streetName.toLowerCase()
    );
    totalWeight += weights.streetName;
    weightedSum += similarities.streetName * weights.streetName;
  }
  
  // Street type - standardized match
  if (components1.streetType && components2.streetType) {
    similarities.streetType = 
      components1.streetType === components2.streetType ? 1.0 : 0.0;
    totalWeight += weights.streetType;
    weightedSum += similarities.streetType * weights.streetType;
  }
  
  // Unit type - standardized match
  if (components1.unit && components2.unit) {
    similarities.unit = 
      components1.unit === components2.unit ? 1.0 : 0.0;
    totalWeight += weights.unit;
    weightedSum += similarities.unit * weights.unit;
  }
  
  // Unit number - exact match only
  if (components1.unitNumber && components2.unitNumber) {
    similarities.unitNumber = 
      components1.unitNumber === components2.unitNumber ? 1.0 : 0.0;
    totalWeight += weights.unitNumber;
    weightedSum += similarities.unitNumber * weights.unitNumber;
  }
  
  // City - fuzzy match
  if (components1.city && components2.city) {
    similarities.city = jaroWinkler(
      components1.city.toLowerCase(),
      components2.city.toLowerCase()
    );
    totalWeight += weights.city;
    weightedSum += similarities.city * weights.city;
  }
  
  // State - exact match
  if (components1.state && components2.state) {
    similarities.state = 
      components1.state === components2.state ? 1.0 : 0.0;
    totalWeight += weights.state;
    weightedSum += similarities.state * weights.state;
  }
  
  // Zip - exact match or first 5 digits
  if (components1.zip && components2.zip) {
    // If either is complete 9-digit zip, compare first 5 only
    const zip1 = components1.zip.substring(0, 5);
    const zip2 = components2.zip.substring(0, 5);
    similarities.zip = zip1 === zip2 ? 1.0 : 0.0;
    totalWeight += weights.zip;
    weightedSum += similarities.zip * weights.zip;
  }
  
  // Calculate overall similarity
  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

/**
 * Calculates combined similarity between two addresses
 * @param {string} address1 - First address
 * @param {string} address2 - Second address
 * @param {Object} options - Comparison options
 * @returns {number} Similarity score between 0 and 1
 */
function calculateAddressSimilarity(address1, address2, options = {}) {
  if (!address1 && !address2) return 1.0;
  if (!address1 || !address2) return 0.0;
  
  // Calculate token-based similarity
  const tokenSimilarity = calculateAddressTokenSimilarity(address1, address2);
  
  // Calculate component-based similarity
  const componentSimilarity = calculateAddressComponentSimilarity(address1, address2);
  
  // Calculate string-based similarity
  const stringSimilarity = jaroWinkler(
    String(address1).toLowerCase(),
    String(address2).toLowerCase()
  );
  
  // Use the best of component and token similarity, with a boost from string similarity
  const maxSimilarity = Math.max(tokenSimilarity, componentSimilarity);
  const combinedSimilarity = (maxSimilarity * 0.8) + (stringSimilarity * 0.2);
  
  return combinedSimilarity;
}

/**
 * Address Matcher for comparing addresses
 */
class AddressMatcher {
  /**
   * Creates a new address matcher
   * @param {Object} config - Configuration options
   * @param {number} [config.matchThreshold=0.5] - Threshold for determining matches
   * @param {Object} [config.confidenceThresholds] - Thresholds for confidence tiers
   */
  constructor(config = {}) {
    this.config = {
      matchThreshold: 0.5,
      confidenceThresholds: {
        HIGH: 0.9,
        MEDIUM: 0.7,
        LOW: 0.5,
        MINIMUM: 0.3
      },
      ...config
    };
  }
  
  /**
   * Compare two addresses and return similarity score
   * @param {string} address1 - First address
   * @param {string} address2 - Second address
   * @param {Object} [options] - Override default comparison options
   * @returns {number} Similarity score between 0 and 1
   */
  compareAddresses(address1, address2, options = {}) {
    return calculateAddressSimilarity(address1, address2, {
      ...options
    });
  }
  
  /**
   * Standardize an address
   * @param {string} address - Address to standardize
   * @returns {string} Standardized address
   */
  standardize(address) {
    return standardizeAddress(address);
  }
  
  /**
   * Parse an address into components
   * @param {string} address - Address to parse
   * @returns {Object} Parsed address components
   */
  parseAddress(address) {
    return parseAddress(address);
  }
  
  /**
   * Determines if two addresses match based on configured threshold
   * @param {string} address1 - First address
   * @param {string} address2 - Second address
   * @param {Object} [options] - Override default comparison options
   * @returns {boolean} Whether the addresses are considered a match
   */
  matches(address1, address2, options = {}) {
    const similarity = this.compareAddresses(address1, address2, options);
    return similarity >= this.config.matchThreshold;
  }
  
  /**
   * Evaluates a match between two records
   * @param {Object} sourceRecord - Source record
   * @param {Object} targetRecord - Target record
   * @param {Object} [options] - Matching options
   * @param {string} [options.addressField] - Field name for address
   * @param {string} [options.cityField] - Field name for city
   * @param {string} [options.stateField] - Field name for state
   * @param {string} [options.zipField] - Field name for zip
   * @returns {Object} Match result with scores and confidence
   */
  evaluateMatch(sourceRecord, targetRecord, options = {}) {
    const {
      addressField = 'address',
      cityField = 'city',
      stateField = 'state',
      zipField = 'zip',
      combineFields = true
    } = options;
    
    // Verify records
    if (!sourceRecord || !targetRecord) {
      throw new Error('Source and target records are required');
    }
    
    // If combining fields, construct full addresses
    if (combineFields) {
      let sourceFullAddress = '';
      let targetFullAddress = '';
      
      // Construct source full address
      if (sourceRecord[addressField]) {
        sourceFullAddress += sourceRecord[addressField];
      }
      if (sourceRecord[cityField]) {
        sourceFullAddress += ', ' + sourceRecord[cityField];
      }
      if (sourceRecord[stateField]) {
        sourceFullAddress += ', ' + sourceRecord[stateField];
      }
      if (sourceRecord[zipField]) {
        sourceFullAddress += ' ' + sourceRecord[zipField];
      }
      
      // Construct target full address
      if (targetRecord[addressField]) {
        targetFullAddress += targetRecord[addressField];
      }
      if (targetRecord[cityField]) {
        targetFullAddress += ', ' + targetRecord[cityField];
      }
      if (targetRecord[stateField]) {
        targetFullAddress += ', ' + targetRecord[stateField];
      }
      if (targetRecord[zipField]) {
        targetFullAddress += ' ' + targetRecord[zipField];
      }
      
      // Calculate combined similarity
      const confidence = this.compareAddresses(sourceFullAddress, targetFullAddress);
      
      // Determine tier based on confidence
      const tier = this._determineTier(confidence);
      
      return {
        confidence,
        components: {
          address: confidence
        },
        tier
      };
    } 
    // Otherwise, compare individual components
    else {
      const components = {};
      let totalWeight = 0;
      let weightedSum = 0;
      
      // Component weights
      const weights = {
        address: 0.7,
        city: 0.1,
        state: 0.1,
        zip: 0.1
      };
      
      // Address similarity
      if (addressField && sourceRecord[addressField] && targetRecord[addressField]) {
        components.address = this.compareAddresses(
          sourceRecord[addressField],
          targetRecord[addressField]
        );
        weightedSum += components.address * weights.address;
        totalWeight += weights.address;
      }
      
      // City similarity
      if (cityField && sourceRecord[cityField] && targetRecord[cityField]) {
        components.city = jaroWinkler(
          String(sourceRecord[cityField]).toLowerCase(),
          String(targetRecord[cityField]).toLowerCase()
        );
        weightedSum += components.city * weights.city;
        totalWeight += weights.city;
      }
      
      // State similarity (exact match)
      if (stateField && sourceRecord[stateField] && targetRecord[stateField]) {
        components.state = 
          String(sourceRecord[stateField]).toLowerCase() === 
          String(targetRecord[stateField]).toLowerCase() ? 1.0 : 0.0;
        weightedSum += components.state * weights.state;
        totalWeight += weights.state;
      }
      
      // Zip similarity (exact match or first 5 digits)
      if (zipField && sourceRecord[zipField] && targetRecord[zipField]) {
        const zip1 = String(sourceRecord[zipField]).substring(0, 5);
        const zip2 = String(targetRecord[zipField]).substring(0, 5);
        components.zip = zip1 === zip2 ? 1.0 : 0.0;
        weightedSum += components.zip * weights.zip;
        totalWeight += weights.zip;
      }
      
      // Calculate overall confidence
      const confidence = totalWeight > 0 ? weightedSum / totalWeight : 0;
      
      // Determine tier based on confidence
      const tier = this._determineTier(confidence);
      
      return {
        confidence,
        components,
        tier
      };
    }
  }
  
  /**
   * Determines the confidence tier based on score
   * @param {number} score - Confidence score
   * @returns {string} Confidence tier
   * @private
   */
  _determineTier(score) {
    const { HIGH, MEDIUM, LOW, MINIMUM } = this.config.confidenceThresholds;
    
    if (score >= HIGH) return 'HIGH';
    if (score >= MEDIUM) return 'MEDIUM';
    if (score >= LOW) return 'LOW';
    if (score >= MINIMUM) return 'MINIMUM';
    return 'NO_MATCH';
  }
}

module.exports = {
  AddressMatcher,
  calculateAddressSimilarity,
  calculateAddressTokenSimilarity,
  calculateAddressComponentSimilarity,
  standardizeAddress,
  parseAddress,
  ADDRESS_ABBREVIATIONS
};