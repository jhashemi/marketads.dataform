/**
 * Rule Selection Routes
 * Defines API routes for intelligent rule selection operations
 */

const express = require('express');
const ruleSelectionController = require('../controllers/rule_selection_controller');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

/**
 * @route POST /api/rule-selection/recommend
 * @desc Get recommended matching rules based on table schemas
 * @access Private
 */
router.post('/recommend', authMiddleware.authenticate, ruleSelectionController.recommendRules);

/**
 * @route POST /api/rule-selection/evaluate
 * @desc Evaluate a set of matching rules
 * @access Private
 */
router.post('/evaluate', authMiddleware.authenticate, ruleSelectionController.evaluateRules);

module.exports = router; 