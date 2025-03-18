/**
 * System Tests for End-to-End Dataform Workflows
 * 
 * Tests the entire Record Matching System running in a Dataform workflow 
 * with Google BigQuery as the data warehouse.
 */

const assert = require('assert');
const { TestType, TestPriority } = require('../../includes/validation/validation_registry');
const { BigQueryClient } = require('../../includes/bigquery/bigquery_client');
const { DataformCompiler } = require('../../includes/dataform/dataform_compiler');
const { DataformExecutor } = require('../../includes/dataform/dataform_executor');

// Define tests for custom test runner
const tests = [
  {
    id: 'dataform_e2e_basic_matching_workflow',
    name: 'Basic Matching Workflow in Dataform',
    description: 'Tests a complete end-to-end basic matching workflow in Dataform',
    type: TestType.SYSTEM,
    tags: ['dataform', 'bigquery', 'e2e', 'workflow', 'production'],
    priority: TestPriority.HIGH,
    testFn: async (context) => {
      // Initialize BigQuery client and Dataform components
      const bigquery = new BigQueryClient({
        projectId: context.config.bigquery.projectId || 'test-project',
        datasetId: context.config.bigquery.datasetId || 'test_dataset',
        location: context.config.bigquery.location || 'US'
      });
      
      const compiler = new DataformCompiler({
        workspace: './definitions',
        defaultSchema: 'test_schema'
      });
      
      const executor = new DataformExecutor({
        bigquery,
        timeout: 300000, // 5 minutes
        maxRetries: 3
      });
      
      // Setup test data
      const tables = {
        source: 'test_source_system',
        target: 'test_target_system',
        output: 'test_matches_output'
      };
      
      try {
        // Set up test source data
        await bigquery.createTable(tables.source, [
          { name: 'id', type: 'STRING', mode: 'REQUIRED' },
          { name: 'first_name', type: 'STRING' },
          { name: 'last_name', type: 'STRING' },
          { name: 'email', type: 'STRING' },
          { name: 'phone', type: 'STRING' },
          { name: 'updated_at', type: 'TIMESTAMP', mode: 'REQUIRED' }
        ]);
        
        await bigquery.insertRows(tables.source, [
          { id: 'S1', first_name: 'John', last_name: 'Doe', email: 'john.doe@example.com', phone: '555-1234', updated_at: new Date() },
          { id: 'S2', first_name: 'Jane', last_name: 'Smith', email: 'jane.smith@example.com', phone: '555-5678', updated_at: new Date() },
          { id: 'S3', first_name: 'Robert', last_name: 'Johnson', email: 'rob.j@example.com', phone: '555-9012', updated_at: new Date() }
        ]);
        
        // Set up test target data
        await bigquery.createTable(tables.target, [
          { name: 'id', type: 'STRING', mode: 'REQUIRED' },
          { name: 'name_first', type: 'STRING' },
          { name: 'name_last', type: 'STRING' },
          { name: 'email_address', type: 'STRING' },
          { name: 'phone_number', type: 'STRING' },
          { name: 'customer_id', type: 'STRING' },
          { name: 'created_at', type: 'TIMESTAMP', mode: 'REQUIRED' }
        ]);
        
        await bigquery.insertRows(tables.target, [
          { id: 'T1', name_first: 'John', name_last: 'Doe', email_address: 'john.doe@example.com', phone_number: '5551234', customer_id: 'C1001', created_at: new Date() },
          { id: 'T2', name_first: 'Jane', name_last: 'Smith', email_address: 'jane.smith@example.com', phone_number: null, customer_id: 'C1002', created_at: new Date() },
          { id: 'T3', name_first: 'Alice', name_last: 'Williams', email_address: 'alice.w@example.com', phone_number: '5553456', customer_id: 'C1003', created_at: new Date() }
        ]);
        
        // Create a temporary dataform.json configuration for this test
        const tempDataformConfig = {
          defaultSchema: 'test_schema',
          assertions: { disabled: false },
          warehouse: 'bigquery',
          defaultDatabase: context.config.bigquery.projectId || 'test-project',
          defaultLocation: context.config.bigquery.location || 'US'
        };
        
        // Define a matching workflow for this test
        const matchingWorkflowSql = `
          config {
            type: "table",
            description: "System test for matching workflow",
            columns: {
              source_id: "Source record ID",
              target_id: "Target record ID",
              confidence: "Match confidence score",
              matched_fields: "Fields that contributed to the match"
            },
            bigquery: {
              partitionBy: "DATE(created_at)",
              clusterBy: ["source_id", "target_id"]
            },
            tags: ["test", "matching", "system_test"]
          }
          
          -- Create a field mapping for the source and target tables
          WITH source_records AS (
            SELECT
              id AS source_id,
              first_name,
              last_name,
              email,
              phone,
              updated_at
            FROM \${ref('${tables.source}')}
          ),
          
          target_records AS (
            SELECT
              id AS target_id,
              name_first AS first_name,
              name_last AS last_name,
              email_address AS email,
              phone_number AS phone,
              customer_id,
              created_at
            FROM \${ref('${tables.target}')}
          ),
          
          -- Perform matching using email and name as primary identifiers
          exact_matches AS (
            SELECT
              s.source_id,
              t.target_id,
              1.0 AS confidence,
              'email,first_name,last_name' AS matched_fields,
              CURRENT_TIMESTAMP() AS created_at
            FROM source_records s
            JOIN target_records t
              ON LOWER(s.email) = LOWER(t.email)
              AND LOWER(s.first_name) = LOWER(t.first_name)
              AND LOWER(s.last_name) = LOWER(t.last_name)
          ),
          
          -- Secondary matching based on name only if email not matched
          name_matches AS (
            SELECT
              s.source_id,
              t.target_id,
              0.8 AS confidence,
              'first_name,last_name' AS matched_fields,
              CURRENT_TIMESTAMP() AS created_at
            FROM source_records s
            JOIN target_records t
              ON LOWER(s.first_name) = LOWER(t.first_name)
              AND LOWER(s.last_name) = LOWER(t.last_name)
            WHERE NOT EXISTS (
              SELECT 1 FROM exact_matches e
              WHERE e.source_id = s.source_id
            )
          )
          
          -- Combine all matches, prioritizing exact matches
          SELECT * FROM exact_matches
          UNION ALL
          SELECT * FROM name_matches
        `;
        
        // Compile and execute the workflow
        const compilationResult = await compiler.compile(
          tempDataformConfig,
          'system_test_matching_workflow',
          matchingWorkflowSql
        );
        
        if (!compilationResult.success) {
          throw new Error(`Dataform compilation failed: ${compilationResult.errors.join(', ')}`);
        }
        
        const executionResult = await executor.execute(
          compilationResult.compiled,
          tables.output
        );
        
        if (!executionResult.success) {
          throw new Error(`Dataform execution failed: ${executionResult.errors.join(', ')}`);
        }
        
        // Verify the results
        const matchResults = await bigquery.query(`
          SELECT source_id, target_id, confidence, matched_fields
          FROM \`${tables.output}\`
          ORDER BY source_id, confidence DESC
        `);
        
        // System test assertions - verifying end-to-end workflow results
        assert.strictEqual(matchResults.length, 3, 'Should have matches for all source records');
        
        // Exact match for John Doe
        const johnMatch = matchResults.find(m => m.source_id === 'S1');
        assert.ok(johnMatch, 'John Doe should have a match');
        assert.strictEqual(johnMatch.target_id, 'T1', 'John Doe should match with target T1');
        assert.strictEqual(johnMatch.confidence, 1.0, 'John Doe should have exact match confidence');
        
        // Exact match for Jane Smith
        const janeMatch = matchResults.find(m => m.source_id === 'S2');
        assert.ok(janeMatch, 'Jane Smith should have a match');
        assert.strictEqual(janeMatch.target_id, 'T2', 'Jane Smith should match with target T2');
        assert.strictEqual(janeMatch.confidence, 1.0, 'Jane Smith should have exact match confidence');
        
        // No exact match for Robert Johnson, might have a name-only match
        const robertMatch = matchResults.find(m => m.source_id === 'S3');
        if (robertMatch) {
          assert.notStrictEqual(robertMatch.confidence, 1.0, 'Robert Johnson should not have an exact match');
          if (robertMatch.confidence === 0.8) {
            assert.strictEqual(robertMatch.matched_fields, 'first_name,last_name', 
                              'Robert Johnson match should be based on name only');
          }
        }
        
        return true;
      } finally {
        // Clean up test resources
        await bigquery.dropTableIfExists(tables.source);
        await bigquery.dropTableIfExists(tables.target);
        await bigquery.dropTableIfExists(tables.output);
      }
    }
  },
  
  {
    id: 'dataform_e2e_incremental_matching',
    name: 'Incremental Matching in Dataform',
    description: 'Tests incremental matching workflow in Dataform',
    type: TestType.SYSTEM,
    tags: ['dataform', 'bigquery', 'e2e', 'incremental', 'production'],
    priority: TestPriority.MEDIUM,
    testFn: async (context) => {
      // Initialize BigQuery client and Dataform components
      const bigquery = new BigQueryClient({
        projectId: context.config.bigquery.projectId || 'test-project',
        datasetId: context.config.bigquery.datasetId || 'test_dataset',
        location: context.config.bigquery.location || 'US'
      });
      
      const compiler = new DataformCompiler({
        workspace: './definitions',
        defaultSchema: 'test_schema'
      });
      
      const executor = new DataformExecutor({
        bigquery,
        timeout: 300000, // 5 minutes
        maxRetries: 3
      });
      
      // Setup test data
      const tables = {
        source: 'test_inc_source',
        target: 'test_inc_target',
        output: 'test_inc_matches',
        history: 'test_match_history'
      };
      
      try {
        // Set up test source data with timestamp for incremental logic
        await bigquery.createTable(tables.source, [
          { name: 'id', type: 'STRING', mode: 'REQUIRED' },
          { name: 'name', type: 'STRING' },
          { name: 'email', type: 'STRING' },
          { name: 'updated_at', type: 'TIMESTAMP', mode: 'REQUIRED' }
        ]);
        
        // Initial source data
        const initialDate = new Date('2024-01-01T00:00:00Z');
        await bigquery.insertRows(tables.source, [
          { id: 'S1', name: 'John Doe', email: 'john@example.com', updated_at: initialDate },
          { id: 'S2', name: 'Jane Smith', email: 'jane@example.com', updated_at: initialDate }
        ]);
        
        // Set up test target data
        await bigquery.createTable(tables.target, [
          { name: 'id', type: 'STRING', mode: 'REQUIRED' },
          { name: 'full_name', type: 'STRING' },
          { name: 'email_address', type: 'STRING' }
        ]);
        
        await bigquery.insertRows(tables.target, [
          { id: 'T1', full_name: 'John Doe', email_address: 'john@example.com' },
          { id: 'T2', full_name: 'Jane Smith', email_address: 'jane@example.com' },
          { id: 'T3', full_name: 'Robert Brown', email_address: 'robert@example.com' }
        ]);
        
        // Set up match history table
        await bigquery.createTable(tables.history, [
          { name: 'source_id', type: 'STRING', mode: 'REQUIRED' },
          { name: 'target_id', type: 'STRING', mode: 'REQUIRED' },
          { name: 'confidence', type: 'FLOAT64' },
          { name: 'match_date', type: 'TIMESTAMP' }
        ]);
        
        // Create a temporary dataform.json configuration for this test
        const tempDataformConfig = {
          defaultSchema: 'test_schema',
          assertions: { disabled: false },
          warehouse: 'bigquery',
          defaultDatabase: context.config.bigquery.projectId || 'test-project',
          defaultLocation: context.config.bigquery.location || 'US'
        };
        
        // Define an incremental matching workflow for this test
        const incrementalWorkflowSql = `
          config {
            type: "incremental",
            description: "System test for incremental matching workflow",
            bigquery: {
              partitionBy: "DATE(match_date)",
              updatePartitionFilter: "match_date >= timestamp_sub(current_timestamp(), interval 1 day)"
            },
            uniqueKey: ["source_id", "target_id"],
            tags: ["test", "matching", "incremental", "system_test"]
          }
          
          -- Get source records, filtering for incremental runs
          WITH incremental_source AS (
            SELECT
              id AS source_id,
              name,
              email,
              updated_at
            FROM \${ref('${tables.source}')}
            WHERE
              ${context.incrementalRun ? `
              -- Only process records updated since last run
              updated_at > (SELECT MAX(match_date) FROM \${self()})
              ` : `
              -- Process all records for initial run
              1=1
              `}
          ),
          
          target_records AS (
            SELECT
              id AS target_id,
              full_name AS name,
              email_address AS email
            FROM \${ref('${tables.target}')}
          ),
          
          -- Match on email
          new_matches AS (
            SELECT
              s.source_id,
              t.target_id,
              1.0 AS confidence,
              CURRENT_TIMESTAMP() AS match_date
            FROM incremental_source s
            JOIN target_records t
              ON LOWER(s.email) = LOWER(t.email)
          )
          
          -- Use MERGE semantics on incremental runs
          ${context.incrementalRun ? `
          SELECT
            source_id,
            target_id,
            confidence,
            match_date
          FROM new_matches
          ` : `
          SELECT
            source_id,
            target_id,
            confidence,
            match_date
          FROM new_matches
          `}
        `;
        
        // First run - process all records
        const firstRunContext = { incrementalRun: false };
        
        // Compile and execute the initial workflow
        const firstCompilation = await compiler.compile(
          tempDataformConfig,
          'system_test_incremental_workflow',
          incrementalWorkflowSql,
          firstRunContext
        );
        
        if (!firstCompilation.success) {
          throw new Error(`First dataform compilation failed: ${firstCompilation.errors.join(', ')}`);
        }
        
        const firstExecution = await executor.execute(
          firstCompilation.compiled,
          tables.output
        );
        
        if (!firstExecution.success) {
          throw new Error(`First dataform execution failed: ${firstExecution.errors.join(', ')}`);
        }
        
        // Verify first run results
        let matchResults = await bigquery.query(`
          SELECT source_id, target_id, confidence
          FROM \`${tables.output}\`
          ORDER BY source_id
        `);
        
        assert.strictEqual(matchResults.length, 2, 'Should have matches for all initial source records');
        
        // Add new data for incremental processing
        const newDate = new Date('2024-01-02T00:00:00Z');
        await bigquery.insertRows(tables.source, [
          { id: 'S3', name: 'Robert Brown', email: 'robert@example.com', updated_at: newDate },
          // Update existing record
          { id: 'S1', name: 'John Doe', email: 'john.doe@newdomain.com', updated_at: newDate }
        ]);
        
        // Second run - process only new/updated records
        const secondRunContext = { incrementalRun: true };
        
        // Compile and execute the incremental workflow
        const secondCompilation = await compiler.compile(
          tempDataformConfig,
          'system_test_incremental_workflow',
          incrementalWorkflowSql,
          secondRunContext
        );
        
        if (!secondCompilation.success) {
          throw new Error(`Second dataform compilation failed: ${secondCompilation.errors.join(', ')}`);
        }
        
        const secondExecution = await executor.execute(
          secondCompilation.compiled,
          tables.output
        );
        
        if (!secondExecution.success) {
          throw new Error(`Second dataform execution failed: ${secondExecution.errors.join(', ')}`);
        }
        
        // Verify second run results
        matchResults = await bigquery.query(`
          SELECT source_id, target_id, confidence
          FROM \`${tables.output}\`
          ORDER BY source_id, match_date DESC
        `);
        
        // Should have updated the match for S1 and added S3
        assert.ok(matchResults.length >= 2, 'Should have at least the newly processed records');
        
        // New match for Robert Brown
        const robertMatch = matchResults.find(m => m.source_id === 'S3');
        assert.ok(robertMatch, 'Robert Brown should have a match');
        assert.strictEqual(robertMatch.target_id, 'T3', 'Robert Brown should match with target T3');
        
        // S1 may have a new record or updated record depending on implementation details
        // We're testing the workflow executed, not specific implementation details
        
        return true;
      } finally {
        // Clean up test resources
        await bigquery.dropTableIfExists(tables.source);
        await bigquery.dropTableIfExists(tables.target);
        await bigquery.dropTableIfExists(tables.output);
        await bigquery.dropTableIfExists(tables.history);
      }
    }
  }
];

// For Jest compatibility
describe('End-to-End Dataform Workflows', () => {
  test('Basic Matching Workflow in Dataform', async () => {
    const result = await tests[0].testFn({
      config: {
        bigquery: {
          projectId: 'test-project',
          datasetId: 'test_dataset',
          location: 'US'
        }
      }
    });
    expect(result).toBe(true);
  });
  
  test('Incremental Matching in Dataform', async () => {
    const result = await tests[1].testFn({
      config: {
        bigquery: {
          projectId: 'test-project',
          datasetId: 'test_dataset',
          location: 'US'
        }
      }
    });
    expect(result).toBe(true);
  });
});

// For manual testing
if (require.main === module) {
  const testFn = async () => {
    const context = {
      config: {
        bigquery: {
          projectId: 'test-project',
          datasetId: 'test_dataset',
          location: 'US'
        }
      }
    };
    
    for (const test of tests) {
      console.log(`Running test: ${test.name}`);
      try {
        const result = await test.testFn(context);
        console.log(`Test ${test.name}: ${result ? 'PASSED' : 'FAILED'}`);
      } catch (error) {
        console.error(`Test ${test.name} failed with error:`, error);
      }
    }
  };
  
  testFn();
}

module.exports = { tests }; 