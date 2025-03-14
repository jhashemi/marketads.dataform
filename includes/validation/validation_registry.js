/**
 * Validation Registry for Record Matching System
 * 
 * Central registry that manages all validation tests, their dependencies,
 * and execution context. Provides a standardized interface for registering,
 * discovering, and executing validation tests.
 */

const fs = require('fs');
const path = require('path');
const errorHandler = require('./error_handler');
const configManager = require('./config_manager').defaultConfigManager;

/**
 * Test types enum
 * @readonly
 * @enum {string}
 */
const TestType = {
  UNIT: 'unit',
  INTEGRATION: 'integration',
  PERFORMANCE: 'performance',
  E2E: 'e2e'
};

/**
 * Test status enum
 * @readonly
 * @enum {string}
 */
const TestStatus = {
  PENDING: 'pending',
  RUNNING: 'running',
  PASSED: 'passed',
  FAILED: 'failed',
  SKIPPED: 'skipped',
  ERROR: 'error'
};

/**
 * Test priority enum
 * @readonly
 * @enum {number}
 */
const TestPriority = {
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3
};

/**
 * Test metadata interface
 * @typedef {Object} TestMetadata
 * @property {string} id - Unique test identifier
 * @property {string} type - Test type from TestType enum
 * @property {string} name - Human-readable test name
 * @property {string} description - Test description
 * @property {number} priority - Test priority from TestPriority enum
 * @property {Array<string>} tags - Test tags for filtering
 * @property {Array<string>} dependencies - Test dependencies (other test IDs)
 * @property {Object} parameters - Test parameters
 * @property {string} filePath - Path to test file
 * @property {Function} testFn - Test function
 */

/**
 * Test result interface
 * @typedef {Object} TestResult
 * @property {string} id - Test identifier
 * @property {string} name - Test name
 * @property {string} type - Test type
 * @property {string} status - Test status from TestStatus enum
 * @property {boolean} passed - Whether the test passed
 * @property {Error|null} error - Error if test failed
 * @property {Object|null} data - Test result data
 * @property {number} startTime - Test start timestamp
 * @property {number} endTime - Test end timestamp
 * @property {number} duration - Test duration in milliseconds
 * @property {Object} metrics - Test performance metrics
 */

/**
 * Validation Registry class
 */
class ValidationRegistry {
  /**
   * Create a new ValidationRegistry
   */
  constructor() {
    this.tests = new Map();
    this.testResults = new Map();
    this.testsInProgress = new Set();
    this.testOrder = [];
    this.initialized = false;
  }
  
  /**
   * Initialize the validation registry
   * @param {string|Array<string>} testDirectory - Directory or array of directories to scan for test files
   * @returns {Promise<boolean>} True if successful
   */
  async initialize(testDirectory = null) {
    try {
      if (testDirectory) {
        if (Array.isArray(testDirectory)) {
          // Handle array of directories
          for (const dir of testDirectory) {
            await this.scanTestFiles(dir);
          }
        } else {
          // Handle single directory
          await this.scanTestFiles(testDirectory);
        }
      }
      
      this.sortTestsByDependency();
      this.initialized = true;
      return true;
    } catch (error) {
      throw errorHandler.createValidationError(`Failed to initialize validation registry: ${error.message}`, error);
    }
  }
  
  /**
   * Register a test
   * @param {TestMetadata} metadata - Test metadata
   * @returns {string} Test ID
   */
  registerTest(metadata) {
    if (!metadata.id) {
      metadata.id = this._generateTestId(metadata.name);
    }
    
    if (this.tests.has(metadata.id)) {
      throw errorHandler.createValidationError(`Test ID already exists: ${metadata.id}`);
    }
    
    // Set defaults for optional fields
    metadata.priority = metadata.priority || TestPriority.MEDIUM;
    metadata.tags = metadata.tags || [];
    metadata.dependencies = metadata.dependencies || [];
    metadata.parameters = metadata.parameters || {};
    
    // Validate test function
    if (typeof metadata.testFn !== 'function') {
      throw errorHandler.createValidationError(`Test function is required for test: ${metadata.id}`);
    }
    
    this.tests.set(metadata.id, metadata);
    this.testOrder.push(metadata.id);
    
    return metadata.id;
  }
  
