/**
 * Unit tests for the Exact Matcher
 */
const assert = require('assert');
const { 
  exactMatch,
  normalizeValue,
  generateExactMatchSql,
  getExactMatcher
} = require('../../includes/matching/exact_matcher');

// Define test cases as an array for test runner compatibility
const tests = [
  {
    id: 'exact_match_test',
    name: 'Exact matching with various types',
    type: 'unit',
    tags: ['exact', 'core'],
    priority: 1,
    testFn: async () => {
      // Test string equality
      assert.strictEqual(exactMatch('test', 'test'), 1.0, 'Equal strings should match');
      assert.strictEqual(exactMatch('test', 'TEST'), 0.0, 'Case-sensitive strings should not match by default');
      assert.strictEqual(exactMatch('test', 'test2'), 0.0, 'Different strings should not match');
      
      // Test with options
      assert.strictEqual(
        exactMatch('test', 'TEST', { caseSensitive: false }), 
        1.0, 
        'Case-insensitive matching should work'
      );
      
      assert.strictEqual(
        exactMatch(' test ', 'test', { trim: true }), 
        1.0, 
        'Trimming should work'
      );
      
      // Test number equality
      assert.strictEqual(exactMatch(42, 42), 1.0, 'Equal numbers should match');
      assert.strictEqual(exactMatch(42, 43), 0.0, 'Different numbers should not match');
      
      // Test null/undefined handling
      assert.strictEqual(exactMatch(null, null), 1.0, 'null values should match');
      assert.strictEqual(exactMatch(undefined, undefined), 1.0, 'undefined values should match');
      assert.strictEqual(exactMatch(null, undefined), 0.0, 'null and undefined should not match');
      assert.strictEqual(exactMatch(null, 'test'), 0.0, 'null and string should not match');
      
      // Test boolean equality
      assert.strictEqual(exactMatch(true, true), 1.0, 'Equal booleans should match');
      assert.strictEqual(exactMatch(false, true), 0.0, 'Different booleans should not match');
      
      // Test with tolerance for numbers
      assert.strictEqual(
        exactMatch(1.0001, 1.0, { tolerance: 0.001 }), 
        1.0, 
        'Numbers within tolerance should match'
      );
      
      assert.strictEqual(
        exactMatch(1.01, 1.0, { tolerance: 0.001 }), 
        0.0, 
        'Numbers outside tolerance should not match'
      );
      
      return true;
    }
  },
  {
    id: 'normalization_test',
    name: 'Test value normalization functions',
    type: 'unit',
    tags: ['exact', 'normalization'],
    priority: 1,
    testFn: async () => {
      // String normalization
      assert.strictEqual(
        normalizeValue('  TEST string  ', { trim: true, caseSensitive: false }), 
        'test string',
        'String should be trimmed and lowercased'
      );
      
      // Number normalization
      assert.strictEqual(
        normalizeValue(42.3456, { precision: 2 }), 
        42.35,
        'Number should be rounded to specified precision'
      );
      
      // Date normalization
      const dateStr = '2023-04-15T14:30:45.123Z';
      const date = new Date(dateStr);
      
      assert.strictEqual(
        normalizeValue(date, { dateFormat: 'YYYY-MM-DD' }), 
        '2023-04-15',
        'Date should be formatted according to format string'
      );
      
      // Type conversion
      assert.strictEqual(
        normalizeValue('42', { convertType: 'number' }), 
        42,
        'String should be converted to number'
      );
      
      assert.strictEqual(
        normalizeValue(0, { convertType: 'boolean' }), 
        false,
        'Number 0 should be converted to boolean false'
      );
      
      // Null/undefined normalization
      assert.strictEqual(
        normalizeValue(null, { nullValue: '' }), 
        '',
        'null should be replaced with empty string'
      );
      
      assert.strictEqual(
        normalizeValue(undefined, { nullValue: 0 }), 
        0,
        'undefined should be replaced with 0'
      );
      
      return true;
    }
  },
  {
    id: 'sql_generation_test',
    name: 'Test SQL generation for exact matching',
    type: 'unit',
    tags: ['exact', 'sql'],
    priority: 1,
    testFn: async () => {
      // Basic SQL generation
      const sqlBasic = generateExactMatchSql('table1.field1', 'table2.field1');
      assert(sqlBasic.includes('table1.field1'), 'Should include field1 from table1');
      assert(sqlBasic.includes('table2.field1'), 'Should include field1 from table2');
      assert(sqlBasic.includes('CASE WHEN'), 'Should use CASE WHEN statement');
      
      // SQL with case insensitivity
      const sqlCase = generateExactMatchSql('table1.field1', 'table2.field1', { 
        caseSensitive: false 
      });
      assert(sqlCase.includes('UPPER'), 'Should use UPPER for case insensitivity');
      
      // SQL with trimming
      const sqlTrim = generateExactMatchSql('table1.field1', 'table2.field1', { 
        trim: true 
      });
      assert(sqlTrim.includes('TRIM'), 'Should use TRIM function');
      
      // SQL with null equality
      const sqlNull = generateExactMatchSql('table1.field1', 'table2.field1', { 
        nullEqualsNull: true 
      });
      assert(sqlNull.includes('IS NULL'), 'Should handle NULL values');
      
      // SQL with numeric tolerance
      const sqlNumeric = generateExactMatchSql('table1.field1', 'table2.field1', { 
        isNumeric: true,
        tolerance: 0.001
      });
      assert(sqlNumeric.includes('ABS'), 'Should use ABS for numeric comparison');
      assert(sqlNumeric.includes('0.001'), 'Should include tolerance value');
      
      return true;
    }
  },
  {
    id: 'exact_matcher_test',
    name: 'Test the exact matcher API',
    type: 'unit',
    tags: ['exact', 'api'],
    priority: 1,
    testFn: async () => {
      // Create a matcher with default settings
      const matcher = getExactMatcher();
      
      // Test matching with the matcher
      const result1 = matcher.match('test', 'test');
      assert.strictEqual(result1.score, 1.0, 'Exact match should have score 1.0');
      assert.strictEqual(result1.isMatch, true, 'Exact match should be true');
      
      const result2 = matcher.match('test', 'TEST');
      assert.strictEqual(result2.score, 0.0, 'Case-sensitive match should have score 0.0');
      assert.strictEqual(result2.isMatch, false, 'Case-sensitive match should be false');
      
      // Test with custom config
      const customMatcher = getExactMatcher({
        caseSensitive: false, 
        trim: true,
        nullEqualsNull: true,
        defaultThreshold: 1.0
      });
      
      const result3 = customMatcher.match('test', 'TEST');
      assert.strictEqual(result3.score, 1.0, 'Case-insensitive match should have score 1.0');
      
      const result4 = customMatcher.match(' test ', 'test');
      assert.strictEqual(result4.score, 1.0, 'Trimmed match should have score 1.0');
      
      const result5 = customMatcher.match(null, null);
      assert.strictEqual(result5.score, 1.0, 'Null values should match with nullEqualsNull');
      
      // Test SQL generation
      const sql = customMatcher.generateSql('a.field', 'b.field');
      assert(sql.includes('UPPER'), 'SQL should use UPPER with caseSensitive: false');
      assert(sql.includes('TRIM'), 'SQL should use TRIM with trim: true');
      
      return true;
    }
  }
];

