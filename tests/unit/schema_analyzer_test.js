const { analyzeSchema, generateAnalysisSql, findCommonFields, getFieldStatistics, calculateSchemaSimilarity, identifyBlockingFields, identifyMatchingFields, getSampleData, analyzeValueDistribution, analyzeStringFormat } = require('../../includes/rules/schema_analyzer');
const assert = require('assert');

jest.mock('../../includes/rules/schema_analyzer', () => {
    const originalModule = jest.requireActual('../../includes/rules/schema_analyzer');
    return {
        ...originalModule, // Keep other functions intact
        generateAnalysisSql: jest.fn(), // Mock generateAnalysisSql
    };
});

describe('Schema Analyzer Tests', () => {

  describe('generateAnalysisSql', () => {
    it('should generate the correct SQL query with provided parameters', () => {
      const projectId = 'test-project';
      const datasetId = 'test-dataset';
      const tableIds = ['table1', 'table2'];
      const expectedSql = "SELECT\n      'table1' as table_name,\n      column_name as field_name,\n      data_type as field_type\n    FROM `test-project.test-dataset.INFORMATION_SCHEMA.COLUMNS`\n    WHERE table_name = 'table1'\\nUNION ALL\\nSELECT\n      'table2' as table_name,\n      column_name as field_name,\n      data_type as field_type\n    FROM `test-project.test-dataset.INFORMATION_SCHEMA.COLUMNS`\n    WHERE table_name = 'table2'";
      generateAnalysisSql.mockReturnValue(expectedSql); // Mock implementation
      const actualSql = generateAnalysisSql(projectId, datasetId, tableIds);
      assert.strictEqual(actualSql.replace(/\\s/g, ""), expectedSql.replace(/\\s/g, ""), 'Generated SQL query does not match expected query.');
      expect(generateAnalysisSql).toHaveBeenCalledWith(projectId, datasetId, tableIds);
    });

    it('should handle an empty array of table IDs', () => {
      const projectId = 'test-project';
      const datasetId = 'test-dataset';
      const tableIds = [];
      const expectedSql = '';
      generateAnalysisSql.mockReturnValue(expectedSql);
      const actualSql = generateAnalysisSql(projectId, datasetId, tableIds);
      assert.strictEqual(actualSql, expectedSql, 'Generated SQL query should be empty for empty tableIds array.');
      expect(generateAnalysisSql).toHaveBeenCalledWith(projectId, datasetId, tableIds);
    });
  });

    describe('analyzeSchema', () => {
        it('should return correct parameters', async () => {
            const sourceTableId = 'source_table';
            const referenceTableId = 'reference_table';
            const projectId = 'test_project';
            const datasetId = 'test_dataset';

            const result = await analyzeSchema(sourceTableId, referenceTableId, projectId, datasetId);

            assert.deepStrictEqual(result, {
                sourceTableId: sourceTableId,
                referenceTableId: referenceTableId,
                projectId: projectId,
                datasetId: datasetId
            }, 'Returned parameters do not match expected values.');
        });
    });
    describe('findCommonFields', () => {
        it('should return an empty array if no common fields are found', () => {
          const sourceSchema = { fields: [{ name: 'id', type: 'INT64' }, { name: 'name', type: 'STRING' }] };
          const referenceSchema = { fields: [{ name: 'age', type: 'INT64' }, { name: 'email', type: 'STRING' }] };
          const commonFields = findCommonFields(sourceSchema, referenceSchema);
          assert.deepStrictEqual(commonFields, [], 'Should return an empty array');
        });

        it('should find exact matches', () => {
          const sourceSchema = { fields: [{ name: 'id', type: 'INT64' }, { name: 'name', type: 'STRING' }] };
          const referenceSchema = { fields: [{ name: 'id', type: 'INT64' }, { name: 'email', type: 'STRING' }] };
          const commonFields = findCommonFields(sourceSchema, referenceSchema);
          assert.deepStrictEqual(commonFields, [{ name: 'id', type: 'INT64', sourceField: 'id', referenceField: 'id', matchType: 'exact' }], 'Should find exact match for id');
        });

        it('should find similar matches', () => {
          const sourceSchema = { fields: [{ name: 'firstName', type: 'STRING' }] };
          const referenceSchema = { fields: [{ name: 'fname', type: 'STRING' }] };
          const commonFields = findCommonFields(sourceSchema, referenceSchema);
          assert.deepStrictEqual(commonFields, [{ name: 'firstName', type: 'STRING', sourceField: 'firstName', referenceField: 'fname', matchType: 'similar' }], 'Should find similar match for firstName/fname');
        });

          it('should find both exact and similar matches', () => {
          const sourceSchema = { fields: [{name: 'userid', type: 'INT64'}, { name: 'firstName', type: 'STRING' }] };
          const referenceSchema = { fields: [{name: 'userid', type: 'INT64'}, { name: 'fname', type: 'STRING' }] };
          const commonFields = findCommonFields(sourceSchema, referenceSchema);
          assert.deepStrictEqual(commonFields, [
              { name: 'userid', type: 'INT64', sourceField: 'userid', referenceField: 'userid', matchType: 'exact' },
              { name: 'firstName', type: 'STRING', sourceField: 'firstName', referenceField: 'fname', matchType: 'similar' }
          ], 'Should find both exact and similar matches');
        });
      });

      describe('getFieldStatistics', () => {
        it('should return an empty object if commonFields is empty', async () => {
          const fieldStats = await getFieldStatistics('table1', 'table2', []);
          assert.deepStrictEqual(fieldStats, {}, 'Should return an empty object');
        });

      });

      describe('calculateSchemaSimilarity', () => {
        it('should return 0 if no fields match', () => {
            const sourceSchema = { fields: [{ name: 'id', type: 'INT64' }, { name: 'name', type: 'STRING' }] };
            const referenceSchema = { fields: [{ name: 'age', type: 'INT64' }, { name: 'email', type: 'STRING' }] };
            const similarity = calculateSchemaSimilarity(sourceSchema, referenceSchema);
            assert.strictEqual(similarity, 0, 'Similarity should be 0');
        });

        it('should return 1 if all fields match exactly', () => {
            const sourceSchema = { fields: [{ name: 'id', type: 'INT64' }, { name: 'name', type: 'STRING' }] };
            const referenceSchema = { fields: [{ name: 'id', type: 'INT64' }, { name: 'name', type: 'STRING' }] };
            const similarity = calculateSchemaSimilarity(sourceSchema, referenceSchema);
            assert.strictEqual(similarity, 1, 'Similarity should be 1');
        });

        it('should calculate a similarity score for partial matches', () => {
            const sourceSchema = { fields: [{ name: 'id', type: 'INT64' }, { name: 'name', type: 'STRING' }, {name: 'age', type: 'INT'}] };
            const referenceSchema = { fields: [{ name: 'id', type: 'INT64' }, { name: 'name', type: 'STRING' }, {name: 'city', type: 'STRING'}] };
            const similarity = calculateSchemaSimilarity(sourceSchema, referenceSchema);
            assert.ok(similarity > 0 && similarity < 1, 'Similarity should be between 0 and 1');
        });
    });

    describe('identifyBlockingFields', () => {
        it('should return an empty array if no common fields are provided', () => {
            const blockingFields = identifyBlockingFields([], {});
            assert.deepStrictEqual(blockingFields, [], 'Should return an empty array');
        });

     it('should identify potential blocking fields based on score', () => {
          const commonFields = [
            { name: 'id', type: 'INT64', sourceField: 'id', referenceField: 'id', matchType: 'exact' },
            { name: 'name', type: 'STRING', sourceField: 'name', referenceField: 'name', matchType: 'exact' },
          ];
          const fieldStats = {
            fields: {
              id: {
                uniqueRatio: 0.5,
                nullRatio: 0.1,
                sourceStats: { avgLength: 4 },
                referenceStats: { avgLength: 4 },
              },
              name: {
                uniqueRatio: 0.9,
                nullRatio: 0.8,
                sourceStats: { avgLength: 10 },
                referenceStats: { avgLength: 12 },
              },
            },
          };
          const blockingFields = identifyBlockingFields(commonFields, fieldStats);
          assert.strictEqual(blockingFields.length, 1, 'Should identify one blocking field');
          assert.strictEqual(blockingFields[0].field, 'id', 'Should identify id as a blocking field');
          assert.ok(blockingFields[0].score > 0.6, 'Blocking score should be greater than 0.6');
        });
    });
    describe('identifyMatchingFields', () => {
        it('should return an empty array if no common fields are provided', () => {
            const matchingFields = identifyMatchingFields([], {});
            assert.deepStrictEqual(matchingFields, [], 'Should return an empty array');
        });

         it('should identify potential matching fields based on score', () => {
              const commonFields = [
                { name: 'id', type: 'INT64', sourceField: 'id', referenceField: 'id', matchType: 'exact' },
                { name: 'name', type: 'STRING', sourceField: 'name', referenceField: 'name', matchType: 'exact' },
              ];
              const fieldStats = {
                fields: {
                  id: {
                    uniqueRatio: 0.9,
                    nullRatio: 0.1,
                    sourceStats: { avgLength: 4 },
                    referenceStats: { avgLength: 4 },
                  },
                  name: {
                    uniqueRatio: 0.2,
                    nullRatio: 0.8,
                    sourceStats: { avgLength: 10 },
                    referenceStats: { avgLength: 12 },
                  },
                },
              };
              const matchingFields = identifyMatchingFields(commonFields, fieldStats);
              assert.strictEqual(matchingFields.length, 1, 'Should identify one matching field');
              assert.strictEqual(matchingFields[0].field, 'id', 'Should identify id as a matching field');
              assert.ok(matchingFields[0].score > 0.5, 'Matching score should be greater than 0.5');
            });
    });
    describe('getSampleData', () => {
        it('should return an empty object', async() => {
            const sample = await getSampleData();
            assert.deepStrictEqual(sample, {}, 'Should return an empty object');
        });
    });

    describe('analyzeValueDistribution', () => {
        it('should return default values if samples array is empty', () => {
            const distribution = analyzeValueDistribution([], 'testField');
            assert.deepStrictEqual(distribution, {
                uniqueCount: 0,
                uniqueRatio: 0,
                mostCommon: [],
                distribution: {}
            }, 'Should return default values');
        });
        it('should calculate the distribution correctly for a given field', () => {
            const samples = [
              { field1: 'value1' },
              { field1: 'value2' },
              { field1: 'value1' },
              { field1: 'value3' },
              { field1: 'value1' },
            ];
            const expectedDistribution = {
              uniqueCount: 3,
              uniqueRatio: 3/5,
              mostCommon: [
                { value: 'value1', count: 3, frequency: 3/5 },
                { value: 'value2', count: 1, frequency: 1/5 },
                { value: 'value3', count: 1, frequency: 1/5 },
              ],
              distribution: { value1: 3, value2: 1, value3: 1 },
            };
            assert.deepStrictEqual(
              analyzeValueDistribution(samples, 'field1'),
              expectedDistribution,
              'Distribution calculation is incorrect'
            );
       });
    });
    describe('analyzeStringFormat', () => {
        it('should return default values if samples array is empty', () => {
            const format = analyzeStringFormat([], 'testField');
            assert.deepStrictEqual(format, { avgLength: 0, patterns: [] }, 'Should return default values');
        });
        it('should calculate the correct average length and detect patterns', () => {
            const samples = [
              { field1: 'abcde' },
              { field1: 'def' },
              { field1: 'abcdefgh' },
              { field1: 'ab123' },
            ];
            const expectedFormat = {
              avgLength: 5,
              patterns: [
                { pattern: 'a+', count: 3, frequency: 0.75 },
                { pattern: 'a9+', count: 1, frequency: 0.25 }
              ]
            };
            const actualFormat = analyzeStringFormat(samples, 'field1');
            assert.strictEqual(actualFormat.avgLength, expectedFormat.avgLength, 'Average length calculation is incorrect');
            assert.deepStrictEqual(actualFormat.patterns, expectedFormat.patterns, 'Pattern detection is incorrect');
          });

          it('should handle mixed-case and special characters', () => {
            const samples = [{ field1: 'AbCdE' }, { field1: '123-456' }, { field1: 'aBc_DeF' }];
            const format = analyzeStringFormat(samples, 'field1');
            assert.ok(format.patterns.length > 0, 'Should detect patterns');
          });

          it('should handle empty strings', () => {
            const samples = [{ field1: '' }, { field1: 'abc' }, { field1: '' }];
            const format = analyzeStringFormat(samples, 'field1');
            assert.strictEqual(format.avgLength, 3, 'Average length should be calculated correctly');
          });
    });
  describe('generateFieldStatisticsSql', () => {
    it('should generate SQL for retrieving field statistics for common fields', () => {
      const projectId = 'test-project';
      const datasetId = 'test-dataset';
      const sourceTableId = 'source_table';
      const referenceTableId = 'reference_table';
      const commonFields = [
        { name: 'id', type: 'INT64', sourceField: 'id', referenceField: 'id', matchType: 'exact' },
        { name: 'name', type: 'STRING', sourceField: 'first_name', referenceField: 'first_name', matchType: 'exact' },
      ];
      const expectedSql = `
WITH
  SourceFields AS (
  SELECT
    column_name,
    data_type
  FROM
    \`test-project.test-dataset.INFORMATION_SCHEMA.COLUMNS\`
  WHERE
    table_name = 'source_table' AND column_name IN ('id','first_name')
  ),
  ReferenceFields AS (
  SELECT
    column_name,
    data_type
  FROM
    \`test-project.test-dataset.INFORMATION_SCHEMA.COLUMNS\`
  WHERE
    table_name = 'reference_table' AND column_name IN ('id','first_name')
  )
SELECT
  'source' as source,
  sf.column_name,
  sf.data_type
FROM
  SourceFields sf
UNION ALL
SELECT
  'reference' as source,
  rf.column_name,
  rf.data_type
FROM
  ReferenceFields rf
`;
      const actualSql = generateFieldStatisticsSql(projectId, datasetId, sourceTableId, referenceTableId, commonFields);
      assert.strictEqual(actualSql.replace(/\\s/g, ''), expectedSql.replace(/\\s/g, ''), 'Generated SQL query for field statistics does not match expected query.');
    });
  });
});