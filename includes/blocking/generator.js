/**
 * Blocking Key Generator
 * 
 * This module handles generating blocking keys for records.
 * It applies various blocking strategies to generate keys that efficiently
 * group potentially matching records.
 */

const { applyBlockingStrategy } = require('./strategies');
const { MissingFieldError, StrategyError } = require('../core/errors');
const types = require('../types');

/**
 * Generates blocking keys for a record using the specified strategies
 * @param {Object} record - Source record
 * @param {Array<Object>} fieldMappings - Field mappings
 * @param {Object} blockingConfig - Blocking configuration
 * @param {Object} blockingConfig.blockingStrategies - Strategies by semantic type
 * @param {Object} blockingConfig.blockingParams - Blocking parameters
 * @returns {Object} Map of blocking key values
 */
function generateBlockingKeys(record, fieldMappings, blockingConfig) {
  if (!record || typeof record !== 'object') {
    throw new Error('Record must be an object');
  }
  
  if (!Array.isArray(fieldMappings)) {
    throw new Error('Field mappings must be an array');
  }
  
  if (!blockingConfig || typeof blockingConfig !== 'object') {
    throw new Error('Blocking configuration must be an object');
  }
  
  const { blockingStrategies, blockingParams } = blockingConfig;
  
  if (!blockingStrategies || typeof blockingStrategies !== 'object') {
    throw new Error('Blocking strategies configuration must be an object');
  }
  
  // Convert record to semantic type format
  const recordByType = types.toSemanticTypes(record, fieldMappings);
  
  // Prepare result
  const blockingKeys = {};
  
  // Track the number of keys generated
  let keyCount = 0;
  const maxKeysPerRecord = blockingParams?.maxKeysPerRecord || 10;
  
  // Generate keys for each semantic type that has a strategy
  for (const [semanticType, strategies] of Object.entries(blockingStrategies)) {
    // Skip if this field is not in the record
    if (!recordByType[semanticType]) {
      continue;
    }
    
    const value = recordByType[semanticType];
    
    // Apply each strategy for this semantic type
    for (const strategyName of strategies) {
      try {
        // Apply strategy with parameters
        const params = getStrategyParams(strategyName, blockingParams);
        const keys = applyBlockingStrategy(strategyName, value, params);
        
        // Skip if no keys generated
        if (!keys) continue;
        
        // Handle array of keys (e.g., from tokenization)
        const keyArray = Array.isArray(keys) ? keys : [keys];
        
        for (const key of keyArray) {
          if (key) {
            const keyName = `${semanticType}_${strategyName}_${keyCount}`;
            blockingKeys[keyName] = key;
            keyCount++;
            
            // Break if we've generated maximum number of keys
            if (keyCount >= maxKeysPerRecord) {
              break;
            }
          }
        }
        
        // Break outer loop if max keys reached
        if (keyCount >= maxKeysPerRecord) {
          break;
        }
      } catch (error) {
        // Log error but continue with other strategies
        console.error(`Error generating blocking key for ${semanticType} using ${strategyName}:`, error);
      }
    }
  }
  
  return blockingKeys;
}

/**
 * Gets parameters for a specific blocking strategy
 * @param {string} strategyName - Strategy name
 * @param {Object} blockingParams - Blocking parameters
 * @returns {Object} Strategy-specific parameters
 */
function getStrategyParams(strategyName, blockingParams = {}) {
  switch (strategyName) {
    case 'prefix':
      return { prefixLength: blockingParams.minPrefixLength || 3 };
    
    case 'suffix':
      return { suffixLength: blockingParams.minPrefixLength || 3 };
    
    case 'token':
      return {
        minTokens: blockingParams.minTokens || 1,
        maxTokens: 3,
        useTokenCrossProduct: blockingParams.useTokenCrossProduct
      };
    
    default:
      return {};
  }
}

/**
 * Generates SQL expressions for blocking keys
 * @param {string} tableName - Table name
 * @param {Array<Object>} fieldMappings - Field mappings
 * @param {Object} blockingConfig - Blocking configuration
 * @returns {Array<Object>} Array of blocking key SQL expressions
 */
function generateBlockingKeySql(tableName, fieldMappings, blockingConfig) {
  if (!tableName || typeof tableName !== 'string') {
    throw new Error('Table name must be a string');
  }
  
  if (!Array.isArray(fieldMappings)) {
    throw new Error('Field mappings must be an array');
  }
  
  if (!blockingConfig || typeof blockingConfig !== 'object') {
    throw new Error('Blocking configuration must be an object');
  }
  
  const { blockingStrategies } = blockingConfig;
  
  if (!blockingStrategies || typeof blockingStrategies !== 'object') {
    throw new Error('Blocking strategies configuration must be an object');
  }
  
  // Create reverse mapping from semantic types to field names
  const semanticTypeToField = {};
  for (const { semanticType, fieldName } of fieldMappings) {
    semanticTypeToField[semanticType] = fieldName;
  }
  
  // Prepare SQL expressions
  const blockingKeyExpressions = [];
  
  // Generate SQL for each semantic type that has a strategy
  for (const [semanticType, strategies] of Object.entries(blockingStrategies)) {
    const fieldName = semanticTypeToField[semanticType];
    
    // Skip if field mapping not found
    if (!fieldName) {
      continue;
    }
    
    // Apply each strategy for this semantic type
    for (const strategyName of strategies) {
      try {
        const sqlExpr = generateStrategySQL(strategyName, tableName, fieldName, semanticType);
        
        if (sqlExpr) {
          blockingKeyExpressions.push({
            strategy: strategyName,
            semanticType,
            fieldName,
            columnName: `${semanticType}_${strategyName}_key`,
            sql: sqlExpr
          });
        }
      } catch (error) {
        // Log error but continue with other strategies
        console.error(`Error generating SQL for ${semanticType} using ${strategyName}:`, error);
      }
    }
  }
  
  return blockingKeyExpressions;
}

