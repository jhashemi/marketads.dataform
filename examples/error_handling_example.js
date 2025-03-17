/**
 * @fileoverview Self-contained example demonstrating error handling concepts.
 * This example shows how to implement and use retry mechanism, circuit breaker,
 * and fallback utilities together.
 */

// Simple error classes
class CustomError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = options.code || 'UNKNOWN_ERROR';
    this.params = options.params || {};
    this.severity = options.severity || 'ERROR';
  }
}

class ValidationError extends CustomError {
  constructor(message, options = {}) {
    super(message, { ...options, code: options.code || 'VALIDATION_ERROR' });
  }
}

// Simple retry utility
async function retryOperation(operation, options = {}) {
  const maxRetries = options.maxRetries || 3;
  const initialDelayMs = options.initialDelayMs || 1000;
  const backoffFactor = options.backoffFactor || 2;
  const retryCondition = options.retryCondition || (() => true);
  
  let lastError;
  let delay = initialDelayMs;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt >= maxRetries || !retryCondition(error)) {
        break;
      }
      
      console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= backoffFactor;
    }
  }
  
  throw lastError;
}

// Simple circuit breaker
class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 3;
    this.resetTimeout = options.resetTimeout || 10000;
    this.fallback = options.fallback;
    
    this.state = 'CLOSED';
    this.failures = 0;
    this.lastFailureTime = null;
    
    console.log(`Circuit breaker created with threshold ${this.failureThreshold}, reset timeout ${this.resetTimeout}ms`);
  }
  
  async execute(operation) {
    // Check if circuit is open
    if (this.state === 'OPEN') {
      // Check if reset timeout has elapsed
      if (this.lastFailureTime && Date.now() - this.lastFailureTime > this.resetTimeout) {
        console.log('Circuit half-open, allowing test request');
        this.state = 'HALF_OPEN';
      } else {
        console.log('Circuit open, rejecting request');
        if (this.fallback) {
          console.log('Using fallback');
          return this.fallback();
        }
        throw new Error('Circuit breaker open');
      }
    }
    
    try {
      const result = await operation();
      
      // If we were in half-open state, reset the circuit
      if (this.state === 'HALF_OPEN') {
        console.log('Test request succeeded, closing circuit');
        this.state = 'CLOSED';
        this.failures = 0;
      }
      
      return result;
    } catch (error) {
      this.failures++;
      this.lastFailureTime = Date.now();
      
      console.log(`Operation failed, failure count: ${this.failures}/${this.failureThreshold}`);
      
      // Check if we need to open the circuit
      if (this.state !== 'OPEN' && this.failures >= this.failureThreshold) {
        console.log('Failure threshold reached, opening circuit');
        this.state = 'OPEN';
      }
      
      // If we have a fallback and the circuit is open, use it
      if (this.state === 'OPEN' && this.fallback) {
        console.log('Using fallback');
        return this.fallback();
      }
      
      throw error;
    }
  }
}

// Simple fallback utilities
async function withFallback(operation, fallback) {
  try {
    return await operation();
  } catch (error) {
    console.log(`Operation failed, using fallback: ${error.message}`);
    return fallback(error);
  }
}

async function fallbackChain(operations) {
  let lastError;
  
  for (const operation of operations) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      console.log(`Operation in chain failed: ${error.message}`);
    }
  }
  
  throw lastError || new Error('All operations in fallback chain failed');
}

// Simulated external API call that sometimes fails
async function fetchUserData(userId) {
  console.log(`Attempting to fetch data for user ${userId}...`);
  
  // Force failures for specific user IDs to demonstrate circuit breaker
  if (userId >= 200 && userId <= 205) {
    console.log(`Forced failure for user ${userId}`);
    throw new Error('Network error: Connection refused');
  }
  
  // Simulate random failures (reduced for the rest)
  if (Math.random() < 0.4) {
    console.log(`Random failure occurred`);
    throw new Error('Network error: Connection refused');
  }
  
  // Simulate validation error
  if (!userId || userId <= 0) {
    throw new ValidationError('Invalid user ID', {
      code: 'INVALID_USER_ID',
      params: { userId },
      severity: 'ERROR'
    });
  }
  
  // Simulate successful response
  console.log(`Successfully fetched data for user ${userId}`);
  return {
    id: userId,
    name: `User ${userId}`,
    email: `user${userId}@example.com`
  };
}

