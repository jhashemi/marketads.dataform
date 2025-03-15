/**
 * API Server
 * Main Express server setup for MarketAds Data Matching API
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const swaggerUi = require('swagger-ui-express');

// Create Express app
const app = express();

// Application middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Load OpenAPI specification if available
let apiSpec = null;
const apiSpecPath = path.join(__dirname, '../../docs/contracts/openapi_api_contracts.yaml');

try {
  if (fs.existsSync(apiSpecPath)) {
    apiSpec = yaml.load(fs.readFileSync(apiSpecPath, 'utf8'));
    
    // Serve API documentation
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(apiSpec));
    
    // OpenAPI validation middleware
    // Only load if the spec is available
    try {
      const { OpenApiValidator } = require('express-openapi-validator');
      app.use(
        OpenApiValidator.middleware({
          apiSpec,
          validateRequests: true,
          validateResponses: true
        })
      );
    } catch (validatorError) {
      console.error('Error loading OpenAPI validator:', validatorError);
      console.warn('API request/response validation is disabled.');
    }
  } else {
    console.warn('OpenAPI specification file not found:', apiSpecPath);
    console.warn('API documentation and request/response validation are disabled.');
  }
} catch (error) {
  console.error('Error loading OpenAPI specification:', error);
  console.warn('API documentation and request/response validation are disabled.');
}

// Import routes
try {
  const authRoutes = require('./routes/auth_routes');
  const schemaRoutes = require('./routes/schema_routes');
  const ruleSelectionRoutes = require('./routes/rule_selection_routes');
  
  // API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/schemas', schemaRoutes);
  app.use('/api/rule-selection', ruleSelectionRoutes);
} catch (routeError) {
  console.error('Error loading routes:', routeError);
  console.warn('API routes could not be loaded. The API will only serve the health endpoint.');
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'API is operational',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  // Log error for debugging
  console.error('API Error:', err);

  // OpenAPI validation errors
  if (err.status && err.errors) {
    return res.status(err.status).json({
      status: 'error',
      message: 'Validation error',
      errors: err.errors
    });
  }

  // Default error response
  return res.status(err.status || 500).json({
    status: 'error',
    message: err.message || 'Internal server error'
  });
});

// 404 handler - must be after all other routes
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Endpoint not found: ${req.method} ${req.originalUrl}`
  });
});

/**
 * Start the API server
 * @param {number} port - Port to listen on
 * @returns {Promise<Object>} The HTTP server instance
 */
function startServer(port = process.env.PORT || 3000) {
  return new Promise((resolve) => {
    const server = app.listen(port, () => {
      console.log(`MarketAds Data Matching API running on port ${port}`);
      resolve(server);
    });
  });
}

// Export for testing and direct execution
module.exports = {
  app,
  startServer
}; 