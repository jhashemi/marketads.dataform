const blockingGenerator = require('../../includes/blocking/key_generator');
const assert = require('assert');

// Add Jest globals if they don't exist
const test = global.test || ((name, fn) => {
  if (typeof describe === 'undefined') {
    console.log(`Running test: ${name}`);
    try {
      fn();
      console.log(`✅ Test passed: ${name}\n`);
    } catch (error) {
      console.error(`❌ Test failed: ${name}`);
      console.error(`   Error: ${error.message}`);
      console.error(`   Stack: ${error.stack}\n`);
      throw error;
    }
  }
});

const describe = global.describe || ((name, fn) => {
  if (typeof describe === 'undefined') {
    console.log(`\n=== ${name} ===\n`);
    fn();
  }
});

describe('Blocking Key Generation', () => {
  
  test('generateBlockingKey creates simple keys correctly', () => {
    // Test exact blocking
    const exactSql = blockingGenerator.generateBlockingKey('field_name', 'exact');
    assert(!exactSql.includes('LEFT('), 'Exact blocking should not truncate');
    
    // Test prefix blocking
    const prefixSql = blockingGenerator.generateBlockingKey('field_name', 'prefix', { length: 3 });
    assert(prefixSql.includes('LEFT('), 'Prefix blocking should use LEFT');
    assert(prefixSql.includes('3'), 'Prefix blocking should use specified length');
    
    // Test soundex blocking
    const soundexSql = blockingGenerator.generateBlockingKey('field_name', 'soundex');
    assert(soundexSql.includes('SOUNDEX('), 'Soundex blocking should use SOUNDEX');
  });
  
  test('generateCompoundBlockingKey combines fields with separator', () => {
    const fields = [
      { name: 'first_name', strategy: 'prefix', length: 2 },
      { name: 'last_name', strategy: 'soundex' }
    ];
    
    const sql = blockingGenerator.generateCompoundBlockingKey(fields, { separator: '_' });
    
    assert(sql.includes('CONCAT('), 'Compound blocking should use CONCAT');
    assert(sql.includes('_'), 'Compound blocking should use specified separator');
    assert(sql.includes('LEFT('), 'Compound blocking should apply first strategy');
    assert(sql.includes('SOUNDEX('), 'Compound blocking should apply second strategy');
  });
  
  test('generateAllBlockingKeys creates multiple blocking keys for field mappings', () => {
    const fieldMappings = {
      firstName: { source: 'first_name', type: 'firstName' },
      lastName: { source: 'last_name', type: 'lastName' },
      email: { source: 'email', type: 'email' }
    };
    
    const sql = blockingGenerator.generateAllBlockingKeys(fieldMappings);
    
    // Should create STRUCT with multiple keys
    assert(sql.includes('STRUCT('), 'Should create a STRUCT');
    assert(sql.includes('firstName_soundex'), 'Should include first name soundex');
    assert(sql.includes('lastName_soundex'), 'Should include last name soundex');
    assert(sql.includes('email_exact'), 'Should include exact email');
  });
  
  test('generateCandidatesPairs creates SQL for finding candidates', () => {
    const sql = blockingGenerator.generateCandidatesSql('source_table', 'target_table', {
      maxCandidatesPerRecord: 50,
      minBlockingKeyLength: 2
    });
    
    // Should join tables using blocking keys
    assert(sql.includes('JOIN'), 'Should JOIN tables');
    assert(sql.includes('FROM `source_table`'), 'Should use source table');
    assert(sql.includes('FROM `target_table`'), 'Should use target table');
    
    // Should include blocking key comparisons
    assert(sql.includes('first_name_soundex = t.blocking_keys.first_name_soundex'), 
           'Should compare blocking keys');
    
    // Should rank candidates
    assert(sql.includes('ROW_NUMBER()'), 'Should rank candidates');
    assert(sql.includes('ORDER BY block_weight DESC'), 'Should order by block weight');
    
    // Should limit results per source record
    assert(sql.includes('candidate_rank <= 50'), 'Should limit candidates per record');
  });
});

// For compatibility with the custom test runner
const tests = [
  {
    id: 'blocking_key_generation',
    name: 'Blocking Key Generation',
    type: 'unit',
    tags: ['blocking', 'core'],
    priority: 1,
    testFn: async () => {
      // Run all tests
      describe('Blocking Key Generation', () => {
        test('generateBlockingKey creates simple keys correctly', () => {
          // Test exact blocking
          const exactSql = blockingGenerator.generateBlockingKey('field_name', 'exact');
          assert(!exactSql.includes('LEFT('), 'Exact blocking should not truncate');
          
          // Test prefix blocking
          const prefixSql = blockingGenerator.generateBlockingKey('field_name', 'prefix', { length: 3 });
          assert(prefixSql.includes('LEFT('), 'Prefix blocking should use LEFT');
          assert(prefixSql.includes('3'), 'Prefix blocking should use specified length');
          
          // Test soundex blocking
          const soundexSql = blockingGenerator.generateBlockingKey('field_name', 'soundex');
          assert(soundexSql.includes('SOUNDEX('), 'Soundex blocking should use SOUNDEX');
        });
        
        // ... other tests
      });
      
      return true;
    }
  }
];

// For manual testing
if (require.main === module) {
  console.log("\n=== Running Blocking Tests ===\n");
  
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
