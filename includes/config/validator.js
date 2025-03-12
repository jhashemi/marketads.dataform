/**
 * Configuration Validator
 * 
 * Validates user configuration and applies sensible defaults
 * for the record matching system.
 */

const fieldDetector = require('../types/field_detector');

/**
 * Default configuration values
 */
const DEFAULT_CONFIG = {
  // General settings
  confidenceThreshold: 0.7,
  highConfidenceThreshold: 0.9,
  preferDeterministic: true,
  
  // Matching settings
  matchingMethods: [
    { type: 'exact', threshold: 1.0, priority: 1 },
    { type: 'standardized', threshold: 0.9, priority: 2 },
    { type: 'fuzzy', threshold: 0.7, priority: 3 },
    { type: 'probabilistic', threshold: 0.6, priority: 4 }
  ],
  
  // Blocking settings
  maxCandidatesPerRecord: 100,
  minBlockingKeyLength: 2,
  
  // Performance settings
  useCaching: true,
  useIncrementalProcessing: true,
  
  // Field weights
  defaultFieldWeight: 1.0
};

/**
 * Validates and enriches a user configuration object
 * @param {Object} userConfig - User-provided configuration
 * @returns {Object} Validated and enriched configuration
 */
function validateConfig(userConfig) {
  if (!userConfig) {
    throw new Error('Configuration object is required');
  }
  
  // Check required fields
  if (!userConfig.sourceTable) {
    throw new Error('sourceTable is required in configuration');
  }
  
  // Merge with defaults
  const config = {
    ...DEFAULT_CONFIG,
    ...userConfig
  };
  
  // Validate and enrich field mappings
  config.fieldMappings = validateFieldMappings(config.fieldMappings || {});
  
  // Validate reference tables
  if (userConfig.referenceTables) {
    config.referenceTables = validateReferenceTables(userConfig.referenceTables);
  } else if (userConfig.targetTable) {
    // Convert single target table to reference tables array
    config.referenceTables = [{
      name: userConfig.targetTable,
      priority: 1,
      reliability: 'HIGH'
    }];
  } else {
    throw new Error('Either targetTable or referenceTables must be specified');
  }
  
  // Ensure appendFields is an array
  if (userConfig.appendFields && !Array.isArray(userConfig.appendFields)) {
    config.appendFields = [userConfig.appendFields];
  }
  
  return config;
}

/**
 * Validates and enriches field mappings with type information
 * @param {Object} fieldMappings - Field mapping configuration
 * @returns {Object} Validated and enriched field mappings
 */
function validateFieldMappings(fieldMappings) {
  const enrichedMappings = {};
  
  for (const [field, mapping] of Object.entries(fieldMappings)) {
    // Handle string shorthand (field name only)
    let enrichedMapping = typeof mapping === 'string' 
      ? { source: mapping, target: mapping } 
      : { ...mapping };
    
    // Ensure source and target fields are defined
    if (!enrichedMapping.source) {
      throw new Error(`Source field not defined for mapping: ${field}`);
    }
    
    if (!enrichedMapping.target) {
      // Default target to same as source
      enrichedMapping.target = enrichedMapping.source;
    }
    
    // Detect field type if not specified
    if (!enrichedMapping.type) {
      enrichedMapping.type = fieldDetector.detectFieldType(field);
    }
    
    // Add standardization options if not specified
    if (!enrichedMapping.standardizationOptions) {
      enrichedMapping.standardizationOptions = 
        fieldDetector.getStandardizationOptions(enrichedMapping.type);
    }
    
    // Add comparison algorithm if not specified
    if (!enrichedMapping.comparisonAlgorithm) {
      enrichedMapping.comparisonAlgorithm = 
        fieldDetector.getRecommendedComparisonAlgorithm(enrichedMapping.type);
    }
    
    // Add blocking strategies if not specified
    if (!enrichedMapping.blockingStrategies) {
      enrichedMapping.blockingStrategies = 
        fieldDetector.getRecommendedBlockingStrategies(enrichedMapping.type);
    }
    
    // Add field weight if not specified
    if (!enrichedMapping.weight) {
      enrichedMapping.weight = 
        fieldDetector.getFieldImportanceWeight(enrichedMapping.type);
    }
    
    enrichedMappings[field] = enrichedMapping;
  }
  
  return enrichedMappings;
}

/**
 * Validates reference tables configuration
 * @param {Array} referenceTables - Reference tables configuration
 * @returns {Array} Validated reference tables
 */
function validateReferenceTables(referenceTables) {
  if (!Array.isArray(referenceTables)) {
    throw new Error('referenceTables must be an array');
  }
  
  // Sort by priority if not already sorted
  const sortedTables = [...referenceTables].sort((a, b) => {
    // Default priority to array index if not specified
    const priorityA = a.priority !== undefined ? a.priority : referenceTables.indexOf(a);
    const priorityB = b.priority !== undefined ? b.priority : referenceTables.indexOf(b);
    return priorityA - priorityB;
  });
  
  // Validate each table
  return sortedTables.map((table, index) => {
    if (typeof table === 'string') {
      // Convert string shorthand to object
      return {
        name: table,
        priority: index + 1,
        reliability: 'MEDIUM'
      };
    }
    
    if (!table.name) {
      throw new Error(`Reference table at index ${index} is missing 'name' property`);
    }
    
    // Ensure priority and reliability are set
    return {
      ...table,
      priority: table.priority !== undefined ? table.priority : index + 1,
      reliability: table.reliability || 'MEDIUM'
    };
  });
}

module.exports = {
  validateConfig,
  DEFAULT_CONFIG
};
