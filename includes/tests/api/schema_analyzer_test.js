/**
 * Schema Analyzer API Tests
 * Test suite for schema analysis API endpoints
 */

const { expect } = require('chai');
const sinon = require('sinon');
const request = require('supertest');
const { app } = require('../../api/server');
const schemaAnalyzer = require('../../rules/schema_analyzer');
const authService = require('../../api/services/auth_service');

describe('Schema Analyzer API', () => {
  let sandbox;
  let authToken;

  beforeEach(() => {
    // Create a sandbox to manage stubs
    sandbox = sinon.createSandbox();
    
    // Mock the authentication middleware
    authToken = 'valid-test-token';
    sandbox.stub(authService, 'verifyToken').resolves({
      id: 'test-user-id',
      email: 'test@example.com',
      role: 'user'
    });
  });

  afterEach(() => {
    // Restore stubs and mocks
    sandbox.restore();
  });

  describe('POST /api/schemas/analyze', () => {
    it('should return 401 without authorization', async () => {
      const response = await request(app)
        .post('/api/schemas/analyze')
        .send({
          sourceTableId: 'source_table_123',
          referenceTableId: 'reference_table_456'
        });

      expect(response.status).to.equal(401);
    });

    it('should return 400 if source table ID is missing', async () => {
      const response = await request(app)
        .post('/api/schemas/analyze')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          referenceTableId: 'reference_table_456'
        });

      expect(response.status).to.equal(400);
      expect(response.body).to.have.property('status', 'error');
      expect(response.body).to.have.property('message').that.includes('required');
    });

    it('should return 400 if reference table ID is missing', async () => {
      const response = await request(app)
        .post('/api/schemas/analyze')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sourceTableId: 'source_table_123'
        });

      expect(response.status).to.equal(400);
      expect(response.body).to.have.property('status', 'error');
      expect(response.body).to.have.property('message').that.includes('required');
    });

    it('should return 404 if source table is not found', async () => {
      // Stub schema analyzer to throw not found error
      sandbox.stub(schemaAnalyzer, 'analyzeSchema').rejects(new Error('Table not found: nonexistent_table'));

      const response = await request(app)
        .post('/api/schemas/analyze')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sourceTableId: 'nonexistent_table',
          referenceTableId: 'reference_table_456'
        });

      expect(response.status).to.equal(404);
      expect(response.body).to.have.property('status', 'error');
      expect(response.body).to.have.property('message').that.includes('not found');
    });

    it('should return 200 with analysis results on success', async () => {
      // Stub schema analyzer to return mock results
      const mockResults = {
        sourceTable: {
          fields: [
            { name: 'id', type: 'string', isUnique: true, nullRatio: 0 },
            { name: 'email', type: 'string', isUnique: true, nullRatio: 0.1 }
          ]
        },
        referenceTable: {
          fields: [
            { name: 'id', type: 'string', isUnique: true, nullRatio: 0 },
            { name: 'email', type: 'string', isUnique: true, nullRatio: 0.05 }
          ]
        },
        commonFields: [
          {
            sourceField: { name: 'id', type: 'string', isUnique: true, nullRatio: 0 },
            referenceField: { name: 'id', type: 'string', isUnique: true, nullRatio: 0 },
            compatibility: { compatible: true, reason: 'exact match', quality: 'high' }
          },
          {
            sourceField: { name: 'email', type: 'string', isUnique: true, nullRatio: 0.1 },
            referenceField: { name: 'email', type: 'string', isUnique: true, nullRatio: 0.05 },
            compatibility: { compatible: true, reason: 'exact match', quality: 'high' }
          }
        ]
      };
      
      sandbox.stub(schemaAnalyzer, 'analyzeSchema').resolves(mockResults);

      const response = await request(app)
        .post('/api/schemas/analyze')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sourceTableId: 'source_table_123',
          referenceTableId: 'reference_table_456'
        });

      expect(response.status).to.equal(200);
      expect(response.body).to.have.property('status', 'success');
      expect(response.body).to.have.property('data');
      expect(response.body.data).to.have.property('sourceTable');
      expect(response.body.data).to.have.property('referenceTable');
      expect(response.body.data).to.have.property('commonFields');
      expect(response.body.data.commonFields).to.be.an('array').with.lengthOf(2);
    });
  });

  describe('GET /api/schemas/:tableId', () => {
    it('should return 401 without authorization', async () => {
      const response = await request(app)
        .get('/api/schemas/source_table_123');

      expect(response.status).to.equal(401);
    });

    it('should return 404 if table is not found', async () => {
      // Stub schema analyzer to throw not found error
      sandbox.stub(schemaAnalyzer, 'getTableSchema').rejects(new Error('Table not found: nonexistent_table'));

      const response = await request(app)
        .get('/api/schemas/nonexistent_table')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).to.equal(404);
      expect(response.body).to.have.property('status', 'error');
      expect(response.body).to.have.property('message').that.includes('not found');
    });

    it('should return 200 with schema information on success', async () => {
      // Stub schema analyzer to return mock results
      const mockSchema = {
        fields: [
          { name: 'id', type: 'string' },
          { name: 'firstName', type: 'string' },
          { name: 'lastName', type: 'string' },
          { name: 'email', type: 'string' },
          { name: 'phone', type: 'string' }
        ]
      };
      
      sandbox.stub(schemaAnalyzer, 'getTableSchema').resolves(mockSchema);

      const response = await request(app)
        .get('/api/schemas/source_table_123')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).to.equal(200);
      expect(response.body).to.have.property('status', 'success');
      expect(response.body).to.have.property('data');
      expect(response.body.data).to.have.property('fields');
      expect(response.body.data.fields).to.be.an('array').with.lengthOf(5);
    });
  });

  describe('POST /api/schemas/compatible-fields', () => {
    it('should return 401 without authorization', async () => {
      const response = await request(app)
        .post('/api/schemas/compatible-fields')
        .send({
          sourceTableId: 'source_table_123',
          referenceTableId: 'reference_table_456'
        });

      expect(response.status).to.equal(401);
    });

    it('should return 400 if source table ID is missing', async () => {
      const response = await request(app)
        .post('/api/schemas/compatible-fields')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          referenceTableId: 'reference_table_456'
        });

      expect(response.status).to.equal(400);
      expect(response.body).to.have.property('status', 'error');
      expect(response.body).to.have.property('message').that.includes('required');
    });

    it('should return 400 if reference table ID is missing', async () => {
      const response = await request(app)
        .post('/api/schemas/compatible-fields')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sourceTableId: 'source_table_123'
        });

      expect(response.status).to.equal(400);
      expect(response.body).to.have.property('status', 'error');
      expect(response.body).to.have.property('message').that.includes('required');
    });

    it('should return 200 with compatible fields on success', async () => {
      // Stub schema analyzer methods to return mock results
      const sourceSchema = {
        fields: [
          { name: 'id', type: 'string' },
          { name: 'email', type: 'string' }
        ]
      };
      
      const referenceSchema = {
        fields: [
          { name: 'id', type: 'string' },
          { name: 'email', type: 'string' }
        ]
      };
      
      const commonFields = [
        {
          sourceField: { name: 'id', type: 'string' },
          referenceField: { name: 'id', type: 'string' },
          compatibility: { compatible: true, reason: 'exact match', quality: 'high' }
        },
        {
          sourceField: { name: 'email', type: 'string' },
          referenceField: { name: 'email', type: 'string' },
          compatibility: { compatible: true, reason: 'exact match', quality: 'high' }
        }
      ];
      
      sandbox.stub(schemaAnalyzer, 'getTableSchema')
        .withArgs('source_table_123').resolves(sourceSchema)
        .withArgs('reference_table_456').resolves(referenceSchema);
      
      sandbox.stub(schemaAnalyzer, 'findCommonFields').returns(commonFields);

      const response = await request(app)
        .post('/api/schemas/compatible-fields')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sourceTableId: 'source_table_123',
          referenceTableId: 'reference_table_456'
        });

      expect(response.status).to.equal(200);
      expect(response.body).to.have.property('status', 'success');
      expect(response.body).to.have.property('data');
      expect(response.body.data).to.have.property('compatibleFields');
      expect(response.body.data.compatibleFields).to.be.an('array').with.lengthOf(2);
    });
  });
}); 