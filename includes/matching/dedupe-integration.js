/**
 * Dedupe.js Integration Module
 * 
 * This module integrates with the dedupe library for machine learning-based entity resolution.
 * It provides an alternative matching approach that can learn from user feedback and training.
 */

const dedupe = require('dedupe');
const { ValidationError } = require('../core/errors');
const types = require('../types');

/**
 * Maps our semantic types to dedupe field types
 * @private
 */
const SEMANTIC_TO_DEDUPE_TYPE = {
  firstName: 'String',
  lastName: 'String',
  fullName: 'String',
  email: 'String',
  phone: 'String',
  address: 'String',
  postalCode: 'String',
  city: 'String',
  state: 'String',
  country: 'String',
  dateOfBirth: 'String',
  gender: 'Categorical'
};

/**
 * Default field comparison options
 * @private
 */
const DEFAULT_COMPARISON_OPTIONS = {
  firstName: { type: 'String', comparator: 'jaroWinkler' },
  lastName: { type: 'String', comparator: 'jaroWinkler' },
  fullName: { type: 'String', comparator: 'jaroWinkler' },
  email: { type: 'String', comparator: 'equality' },
  phone: { type: 'String', comparator: 'equality', ignore_case: false },
  address: { type: 'String', comparator: 'levenshtein', ignore_case: true },
  postalCode: { type: 'String', comparator: 'equality', ignore_case: true },
  city: { type: 'String', comparator: 'jaroWinkler', ignore_case: true },
  state: { type: 'String', comparator: 'equality', ignore_case: true },
  country: { type: 'String', comparator: 'equality', ignore_case: true },
  dateOfBirth: { type: 'String', comparator: 'equality', ignore_case: true },
  gender: { type: 'Categorical', comparator: 'categories' }
};

/**
 * Creates a configuration for the dedupe library
 * @param {Array<Object>} sourceFieldMappings - Source field mappings
 * @returns {Object} Dedupe configuration
 * @private
 */
function createDedupeConfig(sourceFieldMappings) {
  const fields = [];
  
  for (const { semanticType, fieldName } of sourceFieldMappings) {
    // Skip if no matching dedupe type
    const dedupeType = SEMANTIC_TO_DEDUPE_TYPE[semanticType];
    if (!dedupeType) {
      continue;
    }
    
    // Get comparison options for this semantic type
    const options = DEFAULT_COMPARISON_OPTIONS[semanticType] || { type: dedupeType };
    
    fields.push({
      field: semanticType,
      type: options.type,
      comparator: options.comparator,
      ...options
    });
  }
  
  return { fields };
}

/**
 * Creates a training data format expected by dedupe
 * @param {Array<Object>} trainingPairs - Array of labeled pairs
 * @param {Array<Object>} sourceFieldMappings - Source field mappings
 * @param {Array<Object>} targetFieldMappings - Target field mappings
 * @returns {Object} Training data for dedupe
 * @private
 */
function createTrainingData(trainingPairs, sourceFieldMappings, targetFieldMappings) {
  const sourceToSemantic = {};
  const targetToSemantic = {};
  
  // Create reverse mappings (field name -> semantic type)
  for (const { semanticType, fieldName } of sourceFieldMappings) {
    sourceToSemantic[fieldName] = semanticType;
  }
  
  for (const { semanticType, fieldName } of targetFieldMappings) {
    targetToSemantic[fieldName] = semanticType;
  }
  
  // Transform training data into dedupe format
  const positive = [];
  const negative = [];
  
  for (const pair of trainingPairs) {
    const { isMatch, sourceRecord, targetRecord } = pair;
    
    // Transform records to semantic types
    const sourceWithSemanticKeys = transformToSemanticKeys(sourceRecord, sourceToSemantic);
    const targetWithSemanticKeys = transformToSemanticKeys(targetRecord, targetToSemantic);
    
    // Add to appropriate array
    if (isMatch) {
      positive.push([sourceWithSemanticKeys, targetWithSemanticKeys]);
    } else {
      negative.push([sourceWithSemanticKeys, targetWithSemanticKeys]);
    }
  }
  
  return { positive, negative };
}

