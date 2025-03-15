/**
 * Rule Configuration Controller
 * Handles requests for intelligent rule selection and configuration
 */

const ruleSelectionService = require('../services/rule_selection_service');
const schemaAnalyzer = require('../../rules/schema_analyzer');

/**
 * Auto-configure rules based on schema analysis and user goals
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function autoConfigureRules(req, res, next) {
  try {
    const { sourceTableId, referenceTableId, goal, outputFields } = req.body;
    
    // Validate required fields
    if (!sourceTableId) {
      return res.status(400).json({
        code: 'MISSING_SOURCE_TABLE',
        message: 'Source table ID is required'
      });
    }
    
    if (!referenceTableId) {
      return res.status(400).json({
        code: 'MISSING_REFERENCE_TABLE',
        message: 'Reference table ID is required'
      });
    }
    
    if (!goal) {
      return res.status(400).json({
        code: 'MISSING_GOAL',
        message: 'Matching goal is required'
      });
    }
    
    // Analyze schema of both tables
    let schemaAnalysis;
    try {
      schemaAnalysis = await schemaAnalyzer.analyzeSchema(sourceTableId, referenceTableId);
    } catch (error) {
      return res.status(404).json({
        code: 'SCHEMA_ANALYSIS_FAILED',
        message: error.message
      });
    }
    
    // Generate rule configuration based on schema and goal
    const ruleConfiguration = await ruleSelectionService.generateRuleConfiguration(
      schemaAnalysis,
      goal,
      outputFields || []
    );
    
    // Return the suggested rules and explanations
    return res.status(200).json(ruleConfiguration);
  } catch (error) {
    next(error);
  }
}

/**
 * Get available goal options for rule configuration
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function getAvailableGoals(req, res, next) {
  try {
    // Return a list of available goals with descriptions
    const goals = [
      {
        id: 'HIGH_PRECISION',
        name: 'High Precision',
        description: 'Prioritize accuracy over finding all possible matches. Reduces false positives.'
      },
      {
        id: 'HIGH_RECALL',
        name: 'High Recall',
        description: 'Prioritize finding all possible matches, even at the cost of some false positives.'
      },
      {
        id: 'BALANCED',
        name: 'Balanced',
        description: 'A balanced approach between precision and recall.'
      },
      {
        id: 'CUSTOM',
        name: 'Custom',
        description: 'Define your own precision/recall tradeoff with custom thresholds.'
      }
    ];
    
    return res.status(200).json({ goals });
  } catch (error) {
    next(error);
  }
}

/**
 * Preview rule performance based on a sample of the data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function previewRules(req, res, next) {
  try {
    const { rules, sourceTableId, referenceTableId, sampleSize } = req.body;
    
    // Validate required fields
    if (!rules || !Array.isArray(rules) || rules.length === 0) {
      return res.status(400).json({
        code: 'INVALID_RULES',
        message: 'Valid rules array is required'
      });
    }
    
    if (!sourceTableId) {
      return res.status(400).json({
        code: 'MISSING_SOURCE_TABLE',
        message: 'Source table ID is required'
      });
    }
    
    if (!referenceTableId) {
      return res.status(400).json({
        code: 'MISSING_REFERENCE_TABLE',
        message: 'Reference table ID is required'
      });
    }
    
    // Call service to run a preview of rule performance
    // For now, just throw 'Not implemented' since we're following TDD
    throw new Error('Not implemented');
  } catch (error) {
    if (error.message === 'Not implemented') {
      return res.status(501).json({
        code: 'NOT_IMPLEMENTED',
        message: 'This feature is not yet implemented'
      });
    }
    next(error);
  }
}

module.exports = {
  autoConfigureRules,
  getAvailableGoals,
  previewRules
}; 