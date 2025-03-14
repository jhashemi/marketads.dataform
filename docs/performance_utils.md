# Performance Utilities

This document provides a comprehensive guide to using the Performance Utilities in the MarketAds Dataform project.

## Overview

The Performance Utilities module provides tools for measuring and monitoring performance metrics in JavaScript applications. It helps identify bottlenecks, track memory usage, measure execution time, and monitor CPU utilization during function execution.

## Key Features

- Memory usage tracking
- Execution time measurement (sync and async)
- CPU utilization monitoring
- Performance reporting with labels
- Support for complex workflows

## Installation

The Performance Utilities are available in the `includes/utils/performance_utils.js` file and can be imported into any JavaScript module as needed:

```javascript
const performanceUtils = require('../../includes/utils/performance_utils.js');
```

## Basic Usage

### Measuring Execution Time

```javascript
const { measureExecutionTime } = require('../../includes/utils/performance_utils.js');

// For synchronous functions
const result = measureExecutionTime(() => {
  // Your code here
  return someValue;
}, 'Operation Label');

console.log(`Operation took ${result.executionTime}ms to complete`);
console.log(`Result:`, result.value);

// For asynchronous functions
const asyncResult = await measureAsyncExecutionTime(async () => {
  // Your async code here
  return await someAsyncOperation();
}, 'Async Operation Label');

console.log(`Async operation took ${asyncResult.executionTime}ms to complete`);
console.log(`Result:`, asyncResult.value);
```

### Tracking Memory Usage

```javascript
const { getCurrentMemoryUsage, trackMemoryUsage } = require('../../includes/utils/performance_utils.js');

// Get current memory usage
const memUsage = getCurrentMemoryUsage();
console.log(`Current memory usage: ${memUsage.heapUsed} bytes`);

// Track memory usage during function execution
const memoryResult = trackMemoryUsage(() => {
  // Code that might use significant memory
  const largeArray = new Array(1000000).fill(0);
  return processArray(largeArray);
}, 'Memory Intensive Operation');

console.log(`Memory difference: ${memoryResult.memoryDifference} bytes`);
console.log(`Result:`, memoryResult.value);
```

### Tracking CPU Utilization

```javascript
const { trackCpuUtilization } = require('../../includes/utils/performance_utils.js');

// Track CPU usage during function execution
const cpuResult = trackCpuUtilization(() => {
  // CPU intensive operation
  return computeHeavyCalculation();
}, 'CPU Intensive Operation');

console.log(`Average CPU usage: ${cpuResult.cpuUsage.average}%`);
console.log(`Peak CPU usage: ${cpuResult.cpuUsage.peak}%`);
console.log(`Execution time: ${cpuResult.executionTime}ms`);
console.log(`Result:`, cpuResult.value);

// For async functions
const asyncCpuResult = await trackCpuUtilization(async () => {
  // Async CPU intensive operation
  return await asyncComputeHeavyCalculation();
}, 'Async CPU Intensive Operation');

console.log(`Average CPU usage: ${asyncCpuResult.cpuUsage.average}%`);
console.log(`Peak CPU usage: ${asyncCpuResult.cpuUsage.peak}%`);
console.log(`Execution time: ${asyncCpuResult.executionTime}ms`);
console.log(`Result:`, asyncCpuResult.value);
```

## Complex Workflow Example

For more complex scenarios, you can combine different utilities:

```javascript
const { 
  measureExecutionTime, 
  trackMemoryUsage, 
  trackCpuUtilization 
} = require('../../includes/utils/performance_utils.js');

// Complex workflow with performance tracking
async function processLargeDataset(data) {
  console.log('Starting data processing workflow...');
  
  // Step 1: Data preprocessing (memory intensive)
  const preprocessResult = trackMemoryUsage(() => {
    return preprocessData(data);
  }, 'Data Preprocessing');
  
  console.log(`Preprocessing complete. Memory used: ${preprocessResult.memoryDifference} bytes`);
  
  // Step 2: Complex calculation (CPU intensive)
  const calculationResult = await trackCpuUtilization(async () => {
    return await performCalculations(preprocessResult.value);
  }, 'Complex Calculations');
  
  console.log(`Calculations complete. Avg CPU: ${calculationResult.cpuUsage.average}%, Peak: ${calculationResult.cpuUsage.peak}%`);
  
  // Step 3: Final formatting (time sensitive)
  const formattingResult = measureExecutionTime(() => {
    return formatResults(calculationResult.value);
  }, 'Result Formatting');
  
  console.log(`Formatting complete. Time taken: ${formattingResult.executionTime}ms`);
  
  return formattingResult.value;
}
```

