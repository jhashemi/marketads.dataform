# Waterfall Matching System

A comprehensive framework for implementing prioritized multi-table record matching in BigQuery using Dataform.

## Table of Contents

- [Overview](#overview)
- [Key Concepts](#key-concepts)
- [Implementation Components](#implementation-components)
- [Usage](#usage)
  - [Simple Waterfall Matching](#simple-waterfall-matching)
  - [Multi-Table Waterfall Matching](#multi-table-waterfall-matching)
  - [Deterministic-then-Probabilistic Matching](#deterministic-then-probabilistic-matching)
  - [Historical Data Matching](#historical-data-matching)
- [Configuration Reference](#configuration-reference)
  - [Reference Table Configuration](#reference-table-configuration)
  - [Field Mappings](#field-mappings)
  - [Matching Rules](#matching-rules)
  - [Deterministic Rules](#deterministic-rules)
  - [Thresholds](#thresholds)
- [Best Practices](#best-practices)
- [Performance Considerations](#performance-considerations)
- [Troubleshooting](#troubleshooting)
- [Advanced Topics](#advanced-topics)

## Overview

The Waterfall Matching System is designed to match records across multiple reference tables while respecting a priority order. This is particularly useful when you have reference data of varying quality and reliability.

The key benefits of this approach include:

- **Prioritized Matching**: Records are matched against reference tables in order of priority, ensuring that higher-quality sources take precedence.
- **Flexible Matching Rules**: Support for both deterministic (exact) and probabilistic (fuzzy) matching rules.
- **Confidence Scoring**: Each match is assigned a confidence score and level (HIGH, MEDIUM, LOW).
- **Comprehensive Output**: Detailed match information including source, confidence, and mapped fields.
- **Handling Unmatched Records**: Option to include unmatched records in the output for further processing.

## Key Concepts

### Waterfall Approach

The waterfall approach to record matching involves trying to match records against multiple reference tables in a specific order of priority. Matches from higher priority sources take precedence over lower priority sources, creating a "waterfall" effect where records cascade through the priority tiers until a match is found.

### Deterministic vs. Probabilistic Matching

- **Deterministic Matching**: Uses exact or standardized comparisons to find definite matches. For example, matching on email address and full name.
- **Probabilistic Matching**: Uses fuzzy comparisons to find likely matches based on similarity scores. For example, matching on name similarity and address similarity.

### Confidence Levels

Matches are assigned confidence levels based on the similarity scores:

- **HIGH**: Very likely to be correct matches (score >= 0.85)
- **MEDIUM**: Reasonably likely to be correct matches (score >= 0.70)
- **LOW**: Possibly correct matches but with lower confidence (score >= 0.55)
- **NONE**: Not considered matches (score < 0.55)

### Multi-Table Strategy

The multi-table strategy extends the basic waterfall approach with additional features:

- Table-specific priority levels
- Confidence multipliers for different reference tables
- Required fields validation
- Field mapping between disparate schemas
- Multiple match options for a single source record

## Implementation Components

The waterfall matching system consists of the following key components:

1. **Match Strategies**:
   - `WaterfallMatchStrategy`: Implements the basic waterfall matching logic
   - `MultiTableWaterfallStrategy`: Extends the basic strategy with advanced features

2. **Pipeline Generator**:
   - `waterfall_pipeline.js`: Provides functions to generate complete SQL pipelines

3. **Match Strategy Factory**:
   - `match_strategy_factory.js`: Creates and configures matching strategy instances

4. **Example Implementations**:
   - `waterfall_matching.sqlx`: Basic waterfall matching example
   - `deterministic_probabilistic_matching.sqlx`: Hybrid matching approach

## Usage

### Simple Waterfall Matching

Here's a basic example of using the waterfall matching system:

```javascript
// In your Dataform SQL file (.sqlx)
const waterfallPipeline = require('/includes/pipeline/waterfall_pipeline');

// Define reference tables in priority order
const referenceTables = [
  { 
    id: 'verified_customers', 
    table: 'reference_data.verified_customers', 
    priority: 1, 
    name: 'VERIFIED'
  },
  { 
    id: 'historical_customers', 
    table: 'reference_data.historical_customers', 
    priority: 2, 
    name: 'HISTORICAL'
  }
];

// Define configuration
const pipelineConfig = {
  sourceTable: 'sources.customer_data',
  referenceTables,
  fieldMappings: { ... },
  matchingRules: { ... },
  outputTable: 'waterfall_customer_matching'
};

// Generate and execute the SQL
const waterfallSql = waterfallPipeline.generateWaterfallPipeline(pipelineConfig);
${waterfallSql}
```

### Multi-Table Waterfall Matching

For more complex matching scenarios with multiple matches per source record:

```javascript
const config = {
  sourceTable: 'sources.customer_data',
  referenceTables: [ ... ],
  fieldMappings: { ... },
  matchingRules: { ... },
  allowMultipleMatches: true,
  maxMatches: 3,
  outputTable: 'multi_match_results'
};

const sql = waterfallPipeline.generateMultiTableWaterfallPipeline(config);
${sql}
```

### Deterministic-then-Probabilistic Matching

For a hybrid approach that combines exact and fuzzy matching:

```javascript
const config = {
  sourceTable: 'sources.customer_data',
  referenceTables: [ ... ],
  fieldMappings: { ... },
  deterministicRules: {
    'verified_customers': [
      {
        conditions: [
          { sourceField: 'email', targetField: 'email', exact: true },
          { sourceField: 'first_name', targetField: 'first_name', standardized: true },
          { sourceField: 'last_name', targetField: 'last_name', standardized: true }
        ]
      }
    ]
  },
  matchingRules: { ... },
  outputTable: 'hybrid_match_results'
};

const sql = waterfallPipeline.generateDeterministicThenProbabilisticPipeline(config);
${sql}
```

### Historical Data Matching

For matching against both current and historical data sources:

```javascript
const config = {
  sourceTable: 'sources.customer_data',
  referenceTables: [ ... ], // Current data sources
  historicalTables: [ ... ], // Historical data sources
  fieldMappings: { ... },
  matchingRules: { ... },
  outputTable: 'historical_match_results'
};

const sql = waterfallPipeline.generateHistoricalWaterfallPipeline(config);
${sql}
```

## Configuration Reference

### Reference Table Configuration

| Property | Type | Description | Required |
|----------|------|-------------|----------|
| id | string | Unique identifier for the reference table | Yes |
| table | string | BigQuery table name including dataset | Yes |
| priority | number | Priority value (lower = higher priority) | Yes |
| name | string | Display name for the reference table | No |
| keyField | string | Field to use as match key (defaults to 'id') | No |
| confidenceMultiplier | number | Multiplier applied to match scores (default: 1.0) | No |
| requiredFields | array | Fields that must be non-null for valid matches | No |
| blockingConditions | array | Additional conditions for blocking phase | No |

### Field Mappings

Field mappings define how fields from reference tables are mapped to output fields:

```javascript
fieldMappings: {
  'reference_table_id': [
    // Simple field mapping (source field name = target field name)
    'field_name',
    
    // Explicit field mapping
    { sourceField: 'source_field', targetField: 'target_field' },
    
    // Expression-based mapping
    { expression: 'CONCAT(t.first_name, " ", t.last_name)', targetField: 'full_name' }
  ]
}
```

### Matching Rules

Matching rules define how records are matched, including both blocking and scoring:

```javascript
matchingRules: {
  'reference_table_id': {
    // Blocking rules - determine which records to compare
    blocking: [
      // Field-based blocking
      { sourceField: 'zip_code', targetField: 'zip_code', exact: true },
      
      // Prefix-based blocking
      { sourceField: 'last_name', targetField: 'last_name', prefix: true, length: 3 },
      
      // Phonetic-based blocking
      { sourceField: 'last_name', targetField: 'last_name', phonetic: true, phoneticFunction: 'SOUNDEX' },
      
      // Custom condition
      { condition: '(s.email = t.email OR s.phone = t.phone)' }
    ],
    
    // Scoring rules - determine match confidence
    scoring: [
      // Exact match
      { sourceField: 'email', targetField: 'email', method: 'exact', weight: 3.0 },
      
      // String similarity
      { sourceField: 'first_name', targetField: 'first_name', method: 'jaro_winkler', weight: 1.5 },
      
      // Token-based similarity (good for addresses)
      { sourceField: 'address', targetField: 'address', method: 'token', weight: 1.0 }
    ]
  }
}
```

### Deterministic Rules

Deterministic rules define exact matching conditions:

```javascript
deterministicRules: {
  'reference_table_id': [
    // Rule 1
    {
      conditions: [
        { sourceField: 'email', targetField: 'email', exact: true },
        { sourceField: 'first_name', targetField: 'first_name', standardized: true },
        { sourceField: 'last_name', targetField: 'last_name', standardized: true }
      ]
    },
    // Rule 2
    {
      conditions: [
        { sourceField: 'phone', targetField: 'phone', exact: true },
        { sourceField: 'first_name', targetField: 'first_name', standardized: true },
        { sourceField: 'last_name', targetField: 'last_name', standardized: true }
      ]
    }
  ]
}
```

### Thresholds

Thresholds define the confidence level boundaries:

```javascript
thresholds: {
  high: 0.85,   // Minimum score for HIGH confidence
  medium: 0.70, // Minimum score for MEDIUM confidence
  low: 0.55     // Minimum score for LOW confidence
}
```

## Best Practices

### Reference Table Prioritization

- Use the highest priority (lowest numerical value) for the most reliable and up-to-date data sources.
- Consider reliability, recency, and completeness when assigning priorities.
- Document the rationale for prioritization in your code.

### Field Selection

- Include all necessary fields for accurate matching in both blocking and scoring rules.
- Use standardized fields when possible (e.g., standardized addresses, normalized phone numbers).
- Include fields that uniquely identify entities (email, phone, account numbers) for blocking.

### Matching Rule Design

- Use blocking rules to efficiently narrow down candidates.
- Assign higher weights to more distinctive and reliable fields.
- Use a combination of exact and fuzzy matching methods.
- Test different confidence thresholds to find the optimal balance of precision and recall.

### Performance Optimization

- Prioritize blocking efficiency to reduce the number of comparisons.
- Create appropriate BigQuery clustering and partitioning on both source and reference tables.
- For large tables, consider creating blocking key tables as materialized views.
- Break up very large matching operations into smaller batches.

## Performance Considerations

### Blocking Efficiency

The blocking phase is critical for performance. Inefficient blocking can lead to:
- Too many comparisons, causing poor performance
- Too few comparisons, causing missed matches

Use a combination of these blocking strategies:
1. **Exact field matching**: For unique identifiers
2. **Prefix matching**: For faster string comparisons
3. **Phonetic matching**: For handling spelling variations
4. **Composite blocking**: Combining multiple fields

### BigQuery Optimization

- **Partitioning**: Partition large tables by logical date fields
- **Clustering**: Cluster tables by frequently used blocking fields
- **Denormalization**: Include all required fields to minimize joins
- **Query Structure**: Use CTEs to break complex logic into manageable steps

## Troubleshooting

### Common Issues

| Issue | Possible Causes | Solutions |
|-------|----------------|-----------|
| Too few matches | Blocking rules too restrictive | Relax blocking conditions |
| Too many low-confidence matches | Scoring weights not optimal | Adjust field weights; increase thresholds |
| Poor performance | Inefficient blocking | Refine blocking logic; add indexes |
| Inconsistent results | Data quality issues | Add data standardization; handle null values |
| Missing expected matches | Field format differences | Add standardization; use token-based methods |

### Validation Approaches

1. **Random Sampling**: Manually verify a random sample of matches
2. **Known Entity Testing**: Test with known matches to ensure they're found
3. **Tier Analysis**: Analyze match distribution across confidence tiers
4. **Field-Level Analysis**: Examine match scores for individual fields

## Advanced Topics

### Custom Similarity Functions

Beyond the built-in similarity methods, you can create custom similarity functions:

```sql
-- Custom address similarity function
CREATE FUNCTION address_similarity(addr1 STRING, addr2 STRING) AS (
  -- Implementation details
);
```

### Match Deduplication

For scenarios where the same entity might appear in multiple reference tables:

```javascript
// Post-processing deduplication
const deduplicationSql = `
WITH matches AS (
  ${matchingSql}
),
deduplicated AS (
  SELECT 
    *,
    ROW_NUMBER() OVER(
      PARTITION BY source_id
      ORDER BY match_score DESC
    ) as rank
  FROM matches
)
SELECT * EXCEPT(rank)
FROM deduplicated
WHERE rank = 1
`;
```

### Incremental Matching

For incrementally updating match results:

```javascript
// Incremental matching configuration
const incrementalConfig = {
  // ... standard config ...
  incrementalMatching: true,
  incrementalField: 'last_updated',
  previousMatchTable: 'previous_match_results'
};
```

### Entity Resolution Across Multiple Dimensions

For complex entity resolution across multiple dimensions (e.g., customer, household, business):

```javascript
// Multi-dimension configuration
const dimensionConfig = {
  // ... standard config ...
  dimensions: [
    { name: 'customer', idField: 'customer_id' },
    { name: 'household', idField: 'household_id' },
    { name: 'business', idField: 'business_id' }
  ]
};
```

---

## Further Resources

- [Data Matching Concepts](https://cloud.google.com/solutions/data-matching-resources)
- [BigQuery Performance Optimization](https://cloud.google.com/bigquery/docs/best-practices-performance-overview)
- [Example Implementation Repository](https://github.com/example/matching-system) 