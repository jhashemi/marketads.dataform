# Jaccard Similarity Matching

This document explains the Jaccard similarity matching functionality within the MarketAds Dataform project.

## Overview

Jaccard similarity measures how similar two sets are by calculating the size of the intersection divided by the size of the union of the sets. In the context of text matching, this approach treats strings as sets of tokens (words, n-grams, or other units) and compares the overlap between these sets.

Jaccard similarity is particularly well-suited for:
- Comparing short to medium-length texts
- Matching when word order is not critical
- Finding partial matches between strings with some common elements

## Formula

The Jaccard similarity coefficient is calculated as:

```
J(A, B) = |A ∩ B| / |A ∪ B|
```

Where:
- A and B are sets
- |A ∩ B| is the size of the intersection (elements in both sets)
- |A ∪ B| is the size of the union (unique elements across both sets)

The result is a value between 0 and 1, where:
- 0 indicates no overlap (completely different)
- 1 indicates identical sets
- Values in between represent partial similarity

## Use Cases

- **Address Matching**: Comparing addresses where word order may vary
- **Product Description Matching**: Finding similar products based on description text
- **Tag/Keyword Matching**: Matching records based on shared tags or keywords
- **Document Classification**: Grouping similar documents based on content
- **Near-duplicate Detection**: Identifying similar content with different wording

## Getting Started

### Basic Usage

```javascript
const { getJaccardMatcher } = require('../../includes/matching/jaccard_similarity_matcher');

// Create a Jaccard matcher with default settings
const matcher = getJaccardMatcher();

// Compare two strings
const result = matcher.match(
  'The quick brown fox jumps over the lazy dog',
  'The quick brown fox leaps over a lazy dog'
);

console.log(`Similarity score: ${result.score}`); // e.g., 0.75
console.log(`Is a match: ${result.isMatch}`); // true/false based on default threshold
```

### Comparing Tokenized Text

```javascript
const { calculateJaccardSimilarity, tokenize } = require('../../includes/matching/jaccard_similarity_matcher');

// Tokenize text into words
const tokens1 = tokenize('The quick brown fox jumps over the lazy dog');
const tokens2 = tokenize('The quick brown fox leaps over a lazy dog');

// Calculate similarity directly
const similarity = calculateJaccardSimilarity(tokens1, tokens2);
console.log(`Jaccard similarity: ${similarity}`);

// Alternatively, calculate with automatic tokenization
const directSimilarity = calculateJaccardSimilarity(
  'The quick brown fox jumps over the lazy dog',
  'The quick brown fox leaps over a lazy dog',
  { tokenize: true }
);
console.log(`Direct similarity: ${directSimilarity}`);
```

### Advanced Tokenization

```javascript
const { getJaccardMatcher } = require('../../includes/matching/jaccard_similarity_matcher');

// Create a matcher with advanced tokenization options
const advancedMatcher = getJaccardMatcher({
  tokenizeOptions: {
    stem: true,               // Apply stemming to normalize word variations
    removeStopwords: true,    // Remove common stopwords
    ngramSize: 2,             // Use bigrams for matching
    wordGrams: true           // Use word n-grams (vs character n-grams)
  },
  defaultThreshold: 0.6       // Custom match threshold
});

// Compare with advanced tokenization
const result = advancedMatcher.match('running quickly', 'run fast');
console.log(`With stemming: ${result.score}`); // Higher score due to stemming
```

## Configuration Options

The Jaccard matcher can be configured with various options:

### Matcher Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `tokenizeOptions` | Object | `{}` | Options for text tokenization |
| `defaultThreshold` | Number | `0.5` | Default threshold for match classification |

### Tokenization Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `lowercase` | Boolean | `true` | Convert text to lowercase before tokenization |
| `stem` | Boolean | `false` | Apply stemming to normalize word variations |
| `removeStopwords` | Boolean | `false` | Remove common stopwords |
| `ngramSize` | Number | `1` | Size of n-grams (1 for words, 2+ for n-grams) |
| `wordGrams` | Boolean | `true` | Use word n-grams vs character n-grams |
| `tokenizer` | Function | `null` | Custom tokenizer function |

## SQL Generation

The Jaccard matcher can generate SQL for BigQuery to perform matching in the database:

```javascript
const { getJaccardMatcher } = require('../../includes/matching/jaccard_similarity_matcher');

const matcher = getJaccardMatcher();

// Generate SQL for Jaccard similarity
const sql = matcher.generateSql('customers.description', 'products.description');

// Use in a query
const query = `
SELECT
  customers.id,
  products.id,
  ${sql} AS similarity_score
FROM
  customers
CROSS JOIN
  products
WHERE
  ${sql} >= 0.7
ORDER BY
  similarity_score DESC
`;
```

### SQL Function Creation

You can also create a reusable SQL function:

```javascript
const { getJaccardMatcher } = require('../../includes/matching/jaccard_similarity_matcher');

const matcher = getJaccardMatcher({
  tokenizeOptions: {
    removeStopwords: true
  }
});

// Generate SQL to create a Jaccard similarity function
const createFunctionSql = matcher.createSqlFunction(
  'JACCARD_SIMILARITY', 
  { 
    tokenizationType: 'word',
    removeStopwords: true
  }
);

// This will create a function that can be used in SQL queries:
// SELECT JACCARD_SIMILARITY(field1, field2) AS similarity FROM ...
```

## How It Works

### Tokenization Process

1. **Text Preprocessing**: Optional lowercase conversion and whitespace normalization
2. **Tokenization**: Breaking text into tokens (words, n-grams)
3. **Stopword Removal**: Optional filtering of common words
4. **Stemming**: Optional reduction of words to their root form
5. **N-gram Generation**: Optional creation of word or character n-grams

