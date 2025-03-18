# Cosine Similarity Matching

This document explains the Cosine similarity matching functionality within the MarketAds Dataform project.

## Overview

Cosine similarity measures the similarity between two vectors by calculating the cosine of the angle between them. In the context of text matching, this approach represents documents as vectors in a multi-dimensional space, where each dimension corresponds to a term in the document.

Cosine similarity is particularly well-suited for:
- Comparing documents of different lengths
- Comparing texts where word frequency matters more than order
- Information retrieval and document classification
- Content-based recommendation systems

## Formula

The Cosine similarity between two vectors A and B is calculated as:

```
similarity = cos(θ) = (A·B)/(||A||·||B||)
```

Where:
- A·B is the dot product of vectors A and B
- ||A|| and ||B|| are the Euclidean norms (magnitudes) of vectors A and B

The result is a value between -1 and 1, though for text document vectors with non-negative weights, the result is between 0 and 1, where:
- 1 indicates identical vectors
- 0 indicates orthogonal (completely different) vectors
- Values in between represent degrees of similarity

## Use Cases

- **Document Classification**: Comparing documents to determine which category they belong to
- **Search Relevance**: Ranking search results based on similarity to a query
- **Content Recommendation**: Suggesting similar products or content
- **Duplicate Detection**: Identifying near-duplicate content
- **Semantic Matching**: Finding conceptually similar texts regardless of exact wording

## Getting Started

### Basic Usage

```javascript
const { getCosineMatcher } = require('../../includes/matching/cosine_similarity_matcher');

// Create a Cosine matcher with default settings
const matcher = getCosineMatcher();

// Compare two strings
const result = matcher.match(
  'The quick brown fox jumps over the lazy dog',
  'A rapid brown fox leaps over a lazy canine'
);

console.log(`Similarity score: ${result.score}`); // e.g., 0.65
console.log(`Is a match: ${result.isMatch}`); // true/false based on default threshold
```

### Working with Feature Vectors

```javascript
const { 
  calculateCosineSimilarity, 
  vectorizeText 
} = require('../../includes/matching/cosine_similarity_matcher');

// Vectorize text into feature vectors
const vector1 = vectorizeText('Machine learning algorithms are powerful tools');
const vector2 = vectorizeText('AI and machine learning transform businesses');

// Calculate similarity directly between vectors
const similarity = calculateCosineSimilarity(vector1, vector2);
console.log(`Cosine similarity: ${similarity}`);
```

### Advanced Vectorization

```javascript
const { getCosineMatcher } = require('../../includes/matching/cosine_similarity_matcher');

// Create a matcher with advanced vectorization options
const advancedMatcher = getCosineMatcher({
  vectorizeOptions: {
    stem: true,               // Apply stemming to normalize word variations
    removeStopwords: true,    // Remove common stopwords
    ngramSize: 2,             // Use bigrams for matching
    wordGrams: true           // Use word n-grams (vs character n-grams)
  },
  defaultThreshold: 0.6       // Custom match threshold
});

// Compare with advanced vectorization
const result = advancedMatcher.match(
  'Machine learning algorithms are transforming industries',
  'Industry transformation through ML algorithms'
);

console.log(`With advanced vectorization: ${result.score}`);
```

## Configuration Options

The Cosine matcher can be configured with various options:

### Matcher Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `vectorizeOptions` | Object | `{}` | Options for text vectorization |
| `defaultThreshold` | Number | `0.5` | Default threshold for match classification |

### Vectorization Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `lowercase` | Boolean | `true` | Convert text to lowercase before tokenization |
| `stem` | Boolean | `false` | Apply stemming to normalize word variations |
| `removeStopwords` | Boolean | `false` | Remove common stopwords |
| `ngramSize` | Number | `1` | Size of n-grams (1 for words, 2+ for n-grams) |
| `wordGrams` | Boolean | `true` | Use word n-grams vs character n-grams |
| `useTfIdf` | Boolean | `false` | Use TF-IDF weighting for terms |

## SQL Generation

The Cosine matcher can generate SQL for BigQuery to perform matching in the database:

```javascript
const { getCosineMatcher } = require('../../includes/matching/cosine_similarity_matcher');

const matcher = getCosineMatcher({
  vectorizeOptions: {
    removeStopwords: true
  }
});

// Generate SQL for Cosine similarity
const sql = matcher.generateSql('articles.content', 'users.interests');

// Use in a query
const query = `
SELECT
  users.id,
  articles.id,
  ${sql} AS relevance_score
FROM
  users
CROSS JOIN
  articles