  /**
   * Unregister a test
   * @param {string} testId - Test ID
   * @returns {boolean} True if test was unregistered
   */
  unregisterTest(testId) {
    const wasDeleted = this.tests.delete(testId);
    
    if (wasDeleted) {
      this.testResults.delete(testId);
      this.testOrder = this.testOrder.filter(id => id !== testId);
    }
    
    return wasDeleted;
  }
  
  /**
   * Get test by ID
   * @param {string} testId - Test ID
   * @returns {TestMetadata|null} Test metadata or null if not found
   */
  getTest(testId) {
    return this.tests.get(testId) || null;
  }
  
  /**
   * Get all tests
   * @param {Object} filters - Test filters
   * @param {string} filters.type - Filter by test type
   * @param {Array<string>} filters.tags - Filter by tags
   * @param {number} filters.priority - Filter by priority
   * @returns {Array<TestMetadata>} Array of test metadata
   */
  getAllTests(filters = {}) {
    let tests = Array.from(this.tests.values());
    
    // Apply filters
    if (filters.type) {
      tests = tests.filter(test => test.type === filters.type);
    }
    
    if (filters.tags && filters.tags.length > 0) {
      tests = tests.filter(test => filters.tags.some(tag => test.tags.includes(tag)));
    }
    
    if (filters.priority) {
      tests = tests.filter(test => test.priority === filters.priority);
    }
    
    return tests;
  }
  
  /**
   * Get test result by ID
   * @param {string} testId - Test ID
   * @returns {TestResult|null} Test result or null if not found
   */
  getTestResult(testId) {
    return this.testResults.get(testId) || null;
  }
  
  /**
   * Get all test results
   * @param {Object} filters - Result filters
   * @param {string} filters.status - Filter by test status
   * @param {boolean} filters.passed - Filter by passed status
   * @returns {Array<TestResult>} Array of test results
   */
  getAllTestResults(filters = {}) {
    let results = Array.from(this.testResults.values());
    
    // Apply filters
    if (filters.status) {
      results = results.filter(result => result.status === filters.status);
    }
    
    if (filters.passed !== undefined) {
      results = results.filter(result => result.passed === filters.passed);
    }
    
    return results;
  }
  
  /**
   * Get test summary
   * @returns {Object} Test summary
   */
  getTestSummary() {
    const results = this.getAllTestResults();
    
    const summary = {
      total: this.tests.size,
      executed: results.length,
      passed: results.filter(result => result.passed).length,
      failed: results.filter(result => !result.passed).length,
      pending: this.tests.size - results.length,
      duration: results.reduce((total, result) => total + result.duration, 0),
      coverage: this._calculateCoverage(results),
      byType: {}
    };
    
    // Calculate by type
    Object.values(TestType).forEach(type => {
      const typeTests = this.getAllTests({ type });
      const typeResults = results.filter(result => {
        const test = this.getTest(result.id);
        return test && test.type === type;
      });
      
      summary.byType[type] = {
        total: typeTests.length,
        executed: typeResults.length,
        passed: typeResults.filter(result => result.passed).length,
        failed: typeResults.filter(result => !result.passed).length
      };
    });
    
    return summary;
  }
  
