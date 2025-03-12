/**
 * Match Scorer
 * 
 * This module handles confidence score calculation for matches.
 * It follows the Separation of Concerns principle by focusing on scoring logic.
 */

const { ValidationError } = require('../core/errors');
const { DEFAULT_CONFIDENCE_THRESHOLDS } = require('../config/matching');

/**
 * Calculates a composite confidence score based on multiple metrics
 * @param {Object} matchComponents - Match score components by field
 * @param {Object} fieldWeights - Field weights by semantic type
 * @returns {number} Composite confidence score between 0 and 1
 */
function calculateCompositeScore(matchComponents, fieldWeights) {
  if (!matchComponents || typeof matchComponents !== 'object') {
    throw new ValidationError('Match components must be an object', 'matchComponents', matchComponents);
  }
  
  if (!fieldWeights || typeof fieldWeights !== 'object') {
    throw new ValidationError('Field weights must be an object', 'fieldWeights', fieldWeights);
  }
  
  let totalWeight = 0;
  let weightedScore = 0;
  
  for (const [field, score] of Object.entries(matchComponents)) {
    const weight = fieldWeights[field] || 0.5; // Default weight if not specified
    totalWeight += weight;
    weightedScore += score * weight;
  }
  
  return totalWeight > 0 ? weightedScore / totalWeight : 0;
}

/**
 * Classifies a confidence score into a tier
 * @param {number} score - Confidence score between 0 and 1
 * @param {Object} thresholds - Confidence thresholds for different tiers
 * @returns {string} Confidence tier (HIGH, MEDIUM, LOW, MINIMUM, NO_MATCH)
 */
function classifyScore(score, thresholds = DEFAULT_CONFIDENCE_THRESHOLDS) {
  if (typeof score !== 'number' || score < 0 || score > 1) {
    throw new ValidationError('Score must be a number between 0 and 1', 'score', score);
  }
  
  const { HIGH, MEDIUM, LOW, MINIMUM } = thresholds;
  
  if (score >= HIGH) return 'HIGH';
  if (score >= MEDIUM) return 'MEDIUM';
  if (score >= LOW) return 'LOW';
  if (score >= MINIMUM) return 'MINIMUM';
  return 'NO_MATCH';
}

/**
 * Calculates expected confidence based on available fields
 * @param {string[]} availableFields - Available semantic fields for matching
 * @param {Object} fieldWeights - Field weights by semantic type
 * @returns {number} Maximum possible confidence with these fields
 */
function calculateExpectedConfidence(availableFields, fieldWeights) {
  if (!Array.isArray(availableFields)) {
    throw new ValidationError('Available fields must be an array', 'availableFields', availableFields);
  }
  
  // Define high-value field groups that produce high confidence when present
  const highValueGroups = [
    ['email'], // Email alone can be high confidence
    ['phone'], // Phone alone can be high confidence
    ['firstName', 'lastName', 'dateOfBirth'], // Name + DOB is high confidence
    ['firstName', 'lastName', 'address', 'postalCode'] // Name + Address is high confidence
  ];
  
  // Check if any high-value group is completely contained in available fields
  for (const group of highValueGroups) {
    if (group.every(field => availableFields.includes(field))) {
      return 0.9; // High confidence possible
    }
  }
  
  // Medium-value field groups
  const mediumValueGroups = [
    ['firstName', 'lastName'], // Name alone is medium confidence
    ['address', 'postalCode'], // Address alone is medium confidence
    ['lastName', 'postalCode'] // Last name + Postal code is medium confidence
  ];
  
  // Check for medium confidence groups
  for (const group of mediumValueGroups) {
    if (group.every(field => availableFields.includes(field))) {
      return 0.7; // Medium confidence possible
    }
  }
  
  // Low-value field combinations
  if (availableFields.length >= 2) {
    return 0.5; // Low confidence possible with any two fields
  }
  
  // Minimum confidence with just one field
  if (availableFields.length === 1) {
    const field = availableFields[0];
    const weight = fieldWeights[field] || 0.5;
    return weight * 0.6; // Scale by field weight
  }
  
  return 0; // No fields, no confidence
}

/**
 * Calculates match quality metrics for a batch of matches
 * @param {Array<Object>} matches - Array of match results
 * @returns {Object} Match quality metrics
 */
