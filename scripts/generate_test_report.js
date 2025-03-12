/**
 * Test report generator for Record Matching System
 * 
 * This script collects test results from different sources and generates a consolidated HTML report.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const outputPath = process.env.REPORT_OUTPUT_PATH || './test_reports/test_report.html';
const summaryPath = './test_reports/summary.json';
const testReportsDir = './test_reports';

// Ensure test reports directory exists
if (!fs.existsSync(testReportsDir)) {
  fs.mkdirSync(testReportsDir, { recursive: true });
}

// HTML template for the report
const reportTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Record Matching System - Test Report</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    
    header {
      background-color: #4285f4;
      color: white;
      padding: 20px;
      border-radius: 5px;
      margin-bottom: 20px;
    }
    
    h1, h2, h3 {
      margin-top: 0;
    }
    
    .summary {
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
      margin-bottom: 30px;
    }
    
    .summary-card {
      flex: 1;
      min-width: 200px;
      padding: 20px;
      border-radius: 5px;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
      text-align: center;
    }
    
    .pass {
      background-color: #d4edda;
      color: #155724;
    }
    
    .fail {
      background-color: #f8d7da;
      color: #721c24;
    }
    
    .info {
      background-color: #e2f3f5;
      color: #0c5460;
    }
    
    .test-section {
      margin-bottom: 40px;
      padding: 20px;
      border-radius: 5px;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
    }
    
    .test-result {
      margin-bottom: 10px;
      padding: 15px;
      border-radius: 5px;
      background-color: #f8f9fa;
    }
    
    .test-result.pass {
      border-left: 5px solid #28a745;
    }
    
    .test-result.fail {
      border-left: 5px solid #dc3545;
    }
    
    .test-result-details {
      display: none;
      margin-top: 10px;
      padding: 10px;
      background-color: #f1f1f1;
      border-radius: 5px;
    }
    
    .toggle-details {
      background-color: #6c757d;
      color: white;
      border: none;
      padding: 5px 10px;
      border-radius: 3px;
      cursor: pointer;
      font-size: 0.8rem;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    
    table, th, td {
      border: 1px solid #ddd;
    }
    
    th, td {
      padding: 12px;
      text-align: left;
    }
    
    th {
      background-color: #f2f2f2;
    }
    
    tr:nth-child(even) {
      background-color: #f9f9f9;
    }
    
    .chart-container {
      width: 100%;
      height: 300px;
      margin-top: 20px;
    }
    
    footer {
      margin-top: 50px;
      padding: 20px;
      text-align: center;
      font-size: 0.9rem;
      color: #6c757d;
    }
  </style>
</head>
<body>
  <header>
    <h1>Record Matching System Test Report</h1>
    <p>Generated on: {{TIMESTAMP}}</p>
  </header>

  <div class="summary">
    <div class="summary-card info">
      <h2>{{TOTAL_TESTS}}</h2>
      <p>Total Tests</p>
    </div>
    <div class="summary-card pass">
      <h2>{{PASSED_TESTS}}</h2>
      <p>Tests Passed</p>
    </div>
    <div class="summary-card fail">
      <h2>{{FAILED_TESTS}}</h2>
      <p>Tests Failed</p>
    </div>
    <div class="summary-card info">
      <h2>{{TEST_COVERAGE}}%</h2>
      <p>Test Coverage</p>
    </div>
    <div class="summary-card info">
      <h2>{{EXECUTION_TIME}}</h2>
      <p>Execution Time</p>
    </div>
  </div>

  <!-- Unit Tests Section -->
  <div class="test-section">
    <h2>Unit Tests</h2>
    
    <div class="test-result pass">
      <h3>standardizeString</h3>
      <p>Tests string standardization function</p>
      <p><strong>Status:</strong> PASS</p>
      <button class="toggle-details" onclick="toggleDetails('standardize-string-details')">Show Details</button>
      <div id="standardize-string-details" class="test-result-details">
        <table>
          <tr>
            <th>Input</th>
            <th>Expected</th>
            <th>Actual</th>
            <th>Result</th>
          </tr>
          <tr>
            <td>"John Smith"</td>
            <td>"JOHN SMITH"</td>
            <td>"JOHN SMITH"</td>
            <td>PASS</td>
          </tr>
          <!-- Additional test cases would be listed here -->
        </table>
      </div>
    </div>
    
    <!-- Additional unit tests would be listed here -->
    {{UNIT_TESTS}}
  </div>

  <!-- Integration Tests Section -->
  <div class="test-section">
    <h2>Integration Tests</h2>
    
    <div class="test-result pass">
      <h3>End-to-End Matching</h3>
      <p>Tests the complete matching pipeline</p>
      <p><strong>Status:</strong> PASS</p>
      <p><strong>Precision:</strong> 0.95 | <strong>Recall:</strong> 0.92 | <strong>F1 Score:</strong> 0.93</p>
      <button class="toggle-details" onclick="toggleDetails('e2e-matching-details')">Show Details</button>
      <div id="e2e-matching-details" class="test-result-details">
        <h4>Performance Metrics</h4>
        <p>Execution Time: 1.2s</p>
        <p>Memory Usage: 128MB</p>
        
        <h4>Match Results</h4>
        <table>
          <tr>
            <th>Source ID</th>
            <th>Target ID</th>
            <th>Expected Tier</th>
            <th>Actual Tier</th>
            <th>Match Score</th>
            <th>Result</th>
          </tr>
          <tr>
            <td>1</td>
            <td>101</td>
            <td>HIGH</td>
            <td>HIGH</td>
            <td>0.92</td>
            <td>PASS</td>
          </tr>
          <!-- Additional match results would be listed here -->
        </table>
      </div>
    </div>
    
    <!-- Additional integration tests would be listed here -->
    {{INTEGRATION_TESTS}}
  </div>

  <!-- Performance Tests Section -->
  <div class="test-section">
    <h2>Performance Tests</h2>
    
    <!-- Performance test results would be listed here -->
    {{PERFORMANCE_TESTS}}
    
    <div class="chart-container">
      <!-- Performance chart would be rendered here -->
      <p>Performance metrics visualization would be displayed here.</p>
    </div>
  </div>

  <!-- Recommendations Section -->
  <div class="test-section">
    <h2>Recommendations</h2>
    <ul>
      {{RECOMMENDATIONS}}
      <li>Consider optimizing the blocking strategy for better performance.</li>
      <li>Add more test cases for international name variations.</li>
      <li>Increase test coverage for edge cases with missing data.</li>
    </ul>
  </div>

  <footer>
    <p>Record Matching System - Test Report | Generated by CI/CD Pipeline</p>
  </footer>

  <script>
    function toggleDetails(id) {
      const details = document.getElementById(id);
      if (details.style.display === 'block') {
        details.style.display = 'none';
      } else {
        details.style.display = 'block';
      }
    }
    
    // Additional JavaScript for visualizing performance metrics would be added here
  </script>
</body>
</html>
`;

/**
 * Collects test results from dataform operations
 * @returns {Object} Aggregated test results
 */
