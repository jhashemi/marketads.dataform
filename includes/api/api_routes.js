/**
 * API Routes
 * 
 * Configures all API routes for the MarketAds Dataform application.
 */

const express = require('express');
const router = express.Router();

// Import API modules
const matchingApi = require('./matching_api');
const monitoringApi = require('./monitoring_api');
const validationApi = require('./validation_api');
const ruleSelectionApi = require('./rule_selection_api');

// Configure middleware
router.use(express.json());
router.use(express.urlencoded({ extended: true }));

// Set up API routes
router.use('/matching', matchingApi);
router.use('/monitoring', monitoringApi);
router.use('/validation', validationApi);
router.use('/rules', ruleSelectionApi);

/**
 * Default API route - provides API information
 */
router.get('/', (req, res) => {
  res.json({
    name: 'MarketAds Dataform API',
    version: '1.0.0',
    endpoints: [
      {
        path: '/api/matching',
        description: 'Endpoints for data matching operations'
      },
      {
        path: '/api/monitoring',
        description: 'Endpoints for system monitoring and metrics'
      },
      {
        path: '/api/validation',
        description: 'Endpoints for data and parameter validation'
      },
      {
        path: '/api/rules',
        description: 'Endpoints for intelligent rule selection and management'
      }
    ],
    documentation: '/api/docs'
  });
});

/**
 * API documentation route
 */
router.get('/docs', (req, res) => {
  res.json({
    openapi: '3.0.0',
    info: {
      title: 'MarketAds Dataform API',
      version: '1.0.0',
      description: 'API for the MarketAds Dataform application'
    },
    servers: [
      {
        url: '/api',
        description: 'Main API server'
      }
    ],
    tags: [
      { name: 'Matching', description: 'Data matching operations' },
      { name: 'Monitoring', description: 'System monitoring and metrics' },
      { name: 'Validation', description: 'Data and parameter validation' },
      { name: 'Rules', description: 'Intelligent rule selection and management' }
    ],
    paths: {
      '/rules/recommend': {
        post: {
          tags: ['Rules'],
          summary: 'Recommend matching rules based on tables and goals',
          description: 'Analyzes table schemas and user goals to recommend optimal matching rules',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['sourceTableId', 'referenceTableId'],
                  properties: {
                    sourceTableId: {
                      type: 'string',
                      description: 'ID of the source table'
                    },
                    referenceTableId: {
                      type: 'string',
                      description: 'ID of the reference table'
                    },
                    goalDescription: {
                      type: 'string',
                      description: 'User\'s description of their matching goal'
                    },
                    options: {
                      type: 'object',
                      description: 'Additional options for the recommendation'
                    }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Successful operation',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: {
                        type: 'boolean'
                      },
                      recommendation: {
                        type: 'object'
                      }
                    }
                  }
                }
              }
            },
            '400': {
              description: 'Invalid request parameters'
            },
            '500': {
              description: 'Server error'
            }
          }
        }
      },
      '/rules/apply': {
        post: {
          tags: ['Rules'],
          summary: 'Apply recommended rules to perform matching',
          description: 'Execute matching with the recommended rules and record performance',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['recommendation'],
                  properties: {
                    recommendation: {
                      type: 'object',
                      description: 'Rule recommendation from recommendRules()'
                    },
                    options: {
                      type: 'object',
                      description: 'Additional options for execution'
                    }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Successful operation',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: {
                        type: 'boolean'
                      },
                      result: {
                        type: 'object'
                      }
                    }
                  }
                }
              }
            },
            '400': {
              description: 'Invalid request parameters'
            },
            '500': {
              description: 'Server error'
            }
          }
        }
      },
      '/rules/performance': {
        get: {
          tags: ['Rules'],
          summary: 'Get performance report for rules',
          description: 'Retrieve performance metrics and trends for rules',
          parameters: [
            {
              name: 'days',
              in: 'query',
              description: 'Number of days to include in the report',
              schema: {
                type: 'integer',
                default: 30
              }
            }
          ],
          responses: {
            '200': {
              description: 'Successful operation',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: {
                        type: 'boolean'
                      },
                      report: {
                        type: 'object'
                      }
                    }
                  }
                }
              }
            },
            '500': {
              description: 'Server error'
            }
          }
        }
      },
      '/rules/explain': {
        post: {
          tags: ['Rules'],
          summary: 'Explain rule recommendation',
          description: 'Get a detailed explanation of a rule recommendation',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['recommendation'],
                  properties: {
                    recommendation: {
                      type: 'object',
                      description: 'Rule recommendation to explain'
                    }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Successful operation',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: {
                        type: 'boolean'
                      },
                      explanation: {
                        type: 'string'
                      }
                    }
                  }
                }
              }
            },
            '400': {
              description: 'Invalid request parameters'
            },
            '500': {
              description: 'Server error'
            }
          }
        }
      }
    }
  });
});

/**
 * API health check route
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'UP',
    timestamp: new Date().toISOString()
  });
});

module.exports = router; 