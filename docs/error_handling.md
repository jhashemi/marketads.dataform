# Error Handling System Documentation

## Overview

The MarketAds Dataform project implements a comprehensive error handling system designed to provide robust error management, recovery, and reporting. This document outlines the components of the system and how they work together.

## Components

### 1. Error Types

The system defines a hierarchy of error types to categorize different error scenarios:

- **MarketAdsError**: Base error class for all application errors
  - **ValidationError**: For parameter validation failures
  - **DataformError**: For Dataform-specific errors
  - **ConfigError**: For configuration-related errors
  - **TimeoutError**: For operation timeouts
  - **ApiError**: For API-related errors
  - **NotFoundError**: For resource not found errors

Each error type includes:
- Custom error codes
- Contextual information
- Severity levels
- Suggested recovery actions

### 2. Error Handler

The centralized error handler provides:

- **Error classification**: Categorizes errors by type and severity
- **Contextual logging**: Captures error context for debugging
- **Safe execution wrappers**: Protects code execution with try/catch blocks
- **Integration with recovery mechanisms**: Connects to retry, circuit breaker, and fallback utilities

### 3. Error Recovery Mechanisms

#### Retry Utility

The retry utility (`retry_utils.js`) provides:

- Configurable retry attempts
- Exponential backoff with jitter
- Custom retry conditions
- Timeout handling

Usage example:
```javascript
const { retryOperation } = require('./includes/utils/retry_utils');

// Retry an operation with exponential backoff
const result = await retryOperation(
  async () => await fetchData(),
  {
    maxRetries: 3,
    initialDelayMs: 1000,
    backoffFactor: 2,
    retryCondition: (error) => error.isRetryable
  }
);
```

#### Circuit Breaker

The circuit breaker (`circuit_breaker.js`) implements the circuit breaker pattern to:

- Prevent cascading failures
- Automatically detect system health
- Provide fallback mechanisms
- Emit events for state changes

Usage example:
```javascript
const { CircuitBreaker } = require('./includes/utils/circuit_breaker');

// Create a circuit breaker
const breaker = new CircuitBreaker({
  failureThreshold: 3,
  resetTimeout: 10000,
  fallback: () => 'fallback response'
});

// Execute a function with circuit breaker protection
const result = await breaker.execute(async () => {
  return await callExternalService();
});
```

#### Fallback Utilities

The fallback utilities (`fallback_utils.js`) provide:

- Function execution with fallbacks
- Fallback chains
- Default value fallbacks
- Cache-based fallbacks

Usage example:
```javascript
const { withFallback, withDefault } = require('./includes/utils/fallback_utils');

// Execute with a fallback function
const result = await withFallback(
  () => primaryOperation(),
  (error) => fallbackOperation(error)
);

// Execute with a default value fallback
const data = await withDefault(
  () => fetchData(),
  defaultValue
);
```

## Integration

The error handling components are designed to work together:

1. **Error Detection**: Errors are caught and classified by the error handler
2. **Recovery Attempt**: The system attempts recovery using retry mechanisms
3. **Circuit Protection**: Circuit breakers prevent cascading failures
4. **Graceful Degradation**: Fallbacks provide alternative behavior when operations fail
5. **Logging and Reporting**: All errors are logged with context for debugging

## Best Practices

1. **Always use the error handler**: Wrap operations with `errorHandler.wrapSafe()`
2. **Use specific error types**: Throw the most specific error type for better classification
3. **Include context**: Provide detailed context when creating errors
4. **Configure recovery**: Set appropriate retry and circuit breaker parameters
5. **Provide fallbacks**: Always define fallback behavior for critical operations

## Example Workflow

```javascript
const { errorHandler } = require('./includes/errors/error_handler');
const { retryOperation } = require('./includes/utils/retry_utils');
const { CircuitBreaker } = require('./includes/utils/circuit_breaker');
const { withFallback } = require('./includes/utils/fallback_utils');

// Create a circuit breaker
const breaker = new CircuitBreaker({
  failureThreshold: 3,
  resetTimeout: 10000
});

// Define the operation with multiple recovery layers
async function performOperation() {
  return await errorHandler.wrapSafe(
    async () => {
      return await breaker.execute(
        async () => {
          return await retryOperation(
            async () => {
              return await withFallback(
                async () => await primaryOperation(),
                async (error) => await fallbackOperation(error)
              );
            },
            { maxRetries: 3 }
          );
        }
      );
    },
    'Operation failed',
    defaultValue
  );
}
```

This layered approach provides comprehensive error handling with multiple recovery strategies. 