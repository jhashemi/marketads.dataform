# ADR-006: Semantic Type Detection Approach

## Status

Accepted

## Context

Data standardization is a critical component of our ETL process. We need a consistent way to detect field types across various data sources and apply appropriate standardization rules to each field type. Currently, we rely on manual field mapping or exact name matching, which is error-prone and not scalable.

Key challenges:
1. Different source systems use varying naming conventions for the same semantic types
2. Manual field mapping is time-consuming and error-prone
3. Explicit field mapping requires maintenance when source schemas change
4. Standardization rules are duplicated across transformations
5. No centralized approach to field type detection and standardization

## Decision

We will implement an automated semantic type detection system that:

1. Uses pattern matching on field names to identify semantic types (e.g., email, phone, address)
2. Falls back to sample value analysis when field names are ambiguous
3. Provides standardized SQL expressions for each semantic type
4. Centralizes type detection and standardization in reusable modules
5. Integrates with a field mapping factory to automate field correspondence

### Implementation Details

The semantic type detection system will:

1. Define patterns for common field types (email, phone, name, address, etc.)
2. Use regular expressions to match field names against these patterns
3. Analyze sample values when field names are insufficient for detection
4. Generate appropriate SQL expressions for standardizing each type
5. Provide an extensible framework to add new semantic types

### Type Standardization Approach

Each semantic type will have a standard format:

| Semantic Type | Standardization Approach |
|--------------|--------------------------|
| Email | Lowercase, trim whitespace |
| Phone | E.164 format (+1XXXXXXXXXX) |
| Name | Lowercase, trim whitespace |
| Address | Lowercase, trim whitespace |
| Postal Code | Trim whitespace |
| City | Lowercase, trim whitespace |
| State Code | Uppercase, trim whitespace |
| Date | ISO format (YYYY-MM-DD) |
| SSN/Tax ID | Mask except last 4 digits (XXX-XX-1234) |

## Consequences

### Positive

1. Reduced manual field mapping effort
2. More consistent data standardization
3. Easier maintenance when source schemas change
4. Centralized logic for type detection and standardization
5. Better error handling for edge cases
6. Improved data quality through consistent formatting

### Negative

1. May incorrectly identify field types in some edge cases
2. Additional complexity in the data transformation pipeline
3. New dependencies between modules
4. Performance overhead for type detection logic

### Mitigation Strategies

1. Implement comprehensive test cases for each semantic type
2. Add telemetry to monitor field mapping accuracy
3. Provide override mechanisms for manual corrections
4. Document edge cases and known limitations
5. Optimize detection performance through caching

## Related

- ADR-005: Error Handling Validation
- SQL_GENERATION_STANDARDS.md
- STANDARDIZATION.md 