# Plan for Schema Analyzer Improvement - Version 2 (Dataform Native Access)

This document outlines the detailed plan to improve the `schema_analyzer.js` module, addressing the issues of simulated database results and lack of unit tests. This plan incorporates the feedback to use Dataform's native BigQuery access and INFORMATION_SCHEMA.

## 1. Implement Real Database Interaction (Detailed Breakdown)

*   **1.1 Understand Dataform Native Access:**
    *   Action: Research and understand how to leverage Dataform's built-in functionalities to query BigQuery, specifically focusing on accessing `INFORMATION_SCHEMA` views. Refer to Dataform documentation and examples within the project if available.
    *   Output: Understanding of Dataform's native BigQuery access methods.
*   **1.2 Modify `schema_analyzer.js` to Use Dataform Native Access:**
    *   First Principle: Leverage existing platform capabilities.
    *   Action: Update `includes/rules/schema_analyzer.js` to directly use Dataform's native methods to query BigQuery `INFORMATION_SCHEMA` for schema information, row counts, and potentially sample data and field statistics (if feasible via `INFORMATION_SCHEMA`).  Remove the need for a separate `db_connector.js` file.
    *   Output: Updated `includes/rules/schema_analyzer.js` using Dataform native access.
*   **1.3 Implement Robust Error Handling (Revised):**
    *   First Principle: Reliability and Resilience.
    *   Action: Implement error handling within `schema_analyzer.js` to catch potential issues when querying BigQuery via Dataform. Use try-catch blocks and logging.
    *   Output: Error handling logic in `schema_analyzer.js`.
*   **1.4 Configure Database Project and Dataset (Using Dataform):**
    *   First Principle: Configuration Management within Dataform.
    *   Action: Ensure that the Dataform project is properly configured to connect to the correct BigQuery project and dataset. Document the configuration steps within Dataform's configuration files (e.g., `dataform.json` or similar). Update `docs/MOCK_IMPLEMENTATIONS.md` and `docs/STANDARDIZATION.md` to reflect Dataform configuration.
    *   Output: Dataform project configuration and updated documentation.
*   **1.5 Test Dataform Query Execution:**
    *   First Principle: Test-Driven Development.
    *   Action: Write unit tests (in `tests/unit/schema_analyzer_test.js`) to verify that `schema_analyzer.js` can successfully execute queries against BigQuery `INFORMATION_SCHEMA` using Dataform's native access. Mock Dataform-specific functions if necessary for unit testing isolation.
    *   Output: Passing unit tests for Dataform query execution.
*   **1.6 Update ADR 001 (Select DB Connector):**
    *   Action: Revise `docs/adr/001-select-bigquery-connector.md` to document the decision to use Dataform's native BigQuery access instead of a separate connector library. Justify this decision based on efficiency and leveraging platform capabilities.
    *   Output: Updated ADR `docs/adr/001-select-bigquery-connector.md`.
*   **1.7 Knowledge Graph Update:**
    *   Action: Update knowledge graph to reflect the use of Dataform's native BigQuery access and the removal of the separate `db_connector.js` concept.

## 2. Implement Unit Tests for `schema_analyzer.js` (Detailed Breakdown)

*   **2.1 Create Unit Test File:**
    *   Action: Create `tests/unit/schema_analyzer_test.js`.
    *   Output: `tests/unit/schema_analyzer_test.js` file.
*   **2.2 Write Unit Tests for Each Function:**
    *   First Principle: Test each behavior once and only once.
    *   Action: Implement unit tests for each function in `includes/rules/schema_analyzer.js` (`analyzeSchema`, `findCommonFields`, etc.). Follow Given-When-Then pattern in tests.
    *   Output: Comprehensive unit tests in `tests/unit/schema_analyzer_test.js`.
*   **2.3 Mock Dataform Native Access for Unit Tests:**
    *   Action: Adapt mocking strategy in `tests/unit/schema_analyzer_test.js` to mock Dataform-specific functions or methods used for querying BigQuery `INFORMATION_SCHEMA`. Ensure unit tests are isolated from actual BigQuery interactions.
    *   Output: Mocked Dataform native access in unit tests.
*   **2.4 Implement Test-Driven Development (TDD) Cycle:**
    *   First Principle: Write tests first.
    *   Action: For each function in `schema_analyzer.js`, write failing unit tests *before* modifying the code to interact with the real `dbConnector`. Follow red-green-refactor cycle.
    *   Output: Passing unit tests and refactored `schema_analyzer.js` code.
*   **2.5 Knowledge Graph Update:**
    *   Action: Add entities for unit tests and testing strategies to the knowledge graph. Document testing patterns observed during unit test implementation.

