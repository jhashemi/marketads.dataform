# Utilities Module

A comprehensive collection of utility functions organized by domain to promote code reuse and maintainability throughout the application.

## Overview

This module follows the Separation of Concerns principle by isolating functionality into domain-specific modules:

- **String Utilities**: Functions for string manipulation
- **Array Utilities**: Functions for array operations
- **Object Utilities**: Functions for object manipulation
- **Validation Utilities**: Functions for data validation
- **Date Utilities**: Functions for date manipulation

## Installation

No additional installation is required as this is part of the core application.

## Usage

You can import the entire utilities module:

```javascript
const utils = require('includes/utils');

// Use a string utility
const camelCased = utils.string.toCamelCase('hello world');

// Use an array utility
const chunks = utils.array.chunk([1, 2, 3, 4, 5], 2);

// Use an object utility
const picked = utils.object.pick({ a: 1, b: 2, c: 3 }, ['a', 'c']);

// Use a validation utility
const isValid = utils.validation.isEmail('user@example.com');

// Use a date utility
const formatted = utils.date.formatDate(new Date(), 'YYYY-MM-DD');
```

Or import specific utility modules directly:

```javascript
const stringUtils = require('includes/utils/string');
const arrayUtils = require('includes/utils/array');
const objectUtils = require('includes/utils/object');
const validationUtils = require('includes/utils/validation');
const dateUtils = require('includes/utils/date');

// Use directly
const slugified = stringUtils.slugify('Hello World');
```

## Module Details

### String Utilities

Functions for string manipulation including case conversion, normalization, truncation, and formatting.

```javascript
const { string } = require('includes/utils');

string.toCamelCase('hello world');       // 'helloWorld'
string.toSnakeCase('helloWorld');        // 'hello_world'
string.toPascalCase('hello_world');      // 'HelloWorld'
string.truncate('Long text...', 10);     // 'Long te...'
string.slugify('Hello World');           // 'hello-world'
```

### Array Utilities

Functions for array operations including chunking, filtering, flattening, and statistical operations.

```javascript
const { array } = require('includes/utils');

array.chunk([1, 2, 3, 4, 5], 2);         // [[1, 2], [3, 4], [5]]
array.uniq([1, 2, 2, 3, 3, 3]);          // [1, 2, 3]
array.flatten([[1, 2], [3, 4]]);         // [1, 2, 3, 4]
array.sum([1, 2, 3, 4]);                 // 10
```

### Object Utilities

Functions for object manipulation including cloning, property access, merging, and transformation.

```javascript
const { object } = require('includes/utils');

object.clone({ a: 1, b: 2 });            // { a: 1, b: 2 }
object.pick({ a: 1, b: 2, c: 3 }, ['a']); // { a: 1 }
object.merge({ a: 1 }, { b: 2 });        // { a: 1, b: 2 }
```

### Validation Utilities

Functions for data validation including type checking, format validation, and schema validation.

```javascript
const { validation } = require('includes/utils');

validation.isEmail('user@example.com');  // true
validation.isUrl('https://example.com'); // true
validation.isInRange(5, 1, 10);          // true
```

### Date Utilities

Functions for date manipulation including formatting, parsing, comparison, and calculations.

```javascript
const { date } = require('includes/utils');

date.formatDate(new Date(), 'YYYY-MM-DD');
date.addToDate(new Date(), 1, 'day');
date.isBetween(new Date(), startDate, endDate);
```

## Contributing

When adding new utility functions:

1. Place the function in the appropriate domain-specific module
2. Add comprehensive JSDoc comments
3. Handle edge cases and provide default values for optional parameters
4. Follow the existing naming conventions
5. Consider performance implications for frequently used utilities

## License

This module is part of the main application and is subject to the same license terms. 