# ADR 003: Function Organization Refactoring

## Status
Accepted

## Context
The codebase had several utility functions in `includes/functions.js` that were related to different domains (SQL casting, geospatial operations, hashing). This led to a monolithic utility file that was difficult to maintain and navigate. Functions were not organized by their domain or purpose, making it harder to find and reuse them.

## Decision
We decided to refactor the utility functions by moving them to more appropriate locations based on their domain:

1. SQL casting functions (`dataCast`, `dataCastInt`, `dataCastBool`, `dataCastIntFlag`) were moved to `includes/sql/casting_functions.js`
2. Geospatial functions (`toH3Index`, `toH3IndexPartitionKey`) were moved to `includes/utils/geospatial_functions.js`
3. Hashing functions (`to_hem`, `createPartitionKeyId`) were moved to `includes/sql/hashing_functions.js`

After confirming that no files were importing from `includes/functions.js`, we completely removed this file to eliminate redundancy, rather than keeping it for backward compatibility.

## Consequences

### Positive
- Better organization of code by domain and responsibility
- Improved discoverability of functions
- Easier maintenance as related functions are grouped together
- Reduced file size for individual modules
- Clear separation of concerns

### Negative
- Slight increase in the number of files
- Any code that was importing from `includes/functions.js` will need to be updated to import from the new locations

## Implementation Notes
- All functions were moved without changing their implementation to maintain behavior
- After confirming no dependencies on the original file, it was completely removed
- Module exports in `includes/sql/index.js` and `includes/utils/index.js` were updated to include the new functions
- Documentation was preserved and enhanced where appropriate

## Related
- This refactoring follows the principles established in ADR-002 (String Functions Refactoring)