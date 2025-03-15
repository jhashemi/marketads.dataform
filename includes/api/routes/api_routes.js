/**
 * API Routes for Intelligent Rule Selection
 * Defines routes for rule configuration and auto-selection
 */

const express = require('express');
const router = express.Router();
const ruleConfigController = require('../controllers/rule_config_controller');

/**
 * @route POST /api/rules/auto-configure
 * @desc Auto-configure matching rules based on table schemas and goals
 * @access Protected
 */
router.post('/rules/auto-configure', ruleConfigController.autoConfigureRules);

/**
 * @route GET /api/rules/available-goals
 * @desc Get a list of available goal options for auto-configuration
 * @access Protected
 */
router.get('/rules/available-goals', ruleConfigController.getAvailableGoals);

/**
 * @route POST /api/rules/preview
 * @desc Preview how auto-configured rules will perform
 * @access Protected
 */
router.post('/rules/preview', ruleConfigController.previewRules);

module.exports = router; 