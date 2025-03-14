# MarketAds BigQuery-Native Record Matching System

A high-performance, SQL-based record matching and entity resolution system designed specifically for Google BigQuery and Dataform environments. This system enables efficient and accurate matching of records across different data sources using native BigQuery SQL capabilities.

## Overview

The MarketAds BigQuery Matching System is designed to handle large-scale record matching and entity resolution tasks within the Google Cloud ecosystem. By leveraging BigQuery's powerful SQL engine, the system provides:

- Fast similarity calculations for record comparison
- Multiple blocking strategies for performance optimization
- Phonetic matching algorithms for name and text comparison
- Address standardization for improved matching accuracy
- Configurable matching pipelines with weighting and thresholds

## Key Features

### SQL-Native Implementation
- **100% BigQuery SQL**: All matching logic implemented using native BigQuery SQL
- **Dataform Integration**: Purpose-built for the Dataform workflow environment
- **High Performance**: Efficiently processes millions of records using BigQuery's distributed computing

### String Similarity Methods
- **Levenshtein Distance**: Normalized edit distance calculation
- **Token-Based Similarity**: Word and character n-gram similarity measures
- **Equality Matching**: Exact matching with standardization
- **Partial Matching**: Contains and prefix-based matching

### Phonetic Algorithms
- **Soundex**: Native BigQuery implementation
- **Metaphone**: Custom SQL implementation
- **Double Metaphone**: Simplified implementation in SQL
- **NYSIIS**: New York State Identification and Intelligence System algorithm

### Address Standardization
- **Street Type Normalization**: Standardizes "Street" to "St", "Avenue" to "Ave", etc.
- **Directional Standardization**: Normalizes "North" to "N", "Southwest" to "SW", etc.
- **Whitespace Cleaning**: Standardizes whitespace and special characters

### Blocking Strategies
- **Multiple Key Types**: Email domain, name prefix, ZIP code, phone digits, etc.
- **Phonetic Blocking**: Sound-based blocking for names
- **Composite Keys**: Combines multiple fields for more specific blocking
- **Performance Optimization**: Drastically reduces comparison matrix size

### Complete Matching Pipeline
- **Field Mapping**: Maps fields between different sources
- **Confidence Scoring**: Weighted similarity scores
- **Match Classification**: Categorizes matches into tiers (HIGH, MEDIUM, LOW)
- **Flexible Configuration**: Customizable thresholds and weights

## Usage Examples

The system includes several examples that demonstrate different matching scenarios:

### Basic Name Matching

```sql
-- From definitions/matching/name_matching.sqlx
-- Matches customers across different data sources using name and contact info
config {
  type: "table",
  name: "matched_customers",
  description: "Matches customer records across source and target tables"
}

js {
  const { generateMatchingPipeline } = require("../includes/sql/similarity_functions");
  
  // Define field mappings with weights
  const fieldMappings = [
    {
      sourceField: "first_name",
      targetField: "firstname",
      type: "firstName",
      weight: 1.5
    },
    // Additional fields...
  ];
  
  // Return matching SQL
  return generateMatchingPipeline(
    "source_customers", 
    "target_customers", 
    fieldMappings
  );
}
```

### Address Matching with Standardization

```sql
-- From definitions/matching/address_matching.sqlx
-- Standardizes addresses before matching
WITH standardized_source AS (
  SELECT
    id,
    ${standardizeAddressSql('address_line1')} AS std_address,
    -- Other fields...
  FROM source_customers
)

-- Then perform matching on standardized addresses
```

### Efficient Blocking for Large Datasets

```sql
-- From definitions/matching/blocking_keys.sqlx
-- Creates multiple blocking keys for efficient matching

-- Standard blocking keys based on direct field values
WITH standard_blocking_keys AS (
  -- Various blocking strategies
),

-- Advanced phonetic blocking for names
phonetic_blocking_keys AS (
  -- Soundex, Metaphone, etc.
)

-- Combine all blocking keys
SELECT * FROM standard_blocking_keys
UNION ALL
SELECT * FROM phonetic_blocking_keys
```

## System Architecture

The system is organized into modular JavaScript files that generate SQL:

1. **`includes/sql/similarity_functions.js`**: Core string similarity functions
2. **`includes/sql/phonetic_functions.js`**: Phonetic algorithm implementations
3. **`definitions/matching/*.sqlx`**: Dataform SQL definitions that use the functions

## Performance Considerations

- **Blocking**: Always use appropriate blocking strategies for large datasets
- **Indexes**: Ensure that blocking key columns are properly indexed
- **Partitioning**: Consider partitioning tables by blocking keys
- **Threshold Tuning**: Adjust confidence thresholds based on your data quality

## Getting Started

1. **Setup Dataform**: Ensure your Dataform project is configured for BigQuery
2. **Copy Implementation Files**: Add the SQL utility files to your includes directory
3. **Create Matching Definitions**: Define your matching queries in `.sqlx` files
4. **Configure Field Mappings**: Map fields between your source and target tables
5. **Execute**: Run the Dataform workflow to perform matching

## Configuration Options

The matching pipeline supports various configuration options:

```javascript
const matchOptions = {
  // Match quality thresholds
  thresholds: {
    high: 0.85,   // High confidence matches (85%+)
    medium: 0.65, // Medium confidence matches (65-85%)
    low: 0.45     // Low confidence matches (45-65%)
  },
  
  // Blocking configuration for performance
  blocking: {
    field: {
      source: "email",
      target: "email_address"
    },
    method: "email_domain"
  }
};
```

## Semantic Type Mapping

The system utilizes semantic type mapping to improve the accuracy and relevance of record matching. Semantic types allow the system to understand the meaning of data fields, not just their names, and apply appropriate matching logic.

### Semantic Type Map (`includes/semantic_types.js`)

The `semanticTypeMap` is defined in `includes/semantic_types.js` as a JavaScript object. It maps semantic types (keys) to an array of possible column names (values).

```javascript
// Example: includes/semantic_types.js
const semanticTypeMap = {
  email: ["email", "email_address", "emailAddress", "e_mail"],
  firstName: ["firstName", "first_name", "personfirstname", "fname"],
  lastName: ["lastName", "last_name", "personlastname", "lname"],
  // ... other semantic types
};

module.exports = { semanticTypeMap };
```

### Usage in Matching Functions

Matching functions in `includes/matching_functions.js` and `includes/rule_engine.js` use this map to:

1. **Identify Semantic Type**: Determine the semantic type of each column being compared.
2. **Apply Type-Aware Logic**: Conditionally apply matching logic based on semantic types. For example, columns of the same semantic type (e.g., two email fields) might use more aggressive matching techniques than columns of different semantic types.

### Extending Semantic Types

To extend the semantic type mapping:

1. **Open `includes/semantic_types.js`**.
2. **Add New Types**: Add new key-value pairs to the `semanticTypeMap` object.
  - The **key** should be a unique semantic type identifier (e.g., `city`, `phoneNumber`).
  - The **value** should be an array of strings representing common column names associated with that semantic type.
3. **Update Matching Functions**: Modify matching functions to utilize the new semantic types in their logic.

By leveraging semantic type mapping, the system can intelligently adapt its matching strategies based on the meaning of the data fields, leading to more accurate and contextually relevant match results.

## License

This project is proprietary and confidential to MarketAds. All rights reserved.