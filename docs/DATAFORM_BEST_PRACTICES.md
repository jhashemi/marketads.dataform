# Dataform Best Practices

This document outlines the best practices for developing, testing, and maintaining Dataform code in the MarketAds matching system.

## Project Structure

```
marketads.dataform/
├── dataform.json        # Main configuration file
├── definitions/         # SQLX files defining tables, views, and assertions
│   ├── sources/         # Tables/views that reference raw data sources
│   ├── intermediate/    # Intermediate tables for complex transformations
│   ├── matching/        # Matching-specific tables and views
│   ├── outputs/         # Final output tables
│   ├── tests/           # Test assertions
│   └── ...              # Additional domain-specific directories
├── includes/            # Reusable JavaScript code
│   ├── core/            # Core utilities and functions
│   ├── matching/        # Matching-specific functions
│   ├── match_strategies/# Strategy pattern implementations
│   └── ...              # Additional utility directories
└── tests/               # JavaScript unit tests for includes
    ├── includes/        # Tests for includes code
    └── utils/           # Test utilities
```

## Dataform Configuration

### dataform.json

The `dataform.json` file should include:

```json
{
  "defaultSchema": "onpointdata",
  "warehouse": "bigquery",
  "assertionSchema": "dataform_assertions",
  "defaultDatabase": "project-id",
  "defaultLocation": "US"
}
```

## JavaScript Includes

### Best Practices

1. **Modular Design**: Create small, focused modules that do one thing well.
2. **Proper Exports**: Always use `module.exports` to export functions and objects:

```javascript
function calculateSimilarity(a, b) {
  // Implementation
}

module.exports = {
  calculateSimilarity
};
```

3. **Self-Contained**: Each include should be self-contained or explicitly require its dependencies.
4. **Documentation**: Add JSDoc comments to all functions and parameters.
5. **Error Handling**: Handle edge cases and provide meaningful error messages.

### Including in SQLX Files

1. **Top-Level Includes**: Reference using filename without extension:

```
config { type: "table" }
SELECT ${utils.formatDate("date_column")} AS formatted_date
FROM ${ref("source_table")}
```

2. **Nested Includes**: Use JavaScript `require()` function:

```
config { type: "table" }
js {
  const { formatDate } = require("includes/utils/date_formatting");
}
SELECT ${formatDate("date_column")} AS formatted_date
FROM ${ref("source_table")}
```

## SQLX Definitions

### Table Configuration

```
config {
  type: "table", // table, view, incremental, or assertion
  name: "table_name", // Optional - defaults to filename
  description: "Description of the table",
  columns: {
    column1: "Description of column1",
    column2: "Description of column2"
  },
  tags: ["tag1", "tag2"],
  dependencies: ["other_table"], // Optional - use ref() is preferred
  assertions: {
    uniqueKey: ["id"],
    nonNull: ["required_field"]
  }
}
```

### Using JavaScript in SQLX

```
config { type: "table" }

js {
  // JavaScript code here
  const tableName = "source_data";
  function buildQuery(table) {
    return `SELECT * FROM ${table}`;
  }
}

-- SQL with JS interpolation
${buildQuery(tableName)}
```

## Testing

### Assertion Tests

Create assertions to validate data quality:

```
config {
  type: "assertion",
  name: "valid_customer_email",
  description: "Ensures all customer emails are valid",
  tags: ["test", "data_quality"]
}

-- This query should return 0 rows if the test passes
SELECT customer_id, email 
FROM ${ref("customers")}
WHERE email IS NOT NULL AND 
      NOT REGEXP_CONTAINS(email, r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
```

### Unit Testing JavaScript Includes

Create unit tests for JavaScript functions in the `tests/` directory:

```javascript
// tests/includes/matching_functions_test.js
const assert = require("assert");
const matchingFunctions = require("../../includes/matching_functions");

describe("matchingFunctions", () => {
  describe("calculateNameSimilarity", () => {
    it("should return high similarity for similar names", () => {
      const result = matchingFunctions.calculateNameSimilarity("John Smith", "Jon Smith");
      assert(result > 0.8, `Expected similarity > 0.8 but got ${result}`);
    });
  });
});
```

Run tests using:

```
npm test
```

### Integration/SQL Testing

Create SQL assertions that validate your SQL logic:

```
config {
  type: "assertion",
  name: "test_matching_logic",
  description: "Tests the customer matching logic",
  tags: ["test", "integration"]
}

WITH test_data AS (
  SELECT 
    1 AS customer_id,
    "John" AS first_name,
    "Smith" AS last_name,
    "john.smith@example.com" AS email
  UNION ALL
  SELECT 
    2 AS customer_id,
    "Jon" AS first_name,
    "Smith" AS last_name,
    "jon.smith@example.com" AS email
)

-- This should return 0 rows if all matches are correctly found
SELECT *
FROM test_data t
WHERE NOT EXISTS (
  SELECT 1
  FROM ${ref("customer_matches")} m
  WHERE m.source_id = t.customer_id
  AND m.match_confidence > 0.8
)
```

## Running and Scheduling

### CLI Commands

```bash
# Compile the project
dataform compile

# Run a specific action
dataform run --actions "schema.table_name"

# Run all tables with a specific tag
dataform run --tags "tag_name"

# Run test assertions
dataform run --tags "test"

# Create a schedule
dataform create-schedule --cron "0 2 * * *" --actions "schema.final_output"
```

## Performance Considerations

1. **Partition Tables**: Use partitioning for large tables.
2. **Clustering**: Add clustering keys for frequently filtered columns.
3. **Incremental Tables**: Use incremental tables for append-only data.
4. **Cost Control**: Limit data processed by using partitioning and WHERE clauses.

## Debugging Tips

1. **Preview SQL**: Use `dataform compile` to view the generated SQL.
2. **Test Small**: Create small test datasets for faster iteration.
3. **Assertions**: Create assertions to validate your assumptions.
4. **Logging**: Add comments and logs to track execution flow.

## Resources

- [Dataform Documentation](https://cloud.google.com/dataform/docs)
- [BigQuery SQL Reference](https://cloud.google.com/bigquery/docs/reference/standard-sql/functions-and-operators)
- [Dataform GitHub Repository](https://github.com/dataform-co/dataform) 