## 3. Refactor and Improve Code Quality & Parameterization (Detailed Breakdown)

*   **3.1 Code Review of `schema_analyzer.js`:**
    *   First Principle: Code Quality and Maintainability.
    *   Action: Conduct a detailed code review of `includes/rules/schema_analyzer.js` to identify code smells, areas for simplification, and potential performance bottlenecks.
    *   Output: Code review findings and identified areas for refactoring.
*   **3.2 Implement Input Validation:**
    *   First Principle: Data Integrity and Robustness.
    *   Action: Add input validation to all public functions in `schema_analyzer.js` to ensure data types, required parameters, and prevent unexpected behavior due to invalid inputs.
    *   Output: Input validation logic in `schema_analyzer.js`.
*   **3.3 Enhance Documentation (JSDoc):**
    *   First Principle: Documentation as Code.
    *   Action: Add comprehensive JSDoc comments to all functions, classes, and modules in `schema_analyzer.js`. Include parameter descriptions, return types, and usage examples.
    *   Output: JSDoc documentation in code.
*   **3.4 Evaluate and Refactor `areFieldNamesSimilar`:**
    *   First Principle: Algorithm Efficiency and Accuracy.
    *   Action: Re-evaluate the `areFieldNamesSimilar` function. If necessary, research and integrate a more robust string similarity library (e.g., using Levenshtein distance algorithm from a library instead of custom implementation, or considering libraries like `string-similarity`).
    *   Output: Refactored `areFieldNamesSimilar` function (if needed).
*   **3.5 Parameterization Strategy ADR:**
    *   First Principle: Document Decisions (ADRs).
    *   Action: Create an ADR (`docs/adr/002-parameterize-sql-definitions.md`) to define the strategy for parameterizing SQL definitions. Consider using Dataform variables, templating mechanisms, or a custom approach. Document pros and cons of each option and justify the chosen strategy.
    *   Output: ADR (`docs/adr/002-parameterize-sql-definitions.md`) defining parameterization strategy.
*   **3.6 Analyze Definition Files for Hardcoded Values:**
    *   Action: Analyze definition files, starting with `definitions/analysis/rule_recommendation.sqlx`, to identify hardcoded table names, schema names, and other values that should be parameterized.
    *   Output: List of hardcoded values to be parameterized.
*   **3.7 Implement Parameterization in Definition Files:**
    *   Action: Replace hardcoded values with parameters in the identified definition files, following the strategy defined in ADR `002`.
    *   Output: Parameterized SQL definition files.
*   **3.8 Test Parameterization:**
    *   First Principle: Testing Parameterized Logic.
    *   Action: Implement unit or integration tests to verify that parameterization works correctly. For SQLX files, this might involve testing the generated SQL queries with different parameter values.
    *   Output: Tests for parameterization and passing tests.
*   **3.9 Knowledge Graph Update:**
    *   Action: Document refactoring decisions, parameterization strategy, and code improvements in the knowledge graph. Add entities for ADRs and parameterized SQL definitions.

## 4. Implement Integration Tests (Detailed Breakdown)

*   **4.1 Create Integration Test File:**
    *   Action: Create `tests/integration/schema_analyzer_integration_test.js`.
    *   Output: `tests/integration/schema_analyzer_integration_test.js` file.
*   **4.2 Write Integration Tests for End-to-End Functionality:**
    *   First Principle: Test Component Interactions.
    *   Action: Implement integration tests to verify the complete workflow of `schema_analyzer.js` interacting with a real BigQuery database. Test data retrieval, schema analysis, and the correctness of function outputs when using real database data.
    *   Output: Comprehensive integration tests in `tests/integration/schema_analyzer_integration_test.js`.
*   **4.3 Document Environment Setup for Integration Tests:**
    *   Action: Document the necessary steps to set up the environment for running integration tests, including setting up a test BigQuery dataset, providing credentials, and any other prerequisites. Add this documentation to `docs/testing/SCHEMA_ANALYZER_TESTING.md`.
    *   Output: Documentation for integration test environment setup.
*   **4.4 Knowledge Graph Update:**
    *   Action: Document integration testing strategy and environment setup in the knowledge graph.

## 5. Documentation Updates (Detailed Breakdown)

*   **5.1 Update Schema Analyzer Documentation:**
    *   Action: Update `docs/intelligent_rule_selection.md` and `docs/rule_framework_and_analyzers_integration.md` to reflect the transition to real database interaction, the functionality of `schema_analyzer.js` with the real connector, and any changes in usage or behavior.
    *   Output: Updated documentation files.
