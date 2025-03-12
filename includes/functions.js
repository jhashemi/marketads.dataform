/**
 * Core Utility Functions
 * 
 * This module provides core utility functions for data transformation and 
 * processing in SQL contexts. These functions help with data cleaning,
 * type casting, and standardization.
 */

/**
 * Transforms a string column with proper trimming, nullification and case handling
 * 
 * @param {string} columnName - The name of the column to transform
 * @param {boolean} includeColumnName - Whether to include the column name in the output SQL
 * @returns {string} - The SQL expression
 */
function transformStringColumn(columnName, includeColumnName = true) {
    return `NULLIF(TRIM(UPPER(CASE 
           WHEN SAFE_CAST(${columnName} as STRING) = 'NULL' THEN NULL 
           WHEN UPPER(SAFE_CAST(${columnName} as STRING)) = '${columnName.toUpperCase()}' THEN NULL 
           ELSE SAFE_CAST(${columnName} as STRING)
         END)), '')${includeColumnName?` AS ${columnName}`:''}`;
}

/**
 * Cleans a flag column by nullifying a specific value
 * 
 * @param {string} columnName - The name of the column to clean
 * @param {string} flagChar - The character to nullify (default: 'U')
 * @param {boolean} includeColumnName - Whether to include the column name in the output SQL
 * @returns {string} - The SQL expression
 */
function clean_flag(columnName, flagChar='U', includeColumnName = true) {
    return `NULLIF(${columnName},${(flagChar=='U')?" 'U' " : flagChar}) ${includeColumnName?`as ${columnName}`:''}`;
}

// Type Casting Functions

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
 * Cleans a flag and casts it to INTEGER
 * 
 * @param {string} columnName - The name of the column to process
 * @param {boolean} includeColumnName - Whether to include the column name in the output SQL
 * @returns {string} - The SQL expression
 */
function dataCastIntFlag(columnName, includeColumnName = true) {
    return `${dataCast(clean_flag(columnName,'U',false),'INTEGER',false)}${includeColumnName?` as ${columnName}`:''}`;
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

// Geospatial and Indexing Functions

/**
 * Creates an H3 index from latitude and longitude columns
 * 
 * @param {string} latColName - The name of the latitude column
 * @param {string} lngColName - The name of the longitude column
 * @param {number} resolution - The H3 resolution (default: 13)
 * @returns {string} - The SQL expression
 */
function toH3Index(latColName, lngColName, resolution = 13) {
    return `ST_H3_LATLNGTOCELL(${latColName}, ${lngColName}, ${resolution})`;
}

/**
 * Creates an H3 index for partitioning
 * 
 * @param {string} latColName - The name of the latitude column
 * @param {string} lngColName - The name of the longitude column
 * @param {number} resolution - The H3 resolution (default: 13)
 * @returns {string} - The SQL expression
 */
function toH3IndexPartitionKey(latColName, lngColName, resolution = 13) {
    return `CAST(ST_H3_LATLNGTOCELL(${latColName}, ${lngColName}, ${resolution}) AS STRING)`;
}

// Hashing and Privacy Functions

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
 * Pads a ZIP code with leading zeros to ensure 5-digit format
 * 
 * @param {string} columnName - The name of the ZIP code column
 * @returns {string} - The SQL expression
 */
function zipPad(columnName) {
    return `LPAD(CAST(${columnName} AS STRING), 5, '0')`;
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

/**
 * Cleans and standardizes an email address
 * 
 * @param {string} columnName - The name of the email column
 * @param {boolean} ignoreDepartmentEmails - Whether to filter out department emails (default: true)
 * @returns {string} - The SQL expression
 */
function cleanEmail(columnName, ignoreDepartmentEmails = true) {
    const emailClean = `LOWER(TRIM(${columnName}))`;
    
    if (ignoreDepartmentEmails) {
        return `CASE 
            WHEN ${emailClean} LIKE '%@%.%' 
            AND ${emailClean} NOT LIKE 'info@%' 
            AND ${emailClean} NOT LIKE 'sales@%' 
            AND ${emailClean} NOT LIKE 'support@%' 
            THEN ${emailClean}
            ELSE NULL 
        END`;
    }
    
    return `CASE WHEN ${emailClean} LIKE '%@%.%' THEN ${emailClean} ELSE NULL END`;
}

// Export all functions
module.exports = {
    transformStringColumn,
    clean_flag,
    dataCast,
    dataCastInt,
    dataCastIntFlag,
    dataCastBool,
    toH3Index,
    toH3IndexPartitionKey,
    to_hem,
    zipPad,
    createPartitionKeyId,
    cleanEmail
};
