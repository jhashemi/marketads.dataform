const { expect } = require('chai');
const sinon = require('sinon');
const request = require('supertest');

const app = require('../../api/server');
const ruleSelectionService = require('../../api/services/rule_selection_service');
const schemaAnalyzer = require('../../rules/schema_analyzer');

describe('POST /api/rules/auto-configure', () => {
  let ruleSelectionStub;
  let schemaAnalyzerStub;

  beforeEach(() => {
    // Create stubs for the rule selection service and schema analyzer
    ruleSelectionStub = sinon.stub(ruleSelectionService, 'generateRuleConfiguration');
    schemaAnalyzerStub = sinon.stub(schemaAnalyzer, 'analyzeSchema');
  });

  afterEach(() => {
    // Restore stubs after each test
    ruleSelectionStub.restore();
    schemaAnalyzerStub.restore();
  });

  it('should auto-configure rules based on schema and goal', async () => {
    // Arrange
    const requestBody = {
      sourceTableId: '123e4567-e89b-12d3-a456-426614174000',
      referenceTableId: '123e4567-e89b-12d3-a456-426614174001',
      goal: 'HIGH_PRECISION',
      outputFields: ['firstName', 'lastName', 'email', 'phone']
    };

    const schemaAnalysisResult = {
      sourceTable: {
        fields: [
          { name: 'id', type: 'string', isUnique: true },
          { name: 'firstName', type: 'string' },
          { name: 'lastName', type: 'string' },
          { name: 'email', type: 'string', nullRatio: 0.05 },
          { name: 'phone', type: 'string', nullRatio: 0.20 }
        ]
      },
      referenceTable: {
        fields: [
          { name: 'id', type: 'string', isUnique: true },
          { name: 'firstName', type: 'string' },
          { name: 'lastName', type: 'string' },
          { name: 'email', type: 'string', nullRatio: 0.10 },
          { name: 'phone', type: 'string', nullRatio: 0.15 }
        ]
      }
    };

    const expectedRules = [
      {
        id: 'rule1',
        name: 'Email Exact Match',
        description: 'Matches records based on exact email match',
        priority: 1,
        conditions: [
          { field: 'email', operator: 'equals', threshold: 1.0 }
        ],
        confidenceScore: 0.95
      },
      {
        id: 'rule2',
        name: 'Name + Phone Match',
        description: 'Matches records based on name and phone',
        priority: 2,
        conditions: [
          { field: 'firstName', operator: 'fuzzy', threshold: 0.8 },
          { field: 'lastName', operator: 'fuzzy', threshold: 0.8 },
          { field: 'phone', operator: 'equals', threshold: 1.0 }
        ],
        confidenceScore: 0.85
      }
    ];

    const explanations = [
      'Email was selected as primary matching field due to low null ratio and high uniqueness',
      'Name and phone combination provides strong secondary match when email is missing',
      'Fuzzy matching on names handles typos and variations while exact matching on phone ensures accuracy'
    ];

    // Setup stubs to return expected values
    schemaAnalyzerStub.withArgs(requestBody.sourceTableId, requestBody.referenceTableId)
      .resolves(schemaAnalysisResult);

    ruleSelectionStub.withArgs(
      schemaAnalysisResult, 
      requestBody.goal, 
      requestBody.outputFields
    ).resolves({
      rules: expectedRules,
      explanations: explanations
    });

    // Act
    const response = await request(app)
      .post('/api/rules/auto-configure')
      .send(requestBody)
      .expect('Content-Type', /json/)
      .expect(200);

    // Assert
    expect(response.body).to.have.property('rules');
    expect(response.body.rules).to.deep.equal(expectedRules);
    expect(response.body).to.have.property('explanations');
    expect(response.body.explanations).to.deep.equal(explanations);

    // Verify stubs were called with correct arguments
    sinon.assert.calledWith(schemaAnalyzerStub, requestBody.sourceTableId, requestBody.referenceTableId);
    sinon.assert.calledWith(
      ruleSelectionStub, 
      schemaAnalysisResult, 
      requestBody.goal, 
      requestBody.outputFields
    );
  });

  it('should return 400 when source table is missing', async () => {
    // Arrange
    const requestBody = {
      referenceTableId: '123e4567-e89b-12d3-a456-426614174001',
      goal: 'HIGH_PRECISION'
    };

    // Act & Assert
    const response = await request(app)
      .post('/api/rules/auto-configure')
      .send(requestBody)
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).to.have.property('code');
    expect(response.body).to.have.property('message');
    expect(response.body.message).to.include('sourceTableId');

    // Verify stubs were not called
    sinon.assert.notCalled(schemaAnalyzerStub);
    sinon.assert.notCalled(ruleSelectionStub);
  });

  it('should return 400 when reference table is missing', async () => {
    // Arrange
    const requestBody = {
      sourceTableId: '123e4567-e89b-12d3-a456-426614174000',
      goal: 'HIGH_PRECISION'
    };

    // Act & Assert
    const response = await request(app)
      .post('/api/rules/auto-configure')
      .send(requestBody)
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).to.have.property('code');
    expect(response.body).to.have.property('message');
    expect(response.body.message).to.include('referenceTableId');

    // Verify stubs were not called
    sinon.assert.notCalled(schemaAnalyzerStub);
    sinon.assert.notCalled(ruleSelectionStub);
  });

  it('should return 400 when goal is missing', async () => {
    // Arrange
    const requestBody = {
      sourceTableId: '123e4567-e89b-12d3-a456-426614174000',
      referenceTableId: '123e4567-e89b-12d3-a456-426614174001'
    };

    // Act & Assert
    const response = await request(app)
      .post('/api/rules/auto-configure')
      .send(requestBody)
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).to.have.property('code');
    expect(response.body).to.have.property('message');
    expect(response.body.message).to.include('goal');

    // Verify stubs were not called
    sinon.assert.notCalled(schemaAnalyzerStub);
    sinon.assert.notCalled(ruleSelectionStub);
  });

  it('should handle schema analysis errors', async () => {
    // Arrange
    const requestBody = {
      sourceTableId: '123e4567-e89b-12d3-a456-426614174000',
      referenceTableId: '123e4567-e89b-12d3-a456-426614174001',
      goal: 'HIGH_PRECISION'
    };

    // Setup schema analyzer to throw an error
    schemaAnalyzerStub.withArgs(requestBody.sourceTableId, requestBody.referenceTableId)
      .rejects(new Error('Table not found'));

    // Act & Assert
    const response = await request(app)
      .post('/api/rules/auto-configure')
      .send(requestBody)
      .expect('Content-Type', /json/)
      .expect(404);

    expect(response.body).to.have.property('code');
    expect(response.body).to.have.property('message');
    expect(response.body.message).to.include('Table not found');

    // Verify schema analyzer was called but rule selection wasn't
    sinon.assert.calledWith(schemaAnalyzerStub, requestBody.sourceTableId, requestBody.referenceTableId);
    sinon.assert.notCalled(ruleSelectionStub);
  });

  it('should recommend different rules for HIGH_RECALL goal', async () => {
    // Arrange
    const requestBody = {
      sourceTableId: '123e4567-e89b-12d3-a456-426614174000',
      referenceTableId: '123e4567-e89b-12d3-a456-426614174001',
      goal: 'HIGH_RECALL',
      outputFields: ['firstName', 'lastName', 'email', 'phone']
    };

    const schemaAnalysisResult = {
      sourceTable: {
        fields: [
          { name: 'id', type: 'string', isUnique: true },
          { name: 'firstName', type: 'string' },
          { name: 'lastName', type: 'string' },
          { name: 'email', type: 'string', nullRatio: 0.05 },
          { name: 'phone', type: 'string', nullRatio: 0.20 }
        ]
      },
      referenceTable: {
        fields: [
          { name: 'id', type: 'string', isUnique: true },
          { name: 'firstName', type: 'string' },
          { name: 'lastName', type: 'string' },
          { name: 'email', type: 'string', nullRatio: 0.10 },
          { name: 'phone', type: 'string', nullRatio: 0.15 }
        ]
      }
    };

    // For high recall, we expect more lenient rules with lower thresholds
    const expectedRules = [
      {
        id: 'rule1',
        name: 'Email Fuzzy Match',
        description: 'Matches records based on fuzzy email match',
        priority: 1,
        conditions: [
          { field: 'email', operator: 'fuzzy', threshold: 0.8 }
        ],
        confidenceScore: 0.75
      },
      {
        id: 'rule2',
        name: 'Name Only Match',
        description: 'Matches records based on names only',
        priority: 2,
        conditions: [
          { field: 'firstName', operator: 'fuzzy', threshold: 0.7 },
          { field: 'lastName', operator: 'fuzzy', threshold: 0.7 }
        ],
        confidenceScore: 0.65
      },
      {
        id: 'rule3',
        name: 'Phone Only Match',
        description: 'Matches records based on phone only',
        priority: 3,
        conditions: [
          { field: 'phone', operator: 'fuzzy', threshold: 0.8 }
        ],
        confidenceScore: 0.60
      }
    ];

    const explanations = [
      'Fuzzy matching on email captures spelling variations and common email typos',
      'Name-only matching is included to catch records where email or phone may be missing',
      'Lower thresholds are used to prioritize finding potential matches (recall) over precision'
    ];

    // Setup stubs to return expected values
    schemaAnalyzerStub.withArgs(requestBody.sourceTableId, requestBody.referenceTableId)
      .resolves(schemaAnalysisResult);

    ruleSelectionStub.withArgs(
      schemaAnalysisResult, 
      requestBody.goal, 
      requestBody.outputFields
    ).resolves({
      rules: expectedRules,
      explanations: explanations
    });

    // Act
    const response = await request(app)
      .post('/api/rules/auto-configure')
      .send(requestBody)
      .expect('Content-Type', /json/)
      .expect(200);

    // Assert
    expect(response.body).to.have.property('rules');
    expect(response.body.rules).to.deep.equal(expectedRules);
    expect(response.body).to.have.property('explanations');
    expect(response.body.explanations).to.deep.equal(explanations);

    // Verify the correct goal was passed to the rule selection service
    sinon.assert.calledWith(
      ruleSelectionStub, 
      schemaAnalysisResult, 
      'HIGH_RECALL', 
      requestBody.outputFields
    );
  });
}); 