/**
 * Unit tests for tag-based blocking keys function
 */

const { tagBlockingKeys } = require('../../includes/blocking/strategies');
const assert = require('assert');

// Define tests for custom test runner
const tests = [
  {
    id: 'tag_blocking_basic_test',
    name: 'Basic Tag Blocking Keys',
    type: 'unit',
    tags: ['blocking', 'tags'],
    priority: 1,
    testFn: async () => {
      // Basic tag blocking with array of strings
      const tags = ['electronics', 'smartphone', 'apple'];
      const result = tagBlockingKeys(tags);
      
      assert.deepStrictEqual(result, tags, 'Should return original tags array');
      return true;
    }
  },
  {
    id: 'tag_blocking_lowercase_test',
    name: 'Tag Blocking Keys with Lowercase Option',
    type: 'unit',
    tags: ['blocking', 'tags', 'lowercase'],
    priority: 1,
    testFn: async () => {
      // Tag blocking with lowercase option
      const tags = ['Electronics', 'SmartPhone', 'APPLE'];
      const result = tagBlockingKeys(tags, { lowercase: true });
      
      assert.deepStrictEqual(result, ['electronics', 'smartphone', 'apple'], 
        'Should convert all tags to lowercase');
      return true;
    }
  },
  {
    id: 'tag_blocking_prefix_test',
    name: 'Tag Blocking Keys with Prefix Option',
    type: 'unit',
    tags: ['blocking', 'tags', 'prefix'],
    priority: 1,
    testFn: async () => {
      // Tag blocking with prefix option
      const tags = ['electronics', 'smartphone', 'apple'];
      const result = tagBlockingKeys(tags, { prefix: 'tag_' });
      
      assert.deepStrictEqual(result, ['tag_electronics', 'tag_smartphone', 'tag_apple'], 
        'Should add prefix to all tags');
      return true;
    }
  },
  {
    id: 'tag_blocking_maxTags_test',
    name: 'Tag Blocking Keys with MaxTags Option',
    type: 'unit',
    tags: ['blocking', 'tags', 'maxTags'],
    priority: 1,
    testFn: async () => {
      // Tag blocking with maxTags option
      const tags = ['electronics', 'smartphone', 'apple', 'mobile', 'tech'];
      const result = tagBlockingKeys(tags, { maxTags: 3 });
      
      assert.deepStrictEqual(result, ['electronics', 'smartphone', 'apple'], 
        'Should limit tags to specified maxTags');
      assert.strictEqual(result.length, 3, 'Should return only 3 tags');
      return true;
    }
  },
  {
    id: 'tag_blocking_combined_options_test',
    name: 'Tag Blocking Keys with Combined Options',
    type: 'unit',
    tags: ['blocking', 'tags', 'combined'],
    priority: 1,
    testFn: async () => {
      // Tag blocking with multiple options
      const tags = ['Electronics', 'SmartPhone', 'APPLE', 'Mobile', 'Tech'];
      const result = tagBlockingKeys(tags, { 
        lowercase: true, 
        prefix: 'tag_', 
        maxTags: 2 
      });
      
      assert.deepStrictEqual(result, ['tag_electronics', 'tag_smartphone'], 
        'Should apply all options correctly');
      assert.strictEqual(result.length, 2, 'Should return only 2 tags');
      return true;
    }
  },
  {
    id: 'tag_blocking_edge_cases_test',
    name: 'Tag Blocking Keys Edge Cases',
    type: 'unit',
    tags: ['blocking', 'tags', 'edge-cases'],
    priority: 1,
    testFn: async () => {
      // Test with null input
      assert.deepStrictEqual(tagBlockingKeys(null), [], 'Should return empty array for null input');
      
      // Test with undefined input
      assert.deepStrictEqual(tagBlockingKeys(undefined), [], 'Should return empty array for undefined input');
      
      // Test with non-array input
      assert.deepStrictEqual(tagBlockingKeys('not an array'), [], 'Should return empty array for non-array input');
      
      // Test with empty array
      assert.deepStrictEqual(tagBlockingKeys([]), [], 'Should return empty array for empty array input');
      
      // Test with mixed type array
      const mixedTags = ['string', 123, true, null];
      const result = tagBlockingKeys(mixedTags, { lowercase: true });
      assert.deepStrictEqual(result, ['string', '123', 'true', 'null'], 
        'Should convert non-string values to strings when lowercase is true');
      
      return true;
    }
  }
];

// Jest-style tests
describe('Tag Blocking Keys', () => {
  it('should return original tags array by default', () => {
    const tags = ['electronics', 'smartphone', 'apple'];
    const result = tagBlockingKeys(tags);
    
    expect(result).toEqual(tags);
  });
  
  it('should convert tags to lowercase when lowercase option is true', () => {
    const tags = ['Electronics', 'SmartPhone', 'APPLE'];
    const result = tagBlockingKeys(tags, { lowercase: true });
    
    expect(result).toEqual(['electronics', 'smartphone', 'apple']);
  });
  
  it('should add prefix to all tags when prefix option is provided', () => {
    const tags = ['electronics', 'smartphone', 'apple'];
    const result = tagBlockingKeys(tags, { prefix: 'tag_' });
    
    expect(result).toEqual(['tag_electronics', 'tag_smartphone', 'tag_apple']);
  });
  
  it('should limit tags to maxTags when maxTags option is provided', () => {
    const tags = ['electronics', 'smartphone', 'apple', 'mobile', 'tech'];
    const result = tagBlockingKeys(tags, { maxTags: 3 });
    
    expect(result).toEqual(['electronics', 'smartphone', 'apple']);
    expect(result.length).toBe(3);
  });
  
  it('should apply all options correctly when combined', () => {
    const tags = ['Electronics', 'SmartPhone', 'APPLE', 'Mobile', 'Tech'];
    const result = tagBlockingKeys(tags, { 
      lowercase: true, 
      prefix: 'tag_', 
      maxTags: 2 
    });
    
    expect(result).toEqual(['tag_electronics', 'tag_smartphone']);
    expect(result.length).toBe(2);
  });
  
  it('should handle edge cases properly', () => {
    expect(tagBlockingKeys(null)).toEqual([]);
    expect(tagBlockingKeys(undefined)).toEqual([]);
    expect(tagBlockingKeys('not an array')).toEqual([]);
    expect(tagBlockingKeys([])).toEqual([]);
    
    const mixedTags = ['string', 123, true, null];
    const result = tagBlockingKeys(mixedTags, { lowercase: true });
    expect(result).toEqual(['string', '123', 'true', 'null']);
  });
});

// For manual testing
if (require.main === module) {
  // Run tests manually
  const failures = [];
  
  for (const test of tests) {
    try {
      const result = test.testFn();
      console.log(`✅ ${test.name}: PASSED`);
    } catch (error) {
      console.error(`❌ ${test.name}: FAILED`);
      console.error(error);
      failures.push({ test, error });
    }
  }
  
  if (failures.length > 0) {
    console.error(`${failures.length} tests failed!`);
    process.exit(1);
  } else {
    console.log('All tests passed!');
  }
}

module.exports = { tests };