# Similarity Matching Strategies

This document provides a comprehensive overview of the similarity matching strategies available in the MarketAds Matching System.

## Table of Contents

- [Overview](#overview)
- [Available Strategies](#available-strategies)
  - [Exact Match](#exact-match)
  - [Levenshtein Distance](#levenshtein-distance)
  - [Jaro-Winkler](#jaro-winkler)
  - [Phonetic Matching](#phonetic-matching)
  - [Token Similarity](#token-similarity)
  - [Jaccard Similarity](#jaccard-similarity)
  - [Cosine Similarity](#cosine-similarity)
  - [Numeric Similarity](#numeric-similarity)
  - [Date Similarity](#date-similarity)
- [Field Type Matching](#field-type-matching)
- [Performance Considerations](#performance-considerations)
- [Usage Examples](#usage-examples)

## Overview

The similarity matching module provides SQL-based implementations of various similarity algorithms optimized for BigQuery. These strategies are used to compare fields between records and determine their similarity on a scale from 0 to 1, where:

- **1.0**: Perfect match
- **0.0**: No similarity
- **NULL**: Unable to compare (e.g., NULL input values)

## Available Strategies

### Exact Match

A binary similarity measure that returns 1.0 for exact matches and 0.0 otherwise.

**Best for:**
- IDs, codes, and other fields where approximate matching is not appropriate
- Boolean values
- Normalized categorical fields (e.g., state codes)

**Example SQL:**
```sql
CASE
  WHEN field1 IS NULL OR field2 IS NULL THEN 0.0
  WHEN field1 = field2 THEN 1.0
  ELSE 0.0
END
```

### Levenshtein Distance

Calculates similarity based on the number of single-character edits (insertions, deletions, or substitutions) required to change one string into another.

**Best for:**
- Short to medium-length text fields
- Fields with potential typographical errors
- City names, product names

**Example SQL:**
```sql
CASE
  WHEN field1 IS NULL OR field2 IS NULL THEN 0.0
  WHEN field1 = field2 THEN 1.0
  ELSE 1.0 - (CAST(LEVENSHTEIN(field1, field2) AS FLOAT64) / 
              GREATEST(LENGTH(field1), LENGTH(field2)))
END
```

### Jaro-Winkler

A string similarity measure that gives higher scores to strings that match from the beginning.

**Best for:**
- Names (first name, last name)
- Fields where matching prefixes are more important

**Example SQL:**
```sql
-- Using a BigQuery approximation since BigQuery doesn't have a native Jaro-Winkler function
CASE
  WHEN field1 IS NULL OR field2 IS NULL THEN 0.0
  WHEN field1 = field2 THEN 1.0
  ELSE (
    -- Base Levenshtein ratio with prefix boosting
    (1.0 - (CAST(LEVENSHTEIN(field1, field2) AS FLOAT64) / 
            GREATEST(LENGTH(field1), LENGTH(field2)))) *
    -- Boost if first characters match
    CASE
      WHEN LEFT(field1, 1) = LEFT(field2, 1) THEN 1.25
      ELSE 1.0
    END
  )
END
```

### Phonetic Matching

Compares strings based on their phonetic encoding.

**Best for:**
- Names with potential spelling variations
- Words that sound the same but are spelled differently

**Example SQL:**
```sql
CASE
  WHEN field1 IS NULL OR field2 IS NULL THEN 0.0
  WHEN field1 = field2 THEN 1.0
  WHEN SOUNDEX(field1) = SOUNDEX(field2) THEN 0.9
  ELSE 0.0
END
```

### Token Similarity

Calculates similarity based on shared tokens between two strings.

**Best for:**
- Multi-word fields like addresses
- Fields where word order may vary
- Long text fields with shared vocabulary

**Example SQL:**
```sql
-- Token overlap (non-order sensitive)
WITH words1 AS (
  SELECT UPPER(word) AS word
  FROM UNNEST(SPLIT(field1, ' ')) AS word
  WHERE TRIM(word) != ''
),
words2 AS (
  SELECT UPPER(word) AS word
  FROM UNNEST(SPLIT(field2, ' ')) AS word
  WHERE TRIM(word) != ''
)
SELECT
  COUNT(DISTINCT CASE WHEN w1.word = w2.word THEN w1.word END) /
  NULLIF(COUNT(DISTINCT COALESCE(w1.word, w2.word)), 0)
FROM words1 w1
FULL OUTER JOIN words2 w2 ON w1.word = w2.word
```

### Jaccard Similarity

Calculates similarity as the size of the intersection divided by the size of the union of two sets.

**Best for:**
- Array fields containing sets of items
- Comparing lists of features, tags, or attributes
- Address components, product categories

**Example SQL:**
```sql
CASE
  WHEN field1 IS NULL OR field2 IS NULL THEN NULL
  ELSE
    (
      ARRAY_LENGTH(ARRAY(SELECT * FROM UNNEST(field1) INTERSECT DISTINCT SELECT * FROM UNNEST(field2))) /
      ARRAY_LENGTH(ARRAY(SELECT * FROM UNNEST(field1) UNION DISTINCT SELECT * FROM UNNEST(field2)))
    )
END
```

### Cosine Similarity

Measures the cosine of the angle between two vectors, determining their similarity regardless of magnitude.

**Best for:**
- Vector embeddings (e.g., word embeddings, document embeddings)
- Numeric feature vectors
- Comparing semantic meaning of content

**Example SQL:**
```sql
CASE
  WHEN vector1 IS NULL OR vector2 IS NULL THEN NULL
  WHEN ARRAY_LENGTH(vector1) = 0 OR ARRAY_LENGTH(vector2) = 0 THEN NULL
  ELSE (
    -- Calculate dot product
    (
      SELECT SUM(a * b)
      FROM UNNEST(vector1) a WITH OFFSET pos1
      JOIN UNNEST(vector2) b WITH OFFSET pos2
      ON pos1 = pos2
    ) /
    (
      -- Calculate magnitudes and multiply them
      SQRT((SELECT SUM(element * element) FROM UNNEST(vector1) element)) *
      SQRT((SELECT SUM(element * element) FROM UNNEST(vector2) element))
    )
  )
END
```

### Numeric Similarity

Compares numeric values based on their relative difference.

**Best for:**
- Quantitative measures (age, income, price)
- Scores, ratings
- Any numeric field with meaningful distance

**Example SQL:**
```sql
CASE
  WHEN field1 IS NULL OR field2 IS NULL THEN 0.0
  WHEN field1 = field2 THEN 1.0
  ELSE GREATEST(0.0, 1.0 - ABS(field1 - field2) / max_difference)
END
```

### Date Similarity

Compares dates based on the difference in days.

**Best for:**
- Date of birth
- Transaction dates
- Event dates

**Example SQL:**
```sql
CASE
  WHEN field1 IS NULL OR field2 IS NULL THEN 0.0
  WHEN field1 = field2 THEN 1.0
  ELSE GREATEST(0.0, 1.0 - 
               (ABS(DATE_DIFF(SAFE_CAST(field1 AS DATE), 
                              SAFE_CAST(field2 AS DATE), DAY)) / 
                max_days_difference))
END
```

## Field Type Matching

The system automatically selects the most appropriate similarity strategy based on the semantic field type:

| Semantic Type | Default Strategy | Notes |
|---------------|-----------------|-------|
| first_name, last_name, name | Jaro-Winkler | Optimized for name variations |
| email | Exact Match | Emails should match exactly |
| phone | Exact Match | Standardized phone numbers should match exactly |
| address | Token Similarity | Addresses often have word variations |
| address_components | Jaccard Similarity | Components treated as sets |
| vector, embedding, array | Cosine Similarity | For comparing vector embeddings |
| city | Levenshtein | City names may have spelling variations |
| state, country, zip | Exact Match | Normalized location codes |
| date, date_of_birth | Date Similarity | Compare with date-specific logic |
| numeric, age | Numeric Similarity | Compare with numeric-specific logic |

## Performance Considerations

1. **Query Optimization**: The SQL expressions are designed to be efficient in BigQuery, but consider these factors:
   - Exact matching is faster than fuzzy matching
   - Token-based methods are more expensive for long strings
   - Avoid comparing extremely large arrays (>1000 elements) with cosine similarity

2. **Preprocessing**: 
   - Standardizing fields before comparison improves both accuracy and performance
   - Consider creating dedicated columns for standardized values

3. **Vectorization**:
   - For large-scale matching, vector operations are more efficient than row-by-row comparisons
   - Use array functions when comparing lists of items

## Usage Examples

### Comparing Names

```javascript
const { jaroWinklerSimilarity } = require('./includes/matching/similarity');

const sql = jaroWinklerSimilarity('person1.first_name', 'person2.first_name', {
  standardizeFirst: true,
  fieldType: 'first_name'
});

// Now you can use this SQL in your BigQuery queries
```

### Comparing Vectors/Embeddings

```javascript
const { cosineSimilarity } = require('./includes/matching/similarity');

const sql = cosineSimilarity('product1.embedding', 'product2.embedding', {
  ignoreNulls: true // Skip NULL values in vectors
});

// Use this SQL in your BigQuery queries for comparing embeddings
```

### Field-Type Based Comparison

```javascript
const { calculateFieldSimilarity } = require('./includes/matching/similarity');

// The function automatically selects the right strategy based on field type
const sql = calculateFieldSimilarity('customer1.email', 'customer2.email', 'email');
```

### Creating a Custom Strategy

To implement a custom strategy, follow this pattern:

```javascript
function customSimilarity(field1, field2, options = {}) {
  // Extract options with defaults
  const { 
    standardizeFirst = true,
    fieldType = 'string',
    // Custom options
    customThreshold = 0.5
  } = options;
  
  // Generate standardized field references if needed
  let f1 = field1;
  let f2 = field2;
  
  if (standardizeFirst) {
    f1 = standardization.standardizeField(field1, fieldType);
    f2 = standardization.standardizeField(field2, fieldType);
  }
  
  // Return the SQL expression for your custom similarity
  return `
    CASE
      WHEN ${f1} IS NULL OR ${f2} IS NULL THEN 0.0
      WHEN ${f1} = ${f2} THEN 1.0
      ELSE /* Your custom logic here */
    END
  `;
}

// Export your function
module.exports = {
  // ...other exports
  customSimilarity
};
```

Then register it in the `calculateFieldSimilarity` function for appropriate field types.