## API Reference

### Memory Functions

#### `getCurrentMemoryUsage()`

Returns an object containing the current memory usage statistics.

**Returns:**
- `Object`: Memory usage information from Node.js `process.memoryUsage()`
  - `rss`: Resident Set Size - total memory allocated for the process execution
  - `heapTotal`: Total size of allocated heap
  - `heapUsed`: Actual memory used during execution
  - `external`: Memory used by C++ objects bound to JavaScript objects
  - `arrayBuffers`: Memory allocated for ArrayBuffers and SharedArrayBuffers

#### `trackMemoryUsage(fn, label)`

Executes a function and tracks memory usage before and after execution.

**Parameters:**
- `fn` (Function): The function to execute and track
- `label` (String, optional): A label for logging purposes

**Returns:**
- `Object`: Result object containing:
  - `value`: The return value from the executed function
  - `initialMemory`: Memory usage before execution
  - `finalMemory`: Memory usage after execution
  - `memoryDifference`: The difference in bytes between initial and final heap usage
  - `label`: The provided label or a default label

### Timing Functions

#### `measureExecutionTime(fn, label)`

Measures the execution time of a synchronous function.

**Parameters:**
- `fn` (Function): The synchronous function to execute and time
- `label` (String, optional): A label for logging purposes

**Returns:**
- `Object`: Result object containing:
  - `value`: The return value from the executed function
  - `executionTime`: The time taken to execute the function in milliseconds
  - `label`: The provided label or a default label

#### `measureAsyncExecutionTime(asyncFn, label)`

Measures the execution time of an asynchronous function.

**Parameters:**
- `asyncFn` (AsyncFunction): The asynchronous function to execute and time
- `label` (String, optional): A label for logging purposes

**Returns:**
- `Promise<Object>`: Promise resolving to a result object containing:
  - `value`: The resolved value from the executed async function
  - `executionTime`: The time taken to execute the function in milliseconds
  - `label`: The provided label or a default label

### CPU Functions

#### `trackCpuUtilization(fn, label)`

Tracks CPU utilization during the execution of a function.

**Parameters:**
- `fn` (Function|AsyncFunction): The function to execute and track
- `label` (String, optional): A label for logging purposes

**Returns:**
- `Object` or `Promise<Object>`: Result object containing:
  - `value`: The return value from the executed function
  - `executionTime`: The time taken to execute the function in milliseconds
  - `cpuUsage`: Object containing CPU usage statistics
    - `average`: Average CPU utilization as a percentage
    - `peak`: Peak CPU utilization as a percentage
  - `label`: The provided label or a default label

## Best Practices

1. **Use meaningful labels**: Always provide descriptive labels to make performance logs easier to interpret.

2. **Focus on critical paths**: Apply performance monitoring to the most critical or resource-intensive parts of your application.

3. **Establish baselines**: Run performance tests regularly to establish baselines and identify regressions.

4. **Consider environment factors**: CPU and memory measurements can vary based on system load and available resources.

5. **Log consistently**: Implement consistent logging of performance metrics across your application.

## Troubleshooting

### High Memory Usage

If you observe unexpectedly high memory usage:

- Check for memory leaks by tracking memory usage across multiple function calls
- Verify that large objects are properly garbage collected
- Consider implementing pagination or streaming for large datasets

### CPU Spikes

If you observe CPU spikes:

- Break down complex operations into smaller, more manageable chunks
- Consider implementing worker threads for CPU-intensive tasks
- Review algorithms for optimization opportunities

## Further Reading

- [Node.js Performance Documentation](https://nodejs.org/api/perf_hooks.html)
- [JavaScript Memory Management](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Memory_Management)
- [CPU Profiling in Node.js](https://nodejs.org/en/docs/guides/simple-profiling)

## Contributing

When extending the Performance Utilities, please follow these guidelines:

1. Maintain backward compatibility
2. Add comprehensive tests for new features
3. Update this documentation with examples
4. Follow the established naming conventions 