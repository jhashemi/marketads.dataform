/**
 * Core Type Definitions and Interfaces
 * 
 * This module defines the core types and interfaces used throughout the matching system.
 * Following Interface Segregation Principle, we define small, focused interfaces
 * for different responsibilities in the system.
 */

/**
 * @typedef {Object} Field
 * @property {string} name - Field name
 * @property {string} type - Field data type (STRING, INTEGER, etc.)
 * @property {string} [description] - Optional field description
 */

/**
 * @typedef {Object} FieldMapping
 * @property {string} semanticType - The semantic type (e.g., 'firstName', 'email')
 * @property {string} fieldName - The actual field name in the table
 */

/**
 * @typedef {Object} MatchScore
 * @property {number} confidence - Confidence score between 0 and 1
 * @property {Object} components - Individual score components by field
 * @property {string} tier - Classification (HIGH, MEDIUM, LOW, MINIMUM)
 */

/**
 * @typedef {Object} BlockingKey
 * @property {string} strategy - The blocking strategy used
 * @property {string} column - The generated column name
 * @property {string} sql - The SQL expression that generates the key
 */

/**
 * @typedef {Object} MatchStrategy
 * @property {string} name - Strategy name
 * @property {Function} match - Function that returns SQL for matching
 * @property {Function} score - Function that returns SQL for scoring
 * @property {string[]} requiredFields - Fields required by this strategy
 */

/**
 * @typedef {Object} MatchResult
 * @property {string} sourceId - Source record identifier
 * @property {string} targetId - Target record identifier 
 * @property {MatchScore} score - Match score details
 * @property {Object} sourceRecord - Source record data
 * @property {Object} targetRecord - Target record data
 * @property {string} timestamp - Match timestamp
 */

/**
 * @typedef {Object} MatchMetrics
 * @property {number} totalSourceRecords - Total number of source records
 * @property {number} highConfidenceMatches - Number of high confidence matches
 * @property {number} mediumConfidenceMatches - Number of medium confidence matches
 * @property {number} lowConfidenceMatches - Number of low confidence matches
 * @property {number} dobAppends - Number of records with DOB appended
 * @property {number} dobAppendRate - Rate of DOB appends
 * @property {boolean} metDobAppendTarget - Whether DOB append target was met
 */

// Interface for a match engine
const IMatchEngine = {
  /**
   * Evaluate matches between source and target records
   * @param {Object} sourceRecord - Source record
   * @param {Object} targetRecord - Target record
   * @param {Object} options - Matching options
   * @returns {MatchScore} - Match score
   */
  evaluateMatch: (sourceRecord, targetRecord, options) => {},
  
  /**
   * Get appropriate strategies for matching fields
   * @param {Object} sourceFields - Source fields by semantic type
   * @param {Object} targetFields - Target fields by semantic type
   * @returns {MatchStrategy[]} - Array of match strategies
   */
  getStrategies: (sourceFields, targetFields) => {}
};

// Interface for a blocking engine
const IBlockingEngine = {
  /**
   * Generate blocking keys for a record
   * @param {Object} record - Record to generate keys for
   * @param {Object} fieldMappings - Field mappings by semantic type
   * @returns {Object} - Map of blocking key values
   */
  generateKeys: (record, fieldMappings) => {},
  
  /**
   * Get SQL for generating blocking keys
   * @param {string} tableName - Table name
   * @param {Object} fieldMappings - Field mappings by semantic type
   * @returns {string} - SQL for generating keys
   */
  generateKeysSql: (tableName, fieldMappings) => {}
};

// Interface for SQL generation
const ISqlGenerator = {
  /**
   * Generate SQL for matching process
   * @param {Object} params - SQL generation parameters
   * @returns {string} - Generated SQL
   */
  generateMatchingSql: (params) => {},
  
  /**
   * Generate SQL for metrics calculation
   * @param {Object} params - SQL generation parameters
   * @returns {string} - Generated SQL
   */
  generateMetricsSql: (params) => {}
};

// Export all types and interfaces
module.exports = {
  // Interfaces
  IMatchEngine,
  IBlockingEngine,
  ISqlGenerator,
  
  // Type definitions are exported as JSDoc comments
  // which can be used by IDEs and documentation tools
}; 