  /**
   * Run tests
   * @param {Object} options - Run options
   * @param {Array<string>} options.testIds - Test IDs to run (all if not specified)
   * @param {Object} options.filters - Test filters
   * @param {boolean} options.parallelExecution - Whether to run tests in parallel
   * @param {number} options.maxParallel - Maximum number of parallel tests
   * @param {Object} options.context - Test execution context
   * @returns {Promise<Array<TestResult>>} Test results
   */
  async runTests(options = {}) {
    if (!this.initialized) {
      throw errorHandler.createValidationError('Validation registry not initialized');
    }
    
    const parallelExecution = options.parallelExecution ?? configManager.get('testExecution.parallel', true);
    const maxParallel = options.maxParallel ?? configManager.get('testExecution.maxParallelTests', 5);
    
    // Get tests to run
    let testsToRun = [];
    
    if (options.testIds && options.testIds.length > 0) {
      testsToRun = options.testIds
        .map(id => this.getTest(id))
        .filter(test => test !== null);
    } else {
      testsToRun = this.getAllTests(options.filters || {});
    }
    
    // Sort tests by dependency order
    testsToRun = this._sortTestsByDependency(testsToRun.map(test => test.id))
      .map(id => this.getTest(id))
      .filter(test => test !== null);
    
    if (testsToRun.length === 0) {
      return [];
    }
    
    // Clear results for tests that will be run
    testsToRun.forEach(test => {
      this.testResults.delete(test.id);
    });
    
    // Run tests
    if (parallelExecution) {
      return await this._runTestsInParallel(testsToRun, maxParallel, options.context);
    } else {
      return await this._runTestsSequentially(testsToRun, options.context);
    }
  }
  
  /**
   * Run a single test
   * @param {string} testId - Test ID
   * @param {Object} context - Test execution context
   * @returns {Promise<TestResult>} Test result
   */
  async runTest(testId, context = {}) {
    const test = this.getTest(testId);
    
    if (!test) {
      throw errorHandler.createValidationError(`Test not found: ${testId}`);
    }
    
    // Check if test is already running
    if (this.testsInProgress.has(testId)) {
      throw errorHandler.createValidationError(`Test is already running: ${testId}`);
    }
    
    // Create initial result
    const result = {
      id: test.id,
      name: test.name,
      type: test.type,
      status: TestStatus.PENDING,
      passed: false,
      error: null,
      data: null,
      startTime: Date.now(),
      endTime: 0,
      duration: 0,
      metrics: {}
    };
    
    this.testResults.set(test.id, result);
    this.testsInProgress.add(test.id);
    
    try {
      // Update status
      result.status = TestStatus.RUNNING;
      this.testResults.set(test.id, result);
      
      // Check dependencies
      const dependencyResults = await this._checkDependencies(test);
      
      if (!dependencyResults.passed) {
        result.status = TestStatus.SKIPPED;
        result.error = new Error(`Test dependencies failed: ${dependencyResults.failedDependencies.join(', ')}`);
        result.endTime = Date.now();
        result.duration = result.endTime - result.startTime;
        this.testResults.set(test.id, result);
        return result;
      }
      
      // Run test
      result.data = await test.testFn(context);
      result.passed = true;
      result.status = TestStatus.PASSED;
    } catch (error) {
      result.error = error;
      result.passed = false;
      result.status = TestStatus.FAILED;
      
      // Log error
      errorHandler.logError(error, {
        component: 'ValidationRegistry',
        method: 'runTest',
        testId: test.id,
        testName: test.name
      });
    } finally {
      result.endTime = Date.now();
      result.duration = result.endTime - result.startTime;
      this.testResults.set(test.id, result);
      this.testsInProgress.delete(test.id);
    }
    
    return result;
  }
  
  /**
   * Scan directory for test files and register tests
   * @param {string} testDirectory - Directory to scan
   * @returns {Promise<Array<string>>} Registered test IDs
   */
  async scanTestFiles(testDirectory) {
    try {
      console.log(`Scanning for test files in directory: ${testDirectory}`);
      const testFiles = this._findJsFiles(testDirectory);
      console.log(`Found ${testFiles.length} test files.`);
      
      const registeredTests = [];
      
      for (const filePath of testFiles) {
        try {
          // Clear require cache to ensure fresh load
          delete require.cache[require.resolve(filePath)];
          
          // Load test file
          console.log(`Loading test file: ${filePath}`);
          const testModule = require(filePath);
          
          // Register tests
          if (Array.isArray(testModule.tests)) {
            for (const testMetadata of testModule.tests) {
              // Add file path to metadata
              testMetadata.filePath = filePath;
              
              // Register test
              const testId = this.registerTest(testMetadata);
              registeredTests.push(testId);
            }
          } else if (typeof testModule.register === 'function') {
            // Call register function with registry
            const testIds = await testModule.register(this);
            
            if (Array.isArray(testIds)) {
              registeredTests.push(...testIds);
            }
          } else {
            console.log(`No tests found in file: ${filePath}`);
          }
        } catch (error) {
          console.error(`Error loading test file: ${filePath}`);
          console.error(error);
          errorHandler.logError(error, {
            component: 'ValidationRegistry',
            method: 'scanTestFiles',
            filePath
          });
        }
      }
      
      console.log(`Registered ${registeredTests.length} tests.`);
      return registeredTests;
    } catch (error) {
      throw errorHandler.createIOError(`Failed to scan test files: ${error.message}`, error);
    }
  }
  
