/**
 * API Server
 * Entry point for the MarketAds API, configured according to OpenAPI contract
 */

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const OpenApiValidator = require('express-openapi-validator');
const swaggerUi = require('swagger-ui-express');
const YAML = require('js-yaml');

// Initialize the express app
const app = express();

// Basic middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());

// Load the OpenAPI specification
const openApiPath = path.join(__dirname, '../../docs/contracts/openapi_api_contracts.yaml');
let apiSpec;

try {
  // The spec might not exist yet while we're developing, so handle this gracefully
  if (fs.existsSync(openApiPath)) {
    apiSpec = YAML.load(fs.readFileSync(openApiPath, 'utf8'));
    
    // Serve API documentation
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(apiSpec));
    
    // OpenAPI validation middleware
    app.use(
      OpenApiValidator.middleware({
        apiSpec,
        validateRequests: true,
        validateResponses: true,
      })
    );
  }
} catch (error) {
  console.error('Error loading OpenAPI spec:', error);
}

// Routes - These will be implemented as we progress
// Auth routes
app.use('/auth', require('./routes/auth_routes'));

// User routes
app.use('/users', require('./routes/user_routes'));

// Data source routes
app.use('/data-sources', require('./routes/data_source_routes'));

// Reference table routes
app.use('/reference-tables', require('./routes/reference_table_routes'));

// Matching rule routes
app.use('/matching-rules', require('./routes/matching_rule_routes'));

// Pipeline routes
app.use('/pipelines', require('./routes/pipeline_routes'));

// Match results routes
app.use('/match-results', require('./routes/match_result_routes'));

// Dashboard routes
app.use('/dashboard', require('./routes/dashboard_routes'));

// System routes
app.use('/system', require('./routes/system_routes'));

// Notification routes
app.use('/notifications', require('./routes/notification_routes'));

// AI insights routes
app.use('/ai', require('./routes/ai_routes'));

// Error handling middleware
app.use((err, req, res, next) => {
  // Log the error
  console.error(err);

  // Format the error response according to the OpenAPI contract
  res.status(err.status || 500).json({
    code: err.code || 'INTERNAL_SERVER_ERROR',
    message: err.message || 'An unexpected error occurred',
    details: err.details || {}
  });
});

// Export the app for testing
module.exports = app;

// Start the server when file is run directly
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
} 