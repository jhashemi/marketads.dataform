# Dataform Testing Plan

This document outlines the plan for creating and implementing unit tests within the Dataform project.

## 1. Identify Testable Units

The following units within the project are suitable for unit testing:

*   **JavaScript Functions:** Functions defined in the `includes/` directory, such as:
    *   `blocking_functions.js`
    *   `matching_functions.js`
    *   `rule_engine.js`
    *   `dataform-scaffold.js`
    *   `functions.js`
    *   `historical_matcher.js`
    *   `match_context.js`
    *   `match_strategy_factory.js`
    *   `match_strategy.js`
    *   Files within `includes/match_strategies`
*   **SQLX Definitions (Data Transformations):** While SQLX primarily defines data transformations, the *logic* embedded within them can be tested. This includes:
    *   `config` blocks
    *   JavaScript expressions within `config`, `preOps`, or `postOps`
*   **SQLX Assertions:** Existing assertions within `.sqlx` files are valuable data quality checks and should be reviewed and expanded.

## 2. Create a `tests/` Directory

A `tests/` directory will be created at the root level of the project to house all test files. This provides a clear separation between the core code and the tests.

## 3. Write JavaScript Unit Tests

*   **File Structure:**  Within `tests/`, create corresponding JavaScript files for each file in `includes/` that contains functions to be tested.  For example:
    *   `tests/blocking_functions_test.js` for `includes/blocking_functions.js`
    *   `tests/matching_functions_test.js` for `includes/matching_functions.js`
    *   etc.
*   **Testing Framework:** Dataform's built-in JavaScript assertion capabilities will be used.  The `assert` module will be the primary tool.
*   **Test Cases:** For each function, comprehensive test cases will be written, covering:
    *   **Valid Inputs:**  Testing with expected inputs to ensure correct outputs.
    *   **Edge Cases:**  Testing with boundary values and unusual inputs (e.g., very large numbers, empty strings).
    *   **Invalid Inputs:**  Testing with incorrect inputs to ensure appropriate error handling or graceful degradation (e.g., null values, incorrect data types).
    *   **Specific Logic:**  Testing any complex logic, calculations, or conditional statements within the functions.
    * **Semantic Type Mapping:** Tests to ensure the `semanticTypeMap` correctly identifies and groups semantically equivalent column names.

**Example (Conceptual - JavaScript Unit Test):**

```javascript
// tests/functions_test.js
const { add } = require("../includes/functions"); // Assuming an 'add' function exists
const assert = require("assert");

// Test case 1: Valid inputs
assert.strictEqual(add(2, 3), 5, "Test Case 1 Failed: Basic addition");

// Test case 2: Zero values
assert.strictEqual(add(0, 5), 5, "Test Case 2 Failed: Zero value");

// Test case 3: Negative values
assert.strictEqual(add(-2, 3), 1, "Test Case 3 Failed: Negative value");
```

## 4. Write SQLX "Unit" Tests (Configuration Tests)

*   **File Structure:** Create `.js` files in the `tests/` directory corresponding to the `.sqlx` files.  For example, `tests/staging_inmarket_test.js` would test `definitions/onpointdata/staging_inmarket.sqlx`.
*   **Test Cases:**
    *   **Config Validation:**  Verify that the `config` block in the SQLX file is correctly generated. This includes checking:
        *   `type`:  Verify the correct type (e.g., "table", "view", "incremental", "assertion").
        *   `materialized`:  If applicable, check the materialization strategy.
        *   `dependencies`:  Ensure all dependencies are correctly declared using `${ref(...)`.
        *   `tags`:  Verify the presence and correctness of tags.
        *   `assertions`:  Check that any defined assertions are correctly configured.
    *   **JavaScript Expression Evaluation:** If the SQLX file uses JavaScript expressions (e.g., within `preOps` or `postOps`, or in the `config` block itself), write tests to verify that these expressions evaluate as expected under different conditions. This may involve creating mock data or contexts.

**Example (Conceptual - SQLX Config Test):**

