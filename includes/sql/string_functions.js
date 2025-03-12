/**
 * Generates SQL for standardizing a field based on its semantic type
 * @param {string} fieldName - The name of the field to standardize
 * @param {string} semanticType - The semantic type to use for standardization
 * @returns {string} - SQL expression for standardizing the field
 */
function standardizeSql(fieldName, semanticType) {
  if (!fieldName || !semanticType) return fieldName;
  switch(semanticType) {
    case 'email':
      return `LOWER(TRIM(${fieldName}))`;
    case 'firstName':
    case 'lastName':
    case 'fullName':
      return `TRIM(INITCAP(${fieldName}))`;
    case 'phoneNumber':
      return `REGEXP_REPLACE(${fieldName}, '[^0-9]', '')`;
    case 'zipCode':
      return `LPAD(CAST(REGEXP_REPLACE(${fieldName}, '[^0-9]', '') AS STRING), 5, '0')`;
    case 'address':
      return `UPPER(REGEXP_REPLACE(TRIM(${fieldName}), '\\s+', ' '))`;
    default:
      return `TRIM(${fieldName})`;
  }
}

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
    return `NULLIF(${columnName},${(flagChar=='U')?" 'U' ":flagChar}) ${includeColumnName?`as ${columnName}`:''}`;
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

/**
 * Pads a ZIP code with leading zeros to ensure 5-digit format
 * 
 * @param {string} columnName - The name of the ZIP code column
 * @returns {string} - The SQL expression
 */
function zipPad(columnName) {
    return `LPAD(CAST(${columnName} AS STRING), 5, '0')`;
}

// Export all functions
module.exports = {
    standardizeSql,
    transformStringColumn,
    clean_flag,
    cleanEmail,
    zipPad
};
