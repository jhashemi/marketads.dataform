const assert = require('assert');
const docs = require('../../includes/docs');
const fs = require('fs');
const path = require('path');

// Define tests in the format expected by the custom test runner
const tests = [
  {
    id: 'docs_columns_object',
    name: 'docs.columns should be an object',
    type: 'unit',
    tags: ['docs', 'metadata'],
    priority: 1,
    testFn: async () => {
      assert.strictEqual(typeof docs.columns, 'object', 'columns should be an object');
      return true;
    }
  },
  {
    id: 'docs_columns_descriptions',
    name: 'docs.columns should contain descriptions for specific columns',
    type: 'unit',
    tags: ['docs', 'metadata'],
    priority: 1,
    testFn: async () => {
      const expectedColumns = ['AddressID', 'IndividualId', 'personfirstname', 'ZipCode'];
      for (const col of expectedColumns) {
        assert.ok(docs.columns.hasOwnProperty(col), `columns should have property '${col}'`);
        assert.strictEqual(typeof docs.columns[col], 'string', `columns.${col} should be a string`);
      }
      return true;
    }
  },
  {
    id: 'factory_classes_jsdoc',
    name: 'Factory classes should have proper JSDoc documentation',
    type: 'unit',
    tags: ['docs', 'jsdoc', 'factory'],
    priority: 1,
    testFn: async () => {
      const factoryFiles = [
        'includes/matching_system_factory.js',
        'includes/historical_matcher_factory.js',
        'includes/match_strategy_factory.js'
      ];
      
      for (const file of factoryFiles) {
        const content = fs.readFileSync(path.resolve(file), 'utf8');
        
        // Check for class documentation
        assert.ok(content.includes('@class'), `${file} should include @class JSDoc tag`);
        
        // Check for method documentation
        assert.ok(content.includes('@param'), `${file} should include @param JSDoc tags`);
        
        // Check for return type documentation
        assert.ok(content.includes('@returns'), `${file} should include @returns JSDoc tags`);
        
        // Check for examples
        assert.ok(content.includes('@example'), `${file} should include @example JSDoc tags`);
      }
      
      return true;
    }
  }
];

// Jest-style tests
describe('Documentation', () => {
  describe('Column Metadata', () => {
    it('should be an object', () => {
      assert.strictEqual(typeof docs.columns, 'object', 'columns should be an object');
    });

    it('should contain descriptions for specific columns', () => {
      const expectedColumns = ['AddressID', 'IndividualId', 'personfirstname', 'ZipCode'];
      for (const col of expectedColumns) {
        assert.ok(docs.columns.hasOwnProperty(col), `columns should have property '${col}'`);
        assert.strictEqual(typeof docs.columns[col], 'string', `columns.${col} should be a string`);
      }
    });
  });
  
  describe('JSDoc Documentation', () => {
    it('should have proper JSDoc for factory classes', () => {
      const factoryFiles = [
        'includes/matching_system_factory.js',
        'includes/historical_matcher_factory.js',
        'includes/match_strategy_factory.js'
      ];
      
      for (const file of factoryFiles) {
        const content = fs.readFileSync(path.resolve(file), 'utf8');
        
        // Check for class documentation
        assert.ok(content.includes('@class'), `${file} should include @class JSDoc tag`);
        
        // Check for method documentation
        assert.ok(content.includes('@param'), `${file} should include @param JSDoc tags`);
        
        // Check for return type documentation
        assert.ok(content.includes('@returns'), `${file} should include @returns JSDoc tags`);
        
        // Check for examples
        assert.ok(content.includes('@example'), `${file} should include @example JSDoc tags`);
      }
    });
  });
});

// For manual testing only
if (require.main === module) {
  console.log("\n=== Running Docs Tests ===\n");
  
  (async () => {
    let passed = 0;
    let failed = 0;
    
    for (const test of tests) {
      try {
        console.log(`Running test: ${test.name}`);
        const result = await test.testFn();
        console.log(`✅ Test passed: ${test.name}\n`);
        passed++;
      } catch (error) {
        console.error(`❌ Test failed: ${test.name}`);
        console.error(`   Error: ${error.message}`);
        console.error(`   Stack: ${error.stack}\n`);
        failed++;
      }
    }
    
    console.log("=== Test Summary ===");
    console.log(`Total: ${tests.length}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    
    // Return non-zero exit code if any tests failed
    if (failed > 0) {
      process.exit(1);
    }
  })();
}

module.exports = { tests };