function collectDataformTestResults() {
  try {
    // This would normally query BigQuery for test results from operations tables
    // For this example, we'll return placeholder data
    return {
      unitTests: {
        totalTests: 25,
        passedTests: 23,
        failedTests: 2,
        tests: [
          {
            name: 'Levenshtein Similarity',
            status: 'PASS',
            details: 'All test cases passed'
          },
          {
            name: 'Jaro-Winkler Similarity',
            status: 'PASS',
            details: 'All test cases passed'
          },
          {
            name: 'Soundex',
            status: 'PASS',
            details: 'All test cases passed'
          },
          {
            name: 'Address Standardization',
            status: 'FAIL',
            details: 'Expected "123 MAIN STREET", got "123 MAIN ST"'
          }
        ]
      },
      integrationTests: {
        totalTests: 10,
        passedTests: 9,
        failedTests: 1,
        tests: [
          {
            name: 'Name Matching',
            status: 'PASS',
            precision: 0.95,
            recall: 0.92,
            f1Score: 0.93
          },
          {
            name: 'Address Matching',
            status: 'PASS',
            precision: 0.87,
            recall: 0.85,
            f1Score: 0.86
          }
        ]
      },
      performanceTests: {
        averageExecutionTime: '1.5s',
        peakMemoryUsage: '256MB',
        scalingFactor: '0.98'
      }
    };
  } catch (error) {
    console.error('Error collecting Dataform test results:', error);
    return {
      unitTests: { totalTests: 0, passedTests: 0, failedTests: 0, tests: [] },
      integrationTests: { totalTests: 0, passedTests: 0, failedTests: 0, tests: [] },
      performanceTests: {}
    };
  }
}

/**
 * Collects test results from JavaScript tests
 * @returns {Object} JavaScript test results
 */
function collectJavaScriptTestResults() {
  try {
    // This would normally read result files from the test_reports directory
    // For this example, we'll return placeholder data
    return {
      totalTests: 15,
      passedTests: 14,
      failedTests: 1,
      tests: [
        {
          name: 'Name Variation Tests',
          status: 'PASS',
          details: 'All name variations correctly matched'
        },
        {
          name: 'Edge Case Tests',
          status: 'FAIL',
          details: 'Failed to match "O\'Brien" with "O Brien"'
        }
      ]
    };
  } catch (error) {
    console.error('Error collecting JavaScript test results:', error);
    return { totalTests: 0, passedTests: 0, failedTests: 0, tests: [] };
  }
}

/**
 * Generates the test report HTML
 * @param {Object} results - Aggregated test results
 * @returns {string} HTML report
 */
