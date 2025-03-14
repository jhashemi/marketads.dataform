/**
 * Matching Module
 *
 * This module serves as the entry point for all matching functionality.
 * It composes the matching engine, scorer, and validator components
 * following the Interface Segregation Principle and Separation of Concerns.
 */

const { MatchEngine } = require('./engine');
const { MatchScorer } = require('./scorer');
const { MatchValidator } = require('./validator');
const { createMatchingConfig } = require('../config/matching');

/**
 * Creates a complete matching system with all components
 * @param {Object} config - Configuration options
 * @returns {Object} Matching system object with all components
 */
function createMatchingSystem(config = {}) {
  // Create validated matching configuration
  const matchingConfig = createMatchingConfig(config);
  
  // Create all system components
  const engine = new MatchEngine(matchingConfig);
  const scorer = new MatchScorer(matchingConfig);
  const validator = new MatchValidator(matchingConfig);
  
  /**
   * Evaluate a match between two records
   * @param {Object} sourceRecord - Source record
   * @param {Object} targetRecord - Target record
   * @param {Object} options - Match options
   * @returns {Object} Match result with confidence score
   */
  async function evaluateMatch(sourceRecord, targetRecord, options) {
    const {
      sourceFieldMappings,
      targetFieldMappings,
      requiredFields = [],
      priorityFields = []
    } = options;
    
    // Validate candidate records
    if (requiredFields.length > 0) {
      validator.validateCandidate(
        sourceRecord,
        targetRecord,
        sourceFieldMappings,
        targetFieldMappings,
        requiredFields
      );
    }
    
    // Use rule-based matching
    const matchResult = engine.evaluateMatch(sourceRecord, targetRecord, {
      sourceFieldMappings,
      targetFieldMappings,
      priorityFields
    });
    
    // Check for false positives if high confidence
    if (matchResult.tier === 'HIGH' || matchResult.tier === 'MEDIUM') {
      const checkResult = validator.checkFalsePositives(
        matchResult,
        sourceRecord,
        targetRecord,
        sourceFieldMappings,
        targetFieldMappings
      );
      
      // Add warnings to result
      matchResult.warnings = checkResult.warnings || [];
    }
    
    return matchResult;
  }
  
  /**
   * Determines if two records can be merged based on match result
   * @param {Object} matchResult - Match result
   * @returns {boolean} Whether records can be merged
   */
  function canMergeRecords(matchResult) {
    return validator.canMerge(matchResult);
  }
  
  /**
   * Gets appropriate strategies for fields
   * @param {Object} sourceFields - Source fields by semantic type
   * @param {Object} targetFields - Target fields by semantic type
   * @returns {Array<Object>} Array of match strategies
   */
  function getMatchStrategies(sourceFields, targetFields) {
    return engine.getStrategies(sourceFields, targetFields);
  }
  
  /**
   * Calculates batch metrics for a set of matches
   * @param {Array<Object>} matches - Array of match results
   * @returns {Object} Batch metrics
   */
  function calculateBatchMetrics(matches) {
    return scorer.calculateBatchMetrics(matches);
  }
  
  
  /**
   * Finds matches for a record in a set of target records
   * @param {Object} sourceRecord - Source record
   * @param {Array<Object>} targetRecords - Array of target records
   * @param {Object} options - Match options
   * @returns {Promise<Array<Object>>} Array of matches with scores
   */
  async function findMatches(sourceRecord, targetRecords, options) {
    const {
      sourceFieldMappings,
      targetFieldMappings,
      threshold = 0.5,
      maxResults = 10
    } = options;
    
    // Use rule-based matching
    const matches = [];
    
    for (const targetRecord of targetRecords) {
      try {
        const matchResult = engine.evaluateMatch(sourceRecord, targetRecord, {
          sourceFieldMappings,
          targetFieldMappings
        });
        
        if (matchResult.confidence >= threshold) {
          matches.push({
            sourceRecord,
            targetRecord,
            score: matchResult
          });
        }
      } catch (error) {
        console.warn('Error evaluating match:', error.message);
      }
    }
    
    // Sort by confidence (highest first) and limit results
    return matches
      .sort((a, b) => b.score.confidence - a.score.confidence)
      .slice(0, maxResults);
  }
  
  /**
   * Clusters similar records together
   * @param {Array<Object>} records - Records to cluster
   * @param {Array<Object>} fieldMappings - Field mappings
   * @param {Object} options - Clustering options
   * @returns {Promise<Array<Array<Object>>>} Clusters of similar records
   */
  async function clusterRecords(records, fieldMappings, options = {}) {
    const { threshold = 0.5 } = options;
    
    // Simple rule-based clustering
    const clusters = [];
    const processed = new Set();
    
    for (let i = 0; i < records.length; i++) {
      if (processed.has(i)) continue;
      
      const record = records[i];
      const cluster = [record];
      processed.add(i);
      
      // Find other records that match this one
      for (let j = i + 1; j < records.length; j++) {
        if (processed.has(j)) continue;
        
        const otherRecord = records[j];
        
        try {
          const matchResult = engine.evaluateMatch(record, otherRecord, {
            sourceFieldMappings: fieldMappings,
            targetFieldMappings: fieldMappings
          });
          
          if (matchResult.confidence >= threshold) {
            cluster.push(otherRecord);
            processed.add(j);
          }
        } catch (error) {
          console.warn('Error during clustering:', error.message);
        }
      }
      
      if (cluster.length > 1) {
        clusters.push(cluster);
      }
    }
    
    return clusters;
  }
  
  // Return the public interface of the matching system
  return {
    evaluateMatch,
    canMergeRecords,
    getMatchStrategies,
    calculateBatchMetrics,
    findMatches,
    clusterRecords,
    
    // Expose component instances for advanced usage
    engine,
    scorer,
    validator,
    
    // Expose the configuration
    config: matchingConfig
  };
}

module.exports = {
  createMatchingSystem,
  MatchEngine,
  MatchScorer,
  MatchValidator
};