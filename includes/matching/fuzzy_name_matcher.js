/**
 * Fuzzy Name Matcher
 * 
 * This module implements advanced name matching strategies using
 * phonetic algorithms and common name variation handling.
 */

const natural = require('natural');
const { jaroWinkler } = natural;

// Common name variations and nicknames map
const NAME_VARIATIONS = {
  'william': ['will', 'bill', 'billy', 'willy', 'liam'],
  'robert': ['rob', 'bob', 'bobby', 'robbie'],
  'richard': ['rick', 'dick', 'richie', 'ricky'],
  'michael': ['mike', 'mikey', 'mick'],
  'james': ['jim', 'jimmy', 'jamie'],
  'john': ['johnny', 'jon', 'jonathan'],
  'thomas': ['tom', 'tommy'],
  'charles': ['charlie', 'chuck', 'chaz'],
  'christopher': ['chris', 'topher'],
  'daniel': ['dan', 'danny'],
  'matthew': ['matt', 'matty'],
  'anthony': ['tony', 'ant'],
  'joseph': ['joe', 'joey', 'jos'],
  'edward': ['ed', 'eddie', 'ted', 'teddy'],
  'david': ['dave', 'davey'],
  'alexander': ['alex', 'al', 'sandy'],
  'nicholas': ['nick', 'nicky'],
  'benjamin': ['ben', 'benji', 'benny'],
  'steven': ['steve', 'stevie'],
  'timothy': ['tim', 'timmy'],
  'elizabeth': ['liz', 'lizzy', 'beth', 'betty', 'eliza'],
  'katherine': ['kate', 'katie', 'kathy', 'catherine', 'cathy'],
  'margaret': ['maggie', 'meg', 'peggy'],
  'jennifer': ['jen', 'jenny'],
  'jessica': ['jess', 'jessie'],
  'sarah': ['sara', 'sally'],
  'patricia': ['pat', 'patty', 'tricia'],
  'stephanie': ['steph'],
  'rebecca': ['becky', 'becca'],
  'samantha': ['sam', 'sammy'],
  'victoria': ['vicky', 'tori', 'vicki'],
  'deborah': ['deb', 'debbie'],
  'christine': ['chris', 'christy', 'tina']
};

// Default confidence thresholds for classifying matches
const DEFAULT_CONFIDENCE_THRESHOLDS = {
  HIGH: 0.9,
  MEDIUM: 0.7,
  LOW: 0.5,
  MINIMUM: 0.3
};

/**
 * Calculates phonetic similarity between two names using multiple algorithms
 * @param {string} name1 - First name
 * @param {string} name2 - Second name
 * @returns {number} Similarity score between 0 and 1
 */
function calculatePhoneticSimilarity(name1, name2) {
  // Handle edge cases
  if (!name1 || !name2 || typeof name1 !== 'string' || typeof name2 !== 'string') {
    return 0.0;
  }
  
  // Normalize names
  name1 = name1.trim().toLowerCase();
  name2 = name2.trim().toLowerCase();
  
  // Exact match is always 1.0
  if (name1 === name2) {
    return 1.0;
  }
  
  // Check nickname/variation matches
  if (isNameVariation(name1, name2)) {
    return 0.9; // High confidence for known variations
  }
  
  // Calculate various similarity metrics
  const soundexScore = soundexSimilarity(name1, name2);
  const metaphoneScore = metaphoneSimilarity(name1, name2);
  const jaroWinklerScore = jaroWinkler(name1, name2); // String similarity from natural
  
  // Weighted combination of scores
  // Phonetic algorithms have higher weight, Jaro-Winkler helps with typos
  return (soundexScore * 0.35) + (metaphoneScore * 0.35) + (jaroWinklerScore * 0.3);
}

/**
 * Calculates similarity based on Soundex phonetic algorithm
 * @param {string} name1 - First name
 * @param {string} name2 - Second name
 * @returns {number} Similarity score between 0 and 1
 */
function soundexSimilarity(name1, name2) {
  if (!name1 || !name2) {
    return 0.0;
  }
  
  // Normalize names
  name1 = name1.trim().toLowerCase();
  name2 = name2.trim().toLowerCase();
  
  // Use Natural's soundex implementation
  const soundex1 = natural.SoundEx.process(name1);
  const soundex2 = natural.SoundEx.process(name2);
  
  // If codes match exactly, return 1.0
  if (soundex1 === soundex2) {
    return 1.0;
  }
  
  // Otherwise, no match
  return 0.0;
}

/**
 * Calculates similarity based on Metaphone phonetic algorithm
 * @param {string} name1 - First name
 * @param {string} name2 - Second name
 * @returns {number} Similarity score between 0 and 1
 */
