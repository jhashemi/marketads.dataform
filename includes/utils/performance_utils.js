// definitions/utils/performance_utils.js
// Utilities for optimizing BigQuery performance in record linkage operations

/**
 * Generate efficient blocking keys for a record to reduce comparison space
 * @param {string} tableAlias - SQL table alias
 * @param {string[]} methods - Array of blocking methods to apply
 * @returns {string} SQL expression that generates an array of blocking keys
 */
function generateAllKeys(tableAlias, methods) {
  const blockingExpressions = methods.map(method => {
    switch(method) {
      case 'zipcode':
        return `IF(${tableAlias}.ZipCode IS NOT NULL, CONCAT('ZIP:', SUBSTR(TRIM(${tableAlias}.ZipCode), 1, 5)), NULL)`;
      
      case 'name_zip':
        return `IF(${tableAlias}.LastName IS NOT NULL AND ${tableAlias}.ZipCode IS NOT NULL, 
                  CONCAT('LZ:', UPPER(SUBSTR(TRIM(${tableAlias}.LastName), 1, 3)), SUBSTR(TRIM(${tableAlias}.ZipCode), 1, 5)), 
                NULL)`;
      
      case 'phone':
        return `IF(${tableAlias}.PhoneNumber IS NOT NULL, 
                  CONCAT('PH:', REGEXP_REPLACE(${tableAlias}.PhoneNumber, r'[^0-9]', '')), 
                NULL)`;
      
      case 'name_dob':
        return `IF(${tableAlias}.LastName IS NOT NULL AND ${tableAlias}.DateOfBirth IS NOT NULL, 
                  CONCAT('DB:', UPPER(SUBSTR(TRIM(${tableAlias}.LastName), 1, 3)), 
                         SUBSTR(REGEXP_REPLACE(${tableAlias}.DateOfBirth, r'[^0-9]', ''), 1, 4)), 
                NULL)`;
      
      case 'email_prefix':
        return `IF(${tableAlias}.EmailAddress IS NOT NULL, 
                  CONCAT('EM:', SPLIT(LOWER(TRIM(${tableAlias}.EmailAddress)), '@')[OFFSET(0)]), 
                NULL)`;
      
      case 'first_last_init':
        return `IF(${tableAlias}.FirstName IS NOT NULL AND ${tableAlias}.LastName IS NOT NULL, 
                  CONCAT('FL:', UPPER(TRIM(${tableAlias}.FirstName)), '_', 
                         UPPER(SUBSTR(TRIM(${tableAlias}.LastName), 1, 1))), 
                NULL)`;
      
      case 'address_city':
        return `IF(${tableAlias}.AddressLine1 IS NOT NULL AND ${tableAlias}.City IS NOT NULL, 
                  CONCAT('AC:', CAST(FARM_FINGERPRINT(CONCAT(
                    UPPER(REGEXP_REPLACE(TRIM(${tableAlias}.AddressLine1), r'[^A-Z0-9]', '')),
                    UPPER(TRIM(${tableAlias}.City))
                  )) AS STRING)), 
                NULL)`;
      
      default:
        return `NULL`;
    }
  }).filter(expr => expr !== 'NULL');
  
  return `ARRAY_REMOVE(ARRAY[${blockingExpressions.join(', ')}], NULL)`;
}

/**
 * Generate a unique execution ID for tracking record linkage runs
 * @returns {string} SQL expression that generates a unique execution ID
 */
function execution_id() {
  return `CONCAT('RLNK_', FORMAT_TIMESTAMP('%Y%m%d%H%M%S', CURRENT_TIMESTAMP()), '_', CAST(FARM_FINGERPRINT(CAST(RAND() AS STRING)) AS STRING))`;
}

/**
 * Create a SQL expression for filtering partitions efficiently
 * @returns {string} SQL partition filter expression
 */
function when_partition_filter() {
  return "TIMESTAMP_TRUNC(CURRENT_TIMESTAMP(), DAY)";
}

/**
 * Generate SQL for efficient query plan with column pruning
 * @param {string} tableName - The table to query
 * @param {string[]} columns - Columns to select
 * @param {string} whereClause - Optional WHERE clause
 * @returns {string} Optimized SQL query
 */
function optimized_select(tableName, columns, whereClause = "") {
  const columnsStr = columns.join(', ');
  const where = whereClause ? `WHERE ${whereClause}` : '';
  
  return `
    SELECT ${columnsStr}
    FROM ${tableName}
    ${where}
    /* BigQuery optimization hints */
    OPTIONS(
      require_partition_filter = true,
      optimization_strategy = 'minimize_shuffle'
    )
  `;
}

module.exports = {
  generateAllKeys,
  execution_id,
  when_partition_filter,
  optimized_select
};
