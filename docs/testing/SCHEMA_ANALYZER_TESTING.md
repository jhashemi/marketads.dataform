# Schema Analyzer Testing

This document outlines the testing strategy for the `schema_analyzer.js` module, including unit and integration tests.

## Unit Tests

Unit tests are located in `tests/unit/schema_analyzer_test.js`. These tests use Jest mocking to isolate the logic of `schema_analyzer.js` and verify its behavior without connecting to a real database.

To run the unit tests:

```bash
npm test tests/unit/schema_analyzer_test.js
```

## Integration Tests

Integration tests are located in `tests/integration/schema_analyzer_integration_test.js`.

**Current Status:** Placeholder.  These tests are not yet fully implemented due to limitations in the current development environment.

**Future Implementation:** These tests will require a dedicated test environment with a BigQuery dataset and tables populated with representative data. They should leverage Dataform's testing framework to execute queries and verify the results.

**Environment Setup (Future):**

1.  **BigQuery Project and Dataset:** Create a dedicated BigQuery project and dataset for testing purposes (e.g., `your-project-testing`, `test_data`).
2.  **Test Tables:** Create test tables within the test dataset that mirror the structure of your production tables, but contain a smaller, representative set of data.
3.  **Dataform Configuration:** Ensure your Dataform project is configured to connect to the test project and dataset. This might involve setting environment variables or modifying the `dataform.json` file.
4.  **Credentials:** Ensure that the necessary credentials (e.g., a service account key) are available to the testing environment to allow Dataform to access BigQuery.
5. **Test Data:** Populate the test tables with data.

**Running Integration Tests (Future):**

Once the environment is set up, integration tests can be executed using Dataform's testing framework. The exact command may vary depending on the project setup, but it will likely involve running Dataform with a specific target or configuration that points to the test environment.

**Example (Illustrative):**

```bash
dataform test --project=your-project-testing --dataset=test_data
```

**Note:** The above command is an example and may need to be adjusted based on your specific Dataform project configuration.

**Test Coverage:**

Integration tests should cover the following scenarios:

*   Successful retrieval of schema information from BigQuery.
*   Correct identification of common fields between tables.
*   Accurate calculation of schema similarity.
*   Proper identification of potential blocking and matching fields.
*   Error handling for invalid inputs and database connection issues.
*   Verification that parameterized table names are correctly used in generated SQL.