  /**
   * Sort tests by dependency
   * @returns {Array<string>} Sorted test IDs
   */
  sortTestsByDependency() {
    const testIds = Array.from(this.tests.keys());
    this.testOrder = this._sortTestsByDependency(testIds);
    return this.testOrder;
  }
  
  /**
   * Generate test ID from name
   * @private
   * @param {string} name - Test name
   * @returns {string} Generated test ID
   */
  _generateTestId(name) {
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
    
    // Ensure uniqueness
    let id = base;
    let counter = 1;
    
    while (this.tests.has(id)) {
      id = `${base}_${counter}`;
      counter++;
    }
    
    return id;
  }
  
  /**
   * Find all JavaScript files in a directory recursively
   * @private
   * @param {string} directory - Directory to scan
   * @returns {Array<string>} List of JavaScript file paths
   */
  _findJsFiles(directory) {
    let results = [];
    
    // Ensure we have an absolute path
    const absoluteDir = path.isAbsolute(directory) ? directory : path.resolve(process.cwd(), directory);
    
    function traverseDir(dir) {
      if (!fs.existsSync(dir)) {
        console.warn(`Warning: Directory does not exist: ${dir}`);
        return;
      }
      
      const files = fs.readdirSync(dir);
      
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          traverseDir(fullPath);
        } else if (file.endsWith('.js') || file.endsWith('.ts')) {
          results.push(path.resolve(fullPath)); // Use absolute path
        }
      }
    }
    
    traverseDir(absoluteDir);
    return results;
  }
  
  /**
   * Run tests sequentially
   * @private
   * @param {Array<TestMetadata>} tests - Tests to run
   * @param {Object} context - Test execution context
   * @returns {Promise<Array<TestResult>>} Test results
   */
  async _runTestsSequentially(tests, context = {}) {
    const results = [];
    
    for (const test of tests) {
      const result = await this.runTest(test.id, context);
      results.push(result);
    }
    
    return results;
  }
  
  /**
   * Run tests in parallel
   * @private
   * @param {Array<TestMetadata>} tests - Tests to run
   * @param {number} maxParallel - Maximum number of parallel tests
   * @param {Object} context - Test execution context
   * @returns {Promise<Array<TestResult>>} Test results
   */
  async _runTestsInParallel(tests, maxParallel, context = {}) {
    const results = [];
    const testGroups = this._createTestGroups(tests, maxParallel);
    
    for (const group of testGroups) {
      const groupResults = await Promise.all(
        group.map(test => this.runTest(test.id, context))
      );
      
      results.push(...groupResults);
    }
    
    return results;
  }
  
  /**
   * Create test groups for parallel execution
   * @private
   * @param {Array<TestMetadata>} tests - Tests to group
   * @param {number} maxParallel - Maximum number of parallel tests
   * @returns {Array<Array<TestMetadata>>} Test groups
   */
  _createTestGroups(tests, maxParallel) {
    const groups = [];
    const dependencyMap = new Map();
    
    // Create dependency map
    tests.forEach(test => {
      dependencyMap.set(test.id, test.dependencies);
    });
    
    // Helper function to check if a test can be added to a group
    function canAddToGroup(test, group) {
      // Check if any test in the group depends on this test or vice versa
      return !group.some(groupTest => {
        const testDeps = dependencyMap.get(test.id) || [];
        const groupTestDeps = dependencyMap.get(groupTest.id) || [];
        
        return testDeps.includes(groupTest.id) || groupTestDeps.includes(test.id);
      });
    }
    
    // Create groups
    let remainingTests = [...tests];
    
    while (remainingTests.length > 0) {
      const group = [];
      
      for (let i = 0; i < remainingTests.length; i++) {
        const test = remainingTests[i];
        
        if (group.length < maxParallel && canAddToGroup(test, group)) {
          group.push(test);
          remainingTests.splice(i, 1);
          i--;
        }
      }
      
      if (group.length === 0) {
        // If no tests could be added to the group, there's a circular dependency
        // Just add the first test to break the cycle
        group.push(remainingTests[0]);
        remainingTests.splice(0, 1);
      }
      
      groups.push(group);
    }
    
    return groups;
  }
  
  /**
   * Sort test IDs by dependency
   * @private
   * @param {Array<string>} testIds - Test IDs to sort
   * @returns {Array<string>} Sorted test IDs
   */
  _sortTestsByDependency(testIds) {
    const visited = new Set();
    const sorted = [];
    
    // Helper function for topological sort
    const visit = (id) => {
      if (visited.has(id)) return;
      
      visited.add(id);
      
      const test = this.getTest(id);
      if (!test) return;
      
      // Visit dependencies first
      test.dependencies.forEach(depId => {
        if (testIds.includes(depId)) {
          visit(depId);
        }
      });
      
      sorted.push(id);
    };
    
    // Sort tests
    testIds.forEach(id => {
      visit(id);
    });
    
    return sorted;
  }
  
  /**
   * Check test dependencies
   * @private
   * @param {TestMetadata} test - Test to check
   * @returns {Promise<Object>} Dependency check result
   */
  async _checkDependencies(test) {
    const result = {
      passed: true,
      failedDependencies: []
    };
    
    // No dependencies, automatically pass
    if (!test.dependencies || test.dependencies.length === 0) {
      return result;
    }
    
    // Check each dependency
    for (const depId of test.dependencies) {
      const depTest = this.getTest(depId);
      
      if (!depTest) {
        result.passed = false;
        result.failedDependencies.push(`${depId} (not found)`);
        continue;
      }
      
      const depResult = this.getTestResult(depId);
      
      // If dependency hasn't been run yet, run it
      if (!depResult) {
        const newDepResult = await this.runTest(depId);
        
        if (!newDepResult.passed) {
          result.passed = false;
          result.failedDependencies.push(depId);
        }
      } else if (!depResult.passed) {
        result.passed = false;
        result.failedDependencies.push(depId);
      }
    }
    
    return result;
  }
  
  /**
   * Calculate test coverage
   * @private
   * @param {Array<TestResult>} results - Test results
   * @returns {Object} Coverage metrics
   */
  _calculateCoverage(results) {
    // For now, a simple coverage calculation
    // In a real system, this would use code coverage tools
    
    const coverage = {
      percentage: 0,
      covered: 0,
      total: 0,
      byType: {}
    };
    
    // Count total tests and passed tests
    Object.values(TestType).forEach(type => {
      const typeTests = this.getAllTests({ type });
      const executedTests = results.filter(result => {
        const test = this.getTest(result.id);
        return test && test.type === type;
      });
      
      coverage.byType[type] = {
        percentage: typeTests.length ? Math.round((executedTests.length / typeTests.length) * 100) : 0,
        covered: executedTests.length,
        total: typeTests.length
      };
      
      coverage.covered += executedTests.length;
      coverage.total += typeTests.length;
    });
    
    coverage.percentage = coverage.total ? Math.round((coverage.covered / coverage.total) * 100) : 0;
    
    return coverage;
  }
}

// Create registry instance
const validationRegistry = new ValidationRegistry();

module.exports = {
  TestType,
  TestStatus,
  TestPriority,
  ValidationRegistry,
  validationRegistry
}; 