/**
 * Rule Selection API
 * 
 * Provides HTTP endpoints and CLI interfaces for the Intelligent Rule Selection system.
 * This module serves as the primary interface for users to interact with the rule selection system.
 */

const express = require('express');
const bodyParser = require('body-parser');
const intelligentRuleSelector = require('../rules/intelligent_rule_selector');

// Create Express router for API endpoints
const router = express.Router();
router.use(bodyParser.json());

/**
 * API endpoint to recommend rules
 * 
 * POST /api/rules/recommend
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.sourceTableId - ID of the source table
 * @param {string} req.body.referenceTableId - ID of the reference table
 * @param {string} req.body.goalDescription - User's description of their matching goal
 * @param {Object} req.body.options - Additional options for the recommendation
 * @param {Object} res - Express response object
 */
router.post('/recommend', async (req, res) => {
  try {
    const { sourceTableId, referenceTableId, goalDescription, options } = req.body;
    
    // Validate required parameters
    if (!sourceTableId || !referenceTableId) {
      return res.status(400).json({
        error: 'Missing required parameters',
        details: 'sourceTableId and referenceTableId are required'
      });
    }
    
    // Use default goal description if not provided
    const goal = goalDescription || 'Find high quality matches with good performance';
    
    console.log(`Recommending rules for ${sourceTableId} → ${referenceTableId} with goal: "${goal}"`);
    
    // Get rule recommendations
    const recommendation = await intelligentRuleSelector.recommendRules(
      sourceTableId,
      referenceTableId,
      goal,
      options || {}
    );
    
    // Return recommendation
    return res.status(200).json({
      success: true,
      recommendation
    });
  } catch (error) {
    console.error('Error in rule recommendation API:', error);
    return res.status(500).json({
      error: 'Failed to recommend rules',
      details: error.message
    });
  }
});

/**
 * API endpoint to apply recommended rules
 * 
 * POST /api/rules/apply
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {Object} req.body.recommendation - Rule recommendation from recommendRules()
 * @param {Object} req.body.options - Execution options
 * @param {Object} res - Express response object
 */
router.post('/apply', async (req, res) => {
  try {
    const { recommendation, options } = req.body;
    
    // Validate required parameters
    if (!recommendation) {
      return res.status(400).json({
        error: 'Missing required parameters',
        details: 'recommendation is required'
      });
    }
    
    console.log(`Applying recommended rules for ${recommendation.sourceTable} → ${recommendation.referenceTable}`);
    
    // Apply recommended rules
    const result = await intelligentRuleSelector.applyRecommendedRules(
      recommendation,
      options || {}
    );
    
    // Return result
    return res.status(200).json({
      success: true,
      result
    });
  } catch (error) {
    console.error('Error in rule application API:', error);
    return res.status(500).json({
      error: 'Failed to apply rules',
      details: error.message
    });
  }
});

/**
 * API endpoint to get performance report
 * 
 * GET /api/rules/performance
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.query - Query parameters
 * @param {number} req.query.days - Number of days to include in the report
 * @param {Object} res - Express response object
 */
router.get('/performance', (req, res) => {
  try {
    const days = parseInt(req.query.days || '30', 10);
    
    console.log(`Generating performance report for the last ${days} days`);
    
    // Get performance report
    const report = intelligentRuleSelector.getPerformanceReport(days);
    
    // Return report
    return res.status(200).json({
      success: true,
      report
    });
  } catch (error) {
    console.error('Error in performance report API:', error);
    return res.status(500).json({
      error: 'Failed to generate performance report',
      details: error.message
    });
  }
});

/**
 * API endpoint to explain a recommendation
 * 
 * POST /api/rules/explain
 * 
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {Object} req.body.recommendation - Rule recommendation to explain
 * @param {Object} res - Express response object
 */
router.post('/explain', (req, res) => {
  try {
    const { recommendation } = req.body;
    
    // Validate required parameters
    if (!recommendation) {
      return res.status(400).json({
        error: 'Missing required parameters',
        details: 'recommendation is required'
      });
    }
    
    console.log(`Explaining recommendation for ${recommendation.sourceTable} → ${recommendation.referenceTable}`);
    
    // Get explanation
    const explanation = intelligentRuleSelector.explainRecommendation(recommendation);
    
    // Return explanation
    return res.status(200).json({
      success: true,
      explanation
    });
  } catch (error) {
    console.error('Error in recommendation explanation API:', error);
    return res.status(500).json({
      error: 'Failed to explain recommendation',
      details: error.message
    });
  }
});

/**
 * Command Line Interface for rule selection
 * This function is called when the module is run directly with Node.js
 */
function runCLI() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case 'recommend':
      // node rule_selection_api.js recommend sourceTable referenceTable "goal description"
      if (args.length < 3) {
        console.error('Usage: node rule_selection_api.js recommend <sourceTable> <referenceTable> [goal]');
        process.exit(1);
      }
      
      const sourceTableId = args[1];
      const referenceTableId = args[2];
      const goalDescription = args[3] || 'Find high quality matches with good performance';
      
      console.log(`Recommending rules for ${sourceTableId} → ${referenceTableId} with goal: "${goalDescription}"`);
      
      intelligentRuleSelector.recommendRules(sourceTableId, referenceTableId, goalDescription)
        .then(recommendation => {
          console.log(JSON.stringify(recommendation, null, 2));
          process.exit(0);
        })
        .catch(error => {
          console.error('Error:', error.message);
          process.exit(1);
        });
      break;
      
    case 'explain':
      // node rule_selection_api.js explain recommendation.json
      if (args.length < 2) {
        console.error('Usage: node rule_selection_api.js explain <recommendation_file>');
        process.exit(1);
      }
      
      try {
        const fs = require('fs');
        const recommendationFile = args[1];
        const recommendation = JSON.parse(fs.readFileSync(recommendationFile, 'utf8'));
        
        console.log(`Explaining recommendation from ${recommendationFile}`);
        
        const explanation = intelligentRuleSelector.explainRecommendation(recommendation);
        console.log(explanation);
        process.exit(0);
      } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
      }
      break;
      
    case 'apply':
      // node rule_selection_api.js apply recommendation.json
      if (args.length < 2) {
        console.error('Usage: node rule_selection_api.js apply <recommendation_file>');
        process.exit(1);
      }
      
      try {
        const fs = require('fs');
        const recommendationFile = args[1];
        const recommendation = JSON.parse(fs.readFileSync(recommendationFile, 'utf8'));
        
        console.log(`Applying recommendation from ${recommendationFile}`);
        
        intelligentRuleSelector.applyRecommendedRules(recommendation)
          .then(result => {
            console.log(JSON.stringify(result, null, 2));
            process.exit(0);
          })
          .catch(error => {
            console.error('Error:', error.message);
            process.exit(1);
          });
      } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
      }
      break;
      
    case 'performance':
      // node rule_selection_api.js performance [days]
      const days = args[1] ? parseInt(args[1], 10) : 30;
      
      console.log(`Generating performance report for the last ${days} days`);
      
      try {
        const report = intelligentRuleSelector.getPerformanceReport(days);
        console.log(JSON.stringify(report, null, 2));
        process.exit(0);
      } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
      }
      break;
      
    default:
      console.log('Available commands:');
      console.log('  recommend <sourceTable> <referenceTable> [goal]');
      console.log('  apply <recommendation_file>');
      console.log('  explain <recommendation_file>');
      console.log('  performance [days]');
      process.exit(1);
  }
}

// If this file is being run directly, run the CLI
if (require.main === module) {
  runCLI();
}

module.exports = router; 