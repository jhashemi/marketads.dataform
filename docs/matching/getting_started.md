# Getting Started with the Marketing Ads Matching System

This guide will help you quickly get started with implementing record matching in your MarketAds projects.

## Table of Contents

- [Installation](#installation)
- [Basic Usage](#basic-usage)
- [Working with Different Matchers](#working-with-different-matchers)
- [Configuring Match Thresholds](#configuring-match-thresholds)
- [Advanced Usage](#advanced-usage)
- [Best Practices](#best-practices)
- [Examples](#examples)

## Installation

The matching system is included in the MarketAds Dataform project. No additional installation is required beyond setting up the core project.

## Basic Usage

The most straightforward way to use the matching system is through the main interface:

```javascript
const { createMatchingSystem } = require('./includes/matching');

// Create matching system with default configuration
const matcher = createMatchingSystem();

// Define field mappings
const sourceFieldMappings = [
  { fieldName: 'email', semanticType: 'email' },
  { fieldName: 'first_name', semanticType: 'firstName' },
  { fieldName: 'last_name', semanticType: 'lastName' },
  { fieldName: 'address', semanticType: 'address' },
  { fieldName: 'zip', semanticType: 'postalCode' }
];

const targetFieldMappings = [
  { fieldName: 'email_address', semanticType: 'email' },
  { fieldName: 'fname', semanticType: 'firstName' },
  { fieldName: 'lname', semanticType: 'lastName' },
  { fieldName: 'street_address', semanticType: 'address' },
  { fieldName: 'postal_code', semanticType: 'postalCode' }
];

// Sample records
const sourceRecord = {
  email: 'john.doe@example.com',
  first_name: 'John',
  last_name: 'Doe',
  address: '123 Main St',
  zip: '12345'
};

const targetRecord = {
  email_address: 'john.doe@example.com',
  fname: 'Johnny',
  lname: 'Doe',
  street_address: '123 Main Street',
  postal_code: '12345'
};

// Evaluate the match
async function matchRecords() {
  const matchResult = await matcher.evaluateMatch(
    sourceRecord, 
    targetRecord,
    {
      sourceFieldMappings,
      targetFieldMappings,
      priorityFields: ['email', 'phone']
    }
  );
  
  console.log(`Match confidence: ${matchResult.confidence}`);
  console.log(`Match tier: ${matchResult.tier}`);
  console.log('Component scores:', matchResult.components);
  
  // Check if records can be merged
  const canMerge = matcher.canMergeRecords(matchResult);
  console.log(`Can merge records: ${canMerge}`);
  
  return matchResult;
}

matchRecords().catch(console.error);
```

## Working with Different Matchers

The system provides several specialized matchers for different types of data:

### Fuzzy Name Matcher

Best for comparing person names with variations and nicknames:

```javascript
const { FuzzyNameMatcher } = require('./includes/matching/fuzzy_name_matcher');

const nameMatcher = new FuzzyNameMatcher({
  matchThreshold: 0.7 // Adjust threshold as needed
});

// Compare first names
const firstNameSimilarity = nameMatcher.compareFirstNames('Robert', 'Bob');
console.log(`First name similarity: ${firstNameSimilarity}`); // Output: 0.9

// Compare full names
const fullNameSimilarity = nameMatcher.compareFullNames('John A. Smith', 'John Smith');
console.log(`Full name similarity: ${fullNameSimilarity}`); // Output: ~0.9

// Check if names match
const matches = nameMatcher.matches('Robert Smith', 'Bob Smith', 'full');
console.log(`Names match: ${matches}`); // Output: true
```

### Jaccard Similarity Matcher

Best for comparing tag sets, categories, and lists:

```javascript
const { JaccardSimilarityMatcher } = require('./includes/matching/jaccard_similarity_matcher');

const jaccardMatcher = new JaccardSimilarityMatcher({
  matchThreshold: 0.5 // Adjust threshold as needed
});

// Compare tag sets
const tagSimilarity = jaccardMatcher.compareTokenSets(
  ['marketing', 'email', 'automation'],
  ['email', 'marketing', 'analytics']
);
console.log(`Tag similarity: ${tagSimilarity}`); // Output: 0.67

// Check if tag sets match
const tagsMatch = jaccardMatcher.matches(
  ['red', 'green', 'blue'],
  ['red', 'green', 'yellow']
);
console.log(`Tags match: ${tagsMatch}`); // Output: true
```

### Transitive Matcher

Best for finding indirect matches in large datasets:

```javascript
const { TransitiveMatcherFactory } = require('./includes/matching/transitive_matcher_factory');

const transitiveFactory = new TransitiveMatcherFactory();
const transitiveMatcher = transitiveFactory.createTransitiveMatcher({
  matchResultsTable: 'customer_matches',
  confidenceThreshold: 0.7,
  maxDepth: 3
});

// Execute transitive closure
async function findTransitiveMatches() {
  const results = await transitiveMatcher.execute();
  console.log(`Found ${results.clusters.length} clusters`);
  return results;
}

findTransitiveMatches().catch(console.error);
```

## Configuring Match Thresholds

You can configure confidence thresholds for different match tiers:

```javascript
const matcher = createMatchingSystem({
  // Thresholds for different confidence tiers
  confidenceThresholds: {
    HIGH: 0.9,   // Very confident matches
    MEDIUM: 0.7, // Reasonably confident matches
    LOW: 0.5,    // Potentially related records
    MINIMUM: 0.3 // Weak relationship
  },
  
  // Weights for different field types
  fieldWeights: {
    email: 0.9,
    phone: 0.8,
    firstName: 0.6,
    lastName: 0.7,
    address: 0.5,
    postalCode: 0.7
  }
});
```

## Advanced Usage

### Finding Multiple Matches

To find all potential matches for a record in a set of targets:

```javascript
async function findPotentialMatches(sourceRecord, targetRecords) {
  const matches = await matcher.findMatches(
    sourceRecord,
    targetRecords,
    {
      sourceFieldMappings,
      targetFieldMappings,
      threshold: 0.5,  // Minimum confidence to consider
      maxResults: 10   // Maximum number of results to return
    }
  );
  
  console.log(`Found ${matches.length} potential matches`);
  
  // Sort by confidence (highest first)
  matches.sort((a, b) => b.score.confidence - a.score.confidence);
  
  return matches;
}
```

### Clustering Similar Records

To cluster similar records together:

```javascript
async function clusterSimilarRecords(records) {
  const clusters = await matcher.clusterRecords(
    records,
    fieldMappings,
    { threshold: 0.7 }
  );
  
  console.log(`Found ${clusters.length} clusters`);
  
  // Process each cluster
  clusters.forEach((cluster, index) => {
    console.log(`Cluster ${index + 1}: ${cluster.length} records`);
  });
  
  return clusters;
}
```

### Calculating Batch Metrics

To calculate metrics for a batch of matches:

```javascript
function analyzeMatchQuality(matches) {
  const metrics = matcher.calculateBatchMetrics(matches);
  
  console.log(`High confidence rate: ${metrics.highConfidenceRate}`);
  console.log(`Average confidence: ${metrics.averageConfidence}`);
  console.log(`Field coverage rate: ${metrics.fieldCoverageRate}`);
  
  return metrics;
}
```

## Best Practices

1. **Use Semantic Types**: Always map your fields to semantic types rather than comparing raw field names. This allows the system to apply appropriate comparison algorithms.

2. **Prioritize High-Signal Fields**: Use the `priorityFields` option to give more weight to fields that are more likely to indicate a match (e.g., email, phone).

3. **Tune Thresholds for Your Use Case**: Adjust confidence thresholds based on whether you prioritize precision (fewer false positives) or recall (fewer false negatives).

4. **Use Specialized Matchers**: Choose the appropriate matcher for each field type:
   - `FuzzyNameMatcher` for person names
   - `JaccardSimilarityMatcher` for tag sets and categories
   - Standard string comparisons for exact fields like IDs

5. **Validate Results**: Always validate match results in a test environment before implementing in production.

6. **Consider Data Quality**: Poor quality data may require more lenient thresholds and additional preprocessing.

7. **Monitor Match Quality**: Regularly check batch metrics to ensure your matching system is performing well over time.

## Examples

### Customer Matching Example

```javascript
const { createMatchingSystem } = require('./includes/matching');

// Create system
const matcher = createMatchingSystem();

// Define field mappings
const fieldMappings = [
  { fieldName: 'email', semanticType: 'email' },
  { fieldName: 'phone', semanticType: 'phone' },
  { fieldName: 'firstName', semanticType: 'firstName' },
  { fieldName: 'lastName', semanticType: 'lastName' },
  { fieldName: 'address', semanticType: 'address' },
  { fieldName: 'zipCode', semanticType: 'postalCode' }
];

// Sample customer records
const customer1 = {
  email: 'jane.doe@example.com',
  phone: '555-123-4567',
  firstName: 'Jane',
  lastName: 'Doe',
  address: '456 Oak Street',
  zipCode: '67890'
};

const customer2 = {
  email: 'jane.doe@example.com',
  phone: '(555) 123-4567',
  firstName: 'Jane',
  lastName: 'Doe-Smith', // Hyphenated last name
  address: '456 Oak St',  // Abbreviated street
  zipCode: '67890'
};

// Match customers
async function matchCustomers() {
  const result = await matcher.evaluateMatch(
    customer1,
    customer2,
    {
      sourceFieldMappings: fieldMappings,
      targetFieldMappings: fieldMappings,
      priorityFields: ['email', 'phone']
    }
  );
  
  console.log(`Match confidence: ${result.confidence}`);
  console.log(`Match tier: ${result.tier}`);
  
  if (result.tier === 'HIGH' || result.tier === 'MEDIUM') {
    console.log('Customers likely match!');
  } else {
    console.log('Customers are likely different people.');
  }
  
  return result;
}

matchCustomers().catch(console.error);
```

### Product Matching Example

```javascript
const { JaccardSimilarityMatcher } = require('./includes/matching/jaccard_similarity_matcher');

// Create specialized matcher for product data
const productMatcher = new JaccardSimilarityMatcher({
  matchThreshold: 0.6
});

// Sample product records
const product1 = {
  name: 'Ultra HD Smart TV 55"',
  brand: 'TechBrand',
  categories: ['Electronics', 'TVs', 'Smart Home'],
  features: ['4K', 'HDR', 'Smart TV', 'Voice Control', 'WiFi']
};

const product2 = {
  name: 'TechBrand 55-inch 4K Smart Television',
  brand: 'TechBrand',
  categories: ['TVs', 'Electronics', 'Home Theater'],
  features: ['Ultra HD', '4K Resolution', 'Smart Features', 'WiFi Enabled']
};

// Match products
function matchProducts() {
  const result = productMatcher.evaluateMatch(
    product1,
    product2,
    {
      fieldMappings: {
        categories: 'categories',
        features: 'features'
      },
      fieldWeights: {
        categories: 0.7,
        features: 0.3
      }
    }
  );
  
  console.log(`Product match confidence: ${result.confidence}`);
  console.log(`Category similarity: ${result.components.categories}`);
  console.log(`Feature similarity: ${result.components.features}`);
  
  return result;
}

console.log(matchProducts());