/**
 * Generates SQL expression for a specific blocking strategy
 * @param {string} strategyName - Strategy name
 * @param {string} tableName - Table name
 * @param {string} fieldName - Field name
 * @param {string} semanticType - Semantic type
 * @returns {string} SQL expression
 * @throws {StrategyError} If strategy SQL generation fails
 function generateStrategySQL(strategyName, tableName, fieldName, semanticType) {
   const fullFieldName = `${tableName}.${fieldName}`;
   
   switch (strategyName) {
     case 'exact':
       // Use standardization UDFs based on semantic type
       if (semanticType === 'name') {
         return `\${ref("core.text_udfs")}.standardize_name(${fullFieldName})`;
       } else if (semanticType === 'address') {
         return `\${ref("core.text_udfs")}.standardize_address(${fullFieldName})`;
       } else if (semanticType === 'phone') {
         return `\${ref("core.text_udfs")}.standardize_phone(${fullFieldName})`;
       } else if (semanticType === 'email') {
         return `\${ref("core.text_udfs")}.standardize_email(${fullFieldName})`;
       } else {
         return `LOWER(TRIM(${fullFieldName}))`;
       }
     
     case 'prefix':
       return `SUBSTRING(LOWER(TRIM(${fullFieldName})), 1, 3)`;
     
     case 'suffix':
       return `SUBSTRING(LOWER(TRIM(${fullFieldName})), -3)`;
     
     case 'soundex':
       return `SOUNDEX(${fullFieldName})`;
     
     case 'name_soundex':
       return `\${ref("core.text_udfs")}.name_blocking_key(${fullFieldName}, ${tableName}.last_name)`;
     
     case 'year':
       return `EXTRACT(YEAR FROM ${fullFieldName})`;
     
     case 'month':
       return `EXTRACT(MONTH FROM ${fullFieldName})`;
     
     case 'day':
       return `EXTRACT(DAY FROM ${fullFieldName})`;
     
     case 'emailDomain':
       return `\${ref("core.text_udfs")}.email_domain(${fullFieldName})`;
     
     case 'lastFourDigits':
       return `\${ref("core.text_udfs")}.last_four_digits(${fullFieldName})`;
     
     case 'token':
       // Token-based blocking requires multiple keys, not a single SQL expression
       return null;
       
     case 'embedding':
       // Locality-sensitive hashing (LSH) for embeddings
       return `\${ref("core.vector_udfs")}.lsh_blocking_key(${fullFieldName})`;
     
     case 'ngram':
       // N-gram blocking - generates multiple keys, typically used with array_agg
       return `\${ref("core.text_udfs")}.generate_ngrams(${fullFieldName}, 3)`;
     
     case 'compound':
       // Compound blocking typically requires multiple keys as input
       // This is a placeholder - in practice, this would be customized per use case
       return `CONCAT(
         LOWER(TRIM(${fullFieldName})),
         '_',
         SOUNDEX(${fullFieldName})
       )`;
     
     default:
       throw new StrategyError(`No SQL generation logic for strategy: ${strategyName}`, strategyName);
   }
 }
}

/**
 * Blocking key generator class
 */
class BlockingKeyGenerator {
  /**
   * Creates a new blocking key generator
   * @param {Object} blockingConfig - Blocking configuration
   */
  constructor(blockingConfig) {
    this.blockingConfig = blockingConfig;
  }
  
  /**
   * Generates blocking keys for a record
   * @param {Object} record - Source record
   * @param {Array<Object>} fieldMappings - Field mappings
   * @returns {Object} Map of blocking key values
   */
  generateKeys(record, fieldMappings) {
    return generateBlockingKeys(record, fieldMappings, this.blockingConfig);
  }
  
  /**
   * Generates SQL expressions for blocking keys
   * @param {string} tableName - Table name
   * @param {Array<Object>} fieldMappings - Field mappings
   * @returns {Array<Object>} Array of blocking key SQL expressions
   */
  generateKeySql(tableName, fieldMappings) {
    return generateBlockingKeySql(tableName, fieldMappings, this.blockingConfig);
  }
  
  /**
   * Creates a SQL query for generating blocking keys for a table
   * @param {string} tableName - Table name
   * @param {Array<Object>} fieldMappings - Field mappings
   * @returns {string} SQL query
   */
  createBlockingKeyQuery(tableName, fieldMappings) {
    const keyExpressions = this.generateKeySql(tableName, fieldMappings);
    
    if (keyExpressions.length === 0) {
      throw new Error('No valid blocking keys could be generated');
    }
    
    // Build SQL SELECT statement
    const selects = [
      `${tableName}.*`,
      ...keyExpressions.map(({ columnName, sql }) => `${sql} AS ${columnName}`)
    ];
    
    return `SELECT ${selects.join(', ')} FROM ${tableName}`;
  }
}

module.exports = {
  BlockingKeyGenerator,
  generateBlockingKeys,
  generateBlockingKeySql,
  generateStrategySQL,
  getStrategyParams
}; 