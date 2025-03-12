# SQL Generation Standards

## Overview

This document outlines the coding standards and best practices for generating SQL queries in JavaScript for the Dataform project. Following these guidelines will help ensure consistency, maintainability, and prevent common errors.

## JavaScript Regex Patterns

### Regular Expression Syntax

- **DO NOT** use Python-style raw string notation (`r'pattern'`). This is not valid in JavaScript.
- **DO** use standard JavaScript string literals with proper escaping: `'pattern'`.

Example:
```javascript
// INCORRECT - Python-style
sql = `REGEXP_REPLACE(${field}, r'[^a-zA-Z0-9]', '')`;

// CORRECT - JavaScript-style
sql = `REGEXP_REPLACE(${field}, '[^a-zA-Z0-9]', '')`;
```

When working with regular expressions in BigQuery SQL strings:

1. For simple patterns, use standard string literals with escaped characters:
   ```javascript
   `REGEXP_REPLACE(${field}, '[^a-zA-Z0-9]', '')`
   ```

2. For complex patterns with many backslashes, use double escaping:
   ```javascript
   `REGEXP_REPLACE(${field}, '\\\\b(word)\\\\b', 'replacement')`
   ```

## SQL String Generation

### Template Literals

- Use template literals (backticks) for SQL generation to improve readability.
- Indent SQL statements properly for readability.

Example:
```javascript
function generateQuery(table, field) {
  return `
    SELECT
      ${field},
      COUNT(*) as count
    FROM ${table}
    GROUP BY ${field}
    ORDER BY count DESC
  `;
}
```

### SQL Injection Prevention

- Always validate and sanitize inputs that are inserted into SQL.
- Use parameters and prepared statements when working with actual database connections.

### Handling NULL Values

- Be defensive when generating SQL - always handle NULL cases.

Example:
```javascript
// Good practice
function compareFields(field1, field2) {
  return `
    CASE
      WHEN ${field1} IS NULL OR ${field2} IS NULL THEN FALSE
      ELSE ${field1} = ${field2}
    END
  `;
}
```

## Naming Conventions

### Function Names

- Use camelCase for function names: `generateMatchingQuery()`, not `generate_matching_query()`.
- Use descriptive names that indicate what SQL is being generated.

### SQL Method Parameters

- Be consistent with parameter names. If a method accepts "jaro_winkler" as a parameter value, don't also use "jaro_winkle" elsewhere.
- Document all valid parameter values in JSDoc comments.

Example:
```javascript
/**
 * @param {string} method - Similarity method ('levenshtein', 'jaro_winkler', 'equality')
 */
```

### Abbreviations

- Be consistent with abbreviations in SQL string literals.
- For street types and other standardized values:
  - "avenue" → "ave"
  - "boulevard" → "blvd"
  - "circle" → "cir" (not "ci")
  - "court" → "ct"
  - "drive" → "dr" (not "d")
  - "lane" → "ln"
  - "place" → "pl"
  - "road" → "rd"
  - "street" → "st"
  - "terrace" → "ter" (not "te")

## Documentation

### JSDoc

- Document all functions with JSDoc comments.
- Include parameter descriptions and return value types.
- Provide examples for complex functions.

Example:
```javascript
/**
 * Generates SQL for standardizing a name field
 * @param {string} field - Field name to standardize
 * @param {Object} options - Standardization options
 * @param {boolean} [options.removePrefix=true] - Whether to remove name prefixes
 * @param {boolean} [options.removeSuffix=true] - Whether to remove name suffixes
 * @returns {string} SQL expression for name standardization
 * 
 * @example
 * // Returns: REGEXP_REPLACE(UPPER(TRIM(full_name)), '^(MR|MRS)\\s+', '')
 * standardizeName('full_name', { removePrefix: true, removeSuffix: false })
 */
```

## Testing

- Write unit tests for all SQL generation functions.
- Test edge cases, especially with regular expressions.
- Validate generated SQL against BigQuery's syntax requirements.

## Common Issues to Avoid

1. **Python vs. JavaScript regex**: JavaScript doesn't use the `r''` prefix for raw strings.
2. **Inconsistent naming**: Use the same terminology throughout the codebase.
3. **Missing NULL handling**: Always account for NULL values in generated SQL.
4. **Insufficient escaping**: Be aware of the layers of escaping needed (JavaScript → SQL → RegExp).
5. **Ambiguous expressions**: Parenthesize expressions when their precedence might be ambiguous.

By following these standards, we can maintain a consistent and error-free SQL generation codebase. 