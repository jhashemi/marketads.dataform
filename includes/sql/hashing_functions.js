/**
 * SQL Hashing and Partitioning Functions
 * 
 * This module provides SQL generation functions for hashing and partitioning operations.
 * These functions help with creating unique identifiers and partition keys in SQL queries.
 */

/**
 * Applies a hashing algorithm to a column value
 * 
 * @param {string} columnName - The name of the column to hash
 * @param {string} algo - The hashing algorithm to use (default: 'MD5')
 * @returns {string} - The SQL expression
 */
function to_hem(columnName, algo = 'MD5') {
    return `TO_HEX(${algo}(${columnName}))`;
}

/**
 * Creates a partition key ID for a column based on identifier type
 * 
 * @param {string} columnName - The name of the column
 * @param {string} identifierType - The type of identifier
 * @returns {string} - The SQL expression
 */
function createPartitionKeyId(columnName, identifierType) {
    return `CONCAT('${identifierType}', '_', ${columnName})`;
}

module.exports = {
    to_hem,
    createPartitionKeyId
};