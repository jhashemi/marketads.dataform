/**
 * Report Generator for Record Matching System
 * 
 * Generates comprehensive test reports in various formats (HTML, JSON, console)
 * to present test results, metrics, and coverage information.
 */

const fs = require('fs');
const path = require('path');
const errorHandler = require('./error_handler');
const { TestStatus, TestType } = require('./validation_registry');

/**
 * Report format enum
 * @readonly
 * @enum {string}
 */
const ReportFormat = {
  HTML: 'html',
  JSON: 'json',
  CONSOLE: 'console'
};

/**
 * Report Generator class
 */
class ReportGenerator {
  /**
   * Create a new ReportGenerator
   * @param {Object} options - Generator options
   * @param {string} options.outputDir - Output directory for reports
   */
  constructor(options = {}) {
    this.outputDir = options.outputDir || './test_reports';
    
    // Create output directory if it doesn't exist
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }
  
  /**
   * Generate a report for test results
   * @param {Array<Object>} testResults - Test results
   * @param {Object} summary - Test summary
   * @param {ReportFormat} format - Report format
   * @param {string} filename - Output filename (without extension)
   * @returns {string} Path to the generated report
   */
  generateReport(testResults, summary, format = ReportFormat.HTML, filename = 'test_report') {
    try {
      switch (format) {
        case ReportFormat.HTML:
          return this.generateHtmlReport(testResults, summary, filename);
        case ReportFormat.JSON:
          return this.generateJsonReport(testResults, summary, filename);
        case ReportFormat.CONSOLE:
          return this.generateConsoleReport(testResults, summary);
        default:
          throw errorHandler.createValidationError(`Unsupported report format: ${format}`);
      }
    } catch (error) {
      throw errorHandler.createIOError(`Failed to generate ${format} report: ${error.message}`, error);
    }
  }
  