// Create a circuit breaker for the API
const apiCircuitBreaker = new CircuitBreaker({
  failureThreshold: 2,
  resetTimeout: 5000,
  fallback: () => ({ id: 0, name: 'Guest User', email: 'guest@example.com' })
});

// Function to get user data with full error handling
async function getUserWithErrorHandling(userId) {
  try {
    // Validate input
    if (typeof userId !== 'number') {
      throw new ValidationError('User ID must be a number', {
        code: 'TYPE_ERROR',
        params: { userId, expectedType: 'number', actualType: typeof userId },
        severity: 'ERROR'
      });
    }
    
    // Use circuit breaker to protect against API failures
    return await apiCircuitBreaker.execute(
      async () => {
        // Use retry for transient failures
        return await retryOperation(
          async () => {
            // Use fallback chain for graceful degradation
            return await fallbackChain([
              // Primary operation
              async () => await fetchUserData(userId),
              
              // First fallback - try to get cached data
              async () => {
                console.log('Primary operation failed, trying cache...');
                // Simulate cache lookup
                if (userId % 2 === 0) {
                  return { 
                    id: userId, 
                    name: `Cached User ${userId}`, 
                    email: `user${userId}@example.com`,
                    fromCache: true
                  };
                }
                throw new Error('Cache miss');
              },
              
              // Second fallback - return default user
              async () => {
                console.log('Cache lookup failed, using default user...');
                return { 
                  id: 0, 
                  name: 'Default User', 
                  email: 'default@example.com',
                  isDefault: true
                };
              }
            ]);
          },
          {
            maxRetries: 3,
            initialDelayMs: 1000,
            backoffFactor: 2,
            retryCondition: (error) => !(error instanceof ValidationError)
          }
        );
      }
    );
  } catch (error) {
    console.error(`Error handling failed: ${error.message}`);
    return { id: -1, name: 'Error User', email: 'error@example.com', isError: true };
  }
}

// Example usage
async function runExample() {
  console.log('=== Error Handling System Example ===\n');
  
  // Try with valid user ID (may succeed or trigger recovery mechanisms)
  console.log('Attempting to fetch User 1:');
  const user1 = await getUserWithErrorHandling(1);
  console.log('Result:', user1);
  console.log('\n');
  
  // Try with invalid user ID (will trigger validation error)
  console.log('Attempting to fetch User -5 (invalid):');
  const user2 = await getUserWithErrorHandling(-5);
  console.log('Result:', user2);
  console.log('\n');
  
  // Try with non-numeric user ID (will trigger type validation)
  console.log('Attempting to fetch User "abc" (wrong type):');
  const user3 = await getUserWithErrorHandling('abc');
  console.log('Result:', user3);
  console.log('\n');
  
  // Demonstrate circuit breaker with forced consecutive failures
  console.log('=== CIRCUIT BREAKER DEMONSTRATION ===');
  console.log('Making requests with forced failures to trigger circuit breaker:');
  
  for (let i = 0; i < 10; i++) {
    console.log(`\nRequest ${i+1}:`);
    const user = await getUserWithErrorHandling(200 + i);
    console.log(`Result for User ${200 + i}:`, user);
    
    // Add a small delay between requests
    if (i < 9) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  // Wait for circuit breaker reset timeout
  console.log('\n=== WAITING FOR CIRCUIT BREAKER RESET ===');
  console.log('Waiting 5 seconds for circuit breaker to reset...');
  await new Promise(resolve => setTimeout(resolve, 5500));
  
  // Try again after reset
  console.log('\n=== AFTER CIRCUIT BREAKER RESET ===');
  console.log('Making requests after circuit breaker reset:');
  
  for (let i = 0; i < 3; i++) {
    console.log(`\nRequest ${i+1}:`);
    const user = await getUserWithErrorHandling(300 + i);
    console.log(`Result for User ${300 + i}:`, user);
    
    // Add a small delay between requests
    if (i < 2) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
}

// Run the example
runExample().catch(error => {
  console.error('Example failed:', error);
}); 