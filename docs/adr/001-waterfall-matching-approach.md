# ADR 001: Waterfall Matching Approach

## Status

Accepted

## Date

2023-03-12

## Context

Our record matching system needs to handle data from multiple sources with varying levels of quality, reliability, and freshness. We need a systematic approach to match records while:

1. Respecting the priority of different data sources
2. Supporting both deterministic (exact) and probabilistic (fuzzy) matching
3. Providing confidence scores for matches
4. Ensuring consistent and predictable behavior
5. Scaling efficiently to large datasets in BigQuery

We also need to support complex matching scenarios:
- Tables with different schemas and field names
- Required fields validation
- Confidence adjustments based on source reliability

## Decision

We have decided to implement a **Waterfall Matching Approach** as the core strategy for our record matching system. This approach:

1. Uses a configurable priority order for reference tables
2. Processes matches in sequence, with higher priority sources taking precedence
3. Provides both basic waterfall and advanced multi-table implementations
4. Supports a hybrid deterministic-then-probabilistic approach
5. Integrates seamlessly with our BigQuery and Dataform infrastructure

The implementation consists of:

- Core strategy classes:
  - `WaterfallMatchStrategy`: Basic priority-based waterfall matching
  - `MultiTableWaterfallStrategy`: Advanced waterfall matching with additional features

- Pipeline generation:
  - `waterfall_pipeline.js`: Functions to generate complete SQL pipelines
  - SQL output that runs efficiently in BigQuery

- Factory pattern:
  - `match_strategy_factory.js`: Factory methods to create and configure strategies

## Consequences

### Positive

- **Prioritized Matches**: Ensures records match to the best available source
- **Clear Separation of Concerns**: Strategy pattern provides clean separation
- **Flexible Configuration**: Extensive configuration options without code changes
- **SQL-Native Implementation**: All matching runs efficiently in BigQuery
- **Confidence Scoring**: Each match includes a confidence score and level
- **Maintainable Architecture**: Well-structured codebase with clear responsibilities
- **Extensible Design**: Easy to add new strategies or features

### Negative

- **Increased Complexity**: More complex than simple matching approaches
- **Configuration Overhead**: Requires careful configuration of reference tables and rules
- **Performance Considerations**: Requires attention to blocking efficiency
- **Learning Curve**: Users need to understand the waterfall concept and configuration

### Neutral

- **SQL Generation**: All matching logic is generated as SQL, rather than executed in JavaScript
- **BigQuery-Specific**: Implementation is optimized for BigQuery, may require adaptation for other platforms

## Alternatives Considered

1. **Single Pass Matching**:
   - Match records against all reference tables in a single pass
   - Use scoring to determine the best match
   - Rejected due to lack of clear priority handling and potential inconsistencies

2. **Separate Matching Processes**:
   - Run independent matching processes for each reference table
   - Combine results in a post-processing step
   - Rejected due to complexity in resolving conflicts and potential inefficiencies

3. **Graph-Based Entity Resolution**:
   - Build a graph of potential matches and resolve entities using graph algorithms
   - Rejected due to higher implementation complexity and performance concerns in BigQuery

## Implementation Approach

We are implementing the waterfall matching approach using a strategy pattern:

1. Define strategy interfaces for different matching approaches
2. Implement the waterfall strategy and multi-table extension
3. Create a factory to instantiate and configure strategies
4. Provide pipeline generators to create complete SQL

This architecture allows for:
- Easy addition of new strategies
- Consistent interface across different matching approaches
- Centralized configuration validation
- Clean separation between strategy definition and SQL generation

## Additional Considerations

### Testing

The implementation includes:
- Unit tests for strategy objects and SQL generation
- Integration tests for the complete matching pipeline
- Specific tests for different matching scenarios

### Performance

Performance is addressed through:
- Efficient blocking strategies
- Appropriate SQL structure
- Isolation of resource-intensive operations

### Documentation

The implementation is accompanied by:
- Comprehensive documentation in `WATERFALL_MATCHING.md`
- This ADR explaining the approach
- Example implementations showing usage patterns 