function metaphoneSimilarity(name1, name2) {
  if (!name1 || !name2) {
    return 0.0;
  }
  
  // Normalize names
  name1 = name1.trim().toLowerCase();
  name2 = name2.trim().toLowerCase();
  
  // Use Natural's metaphone implementation
  const metaphone1 = natural.Metaphone.process(name1);
  const metaphone2 = natural.Metaphone.process(name2);
  
  // If codes match exactly, return 1.0
  if (metaphone1 === metaphone2) {
    return 1.0;
  }
  
  // Otherwise, no match
  return 0.0;
}

/**
 * Checks if two names are known variations or nicknames of each other
 * @param {string} name1 - First name
 * @param {string} name2 - Second name
 * @returns {boolean} Whether names are variations of each other
 */
function isNameVariation(name1, name2) {
  // Normalize names
  name1 = name1.trim().toLowerCase();
  name2 = name2.trim().toLowerCase();
  
  // Check if either name is a root name with variations
  for (const [rootName, variations] of Object.entries(NAME_VARIATIONS)) {
    // Check if name1 is root and name2 is variation
    if (name1 === rootName && variations.includes(name2)) {
      return true;
    }
    
    // Check if name2 is root and name1 is variation
    if (name2 === rootName && variations.includes(name1)) {
      return true;
    }
    
    // Check if both are variations of the same root
    if (variations.includes(name1) && variations.includes(name2)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Performs a fuzzy match between two person records using name fields
 * @param {Object} person1 - First person record with name fields
 * @param {Object} person2 - Second person record with name fields
 * @param {Object} options - Match options
 * @returns {Object} Match result with confidence score and tier
 */
function fuzzyNameMatch(person1, person2, options = {}) {
  const confidenceThresholds = options.confidenceThresholds || DEFAULT_CONFIDENCE_THRESHOLDS;
  
  // Extract name fields
  const firstName1 = person1.firstName || '';
  const lastName1 = person1.lastName || '';
  const middleName1 = person1.middleName || '';
  
  const firstName2 = person2.firstName || '';
  const lastName2 = person2.lastName || '';
  const middleName2 = person2.middleName || '';
  
  // Start with components
  const components = {};
  let totalWeight = 0;
  let weightedScore = 0;
  
  // Compare last names (highest weight)
  if (lastName1 && lastName2) {
    const lastNameScore = calculatePhoneticSimilarity(lastName1, lastName2);
    components.lastName = lastNameScore;
    
    // Last name has highest weight
    const weight = 0.6;
    totalWeight += weight;
    weightedScore += lastNameScore * weight;
  }
  
  // Compare first names
  if (firstName1 && firstName2) {
    const firstNameScore = calculatePhoneticSimilarity(firstName1, firstName2);
    components.firstName = firstNameScore;
    
    // First name has medium-high weight
    const weight = 0.3;
    totalWeight += weight;
    weightedScore += firstNameScore * weight;
  }
  
  // Compare middle names (if available)
  if (middleName1 && middleName2) {
    const middleNameScore = calculatePhoneticSimilarity(middleName1, middleName2);
    components.middleName = middleNameScore;
    
    // Middle name has lowest weight
    const weight = 0.1;
    totalWeight += weight;
    weightedScore += middleNameScore * weight;
  }
  
  // Calculate overall confidence score
  const confidence = totalWeight > 0 ? weightedScore / totalWeight : 0;
  
  // Determine tier based on thresholds
  let tier = 'NO_MATCH';
  const { HIGH, MEDIUM, LOW, MINIMUM } = confidenceThresholds;
  
  if (confidence >= HIGH) tier = 'HIGH';
  else if (confidence >= MEDIUM) tier = 'MEDIUM';
  else if (confidence >= LOW) tier = 'LOW';
  else if (confidence >= MINIMUM) tier = 'MINIMUM';
  
  return {
    confidence,
    components,
    tier
  };
}

/**
 * Creates a fuzzy name matcher with configuration options
 * @param {Object} config - Configuration options
 * @returns {Object} Matcher object with match methods
 */
function createFuzzyNameMatcher(config = {}) {
  const confidenceThresholds = {
    ...DEFAULT_CONFIDENCE_THRESHOLDS,
    ...(config.confidenceThresholds || {})
  };
  
  /**
   * Matches two person records using fuzzy name matching
   * @param {Object} person1 - First person record
   * @param {Object} person2 - Second person record
   * @returns {Object} Match result
   */
  function match(person1, person2) {
    return fuzzyNameMatch(person1, person2, { confidenceThresholds });
  }
  
  return {
    match,
    calculatePhoneticSimilarity,
    soundexSimilarity,
    metaphoneSimilarity
  };
}

module.exports = {
  calculatePhoneticSimilarity,
  soundexSimilarity,
  metaphoneSimilarity,
  fuzzyNameMatch,
  createFuzzyNameMatcher,
  isNameVariation
};