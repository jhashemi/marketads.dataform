/**
 * Geospatial Utility Functions
 * 
 * This module provides utility functions for geospatial operations,
 * particularly focused on H3 indexing and geospatial SQL generation.
 */

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

module.exports = {
    toH3Index,
    toH3IndexPartitionKey
};