```javascript
// tests/example_test.js
const dataform = require("@dataform/core");
const assert = require("assert");

const compiledGraph = dataform.compile(); // Compile the project

// Find the compiled action for definitions/example.sqlx
const exampleAction = compiledGraph.tables.find(t => t.name === "onpointdata.example"); // Replace with actual dataset.table

// Test case 1: Check the type
assert.strictEqual(exampleAction.type, "table", "Test Case 1 Failed: Incorrect type");

// Test case 2: Check the tags
assert.deepStrictEqual(exampleAction.tags, ["example"], "Test Case 2 Failed: Incorrect tags");

// Test case 3: Check dependencies
assert.deepStrictEqual(exampleAction.dependencies, ["source_table"], "Test Case 3 Failed: Incorrect dependencies");
```

## 5. Dataform Assertions (Data Quality Tests)

*   **Review Existing Assertions:**  Carefully examine the assertions already present in the `.sqlx` files.
*   **Expand Assertions:**  Add assertions where necessary to cover critical data quality requirements. Common assertions include:
    *   `nonNull`:  Ensures that specified columns do not contain NULL values.
    *   `uniqueKey`:  Verifies the uniqueness of a single column or a combination of columns.
    *   `rowConditions`:  Allows defining custom SQL expressions to check for specific conditions within each row (e.g., ensuring a value falls within a specific range).

## 6. Running Tests

* Dataform's CLI provides commands for running tests and assertions. The specific commands will be documented in the project's `README.md`.

## 7. Documentation

*   Add comments within the test files explaining the purpose of each test case.
*   Update the project's `README.md` to include:
    *   Instructions on how to run the tests.
    *   An explanation of the testing strategy.
    *  Documentation of the semantic type mapping.


## 8. Semantic Type Mapping Implementation

### 8.1. Create `semantic_types.js`

*   Create `includes/semantic_types.js` to store the `semanticTypeMap`.
*   Define `semanticTypeMap` as a JavaScript object mapping semantic types (e.g., "email", "firstName", "lastName") to arrays of possible column names.
*   Export `semanticTypeMap` to make it accessible to other modules.

    **Example:**

    ```javascript
    // includes/semantic_types.js
    const semanticTypeMap = {
      email: ["email", "email_address", "emailAddress", "e_mail"],
      firstName: ["firstName", "first_name", "personfirstname", "fname"],
      lastName: ["lastName", "last_name", "personlastname", "lname"],
      // ... other semantic types
    };

    module.exports = { semanticTypeMap };
    ```

### 8.2. Implement Semantic Type Usage in Matching Functions

*   **Modify Matching Functions:** Update functions in `includes/matching_functions.js` (and potentially `includes/rule_engine.js`) to utilize the `semanticTypeMap`.
*   **Lookup Semantic Type:** Within these functions, before comparing column values, implement a lookup of the semantic type for each column using the `semanticTypeMap`.
*   **Conditional Comparison:** Modify the comparison logic to proceed only if both columns being compared belong to the same semantic type. If semantic types differ, skip the comparison or handle it according to specific application logic.

## 9. Update Test Files List

The following test files have been created in the `tests/` directory:

### Unit Tests
*   `tests/unit/blocking_functions_test.js`
*   `tests/unit/blocking_tests.js`
*   `tests/unit/config_test.js`
*   `tests/unit/docs_test.js`
*   `tests/unit/matching_functions_test.js`
*   `tests/unit/pipeline_tests.js`
*   `tests/unit/regex_pattern_tests.js`
*   `tests/unit/rule_engine_test.js`
*   `tests/unit/standardization_tests.js`

### Integration Tests
*   `tests/integration/end_to_end_matching_tests.js`
*   `tests/integration/incremental_processing_tests.js`
*   `tests/integration/multi_table_waterfall_tests.js`
*   `tests/integration/transitive_closure_tests.js`
*   `tests/integration/waterfall_strategy_tests.js`

### Performance Tests
*   `tests/performance/optimization_tests.js`
*   `tests/performance/scalability_tests.js`

## 10. Update Documentation

*   Update the project's `README.md` to include documentation of the semantic type mapping and its usage.
*  Document the `semanticTypeMap` structure, explain how semantic types are defined and used in matching, and provide examples of how to extend or modify the mapping.

## 11. Review and Finalize

*   Review all implemented tests, documentation, and code changes.
*   Ensure that the tests are comprehensive, covering all key functionalities and scenarios.
*   Verify that the documentation is clear, accurate, and up-to-date.
*   Finalize the testing plan and semantic type mapping implementation.