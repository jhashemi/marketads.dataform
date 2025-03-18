# Matching Strategies

This directory contains documentation for the various matching strategies implemented in the MarketAds Dataform project.

## Overview

The matching system provides multiple similarity algorithms and strategies to handle different types of data and use cases. Each strategy is specialized for specific data types and comparison needs.

## Available Matching Strategies

| Strategy | Best For | Description | Documentation |
|----------|----------|-------------|--------------|
| **Levenshtein** | Names, Addresses | Edit distance-based string similarity | [String Similarity](./STRING_SIMILARITY.md) |
| **Jaccard** | Categories, Tags | Set-based similarity for arrays of tokens | [Jaccard Similarity](./JACCARD_SIMILARITY.md) |
| **Phonetic** | Names | Sound-based matching (Soundex, Metaphone) | [Phonetic Matching](./PHONETIC_MATCHING.md) |
| **Geospatial** | Locations | Distance and area-based proximity | [Geospatial Matching](./GEOSPATIAL_MATCHING.md) |
| **Transitive** | Identity Resolution | Find matches through indirect relationships | [Transitive Matching](./TRANSITIVE_MATCHING.md) |

## Choosing the Right Strategy

When selecting a matching strategy, consider:

1. **Data Type**: What kind of data are you comparing? (strings, arrays, locations, etc.)
2. **Match Purpose**: What constitutes a match for your use case?
3. **Performance**: How many records will you be comparing?
4. **Precision vs. Recall**: Do you need to find all possible matches or only the most certain ones?

### Decision Guide

- **Text Fields**:
  - For names: Use Levenshtein or phonetic matching
  - For addresses: Use tokenized Levenshtein similarity
  - For long text: Use Jaccard similarity with tokenization

- **Structured Data**:
  - For arrays/sets: Use Jaccard similarity
  - For hierarchical categories: Use weighted Jaccard similarity
  - For numeric vectors: Use cosine similarity

- **Location Data**:
  - For coordinates: Use geospatial matching with appropriate distance metrics
  - For regions/areas: Use geospatial intersection or containment

## Implementation

All matching strategies follow a consistent interface that includes:

- JavaScript implementation for client-side processing
- SQL generation for BigQuery
- Configuration options for customization
- Built-in testing and validation

## Integration with Engine

Matchers can be used directly or through the matching engine, which provides:

1. Automatic strategy selection based on available fields
2. Composite similarity calculation across multiple strategies
3. Configuration-based tuning and weighting
4. Batch processing capabilities

Example:

```javascript
const { createMatchingSystem } = require('../../includes/matching');

// Create a matching system with default config
const matchingSystem = createMatchingSystem();

// Evaluate a match between two records
const matchResult = await matchingSystem.evaluateMatch(
  sourceRecord, 
  targetRecord, 
  {
    sourceFieldMappings: [...],
    targetFieldMappings: [...],
    priorityFields: ['email', 'phone']
  }
);

console.log(`Match confidence: ${matchResult.confidence}`);
console.log(`Match tier: ${matchResult.tier}`);
```

## Extending with New Strategies

To add a new matching strategy:

1. Create a new implementation file in `includes/matching/`
2. Implement the standard matcher interface
3. Register the strategy in `includes/matching/index.js`
4. Add unit and integration tests
5. Create documentation in `docs/matching/`

See the [Matcher Implementation Guide](./IMPLEMENTATION_GUIDE.md) for details.

## Performance Considerations

- Use blocking strategies to reduce comparison space
- Consider the tradeoffs between precision and computation cost
- For large datasets, prefer SQL-based implementations
- Use appropriate spatial indexing for geospatial comparisons

## Further Reading

- [Validation Framework](../VALIDATION_FRAMEWORK.md)
- [Integration Testing](../INTEGRATION_TESTING.md)
- [SQL Generation Standards](../SQL_GENERATION_STANDARDS.md)