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

- Organize reusable JavaScript functions and modules in the `includes/` directory.
- Structure includes into subdirectories based on functionality (e.g., `core/`, `matching/`, `utils/`).
- Document each function and module with JSDoc comments.
- Write unit tests for JavaScript includes in the `tests/includes/` directory.

## SQLX Definitions

### General SQL Best Practices

- Follow a consistent code style for SQL (e.g., uppercase keywords, consistent indentation).
- Break down complex SQL queries into smaller, more manageable chunks using CTEs (Common Table Expressions).
- Use comments liberally to explain complex logic, transformations, and assumptions within SQL queries.
- Avoid excessively long lines of SQL code. Break lines for readability, especially for long `SELECT` lists or `WHERE` clauses.
- Use consistent indentation (e.g., 2 spaces) for SQL code blocks within JavaScript templates.

### Parameterization

- Use variables to parameterize dataset and table names in your SQLX definitions. This makes your Dataform project more portable and easier to configure for different environments (e.g., development, testing, production).

- **Define variables in `config` blocks within SQLX files:**
    - Use the `vars` configuration option within the `config {}` block of your SQLX files to define variables.
    - This is useful for project-specific configurations that may vary between different Dataform projects or environments.

- **Example of defining variables in SQLX config:**
```javascript
config: {
  type: "table",
  name: "my_parameterized_table",
  description: "Example table using parameterized dataset and table names",
  vars: {
    project_id: "your_project_id", // Replace with your GCP project ID
    dataset_id: "your_dataset_id",  // Replace with your BigQuery dataset ID
    table_name: "your_table_name"   // Replace with your table name
  }
}
```

- **Reference variables in your SQL code:**
    - Reference variables in your SQL code using the `${dataform.projectConfig.vars.variableName}` syntax.
    - This allows you to dynamically insert variable values into your SQL queries at runtime.

- **Example of referencing variables in SQL code:**
```sql
SELECT *
FROM `${dataform.projectConfig.vars.project_id}.${dataform.projectConfig.vars.dataset_id}.${dataform.projectConfig.vars.table_name}`
WHERE date_partition = current_date()
```

- For example, to parameterize table names in `definitions/analysis/schema_analysis.sqlx` and `definitions/analysis/field_type_inference.sqlx`, define `sourceTableA` and `sourceTableB` vars in the config:

```javascript
config: {
  type: "table",
  description: "Analyzes source schemas and stores analysis results",
  vars: {
    project_id: "your_project_id",
    dataset_id: "your_dataset_id",
    sourceTableA: "your_dataset.source_customers_a",
    sourceTableB: "your_dataset.source_customers_b" 
  }
}
```

- Then, in the JavaScript section of the SQLX file, reference these variables when calling functions that generate SQL queries:

```javascript
js`WITH schema_analysis AS (
  ${schemaAnalyzer.generateAnalysisSql(dataform.projectConfig.vars.project_id, dataform.projectConfig.vars.dataset_id, sourceTables)}
),
field_type_inference AS (
  ${fieldTypeInference.generateInferenceSql(dataform.projectConfig.vars.project_id, dataform.projectConfig.vars.dataset_id, dataform.projectConfig.vars.table_id)}
)
-- ... rest of your query
`
```

### Performance and Optimization

- Optimize SQL queries for performance, considering aspects like filtering, indexing, and partitioning.
- Use `LIMIT` clauses when sampling data or for development/testing queries to avoid processing large datasets.
- Be mindful of BigQuery cost implications and strive to write efficient queries.
- Consider using Dataform's built-in features for performance optimization, such as partitioning and clustering.

### Error Handling and Resilience

- Implement error handling in JavaScript code to gracefully manage potential issues (e.g., database connection errors, invalid input).
- Use `try-catch` blocks in JavaScript code to handle exceptions and prevent job failures.
- Log errors and warnings appropriately to aid in debugging and monitoring.
- Design SQL queries to be resilient to data quality issues (e.g., handle NULL values gracefully).

### Security Best Practices

- Avoid hardcoding sensitive information (credentials, API keys) directly in SQL or JavaScript code.
- Use Dataform's secret management capabilities or environment variables to handle sensitive configuration.
- Follow BigQuery security best practices, such as least privilege access control.
- Regularly review and update dependencies to address potential security vulnerabilities.

### Documentation and Comments

- Add clear and concise comments to SQL queries to explain the logic and purpose of different sections.
- Document Dataform variables, their purpose, and expected values in README or documentation files.
- Provide descriptions for all Dataform tables, views, and operations using the `config {}` block.
- Document any assumptions, dependencies, or limitations of SQL queries and Dataform workflows.

### Testing and Validation

- Implement unit tests in JavaScript to validate the logic of custom functions and modules.
- Use Dataform's built-in testing framework to create data quality tests for SQL definitions.
- Test data transformations and aggregations to ensure correctness.
- Regularly run tests to catch regressions and ensure the reliability of the Dataform project.

### Code Organization and Modularity

- Organize Dataform project files logically into directories (e.g., definitions, includes, docs, tests).
- Break down complex Dataform workflows into smaller, modular components (e.g., separate SQLX files for different transformations).
- Reuse common JavaScript functions and SQL snippets using includes and Dataform modules.
- Follow the DRY (Don't Repeat Yourself) principle to avoid code duplication and improve maintainability.

By adhering to these standards, Dataform projects can be developed in a robust, maintainable, and scalable manner, ensuring data quality and efficient workflows.