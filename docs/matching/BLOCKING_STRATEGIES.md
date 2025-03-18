# Blocking Strategies

This document provides documentation for the blocking strategies implemented in the matching system.

## Table of Contents

- [Introduction](#introduction)
- [Available Strategies](#available-strategies)
- [Strategy Implementation Details](#strategy-implementation-details)
- [Usage Examples](#usage-examples)
- [Best Practices](#best-practices)
- [Integration with Matching System](#integration-with-matching-system)

## Introduction

Blocking strategies are used to reduce the number of record comparisons needed in the matching process. They group potentially matching records into "blocks" based on common characteristics, allowing the system to only compare records within the same block rather than performing a full cross-product comparison.

## Available Strategies

The system implements the following blocking strategies:

1. **Exact Match Blocking** (`exact`): Creates blocks based on exact field value matches
2. **Prefix Blocking** (`prefix`): Creates blocks based on a prefix of the field value
3. **Suffix Blocking** (`suffix`): Creates blocks based on a suffix of the field value
4. **Soundex Blocking** (`soundex`): Creates blocks based on phonetic similarity using the Soundex algorithm
5. **Token Blocking** (`token`): Creates blocks based on individual words/tokens in a field
6. **Year Blocking** (`year`): Creates blocks based on the year component of a date
7. **Month Blocking** (`month`): Creates blocks based on the month component of a date
8. **Day Blocking** (`day`): Creates blocks based on the day component of a date
9. **Email Domain Blocking** (`emailDomain`): Creates blocks based on email domain
10. **Last Four Digits Blocking** (`lastFourDigits`): Creates blocks based on the last four digits of a numeric field
11. **Phonetic Blocking** (`phonetic`): Creates blocks based on various phonetic algorithms (Soundex, Metaphone, etc.)
12. **Standardized Address Blocking** (`standardizedAddress`): Creates blocks based on standardized address components
13. **Embedding LSH Blocking** (`embedding`): Creates blocks using locality-sensitive hashing of vector embeddings
14. **N-gram Blocking** (`ngram`): Creates blocks based on character n-grams
15. **Compound Blocking** (`compound`): Creates blocks by combining multiple blocking strategies
16. **Tag Blocking** (`tag`): Creates blocks based on tags associated with records

## Strategy Implementation Details

### Exact Match Blocking

The exact match blocking strategy creates blocks based on exact matches of field values. It removes whitespace, converts to lowercase, and performs basic normalization.

```javascript
// Example implementation
function exactBlockingKey(value) {
  if (!value || typeof value !== 'string') return null;
  return value.trim().toLowerCase();
}
```

### Prefix Blocking

The prefix blocking strategy creates blocks based on a prefix of the field value, allowing for fuzzy matching of values that start the same way.

```javascript
// Example implementation
function prefixBlockingKey(value, prefixLength = 3) {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim().toLowerCase();
  if (trimmed.length < prefixLength) return null;
  return trimmed.substring(0, prefixLength);
}
```

### Tag Blocking

The tag blocking strategy creates blocks based on tags associated with records. This is useful for organizing records by categories, interests, or other metadata.

```javascript
// Example implementation
function tagBlockingKeys(tags, options = {}) {
  if (!tags || !Array.isArray(tags)) {
    return [];
  }
  
  const {
    lowercase = false,
    prefix = '',
    maxTags = 0
  } = options;
  
  // Process the tags
  let processedTags = [...tags];
  
  // Apply lowercase if requested
  if (lowercase) {
    processedTags = processedTags.map(tag => String(tag).toLowerCase());
  }
  
  // Apply prefix if provided
  if (prefix) {
    processedTags = processedTags.map(tag => `${prefix}${tag}`);
  }
  
  // Limit number of tags if maxTags is specified
  if (maxTags > 0 && processedTags.length > maxTags) {
    processedTags = processedTags.slice(0, maxTags);
  }
  
  return processedTags;
}
```

## Usage Examples

### Using a Single Blocking Strategy

```javascript
const { applyBlockingStrategy } = require('../includes/blocking/strategies');

// Generate an exact match blocking key
const exactKey = applyBlockingStrategy('exact', 'John Smith');
// Result: 'john smith'

// Generate a prefix blocking key
const prefixKey = applyBlockingStrategy('prefix', 'John Smith', { prefixLength: 4 });
// Result: 'john'

// Generate tag blocking keys
const tagKeys = applyBlockingStrategy('tag', ['electronics', 'smartphone', 'apple'], { 
  lowercase: true, 
  prefix: 'tag_' 
});
// Result: ['tag_electronics', 'tag_smartphone', 'tag_apple']
```

### Using the BlockingKeyGenerator

```javascript
const { BlockingKeyGenerator } = require('../includes/blocking/generator');

// Configure blocking
const blockingConfig = {
  blockingStrategies: {
    firstName: ['prefix', 'soundex'],
    lastName: ['exact', 'phonetic'],
    email: ['exact', 'emailDomain'],
    interests: ['tag']
  },
  blockingParams: {
    prefixLength: 3,
    maxKeysPerRecord: 10
  }
};

// Create generator
const generator = new BlockingKeyGenerator(blockingConfig);

// Generate keys for a record
const record = {
  firstName: 'John',
  lastName: 'Smith',
  email: 'john.smith@example.com',
  interests: ['music', 'sports', 'technology']
};

const fieldMappings = [
  { fieldName: 'firstName', semanticType: 'firstName' },
  { fieldName: 'lastName', semanticType: 'lastName' },
  { fieldName: 'email', semanticType: 'email' },
  { fieldName: 'interests', semanticType: 'interests' }
];

const blockingKeys = generator.generateKeys(record, fieldMappings);
// Result: {
//   'firstName_prefix_0': 'joh',
//   'firstName_soundex_1': 'J500',
//   'lastName_exact_2': 'smith',
//   'lastName_phonetic_3': 'SM300',
//   'email_exact_4': 'john.smith@example.com',
//   'email_emailDomain_5': 'example.com',
//   'interests_tag_6': 'music',
//   'interests_tag_7': 'sports',
//   'interests_tag_8': 'technology'
// }
```

## Best Practices

1. **Choose appropriate strategies for each field type**:
   - Use `phonetic` for name fields to handle spelling variations
   - Use `standardizedAddress` for address fields to handle formatting differences
   - Use `emailDomain` for email fields to group users from the same organization
   - Use `tag` for categorical or interest-based fields

2. **Balance block size and coverage**:
   - Too many blocks = missed matches (low recall)
   - Too few blocks = too many comparisons (low efficiency)

3. **Use multiple strategies in parallel**:
   - Apply several strategies to each field and union the results
   - This increases recall while maintaining reasonable efficiency

4. **Precompute blocking keys**:
   - Generate and store blocking keys at data ingestion time
   - Avoids regenerating keys for every matching operation

5. **Monitor block size distribution**:
   - Identify and split large blocks that may cause performance issues
   - Combine tiny blocks that may be too specific

## Integration with Matching System

The blocking strategies integrate with the matching system through the `BlockingEngine` class, which manages the application of strategies and generation of SQL queries for blocking-based joins.

```javascript
const { createBlockingEngine } = require('../includes/blocking');

// Create blocking engine with config
const blockingEngine = createBlockingEngine({
  blockingStrategies: {
    firstName: ['prefix', 'soundex'],
    lastName: ['exact', 'phonetic'],
    email: ['exact', 'emailDomain'],
    interests: ['tag']
  }
});

// Generate SQL for join between two tables
const joinCondition = blockingEngine.createJoinCondition(
  'source_table',
  'target_table',
  sourceFieldMappings,
  targetFieldMappings
);

// Use in SQL query
const sqlQuery = `
SELECT * 
FROM source_table s
JOIN target_table t
ON ${joinCondition}
`;