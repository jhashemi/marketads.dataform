/**
 * Utilities Examples
 * 
 * This file provides examples of how to use the utility functions.
 * It can be used as a reference for developers working with the utilities module.
 */

// Import the entire utilities module
const utils = require('./index');

// Examples of string utilities
console.log('=== String Utilities ===');
console.log(`toCamelCase: ${utils.string.toCamelCase('hello world')}`);
console.log(`toSnakeCase: ${utils.string.toSnakeCase('helloWorld')}`);
console.log(`toPascalCase: ${utils.string.toPascalCase('hello_world')}`);
console.log(`truncate: ${utils.string.truncate('This is a long text that will be truncated', 20)}`);
console.log(`slugify: ${utils.string.slugify('Hello World!')}`);
console.log(`getInitials: ${utils.string.getInitials('John Doe')}`);
console.log(`maskString: ${utils.string.maskString('1234567890', 4, '*')}`);

// Examples of array utilities
console.log('\n=== Array Utilities ===');
console.log(`chunk: ${JSON.stringify(utils.array.chunk([1, 2, 3, 4, 5], 2))}`);
console.log(`uniq: ${JSON.stringify(utils.array.uniq([1, 2, 2, 3, 3, 3]))}`);
console.log(`flatten: ${JSON.stringify(utils.array.flatten([[1, 2], [3, 4]]))}`);
console.log(`sum: ${utils.array.sum([1, 2, 3, 4])}`);
console.log(`average: ${utils.array.average([1, 2, 3, 4])}`);
console.log(`shuffle: ${JSON.stringify(utils.array.shuffle([1, 2, 3, 4, 5]))}`);

// Examples of object utilities
console.log('\n=== Object Utilities ===');
const obj = { a: 1, b: 2, c: 3, d: { e: 4 } };
console.log(`clone: ${JSON.stringify(utils.object.clone(obj))}`);
console.log(`pick: ${JSON.stringify(utils.object.pick(obj, ['a', 'c']))}`);
console.log(`omit: ${JSON.stringify(utils.object.omit(obj, ['b', 'd']))}`);
console.log(`merge: ${JSON.stringify(utils.object.merge({ a: 1 }, { b: 2 }))}`);
console.log(`get: ${utils.object.get(obj, 'd.e')}`);

// Examples of validation utilities
console.log('\n=== Validation Utilities ===');
console.log(`isEmail: ${utils.validation.isEmail('user@example.com')}`);
console.log(`isUrl: ${utils.validation.isUrl('https://example.com')}`);
console.log(`isNumber: ${utils.validation.isNumber(123)}`);
console.log(`isInRange: ${utils.validation.isInRange(5, 1, 10)}`);
console.log(`isEmpty: ${utils.validation.isEmpty('')}`);

// Examples of date utilities
console.log('\n=== Date Utilities ===');
const now = new Date();
const tomorrow = utils.date.addToDate(now, 1, 'day');
console.log(`formatDate: ${utils.date.formatDate(now, 'YYYY-MM-DD')}`);
console.log(`addToDate: ${utils.date.formatDate(tomorrow, 'YYYY-MM-DD')}`);
console.log(`diffDate: ${utils.date.diffDate(tomorrow, now, 'hours')} hours`);
console.log(`isLeapYear: ${utils.date.isLeapYear(2024)}`);
console.log(`getDayOfWeek: ${utils.date.getDayOfWeek(now, true)}`);

/**
 * How to run this example:
 * 
 * 1. Navigate to the project directory
 * 2. Run: node includes/utils/examples.js
 */ 