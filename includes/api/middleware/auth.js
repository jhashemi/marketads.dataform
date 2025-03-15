/**
 * Authentication Middleware
 * Handles token validation and user authentication for API routes
 */

const authService = require('../services/auth_service');

/**
 * Middleware to authenticate API requests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
async function authenticate(req, res, next) {
  try {
    // Get authorization header
    const authHeader = req.headers.authorization;

    // Check if authorization header exists
    if (!authHeader) {
      return res.status(401).json({
        status: 'error',
        message: 'Authorization header missing'
      });
    }

    // Check if authorization header is in the correct format
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid authorization format, expected "Bearer {token}"'
      });
    }

    // Extract token
    const token = authHeader.split(' ')[1];

    // Verify token using auth service
    try {
      const user = await authService.verifyToken(token);
      
      // Attach user to request for use in route handlers
      req.user = user;
      
      // Continue to route handler
      next();
    } catch (error) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid or expired token'
      });
    }
  } catch (error) {
    console.error('Authentication middleware error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error during authentication'
    });
  }
}

/**
 * Middleware to check if authenticated user has required role
 * @param {string|Array<string>} roles - Required role(s) for access
 * @returns {Function} Middleware function
 */
function hasRole(roles) {
  // Convert single role to array
  const requiredRoles = Array.isArray(roles) ? roles : [roles];
  
  return (req, res, next) => {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
    }
    
    // Check if user has required role
    if (requiredRoles.includes(req.user.role)) {
      return next();
    }
    
    // User doesn't have required role
    return res.status(403).json({
      status: 'error',
      message: 'Access denied: insufficient permissions'
    });
  };
}

module.exports = {
  authenticate,
  hasRole
}; 