### Similarity Calculation

1. Convert tokenized strings to sets (removing duplicates)
2. Calculate intersection (tokens in both sets)
3. Calculate union (unique tokens across both sets)
4. Divide intersection size by union size
5. Return the resulting ratio as the similarity score

## Performance Considerations

- Jaccard similarity computation has O(n) complexity where n is the total number of tokens
- Performance is affected by tokenization options:
  - Stemming adds processing overhead but can improve matching quality
  - Removing stopwords reduces token count and can speed up processing
  - N-grams increase token count, which can slow down processing
- For large text fields, consider restricting token count or field length

## SQL Implementation

The underlying SQL implementation uses BigQuery's array functions:

```sql
CASE
  WHEN field1 IS NULL OR field2 IS NULL THEN 0
  WHEN LENGTH(TRIM(COALESCE(field1, ''))) = 0 OR LENGTH(TRIM(COALESCE(field2, ''))) = 0 THEN 0
  ELSE (
    -- Calculate Jaccard similarity as |intersection| / |union|
    SAFE_DIVIDE(
      ARRAY_LENGTH(ARRAY_INTERSECT(SPLIT(field1, ' '), SPLIT(field2, ' '))),
      ARRAY_LENGTH(ARRAY_UNION(SPLIT(field1, ' '), SPLIT(field2, ' ')))
    )
  )
END
```

For advanced tokenization, this gets more complex with preprocessing steps.

## Integration with Matching Engine

To use Jaccard similarity in the overall matching engine:

```javascript
const { createMatchingSystem } = require('../../includes/matching');
const { getJaccardMatcher } = require('../../includes/matching/jaccard_similarity_matcher');

// Create custom matcher
const jaccardMatcher = getJaccardMatcher({
  tokenizeOptions: {
    stem: true,
    removeStopwords: true
  },
  defaultThreshold: 0.6
});

// Create matching system with Jaccard similarity
const matchingSystem = createMatchingSystem({
  matchers: {
    jaccard: jaccardMatcher
  },
  matching: {
    // Field-specific matcher configurations
    fields: {
      description: {
        matcher: 'jaccard',
        weight: 0.7
      },
      tags: {
        matcher: 'jaccard',
        weight: 0.5
      }
    }
  }
});
```

## Common Use Cases

### Address Matching

When comparing addresses where word order or exact wording may vary:

```javascript
const matcher = getJaccardMatcher({
  tokenizeOptions: { 
    removeStopwords: true 
  }
});

const result = matcher.match(
  '123 Main Street, Apartment 4B, New York NY',
  '123 Main St Apt 4B New York NY'
);

// Addresses with same key components will match despite differences
```

### Product Description Matching

When finding similar products based on description text:

```javascript
const descriptionMatcher = getJaccardMatcher({
  tokenizeOptions: {
    stem: true,
    removeStopwords: true
  },
  defaultThreshold: 0.4 // Lower threshold for descriptions
});

const result = descriptionMatcher.match(
  'Wireless Bluetooth headphones with noise cancellation and long battery life',
  'Bluetooth wireless headset featuring noise cancelling technology and extended battery'
);

// Will match due to shared key terms despite different wording
```

### Tag Matching

When matching records based on tags:

```javascript
// Match records with similar tags
const tagMatcher = getJaccardMatcher();

const result = tagMatcher.match(
  'javascript,nodejs,react,frontend',
  'nodejs,javascript,express,backend'
);

// Will identify partial tag overlap
```

## Customization Examples

### Custom Tokenizer

```javascript
const customMatcher = getJaccardMatcher({
  tokenizeOptions: {
    tokenizer: text => text.split(':') // Custom tokenization by colon
  }
});

const result = customMatcher.match(
  'category:electronics:phone:smartphone',
  'category:electronics:laptop:notebook'
);
```

### N-gram Matching

```javascript
// Character n-gram matching for fuzzy text comparison
const ngramMatcher = getJaccardMatcher({
  tokenizeOptions: {
    ngramSize: 3,
    wordGrams: false // Use character n-grams
  }
});

// Handles typos and character variations well
const result = ngramMatcher.match('address', 'adress');
```

## API Reference

### Functions

| Function | Description |
|----------|-------------|
| `tokenize(text, options)` | Tokenizes text into an array of tokens |
| `calculateJaccardSimilarity(set1, set2, options)` | Calculates Jaccard similarity between two sets or strings |
| `generateJaccardSimilaritySql(field1, field2, options)` | Generates SQL for Jaccard similarity |
| `createJaccardSimilaritySqlFunction(functionName, options)` | Creates a SQL function for Jaccard similarity |
| `getJaccardMatcher(config)` | Creates a Jaccard similarity matcher |

### Matcher Methods

| Method | Description |
|--------|-------------|
| `match(str1, str2, options)` | Matches two strings using Jaccard similarity |
| `generateSql(field1, field2, options)` | Generates SQL for Jaccard similarity |
| `createSqlFunction(functionName, options)` | Creates a SQL function for Jaccard similarity |
| `getConfig()` | Returns the current configuration |

## References

- [Jaccard Index - Wikipedia](https://en.wikipedia.org/wiki/Jaccard_index)
- [BigQuery Array Functions](https://cloud.google.com/bigquery/docs/reference/standard-sql/array_functions)
- [Natural Language Processing in JavaScript](https://www.npmjs.com/package/natural)
- [Token-Based Text Similarity](https://nlp.stanford.edu/IR-book/html/htmledition/tokenization-1.html)