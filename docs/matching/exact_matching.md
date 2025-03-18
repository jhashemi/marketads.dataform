# Exact Matching

This document explains the exact matching functionality within the MarketAds Dataform project.

## Overview

The exact matcher provides functionality for comparing values with exact equality, with options for normalization and tolerance. It supports comparing strings, numbers, dates, booleans, and handling null values.

## Use Cases

- **Email Matching**: Exact matching for email addresses (case-insensitive)
- **ID Matching**: Matching records based on unique identifiers
- **Code Matching**: Matching product codes, SKUs, or other coded identifiers
- **Boolean Flag Matching**: Matching records based on boolean flags (e.g., opt-in status)
- **Categorical Data Matching**: Matching records based on category or status values
- **Numeric Matching with Tolerance**: Matching numeric values within a specified tolerance

## Getting Started

### Basic Usage

```javascript
const { getExactMatcher } = require('../../includes/matching/exact_matcher');

// Create an exact matcher with default settings
const matcher = getExactMatcher();

// Simple exact matching
const result = matcher.match('test@example.com', 'test@example.com');
console.log(`Emails match: ${result.isMatch}`); // true
console.log(`Match score: ${result.score}`); // 1.0

// Matching with different values
const result2 = matcher.match('test@example.com', 'other@example.com');
console.log(`Emails match: ${result2.isMatch}`); // false
console.log(`Match score: ${result2.score}`); // 0.0
```

### Case-insensitive Matching

```javascript
// Create a case-insensitive matcher
const caseInsensitiveMatcher = getExactMatcher({
  caseSensitive: false
});

// Match with different case
const result = caseInsensitiveMatcher.match(
  'Test@Example.com', 
  'test@example.com'
);

console.log(`Emails match: ${result.isMatch}`); // true
console.log(`Match score: ${result.score}`); // 1.0
```

### Numeric Matching with Tolerance

```javascript
// Create a matcher with numeric tolerance
const numericMatcher = getExactMatcher({
  tolerance: 0.001 // Allow 0.001 difference for numeric values
});

// Match numbers that are close
const result = numericMatcher.match(1.0001, 1.0);
console.log(`Numbers match: ${result.isMatch}`); // true
console.log(`Match score: ${result.score}`); // 1.0

// Match numbers outside tolerance
const result2 = numericMatcher.match(1.01, 1.0);
console.log(`Numbers match: ${result2.isMatch}`); // false
console.log(`Match score: ${result2.score}`); // 0.0
```

### String Normalization

```javascript
// Create a matcher with string normalization
const normalizingMatcher = getExactMatcher({
  trim: true,           // Remove leading/trailing whitespace
  caseSensitive: false  // Case-insensitive comparison
});

// Match with different case and whitespace
const result = normalizingMatcher.match(
  '  Test String  ', 
  'test string'
);

console.log(`Strings match: ${result.isMatch}`); // true
console.log(`Match score: ${result.score}`); // 1.0
```

## Configuration Options

The exact matcher supports the following configuration options:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `trim` | boolean | `false` | Whether to trim whitespace from string values |
| `caseSensitive` | boolean | `true` | Whether string comparison is case-sensitive |
| `tolerance` | number | `0` | Tolerance for numeric equality |
| `nullEqualsNull` | boolean | `true` | Whether null equals null |
| `defaultThreshold` | number | `1.0` | Default threshold for match classification |

Example of setting multiple options:

```javascript
const matcher = getExactMatcher({
  trim: true,
  caseSensitive: false,
  tolerance: 0.01,
  nullEqualsNull: true,
  defaultThreshold: 0.9
});
```

## SQL Generation

The exact matcher can generate SQL for BigQuery to perform exact matching:

### Basic SQL Generation

```javascript
const { generateExactMatchSql } = require('../../includes/matching/exact_matcher');

// Generate SQL for exact matching
const sql = generateExactMatchSql(
  'customers.email', 
  'prospects.email', 
  { caseSensitive: false }
);

// Use the SQL in a query
const query = `
SELECT
  customers.id AS customer_id,
  prospects.id AS prospect_id,
  ${sql} AS exact_match_score
FROM
  customers
CROSS JOIN
  prospects
WHERE
  ${sql} = 1
`;
```

### Creating SQL Functions

```javascript
const { createExactMatchSqlFunction } = require('../../includes/matching/exact_matcher');

// Generate SQL to create an exact match function
const createFunctionSql = createExactMatchSqlFunction(
  'EXACT_MATCH', 
  { 
    caseSensitive: false,
    trim: true
  }
);

// Use the function in a query
const query = `
SELECT
  customer_id,
  prospect_id,
  EXACT_MATCH(customers.email, prospects.email) AS email_match
FROM
  customers,
  prospects
WHERE
  EXACT_MATCH(customers.email, prospects.email) = 1
`;
```

## Value Normalization

The exact matcher provides robust value normalization capabilities:

### String Normalization

```javascript
const { normalizeValue } = require('../../includes/matching/exact_matcher');

// Normalize a string value
const normalized = normalizeValue('  Test String  ', {
  trim: true,           // Remove leading/trailing whitespace
  caseSensitive: false  // Convert to lowercase
});

console.log(normalized); // "test string"
```

### Number Normalization

```javascript
// Normalize a numeric value
const normalized = normalizeValue(42.3456, {
  precision: 2  // Round to 2 decimal places
});

console.log(normalized); // 42.35
```

