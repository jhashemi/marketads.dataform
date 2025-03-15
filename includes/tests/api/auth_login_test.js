const { expect } = require('chai');
const sinon = require('sinon');
const request = require('supertest');

// We'll create this file next
const app = require('../../api/server');
// Service that will handle authentication
const authService = require('../../api/services/auth_service');

describe('POST /auth/login', () => {
  let authServiceStub;

  beforeEach(() => {
    // Create a stub for the authService.login method
    authServiceStub = sinon.stub(authService, 'login');
  });

  afterEach(() => {
    // Restore the stub after each test
    authServiceStub.restore();
  });

  it('should return 200 and token when credentials are valid', async () => {
    // Arrange
    const validCredentials = {
      email: 'test@example.com',
      password: 'password123'
    };
    
    const expectedResponse = {
      token: 'jwt-token-123',
      user: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user'
      }
    };

    // Setup the stub to return the expected response
    authServiceStub.withArgs(validCredentials.email, validCredentials.password)
      .resolves(expectedResponse);

    // Act
    const response = await request(app)
      .post('/auth/login')
      .send(validCredentials)
      .expect('Content-Type', /json/)
      .expect(200);

    // Assert
    expect(response.body).to.have.property('token', expectedResponse.token);
    expect(response.body).to.have.property('user');
    expect(response.body.user).to.deep.equal(expectedResponse.user);
    
    // Verify that the service was called with the right arguments
    sinon.assert.calledWith(authServiceStub, validCredentials.email, validCredentials.password);
  });

  it('should return 401 when credentials are invalid', async () => {
    // Arrange
    const invalidCredentials = {
      email: 'wrong@example.com',
      password: 'wrongpassword'
    };
    
    // Setup the stub to throw an error for invalid credentials
    authServiceStub.withArgs(invalidCredentials.email, invalidCredentials.password)
      .rejects(new Error('Invalid credentials'));

    // Act & Assert
    const response = await request(app)
      .post('/auth/login')
      .send(invalidCredentials)
      .expect('Content-Type', /json/)
      .expect(401);

    expect(response.body).to.have.property('code');
    expect(response.body).to.have.property('message');
    expect(response.body.message).to.include('Invalid credentials');
    
    // Verify that the service was called with the right arguments
    sinon.assert.calledWith(authServiceStub, invalidCredentials.email, invalidCredentials.password);
  });

  it('should return 400 when email is missing', async () => {
    // Arrange
    const missingEmail = {
      password: 'password123'
    };

    // Act & Assert
    const response = await request(app)
      .post('/auth/login')
      .send(missingEmail)
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).to.have.property('code');
    expect(response.body).to.have.property('message');
    expect(response.body.message).to.include('email');
    
    // Verify that the service was NOT called
    sinon.assert.notCalled(authServiceStub);
  });

  it('should return 400 when password is missing', async () => {
    // Arrange
    const missingPassword = {
      email: 'test@example.com'
    };

    // Act & Assert
    const response = await request(app)
      .post('/auth/login')
      .send(missingPassword)
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).to.have.property('code');
    expect(response.body).to.have.property('message');
    expect(response.body.message).to.include('password');
    
    // Verify that the service was NOT called
    sinon.assert.notCalled(authServiceStub);
  });
}); 