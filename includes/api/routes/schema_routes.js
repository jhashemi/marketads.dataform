/**
 * Schema Routes
 * Defines API routes for schema analysis operations
 */

const express = require('express');
const schemaController = require('../controllers/schema_controller');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

/**
 * @route POST /api/schemas/analyze
 * @desc Analyze schemas of source and reference tables
 * @access Private
 */
router.post('/analyze', authMiddleware.authenticate, schemaController.analyzeSchemas);

/**
 * @route GET /api/schemas/:tableId
 * @desc Get schema information for a specific table
 * @access Private
 */
router.get('/:tableId', authMiddleware.authenticate, schemaController.getTableSchema);

/**
 * @route POST /api/schemas/compatible-fields
 * @desc Find compatible fields between two tables
 * @access Private
 */
router.post('/compatible-fields', authMiddleware.authenticate, schemaController.findCompatibleFields);

module.exports = router; 