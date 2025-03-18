# ADR 002: Parameterize SQL Definitions in Dataform

## Status

Accepted

## Context

We need to avoid hardcoding values like project IDs, dataset IDs, and table names within SQLX files and JavaScript code that generates SQL. This improves maintainability, portability, and allows for easier configuration across different environments (development, testing, production).

## Decision

We will leverage Dataform's built-in variable substitution mechanism for parameterizing SQL definitions. Specifically, we will:

1.  Define variables within the `config` block of SQLX files using the `vars` property.
2.  Reference these variables within the SQL code using the `${dataform.projectConfig.vars.variableName}` syntax.
3.  For JavaScript code that generates SQL (e.g., `schema_analyzer.js`), we will pass in the necessary parameters (project ID, dataset ID, table names) to the functions, and these functions will construct the SQL query strings using template literals.

## Consequences

*   **Pros:**
    *   Centralized configuration: Variables are defined in a single location (Dataform's `config` block).
    *   Environment-specific values: Dataform allows for overriding variables based on the environment, making it easy to manage different configurations.
    *   Improved readability: SQL code becomes more readable and less cluttered with hardcoded values.
    *   Reduced risk of errors: Avoids manual errors when updating configurations.
    *   Consistency: Enforces a consistent approach to parameterization across the project.

*   **Cons:**
    *   Reliance on Dataform: This approach is specific to Dataform. If the project moves to a different platform, the parameterization mechanism will need to be adapted.
    *   Limited expressiveness: Dataform's variable substitution is primarily string-based. For more complex parameterization logic, we might need to rely on JavaScript code within SQLX files, which can become less readable.