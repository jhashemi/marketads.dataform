/**
 * Authentication service
 * Handles user authentication operations including login and token refresh
 */

// In a real application, we would use a database to store users and tokens
// For this implementation, we'll use a simple in-memory store
const users = [
  {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    password: 'password123', // In a real app, this would be hashed
    name: 'Test User',
    role: 'user'
  },
  {
    id: '223e4567-e89b-12d3-a456-426614174001',
    email: 'admin@example.com',
    password: 'admin123', // In a real app, this would be hashed
    name: 'Admin User',
    role: 'admin'
  }
];

// In a real application, we would use a proper JWT library with environment variables
// for secrets, token expiration, etc.
function generateToken(user) {
  // Simplified token generation - in a real app use jwt.sign()
  return `jwt-token-${user.id}`;
}

/**
 * Authenticates a user with email and password
 * @param {string} email - User's email address
 * @param {string} password - User's password
 * @returns {Promise<Object>} Object containing token and user information
 * @throws {Error} If credentials are invalid
 */
async function login(email, password) {
  // Find user by email
  const user = users.find(u => u.email === email);
  
  // Check if user exists and password matches
  if (!user || user.password !== password) {
    throw new Error('Invalid credentials');
  }
  
  // Generate token
  const token = generateToken(user);
  
  // Return token and user (excluding password)
  const { password: _, ...userWithoutPassword } = user;
  return {
    token,
    user: userWithoutPassword
  };
}

/**
 * Refreshes a JWT token
 * @param {string} token - The existing JWT token
 * @returns {Promise<Object>} Object containing the new token
 * @throws {Error} If token is invalid or expired
 */
async function refreshToken(token) {
  // In a real application, we would verify the token and check if it's expired
  // For this implementation, we'll just check if the token exists in our format
  if (!token || !token.startsWith('jwt-token-')) {
    throw new Error('Invalid token');
  }
  
  // Extract user ID from token
  const userId = token.replace('jwt-token-', '');
  
  // Find user by ID
  const user = users.find(u => u.id === userId);
  
  if (!user) {
    throw new Error('Invalid token');
  }
  
  // Generate new token
  const newToken = generateToken(user);
  
  return {
    token: newToken
  };
}

/**
 * Verifies a JWT token
 * @param {string} token - The JWT token to verify
 * @returns {Promise<Object>} The decoded token payload
 * @throws {Error} If token is invalid
 */
async function verifyToken(token) {
  // In a real application, we would verify the token signature and expiration
  // For this implementation, we'll just check if the token exists in our format
  if (!token || !token.startsWith('jwt-token-')) {
    throw new Error('Invalid token');
  }
  
  // Extract user ID from token
  const userId = token.replace('jwt-token-', '');
  
  // Find user by ID
  const user = users.find(u => u.id === userId);
  
  if (!user) {
    throw new Error('Invalid token');
  }
  
  // Return user information (excluding password)
  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

module.exports = {
  login,
  refreshToken,
  verifyToken
}; 