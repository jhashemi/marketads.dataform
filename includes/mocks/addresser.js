/**
 * SQL Address Parser Generator
 * 
 * This module provides SQL expression generators for address parsing and
 * standardization using BigQuery's native SQL functions.
 */

/**
 * Generate SQL for address standardization
 * @param {string} addressField - Field name containing the address
 * @returns {string} SQL expression for standardized address
 */
function standardize(addressField) {
  if (!addressField || typeof addressField !== 'string') return '';
  
  // Generate SQL for address standardization
  return `
    TRIM(UPPER(
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          REGEXP_REPLACE(
            REGEXP_REPLACE(
              REGEXP_REPLACE(
                REGEXP_REPLACE(
                  REGEXP_REPLACE(${addressField}, 
                    r'\\bAVENUE\\b|\\bAVE\\b', 'AVE'), 
                  r'\\bBOULEVARD\\b|\\bBLVD\\b', 'BLVD'),
                r'\\bSTREET\\b|\\bST\\b', 'ST'),
              r'\\bROAD\\b|\\bRD\\b', 'RD'),
            r'\\bDRIVE\\b|\\bDR\\b', 'DR'),
          r'\\bLANE\\b|\\bLN\\b', 'LN'),
        r'\\bAPARTMENT\\b|\\bAPT\\b', 'APT')
    ))
  `;
}

/**
 * Generate SQL for parsing address components
 * @param {string} addressField - Field name containing the address
 * @returns {Object} Object with SQL expressions for each address component
 */
function parse(addressField) {
  if (!addressField || typeof addressField !== 'string') return {};
  
  // Return SQL expressions for each address component
  return {
    streetNumber: `REGEXP_EXTRACT(${addressField}, r'^(\\d+)')`,
    streetName: `
      REGEXP_REPLACE(
        REGEXP_EXTRACT(${addressField}, r'^\\d+\\s+(.+?)(?:\\s+(?:APT|UNIT|#).*|$)'), 
        r'\\b(STREET|AVENUE|BOULEVARD|ROAD|DRIVE|LANE|ST|AVE|BLVD|RD|DR|LN)\\b.*', 
        ''
      )
    `,
    streetType: `
      REGEXP_EXTRACT(
        ${addressField}, 
        r'\\b(STREET|AVENUE|BOULEVARD|ROAD|DRIVE|LANE|ST|AVE|BLVD|RD|DR|LN)\\b'
      )
    `,
    unit: `
      REGEXP_EXTRACT(
        ${addressField}, 
        r'(?:\\s+|^)(APT|UNIT|#)\\s*([A-Z0-9-]+)', 
        2
      )
    `,
    unitType: `
      REGEXP_EXTRACT(
        ${addressField}, 
        r'(?:\\s+|^)(APT|UNIT|#)\\s*([A-Z0-9-]+)', 
        1
      )
    `
  };
}

/**
 * Generate SQL for matching two addresses
 * @param {string} addressField1 - First address field
 * @param {string} addressField2 - Second address field
 * @returns {string} SQL expression for address similarity score
 */
function similarity(addressField1, addressField2) {
  if (!addressField1 || !addressField2) return '';
  
  // Standardize both addresses and compare
  const addr1 = standardize(addressField1);
  const addr2 = standardize(addressField2);
  
  // Return SQL for similarity calculation
  return `
    CASE
      WHEN ${addr1} = ${addr2} THEN 1.0
      ELSE (
        /* Calculate token-based similarity */
        (
          ARRAY_LENGTH(
            ARRAY(
              SELECT token 
              FROM UNNEST(SPLIT(${addr1}, ' ')) AS token
              INTERSECT DISTINCT
              SELECT token 
              FROM UNNEST(SPLIT(${addr2}, ' ')) AS token
            )
          ) * 1.0
        ) / 
        GREATEST(
          ARRAY_LENGTH(SPLIT(${addr1}, ' ')),
          ARRAY_LENGTH(SPLIT(${addr2}, ' '))
        )
      )
    END
  `;
}

module.exports = {
  standardize,
  parse,
  similarity
}; 