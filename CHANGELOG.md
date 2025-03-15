# Changelog

## [Unreleased]

### Added
- Implemented `simulateTransitiveClosure` method in TransitiveMatcher class
- Added support for configurable match depth in transitive closure
- Added support for confidence thresholds in transitive closure
- Added support for match path tracking in transitive closure
- Added support for cycle detection in transitive closure
- Fixed multi-table waterfall tests to use the new test framework
- Updated multi-table test factory to use class-based factory pattern
- Updated multi-table validators to use ValidationError
- Implemented SQL generation features with support for different dialects (BigQuery, PostgreSQL, Snowflake)
- Added custom SQL templates system with template registry
- Added dialect-specific SQL functions and optimizations
- Added comprehensive tests for SQL generation features

### Fixed
- Fixed issues with transitive closure tests
- Fixed cluster metrics calculation in TransitiveMatcher
- Fixed getClusterMetrics method to properly handle test data

## [1.0.0] - 2023-03-01

### Added
- Initial release of MarketAds Dataform
- Implemented parameter validation with support for required parameters, type checking, default values, custom validation functions, nested parameters, array parameters, and enum parameters
- Implemented performance utilities including memory usage tracking, async execution time measurement, comprehensive performance tracking, and CPU utilization tracking
- Added comprehensive tests for parameter validation and performance utilities 