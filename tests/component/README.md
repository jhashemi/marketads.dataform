# Component Tests

This directory contains component tests for the Record Matching System. Component tests focus on testing individual components or subsystems in isolation.

## Purpose

Component tests validate that individual components or subsystems work correctly when used in isolation. They are more comprehensive than unit tests but don't test the entire system like integration tests. Component tests:

- Validate component interfaces
- Test component behavior with real dependencies
- Ensure components meet their specifications
- Verify component-level error handling

## Test Organization

Component tests are organized by component or subsystem:

- `matcher_component_tests.js`: Tests for the matcher component
- `blocking_component_tests.js`: Tests for the blocking component
- `scoring_component_tests.js`: Tests for the scoring subsystem
- `dataform_component_tests.js`: Tests for the Dataform subsystem

## Writing Component Tests

When writing component tests:

1. Focus on testing one component or subsystem at a time
2. Use real dependencies where possible
3. Mock external services and dependencies not relevant to the component
4. Test component interfaces and contracts
5. Include error cases and boundary conditions

## Running Component Tests

```bash
# Run all component tests
node scripts/run_tests.js --type component

# Run component tests for a specific component
node scripts/run_tests.js --type component --tags matcher

# Generate a report
node scripts/run_tests.js --type component --report
``` 