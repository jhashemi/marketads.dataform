# ADR 001: Use Dataform Native BigQuery Access

## Status

Accepted

## Context

The `schema_analyzer.js` module needs to interact with BigQuery to retrieve schema information. Initially, a simulated database connector (`dbConnector`) was used. The requirement is to replace this with a real database connection, leveraging Dataform's capabilities.

## Decision

We will use Dataform's native BigQuery access capabilities instead of creating a custom database connector or using a separate Node.js BigQuery library. This approach leverages Dataform's built-in functionalities and simplifies the integration.  The `schema_analyzer.js` module will be modified to generate the necessary parameters (project ID, dataset ID, table IDs) for Dataform SQLX files, which will then execute the queries against BigQuery's `INFORMATION_SCHEMA`.

## Consequences

*   **Pros:**
    *   Simplified integration with Dataform.
    *   No need for managing external database connection libraries or credentials within the JavaScript code.
    *   Leverages Dataform's existing configuration and execution environment.
    *   Improved maintainability and consistency with the Dataform project.

*   **Cons:**
    *   Tight coupling with Dataform.  If the project moves away from Dataform, this component will need significant rework.
    *   Limited ability to perform complex database operations directly within the JavaScript code (relying on Dataform SQLX for query execution).
    * May make it more difficult to unit test as Dataform functions will need to be mocked.