# ADR 002: String Functions Refactoring

## Status
Accepted

## Context
The codebase had several string manipulation and SQL generation functions scattered across different files, particularly in `includes/functions.js`. This led to:

1. Poor organization and discoverability of related functions
2. Difficulty in maintaining and extending string manipulation functionality
3. Duplication of similar functionality across the codebase

## Decision
We decided to refactor the string-related SQL functions into a dedicated module:

1. Created a new file `includes/sql/string_functions.js` to house all string manipulation functions
2. Moved the following functions from `includes/functions.js` to the new file:
   - `transformStringColumn`
   - `clean_flag`
   - `cleanEmail`
   - `zipPad`
3. Updated `includes/sql/index.js` to import and re-export these functions
4. Updated all references to these functions to use the new location

## Consequences

### Positive
- Improved code organization with related functions grouped together
- Better separation of concerns
- Easier to discover and reuse string manipulation functions
- Reduced risk of duplicating functionality
- Simplified maintenance and extension of string manipulation functionality

### Negative
- Required updates to existing code that referenced the moved functions
- Introduced a new dependency between modules

## Implementation Notes
- The `dataCastIntFlag` function in `includes/functions.js` was updated to use `sql.clean_flag` instead of the local `clean_flag` function
- `definitions/referencedata/AddressMaster.js` was updated to use the functions from the new location