function calculateMatchQualityMetrics(matches) {
  if (!Array.isArray(matches)) {
    throw new ValidationError('Matches must be an array', 'matches', matches);
  }
  
  const totalMatches = matches.length;
  if (totalMatches === 0) {
    return {
      highConfidenceRate: 0,
      mediumConfidenceRate: 0,
      lowConfidenceRate: 0,
      averageConfidence: 0,
      fieldCoverageRate: 0
    };
  }
  
  // Count matches by tier
  const tierCounts = {
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
    MINIMUM: 0,
    NO_MATCH: 0
  };
  
  let totalConfidence = 0;
  let totalFieldsCovered = 0;
  let totalFieldsAvailable = 0;
  
  for (const match of matches) {
    // Count by tier
    if (match.tier) {
      tierCounts[match.tier] = (tierCounts[match.tier] || 0) + 1;
    }
    
    // Add to confidence total
    if (typeof match.confidence === 'number') {
      totalConfidence += match.confidence;
    }
    
    // Field coverage (how many fields matched)
    if (match.components && typeof match.components === 'object') {
      const fieldsCovered = Object.keys(match.components).length;
      const fieldsAvailable = match.availableFields ? match.availableFields.length : fieldsCovered;
      
      totalFieldsCovered += fieldsCovered;
      totalFieldsAvailable += fieldsAvailable;
    }
  }
  
  return {
    highConfidenceRate: tierCounts.HIGH / totalMatches,
    mediumConfidenceRate: tierCounts.MEDIUM / totalMatches,
    lowConfidenceRate: tierCounts.LOW / totalMatches,
    averageConfidence: totalConfidence / totalMatches,
    fieldCoverageRate: totalFieldsAvailable > 0 ? totalFieldsCovered / totalFieldsAvailable : 0
  };
}

/**
 * Match Scorer class for scoring match results
 */
class MatchScorer {
  /**
   * Creates a new match scorer
   * @param {Object} config - Scoring configuration
   * @param {Object} [config.fieldWeights] - Field weights by semantic type
   * @param {Object} [config.confidenceThresholds] - Confidence thresholds for match tiers
   */
  constructor(config = {}) {
    this.fieldWeights = config.fieldWeights || {};
    this.confidenceThresholds = config.confidenceThresholds || DEFAULT_CONFIDENCE_THRESHOLDS;
  }
  
  /**
   * Scores a match between source and target records
   * @param {Object} matchComponents - Match components by field
   * @param {string[]} [availableFields] - Available fields for matching
   * @returns {Object} Match score object
   */
  scoreMatch(matchComponents, availableFields) {
    // Calculate confidence score
    const confidence = calculateCompositeScore(matchComponents, this.fieldWeights);
    
    // Classify the score
    const tier = classifyScore(confidence, this.confidenceThresholds);
    
    // Calculate expected maximum confidence
    const expectedConfidence = availableFields 
      ? calculateExpectedConfidence(availableFields, this.fieldWeights)
      : 1.0;
    
    // Calculate confidence ratio (how close to maximum possible)
    const confidenceRatio = expectedConfidence > 0 
      ? confidence / expectedConfidence 
      : 0;
    
    return {
      confidence,
      tier,
      expectedConfidence,
      confidenceRatio,
      components: matchComponents
    };
  }
  
  /**
   * Determines if match confidence meets minimum threshold for a purpose
   * @param {number} confidence - Match confidence score
   * @param {string} purpose - Match purpose ('append', 'merge', 'link')
   * @returns {boolean} Whether confidence is sufficient
   */
  isConfidentEnough(confidence, purpose) {
    switch (purpose) {
      case 'append':
        return confidence >= this.confidenceThresholds.MEDIUM;
      case 'merge':
        return confidence >= this.confidenceThresholds.HIGH;
      case 'link':
        return confidence >= this.confidenceThresholds.LOW;
      default:
        return confidence >= this.confidenceThresholds.MINIMUM;
    }
  }
  
  /**
   * Calculates match quality metrics for a batch
   * @param {Array<Object>} matches - Array of match results
   * @returns {Object} Match quality metrics
   */
  calculateBatchMetrics(matches) {
    return calculateMatchQualityMetrics(matches);
  }
}

module.exports = {
  MatchScorer,
  calculateCompositeScore,
  classifyScore,
  calculateExpectedConfidence,
  calculateMatchQualityMetrics
}; 