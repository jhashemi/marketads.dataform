/**
 * Blocking Module
 * 
 * This module serves as the entry point for blocking functionality.
 * It composes blocking strategies and key generation logic
 * following the Interface Segregation Principle and Separation of Concerns.
 */

const strategies = require('./strategies');
const { BlockingKeyGenerator } = require('./generator');
const { createBlockingConfig } = require('../config/blocking');
const { IBlockingEngine } = require('../core/types');

/**
 * Blocking engine class implementing the IBlockingEngine interface
 */
class BlockingEngine {
  /**
   * Creates a new blocking engine
   * @param {Object} config - Blocking configuration
   */
  constructor(config = {}) {
    this.blockingConfig = createBlockingConfig(config);
    this.keyGenerator = new BlockingKeyGenerator(this.blockingConfig);
  }
  
  /**
   * Generates blocking keys for a record
   * @param {Object} record - Source record
   * @param {Array<Object>} fieldMappings - Field mappings
   * @returns {Object} Map of blocking key values
   */
  generateKeys(record, fieldMappings) {
    return this.keyGenerator.generateKeys(record, fieldMappings);
  }
  
  /**
   * Gets SQL for generating blocking keys
   * @param {string} tableName - Table name
   * @param {Array<Object>} fieldMappings - Field mappings
   * @returns {string} SQL for generating keys
   */
  generateKeysSql(tableName, fieldMappings) {
    return this.keyGenerator.createBlockingKeyQuery(tableName, fieldMappings);
  }
  
  /**
   * Gets available blocking strategies
   * @returns {string[]} Array of strategy names
   */
  getAvailableStrategies() {
    return strategies.getAvailableBlockingStrategies();
  }
  
  /**
   * Gets the blocking strategies configured for a semantic type
   * @param {string} semanticType - Semantic type
   * @returns {string[]} Strategies for this semantic type
   */
  getStrategiesForType(semanticType) {
    const { blockingStrategies } = this.blockingConfig;
    return blockingStrategies[semanticType] || [];
  }
  
  /**
   * Creates a SQL JOIN condition between two tables based on blocking keys
   * @param {string} sourceTable - Source table name
   * @param {string} targetTable - Target table name
   * @param {Array<Object>} sourceFieldMappings - Source field mappings
   * @param {Array<Object>} targetFieldMappings - Target field mappings
   * @returns {string} SQL JOIN condition
   */
  createJoinCondition(sourceTable, targetTable, sourceFieldMappings, targetFieldMappings) {
    // Generate key expressions for both tables
    const sourceKeys = this.keyGenerator.generateKeySql(sourceTable, sourceFieldMappings);
    const targetKeys = this.keyGenerator.generateKeySql(targetTable, targetFieldMappings);
    
    // Find matching keys by semantic type and strategy
    const joinConditions = [];
    
    for (const sourceKey of sourceKeys) {
      for (const targetKey of targetKeys) {
        // Keys match if they have the same semantic type and strategy
        if (sourceKey.semanticType === targetKey.semanticType && 
            sourceKey.strategy === targetKey.strategy) {
          
          joinConditions.push(
            `(${sourceKey.sql} IS NOT NULL AND ${targetKey.sql} IS NOT NULL AND ${sourceKey.sql} = ${targetKey.sql})`
          );
        }
      }
    }
    
    // If no join conditions, fallback to cross join with warning
    if (joinConditions.length === 0) {
      console.warn('No matching blocking keys found for join, this will result in a cross join');
      return '1=1'; // Always true condition (cross join)
    }
    
    // Combine with OR for any matching blocking key
    return joinConditions.join(' OR ');
  }
}

// Ensure BlockingEngine implements IBlockingEngine
Object.entries(IBlockingEngine).forEach(([methodName, methodSignature]) => {
  if (typeof BlockingEngine.prototype[methodName] !== 'function') {
    throw new Error(`BlockingEngine must implement ${methodName} from IBlockingEngine`);
  }
});

/**
 * Creates a blocking engine with the specified configuration
 * @param {Object} config - Blocking configuration
 * @returns {BlockingEngine} Configured blocking engine
 */
function createBlockingEngine(config = {}) {
  return new BlockingEngine(config);
}

module.exports = {
  createBlockingEngine,
  BlockingEngine,
  
  // Re-export lower-level components for advanced usage
  strategies,
  BlockingKeyGenerator
}; 