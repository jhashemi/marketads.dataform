const assert = require('assert');
const matchingFunctions = require('../../includes/matching_functions');

/**
 * Test file for the matching functions
 * These tests validate the core matching functionality used for record linkage
 */
const tests = [
  {
    id: 'matching_functions_standardize_name',
    name: 'standardize name function',
    type: 'unit',
    tags: ['matching', 'core', 'standardization'],
    priority: 1,
    testFn: async () => {
      // Test standardizing names
      assert.strictEqual(matchingFunctions.standardize('  Mr. John Smith Jr. ', 'name'), 'JOHN SMITH', 
        'Should remove titles, suffixes, and normalize spacing');
      
      assert.strictEqual(matchingFunctions.standardize('Dr. Jane Doe, PHD', 'name'), 'JANE DOE', 
        'Should remove titles, suffixes with commas, and normalize case');
      
      assert.strictEqual(matchingFunctions.standardize('Ms.  Alice   Wonderland   ', 'name'), 'ALICE WONDERLAND', 
        'Should normalize multiple spaces');
      
      // Test with null/empty inputs
      assert.strictEqual(matchingFunctions.standardize(null, 'name'), '', 
        'Should handle null input');
      
      assert.strictEqual(matchingFunctions.standardize(undefined, 'name'), '', 
        'Should handle undefined input');
      
      return true;
    }
  },
  {
    id: 'matching_functions_standardize_address',
    name: 'standardize address function',
    type: 'unit',
    tags: ['matching', 'core', 'standardization'],
    priority: 1,
    testFn: async () => {
      // Test standardizing addresses
      assert.strictEqual(matchingFunctions.standardize('123 Main Street APT 1', 'address'), '123 MAIN ST APT 1', 
        'Should standardize common address terms');
      
      assert.strictEqual(matchingFunctions.standardize('456 Oak Avenue, apartment 2', 'address'), '456 OAK AVE APT 2', 
        'Should normalize apartment designations');
      
      assert.strictEqual(matchingFunctions.standardize('789 Pine Boulevard', 'address'), '789 PINE BLVD', 
        'Should abbreviate boulevard');
      
      // Test with null/empty inputs
      assert.strictEqual(matchingFunctions.standardize(null, 'address'), '', 
        'Should handle null input');
      
      return true;
    }
  },
  {
    id: 'matching_functions_standardize_phone',
    name: 'standardize phone function',
    type: 'unit',
    tags: ['matching', 'core', 'standardization'],
    priority: 1,
    testFn: async () => {
      // Test standardizing phone numbers
      assert.strictEqual(matchingFunctions.standardize('(123) 456-7890', 'phone'), '1234567890', 
        'Should remove formatting characters');
      
      assert.strictEqual(matchingFunctions.standardize('123.456.7890 ext 123', 'phone'), '1234567890123', 
        'Should preserve extension numbers');
      
      // Test with null/empty inputs
      assert.strictEqual(matchingFunctions.standardize(null, 'phone'), '', 
        'Should handle null input');
      
      return true;
    }
  },
  {
    id: 'matching_functions_standardize_email',
    name: 'standardize email function',
    type: 'unit',
    tags: ['matching', 'core', 'standardization'],
    priority: 1,
    testFn: async () => {
      // Test standardizing emails
      assert.strictEqual(matchingFunctions.standardize('  Test@Example.com  ', 'email'), 'test@example.com', 
        'Should lowercase and trim email addresses');
      
      // Test with null/empty inputs
      assert.strictEqual(matchingFunctions.standardize(null, 'email'), '', 
        'Should handle null input');
      
      return true;
    }
  },
  {
    id: 'matching_functions_standardize_zip',
    name: 'standardize zip function',
    type: 'unit',
    tags: ['matching', 'core', 'standardization'],
    priority: 1,
    testFn: async () => {
      // Test standardizing zip codes
      assert.strictEqual(matchingFunctions.standardize('12345-6789', 'zip'), '12345', 
        'Should extract just the 5-digit portion');
      
      assert.strictEqual(matchingFunctions.standardize('abc123def', 'zip'), '123', 
        'Should extract just the numeric portion');
      
      // Test with null/empty inputs
      assert.strictEqual(matchingFunctions.standardize(null, 'zip'), '', 
        'Should handle null input');
      
      return true;
    }
  },
  {
    id: 'matching_functions_standardize_name_invalid_fieldType',
    name: 'standardize name function - invalid fieldType',
    type: 'unit',
    tags: ['matching', 'core', 'standardization', 'validation'],
    priority: 2, // Low priority, only run if core tests pass
    testFn: async () => {
      assert.throws(
        () => matchingFunctions.standardize('John Smith', 123),
        Error,
        'Should throw error for invalid fieldType (number)'
      );
      assert.throws(
        () => matchingFunctions.standardize('John Smith', null),
        Error,
        'Should throw error for invalid fieldType (null)'
      );
      assert.throws(
        () => matchingFunctions.standardize('John Smith', 'invalid_type'),
        Error,
        'Should throw error for invalid fieldType (invalid_type)'
      );
      return true;
    }
  },
  {
    id: 'matching_functions_phoneticCode',
    name: 'phoneticCode function',
    type: 'unit',
    tags: ['matching', 'core', 'phonetic'],
    priority: 1,
    testFn: async () => {
      // Test phonetic coding of names
      // These tests will be dependent on your implementation
      // If using Soundex, Smith and Smyth should have the same code
      
      const code1 = matchingFunctions.phoneticCode('Smith');
      const code2 = matchingFunctions.phoneticCode('Smyth');
      
      // If using soundex, both should start with S and have the same code
      assert.ok(code1.startsWith('S'), 'Soundex code for Smith should start with S');
      assert.ok(code1 === code2, 'Smith and Smyth should have the same phonetic code');
      
      // Test with null/empty inputs
      assert.strictEqual(matchingFunctions.phoneticCode(null), '', 
        'Should handle null input');
      
      assert.strictEqual(matchingFunctions.phoneticCode(''), '', 
        'Should handle empty string');
      
      return true;
    }
  },
    {
    id: 'matching_functions_phoneticCode_invalid_algorithm',
    name: 'phoneticCode function - invalid algorithm',
    type: 'unit',
    tags: ['matching', 'core', 'phonetic', 'validation'],
    priority: 2, // Low priority, only run if core tests pass
    testFn: async () => {
      assert.throws(
        () => matchingFunctions.phoneticCode('Smith', 123),
        Error,
        'Should throw error for invalid algorithm (number)'
      );
      assert.throws(
        () => matchingFunctions.phoneticCode('Smith', null),
        Error,
        'Should throw error for invalid algorithm (null)'
      );
      assert.throws(
        () => matchingFunctions.phoneticCode('Smith', 'invalid_algorithm'),
        Error,
        'Should throw error for invalid algorithm (invalid_algorithm)'
      );
      return true;
    }
  },
  {
    id: 'matching_functions_generateBlockingKeys',
    name: 'generateBlockingKeys function',
    type: 'unit',
    tags: ['matching', 'core', 'blocking'],
    priority: 1,
    testFn: async () => {
      // Test generating zipcode blocking key
      const record1 = { ZipCode: '12345' };
      const blockingKeys1 = matchingFunctions.generateBlockingKeys(record1, 'zipcode');
      assert.deepStrictEqual(blockingKeys1, ['ZIP:12345'], 
        'Should generate zipcode blocking key');
      
      // Test generating name_zip blocking key
      const record2 = { LastName: 'Smith', ZipCode: '12345' };
      const blockingKeys2 = matchingFunctions.generateBlockingKeys(record2, 'name_zip');
      assert.deepStrictEqual(blockingKeys2, ['LZ:SMIT12345'], 
        'Should generate name_zip blocking key');
      
      // Test with missing fields
      const record3 = { FirstName: 'John' };
      const blockingKeys3 = matchingFunctions.generateBlockingKeys(record3, 'name_zip');
      assert.deepStrictEqual(blockingKeys3, [], 
        'Should return empty array if required fields are missing');
      
      return true;
    }
 },
  {
    id: 'matching_functions_generateBlockingKeys_invalid_params',
    name: 'generateBlockingKeys function - invalid params',
    type: 'unit',
    tags: ['matching', 'core', 'blocking', 'validation'],
    priority: 2, // Low priority, only run if core tests pass
    testFn: async () => {
      assert.throws(
        () => matchingFunctions.generateBlockingKeys('invalid record', 'zipcode'),
        Error,
        'Should throw error for invalid record (string)'
      );
      assert.throws(
        () => matchingFunctions.generateBlockingKeys(null, 'zipcode'),
        Error,
        'Should throw error for invalid record (null)'
      );
      assert.throws(
        () => matchingFunctions.generateBlockingKeys({}, 123),
        Error,
        'Should throw error for invalid method (number)'
      );
      assert.throws(
        () => matchingFunctions.generateBlockingKeys({}, null),
        Error,
        'Should throw error for invalid method (null)'
      );
      assert.throws(
        () => matchingFunctions.generateBlockingKeys({}, 'invalid_method'),
        Error,
        'Should throw error for invalid method (invalid_method)'
      );
      return true;
    }
  },
];

// Add Jest compatibility layer
if (typeof describe === 'function') {
  describe('Matching Functions', () => {
    tests.forEach(test => {
      it(test.name, async () => {
        const result = await test.testFn();
        expect(result).toBeTruthy();
      });
    });
  });
}

// For manual testing only
if (require.main === module) {
  console.log("\n=== Running Matching Functions Tests ===\n");
  
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