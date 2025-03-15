/**
 * Authentication Routes
 * Defines routes for user authentication according to OpenAPI contract
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth_controller');

/**
 * @route POST /auth/login
 * @desc Authenticate a user and return a JWT token
 * @access Public
 */
router.post('/login', authController.login);

/**
 * @route POST /auth/refresh
 * @desc Refresh an expired JWT token
 * @access Protected
 */
router.post('/refresh', authController.refreshToken);

module.exports = router; 