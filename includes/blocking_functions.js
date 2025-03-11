// dataform/includes/blocking_functions.js

// Blocking Key Functions

/**
 * Creates a blocking key by concatenating zip code and the first 3 characters of the last name.
 * @param {string} zipCode - The zip code.
 * @param {string} lastName - The last name.
 * @returns {string} - The blocking key.
 */
function zipLast3(zipCode, lastName) {
  return `\`${zipCode || ''}${lastName ? lastName.substring(0, 3) : ''}\``;
}

/**
 * Creates a blocking key by concatenating zip code and the Soundex code of the last name.
 * @param {string} zipCode - The zip code.
 * @param {string} lastName - The last name.
 * @returns {string} - The blocking key.
 */
function zipSoundexLastName(zipCode, lastName) {
  return `\`${zipCode || ''}${lastName ? `SOUNDEX('${lastName}')` : ''}\``;
}

/**
 * Creates a blocking key by concatenating state, first 3 characters of last name, and first 3 characters of first name.
 * @param {string} state - The state.
 * @param {string} lastName - The last name.
 * @param {string} firstName - The first name.
 * @returns {string} - The blocking key.
 */
function stateLast3First3(state, lastName, firstName) {
  return `\`${state || ''}${lastName ? lastName.substring(0, 3) : ''}${firstName ? firstName.substring(0, 3) : ''}\``;
}

/**
 * Creates a blocking key by concatenating zip code and the first 5 characters of the street name.
 * @param {string} zipCode - The zip code.
 * @param {string} streetName - The street name.
 * @returns {string} - The blocking key.
 */
function zipStreet5(zipCode, streetName) {
  return `\`${zipCode || ''}${streetName ? streetName.substring(0, 5) : ''}\``;
}

/**
 * Creates a blocking key by concatenating first 3 characters of last name, Soundex of first name, and city.
 * @param {string} lastName - The last name.
 * @param {string} firstName - The first name.
 * @param {string} city - The city.
 * @returns {string} - The blocking key.
 */
function last3SoundexFirstCity(lastName, firstName, city){
  return `\`${lastName ? lastName.substring(0,3) : ''}${firstName ? `SOUNDEX('${firstName}')` : ''}${city || ''}\``;
}

// Fuzzy Matching Function (Levenshtein Distance Approximation)

/**
 * Approximates Levenshtein distance using BigQuery's native SQL functions.
 * Note: This is an approximation and might not be perfectly accurate.
 * @param {string} str1 - The first string.
 * @param {string} str2 - The second string.
 * @returns {number} - The approximate Levenshtein distance.
 */
function approximateLevenshtein(str1, str2) {
  return `
    (LENGTH(${str1}) + LENGTH(${str2}) - 2 * (
      SELECT
        COUNT(*)
      FROM
        UNNEST(GENERATE_ARRAY(1, LEAST(LENGTH(${str1}), LENGTH(${str2})))) AS offset
      WHERE
        SUBSTR(${str1}, offset, 1) = SUBSTR(${str2}, offset, 1)
    ))
  `;
}
/**
 * Extracts the first and last names from a full name string, 
 * handling cases where the name might have only one part.
 *
 * @param {string} fullName - The full name string.
 * @returns {object} - An object containing the 'first_name' and 'last_name'.
 */
function extractFirstLastName(fullName) {
  return {
    first_name: `
      CASE
        WHEN ARRAY_LENGTH(SPLIT(${fullName}, ' ')) > 1 THEN SPLIT(${fullName}, ' ')[SAFE_OFFSET(0)]
        ELSE NULL
      END
    `,
    last_name: `
      CASE
        WHEN ARRAY_LENGTH(SPLIT(${fullName}, ' ')) > 1 THEN SPLIT(${fullName}, ' ')[SAFE_OFFSET(1)]
        ELSE ${fullName}
      END
    `
  };
}

// Export the functions
module.exports = {
  zipLast3,
  zipSoundexLastName,
  stateLast3First3,
  zipStreet5,
  last3SoundexFirstCity,
  approximateLevenshtein,
  extractFirstLastName
};