# ADR 004: Removal of ML-based Matching Functionality

## Status

Accepted

## Context

The codebase included an ML-based matching functionality implemented in `includes/matching/dedupe-integration.js` that was designed to provide an alternative matching approach using machine learning techniques. This functionality was integrated into the matching system but was disabled by default and required explicit configuration to enable.

After analyzing the codebase, we found that:

1. The ML-based matching was never used in any part of the application (no instances of `useML: true` were found).
2. The feature was disabled by default and required explicit configuration via `useDedupeResolver` flag.
3. The code maintained fallback mechanisms to rule-based matching in case ML-based matching failed.
4. Maintaining unused code increases cognitive load for developers and complicates the codebase.

## Decision

We have decided to remove the ML-based matching functionality entirely, including:

1. The `dedupe-integration.js` file
2. All references to `DedupeResolver` in `includes/matching/index.js`
3. The conditional instantiation of `DedupeResolver`
4. The ML-based matching code in `evaluateMatch`, `findMatches`, and `clusterRecords` functions
5. The `trainMLModel` function
6. References to `dedupeResolver` in the exported interface
7. `DedupeResolver` from the module exports

## Consequences

### Positive

- Simplified codebase with reduced cognitive load for developers
- Removed unused code that was adding complexity without providing value
- Reduced potential for bugs and maintenance overhead
- Cleaner API surface with only the actively used functionality exposed

### Negative

- If ML-based matching is needed in the future, it will need to be reimplemented
- Any external code that might have depended on `DedupeResolver` (though none was found) would break

## Implementation Notes

The removal was done in a way that preserves all existing rule-based matching functionality. Tests were run after the changes to ensure no regressions were introduced.

If ML-based matching is needed in the future, it can be reimplemented as a separate module with a cleaner integration approach.