WHERE
  ${sql} >= 0.7
ORDER BY
  relevance_score DESC
LIMIT 10
`;
```

### SQL Function Creation

You can also create a reusable SQL function:

```javascript
const { getCosineMatcher } = require('../../includes/matching/cosine_similarity_matcher');

const matcher = getCosineMatcher({
  vectorizeOptions: {
    removeStopwords: true,
    useTfIdf: true
  }
});

// Generate SQL to create a cosine similarity function with TF-IDF weighting
const createFunctionSql = matcher.createSqlFunction(
  'COSINE_SIMILARITY_TFIDF', 
  { 
    useTfIdf: true,
    removeStopwords: true
  }
);

// This will create a function that can be used in SQL queries:
// SELECT COSINE_SIMILARITY_TFIDF(field1, field2) AS similarity FROM ...
```

## How It Works

### Vectorization Process

1. **Text Preprocessing**: Lowercase conversion and normalization
2. **Tokenization**: Breaking text into tokens (words or n-grams)
3. **Filtering**: Optional removal of stopwords and other noise
4. **Normalization**: Optional stemming to reduce words to their roots
5. **Vector Creation**: Converting tokenized text to a term frequency vector

### TF-IDF Weighting (Optional)

TF-IDF (Term Frequency-Inverse Document Frequency) weighting improves matching by:

1. Giving higher weights to terms that appear frequently in a document (TF)
2. Reducing weights for terms that appear in many documents (IDF)
3. Producing a vector where distinctive terms have more influence

### Similarity Calculation

1. Calculate the dot product of the two vectors (sum of products of corresponding values)
2. Calculate the magnitude (Euclidean norm) of each vector
3. Divide the dot product by the product of the magnitudes
4. The result is the cosine similarity (between 0 and 1 for text vectors)

## Performance Considerations

- **Computational Complexity**: O(N+M) where N and M are the number of unique terms in each document
- **Memory Usage**: Scales with vocabulary size; for large texts, consider:
  - Using stopword removal to reduce vector dimensions
  - Applying dimension reduction techniques
  - Limiting vector size by selecting top K terms
- **Optimization Techniques**:
  - Pre-compute and cache vectors for frequently used documents
  - Implement sparse vector representations for large documents
  - When comparing one document to many, pre-calculate its magnitude

## SQL Implementation

The underlying SQL implementation for standard cosine similarity:

```sql
WITH tokens1 AS (
  SELECT token, COUNT(*) as weight
  FROM UNNEST(SPLIT(field1, ' ')) AS token
  GROUP BY token
),
tokens2 AS (
  SELECT token, COUNT(*) as weight
  FROM UNNEST(SPLIT(field2, ' ')) AS token
  GROUP BY token
),
dot_product AS (
  SELECT SUM(t1.weight * t2.weight) as dot
  FROM tokens1 t1
  JOIN tokens2 t2 USING (token)
),
magnitudes AS (
  SELECT SQRT(SUM(POW(weight, 2))) as mag1
  FROM tokens1
),
magnitudes2 AS (
  SELECT SQRT(SUM(POW(weight, 2))) as mag2
  FROM tokens2
)

SELECT
  SAFE_DIVIDE(
    (SELECT dot FROM dot_product),
    (SELECT mag1 FROM magnitudes) * (SELECT mag2 FROM magnitudes2)
  )
```

For TF-IDF weighting, the SQL is more complex with additional steps to calculate the inverse document frequency component.

## Integration with Matching Engine

To use Cosine similarity in the overall matching engine:

```javascript
const { createMatchingSystem } = require('../../includes/matching');
const { getCosineMatcher } = require('../../includes/matching/cosine_similarity_matcher');

// Create custom matcher
const cosineMatcher = getCosineMatcher({
  vectorizeOptions: {
    stem: true,
    removeStopwords: true,
    useTfIdf: true
  },
  defaultThreshold: 0.6
});

// Create matching system with Cosine similarity
const matchingSystem = createMatchingSystem({
  matchers: {
    cosine: cosineMatcher
  },
  matching: {
    // Field-specific matcher configurations
    fields: {
      description: {
        matcher: 'cosine',
        weight: 0.7
      },
      biography: {
        matcher: 'cosine',
        weight: 0.5
      }
    }
  }
});
```

## Common Use Cases

### Document Matching

When comparing larger blocks of text:

