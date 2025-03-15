const { expect } = require('chai');
const sinon = require('sinon');
const schemaAnalyzer = require('../../rules/schema_analyzer');

// We'll need access to the database service to stub it
const dbService = require('../../services/database_service');

describe('Schema Analyzer', () => {
  let dbServiceStub;
  
  beforeEach(() => {
    // Create stubs for the database service
    dbServiceStub = {
      executeQuery: sinon.stub()
    };
    
    // Replace the real database service with our stub
    sinon.stub(dbService, 'getInstance').returns(dbServiceStub);
  });
  
  afterEach(() => {
    // Restore all stubs
    sinon.restore();
  });
  
  describe('analyzeSchema', () => {
    it('should analyze schemas for both source and reference tables', async () => {
      // Arrange
      const sourceTableId = 'source_table_123';
      const referenceTableId = 'reference_table_456';
      
      // Mock schema data that would come from the database
      const sourceTableSchema = {
        fields: [
          { name: 'id', type: 'string' },
          { name: 'firstName', type: 'string' },
          { name: 'lastName', type: 'string' },
          { name: 'email', type: 'string' },
          { name: 'phone', type: 'string' }
        ]
      };
      
      const referenceTableSchema = {
        fields: [
          { name: 'id', type: 'string' },
          { name: 'firstName', type: 'string' },
          { name: 'lastName', type: 'string' },
          { name: 'email', type: 'string' },
          { name: 'address', type: 'string' } // Different field than source
        ]
      };
      
      // Stub implementation for getTableSchema
      const getTableSchemaStub = sinon.stub(schemaAnalyzer, 'getTableSchema');
      getTableSchemaStub.withArgs(sourceTableId).resolves(sourceTableSchema);
      getTableSchemaStub.withArgs(referenceTableId).resolves(referenceTableSchema);
      
      // Mock field statistics data
      const sourceFieldStats = [
        { name: 'id', type: 'string', isUnique: true, nullRatio: 0 },
        { name: 'firstName', type: 'string', isUnique: false, nullRatio: 0.05 },
        { name: 'lastName', type: 'string', isUnique: false, nullRatio: 0.05 },
        { name: 'email', type: 'string', isUnique: true, nullRatio: 0.1 },
        { name: 'phone', type: 'string', isUnique: false, nullRatio: 0.2 }
      ];
      
      const referenceFieldStats = [
        { name: 'id', type: 'string', isUnique: true, nullRatio: 0 },
        { name: 'firstName', type: 'string', isUnique: false, nullRatio: 0.02 },
        { name: 'lastName', type: 'string', isUnique: false, nullRatio: 0.03 },
        { name: 'email', type: 'string', isUnique: true, nullRatio: 0.15 },
        { name: 'address', type: 'string', isUnique: false, nullRatio: 0.1 }
      ];
      
      // Stub implementation for analyzeFieldStatistics
      const analyzeFieldStatisticsStub = sinon.stub(schemaAnalyzer, 'analyzeFieldStatistics');
      analyzeFieldStatisticsStub.withArgs(sourceTableId, sourceTableSchema.fields).resolves(sourceFieldStats);
      analyzeFieldStatisticsStub.withArgs(referenceTableId, referenceTableSchema.fields).resolves(referenceFieldStats);
      
      // Expected common fields between tables
      const expectedCommonFields = [
        { 
          sourceField: sourceFieldStats[0],
          referenceField: referenceFieldStats[0],
          compatibility: { compatible: true, reason: 'exact match' }
        },
        { 
          sourceField: sourceFieldStats[1],
          referenceField: referenceFieldStats[1],
          compatibility: { compatible: true, reason: 'exact match' }
        },
        { 
          sourceField: sourceFieldStats[2],
          referenceField: referenceFieldStats[2],
          compatibility: { compatible: true, reason: 'exact match' }
        },
        { 
          sourceField: sourceFieldStats[3],
          referenceField: referenceFieldStats[3],
          compatibility: { compatible: true, reason: 'exact match' }
        }
      ];
      
      // Stub implementation for findCommonFields
      const findCommonFieldsStub = sinon.stub(schemaAnalyzer, 'findCommonFields')
        .withArgs(
          { fields: sourceFieldStats },
          { fields: referenceFieldStats }
        )
        .returns(expectedCommonFields);
      
      // Act
      const result = await schemaAnalyzer.analyzeSchema(sourceTableId, referenceTableId);
      
      // Assert
      expect(result).to.have.property('sourceTable');
      expect(result).to.have.property('referenceTable');
      expect(result).to.have.property('commonFields');
      
      expect(result.sourceTable.fields).to.deep.equal(sourceFieldStats);
      expect(result.referenceTable.fields).to.deep.equal(referenceFieldStats);
      expect(result.commonFields).to.deep.equal(expectedCommonFields);
      
      // Verify our stubs were called with the correct arguments
      sinon.assert.calledWith(getTableSchemaStub, sourceTableId);
      sinon.assert.calledWith(getTableSchemaStub, referenceTableId);
      sinon.assert.calledWith(analyzeFieldStatisticsStub, sourceTableId, sourceTableSchema.fields);
      sinon.assert.calledWith(analyzeFieldStatisticsStub, referenceTableId, referenceTableSchema.fields);
      sinon.assert.calledWith(findCommonFieldsStub, { fields: sourceFieldStats }, { fields: referenceFieldStats });
    });
    
    it('should throw error when source table does not exist', async () => {
      // Arrange
      const sourceTableId = 'nonexistent_table';
      const referenceTableId = 'reference_table_456';
      
      // Stub implementation to throw error
      sinon.stub(schemaAnalyzer, 'getTableSchema')
        .withArgs(sourceTableId)
        .rejects(new Error('Table not found'));
      
      // Act & Assert
      await expect(schemaAnalyzer.analyzeSchema(sourceTableId, referenceTableId))
        .to.be.rejectedWith('Table not found');
    });
  });
  
  describe('getTableSchema', () => {
    it('should retrieve table schema from database', async () => {
      // Arrange
      const tableId = 'test_table_123';
      const schemaResults = {
        columns: [
          { name: 'id', type: 'STRING' },
          { name: 'firstName', type: 'STRING' },
          { name: 'lastName', type: 'STRING' },
          { name: 'email', type: 'STRING' },
          { name: 'phone', type: 'STRING' }
        ]
      };
      
      // Stub the database service to return schema results
      dbServiceStub.executeQuery
        .withArgs(sinon.match(/INFORMATION_SCHEMA.COLUMNS/))
        .resolves(schemaResults);
      
      // Act
      const result = await schemaAnalyzer.getTableSchema(tableId);
      
      // Assert
      expect(result).to.have.property('fields');
      expect(result.fields).to.be.an('array').with.length(5);
      expect(result.fields[0]).to.deep.include({ name: 'id', type: 'string' });
      
      // Verify the database service was called
      sinon.assert.calledWith(
        dbServiceStub.executeQuery,
        sinon.match(/INFORMATION_SCHEMA.COLUMNS/)
      );
    });
    
    it('should throw error when table does not exist', async () => {
      // Arrange
      const tableId = 'nonexistent_table';
      
      // Stub the database service to return empty results
      dbServiceStub.executeQuery
        .withArgs(sinon.match(/INFORMATION_SCHEMA.COLUMNS/))
        .resolves({ columns: [] });
      
      // Act & Assert
      await expect(schemaAnalyzer.getTableSchema(tableId))
        .to.be.rejectedWith('Table not found');
    });
  });
  
  describe('analyzeFieldStatistics', () => {
    it('should calculate statistics for all fields', async () => {
      // Arrange
      const tableId = 'test_table_123';
      const fields = [
        { name: 'id', type: 'string' },
        { name: 'email', type: 'string' }
      ];
      
      // Stub detection of unique fields
      sinon.stub(schemaAnalyzer, 'detectUniqueFields')
        .withArgs(tableId, ['id', 'email'])
        .resolves({ id: true, email: true });
      
      // Stub null ratio calculation
      const calculateNullRatioStub = sinon.stub(schemaAnalyzer, 'calculateNullRatio');
      calculateNullRatioStub.withArgs(tableId, 'id').resolves(0);
      calculateNullRatioStub.withArgs(tableId, 'email').resolves(0.1);
      
      // Act
      const result = await schemaAnalyzer.analyzeFieldStatistics(tableId, fields);
      
      // Assert
      expect(result).to.be.an('array').with.length(2);
      expect(result[0]).to.deep.include({ name: 'id', type: 'string', isUnique: true, nullRatio: 0 });
      expect(result[1]).to.deep.include({ name: 'email', type: 'string', isUnique: true, nullRatio: 0.1 });
      
      // Verify our stubs were called correctly
      sinon.assert.calledWith(schemaAnalyzer.detectUniqueFields, tableId, ['id', 'email']);
      sinon.assert.calledWith(calculateNullRatioStub, tableId, 'id');
      sinon.assert.calledWith(calculateNullRatioStub, tableId, 'email');
    });
  });
  
  describe('findCommonFields', () => {
    it('should identify fields present in both tables', () => {
      // Arrange
      const sourceSchema = {
        fields: [
          { name: 'id', type: 'string' },
          { name: 'firstName', type: 'string' },
          { name: 'lastName', type: 'string' },
          { name: 'email', type: 'string' },
          { name: 'sourceOnly', type: 'string' }
        ]
      };
      
      const referenceSchema = {
        fields: [
          { name: 'id', type: 'string' },
          { name: 'firstName', type: 'string' },
          { name: 'lastName', type: 'string' },
          { name: 'email', type: 'string' },
          { name: 'referenceOnly', type: 'string' }
        ]
      };
      
      // Stub field compatibility assessment
      const assessFieldCompatibilityStub = sinon.stub(schemaAnalyzer, 'assessFieldCompatibility')
        .returns({ compatible: true, reason: 'exact match' });
      
      // Act
      const result = schemaAnalyzer.findCommonFields(sourceSchema, referenceSchema);
      
      // Assert
      expect(result).to.be.an('array').with.length(4); // 4 common fields
      expect(result[0].sourceField.name).to.equal('id');
      expect(result[0].referenceField.name).to.equal('id');
      expect(result[0].compatibility).to.deep.equal({ compatible: true, reason: 'exact match' });
      
      // Verify our stubs were called the correct number of times
      sinon.assert.callCount(assessFieldCompatibilityStub, 4);
    });
    
    it('should return empty array when no common fields exist', () => {
      // Arrange
      const sourceSchema = {
        fields: [
          { name: 'source1', type: 'string' },
          { name: 'source2', type: 'string' }
        ]
      };
      
      const referenceSchema = {
        fields: [
          { name: 'ref1', type: 'string' },
          { name: 'ref2', type: 'string' }
        ]
      };
      
      // Act
      const result = schemaAnalyzer.findCommonFields(sourceSchema, referenceSchema);
      
      // Assert
      expect(result).to.be.an('array').with.length(0);
    });
  });
}); 