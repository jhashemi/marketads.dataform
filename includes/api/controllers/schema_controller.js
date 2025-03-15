/**
 * Schema Controller
 * Handles HTTP requests for schema analysis operations
 */

const schemaAnalyzer = require('../../rules/schema_analyzer');

/**
 * Analyze schemas of source and reference tables
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function analyzeSchemas(req, res) {
  try {
    // Extract table IDs from request
    const { sourceTableId, referenceTableId } = req.body;

    // Validate input
    if (!sourceTableId || !referenceTableId) {
      return res.status(400).json({
        status: 'error',
        message: 'Source and reference table IDs are required'
      });
    }

    // Analyze schemas using the schema analyzer
    try {
      const result = await schemaAnalyzer.analyzeSchema(sourceTableId, referenceTableId);
      
      // Return successful response with analysis results
      return res.status(200).json({
        status: 'success',
        data: result
      });
    } catch (error) {
      // Handle analysis errors
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
    console.error('Schema analysis error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
}

/**
 * Get table schema information
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getTableSchema(req, res) {
  try {
    // Extract table ID from request parameters
    const { tableId } = req.params;

    // Validate input
    if (!tableId) {
      return res.status(400).json({
        status: 'error',
        message: 'Table ID is required'
      });
    }

    // Get table schema using the schema analyzer
    try {
      const result = await schemaAnalyzer.getTableSchema(tableId);
      
      // Return successful response with schema information
      return res.status(200).json({
        status: 'success',
        data: result
      });
    } catch (error) {
      // Handle not found errors
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
    console.error('Get table schema error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
}

/**
 * Find compatible fields between two tables
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function findCompatibleFields(req, res) {
  try {
    // Extract table IDs from request
    const { sourceTableId, referenceTableId } = req.body;

    // Validate input
    if (!sourceTableId || !referenceTableId) {
      return res.status(400).json({
        status: 'error',
        message: 'Source and reference table IDs are required'
      });
    }

    // Get schemas for both tables
    try {
      const sourceSchema = await schemaAnalyzer.getTableSchema(sourceTableId);
      const referenceSchema = await schemaAnalyzer.getTableSchema(referenceTableId);
      
      // Find common fields
      const commonFields = schemaAnalyzer.findCommonFields(
        sourceSchema,
        referenceSchema
      );
      
      // Return successful response with compatible fields
      return res.status(200).json({
        status: 'success',
        data: {
          compatibleFields: commonFields.filter(field => field.compatibility.compatible)
        }
      });
    } catch (error) {
      // Handle not found errors
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
    console.error('Find compatible fields error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
}

module.exports = {
  analyzeSchemas,
  getTableSchema,
  findCompatibleFields
}; 