# Mock Implementations for External Dependencies

## Overview

This document describes the mock implementations created for external npm dependencies to ensure that the Dataform project adheres to best practices by generating SQL expressions instead of relying on JavaScript libraries.

## Why Mocks Instead of NPM Packages?

Dataform works best when code generates SQL expressions rather than performing JavaScript operations. This approach:

1. Ensures that all data processing happens in BigQuery, leveraging its scalability and performance
2. Maintains a clear separation between control flow (JavaScript) and data processing (SQL)
3. Allows Dataform to optimize and analyze the generated SQL
4. Avoids dependency on external libraries that might not be compatible with Dataform's execution environment

## Mock Implementations

### 1. phonetic-algorithms

**Original Package**: A JavaScript library for phonetic matching algorithms like Soundex, Metaphone, etc.

**Mock Implementation**: `includes/mocks/phonetic-algorithms.js`

```javascript
// Instead of performing JavaScript calculations, we generate SQL expressions
// that use BigQuery's native functions for phonetic matching
module.exports = {
  soundex: (column) => `SOUNDEX(${column})`,
  levenshtein: (str1, str2) => `LEVENSHTEIN(${str1}, ${str2})`,
  // ... other functions
};
```

**How It Works**:
- The mock returns SQL expressions using BigQuery's built-in functions
- Each function takes SQL column references as input and returns SQL expressions
- When compiled by Dataform, these expressions become part of the generated SQL query

### 2. addresser

**Original Package**: A library for parsing and standardizing address components

**Mock Implementation**: `includes/mocks/addresser.js`

```javascript
// Instead of parsing addresses in JavaScript, we generate SQL that standardizes addresses
module.exports = {
  parseAddress: (addressColumn) => {
    return {
      sql: (parts) => {
        if (parts === 'street') {
          return `REGEXP_EXTRACT(${addressColumn}, r'^(.*?)(?:,|$)')`;
        } else if (parts === 'city') {
          return `REGEXP_EXTRACT(${addressColumn}, r'(?:^|,\\s*)(\\w[\\w\\s]*?)(?:,|$)', 1)`;
        }
        // ... other parts
      }
    };
  },
  standardizeAddress: (addressColumn) => 
    `REGEXP_REPLACE(REGEXP_REPLACE(${addressColumn}, 
    r'\\b(Street|Road|Avenue|Lane|Drive|Boulevard|Court)\\b', 
    r'\\1'), r'\\b(St|Rd|Ave|Ln|Dr|Blvd|Ct)\\b', r'')`,
};
```

**How It Works**:
- The mock generates SQL expressions for address parsing and standardization
- Uses BigQuery's REGEXP functions for pattern matching and extraction
- Returns SQL fragments that will be composed into larger queries

## Integration with Existing Code

The mock implementations are integrated through:

1. A `package.json` file in the `includes/mocks` directory to make it recognizable as a module
2. An `index.js` file that exports all mock modules
3. Updated import statements in files that previously used the npm packages

## Benefits

- **No External Dependencies**: Reduces the need for external npm packages
- **SQL-First Approach**: All data transformations happen in BigQuery
- **Performance**: Leverages BigQuery's optimized functions
- **Maintainability**: Simplifies the codebase by reducing the mixing of JavaScript and SQL logic
- **Testability**: Easier to test as the output is predictable SQL expressions

## Limitations

- Limited to functionality available in BigQuery SQL. For functionalities not directly available, consider creating UDFs (User-Defined Functions) in BigQuery instead of relying on external JavaScript libraries.
- Some complex algorithms may need to be reimplemented or approximated using BigQuery SQL.
- Mock implementations are basic and may not cover all edge cases or functionalities of the original libraries. They are intended to provide sufficient functionality for Dataform SQL generation in this project.
- May not produce identical results to the original libraries in all cases, especially for complex logic or edge cases.

## Database Connector Mock - No Longer Used

The `dbConnector` mock, which was initially used in `includes/rules/schema_analyzer.js` to simulate database interactions, is no longer used. The `schema_analyzer.js` module now leverages Dataform's native capabilities to query BigQuery directly, using INFORMATION_SCHEMA. 

The `includes/bigquery/db_connector.js` file, which was planned to house a real database connector, is therefore no longer needed and was not created.

Database interactions are now handled directly within Dataform SQLX files and JavaScript code using Dataform's built-in functions and variable substitution, as documented in ADR 002 and `docs/DATAFORM_BEST_PRACTICES.md`. The configuration for database connections is managed within the `dataform.json` file and the `config` blocks of SQLX definitions, using Dataform's native project and dataset settings.