*   **5.2 Document Testing Strategy for `schema_analyzer.js`:**
    *   Action: Create a new documentation file `docs/testing/SCHEMA_ANALYZER_TESTING.md` to comprehensively document the testing strategy for `schema_analyzer.js`, including unit and integration tests, test coverage goals, and how to run tests.
    *   Output: `docs/testing/SCHEMA_ANALYZER_TESTING.md` file.
*   **5.3 Document Parameterization of Definition Files:**
    *   Action: Update `docs/DATAFORM_BEST_PRACTICES.md` and `docs/SQL_GENERATION_STANDARDS.md` with detailed documentation and practical examples of how to parameterize SQL definitions in Dataform projects. Include guidance on parameterizing table names, schema names, and other configurable values.
    *   Output: Updated documentation files with parameterization guidance.
*   **5.4 Update `MOCK_IMPLEMENTATIONS.md` (Revised):**
        *   Action: Update `docs/MOCK_IMPLEMENTATIONS.md` to reflect the use of Dataform's native BigQuery access. Remove documentation related to a separate `db_connector.js` and instead document how Dataform's native access is used.
        *   Output: Updated `docs/MOCK_IMPLEMENTATIONS.md` file.
*   **5.5 Knowledge Graph Update:**
    *   Action: Ensure all documentation updates are reflected in the knowledge graph. Create relations between documentation files and relevant code components.

## C4 Model (Component View)

```mermaid
C4Component
    SystemBoundary(schemaAnalyzerSystem, "Schema Analyzer System") {
        Component(schemaAnalyzerModule, "Schema Analyzer Module", "includes/rules/schema_analyzer.js", "Analyzes table schemas to identify common fields, field statistics, and metadata using Dataform native access.")
        Component(dataformNativeAccess, "Dataform Native Access", "Dataform Platform", "Leverages Dataform's built-in capabilities to query BigQuery INFORMATION_SCHEMA.")
        Component(unitTests, "Unit Tests", "tests/unit/schema_analyzer_test.js (to be created)", "Unit tests for Schema Analyzer Module.")
        Component(integrationTests, "Integration Tests", "tests/integration/schema_analyzer_integration_test.js (to be created)", "Integration tests for Schema Analyzer Module with BigQuery via Dataform.")
    }

    Container(database, "Database", "BigQuery", "Stores table schemas and data.")
    Container(dataformPlatform, "Dataform Platform", "Dataform", "Provides native access to BigQuery.")


    Rel(schemaAnalyzerModule, dataformNativeAccess, "Uses", "Queries BigQuery INFORMATION_SCHEMA via Dataform")
    Rel(unitTests, schemaAnalyzerModule, "Tests", "Tests Schema Analyzer Module")
    Rel(integrationTests, dataformNativeAccess, "Tests", "Tests Dataform Native Access integration")
    Rel(integrationTests, schemaAnalyzerModule, "Tests", "Tests Schema Analyzer Module integration with BigQuery via Dataform")
    Rel(schemaAnalyzerModule, database, "Queries", "Retrieves schema and data from INFORMATION_SCHEMA")
    Rel(schemaAnalyzerModule, dataformPlatform, "Relies on", "Leverages Dataform platform for BigQuery access")
```

## Mermaid Diagram (Plan)

```mermaid
graph LR
    subgraph Revised Plan for Schema Analyzer and Parameterization Improvement (Dataform Native Access)
    A[1. Implement Real DB Interaction] --> A1(Understand Dataform Native Access);
    A1 --> A2(Modify schema_analyzer.js for Dataform Native Access);
    A2 --> A3[Error handling];
    A3 --> A4[Configure Dataform Project];
    A4 --> A5[Test Dataform Query Execution];
    A5 --> A6[Update ADR 001];

    E[2. Implement Unit Tests] --> F(Create test file);
    F --> G{Write unit tests};
    G --> H[Mock Dataform Native Access];

    I[3. Refactor & Improve Code] --> J{Review & Refactor code};
    J --> K[Error handling & logging];
    K --> L[Input validation & docs];
    I --> M[Parameterize SQL Definitions];
    M --> N{Analyze definition files};
    N --> O[Replace hardcoded values with params];
    O --> P[Document parameterization];


    Q[4. Integration Tests] --> R(Create integration tests);
    R --> S{Test DB interaction};

    T[5. Documentation] --> U{Update docs for schema analyzer};
    T --> V[Document testing strategy];
    T --> W[Document Parameterization];
    T --> X{Update MOCK_IMPLEMENTATIONS.md};

    end