function generateReportHtml(results) {
  // Replace template placeholders with actual values
  let html = reportTemplate;
  
  const totalTests = results.dataform.unitTests.totalTests +
                     results.dataform.integrationTests.totalTests +
                     results.javascript.totalTests;
                     
  const passedTests = results.dataform.unitTests.passedTests +
                      results.dataform.integrationTests.passedTests +
                      results.javascript.passedTests;
                      
  const failedTests = results.dataform.unitTests.failedTests +
                      results.dataform.integrationTests.failedTests +
                      results.javascript.failedTests;
                      
  const testCoverage = Math.round((passedTests / totalTests) * 100);
  
  html = html.replace('{{TIMESTAMP}}', new Date().toLocaleString());
  html = html.replace('{{TOTAL_TESTS}}', totalTests);
  html = html.replace('{{PASSED_TESTS}}', passedTests);
  html = html.replace('{{FAILED_TESTS}}', failedTests);
  html = html.replace('{{TEST_COVERAGE}}', testCoverage);
  html = html.replace('{{EXECUTION_TIME}}', results.dataform.performanceTests.averageExecutionTime || 'N/A');
  
  // Generate unit test HTML
  let unitTestsHtml = '';
  [...results.dataform.unitTests.tests, ...results.javascript.tests].forEach(test => {
    unitTestsHtml += `
      <div class="test-result ${test.status === 'PASS' ? 'pass' : 'fail'}">
        <h3>${test.name}</h3>
        <p><strong>Status:</strong> ${test.status}</p>
        <p>${test.details || ''}</p>
      </div>
    `;
  });
  html = html.replace('{{UNIT_TESTS}}', unitTestsHtml);
  
  // Generate integration test HTML
  let integrationTestsHtml = '';
  results.dataform.integrationTests.tests.forEach(test => {
    integrationTestsHtml += `
      <div class="test-result ${test.status === 'PASS' ? 'pass' : 'fail'}">
        <h3>${test.name}</h3>
        <p><strong>Status:</strong> ${test.status}</p>
        <p><strong>Precision:</strong> ${test.precision || 'N/A'} | <strong>Recall:</strong> ${test.recall || 'N/A'} | <strong>F1 Score:</strong> ${test.f1Score || 'N/A'}</p>
      </div>
    `;
  });
  html = html.replace('{{INTEGRATION_TESTS}}', integrationTestsHtml);
  
  // Generate performance test HTML
  let performanceTestsHtml = `
    <p><strong>Average Execution Time:</strong> ${results.dataform.performanceTests.averageExecutionTime || 'N/A'}</p>
    <p><strong>Peak Memory Usage:</strong> ${results.dataform.performanceTests.peakMemoryUsage || 'N/A'}</p>
    <p><strong>Scaling Factor:</strong> ${results.dataform.performanceTests.scalingFactor || 'N/A'}</p>
  `;
  html = html.replace('{{PERFORMANCE_TESTS}}', performanceTestsHtml);
  
  // Generate recommendations
  let recommendationsHtml = '';
  if (failedTests > 0) {
    recommendationsHtml += '<li>Fix failing tests.</li>';
  }
  html = html.replace('{{RECOMMENDATIONS}}', recommendationsHtml);
  
  return html;
}

/**
 * Generates a summary JSON file with key metrics
 * @param {Object} results - Aggregated test results
 */
function generateSummaryJson(results) {
  const totalTests = results.dataform.unitTests.totalTests +
                     results.dataform.integrationTests.totalTests +
                     results.javascript.totalTests;
                     
  const passedTests = results.dataform.unitTests.passedTests +
                      results.dataform.integrationTests.passedTests +
                      results.javascript.passedTests;
                      
  const failedTests = results.dataform.unitTests.failedTests +
                      results.dataform.integrationTests.failedTests +
                      results.javascript.failedTests;
                      
  const testCoverage = Math.round((passedTests / totalTests) * 100);
  
  const summary = {
    totalTests,
    passedTests,
    failedTests,
    coverage: testCoverage,
    executionTime: results.dataform.performanceTests.averageExecutionTime || 'N/A',
    timestamp: new Date().toISOString()
  };
  
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  console.log(`Summary JSON written to ${summaryPath}`);
}

// Main execution
try {
  console.log('Generating test report...');
  
  // Collect test results
  const dataformResults = collectDataformTestResults();
  const javascriptResults = collectJavaScriptTestResults();
  
  // Combine results
  const allResults = {
    dataform: dataformResults,
    javascript: javascriptResults
  };
  
  // Generate HTML report
  const reportHtml = generateReportHtml(allResults);
  fs.writeFileSync(outputPath, reportHtml);
  console.log(`Test report written to ${outputPath}`);
  
  // Generate summary JSON
  generateSummaryJson(allResults);
  
  console.log('Test report generation complete.');
} catch (error) {
  console.error('Error generating test report:', error);
  process.exit(1);
} 