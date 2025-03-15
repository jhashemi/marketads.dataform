/**
 * Rule Selection API Tests
 * Test suite for rule selection API endpoints
 */

const { expect } = require('chai');
const sinon = require('sinon');
const request = require('supertest');
const { app } = require('../../api/server');
const ruleSelectionService = require('../../rules/rule_selection_service');
const schemaAnalyzer = require('../../rules/schema_analyzer');
const authService = require('../../api/services/auth_service');

describe('Rule Selection API', () => {
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

  describe('POST /api/rule-selection/recommend', () => {
    it('should return 401 without authorization', async () => {
      const response = await request(app)
        .post('/api/rule-selection/recommend')
        .send({
          sourceTableId: 'source_table_123',
          referenceTableId: 'reference_table_456'
        });

      expect(response.status).to.equal(401);
    });

    it('should return 400 if source table ID is missing', async () => {
      const response = await request(app)
        .post('/api/rule-selection/recommend')
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
        .post('/api/rule-selection/recommend')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sourceTableId: 'source_table_123'
        });

      expect(response.status).to.equal(400);
      expect(response.body).to.have.property('status', 'error');
      expect(response.body).to.have.property('message').that.includes('required');
    });

    it('should return 404 if tables are not found', async () => {
      // Stub rule selection service to throw not found error
      sandbox.stub(ruleSelectionService, 'recommendRules').rejects(new Error('Table not found: nonexistent_table'));

      const response = await request(app)
        .post('/api/rule-selection/recommend')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sourceTableId: 'nonexistent_table',
          referenceTableId: 'reference_table_456'
        });

      expect(response.status).to.equal(404);
      expect(response.body).to.have.property('status', 'error');
      expect(response.body).to.have.property('message').that.includes('not found');
    });

    it('should return 200 with rule recommendations on success', async () => {
      // Stub rule selection service to return mock results
      const mockRecommendations = {
        sourceTableId: 'source_table_123',
        referenceTableId: 'reference_table_456',
        goal: 'balanced',
        recommendations: {
          exactMatchRules: [
            { fieldName: 'id', ruleType: 'exact', quality: 'high' },
            { fieldName: 'email', ruleType: 'exact', quality: 'high' }
          ],
          fuzzyMatchRules: [
            { fieldName: 'firstName', ruleType: 'fuzzy', algorithm: 'jaroWinkler', quality: 'medium' },
            { fieldName: 'lastName', ruleType: 'fuzzy', algorithm: 'jaroWinkler', quality: 'medium' }
          ],
          blockingRules: [
            { fieldName: 'id', transformations: [] }
          ],
          thresholds: {
            high: 0.85,
            medium: 0.65,
            low: 0.45
          },
          ruleWeights: {
            id: 3.0,
            email: 3.0,
            firstName: 2.0,
            lastName: 2.0
          }
        }
      };
      
      sandbox.stub(ruleSelectionService, 'recommendRules').resolves(mockRecommendations);

      const response = await request(app)
        .post('/api/rule-selection/recommend')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sourceTableId: 'source_table_123',
          referenceTableId: 'reference_table_456',
          goal: 'balanced'
        });

      expect(response.status).to.equal(200);
      expect(response.body).to.have.property('status', 'success');
      expect(response.body).to.have.property('data');
      expect(response.body.data).to.have.property('sourceTableId', 'source_table_123');
      expect(response.body.data).to.have.property('referenceTableId', 'reference_table_456');
      expect(response.body.data).to.have.property('goal', 'balanced');
      expect(response.body.data).to.have.property('recommendations');
      expect(response.body.data.recommendations).to.have.property('exactMatchRules').with.lengthOf(2);
      expect(response.body.data.recommendations).to.have.property('fuzzyMatchRules').with.lengthOf(2);
      expect(response.body.data.recommendations).to.have.property('blockingRules').with.lengthOf(1);
      expect(response.body.data.recommendations).to.have.property('thresholds');
      expect(response.body.data.recommendations).to.have.property('ruleWeights');
    });
  });

  describe('POST /api/rule-selection/evaluate', () => {
    it('should return 401 without authorization', async () => {
      const response = await request(app)
        .post('/api/rule-selection/evaluate')
        .send({
          sourceTableId: 'source_table_123',
          referenceTableId: 'reference_table_456',
          rules: [{ fieldName: 'id', ruleType: 'exact' }]
        });

      expect(response.status).to.equal(401);
    });

    it('should return 400 if source table ID is missing', async () => {
      const response = await request(app)
        .post('/api/rule-selection/evaluate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          referenceTableId: 'reference_table_456',
          rules: [{ fieldName: 'id', ruleType: 'exact' }]
        });

      expect(response.status).to.equal(400);
      expect(response.body).to.have.property('status', 'error');
      expect(response.body).to.have.property('message').that.includes('required');
    });

    it('should return 400 if reference table ID is missing', async () => {
      const response = await request(app)
        .post('/api/rule-selection/evaluate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sourceTableId: 'source_table_123',
          rules: [{ fieldName: 'id', ruleType: 'exact' }]
        });

      expect(response.status).to.equal(400);
      expect(response.body).to.have.property('status', 'error');
      expect(response.body).to.have.property('message').that.includes('required');
    });

    it('should return 400 if rules are missing', async () => {
      const response = await request(app)
        .post('/api/rule-selection/evaluate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sourceTableId: 'source_table_123',
          referenceTableId: 'reference_table_456'
        });

      expect(response.status).to.equal(400);
      expect(response.body).to.have.property('status', 'error');
      expect(response.body).to.have.property('message').that.includes('required');
    });

    it('should return 200 with evaluation results on success', async () => {
      // Stub necessary services
      const mockAnalysis = {
        sourceTable: { fields: [{ name: 'id', type: 'string' }] },
        referenceTable: { fields: [{ name: 'id', type: 'string' }] },
        commonFields: [
          {
            sourceField: { name: 'id', type: 'string' },
            referenceField: { name: 'id', type: 'string' },
            compatibility: { compatible: true, quality: 'high' }
          }
        ]
      };
      
      const mockEvaluation = {
        estimatedPrecision: 0.95,
        estimatedRecall: 0.85,
        estimatedF1: 0.90
      };
      
      sandbox.stub(schemaAnalyzer, 'analyzeSchema').resolves(mockAnalysis);
      sandbox.stub(ruleSelectionService, 'evaluateRuleSet').returns(mockEvaluation);

      const rules = [
        { fieldName: 'id', ruleType: 'exact', quality: 'high' }
      ];

      const response = await request(app)
        .post('/api/rule-selection/evaluate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          sourceTableId: 'source_table_123',
          referenceTableId: 'reference_table_456',
          rules
        });

      expect(response.status).to.equal(200);
      expect(response.body).to.have.property('status', 'success');
      expect(response.body).to.have.property('data');
      expect(response.body.data).to.have.property('sourceTableId', 'source_table_123');
      expect(response.body.data).to.have.property('referenceTableId', 'reference_table_456');
      expect(response.body.data).to.have.property('evaluation');
      expect(response.body.data.evaluation).to.have.property('estimatedPrecision');
      expect(response.body.data.evaluation).to.have.property('estimatedRecall');
      expect(response.body.data.evaluation).to.have.property('estimatedF1');
    });
  });
}); 