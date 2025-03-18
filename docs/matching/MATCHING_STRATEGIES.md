# Matching Strategies

This document provides an overview of the matching strategies available in the Marketing Ads Data Matching System. These strategies are designed to handle different types of data fields and offer varying levels of fuzzy matching to accommodate real-world data discrepancies.

## Table of Contents

- [Overview](#overview)
- [Available Strategies](#available-strategies)
  - [Fuzzy Name Matching](#fuzzy-name-matching)
  - [Jaccard Similarity Matching](#jaccard-similarity-matching)
  - [Transitive Matching](#transitive-matching)
- [Choosing a Strategy](#choosing-a-strategy)
- [Configuration Options](#configuration-options)
- [Usage Examples](#usage-examples)

## Overview

The MarketAds Data Matching System employs various matching strategies to handle different types of data with appropriate algorithms. Each strategy is specialized for specific field types and use cases, allowing for flexible and accurate matching across diverse datasets.

Key features of the matching framework:

- **Multiple algorithm support**: Choose from a variety of algorithms based on your data characteristics
- **Configurable thresholds**: Customize confidence thresholds for different match quality tiers
- **Component-based scoring**: Individual field scores contribute to an overall match confidence
- **Extensible architecture**: Easily implement and integrate new matching strategies

## Available Strategies

### Fuzzy Name Matching

The `FuzzyNameMatcher` strategy is specialized for handling person names with all their variations, nicknames, and common formatting differences.

**Best for**: First names, last names, full names

**Features**:
- Nickname recognition (e.g., "Robert" ↔ "Bob", "William" ↔ "Bill")
- Name prefix/suffix handling (e.g., "Dr.", "Jr.")
- Case-insensitive matching
- Support for middle names and initials
- Multiple name parsing formats

**Algorithm details**:
- Uses a combination of Jaro-Winkler and Levenshtein distance algorithms
- Incorporates nickname dictionary lookups
- Provides specialized handling for first, middle, and last name components
- Weighted component scoring based on name part importance

**Example use case**: Matching customer records where names might be entered with nicknames or different formats ("Robert J. Smith" vs "Bob Smith").

### Jaccard Similarity Matching

The `JaccardSimilarityMatcher` strategy uses set-based comparison techniques to match fields that contain multiple values, such as tags, categories, or lists of interests.

**Best for**: Tags, categories, keywords, interests, skills, product attributes

**Features**:
- Set-based comparison (order-insensitive)
- Support for multi-value fields
- Case and whitespace normalization options
- Field-weighted scoring
- Multi-field comparison with weighted aggregation

**Algorithm details**:
- Uses Jaccard similarity index: |A ∩ B| / |A ∪ B|
- Handles empty sets and null values gracefully
- Configurable preprocessing of values (case normalization, trimming)
- Supports multiple fields with different weights

**Example use case**: Matching user profiles based on their interests, skills, or preferences represented as sets of values.

### Transitive Matching

The `TransitiveMatcher` implements transitive closure to find indirect matches that wouldn't be discovered through direct comparison alone.

**Best for**: Building complete customer graphs, entity resolution across multiple datasets

**Features**:
- Finds indirect relationships (if A matches B and B matches C, then A relates to C)
- Configurable maximum relationship depth
- Support for confidence decay across transitive relationships
- Cluster generation for related entities
- Detailed metrics and analysis of resulting clusters

**Algorithm details**:
- Implements graph-based transitive closure algorithms
- Configurable confidence thresholds for relationship inclusion
- Path tracking to understand relationship chains
- Cycle detection to prevent infinite loops
- Cluster analysis with density, confidence, and edge metrics

**Example use case**: Building a complete view of customer relationships across multiple data sources where some connections might only be discoverable through intermediary records.

## Choosing a Strategy

When selecting a matching strategy, consider these factors:

1. **Field type**: Different fields benefit from different algorithms
   - Text fields: Levenshtein, Jaro-Winkler (for names)
   - Multi-value fields: Jaccard similarity
   - Date fields: Component-based date comparison
   - Numeric fields: Range-based similarity

2. **Data quality**: Lower quality data may require more fuzzy matching
   - High-quality data: Exact or near-exact matching
   - Medium-quality data: Fuzzy matching with higher thresholds
   - Low-quality data: Fuzzy matching with lower thresholds, weighted fields

3. **Required precision**: Balance between false positives and false negatives
   - High precision needs: Stricter thresholds, stronger signal fields
   - High recall needs: Lower thresholds, more permissive matching

4. **Field importance**: Weight fields based on their discriminatory power
   - High entropy fields (email, phone): Higher weights
   - Low entropy fields (gender, state): Lower weights

## Configuration Options

Each matching strategy accepts configuration options to customize its behavior:

### FuzzyNameMatcher Options

```javascript
const nameMatcher = new FuzzyNameMatcher({
  // Minimum similarity score required to consider two names as matching
  matchThreshold: 0.7,
  
  // Weights for different name components
  componentWeights: {
    first: 0.4,
    middle: 0.2,
    last: 0.4
  },
  
  // Confidence thresholds for different tiers
  confidenceThresholds: {
    HIGH: 0.9,
    MEDIUM: 0.7,
    LOW: 0.5,
    MINIMUM: 0.3
  }
});
```

### JaccardSimilarityMatcher Options

```javascript
const jaccardMatcher = new JaccardSimilarityMatcher({
  // Minimum similarity score required to consider sets matching
  matchThreshold: 0.5,
  
  // Confidence thresholds for different tiers
  confidenceThresholds: {
    HIGH: 0.9,
    MEDIUM: 0.7,
    LOW: 0.5,
    MINIMUM: 0.3
  }
});
```

### TransitiveMatcher Options

```javascript
const transitiveMatcher = new TransitiveMatcher({
  // Table containing initial match results
  matchResultsTable: 'initial_matches',
  
  // Minimum confidence threshold for transitive closure
  confidenceThreshold: 0.7,
  
  // Output table for transitive matches
  outputTable: 'transitive_matches',
  
  // Maximum depth for transitive closure
  maxDepth: 3,
  
  // Whether to include direct matches in results
  includeDirectMatches: true
});
```

## Usage Examples

### Fuzzy Name Matching

```javascript
const { FuzzyNameMatcher } = require('../includes/matching/fuzzy_name_matcher');

// Create matcher instance
const nameMatcher = new FuzzyNameMatcher();

// Compare first names
const firstNameSimilarity = nameMatcher.compareFirstNames('Robert', 'Bob');
console.log(`Similarity: ${firstNameSimilarity}`); // Output: Similarity: 0.9

// Compare full names
const fullNameSimilarity = nameMatcher.compareFullNames('John A. Smith', 'John Smith');
console.log(`Similarity: ${fullNameSimilarity}`); // Output: Similarity: ~0.9

// Check if names match using default threshold
const matches = nameMatcher.matches('Robert Smith', 'Bob Smith', 'full');
console.log(`Names match: ${matches}`); // Output: Names match: true

// Evaluate match between records
const matchResult = nameMatcher.evaluateMatch(
  { firstName: 'Robert', lastName: 'Smith' },
  { firstName: 'Bob', lastName: 'Smith' },
  { firstNameField: 'firstName', lastNameField: 'lastName' }
);

console.log(`Confidence: ${matchResult.confidence}`); // Output: Confidence: ~0.76
console.log(`Tier: ${matchResult.tier}`); // Output: Tier: MEDIUM
console.log(`Components:`, matchResult.components); // Individual component scores
```

### Jaccard Similarity Matching

```javascript
const { JaccardSimilarityMatcher } = require('../includes/matching/jaccard_similarity_matcher');

// Create matcher instance
const jaccardMatcher = new JaccardSimilarityMatcher();

// Compare token sets
const similarity = jaccardMatcher.compareTokenSets(
  ['product', 'recommendation', 'algorithm'],
  ['algorithm', 'product', 'engine']
);
console.log(`Token set similarity: ${similarity}`); // Output: Token set similarity: 0.5

// Check if token sets match using default threshold
const matches = jaccardMatcher.matches(
  ['apple', 'banana', 'orange'],
  ['apple', 'banana', 'strawberry']
);
console.log(`Sets match: ${matches}`); // Output: Sets match: true

// Evaluate match between records
const matchResult = jaccardMatcher.evaluateMatch(
  { 
    interests: ['music', 'books', 'movies'],
    skills: ['javascript', 'python', 'sql']
  },
  { 
    interests: ['music', 'art', 'photography'],
    skills: ['javascript', 'java', 'sql']
  },
  {
    fieldMappings: {
      interests: 'interests',
      skills: 'skills'
    },
    fieldWeights: {
      interests: 0.6,
      skills: 0.4
    }
  }
);

console.log(`Confidence: ${matchResult.confidence}`); // Output: Confidence: ~0.32
console.log(`Tier: ${matchResult.tier}`); // Output: Tier: MINIMUM
console.log(`Components:`, matchResult.components); // Individual component scores
```

### Transitive Matching

```javascript
const { TransitiveMatcher } = require('../includes/matching/transitive_matcher');

// Create matcher instance
const transitiveMatcher = new TransitiveMatcher({
  matchResultsTable: 'customer_matches',
  confidenceThreshold: 0.7,
  maxDepth: 3
});

// Execute transitive closure
const results = await transitiveMatcher.execute();

console.log(`Found ${results.clusters.length} clusters`);
console.log(`Total transitive matches: ${results.transitiveMatches}`);
console.log(`Execution time: ${results.executionTime}s`);