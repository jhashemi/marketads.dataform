# Matching Strategies Reference

This document provides detailed information about the matching strategies available in the MarketAds matching system.

## Table of Contents

- [Overview](#overview)
- [Core Matching Strategies](#core-matching-strategies)
  - [Exact Matching](#exact-matching)
  - [Fuzzy String Matching](#fuzzy-string-matching)
  - [Fuzzy Name Matching](#fuzzy-name-matching)
  - [Jaccard Similarity Matching](#jaccard-similarity-matching)
  - [Phonetic Matching](#phonetic-matching)
- [Advanced Strategies](#advanced-strategies)
  - [Transitive Matching](#transitive-matching)
  - [Blocking Strategies](#blocking-strategies)
- [Configuration Options](#configuration-options)
  - [Confidence Thresholds](#confidence-thresholds)
  - [Field Weights](#field-weights)
- [Semantic Type System](#semantic-type-system)
- [Choosing the Right Strategy](#choosing-the-right-strategy)

## Overview

The MarketAds matching system provides a variety of strategies for comparing and matching records across datasets. Each strategy is optimized for specific types of data and use cases.

Matching strategies are implemented as specialized matchers that can be used individually or composed together through the main matching system. All strategies produce a similarity score between 0 (no match) and 1 (perfect match).

## Core Matching Strategies

### Exact Matching

The simplest strategy that checks for exact equivalence between field values.

**Best for:** IDs, codes, exact numeric values, boolean flags

**Implementation:**
```javascript
function exactMatch(value1, value2) {
  return value1 === value2 ? 1.0 : 0.0;
}
```

**Use cases:**
- Primary keys and IDs
- Product codes
- Unique identifiers
- Categorical data with finite values

### Fuzzy String Matching

Uses algorithms like Levenshtein distance, Jaro-Winkler, and other string similarity measures to compare text values that might have minor differences in spelling or format.

**Best for:** Text fields that might contain typos, format differences, or minor variations

**Implementation:**
- Levenshtein distance - Measures the minimum number of single-character edits required to change one string into another
- Jaro-Winkler - Gives higher scores to strings that match from the beginning
- Cosine similarity - Treats strings as vectors and measures their angle

**Key parameters:**
- `minPrefixMatch` - Minimum length of matching prefix for enhanced scoring
- `caseSensitive` - Whether to consider case when comparing
- `ignoreAccents` - Whether to normalize accented characters

**Use cases:**
- Address matching
- Product descriptions
- Company names
- General text fields

### Fuzzy Name Matching

Specialized matching for person names that accounts for common variations like nicknames, middle initials, and component-based name differences.

**Best for:** First names, last names, full names

**Implementation:**
- Nickname dictionary - Maps formal names to nicknames (e.g., "Robert" → "Bob", "Rob")
- Component matching - Separately compares first, middle, and last names
- Phonetic matching - Compares names based on pronunciation

**Key parameters:**
- `matchThreshold` - Minimum similarity score to consider a match
- `componentWeights` - Relative importance of first, middle, and last names

**Use cases:**
- Customer name matching
- Contact deduplication
- User profile matching

Example using the `FuzzyNameMatcher`:
```javascript
const { FuzzyNameMatcher } = require('./includes/matching/fuzzy_name_matcher');

const nameMatcher = new FuzzyNameMatcher();
const similarity = nameMatcher.compareFullNames('Robert J. Smith', 'Bob Smith');
// Returns: ~0.85
```

### Jaccard Similarity Matching

Compares sets of tokens (like tags or categories) using the Jaccard similarity coefficient, which measures the ratio of the intersection to the union of the sets.

**Best for:** Arrays of tokens, tag sets, feature lists, category sets

**Implementation:**
```
Jaccard(A, B) = |A ∩ B| / |A ∪ B|
```

**Key parameters:**
- `ignoreCase` - Whether to ignore case when comparing tokens
- `trim` - Whether to trim whitespace from tokens
- `matchThreshold` - Minimum similarity score to consider a match

**Use cases:**
- Product category matching
- Tag-based recommendation
- Interest/preference matching
- Feature set comparison

Example using the `JaccardSimilarityMatcher`:
```javascript
const { JaccardSimilarityMatcher } = require('./includes/matching/jaccard_similarity_matcher');

const jaccardMatcher = new JaccardSimilarityMatcher();
const similarity = jaccardMatcher.compareTokenSets(
  ['marketing', 'email', 'automation'],
  ['email', 'marketing', 'analytics']
);
// Returns: 0.5 (2 shared tokens out of 4 unique tokens)
```

### Phonetic Matching

Compares strings based on their pronunciation rather than their exact spelling. Useful for names and other words that might be spelled differently but sound the same.

**Best for:** Names, words with variable spelling

**Implementation:**
- Soundex - Encodes homophones with the same representation
- Metaphone - More accurate phonetic algorithm for English words
- Double Metaphone - Handles multiple language pronunciations

**Key parameters:**
- `algorithm` - Which phonetic algorithm to use
- `length` - Length of the phonetic code

**Use cases:**
- Name matching across languages
- Handling spelling variations
- Matching words with similar pronunciation

## Advanced Strategies

### Transitive Matching

Identifies indirect relationships between records through a chain of matches. If A matches B and B matches C, A might be considered to match C even without direct similarity.

**Best for:** Finding clusters of related records, identifying hidden relationships

**Implementation:**
- Graph-based clustering
- Transitive closure calculation
- Connected component analysis

**Key parameters:**
- `maxDepth` - Maximum number of links in the match chain
- `confidenceThreshold` - Minimum confidence to include in the transitive chain
- `transitivityFactor` - How much confidence decreases along the chain

**Use cases:**
- Customer record clustering
- Building household groups
- Finding all variations of the same entity

Example using the `TransitiveMatcher`:
```javascript
const { TransitiveMatcherFactory } = require('./includes/matching/transitive_matcher_factory');

const transitiveFactory = new TransitiveMatcherFactory();
const transitiveMatcher = transitiveFactory.createTransitiveMatcher({
  matchResultsTable: 'initial_matches',
  confidenceThreshold: 0.7,
  maxDepth: 3
});

const results = await transitiveMatcher.execute();
// Returns transitive match clusters
```

### Blocking Strategies

Blocking is not a matching strategy itself but a preprocessing technique to reduce the number of comparisons needed. It groups records into "blocks" where only records in the same block are compared.

**Best for:** Large datasets where comparing all pairs is impractical

**Implementation:**
- Exact key blocking - Group by exact field value
- Prefix/suffix blocking - Group by first/last N characters
- Phonetic blocking - Group by phonetic code
- Multi-key blocking - Use multiple fields for blocking

**Key parameters:**
- `blockingStrategies` - Which fields and strategies to use for blocking
- `maxBlockSize` - Maximum number of records per block
- `minBlockSize` - Minimum number of records for a valid block

**Use cases:**
- Matching large customer databases
- Cross-database entity resolution
- Real-time matching in high-volume systems

## Configuration Options

### Confidence Thresholds

All matching strategies use confidence thresholds to classify match quality into tiers:

```javascript
const DEFAULT_CONFIDENCE_THRESHOLDS = {
  HIGH: 0.9,    // Very confident matches
  MEDIUM: 0.7,  // Reasonably confident matches
  LOW: 0.5,     // Potentially related records
  MINIMUM: 0.3  // Weak relationship
};
```

These thresholds can be customized when creating matching components:

```javascript
const matcher = createMatchingSystem({
  confidenceThresholds: {
    HIGH: 0.95,   // More strict high confidence threshold
    MEDIUM: 0.75,
    LOW: 0.5,
    MINIMUM: 0.25
  }
});
```

### Field Weights

Different fields can have different importance in the matching process. This is controlled through field weights:

```javascript
const DEFAULT_WEIGHTS = {
  // High importance fields
  email: 0.9,
  phone: 0.8,
  dateOfBirth: 0.8,
  
  // Medium importance fields
  firstName: 0.6,
  lastName: 0.7,
  postalCode: 0.7,
  
  // Lower importance fields
  address: 0.5,
  city: 0.4,
  state: 0.3,
  country: 0.3,
  gender: 0.2
};
```

You can customize these weights when creating the matching system:

```javascript
const matcher = createMatchingSystem({
  fieldWeights: {
    email: 1.0,       // Give maximum weight to email
    phone: 0.9,
    firstName: 0.5,
    lastName: 0.6
    // Other fields will use defaults
  }
});
```

## Semantic Type System

The matching system uses semantic types to standardize field references across different data sources. This allows it to apply the appropriate matching strategy regardless of the actual field names.

Common semantic types include:

| Semantic Type | Description | Example Field Names | Best Strategy |
|---------------|-------------|---------------------|---------------|
| `email` | Email address | email, email_address, emailAddress | Exact matching |
| `phone` | Phone number | phone, phoneNumber, contact_number | Standardized exact matching |
| `firstName` | Person's first name | firstName, first_name, fname | Fuzzy name matching |
| `lastName` | Person's last name | lastName, last_name, lname | Fuzzy name matching |
| `address` | Street address | address, street_address, addr | Fuzzy string matching |
| `postalCode` | Postal/ZIP code | postalCode, zip, zip_code | Prefix matching |
| `dateOfBirth` | Date of birth | dob, birthDate, date_of_birth | Component matching |
| `tags` | Array of tags/categories | tags, categories, segments | Jaccard similarity |

## Choosing the Right Strategy

1. **For Person Names**: Use `FuzzyNameMatcher` to handle nicknames, initials, and name components.

2. **For Emails**: Use exact matching as emails should be consistent across systems.

3. **For Addresses**: Use fuzzy string matching with token-based similarity to handle formatting differences.

4. **For Phone Numbers**: Use standardized exact matching after removing formatting characters.

5. **For Tag Sets, Categories, Features**: Use `JaccardSimilarityMatcher` to compare token sets.

6. **For Large-Scale Matching**: Use blocking strategies to reduce the comparison space.

7. **For Finding Record Clusters**: Use `TransitiveMatcher` to find indirect relationships.

8. **For Mixed Field Types**: Use the main `createMatchingSystem()` interface which automatically selects the appropriate strategy based on semantic type.