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
  return `\`${zipCode || ''}\`_\`SOUNDEX(${lastName})\``;
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
  return `\`${lastName ? lastName.substring(0,3) : ''}\`_\`SOUNDEX(${firstName})\`_\`${city || ''}\``;
}

// Fuzzy Matching Function (Levenshtein Distance Approximation)

/**
 * Calculates Levenshtein distance using BigQuery's ML.SIMILARITY function.
 * This is more accurate and performant than the previous approximation.
 * @param {string} str1 - The first string.
 * @param {string} str2 - The second string.
 * @returns {string} - SQL expression for the Levenshtein distance calculation.
 */
function approximateLevenshtein(str1, str2) {
  return `
    CASE
      WHEN ${str1} IS NULL OR ${str2} IS NULL THEN 999999
      WHEN LENGTH(${str1}) = 0 AND LENGTH(${str2}) = 0 THEN 0
      ELSE CAST(ROUND((1 - ML.SIMILARITY(${str1}, ${str2}, 'LEVENSHTEIN')) * 
            GREATEST(LENGTH(${str1}), LENGTH(${str2}))) AS INT64)
    END
  `;
}

/**
 * Calculates similarity ratio between two strings using ML.SIMILARITY.
 * Returns a value between 0.0 and 1.0 where 1.0 is an exact match.
 * @param {string} str1 - The first string.
 * @param {string} str2 - The second string.
 * @returns {string} - SQL expression for similarity ratio.
 */
function similarityRatio(str1, str2) {
  return `
    CASE
      WHEN ${str1} IS NULL OR ${str2} IS NULL THEN 0.0
      WHEN ${str1} = ${str2} THEN 1.0
      ELSE ML.SIMILARITY(${str1}, ${str2}, 'LEVENSHTEIN')
    END
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
  similarityRatio,
  extractFirstLastName
};