  /**
   * Generate HTML report
   * @param {Array<Object>} testResults - Test results
   * @param {Object} summary - Test summary
   * @param {string} filename - Output filename (without extension)
   * @returns {string} Path to the generated report
   */
  generateHtmlReport(testResults, summary, filename = 'test_report') {
    const filePath = path.join(this.outputDir, `${filename}.html`);
    
    let html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Record Matching System - Test Report</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
          }
          h1, h2, h3 {
            color: #2c3e50;
          }
          .summary {
            background-color: #f8f9fa;
            border-radius: 5px;
            padding: 20px;
            margin-bottom: 30px;
            display: flex;
            flex-wrap: wrap;
            gap: 20px;
          }
          .summary-item {
            flex: 1;
            min-width: 150px;
          }
          .summary-title {
            font-size: 0.9em;
            color: #6c757d;
            margin-bottom: 5px;
          }
          .summary-value {
            font-size: 1.8em;
            font-weight: bold;
          }
          .success { color: #28a745; }
          .danger { color: #dc3545; }
          .warning { color: #ffc107; }
          .info { color: #17a2b8; }
          
          .test-section {
            margin-bottom: 30px;
          }
          .test-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          .test-table th, .test-table td {
            border: 1px solid #dee2e6;
            padding: 10px;
            text-align: left;
          }
          .test-table th {
            background-color: #f8f9fa;
          }
          .test-row:hover {
            background-color: #f8f9fa;
          }
          .test-status {
            font-weight: bold;
            border-radius: 4px;
            padding: 3px 8px;
            font-size: 0.8em;
            display: inline-block;
            min-width: 80px;
            text-align: center;
          }
          .status-passed { background-color: #d4edda; color: #155724; }
          .status-failed { background-color: #f8d7da; color: #721c24; }
          .status-skipped { background-color: #fff3cd; color: #856404; }
          .status-error { background-color: #f8d7da; color: #721c24; }
          
          .test-details {
            display: none;
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            margin-top: 10px;
            font-family: monospace;
            white-space: pre-wrap;
          }
          .show-details {
            background-color: #f8f9fa;
            border: 1px solid #ddd;
            border-radius: 4px;
            padding: 4px 8px;
            font-size: 0.8em;
            cursor: pointer;
          }
          .show-details:hover {
            background-color: #e9ecef;
          }
          
          .chart-container {
            display: flex;
            flex-wrap: wrap;
            gap: 20px;
            margin-bottom: 30px;
          }
          .chart {
            flex: 1;
            min-width: 300px;
            height: 300px;
            background-color: #f8f9fa;
            border-radius: 5px;
            padding: 20px;
          }
          
          footer {
            margin-top: 50px;
            border-top: 1px solid #eee;
            padding-top: 20px;
            font-size: 0.8em;
            color: #6c757d;
          }
        </style>
      </head>
      <body>
        <h1>Record Matching System - Test Report</h1>
        <p>Generated on ${new Date().toLocaleString()}</p>
        
        <div class="summary">
          <div class="summary-item">
            <div class="summary-title">Total Tests</div>
            <div class="summary-value">${summary.total}</div>
          </div>
          <div class="summary-item">
            <div class="summary-title">Passed</div>
            <div class="summary-value success">${summary.passed}</div>
          </div>
          <div class="summary-item">
            <div class="summary-title">Failed</div>
            <div class="summary-value danger">${summary.failed}</div>
          </div>
          <div class="summary-item">
            <div class="summary-title">Test Coverage</div>
            <div class="summary-value ${summary.coverage.percentage > 75 ? 'success' : summary.coverage.percentage > 50 ? 'warning' : 'danger'}">${summary.coverage.percentage}%</div>
          </div>
          <div class="summary-item">
            <div class="summary-title">Execution Time</div>
            <div class="summary-value info">${(summary.duration / 1000).toFixed(2)}s</div>
          </div>
        </div>
        
        <div class="chart-container">
          <div class="chart" id="resultChart">
            <h3>Test Results</h3>
            <canvas id="resultPieChart"></canvas>
          </div>
          <div class="chart" id="coverageChart">
            <h3>Test Coverage</h3>
            <canvas id="coverageBarChart"></canvas>
          </div>
        </div>
    `;
    
    // Group tests by type
    const testsByType = {};
    Object.values(TestType).forEach(type => {
      testsByType[type] = testResults.filter(result => {
        return result.type === type;
      });
    });
    
    // Add test sections
    Object.entries(testsByType).forEach(([type, results]) => {
      if (results.length === 0) return;
      
      const typeName = type.charAt(0).toUpperCase() + type.slice(1);
      
      html += `
        <div class="test-section">
          <h2>${typeName} Tests</h2>
          <table class="test-table">
            <thead>
              <tr>
                <th>Test Name</th>
                <th>Status</th>
                <th>Duration</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
      `;
      
      results.forEach((result, index) => {
        const statusClass = `status-${result.status.toLowerCase()}`;
        
        html += `
          <tr class="test-row" data-test-id="${result.id}">
            <td>${result.name}</td>
            <td><span class="test-status ${statusClass}">${result.status}</span></td>
            <td>${(result.duration / 1000).toFixed(2)}s</td>
            <td>
              <button class="show-details" onclick="toggleDetails('${result.id}')">Show Details</button>
            </td>
          </tr>
          <tr>
            <td colspan="4">
              <div id="details-${result.id}" class="test-details">
                ${result.error ? `<strong>Error:</strong> ${result.error.message}\n\n${result.error.stack || ''}` : ''}
                ${result.data ? `<strong>Data:</strong>\n${JSON.stringify(result.data, null, 2)}` : ''}
              </div>
            </td>
          </tr>
        `;
      });
      
      html += `
            </tbody>
          </table>
        </div>
      `;
    });
    
    // Add recommendations section
    html += `
      <div class="test-section">
        <h2>Recommendations</h2>
        <ul>
    `;
    
    // Generate recommendations based on results
    const failedTests = testResults.filter(result => !result.passed);
    if (failedTests.length > 0) {
      html += `<li>Fix ${failedTests.length} failing tests, starting with high priority ones.</li>`;
    }
    
    if (summary.coverage.percentage < 80) {
      html += `<li>Improve test coverage (currently at ${summary.coverage.percentage}%), focusing on core functionality.</li>`;
    }
    
    const slowTests = testResults.filter(result => result.duration > 5000);
    if (slowTests.length > 0) {
      html += `<li>Optimize ${slowTests.length} slow tests that took more than 5 seconds to execute.</li>`;
    }
    
    html += `
        </ul>
      </div>
      
      <footer>
        Record Matching System Test Report - Generated by Validation Framework
      </footer>
      
      <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
      <script>
        // Toggle test details
        function toggleDetails(testId) {
          const details = document.getElementById('details-' + testId);
          if (details.style.display === 'block') {
            details.style.display = 'none';
          } else {
            details.style.display = 'block';
          }
        }
        
        // Initialize charts when the page loads
        document.addEventListener('DOMContentLoaded', () => {
          // Results pie chart
          const resultCtx = document.getElementById('resultPieChart').getContext('2d');
          new Chart(resultCtx, {
            type: 'pie',
            data: {
              labels: ['Passed', 'Failed', 'Skipped'],
              datasets: [{
                data: [${summary.passed}, ${summary.failed}, ${summary.total - summary.executed}],
                backgroundColor: ['#28a745', '#dc3545', '#ffc107']
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false
            }
          });
          
          // Coverage bar chart
          const coverageCtx = document.getElementById('coverageBarChart').getContext('2d');
          new Chart(coverageCtx, {
            type: 'bar',
            data: {
              labels: [${Object.keys(summary.byType).map(t => `'${t}'`).join(', ')}],
              datasets: [{
                label: 'Coverage (%)',
                data: [${Object.values(summary.byType).map(t => t.coverage?.percentage || 0).join(', ')}],
                backgroundColor: '#17a2b8'
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                y: {
                  beginAtZero: true,
                  max: 100
                }
              }
            }
          });
        });
      </script>
    </body>
    </html>
    `;
    
    fs.writeFileSync(filePath, html);
    return filePath;
  }
  
  /**
   * Generate JSON report
   * @param {Array<Object>} testResults - Test results
   * @param {Object} summary - Test summary
   * @param {string} filename - Output filename (without extension)
   * @returns {string} Path to the generated report
   */
  generateJsonReport(testResults, summary, filename = 'test_report') {
    const filePath = path.join(this.outputDir, `${filename}.json`);
    
    const report = {
      timestamp: new Date().toISOString(),
      summary,
      results: testResults.map(result => ({
        id: result.id,
        name: result.name,
        type: result.type,
        status: result.status,
        passed: result.passed,
        duration: result.duration,
        error: result.error ? {
          message: result.error.message,
          stack: result.error.stack
        } : null,
        data: result.data
      }))
    };
    
    fs.writeFileSync(filePath, JSON.stringify(report, null, 2));
    return filePath;
  }
  
  /**
   * Generate console report
   * @param {Array<Object>} testResults - Test results
   * @param {Object} summary - Test summary
   * @returns {string} Dummy path (console output doesn't have a file)
   */
  generateConsoleReport(testResults, summary) {
    console.log('='.repeat(80));
    console.log(' RECORD MATCHING SYSTEM - TEST REPORT');
    console.log(' Generated on', new Date().toLocaleString());
    console.log('='.repeat(80));
    console.log();
    
    console.log('SUMMARY:');
    console.log(`Total Tests:   ${summary.total}`);
    console.log(`Passed:        ${summary.passed}`);
    console.log(`Failed:        ${summary.failed}`);
    console.log(`Test Coverage: ${summary.coverage.percentage}%`);
    console.log(`Execution Time: ${(summary.duration / 1000).toFixed(2)}s`);
    console.log();
    
    // Group tests by type
    const testsByType = {};
    Object.values(TestType).forEach(type => {
      testsByType[type] = testResults.filter(result => {
        return result.type === type;
      });
    });
    
    // Log tests by type
    Object.entries(testsByType).forEach(([type, results]) => {
      if (results.length === 0) return;
      
      const typeName = type.charAt(0).toUpperCase() + type.slice(1);
      console.log(`${typeName} TESTS:`);
      console.log('-'.repeat(80));
      
      results.forEach(result => {
        const status = result.passed ? 'PASSED' : 'FAILED';
        console.log(`${result.name} - ${status} (${(result.duration / 1000).toFixed(2)}s)`);
        
        if (result.error) {
          console.log(`  Error: ${result.error.message}`);
        }
      });
      
      console.log();
    });
    
    // Log recommendations
    console.log('RECOMMENDATIONS:');
    console.log('-'.repeat(80));
    
    const failedTests = testResults.filter(result => !result.passed);
    if (failedTests.length > 0) {
      console.log(`- Fix ${failedTests.length} failing tests, starting with high priority ones.`);
    }
    
    if (summary.coverage.percentage < 80) {
      console.log(`- Improve test coverage (currently at ${summary.coverage.percentage}%), focusing on core functionality.`);
    }
    
    const slowTests = testResults.filter(result => result.duration > 5000);
    if (slowTests.length > 0) {
      console.log(`- Optimize ${slowTests.length} slow tests that took more than 5 seconds to execute.`);
    }
    
    console.log();
    console.log('='.repeat(80));
    
    return 'console-output';
  }
  
  /**
   * Generate a summary JSON file
   * @param {Object} summary - Test summary
   * @returns {string} Path to the generated summary file
   */
  generateSummaryFile(summary) {
    const filePath = path.join(this.outputDir, 'summary.json');
    fs.writeFileSync(filePath, JSON.stringify(summary, null, 2));
    return filePath;
  }
  
  /**
   * Generate performance visualization
   * @param {Array<Object>} testResults - Test results with performance metrics
   * @param {string} filename - Output filename (without extension)
   * @returns {string} Path to the generated visualization
   */
  generatePerformanceVisualization(testResults, filename = 'performance') {
    // This would typically use a charting library
    // For now, create a simple HTML file with performance data
    
    const filePath = path.join(this.outputDir, `${filename}.html`);
    
    // Filter for performance tests with metrics
    const performanceTests = testResults.filter(result => {
      return result.type === TestType.PERFORMANCE && result.metrics && Object.keys(result.metrics).length > 0;
    });
    
    if (performanceTests.length === 0) {
      return null;
    }
    
    let html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Record Matching System - Performance Report</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
          }
          h1, h2, h3 {
            color: #2c3e50;
          }
          .chart-container {
            margin-bottom: 40px;
          }
          .chart {
            height: 400px;
            background-color: #f8f9fa;
            border-radius: 5px;
            padding: 20px;
            margin-bottom: 20px;
          }
        </style>
      </head>
      <body>
        <h1>Record Matching System - Performance Report</h1>
        <p>Generated on ${new Date().toLocaleString()}</p>
    `;
    
    performanceTests.forEach((test, index) => {
      html += `
        <div class="chart-container">
          <h2>${test.name}</h2>
          <div class="chart" id="chart-${index}"></div>
          <div class="metrics">
            <h3>Metrics</h3>
            <table>
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
      `;
      
      Object.entries(test.metrics).forEach(([metric, value]) => {
        html += `
          <tr>
            <td>${metric}</td>
            <td>${value}</td>
          </tr>
        `;
      });
      
      html += `
              </tbody>
            </table>
          </div>
        </div>
      `;
    });
    
    html += `
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <script>
          document.addEventListener('DOMContentLoaded', () => {
            // Performance data
            const performanceData = ${JSON.stringify(performanceTests.map(test => test.metrics))};
            
            // Create charts for each test
            performanceTests = ${JSON.stringify(performanceTests.map(test => test.name))};
            
            performanceTests.forEach((testName, index) => {
              const metrics = performanceData[index];
              const ctx = document.getElementById('chart-' + index).getContext('2d');
              
              // Create appropriate chart based on metrics
              if (metrics.throughput || metrics.latency) {
                new Chart(ctx, {
                  type: 'bar',
                  data: {
                    labels: Object.keys(metrics),
                    datasets: [{
                      label: testName,
                      data: Object.values(metrics),
                      backgroundColor: '#17a2b8'
                    }]
                  },
                  options: {
                    responsive: true,
                    maintainAspectRatio: false
                  }
                });
              }
            });
          });
        </script>
      </body>
      </html>
    `;
    
    fs.writeFileSync(filePath, html);
    return filePath;
  }
}

module.exports = {
  ReportFormat,
  ReportGenerator
}; 