### Date Normalization

```javascript
// Normalize a date value
const date = new Date('2023-04-15T14:30:45.123Z');
const normalized = normalizeValue(date, {
  dateFormat: 'YYYY-MM-DD'  // Format as YYYY-MM-DD
});

console.log(normalized); // "2023-04-15"
```

### Type Conversion

```javascript
// Convert between types
const stringToNumber = normalizeValue('42', {
  convertType: 'number'  // Convert string to number
});

console.log(stringToNumber); // 42 (number)

const numberToBoolean = normalizeValue(0, {
  convertType: 'boolean'  // Convert number to boolean
});

console.log(numberToBoolean); // false (boolean)
```

## Integration with Matching Engine

The exact matcher can be integrated with the matching engine:

```javascript
const { createMatchingSystem } = require('../../includes/matching');

// Create a matching system
const matchingSystem = createMatchingSystem({
  // Add exact matching configuration in the matching config
  matching: {
    exact: {
      enabled: true,
      fields: ['email', 'id', 'status'],
      caseSensitive: false,
      trim: true
    }
  }
});

// The matching system will automatically use exact matching
// for the specified fields when comparing records
```

## SQL Implementation Details

The exact matcher generates SQL that handles various edge cases:

### Case Sensitivity

```sql
-- Case-sensitive comparison
CASE
  WHEN field1 IS NULL OR field2 IS NULL THEN 0
  WHEN field1 = field2 THEN 1
  ELSE 0
END

-- Case-insensitive comparison
CASE
  WHEN field1 IS NULL OR field2 IS NULL THEN 0
  WHEN UPPER(field1) = UPPER(field2) THEN 1
  ELSE 0
END
```

### String Trimming

```sql
-- With trimming
CASE
  WHEN field1 IS NULL OR field2 IS NULL THEN 0
  WHEN TRIM(field1) = TRIM(field2) THEN 1
  ELSE 0
END
```

### Null Handling

```sql
-- nullEqualsNull: false
CASE
  WHEN field1 IS NULL OR field2 IS NULL THEN 0
  WHEN field1 = field2 THEN 1
  ELSE 0
END

-- nullEqualsNull: true
CASE
  WHEN field1 IS NULL AND field2 IS NULL THEN 1
  WHEN field1 IS NULL OR field2 IS NULL THEN 0
  WHEN field1 = field2 THEN 1
  ELSE 0
END
```

### Numeric Tolerance

```sql
-- With tolerance
CASE
  WHEN field1 IS NULL OR field2 IS NULL THEN 0
  WHEN ABS(field1 - field2) <= 0.001 THEN 1
  ELSE 0
END
```

## Common Use Cases

### ID Matching

When matching records based on unique identifiers:

```javascript
const idMatcher = getExactMatcher();

// Match customer records by ID
const result = idMatcher.match(
  customer1.id,
  customer2.id
);

if (result.isMatch) {
  console.log("Same customer ID");
}
```

### Email Matching (Case-Insensitive)

```javascript
const emailMatcher = getExactMatcher({
  caseSensitive: false,
  trim: true
});

// Match email addresses
const result = emailMatcher.match(
  ' User@Example.com ', 
  'user@example.com'
);

if (result.isMatch) {
  console.log("Email addresses match");
}
```

### Product Code Matching

```javascript
const productMatcher = getExactMatcher({
  trim: true
});

// Match product codes
const result = productMatcher.match(
  ' SKU-12345 ', 
  'SKU-12345'
);

if (result.isMatch) {
  console.log("Product codes match");
}
```

### Approximate Numeric Matching

```javascript
const priceMatcher = getExactMatcher({
  tolerance: 0.01 // Allow $0.01 difference
});

// Compare prices
const result = priceMatcher.match(
  19.99, 
  20.00
);

if (result.isMatch) {
  console.log("Prices are within tolerance");
} else {
  console.log(`Prices differ: ${Math.abs(19.99 - 20.00)}`);
}
```

## Performance Considerations

- Exact matching is computationally efficient compared to fuzzy matching
- Use exact matching when possible before falling back to more expensive comparisons
- For SQL operations, exact matching allows for indexed lookups
- Consider creating indices on fields used frequently for exact matching
- Use the combination of `trim` and `caseSensitive: false` only when necessary, as they add overhead

## API Reference

### Functions

| Function | Description |
|----------|-------------|
| `normalizeValue(value, options)` | Normalizes a value based on specified options |
| `exactMatch(value1, value2, options)` | Checks if two values match exactly |
| `generateExactMatchSql(field1, field2, options)` | Generates SQL for exact matching |
| `createExactMatchSqlFunction(functionName, options)` | Creates a SQL function for exact matching |
| `getExactMatcher(config)` | Creates an exact matcher with configuration |

### Matcher Methods

| Method | Description |
|--------|-------------|
| `match(value1, value2, options)` | Matches two values exactly |
| `generateSql(field1, field2, options)` | Generates SQL for exact matching |
| `createSqlFunction(functionName, options)` | Creates a SQL function for exact matching |
| `getConfig()` | Returns the current configuration |

## References

- [SQL CASE Expression](https://cloud.google.com/bigquery/docs/reference/standard-sql/conditional_expressions)
- [SQL String Functions](https://cloud.google.com/bigquery/docs/reference/standard-sql/string_functions)
- [SQL Mathematical Functions](https://cloud.google.com/bigquery/docs/reference/standard-sql/mathematical_functions)