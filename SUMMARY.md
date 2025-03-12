# MarketAds BigQuery-Native Matching System Summary

This document summarizes the implementation of the BigQuery-native matching system, highlighting the differences from the previous JavaScript-based approach and the benefits of the SQL-focused implementation.

## Implementation Approach

The core implementation principle was to shift from a JavaScript-based approach with external libraries to a BigQuery SQL-native approach that can execute entirely within the Google Dataform environment. This ensures optimal performance, scalability, and integration with the existing data pipeline.

## Key Components Implemented

### 1. String Similarity Functions
- **Levenshtein Similarity**: Implemented using BigQuery's native `LEVENSHTEIN` function with normalization
- **Jaro-Winkler Similarity**: Implemented two approaches:
  - BigQuery ML's `ML.DISTANCE` (optional if ML API is enabled)
  - A token and character-level bigram similarity approximation
- **Additional Similarity Methods**: Added equality, contains, and soundex-based similarity

### 2. Phonetic Matching Algorithms
- **Soundex**: Utilized BigQuery's built-in `SOUNDEX` function
- **Metaphone**: Implemented using SQL string transformations
- **Double Metaphone**: Simplified implementation with character transformations
- **NYSIIS**: Implemented using a series of SQL transformations

### 3. Address Standardization
- Created SQL-based implementation for address standardization
- Simplified approach using a series of `REGEXP_REPLACE` operations
- Standardizes street types, directionals, and formatting

### 4. Blocking Key Generation
- Implemented multiple blocking strategies:
  - Exact matching
  - Prefix matching
  - Email domain extraction
  - Year extraction
  - Last 4 digits of numeric fields
  - Phonetic blocking

### 5. Complete Matching Pipeline
- Created a configurable SQL generation function
- Supports weighted field scoring
- Enables blocking conditions for performance
- Classifies matches into confidence tiers
- Handles various field types with appropriate comparison methods

## Example Usage Files

Three example Dataform SQL files were created to demonstrate different matching scenarios:

1. **`name_matching.sqlx`**: Basic customer matching using names and contact information
2. **`address_matching.sqlx`**: Address matching with standardization preprocessing
3. **`blocking_keys.sqlx`**: Generation of multiple blocking keys for efficient matching

## Benefits of the BigQuery-Native Approach

### Performance
- **Reduced Data Movement**: Processing happens directly in BigQuery's distributed environment
- **SQL Optimization**: Leverages BigQuery's query optimizer for best performance
- **Efficient Blocking**: Enables processing of very large datasets through smart partitioning

### Integration
- **Seamless Dataform Workflow**: Fits perfectly in the Dataform environment
- **Version Control**: SQL files managed through version control alongside other Dataform assets
- **Infrastructure as Code**: Matching logic becomes part of the data pipeline infrastructure

### Maintainability
- **Simplified Dependencies**: No external JavaScript libraries to manage
- **Centralized Logic**: All matching logic in SQL functions that can be reused
- **Easier Debugging**: BigQuery UI enables visualization of each transformation step

### Scalability
- **Automatic Scaling**: BigQuery automatically scales to handle large datasets
- **Cost Control**: BigQuery's pricing model works well for batch matching operations
- **Incremental Processing**: Can support incremental matching approaches

## Implementation Details

### SQL Function Generation
The core of the system is a set of JavaScript modules that generate SQL:

```javascript
// Example: Generating Levenshtein similarity SQL
function levenshteinSimilaritySql(str1Expr, str2Expr) {
  return `
    CASE 
      WHEN ${str1Expr} IS NULL OR ${str2Expr} IS NULL THEN 0
      WHEN LENGTH(${str1Expr}) = 0 AND LENGTH(${str2Expr}) = 0 THEN 1
      ELSE 
        1.0 - (
          CAST(LEVENSHTEIN(LOWER(TRIM(${str1Expr})), LOWER(TRIM(${str2Expr}))) AS FLOAT64) / 
          CAST(GREATEST(LENGTH(TRIM(${str1Expr})), LENGTH(TRIM(${str2Expr}))) AS FLOAT64)
        )
    END
  `;
}
```

### Dataform Integration

The SQL generation is seamlessly integrated with Dataform's JavaScript API:

```javascript
js {
  const { generateMatchingPipeline } = require("../includes/sql/similarity_functions");
  
  return generateMatchingPipeline(
    "source_table", 
    "target_table", 
    fieldMappings, 
    matchOptions
  );
}
```

## Future Enhancements

Potential future enhancements to the BigQuery-native matching system:

1. **Machine Learning Integration**: Leverage BigQuery ML for supervised record matching
2. **Custom UDFs**: Create persistent User-Defined Functions for complex algorithms
3. **Automated Parameter Tuning**: Add functionality to test and optimize matching parameters
4. **Match Consensus**: Implement consensus-based matching across multiple strategies
5. **Hierarchical Matching**: Support hierarchical/composite entity matching (e.g., households) 