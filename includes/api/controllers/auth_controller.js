/**
 * Authentication Controller
 * Handles authentication-related HTTP requests
 */

const authService = require('../services/auth_service');

/**
 * Login controller
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    
    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        code: 'MISSING_REQUIRED_FIELDS',
        message: `Missing required fields: ${!email ? 'email' : ''} ${!password ? 'password' : ''}`.trim()
      });
    }
    
    // Call service to handle login
    const result = await authService.login(email, password);
    
    // Return successful response with token and user data
    return res.status(200).json(result);
  } catch (error) {
    // Handle authentication error
    if (error.message === 'Invalid credentials') {
      return res.status(401).json({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password'
      });
    }
    
    // Pass any other errors to error handler middleware
    next(error);
  }
}

/**
 * Token refresh controller
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function refreshToken(req, res, next) {
  try {
    // Extract token from request
    const token = req.body.token || req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(400).json({
        code: 'MISSING_TOKEN',
        message: 'Token is required'
      });
    }
    
    // Call service to refresh token
    const result = await authService.refreshToken(token);
    
    // Return successful response with new token
    return res.status(200).json(result);
  } catch (error) {
    // Handle token validation error
    if (error.message.includes('invalid') || error.message.includes('expired')) {
      return res.status(401).json({
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired token'
      });
    }
    
    // Pass any other errors to error handler middleware
    next(error);
  }
}

module.exports = {
  login,
  refreshToken
}; 