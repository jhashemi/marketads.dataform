# ADR-007: Field Mapping Factory Design

## Status

Accepted

## Context

Our data transformation workflows frequently require mapping fields between source and target tables. This is typically done through manual mapping specifications or hardcoded field correspondences. This approach has several limitations:

1. Manual field mapping is tedious and error-prone
2. Hardcoded mappings require updates when source or target schemas change
3. Similar mapping logic is duplicated across transformations
4. There's no standardized approach for determining field correspondences
5. Handling edge cases (missing fields, name variations) is inconsistent

We need a more automated and consistent approach to field mapping that reduces manual effort and improves reliability.

## Decision

We will implement a Field Mapping Factory that:

1. Automatically suggests field mappings based on name similarity and semantic type
2. Provides SQL generation for standardized field mappings
3. Integrates with semantic type detection for improved mapping accuracy
4. Includes error handling for edge cases
5. Records telemetry for monitoring mapping quality

### Implementation Details

The Field Mapping Factory will:

1. Take source and target field names as inputs
2. Use multiple matching strategies:
   - Exact match (case-insensitive)
   - Semantic type matching
   - Name similarity scoring
3. Generate SQL expressions for the mapped fields, including standardization
4. Apply appropriate standardization based on detected semantic types
5. Track mapping accuracy and performance metrics

### Matching Algorithm

The field mapping will follow this waterfall approach:

1. Try exact match first (case insensitive if specified)
2. If no exact match, try semantic type-based matching
3. If semantic matching fails, use string similarity algorithms
4. Apply a minimum similarity threshold to avoid false matches
5. Allow for manual overrides when automatic mapping is insufficient

## Consequences

### Positive

1. Reduced manual effort for field mapping
2. More consistent field standardization
3. Improved maintenance when schemas change
4. Better error handling for edge cases
5. Ability to track and improve mapping quality over time
6. Centralized mapping logic for reuse across transformations

### Negative

1. Additional complexity in the transformation pipeline
2. Potential for incorrect mappings in ambiguous cases
3. Performance overhead for sophisticated mapping algorithms
4. New dependencies between modules (relies on semantic type detection)

### Mitigation Strategies

1. Implement comprehensive test cases for various mapping scenarios
2. Add telemetry to monitor mapping accuracy
3. Provide easy override mechanisms when automatic mapping is insufficient
4. Document limitations and edge cases
5. Use similarity thresholds to avoid false positives
6. Implement caching for performance-critical paths

## Related

- ADR-006: Semantic Type Detection Approach
- ADR-005: Error Handling Validation
- STANDARDIZATION.md 