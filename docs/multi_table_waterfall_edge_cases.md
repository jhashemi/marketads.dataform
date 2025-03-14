# Multi-Table Waterfall Strategy: Edge Case Handling

This document outlines how the Multi-Table Waterfall strategy handles various edge cases and boundary conditions that may occur during production usage. Proper handling of these edge cases ensures robust performance and prevents unexpected failures when dealing with real-world data.

## Edge Cases Addressed

### 1. Empty Reference Tables

**Problem**: When a reference table contains no data, SQL joins would return no results, potentially causing entire matching pipelines to fail.

**Solution**: The strategy now includes an `EXISTS` check for each reference table before attempting joins:

```sql
WHERE 
  -- Check if table has data
  EXISTS (SELECT 1 FROM ${refTable.table} LIMIT 1)
  -- Apply score threshold
  AND ${scoreCalculation} >= ${thresholds.low}
```

This ensures that the query execution continues even if one or more reference tables are empty, moving on to the next reference table in the priority list.

### 2. Missing Required Fields

**Problem**: When required fields are missing in the source or reference data, this could lead to incorrect matching or SQL errors.

**Solution**: The strategy now uses `COALESCE` to handle nulls in field mappings:

```sql
COALESCE(${targetAlias}.${this._escapeFieldName(mapping.sourceField)}, NULL) AS ${this._escapeFieldName(mapping.targetField)}
```

Required field conditions are also applied conditionally, ensuring that the SQL remains valid even when fields are missing:

```sql
${requiredFieldsCondition ? `AND ${requiredFieldsCondition}` : ''}
```

### 3. Special Characters in Field Names

**Problem**: Field names containing special characters, spaces, or SQL keywords can cause syntax errors when used directly in SQL queries.

**Solution**: The strategy now includes a field name escaping function that adds backticks around field names containing special characters:

```javascript
_escapeFieldName(fieldName) {
  if (!fieldName) return 'id';
  
  // If the field name contains special characters, escape it with backticks
  return fieldName.match(/[-\s.]/) ? `\`${fieldName}\`` : fieldName;
}
```

All field references in the generated SQL now use this function to ensure proper escaping.

### 4. Extreme Threshold Values

**Problem**: Invalid threshold values (negative, greater than 1, or not numbers) can cause unexpected behavior in confidence scoring.

**Solution**: The strategy now normalizes all threshold values to ensure they are valid numbers between 0 and 1, and in the correct order:

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

### 5. Extreme Confidence Multipliers

**Problem**: Very large or very small confidence multipliers could skew results unexpectedly.

**Solution**: The strategy properly handles extreme multipliers by explicitly parsing them as floats:

```javascript
const confidenceMultiplier = parseFloat(refTable.confidenceMultiplier || 1.0);
const scoreCalculation = `(${this._generateScoreSql(rules, sourceAlias, targetAlias)} * ${confidenceMultiplier})`;
```

This ensures that even extreme values are properly applied in a consistent manner.

### 6. Large Number of Reference Tables

**Problem**: A large number of reference tables could lead to overly complex SQL or performance issues.

**Solution**: The strategy can handle any number of reference tables by dynamically generating CTEs for each one and combining them with UNION ALL operations. Each reference table is processed independently before the final results are ranked:

```sql
// Generate SQL for each reference table match
const matchCTEs = [];

this.referenceTables.forEach((refTable, index) => {
  // Generate match CTE for this reference table
  // ...
  matchCTEs.push(matchCTE);
  sql += `\n, ${matchSql}`;
});

// Combine all matches with UNION ALL
sql += `
, ranked_matches AS (
  SELECT 
    *,
    ROW_NUMBER() OVER (
      PARTITION BY ${sourceKey}
      ORDER BY 
        table_priority,
        confidence_rank,
        match_score DESC
    ) AS match_rank
  FROM (
    ${matchCTEs.map(cte => `SELECT * FROM ${cte}`).join('\nUNION ALL\n')}
  ) all_matches
)
`;
```

### 7. Missing Matching Rules

**Problem**: If matching rules are not defined for a reference table, SQL generation would fail.

**Solution**: The strategy now performs upfront validation of matching rules:

```javascript
_validateMatchingRules() {
  if (!this.matchingRules || Object.keys(this.matchingRules).length === 0) {
    throw new Error('No matching rules defined for any reference table');
  }
  
  // Check each reference table has matching rules
  this.referenceTables.forEach(refTable => {
    if (!this.matchingRules[refTable.id] && !this.matchingRules.default) {
      throw new Error(`No matching rules defined for reference table ${refTable.id}`);
    }
  });
}
```

This ensures that problems are detected early in the initialization phase rather than during SQL execution.

## Testing Edge Cases

Each edge case is covered by specific tests in `tests/integration/multi_table_waterfall_edge_cases.js`. These tests validate that:

1. The strategy correctly handles empty reference tables
2. Missing required fields are properly managed 
3. Special characters in field names are escaped
4. Extreme threshold values are normalized
5. Extreme confidence multipliers are properly applied
6. Large numbers of reference tables work correctly
7. Missing matching rules are properly validated and reported

## Performance Considerations

Edge case handling introduces minimal overhead to the SQL generation process. Most validations occur during initialization, and SQL generation includes only the necessary handling logic.

For situations where performance is critical, consider the following:

1. Pre-validate reference tables to ensure they contain data before executing matching
2. Pre-process field names to avoid special characters when possible
3. Set reasonable defaults for thresholds and confidence multipliers

## Future Improvements

Future enhancements to edge case handling may include:

1. Caching of generated SQL fragments for repeated patterns
2. Advanced error reporting with specific suggestions for fixes
3. Performance optimizations for extremely large numbers of reference tables 