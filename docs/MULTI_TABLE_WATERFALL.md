# Multi-Table Waterfall Strategy

The Multi-Table Waterfall Strategy is an extension of the basic Waterfall matching approach that handles multiple reference tables with different priorities. This document provides a comprehensive guide to understanding, configuring, and using this strategy.

## Overview

The Multi-Table Waterfall Strategy is designed for complex entity resolution problems where reference data comes from multiple sources of varying quality and reliability. It allows you to:

1. Match source records against multiple reference tables in priority order
2. Apply different matching rules to each reference table
3. Assign confidence multipliers to prioritize more trusted data sources
4. Specify required fields for each reference table
5. Configure custom field mappings for each table

## Key Features

- **Priority-based Matching**: Reference tables are processed in priority order
- **Confidence Levels**: Three confidence tiers (HIGH, MEDIUM, LOW) with configurable thresholds
- **Flexible Matching Rules**: Different blocking and scoring rules for each reference table
- **Required Fields Validation**: Ensures critical fields are present in matches
- **Confidence Multipliers**: Adjust match scores based on source reliability
- **Field Mapping**: Custom field mappings for consistent output schema
- **Robust Edge Case Handling**: Gracefully manages empty tables, missing fields, and more

## Configuration

### Basic Setup

```javascript
const { MultiTableWaterfallStrategy } = require('./multi_table_waterfall_strategy');

const strategy = new MultiTableWaterfallStrategy({
  referenceTables: [
    {
      id: "verified_customers",       // Unique identifier for this reference table
      table: "verified_customers",    // Actual table name in the database
      name: "Verified Customers",     // Human-readable name
      keyField: "customer_id",        // Primary key field
      priority: 1,                    // Lower number = higher priority
      confidenceMultiplier: 1.2,      // Confidence multiplier (optional)
      requiredFields: ["email"]       // Required fields (optional)
    },
    {
      id: "crm_customers",
      table: "crm_customers",
      name: "CRM Customers",
      keyField: "customer_id",
      priority: 2,
      confidenceMultiplier: 0.9,
      requiredFields: ["phone"]
    }
  ],
  matchingRules: {
    "verified_customers": {
      blocking: [
        { sourceField: "postal_code", targetField: "postal_code", exact: true }
      ],
      scoring: [
        { sourceField: "first_name", targetField: "first_name", method: "jaro_winkler", weight: 1.5 },
        { sourceField: "last_name", targetField: "last_name", method: "jaro_winkler", weight: 2.0 },
        { sourceField: "email", targetField: "email", method: "exact", weight: 3.0 }
      ]
    },
    "crm_customers": {
      blocking: [
        { sourceField: "postal_code", targetField: "zip", exact: true }
      ],
      scoring: [
        { sourceField: "first_name", targetField: "fname", method: "jaro_winkler", weight: 1.5 },
        { sourceField: "last_name", targetField: "lname", method: "jaro_winkler", weight: 2.0 },
        { sourceField: "phone", targetField: "phone_number", method: "exact", weight: 2.5 }
      ]
    }
  },
  thresholds: {
    high: 0.85,
    medium: 0.7,
    low: 0.55
  },
  fieldMappings: {
    "verified_customers": [
      { sourceField: "first_name", targetField: "first_name_mapped" },
      { sourceField: "last_name", targetField: "last_name_mapped" },
      { sourceField: "email", targetField: "email_mapped" }
    ],
    "crm_customers": [
      { sourceField: "fname", targetField: "first_name_mapped" },
      { sourceField: "lname", targetField: "last_name_mapped" },
      { sourceField: "phone_number", targetField: "phone_mapped" }
    ]
  },
  allowMultipleMatches: false,
  maxMatches: 1,
  confidenceField: "confidence"
});

// Generate SQL for this strategy
const sql = strategy.generateSql({
  sourceTable: "customer_data",
  sourceAlias: "s",
  targetAlias: "t"
});
```

### Configuration Options

#### Reference Tables

Each reference table should have:

| Property | Type | Description | Required |
|----------|------|-------------|----------|
| id | string | Unique identifier for the table | Yes |
| table | string | Actual table name in the database | Yes |
| name | string | Human-readable name | No |
| keyField | string | Primary key field | Yes |
| priority | number | Priority level (lower = higher priority) | Yes |
| tablePriority | number | Alternative to priority | No |
| confidenceMultiplier | number | Multiplier for match scores | No |
| requiredFields | Array | List of fields that must be present | No |

#### Matching Rules

Matching rules include blocking rules (exact matches required for a join) and scoring rules (fuzzy matching with weights):

```javascript
matchingRules: {
  "tableId": {
    blocking: [
      { sourceField: "field1", targetField: "field1", exact: true },
      { 
        sourceField: "field2", 
        targetField: "field2", 
        method: "soundex" // Optional method for blocking
      }
    ],
    scoring: [
      { 
        sourceField: "field3", 
        targetField: "field3", 
        method: "jaro_winkler", // Method for fuzzy matching
        weight: 2.0 // Weight for this field's score
      }
    ]
  }
}
```

