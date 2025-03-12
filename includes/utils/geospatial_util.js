// definitions/utils/geo_utils.js
/**
 * Geospatial utility functions for the matching system
 */

/**
 * Convert latitude/longitude to H3 index for geospatial partitioning
 * Based on the TrustFinancial example
 * @param {string} latCol - Column name for latitude 
 * @param {string} lngCol - Column name for longitude
 * @param {number} resolution - H3 resolution level (9-15)
 * @returns {string} SQL expression that generates H3 index
 */
function toH3IndexPartitionKey(latCol, lngCol, resolution = 13) {
  return `
    CASE
      WHEN ${latCol} IS NOT NULL AND ${lngCol} IS NOT NULL AND 
           ${latCol} BETWEEN -90 AND 90 AND ${lngCol} BETWEEN -180 AND 180
      THEN
        -- This is a simplified H3 index calculation
        -- In a real implementation, you would use BigQuery JS UDFs with the H3 library
        -- or approximate with a Z-curve or geohash
        CAST(
          ABS(FARM_FINGERPRINT(
            CONCAT(
              CAST(ROUND(${latCol}, ${resolution-8}) AS STRING),
              ',',
              CAST(ROUND(${lngCol}, ${resolution-8}) AS STRING)
            )
          )) AS INT64
        )
      ELSE NULL
    END
  `;
}

/**
 * Generate SQL for comparing H3 indexes
 * @param {string} h3Col1 - Column name for first H3 index
 * @param {string} h3Col2 - Column name for second H3 index
 * @returns {string} SQL expression that checks if H3 indexes are neighbors
 */
function h3Proximity(h3Col1, h3Col2) {
  return `
    -- In a real implementation, you would use proper H3 neighborhood functions
    -- This is a simplified approximation
    (${h3Col1} = ${h3Col2} OR ABS(${h3Col1} - ${h3Col2}) < 20)
  `;
}

/**
 * Calculate distance between two geographic points
 * @param {string} lat1Col - Column name for first latitude
 * @param {string} lng1Col - Column name for first longitude
 * @param {string} lat2Col - Column name for second latitude
 * @param {string} lng2Col - Column name for second longitude
 * @returns {string} SQL expression that calculates distance in kilometers
 */
function geoDistance(lat1Col, lng1Col, lat2Col, lng2Col) {
  return `
    -- Haversine formula
    2 * 6371 * ASIN(
      SQRT(
        POW(SIN((RADIANS(${lat2Col}) - RADIANS(${lat1Col})) / 2), 2) +
        COS(RADIANS(${lat1Col})) * COS(RADIANS(${lat2Col})) *
        POW(SIN((RADIANS(${lng2Col}) - RADIANS(${lng1Col})) / 2), 2)
      )
    )
  `;
}

/**
 * Generate geospatial blocking SQL
 * @param {string} sourceAlias - Source table alias
 * @param {string} targetAlias - Target table alias
 * @param {number} radiusKm - Maximum radius in kilometers for matches
 * @returns {string} SQL for geospatial blocking
 */
function geoBlocking(sourceAlias, targetAlias, radiusKm = 0.5) {
  return `
    -- Use H3 index for first-level filtering (much faster than calculating all distances)
    ${sourceAlias}.h3_index_bucket = ${targetAlias}.h3_index_bucket
    
    -- Then apply distance filter only to records that passed bucket filter
    AND ${geoDistance(`${sourceAlias}.latitude`, `${sourceAlias}.longitude`, 
                      `${targetAlias}.latitude`, `${targetAlias}.longitude`)} < ${radiusKm}
  `;
}

/**
 * Prepare address parts for better matching
 * Based on TrustFinancial addressComponentColumns
 * @param {string} address - Address expression or column
 * @returns {string} SQL expression for address standardization
 */
function standardizeAddressParts(address) {
  return `
    STRUCT(
      REGEXP_EXTRACT(${address}, r'^(\d+)') AS housenumber,
      REGEXP_EXTRACT(${address}, r'^(\d+)\s+([NESW])[.]?\s+') AS predirection,
      REGEXP_EXTRACT(${address}, r'^(?:\d+)\s+(?:[NESW][.]?\s+)?([A-Za-z\s]+)') AS streetname,
      REGEXP_EXTRACT(${address}, r'(ST|AVE|BLVD|DR|CT|LN|RD|PKWY|HWY|WAY|PL|TER|CIR)$') AS streetsuffix
    )
  `;
}

module.exports = {
  toH3IndexPartitionKey,
  h3Proximity,
  geoDistance,
  geoBlocking,
  standardizeAddressParts
};
