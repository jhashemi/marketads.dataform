/**
 * Authentication Controller
 * Handles HTTP requests for authentication operations
 */

const authService = require('../services/auth_service');

/**
 * Handle user login request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function login(req, res) {
  try {
    // Extract credentials from request body
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Email and password are required'
      });
    }

    // Authenticate user via auth service
    try {
      const result = await authService.login(email, password);
      
      // Return successful response with token and user data
      return res.status(200).json({
        status: 'success',
        data: result
      });
    } catch (error) {
      // Handle authentication failure
      return res.status(401).json({
        status: 'error',
        message: error.message || 'Invalid credentials'
      });
    }
  } catch (error) {
    // Handle unexpected errors
    console.error('Login error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
}

/**
 * Handle token refresh request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function refreshToken(req, res) {
  try {
    // Extract token from request body
    const { token } = req.body;

    // Validate input
    if (!token) {
      return res.status(400).json({
        status: 'error',
        message: 'Token is required'
      });
    }

    // Refresh token via auth service
    try {
      const result = await authService.refreshToken(token);
      
      // Return successful response with new token
      return res.status(200).json({
        status: 'success',
        data: result
      });
    } catch (error) {
      // Handle token refresh failure
      return res.status(401).json({
        status: 'error',
        message: error.message || 'Invalid or expired token'
      });
    }
  } catch (error) {
    // Handle unexpected errors
    console.error('Token refresh error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
}

/**
 * Get current user profile
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getUserProfile(req, res) {
  try {
    // User should be attached to request by auth middleware
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Not authenticated'
      });
    }
    
    // Return user profile
    return res.status(200).json({
      status: 'success',
      data: {
        user: req.user
      }
    });
  } catch (error) {
    // Handle unexpected errors
    console.error('Get user profile error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
}

module.exports = {
  login,
  refreshToken,
  getUserProfile
}; 