Available scoring methods include:
- `exact` (exact match)
- `jaro_winkler` (fuzzy string matching)
- `levenshtein` (edit distance)
- `soundex` (phonetic similarity)
- Custom methods via SQL expressions

#### Thresholds

Thresholds define confidence levels for matches:

```javascript
thresholds: {
  high: 0.85,   // HIGH confidence matches (85%+ match score)
  medium: 0.7,  // MEDIUM confidence matches (70-85% match score)
  low: 0.55     // LOW confidence matches (55-70% match score)
}
```

Scores below the low threshold are rejected.

#### Field Mappings

Field mappings control which fields are included in the output and how they're named:

```javascript
fieldMappings: {
  "tableId": [
    { sourceField: "original_field", targetField: "mapped_field" },
    { expression: "CONCAT(first_name, ' ', last_name)", as: "full_name" }
  ]
}
```

## Edge Case Handling

The strategy has robust handling for various edge cases that may occur in production:

### Empty Reference Tables

The strategy uses an `EXISTS` check to gracefully handle empty reference tables:

```sql
WHERE 
  -- Check if table has data
  EXISTS (SELECT 1 FROM ${refTable.table} LIMIT 1)
  -- Apply score threshold
  AND ${scoreCalculation} >= ${thresholds.low}
```

### Missing Fields

Missing fields are handled with `COALESCE` in field mappings:

```sql
COALESCE(${targetAlias}.${this._escapeFieldName(mapping.sourceField)}, NULL) AS ${this._escapeFieldName(mapping.targetField)}
```

### Special Characters in Field Names

Field names with special characters are properly escaped:

```javascript
_escapeFieldName(fieldName) {
  if (!fieldName) return 'id';
  
  // If the field name contains special characters, escape it with backticks
  return fieldName.match(/[-\s.]/) ? `\`${fieldName}\`` : fieldName;
}
```

### Threshold and Multiplier Validation

Thresholds and multipliers are validated and normalized to ensure correct behavior:

```javascript
_normalizeThresholds(thresholds) {
  // Ensure thresholds are valid numbers between 0 and 1
  thresholds.high = Math.min(1, Math.max(0, parseFloat(thresholds.high) || 0.85));
  thresholds.medium = Math.min(1, Math.max(0, parseFloat(thresholds.medium) || 0.70));
  thresholds.low = Math.min(1, Math.max(0, parseFloat(thresholds.low) || 0.55));
  
  // Ensure thresholds are in descending order
  thresholds.high = Math.max(thresholds.high, thresholds.medium, thresholds.low);
  thresholds.medium = Math.min(thresholds.high, Math.max(thresholds.medium, thresholds.low));
  thresholds.low = Math.min(thresholds.high, thresholds.medium, thresholds.low);
}
```

For full details on edge case handling, see [Multi-Table Waterfall Edge Cases](./multi_table_waterfall_edge_cases.md).

## SQL Generation

The strategy generates SQL in the following format:

1. Common Table Expression (CTE) for the source data
2. CTEs for matches against each reference table
3. Final query that selects the best match (or multiple matches) from all reference tables

Example generated SQL structure:

```sql
-- Multi-table waterfall match strategy: Match against reference tables with priority tiers
WITH source_data AS (
  SELECT * FROM customer_data
),
matches_1 AS (
  -- Match against first reference table
),
matches_2 AS (
  -- Match against second reference table
),
-- ... additional reference tables ...
ranked_matches AS (
  -- Rank all matches by priority and confidence
)

-- Final result selection
SELECT * EXCEPT(match_rank)
FROM ranked_matches
WHERE match_rank = 1 -- Or multiple matches if configured
```

## Usage Examples

### Basic Usage

```javascript
const strategy = new MultiTableWaterfallStrategy({
  referenceTables: [...],
  matchingRules: {...},
  thresholds: {...}
});

const sql = strategy.generateSql({
  sourceTable: "customer_data"
});
```

### With Multiple Matches

```javascript
const strategy = new MultiTableWaterfallStrategy({
  // ... configuration as above ...
  allowMultipleMatches: true,
  maxMatches: 3
});
```

### With Custom Field Mappings

```javascript
const strategy = new MultiTableWaterfallStrategy({
  // ... base configuration ...
  fieldMappings: {
    "verified_customers": [
      { sourceField: "first_name", targetField: "first_name_mapped" },
      { sourceField: "last_name", targetField: "last_name_mapped" },
      { expression: "CONCAT(first_name, ' ', last_name)", as: "full_name" }
    ]
  }
});
```

## Performance Optimization

When working with large datasets or many reference tables:

1. Ensure effective blocking rules to limit join size
2. Order reference tables by priority and expected match rate
3. Pre-filter reference tables to reduce data volume
4. Consider adding indexes on blocking fields

See [Performance Best Practices](./performance_best_practices.md) for more optimization tips.

## Related Documentation

- [Waterfall Matching Approach](./adr/001-waterfall-matching-approach.md)
- [Multi-Table Waterfall Edge Cases](./multi_table_waterfall_edge_cases.md) 