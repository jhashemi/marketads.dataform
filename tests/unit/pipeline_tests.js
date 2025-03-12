const pipelineGenerator = require('../../includes/pipeline/generator');
const assert = require('assert');

describe('Pipeline Generator', () => {
  
  test('generateMatchingPipeline creates complete pipeline SQL', () => {
    const config = {
      sourceTable: 'source_table',
      referenceTables: [
        { name: 'reference_table_1', priority: 1 },
        { name: 'reference_table_2', priority: 2 }
      ],
      fieldMappings: {
        firstName: { source: 'first_name', target: 'firstname', type: 'first_name' },
        lastName: { source: 'last_name', target: 'lastname', type: 'last_name' }
      },
      appendFields: ['customer_id'],
      outputTable: 'match_results'
    };
    
    const sql = pipelineGenerator.generateMatchingPipeline(config);
    
    // Should create temporary tables for each step
    assert(sql.includes('CREATE OR REPLACE TEMPORARY TABLE'), 'Should create temp tables');
    
    // Should include source and reference tables
    assert(sql.includes('source_table'), 'Should include source table');
    assert(sql.includes('reference_table_1'), 'Should include first reference table');
    assert(sql.includes('reference_table_2'), 'Should include second reference table');
    
    // Should generate blocking keys
    assert(sql.includes('blocking_keys'), 'Should generate blocking keys');
    
    // Should match in priority order
    assert(sql.includes('ORDER BY reference_priority'), 'Should order by reference priority');
    
    // Should create final output table
    assert(sql.includes(`CREATE OR REPLACE TABLE \`match_results\``), 'Should create output table');
  });
  
  test('generateTransitiveClosureSql creates correct SQL for finding clusters', () => {
    const sql = pipelineGenerator.generateTransitiveClosureSql('matches_table', {
      outputTable: 'clusters_table',
      maxIterations: 3
    });
    
    // Should use recursive CTE
    assert(sql.includes('WITH RECURSIVE'), 'Should use recursive CTE');
    
    // Should handle direct matches
    assert(sql.includes('FROM `matches_table`'), 'Should select from matches table');
    
    // Should compute transitive closure
    assert(sql.includes('UNION ALL'), 'Should use UNION ALL for recursive step');
    
    // Should find connected components
    assert(sql.includes('component_id'), 'Should identify connected components');
    
    // Should create output table with cluster info
    assert(sql.includes(`CREATE OR REPLACE TABLE \`clusters_table\``), 
           'Should create clusters table');
    assert(sql.includes('cluster_members'), 'Should include cluster members');
    assert(sql.includes('cluster_size'), 'Should include cluster size');
  });
  
  test('generateIncrementalMatchingPipeline handles incremental updates', () => {
    const config = {
      sourceTable: 'source_table',
      targetTable: 'target_table',
      fieldMappings: {
        firstName: { source: 'first_name', target: 'firstname', type: 'first_name' },
        lastName: { source: 'last_name', target: 'lastname', type: 'last_name' }
      },
      appendFields: ['customer_id'],
      outputTable: 'match_results',
      incrementalField: 'updated_at',
      lookbackDays: 7
    };
    
    const sql = pipelineGenerator.generateIncrementalMatchingPipeline(config);
    
    // Should filter to only new/updated records
    assert(sql.includes('LEFT JOIN'), 'Should LEFT JOIN for filtering');
    assert(sql.includes('source_id IS NULL'), 'Should include new records');
    assert(sql.includes('updated_at >'), 'Should include updated records');
    
    // Should use lookback period
    assert(sql.includes('INTERVAL 7 DAY'), 'Should use lookback period');
    
    // Should merge with existing results
    assert(sql.includes('UNION ALL'), 'Should UNION with existing results');
  });
});