```javascript
const documentMatcher = getCosineMatcher({
  vectorizeOptions: { 
    removeStopwords: true,
    useTfIdf: true
  },
  defaultThreshold: 0.4 // Lower threshold for documents
});

const result = documentMatcher.match(
  'Artificial intelligence and machine learning are transforming how businesses operate, enabling automation and providing deep insights through data analysis.',
  'AI and ML technologies help companies automate processes and extract value from their data through advanced analytics.'
);

// Will match due to semantic similarity despite different wording
```

### Query Matching

For matching search queries to documents:

```javascript
const queryMatcher = getCosineMatcher({
  vectorizeOptions: {
    stem: true
  }
});

const query = "machine learning applications";
const documents = [
  "Applications of AI in modern business",
  "Machine Learning: Practical Business Applications",
  "Neural Networks and Deep Learning Explained"
];

// Find best matching document
const matches = documents.map(doc => ({
  document: doc,
  result: queryMatcher.match(query, doc)
}));

const bestMatch = matches.sort((a, b) => b.result.score - a.result.score)[0];
console.log(`Best match: ${bestMatch.document} (score: ${bestMatch.result.score})`);
```

### Content Classification

For classifying content into categories:

```javascript
const classifier = getCosineMatcher({
  vectorizeOptions: { 
    removeStopwords: true 
  }
});

const categories = {
  technology: "computers software hardware internet programming coding development",
  finance: "banking investment stocks market trading financial economy",
  health: "medical wellness fitness diet nutrition exercise healthcare"
};

function classifyContent(content) {
  const results = {};
  
  for (const [category, keywords] of Object.entries(categories)) {
    results[category] = classifier.match(content, keywords).score;
  }
  
  // Find category with highest match score
  return Object.entries(results)
    .sort((a, b) => b[1] - a[1])[0][0];
}

const content = "New software development techniques for web applications";
console.log(`Category: ${classifyContent(content)}`); // "technology"
```

## Customization Examples

### Custom Vectorization

```javascript
const { createFeatureVector, calculateCosineSimilarity } = require('../../includes/matching/cosine_similarity_matcher');

// Create custom feature vectors
const titleVector = createFeatureVector(['title'], [3]); // Weight title higher
const keywordsVector = createFeatureVector(['machine', 'learning', 'ai'], [2, 2, 2]);
const contentVector = createFeatureVector(['text', 'content', 'data'], [1, 1, 1]);

// Combine vectors
const documentVector = {
  ...titleVector,
  ...keywordsVector,
  ...contentVector
};

// Calculate similarity with custom vectors
const similarity = calculateCosineSimilarity(documentVector, queryVector);
```

### TF-IDF Implementation

```javascript
const { getCosineMatcher } = require('../../includes/matching/cosine_similarity_matcher');

// Create matcher with TF-IDF weighting
const tfidfMatcher = getCosineMatcher({
  vectorizeOptions: {
    useTfIdf: true,
    removeStopwords: true
  }
});

// Generate SQL with TF-IDF weighting
const tfidfSql = tfidfMatcher.generateSql('documents.text', 'queries.text');
```

## API Reference

### Functions

| Function | Description |
|----------|-------------|
| `createFeatureVector(features, weights)` | Creates a feature vector from an array of features and optional weights |
| `tokenize(text, options)` | Tokenizes text into an array of tokens |
| `vectorizeText(text, options)` | Converts text into a feature vector |
| `calculateCosineSimilarity(vector1, vector2)` | Calculates cosine similarity between two vectors |
| `calculateTextCosineSimilarity(text1, text2, options)` | Calculates cosine similarity between two texts |
| `generateCosineSimilaritySql(field1, field2, options)` | Generates SQL for cosine similarity |
| `createCosineSimilaritySqlFunction(functionName, options)` | Creates a SQL function for cosine similarity |
| `getCosineMatcher(config)` | Creates a cosine similarity matcher |

### Matcher Methods

| Method | Description |
|--------|-------------|
| `match(str1, str2, options)` | Matches two strings using cosine similarity |
| `generateSql(field1, field2, options)` | Generates SQL for cosine similarity |
| `createSqlFunction(functionName, options)` | Creates a SQL function for cosine similarity |
| `getConfig()` | Returns the current configuration |

## References

- [Cosine Similarity - Wikipedia](https://en.wikipedia.org/wiki/Cosine_similarity)
- [Vector Space Model - Stanford NLP](https://nlp.stanford.edu/IR-book/html/htmledition/the-vector-space-model-1.html)
- [TF-IDF Weighting - Stanford NLP](https://nlp.stanford.edu/IR-book/html/htmledition/tf-idf-weighting-1.html)
- [Efficient Cosine Similarity in BigQuery](https://cloud.google.com/bigquery/docs/reference/standard-sql/array_functions)