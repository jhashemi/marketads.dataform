/**
 * Rule Selection Controller
 * Handles HTTP requests for intelligent rule selection operations
 */

const ruleSelectionService = require('../../rules/rule_selection_service');
const schemaAnalyzer = require('../../rules/schema_analyzer');

/**
 * Recommend matching rules based on table schemas
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function recommendRules(req, res) {
  try {
    // Extract parameters from request
    const { sourceTableId, referenceTableId, goal } = req.body;

    // Validate required parameters
    if (!sourceTableId || !referenceTableId) {
      return res.status(400).json({
        status: 'error',
        message: 'Source and reference table IDs are required'
      });
    }

    // Call rule selection service to get recommendations
    try {
      const options = { goal };
      const recommendations = await ruleSelectionService.recommendRules(
        sourceTableId, 
        referenceTableId, 
        options
      );
      
      // Return successful response with recommendations
      return res.status(200).json({
        status: 'success',
        data: recommendations
      });
    } catch (error) {
      // Handle specific errors
      if (error.message.includes('not found')) {
        return res.status(404).json({
          status: 'error',
          message: error.message
        });
      }
      
      // Handle other errors
      throw error;
    }
  } catch (error) {
    // Handle unexpected errors
    console.error('Rule recommendation error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
}

/**
 * Evaluate a set of matching rules
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function evaluateRules(req, res) {
  try {
    // Extract parameters from request
    const { sourceTableId, referenceTableId, rules } = req.body;

    // Validate required parameters
    if (!sourceTableId || !referenceTableId || !rules) {
      return res.status(400).json({
        status: 'error',
        message: 'Source table ID, reference table ID, and rules are required'
      });
    }

    // Call rule selection service to evaluate rules
    try {
      // First get the schema analysis
      const analysis = await schemaAnalyzer.analyzeSchema(sourceTableId, referenceTableId);
      
      // Then evaluate the provided rules
      const evaluation = ruleSelectionService.evaluateRuleSet(rules, analysis);
      
      // Return successful response with evaluation
      return res.status(200).json({
        status: 'success',
        data: {
          sourceTableId,
          referenceTableId,
          evaluation
        }
      });
    } catch (error) {
      // Handle specific errors
      if (error.message.includes('not found')) {
        return res.status(404).json({
          status: 'error',
          message: error.message
        });
      }
      
      // Handle other errors
      throw error;
    }
  } catch (error) {
    // Handle unexpected errors
    console.error('Rule evaluation error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
}

module.exports = {
  recommendRules,
  evaluateRules
}; 