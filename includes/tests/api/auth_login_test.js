/**
 * Authentication API Tests
 * Test suite for authentication API endpoints
 */

const { expect } = require('chai');
const sinon = require('sinon');
const request = require('supertest');
const { app } = require('../../api/server');
const authService = require('../../api/services/auth_service');

describe('Authentication API', () => {
  let sandbox;

  beforeEach(() => {
    // Create a sandbox to manage stubs
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    // Restore stubs and mocks
    sandbox.restore();
  });

  describe('POST /api/auth/login', () => {
    it('should return 400 if email is missing', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ password: 'password123' });

      expect(response.status).to.equal(400);
      expect(response.body).to.have.property('status', 'error');
      expect(response.body).to.have.property('message').that.includes('required');
    });

    it('should return 400 if password is missing', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com' });

      expect(response.status).to.equal(400);
      expect(response.body).to.have.property('status', 'error');
      expect(response.body).to.have.property('message').that.includes('required');
    });

    it('should return 401 for invalid credentials', async () => {
      // Stub auth service to throw error
      sandbox.stub(authService, 'login').rejects(new Error('Invalid credentials'));

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'invalid@example.com', password: 'wrongpassword' });

      expect(response.status).to.equal(401);
      expect(response.body).to.have.property('status', 'error');
      expect(response.body).to.have.property('message').that.includes('Invalid credentials');
    });

    it('should return 200 with token and user data on successful login', async () => {
      // Stub auth service to return success
      const mockUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user'
      };
      
      const mockResponse = {
        token: 'jwt-token-123',
        user: mockUser
      };
      
      sandbox.stub(authService, 'login').resolves(mockResponse);

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'password123' });

      expect(response.status).to.equal(200);
      expect(response.body).to.have.property('status', 'success');
      expect(response.body).to.have.property('data');
      expect(response.body.data).to.have.property('token');
      expect(response.body.data).to.have.property('user');
      expect(response.body.data.user).to.have.property('id');
      expect(response.body.data.user).to.have.property('email');
      expect(response.body.data.user).to.have.property('role');
      expect(response.body.data.user).to.not.have.property('password');
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should return 400 if token is missing', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({});

      expect(response.status).to.equal(400);
      expect(response.body).to.have.property('status', 'error');
      expect(response.body).to.have.property('message').that.includes('required');
    });

    it('should return 401 for invalid token', async () => {
      // Stub auth service to throw error
      sandbox.stub(authService, 'refreshToken').rejects(new Error('Invalid token'));

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ token: 'invalid-token' });

      expect(response.status).to.equal(401);
      expect(response.body).to.have.property('status', 'error');
      expect(response.body).to.have.property('message').that.includes('Invalid token');
    });

    it('should return 200 with new token on successful refresh', async () => {
      // Stub auth service to return success
      sandbox.stub(authService, 'refreshToken').resolves({ token: 'new-jwt-token-123' });

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ token: 'valid-token-123' });

      expect(response.status).to.equal(200);
      expect(response.body).to.have.property('status', 'success');
      expect(response.body).to.have.property('data');
      expect(response.body.data).to.have.property('token', 'new-jwt-token-123');
    });
  });

  describe('GET /api/auth/profile', () => {
    it('should return 401 without authorization header', async () => {
      const response = await request(app)
        .get('/api/auth/profile');

      expect(response.status).to.equal(401);
      expect(response.body).to.have.property('status', 'error');
      expect(response.body).to.have.property('message').that.includes('missing');
    });

    it('should return 401 with invalid authorization format', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'InvalidFormat token-123');

      expect(response.status).to.equal(401);
      expect(response.body).to.have.property('status', 'error');
      expect(response.body).to.have.property('message').that.includes('format');
    });

    it('should return 401 with invalid token', async () => {
      // Stub auth service to throw error
      sandbox.stub(authService, 'verifyToken').rejects(new Error('Invalid token'));

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).to.equal(401);
      expect(response.body).to.have.property('status', 'error');
      expect(response.body).to.have.property('message').that.includes('Invalid');
    });

    it('should return 200 with user profile on successful authentication', async () => {
      // Stub auth service to return user profile
      const mockUser = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user'
      };
      
      sandbox.stub(authService, 'verifyToken').resolves(mockUser);

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer valid-token-123');

      expect(response.status).to.equal(200);
      expect(response.body).to.have.property('status', 'success');
      expect(response.body).to.have.property('data');
      expect(response.body.data).to.have.property('user');
      expect(response.body.data.user).to.have.property('id', mockUser.id);
      expect(response.body.data.user).to.have.property('email', mockUser.email);
      expect(response.body.data.user).to.have.property('role', mockUser.role);
      expect(response.body.data.user).to.not.have.property('password');
    });
  });
}); 