/**
 * Transforms record keys to semantic types
 * @param {Object} record - Record with field names as keys
 * @param {Object} fieldToSemantic - Mapping from field names to semantic types
 * @returns {Object} Record with semantic type keys
 * @private
 */
function transformToSemanticKeys(record, fieldToSemantic) {
  const result = {};
  
  for (const [fieldName, value] of Object.entries(record)) {
    const semanticType = fieldToSemantic[fieldName];
    if (semanticType) {
      result[semanticType] = value;
    }
  }
  
  return result;
}

/**
 * DedupeResolver class for ML-based entity resolution
 */
class DedupeResolver {
  /**
   * Creates a new dedupe resolver
   * @param {Object} options - Options
   * @param {string} [options.modelPath] - Path to saved model (if any)
   */
  constructor(options = {}) {
    this.model = null;
    this.trained = false;
    this.modelPath = options.modelPath;
    this.sourceFieldMappings = null;
  }
  
  /**
   * Initializes the resolver with field mappings
   * @param {Array<Object>} sourceFieldMappings - Source field mappings
   */
  async initialize(sourceFieldMappings) {
    this.sourceFieldMappings = sourceFieldMappings;
    const dedupeConfig = createDedupeConfig(sourceFieldMappings);
    
    // Initialize new deduper
    this.deduper = dedupe.Dedupe(dedupeConfig);
    
    // Try to load saved model if path provided
    if (this.modelPath) {
      try {
        const serializedModel = await fs.promises.readFile(this.modelPath, 'utf8');
        if (serializedModel) {
          this.deduper.statmodel = dedupe.deserializeModel(serializedModel);
          this.trained = true;
          console.log('Loaded dedupe model from', this.modelPath);
        }
      } catch (error) {
        console.warn('Could not load dedupe model:', error.message);
      }
    }
  }
  
  /**
   * Trains the resolver with labeled examples
   * @param {Array<Object>} trainingPairs - Array of labeled pairs
   * @param {Array<Object>} sourceFieldMappings - Source field mappings
   * @param {Array<Object>} targetFieldMappings - Target field mappings
   */
  async train(trainingPairs, sourceFieldMappings, targetFieldMappings) {
    if (!this.deduper) {
      throw new ValidationError('Resolver not initialized', 'deduper', null);
    }
    
    if (!Array.isArray(trainingPairs) || trainingPairs.length === 0) {
      throw new ValidationError('Training pairs must be a non-empty array', 'trainingPairs', trainingPairs);
    }
    
    const trainingData = createTrainingData(trainingPairs, sourceFieldMappings, targetFieldMappings);
    
    await new Promise((resolve, reject) => {
      this.deduper.train(trainingData, err => {
        if (err) {
          reject(new Error(`Training failed: ${err.message}`));
        } else {
          this.trained = true;
          resolve();
        }
      });
    });
    
    // Save model if path specified
    if (this.modelPath) {
      try {
        const serialized = dedupe.serializeModel(this.deduper.statmodel);
        await fs.promises.writeFile(this.modelPath, serialized, 'utf8');
        console.log('Saved dedupe model to', this.modelPath);
      } catch (error) {
        console.warn('Could not save dedupe model:', error.message);
      }
    }
  }
  
