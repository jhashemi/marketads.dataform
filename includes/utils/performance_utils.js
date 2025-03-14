/**
 * Performance Utilities
 * 
 * Provides utility functions for measuring performance and tracking resources.
 */

/**
 * Gets the current time in milliseconds since epoch
 * @returns {number} Current time in milliseconds
 */
function getCurrentTimeMs() {
  return performance.now();
}

/**
 * Measures the execution time of a function
 * @param {Function} fn - Function to measure execution time for
 * @returns {number} Execution time in milliseconds
 */
function measureExecutionTime(fn) {
  const startTime = getCurrentTimeMs();
  fn();
  const endTime = getCurrentTimeMs();
  return endTime - startTime;
}

/**
 * Gets the current memory usage in bytes
 * @returns {number} Memory usage in bytes
 */
function getCurrentMemoryUsage() {
  // Detect environment and use the appropriate API
  if (typeof process !== 'undefined' && process.memoryUsage) {
    try {
      // Node.js environment
      const memUsage = process.memoryUsage();
      return memUsage.heapUsed;
    } catch (e) {
      console.warn(`Error getting Node.js memory usage: ${e.message}`);
    }
  } else if (typeof performance !== 'undefined' && performance.memory) {
    try {
      // Chrome browser environment
      return performance.memory.usedJSHeapSize;
    } catch (e) {
      console.warn(`Error getting browser memory usage: ${e.message}`);
    }
  }
  
  // Fallback if neither method works
  console.warn('Memory usage detection not available in this environment.');
  return 0;
}

/**
 * Measures the execution time of an async function
 * @param {Function} asyncFn - Async function to measure execution time for
 * @returns {Promise<number>} Promise resolving to execution time in milliseconds
 */
async function measureAsyncExecutionTime(asyncFn) {
  const startTime = getCurrentTimeMs();
  await asyncFn();
  const endTime = getCurrentTimeMs();
  return endTime - startTime;
}

/**
 * Tracks comprehensive performance metrics for a function
 * @param {Function} fn - Function to track
 * @param {Object} options - Configuration options
 * @param {boolean} options.trackMemory - Whether to track memory usage (default: true)
 * @param {boolean} options.trackCPU - Whether to track CPU usage if available (default: true)
 * @param {boolean} options.isAsync - Whether the function is async (default: false)
 * @returns {Promise<Object>|Object} Performance metrics
 */
async function trackPerformance(fn, options = {}) {
  const defaultOptions = {
    trackMemory: true,
    trackCPU: true,
    isAsync: false,
    label: 'Function',
  };
  
  const config = { ...defaultOptions, ...options };
  const metrics = {
    startTime: Date.now(),
    startMemory: config.trackMemory ? getCurrentMemoryUsage() : null,
  };
  
  let result;
  let executionTime;
  
  if (config.isAsync) {
    executionTime = await measureAsyncExecutionTime(async () => {
      result = await fn();
    });
  } else {
    executionTime = measureExecutionTime(() => {
      result = fn();
    });
  }
  
  metrics.endTime = Date.now();
  metrics.endMemory = config.trackMemory ? getCurrentMemoryUsage() : null;
  metrics.executionTime = executionTime;
  metrics.memoryUsed = config.trackMemory ? (metrics.endMemory - metrics.startMemory) : null;
  
  // Log performance metrics
  console.log(`Performance [${config.label}]: ${executionTime.toFixed(2)}ms | Memory: ${
    config.trackMemory
      ? `${(metrics.memoryUsed / (1024 * 1024)).toFixed(2)}MB`
      : 'Not tracked'
  }`);
  
  return {
    result,
    metrics,
  };
}

/**
 * Executes a matching operation with timing and resource usage tracking
 * @param {Object} options - Matching options
 * @returns {Promise<Object>} Results with performance metrics
 */
async function executeMatchingWithTiming(options = {}) {
  const startTime = getCurrentTimeMs();
  const startMemory = getCurrentMemoryUsage();
  
  // Simulate CPU monitoring (would use a real library in production)
  const cpuUsageSamples = [];
  let cpuMonitorInterval;
  
  try {
    // Start CPU monitoring
    if (typeof process !== 'undefined' && process.cpuUsage) {
      cpuMonitorInterval = setInterval(() => {
        try {
          const usage = process.cpuUsage();
          cpuUsageSamples.push((usage.user + usage.system) / 1000000); // Convert to seconds
        } catch (e) {
          // Ignore errors in CPU monitoring
        }
      }, 100);
    }
    
    // Execute matching operation (this is a simulation)
    console.log(`Executing matching with strategy: ${options.strategy}`);
    
    // Simulate matching execution
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
    
    const endMemory = getCurrentMemoryUsage();
    const endTime = getCurrentTimeMs();
    
    // Calculate metrics
    const executionTime = endTime - startTime;
    const memoryUsage = endMemory - startMemory;
    const avgCpuUtilization = cpuUsageSamples.length
      ? cpuUsageSamples.reduce((sum, val) => sum + val, 0) / cpuUsageSamples.length
      : null;
    
    // Return simulated results and actual performance metrics
    return {
      matchedRecords: Math.floor(50000 * Math.random() * 0.8),
      matchQuality: 0.7 + Math.random() * 0.3,
      executionTime,
      memoryUsage,
      cpuUtilization: avgCpuUtilization,
      bytesProcessed: Math.floor(1000000 + Math.random() * 5000000),
      slotMs: Math.floor(executionTime * (1 + Math.random())),
    };
  } finally {
    // Clean up CPU monitoring
    if (cpuMonitorInterval) {
      clearInterval(cpuMonitorInterval);
    }
  }
}

/**
 * Executes blocking key generation with timing and resource usage tracking
 * @param {Object} options - Blocking key generation options
 * @returns {Promise<Object>} Results with performance metrics
 */
async function executeBlockingKeyGenerationWithTiming(options = {}) {
  const startTime = getCurrentTimeMs();
  const startMemory = getCurrentMemoryUsage();
  
  try {
    // Execute blocking key generation (this is a simulation)
    console.log(`Executing blocking key generation with method: ${options.method}`);
    
    // Simulate blocking key generation
    await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 700));
    
    const endMemory = getCurrentMemoryUsage();
    const endTime = getCurrentTimeMs();
    
    // Calculate metrics
    const executionTime = endTime - startTime;
    const memoryUsage = endMemory - startMemory;
    
    // Generate simulated results
    const avgBlockSize = Math.floor(10 + Math.random() * 90);
    const blockCount = Math.floor(options.recordCount / avgBlockSize);
    
    return {
      executionTime,
      memoryUsage,
      avgBlockSize,
      blockCount,
      recordsPerSecond: options.recordCount / (executionTime / 1000),
    };
  } catch (error) {
    console.error(`Error executing blocking key generation: ${error.message}`);
    throw error;
  }
}

module.exports = {
  getCurrentTimeMs,
  measureExecutionTime,
  getCurrentMemoryUsage,
  measureAsyncExecutionTime,
  trackPerformance,
  executeMatchingWithTiming,
  executeBlockingKeyGenerationWithTiming,
};
