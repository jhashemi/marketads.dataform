/**
 * SQL Type Casting Functions
 * 
 * This module provides SQL generation functions for type casting operations.
 * These functions help with converting data types in SQL queries.
 */

/**
 * Casts a column to a specified data type with SAFE_CAST
 * 
 * @param {string} columnName - The name of the column to cast
 * @param {string} dataType - The target data type
 * @param {boolean} includeColumnName - Whether to include the column name in the output SQL
 * @returns {string} - The SQL expression
 */
function dataCast(columnName, dataType, includeColumnName = true) {
    return `SAFE_CAST(${columnName} as ${dataType}) ${includeColumnName?`as ${columnName}`:''}`;
}

/**
 * Casts a column to INTEGER with SAFE_CAST
 * 
 * @param {string} columnName - The name of the column to cast to integer
 * @param {boolean} includeColumnName - Whether to include the column name in the output SQL
 * @returns {string} - The SQL expression
 */
function dataCastInt(columnName, includeColumnName = true) {
    return dataCast(columnName, 'INTEGER', includeColumnName);
}

/**
 * Casts a column to BOOLEAN with SAFE_CAST
 * 
 * @param {string} columnName - The name of the column to cast to boolean
 * @param {boolean} includeColumnName - Whether to include the column name in the output SQL
 * @returns {string} - The SQL expression
 */
function dataCastBool(columnName, includeColumnName = true) {
    return dataCast(columnName, 'BOOLEAN', includeColumnName);
}

/**
 * Cleans a flag and casts it to INTEGER
 * 
 * @param {string} columnName - The name of the column to process
 * @param {boolean} includeColumnName - Whether to include the column name in the output SQL
 * @returns {string} - The SQL expression
 */
function dataCastIntFlag(columnName, includeColumnName = true) {
    const stringFunctions = require('./string_functions');
    return `${dataCast(stringFunctions.clean_flag(columnName,'U',false),'INTEGER',false)}${includeColumnName?` as ${columnName}`:''}`;
}

module.exports = {
    dataCast,
    dataCastInt,
    dataCastBool,
    dataCastIntFlag
};