  /**
   * Predicts if a source-target pair is a match
   * @param {Object} sourceRecord - Source record
   * @param {Object} targetRecord - Target record
   * @param {Array<Object>} sourceFieldMappings - Source field mappings
   * @param {Array<Object>} targetFieldMappings - Target field mappings
   * @returns {Object} Match result with confidence score
   */
  async predict(sourceRecord, targetRecord, sourceFieldMappings, targetFieldMappings) {
    if (!this.deduper || !this.trained) {
      throw new ValidationError('Resolver not trained', 'deduper', null);
    }
    
    // Transform records to use semantic types as keys
    const sourceToSemantic = {};
    const targetToSemantic = {};
    
    for (const { semanticType, fieldName } of sourceFieldMappings) {
      sourceToSemantic[fieldName] = semanticType;
    }
    
    for (const { semanticType, fieldName } of targetFieldMappings) {
      targetToSemantic[fieldName] = semanticType;
    }
    
    const transformedSourceRecord = transformToSemanticKeys(sourceRecord, sourceToSemantic);
    const transformedTargetRecord = transformToSemanticKeys(targetRecord, targetToSemantic);
    
    // Calculate match probability
    const [matchProbability, explanation] = await new Promise((resolve, reject) => {
      this.deduper.matching(transformedSourceRecord, transformedTargetRecord, (err, result) => {
        if (err) {
          reject(new Error(`Prediction failed: ${err.message}`));
        } else {
          resolve(result);
        }
      });
    });
    
    // Convert probability to confidence score (0-1)
    const confidence = matchProbability;
    
    // Determine tier
    let tier = 'NO_MATCH';
    if (confidence >= 0.9) {
      tier = 'HIGH';
    } else if (confidence >= 0.7) {
      tier = 'MEDIUM';
    } else if (confidence >= 0.5) {
      tier = 'LOW';
    } else if (confidence >= 0.3) {
      tier = 'MINIMUM';
    }
    
    // Convert explanation to components
    const components = {};
    for (const { field, value } of explanation) {
      components[field] = value;
    }
    
    return {
      confidence,
      tier,
      components,
      explanation
    };
  }
  
  /**
   * Finds all potential matches for a record in a set of target records
   * @param {Object} sourceRecord - Source record
   * @param {Array<Object>} targetRecords - Array of target records
   * @param {Array<Object>} sourceFieldMappings - Source field mappings
   * @param {Array<Object>} targetFieldMappings - Target field mappings
   * @param {number} [threshold=0.5] - Confidence threshold
   * @returns {Array<Object>} Array of matches with confidence scores
   */
  async findMatches(sourceRecord, targetRecords, sourceFieldMappings, targetFieldMappings, threshold = 0.5) {
    if (!this.deduper || !this.trained) {
      throw new ValidationError('Resolver not trained', 'deduper', null);
    }
    
    const matches = [];
    
    for (const targetRecord of targetRecords) {
      try {
        const matchResult = await this.predict(
          sourceRecord,
          targetRecord,
          sourceFieldMappings,
          targetFieldMappings
        );
        
        if (matchResult.confidence >= threshold) {
          matches.push({
            sourceRecord,
            targetRecord,
            score: matchResult
          });
        }
      } catch (error) {
        console.warn('Error predicting match:', error.message);
      }
    }
    
    // Sort by confidence (highest first)
    return matches.sort((a, b) => b.score.confidence - a.score.confidence);
  }
  
  /**
   * Clusters similar records together
   * @param {Array<Object>} records - Records to cluster
   * @param {Array<Object>} fieldMappings - Field mappings
   * @param {number} [threshold=0.5] - Clustering threshold
   * @returns {Array<Array<Object>>} Clusters of similar records
   */
  async clusterRecords(records, fieldMappings, threshold = 0.5) {
    if (!this.deduper || !this.trained) {
      throw new ValidationError('Resolver not trained', 'deduper', null);
    }
    
    // Transform records to use semantic types as keys
    const fieldToSemantic = {};
    for (const { semanticType, fieldName } of fieldMappings) {
      fieldToSemantic[fieldName] = semanticType;
    }
    
    const transformedRecords = records.map(record => 
      transformToSemanticKeys(record, fieldToSemantic)
    );
    
    // Perform clustering
    const clusters = await new Promise((resolve, reject) => {
      this.deduper.cluster(transformedRecords, threshold, (err, clusters) => {
        if (err) {
          reject(new Error(`Clustering failed: ${err.message}`));
        } else {
          resolve(clusters);
        }
      });
    });
    
    // Map back to original records
    return clusters.map(cluster => 
      cluster.map(index => records[index])
    );
  }
}

module.exports = {
  DedupeResolver,
  createDedupeConfig,
  createTrainingData
}; 