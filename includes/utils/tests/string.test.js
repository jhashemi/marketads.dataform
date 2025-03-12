/**
 * String Utilities Tests
 * 
 * This file contains tests for the string utilities module.
 * It demonstrates how to test the utility functions and can be used as a reference
 * for testing other utility modules.
 */

// Assuming a testing framework like Jest is being used
const stringUtils = require('../string');

describe('String Utilities', () => {
  // toCamelCase tests
  describe('toCamelCase', () => {
    test('should convert space-separated string to camelCase', () => {
      expect(stringUtils.toCamelCase('hello world')).toBe('helloWorld');
    });

    test('should convert snake_case string to camelCase', () => {
      expect(stringUtils.toCamelCase('hello_world')).toBe('helloWorld');
    });

    test('should convert kebab-case string to camelCase', () => {
      expect(stringUtils.toCamelCase('hello-world')).toBe('helloWorld');
    });

    test('should handle empty string', () => {
      expect(stringUtils.toCamelCase('')).toBe('');
    });

    test('should handle null or undefined', () => {
      expect(stringUtils.toCamelCase(null)).toBe('');
      expect(stringUtils.toCamelCase(undefined)).toBe('');
    });
  });

  // toSnakeCase tests
  describe('toSnakeCase', () => {
    test('should convert space-separated string to snake_case', () => {
      expect(stringUtils.toSnakeCase('hello world')).toBe('hello_world');
    });

    test('should convert camelCase string to snake_case', () => {
      expect(stringUtils.toSnakeCase('helloWorld')).toBe('hello_world');
    });

    test('should convert kebab-case string to snake_case', () => {
      expect(stringUtils.toSnakeCase('hello-world')).toBe('hello_world');
    });

    test('should handle empty string', () => {
      expect(stringUtils.toSnakeCase('')).toBe('');
    });

    test('should handle null or undefined', () => {
      expect(stringUtils.toSnakeCase(null)).toBe('');
      expect(stringUtils.toSnakeCase(undefined)).toBe('');
    });
  });

  // toPascalCase tests
  describe('toPascalCase', () => {
    test('should convert space-separated string to PascalCase', () => {
      expect(stringUtils.toPascalCase('hello world')).toBe('HelloWorld');
    });

    test('should convert camelCase string to PascalCase', () => {
      expect(stringUtils.toPascalCase('helloWorld')).toBe('HelloWorld');
    });

    test('should convert snake_case string to PascalCase', () => {
      expect(stringUtils.toPascalCase('hello_world')).toBe('HelloWorld');
    });

    test('should handle empty string', () => {
      expect(stringUtils.toPascalCase('')).toBe('');
    });

    test('should handle null or undefined', () => {
      expect(stringUtils.toPascalCase(null)).toBe('');
      expect(stringUtils.toPascalCase(undefined)).toBe('');
    });
  });

  // truncate tests
  describe('truncate', () => {
    test('should truncate string to specified length with default suffix', () => {
      expect(stringUtils.truncate('Hello World', 5)).toBe('Hello...');
    });

    test('should truncate string to specified length with custom suffix', () => {
      expect(stringUtils.truncate('Hello World', 5, '***')).toBe('Hello***');
    });

    test('should not truncate if string length is less than maxLength', () => {
      expect(stringUtils.truncate('Hello', 10)).toBe('Hello');
    });

    test('should handle empty string', () => {
      expect(stringUtils.truncate('', 5)).toBe('');
    });

    test('should handle null or undefined', () => {
      expect(stringUtils.truncate(null, 5)).toBe('');
      expect(stringUtils.truncate(undefined, 5)).toBe('');
    });
  });

  // slugify tests
  describe('slugify', () => {
    test('should convert string to slug format', () => {
      expect(stringUtils.slugify('Hello World')).toBe('hello-world');
    });

    test('should handle special characters', () => {
      expect(stringUtils.slugify('Hello, World!')).toBe('hello-world');
    });

    test('should handle multiple spaces', () => {
      expect(stringUtils.slugify('Hello   World')).toBe('hello-world');
    });

    test('should handle empty string', () => {
      expect(stringUtils.slugify('')).toBe('');
    });

    test('should handle null or undefined', () => {
      expect(stringUtils.slugify(null)).toBe('');
      expect(stringUtils.slugify(undefined)).toBe('');
    });
  });

  // Additional tests for other string utility functions can be added here
});

/**
 * How to run these tests:
 * 
 * Assuming Jest is installed:
 * 1. Navigate to the project directory
 * 2. Run: npx jest includes/utils/tests/string.test.js
 */ 