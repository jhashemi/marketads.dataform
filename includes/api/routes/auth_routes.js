/**
 * Authentication Routes
 * Defines API routes for authentication operations
 */

const express = require('express');
const authController = require('../controllers/auth_controller');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

/**
 * @route POST /api/auth/login
 * @desc Authenticate user and get token
 * @access Public
 */
router.post('/login', authController.login);

/**
 * @route POST /api/auth/refresh
 * @desc Refresh authentication token
 * @access Public
 */
router.post('/refresh', authController.refreshToken);

/**
 * @route GET /api/auth/profile
 * @desc Get current user profile
 * @access Private
 */
router.get('/profile', authMiddleware.authenticate, authController.getUserProfile);

module.exports = router; 