// Jest-style tests for the same functionality
describe('Exact Matcher', () => {
  describe('exactMatch function', () => {
    test('handles string equality correctly', () => {
      expect(exactMatch('test', 'test')).toBe(1.0);
      expect(exactMatch('test', 'TEST')).toBe(0.0);
      expect(exactMatch('test', 'TEST', { caseSensitive: false })).toBe(1.0);
    });
    
    test('handles number equality correctly', () => {
      expect(exactMatch(42, 42)).toBe(1.0);
      expect(exactMatch(42, 43)).toBe(0.0);
      expect(exactMatch(1.001, 1.0, { tolerance: 0.01 })).toBe(1.0);
    });
    
    test('handles null and undefined values', () => {
      expect(exactMatch(null, null)).toBe(1.0);
      expect(exactMatch(null, undefined)).toBe(0.0);
      expect(exactMatch(null, 'test')).toBe(0.0);
    });
  });
  
  describe('normalizeValue function', () => {
    test('normalizes strings correctly', () => {
      expect(normalizeValue('  TEST  ', { trim: true, caseSensitive: false })).toBe('test');
    });
    
    test('normalizes numbers correctly', () => {
      expect(normalizeValue(42.3456, { precision: 2 })).toBe(42.35);
    });
    
    test('handles null values correctly', () => {
      expect(normalizeValue(null, { nullValue: '' })).toBe('');
    });
  });
  
  describe('SQL generation', () => {
    test('generates basic exact match SQL', () => {
      const sql = generateExactMatchSql('a.field', 'b.field');
      expect(sql).toContain('a.field');
      expect(sql).toContain('b.field');
      expect(sql).toContain('CASE WHEN');
    });
    
    test('includes case insensitivity in SQL when specified', () => {
      const sql = generateExactMatchSql('a.field', 'b.field', { caseSensitive: false });
      expect(sql).toContain('UPPER');
    });
  });
  
  describe('Exact matcher API', () => {
    test('provides a functional matcher interface', () => {
      const matcher = getExactMatcher({ caseSensitive: false });
      
      const result = matcher.match('test', 'TEST');
      expect(result.score).toBe(1.0);
      expect(result.isMatch).toBe(true);
      
      const sql = matcher.generateSql('a.field', 'b.field');
      expect(sql).toContain('UPPER');
    });
  });
});

// For manual testing
if (require.main === module) {
  const testRunner = tests => {
    tests.forEach(test => {
      console.log(`Running test: ${test.name}`);
      try {
        const result = test.testFn();
        console.log(`Test ${test.id}: ${result ? 'PASSED' : 'FAILED'}`);
      } catch (error) {
        console.error(`Test ${test.id} failed:`, error);
      }
    });
  };
  
  testRunner(tests);
}

module.exports = { tests };