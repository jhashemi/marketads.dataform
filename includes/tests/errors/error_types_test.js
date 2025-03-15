/**
 * @fileoverview Tests for Error Types
 * 
 * This file contains tests for the error types functionality.
 */

const assert = require('assert');
const { 
  MarketAdsError,
  DataformError,
  BigQueryError,
  ConfigurationError,
  TimeoutError,
  ApiError,
  SystemError,
  NotFoundError
} = require('../../errors/error_types');

/**
 * Test suite for Error Types
 */
const tests = [
  {
    id: 'marketads_error_basic',
    name: 'MarketAdsError - Basic Creation',
    type: 'unit',
    tags: ['error', 'types'],
    priority: 1,
    testFn: async () => {
      // Create a basic MarketAdsError
      const error = new MarketAdsError('Test error message');
      
      // Verify error properties
      assert.strictEqual(error.name, 'MarketAdsError', 'Error name should be MarketAdsError');
      assert.strictEqual(error.message, 'Test error message', 'Error message should be preserved');
      assert.strictEqual(error.code, 'MARKETADS_ERROR', 'Default code should be MARKETADS_ERROR');
      assert.strictEqual(error.severity, 'ERROR', 'Default severity should be ERROR');
      assert(error instanceof Error, 'MarketAdsError should inherit from Error');
      assert(error.stack, 'Error should have a stack trace');
      assert(error.timestamp, 'Error should have a timestamp');
      
      return true;
    }
  },
  
  {
    id: 'marketads_error_with_options',
    name: 'MarketAdsError - With Options',
    type: 'unit',
    tags: ['error', 'types'],
    priority: 1,
    testFn: async () => {
      // Create a MarketAdsError with options
      const error = new MarketAdsError('Test error message', {
        code: 'CUSTOM_CODE',
        severity: 'WARNING',
        component: 'test-component',
        context: { userId: '123' }
      });
      
      // Verify error properties
      assert.strictEqual(error.code, 'CUSTOM_CODE', 'Custom code should be used');
      assert.strictEqual(error.severity, 'WARNING', 'Custom severity should be used');
      assert.strictEqual(error.component, 'test-component', 'Component should be set');
      assert.deepStrictEqual(error.context, { userId: '123' }, 'Context should be set');
      
      return true;
    }
  },
  
  {
    id: 'marketads_error_with_cause',
    name: 'MarketAdsError - With Cause',
    type: 'unit',
    tags: ['error', 'types'],
    priority: 1,
    testFn: async () => {
      // Create an original error
      const originalError = new Error('Original error');
      
      // Create a MarketAdsError with cause
      const error = new MarketAdsError('Wrapped error', {
        cause: originalError
      });
      
      // Verify cause
      assert.strictEqual(error.cause, originalError, 'Cause should be set');
      
      return true;
    }
  },
  
  {
    id: 'marketads_error_to_json',
    name: 'MarketAdsError - JSON Serialization',
    type: 'unit',
    tags: ['error', 'types'],
    priority: 1,
    testFn: async () => {
      // Create a MarketAdsError with all properties
      const error = new MarketAdsError('Test error message', {
        code: 'CUSTOM_CODE',
        severity: 'WARNING',
        component: 'test-component',
        context: { userId: '123' },
        cause: new Error('Original error')
      });
      
      // Convert to JSON
      const json = error.toJSON();
      
      // Verify JSON properties
      assert.strictEqual(json.name, 'MarketAdsError', 'JSON should include name');
      assert.strictEqual(json.message, 'Test error message', 'JSON should include message');
      assert.strictEqual(json.code, 'CUSTOM_CODE', 'JSON should include code');
      assert.strictEqual(json.severity, 'WARNING', 'JSON should include severity');
      assert.strictEqual(json.component, 'test-component', 'JSON should include component');
      assert.deepStrictEqual(json.context, { userId: '123' }, 'JSON should include context');
      assert(json.timestamp, 'JSON should include timestamp');
      assert(json.stack, 'JSON should include stack');
      assert(json.cause, 'JSON should include cause');
      
      return true;
    }
  },
  
  {
    id: 'dataform_error_basic',
    name: 'DataformError - Basic Creation',
    type: 'unit',
    tags: ['error', 'types'],
    priority: 1,
    testFn: async () => {
      // Create a basic DataformError
      const error = new DataformError('Dataform error');
      
      // Verify error properties
      assert.strictEqual(error.name, 'DataformError', 'Error name should be DataformError');
      assert.strictEqual(error.message, 'Dataform error', 'Error message should be preserved');
      assert.strictEqual(error.code, 'DATAFORM_ERROR', 'Default code should be DATAFORM_ERROR');
      assert(error instanceof MarketAdsError, 'DataformError should inherit from MarketAdsError');
      
      return true;
    }
  },
  
  {
    id: 'bigquery_error_basic',
    name: 'BigQueryError - Basic Creation',
    type: 'unit',
    tags: ['error', 'types'],
    priority: 1,
    testFn: async () => {
      // Create a basic BigQueryError
      const error = new BigQueryError('BigQuery error');
      
      // Verify error properties
      assert.strictEqual(error.name, 'BigQueryError', 'Error name should be BigQueryError');
      assert.strictEqual(error.message, 'BigQuery error', 'Error message should be preserved');
      assert.strictEqual(error.code, 'BIGQUERY_ERROR', 'Default code should be BIGQUERY_ERROR');
      assert(error instanceof MarketAdsError, 'BigQueryError should inherit from MarketAdsError');
      
      // Create a BigQueryError with specific code
      const queryError = new BigQueryError('Invalid query', {
        code: 'INVALID_QUERY',
        query: 'SELECT * FROM invalid_table'
      });
      
      // Verify specific properties
      assert.strictEqual(queryError.code, 'INVALID_QUERY', 'Custom code should be used');
      assert.strictEqual(queryError.query, 'SELECT * FROM invalid_table', 'Query should be set');
      
      return true;
    }
  },
  
  {
    id: 'configuration_error_basic',
    name: 'ConfigurationError - Basic Creation',
    type: 'unit',
    tags: ['error', 'types'],
    priority: 1,
    testFn: async () => {
      // Create a basic ConfigurationError
      const error = new ConfigurationError('Missing configuration');
      
      // Verify error properties
      assert.strictEqual(error.name, 'ConfigurationError', 'Error name should be ConfigurationError');
      assert.strictEqual(error.message, 'Missing configuration', 'Error message should be preserved');
      assert.strictEqual(error.code, 'CONFIGURATION_ERROR', 'Default code should be CONFIGURATION_ERROR');
      assert(error instanceof MarketAdsError, 'ConfigurationError should inherit from MarketAdsError');
      
      // Create a ConfigurationError with parameter
      const paramError = new ConfigurationError('Invalid parameter', {
        parameter: 'timeout',
        value: -1,
        expected: 'positive number'
      });
      
      // Verify specific properties
      assert.strictEqual(paramError.parameter, 'timeout', 'Parameter should be set');
      assert.strictEqual(paramError.value, -1, 'Value should be set');
      assert.strictEqual(paramError.expected, 'positive number', 'Expected should be set');
      
      return true;
    }
  },
  
  {
    id: 'timeout_error_basic',
    name: 'TimeoutError - Basic Creation',
    type: 'unit',
    tags: ['error', 'types'],
    priority: 1,
    testFn: async () => {
      // Create a basic TimeoutError
      const error = new TimeoutError('Operation timed out');
      
      // Verify error properties
      assert.strictEqual(error.name, 'TimeoutError', 'Error name should be TimeoutError');
      assert.strictEqual(error.message, 'Operation timed out', 'Error message should be preserved');
      assert.strictEqual(error.code, 'TIMEOUT_ERROR', 'Default code should be TIMEOUT_ERROR');
      assert(error instanceof MarketAdsError, 'TimeoutError should inherit from MarketAdsError');
      
      // Create a TimeoutError with timeout value
      const specificError = new TimeoutError('Query timed out', {
        operation: 'BigQuery execution',
        timeoutMs: 30000
      });
      
      // Verify specific properties
      assert.strictEqual(specificError.operation, 'BigQuery execution', 'Operation should be set');
      assert.strictEqual(specificError.timeoutMs, 30000, 'Timeout value should be set');
      
      return true;
    }
  },
  
  {
    id: 'api_error_basic',
    name: 'ApiError - Basic Creation',
    type: 'unit',
    tags: ['error', 'types'],
    priority: 1,
    testFn: async () => {
      // Create a basic ApiError
      const error = new ApiError('API request failed');
      
      // Verify error properties
      assert.strictEqual(error.name, 'ApiError', 'Error name should be ApiError');
      assert.strictEqual(error.message, 'API request failed', 'Error message should be preserved');
      assert.strictEqual(error.code, 'API_ERROR', 'Default code should be API_ERROR');
      assert(error instanceof MarketAdsError, 'ApiError should inherit from MarketAdsError');
      
      // Create an ApiError with HTTP details
      const httpError = new ApiError('HTTP request failed', {
        statusCode: 404,
        endpoint: '/api/users',
        method: 'GET',
        response: { error: 'Not found' }
      });
      
      // Verify specific properties
      assert.strictEqual(httpError.statusCode, 404, 'Status code should be set');
      assert.strictEqual(httpError.endpoint, '/api/users', 'Endpoint should be set');
      assert.strictEqual(httpError.method, 'GET', 'Method should be set');
      assert.deepStrictEqual(httpError.response, { error: 'Not found' }, 'Response should be set');
      
      return true;
    }
  },
  
  {
    id: 'system_error_basic',
    name: 'SystemError - Basic Creation',
    type: 'unit',
    tags: ['error', 'types'],
    priority: 1,
    testFn: async () => {
      // Create a basic SystemError
      const error = new SystemError('System failure');
      
      // Verify error properties
      assert.strictEqual(error.name, 'SystemError', 'Error name should be SystemError');
      assert.strictEqual(error.message, 'System failure', 'Error message should be preserved');
      assert.strictEqual(error.code, 'SYSTEM_ERROR', 'Default code should be SYSTEM_ERROR');
      assert.strictEqual(error.severity, 'ERROR', 'Default severity should be ERROR');
      assert(error instanceof MarketAdsError, 'SystemError should inherit from MarketAdsError');
      
      // Create a SystemError with subsystem
      const specificError = new SystemError('Database connection failed', {
        subsystem: 'database',
        severity: 'CRITICAL'
      });
      
      // Verify specific properties
      assert.strictEqual(specificError.subsystem, 'database', 'Subsystem should be set');
      assert.strictEqual(specificError.severity, 'CRITICAL', 'Severity should be set to CRITICAL');
      
      return true;
    }
  },
  
  {
    id: 'not_found_error_basic',
    name: 'NotFoundError - Basic Creation',
    type: 'unit',
    tags: ['error', 'types'],
    priority: 1,
    testFn: async () => {
      // Create a basic NotFoundError
      const error = new NotFoundError('Resource not found');
      
      // Verify error properties
      assert.strictEqual(error.name, 'NotFoundError', 'Error name should be NotFoundError');
      assert.strictEqual(error.message, 'Resource not found', 'Error message should be preserved');
      assert.strictEqual(error.code, 'NOT_FOUND_ERROR', 'Default code should be NOT_FOUND_ERROR');
      assert(error instanceof MarketAdsError, 'NotFoundError should inherit from MarketAdsError');
      
      // Create a NotFoundError with resource details
      const specificError = new NotFoundError('User not found', {
        resourceType: 'user',
        resourceId: '123'
      });
      
      // Verify specific properties
      assert.strictEqual(specificError.resourceType, 'user', 'Resource type should be set');
      assert.strictEqual(specificError.resourceId, '123', 'Resource ID should be set');
      
      return true;
    }
  },
  
  {
    id: 'error_inheritance',
    name: 'Error Types - Inheritance',
    type: 'unit',
    tags: ['error', 'types', 'inheritance'],
    priority: 1,
    testFn: async () => {
      // Create instances of all error types
      const marketAdsError = new MarketAdsError('MarketAds error');
      const dataformError = new DataformError('Dataform error');
      const bigQueryError = new BigQueryError('BigQuery error');
      const configurationError = new ConfigurationError('Configuration error');
      const timeoutError = new TimeoutError('Timeout error');
      const apiError = new ApiError('API error');
      const systemError = new SystemError('System error');
      const notFoundError = new NotFoundError('Not found error');
      
      // Verify inheritance
      assert(marketAdsError instanceof Error, 'MarketAdsError should inherit from Error');
      assert(dataformError instanceof MarketAdsError, 'DataformError should inherit from MarketAdsError');
      assert(bigQueryError instanceof MarketAdsError, 'BigQueryError should inherit from MarketAdsError');
      assert(configurationError instanceof MarketAdsError, 'ConfigurationError should inherit from MarketAdsError');
      assert(timeoutError instanceof MarketAdsError, 'TimeoutError should inherit from MarketAdsError');
      assert(apiError instanceof MarketAdsError, 'ApiError should inherit from MarketAdsError');
      assert(systemError instanceof MarketAdsError, 'SystemError should inherit from MarketAdsError');
      assert(notFoundError instanceof MarketAdsError, 'NotFoundError should inherit from MarketAdsError');
      
      return true;
    }
  },
  
  {
    id: 'error_from_error',
    name: 'Error Types - From Error',
    type: 'unit',
    tags: ['error', 'types', 'conversion'],
    priority: 1,
    testFn: async () => {
      // Create a standard error
      const standardError = new Error('Standard error');
      
      // Convert to MarketAdsError
      const marketAdsError = MarketAdsError.fromError(standardError);
      
      // Verify conversion
      assert(marketAdsError instanceof MarketAdsError, 'Should convert to MarketAdsError');
      assert.strictEqual(marketAdsError.message, 'Standard error', 'Message should be preserved');
      assert.strictEqual(marketAdsError.cause, standardError, 'Original error should be set as cause');
      
      // Convert with custom properties
      const customError = MarketAdsError.fromError(standardError, {
        code: 'CUSTOM_CODE',
        severity: 'WARNING',
        component: 'test-component'
      });
      
      // Verify custom properties
      assert.strictEqual(customError.code, 'CUSTOM_CODE', 'Custom code should be set');
      assert.strictEqual(customError.severity, 'WARNING', 'Custom severity should be set');
      assert.strictEqual(customError.component, 'test-component', 'Component should be set');
      
      // Convert a MarketAdsError (should return the same error)
      const originalMarketAdsError = new MarketAdsError('Original error');
      const convertedMarketAdsError = MarketAdsError.fromError(originalMarketAdsError);
      
      // Verify no conversion happened
      assert.strictEqual(convertedMarketAdsError, originalMarketAdsError, 'Should return the same MarketAdsError');
      
      return true;
    }
  },
  
  {
    id: 'error_custom_properties',
    name: 'Error Types - Custom Properties',
    type: 'unit',
    tags: ['error', 'types', 'properties'],
    priority: 1,
    testFn: async () => {
      // Create an error with custom properties
      const error = new MarketAdsError('Test error', {
        customProp1: 'value1',
        customProp2: 'value2',
        nestedProp: {
          key1: 'nested1',
          key2: 'nested2'
        }
      });
      
      // Verify custom properties
      assert.strictEqual(error.customProp1, 'value1', 'Custom property 1 should be set');
      assert.strictEqual(error.customProp2, 'value2', 'Custom property 2 should be set');
      assert.deepStrictEqual(error.nestedProp, { key1: 'nested1', key2: 'nested2' }, 'Nested property should be set');
      
      // Verify JSON includes custom properties
      const json = error.toJSON();
      assert.strictEqual(json.customProp1, 'value1', 'JSON should include custom property 1');
      assert.strictEqual(json.customProp2, 'value2', 'JSON should include custom property 2');
      assert.deepStrictEqual(json.nestedProp, { key1: 'nested1', key2: 'nested2' }, 'JSON should include nested property');
      
      return true;
    }
  }
];

// For manual testing
if (require.main === module) {
  (async () => {
    for (const test of tests) {
      console.log(`Running test: ${test.name}`);
      try {
        const result = await test.testFn();
        console.log(`Test ${test.name} ${result ? 'PASSED' : 'FAILED'}`);
      } catch (error) {
        console.error(`Test ${test.name} FAILED with error:`, error);
      }
    }
  })();
}

module.exports = { tests }; 