/**
 * Tag Blocking Strategy Tests
 * 
 * Tests for tag-based blocking strategy which is useful
 * for comparing records with tag/category fields.
 */

const assert = require('assert');
const { applyBlockingStrategy } = require('../../includes/blocking/strategies');

// Define tests for custom test runner
const tests = [
  {
    id: 'tag_blocking_basic_test',
    name: 'Tag blocking with basic tag sets',
    type: 'unit',
    tags: ['blocking', 'tag-blocking', 'sets'],
    priority: 1,
    testFn: async () => {
      try {
        // Implement tag blocking strategy or check if it exists
        const tags = ['sports', 'outdoors', 'hiking'];
        
        // Test the strategy function
        const blockingKeys = applyBlockingStrategy('tag', tags);
        
        // Check that we get individual keys for each tag
        assert.ok(Array.isArray(blockingKeys), 'Should return an array of blocking keys');
        assert.strictEqual(blockingKeys.length, tags.length, 'Should generate one key per tag');
        
        // Each tag should be in the results
        tags.forEach(tag => {
          assert.ok(blockingKeys.includes(tag), `Should include tag "${tag}" in blocking keys`);
        });
        
        return true;
      } catch (error) {
        console.error(error);
        return false;
      }
    }
  },
  {
    id: 'tag_blocking_options_test',
    name: 'Tag blocking with options',
    type: 'unit',
    tags: ['blocking', 'tag-blocking', 'options'],
    priority: 1,
    testFn: async () => {
      try {
        // Test with options
        const tags = ['HOME Decor', 'KITCHEN Appliances', 'home improvement'];
        
        // Test with lowercase option
        const blockingKeysLowercase = applyBlockingStrategy('tag', tags, { lowercase: true });
        
        // Check that all keys are lowercased
        assert.ok(blockingKeysLowercase.every(key => key === key.toLowerCase()), 
          'All keys should be lowercase when lowercase option is true');
        
        // Test with prefix option
        const blockingKeysPrefix = applyBlockingStrategy('tag', tags, { 
          lowercase: true,
          prefix: 'tag_'
        });
        
        // Check that all keys have the prefix
        assert.ok(blockingKeysPrefix.every(key => key.startsWith('tag_')), 
          'All keys should have the prefix when prefix option is set');
        
        // Test with maxTags option
        const maxTags = 2;
        const blockingKeysMaxTags = applyBlockingStrategy('tag', tags, { maxTags });
        
        // Check that we limit the number of tags
        assert.strictEqual(blockingKeysMaxTags.length, maxTags, 
          `Should limit to ${maxTags} tags when maxTags option is set`);
        
        return true;
      } catch (error) {
        console.error(error);
        return false;
      }
    }
  },
  {
    id: 'tag_blocking_empty_tags_test',
    name: 'Tag blocking handles empty tags correctly',
    type: 'unit',
    tags: ['blocking', 'tag-blocking', 'edge-cases'],
    priority: 1,
    testFn: async () => {
      try {
        // Test with empty array
        const emptyTags = [];
        const blockingKeysEmpty = applyBlockingStrategy('tag', emptyTags);
        
        // Should return empty array for empty tags
        assert.ok(Array.isArray(blockingKeysEmpty), 'Should return an array even for empty tags');
        assert.strictEqual(blockingKeysEmpty.length, 0, 'Should return empty array for empty tags');
        
        // Test with null/undefined
        const blockingKeysNull = applyBlockingStrategy('tag', null);
        assert.ok(Array.isArray(blockingKeysNull), 'Should return an array for null tags');
        assert.strictEqual(blockingKeysNull.length, 0, 'Should return empty array for null tags');
        
        return true;
      } catch (error) {
        console.error(error);
        return false;
      }
    }
  }
];

// Jest-style tests
describe('Tag Blocking Strategy', () => {
  test('should generate blocking keys for tag arrays', () => {
    const tags = ['sports', 'outdoors', 'hiking'];
    
    // Test the strategy function
    const blockingKeys = applyBlockingStrategy('tag', tags);
    
    // Check that we get individual keys for each tag
    expect(blockingKeys).toBeInstanceOf(Array);
    expect(blockingKeys.length).toBe(tags.length);
    
    // Each tag should be in the results
    tags.forEach(tag => {
      expect(blockingKeys).toContain(tag);
    });
  });
  
  test('should apply options like lowercase and prefix', () => {
    const tags = ['HOME Decor', 'KITCHEN Appliances'];
    
    // Test with lowercase option
    const blockingKeysLowercase = applyBlockingStrategy('tag', tags, { lowercase: true });
    
    // Check that all keys are lowercased
    blockingKeysLowercase.forEach(key => {
      expect(key).toBe(key.toLowerCase());
    });
    
    // Test with prefix option
    const blockingKeysPrefix = applyBlockingStrategy('tag', tags, { 
      lowercase: true,
      prefix: 'tag_'
    });
    
    // Check that all keys have the prefix
    blockingKeysPrefix.forEach(key => {
      expect(key.startsWith('tag_')).toBe(true);
    });
  });
  
  test('should handle empty tags and null values', () => {
    // Test with empty array
    const emptyTags = [];
    const blockingKeysEmpty = applyBlockingStrategy('tag', emptyTags);
    
    // Should return empty array for empty tags
    expect(blockingKeysEmpty).toBeInstanceOf(Array);
    expect(blockingKeysEmpty.length).toBe(0);
    
    // Test with null
    const blockingKeysNull = applyBlockingStrategy('tag', null);
    expect(blockingKeysNull).toBeInstanceOf(Array);
    expect(blockingKeysNull.length).toBe(0);
  });
});

// For manual testing
if (require.main === module) {
  // Run tests manually
  tests.forEach(async (test) => {
    try {
      const result = await test.testFn();
      console.log(`${test.name}: ${result ? 'PASSED' : 'FAILED'}`);
    } catch (error) {
      console.error(`${test.name}: FAILED with error:`, error);
    }
  });
}

module.exports = { tests };