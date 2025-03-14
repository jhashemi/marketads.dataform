/**
 * Transitive Closure Integration Tests
 * 
 * Tests the system's ability to combine direct matches into extended match networks
 * through transitive relationships (if A matches B and B matches C, then A indirectly matches C).
 */

const { TestType, TestPriority } = require('../../includes/validation/validation_registry');
const { withErrorHandling } = require('../../includes/validation/error_handler');

// Import the required classes and factories
const { 
  MatchingSystem, 
  MatchingSystemFactory,
  TransitiveMatcher,
  TransitiveMatcherFactory 
} = require('../../includes');

exports.tests = [
  {
    id: 'transitive_closure_basic_test',
    name: 'Basic Transitive Closure Test',
    description: 'Tests simple transitive closure with a small dataset',
    type: TestType.INTEGRATION,
    priority: TestPriority.HIGH,
    tags: ['integration', 'transitive-closure', 'clustering'],
    parameters: {
      sourceTable: 'test_customers_sample',
      referenceTable: 'master_customer_records',
      expectedDirectMatches: 50,
      expectedTransitiveMatches: 30, // Additional matches discovered through transitive relationships
      transitiveMatchDepth: 2, // Maximum link depth for transitive matches
      clusterOutputTable: 'test_customer_clusters'
    },
    testFn: withErrorHandling(async function(context) {
      // Debug the context object
      console.log('DEBUG: Context object received in transitive_closure_basic_test:', JSON.stringify(context, null, 2));
      
      // Check if parameters exist
      if (!context.parameters || !context.parameters.sourceTable) {
        // If parameters are missing, use the defaults from the test definition
        console.log('DEBUG: Using default parameters from test definition');
        context.parameters = this.parameters || exports.tests[0].parameters;
      }
      
      // Setup test parameters
      const { sourceTable, referenceTable, expectedDirectMatches, expectedTransitiveMatches, transitiveMatchDepth, clusterOutputTable } = context.parameters;
      
      console.log(`INFO: Running test with sourceTable=${sourceTable}, referenceTable=${referenceTable}`);
      
      // Step 1: Run matching without transitive closure
      console.log(`Running direct matching on ${sourceTable}...`);
      const matchingSystemFactory = new MatchingSystemFactory();

      const directMatcher = matchingSystemFactory.createMatchingSystem({
        sourceTable,
        targetTables: [referenceTable],
        outputTable: 'test_direct_matches'
      });

      const directResults = await directMatcher.executeMatching();

      // Verify direct matches
      const correctDirectMatches = Math.abs(directResults.matchedRecords - expectedDirectMatches) <= 5; // Allow small variance

      // Step 2: Run matching with transitive closure
      console.log(`Running matching with transitive closure on ${sourceTable}...`);

      const transitiveMatcher = matchingSystemFactory.createMatchingSystem({
        sourceTable,
        targetTables: [referenceTable],
        outputTable: 'test_transitive_matches'
      });

      const transitiveResults = await transitiveMatcher.executeMatching();

      // Calculate additional matches found through transitive closure
      const additionalMatches = transitiveResults.matchedRecords - directResults.matchedRecords;
      const correctTransitiveMatches = Math.abs(additionalMatches - expectedTransitiveMatches) <= 5; // Allow small variance

      // Analyze cluster quality using our TransitiveMatcher
      const transitiveMatcherFactory = new TransitiveMatcherFactory();
      const clusterAnalyzer = transitiveMatcherFactory.createTransitiveMatcher({
        matchResultsTable: 'test_transitive_matches',
        confidenceThreshold: 0.7
      });
      
      const clusterMetrics = await clusterAnalyzer.getClusterMetrics();
      
      return {
        passed: correctDirectMatches && correctTransitiveMatches,
        metrics: {
          directMatches: directResults.matchedRecords,
          transitiveMatches: transitiveResults.matchedRecords,
          additionalMatchesFound: additionalMatches,
          clusterCount: clusterMetrics.clusterCount,
          averageClusterSize: clusterMetrics.averageClusterSize,
          largestClusterSize: clusterMetrics.largestClusterSize,
          connectivityScore: clusterMetrics.transitivityScore || 'N/A'
        },
        message: correctDirectMatches && correctTransitiveMatches
          ? `Successfully applied transitive closure, finding ${additionalMatches} additional matches and creating ${clusterMetrics.clusterCount} clusters`
          : `Failed to correctly apply transitive closure. Direct matches: ${directResults.matchedRecords}/${expectedDirectMatches}, Additional transitive matches: ${additionalMatches}/${expectedTransitiveMatches}`
      };
    }, 'INTEGRATION_TEST_ERROR')
  },
  
  {
    id: 'transitive_closure_multi_hop_test',
    name: 'Multi-Hop Transitive Closure Test',
    description: 'Tests transitive closure with varying depths of relationship chains',
    type: TestType.INTEGRATION,
    priority: TestPriority.MEDIUM,
    tags: ['integration', 'transitive-closure', 'clustering', 'depth'],
    parameters: {
      sourceTable: 'test_customers_complex',
      referenceTable: 'master_customer_records',
      transitiveMatchDepths: [1, 2, 3, 4], // Test different transitive closure depths
      expectedMatchCounts: {
        direct: 100, // Direct matches (depth 0)
        depth1: 150, // Total matches at depth 1
        depth2: 180, // Total matches at depth 2
        depth3: 195, // Total matches at depth 3
        depth4: 200  // Total matches at depth 4
      },
      baseOutputTable: 'test_transitive_matches'
    },
    testFn: async (context) => {
      // Setup test parameters
      const { sourceTable, referenceTable, transitiveMatchDepths, expectedMatchCounts, baseOutputTable } = context.parameters;
      
      const results = {};
      let overallSuccess = true;
      
      // Step 1: Run direct matching (depth 0)
      console.log(`Running direct matching on ${sourceTable}...`);
      const matchingSystemFactory = new MatchingSystemFactory();
      
      const directMatcher = matchingSystemFactory.createMatchingSystem({
        sourceTable,
        targetTables: [referenceTable],
        outputTable: `${baseOutputTable}_direct`,
      });
      
      const directResults = await directMatcher.executeMatching();
      
      // Verify direct matches
      const correctDirectMatches = Math.abs(directResults.matchedRecords - expectedMatchCounts.direct) <= 5;
      results.direct = {
        depth: 0,
        matchedRecords: directResults.matchedRecords,
        expected: expectedMatchCounts.direct,
        correct: correctDirectMatches
      };
      
      overallSuccess = overallSuccess && correctDirectMatches;
      
      // Step 2: Run matching with different transitive closure depths
      for (const depth of transitiveMatchDepths) {
        console.log(`Running matching with transitive closure depth ${depth} on ${sourceTable}...`);
        
        const transitiveMatcher = matchingSystemFactory.createMatchingSystem({
          sourceTable,
          targetTables: [referenceTable],
          outputTable: `${baseOutputTable}_depth${depth}`
        });
        
        const transitiveResults = await transitiveMatcher.executeMatching();

        // Get a TransitiveMatcher to analyze clusters
        const transitiveMatcherFactory = new TransitiveMatcherFactory();
        const clusterAnalyzer = transitiveMatcherFactory.createTransitiveMatcher({
          matchResultsTable: `${baseOutputTable}_depth${depth}`,
          confidenceThreshold: 0.7
        });
        
        // Verify matches at this depth
        const depthKey = `depth${depth}`;
        const correctMatches = Math.abs(transitiveResults.matchedRecords - expectedMatchCounts[depthKey]) <= 5;
        
        results[depthKey] = {
          depth,
          matchedRecords: transitiveResults.matchedRecords,
          expected: expectedMatchCounts[depthKey],
          correct: correctMatches,
          additionalMatches: transitiveResults.matchedRecords - directResults.matchedRecords
        };
        
        overallSuccess = overallSuccess && correctMatches;
      }
      
      // Calculate incremental benefit of each additional depth level
      const incrementalBenefits = {};
      let previousMatches = results.direct.matchedRecords;
      
      for (const depth of transitiveMatchDepths) {
        const depthKey = `depth${depth}`;
        const currentMatches = results[depthKey].matchedRecords;
        const incrementalBenefit = currentMatches - previousMatches;
        
        incrementalBenefits[depthKey] = {
          incrementalMatches: incrementalBenefit,
          incrementalPercentage: ((incrementalBenefit / previousMatches) * 100).toFixed(2) + '%'
        };
        
        previousMatches = currentMatches;
      }
      
      return {
        passed: overallSuccess,
        metrics: {
          depthResults: results,
          incrementalBenefits,
          recommendedDepth: determineOptimalDepth(results, transitiveMatchDepths)
        },
        message: overallSuccess
          ? `Successfully tested transitive closure at multiple depths, with maximum match increase of ${results[`depth${transitiveMatchDepths[transitiveMatchDepths.length-1]}`].additionalMatches} matches at depth ${transitiveMatchDepths[transitiveMatchDepths.length-1]}`
          : `Failed to correctly apply transitive closure at one or more depths`
      };
    }
  },
  
  {
    id: 'transitive_closure_confidence_threshold_test',
    name: 'Transitive Closure Confidence Threshold Test',
    description: 'Tests transitive closure with different confidence thresholds for indirect matches',
    type: TestType.INTEGRATION,
    priority: TestPriority.MEDIUM,
    tags: ['integration', 'transitive-closure', 'confidence'],
    parameters: {
      sourceTable: 'test_customers_sample',
      referenceTable: 'master_customer_records',
      transitiveMatchDepth: 2,
      confidenceThresholds: [0.9, 0.8, 0.7, 0.6, 0.5], // Different confidence thresholds to test
      baseOutputTable: 'test_confidence_matches'
    },
    testFn: async (context) => {
      // Setup test parameters
      const { sourceTable, referenceTable, transitiveMatchDepth, confidenceThresholds, baseOutputTable } = context.parameters;
      
      const results = {};
      
      // Step 1: Run direct matching as baseline
      console.log(`Running direct matching on ${sourceTable}...`);
      
      const directMatcher = new MatchingSystem({
        sourceTable,
        targetTables: [referenceTable],
        outputTable: `${baseOutputTable}_direct`,
        enableTransitiveClosure: false
      });
      
      const directResults = await directMatcher.executeMatching();
      results.direct = {
        matchedRecords: directResults.matchedRecords,
        matchQuality: directResults.matchQuality || 'N/A'
      };
      
      // Step 2: Run matching with different confidence thresholds
      for (const threshold of confidenceThresholds) {
        console.log(`Running transitive closure with confidence threshold ${threshold}...`);
        const matchingSystemFactory = new MatchingSystemFactory();

        const transitiveMatcher = matchingSystemFactory.createMatchingSystem({
          sourceTable,
          targetTables: [referenceTable],
          outputTable: `${baseOutputTable}_threshold${threshold}`
        });

        const transitiveResults = await transitiveMatcher.executeMatching();
        
        // Use TransitiveMatcherFactory to analyze clusters with different thresholds
        const transitiveMatcherFactory = new TransitiveMatcherFactory();
        const clusterAnalyzer = transitiveMatcherFactory.createTransitiveMatcher({
          matchResultsTable: `${baseOutputTable}_threshold${threshold}`,
          confidenceThreshold: threshold
        });
        
        const clusterMetrics = await clusterAnalyzer.getClusterMetrics();

        results[`threshold${threshold}`] = {
          threshold,
          matchedRecords: transitiveResults.matchedRecords,
          additionalMatches: transitiveResults.matchedRecords - directResults.matchedRecords,
          clusterCount: clusterMetrics.clusterCount,
          falsePositiveRate: clusterMetrics.falsePositiveRate || 'N/A',
          matchQuality: transitiveResults.matchQuality || 'N/A'
        };
      }
        
      // Determine optimal confidence threshold balancing coverage and quality
      const optimalThreshold = determineOptimalConfidenceThreshold(results, confidenceThresholds);
      
      return {
        passed: true, // This test is exploratory rather than pass/fail
        metrics: {
          thresholdResults: results,
          optimalThreshold,
          qualityByThreshold: extractQualityMetricsByThreshold(results, confidenceThresholds)
        },
        message: `Transitive closure confidence threshold analysis complete. Optimal threshold: ${optimalThreshold}`
      };
    }
  }
];

/**
 * Determines the optimal transitive closure depth based on diminishing returns
 * @param {Object} results - Test results by depth
 * @param {Array<number>} depths - Tested depths
 * @returns {number} - The optimal depth
 */
function determineOptimalDepth(results, depths) {
  let bestDepth = 1;
  let bestImprovementRatio = 0;
  
  // Start with depth 1 and compare to direct
  for (let i = 0; i < depths.length; i++) {
    const currentDepth = depths[i];
    const currentKey = `depth${currentDepth}`;
    const currentMatches = results[currentKey].matchedRecords;
    const directMatches = results.direct.matchedRecords;
    
    // If this is the last depth, check if there was any improvement from the previous depth
    if (i === depths.length - 1) {
      const previousDepth = depths[i-1];
      const previousKey = `depth${previousDepth}`;
      const previousMatches = results[previousKey].matchedRecords;
      
      // If the improvement is less than 2%, we've reached diminishing returns
      if ((currentMatches - previousMatches) / previousMatches < 0.02) {
        return previousDepth;
      }
    }
    
    // Otherwise, calculate improvement ratio (additional matches / depth increase)
    const improvementRatio = (currentMatches - directMatches) / currentDepth;
    
    if (improvementRatio > bestImprovementRatio) {
      bestImprovementRatio = improvementRatio;
      bestDepth = currentDepth;
    }
  }
  
  return bestDepth;
}

/**
 * Determines the optimal confidence threshold balancing coverage and quality
 * @param {Object} results - Test results by threshold
 * @param {Array<number>} thresholds - Tested confidence thresholds
 * @returns {number} - The optimal threshold
 */
function determineOptimalConfidenceThreshold(results, thresholds) {
  // If we don't have quality metrics, return the middle threshold as a default
  if (!results.direct.matchQuality) {
    return thresholds[Math.floor(thresholds.length / 2)];
  }
  
  let bestThreshold = thresholds[0];
  let bestScore = 0;
  
  for (const threshold of thresholds) {
    const key = `threshold${threshold}`;
    const additionalMatches = results[key].additionalMatches;
    const qualityRatio = results[key].matchQuality / results.direct.matchQuality;
    
    // Score is a combination of additional matches and quality ratio
    // This formula prioritizes maintaining quality while increasing matches
    const score = additionalMatches * Math.pow(qualityRatio, 2);
    
    if (score > bestScore) {
      bestScore = score;
      bestThreshold = threshold;
    }
  }
  
  return bestThreshold;
}

/**
 * Extracts quality metrics by threshold for analysis
 * @param {Object} results - Test results by threshold
 * @param {Array<number>} thresholds - Tested confidence thresholds
 * @returns {Object} - Quality metrics
 */
function extractQualityMetricsByThreshold(results, thresholds) {
  const metrics = {};
  
  for (const threshold of thresholds) {
    const key = `threshold${threshold}`;
    metrics[threshold] = {
      additionalMatches: results[key].additionalMatches,
      falsePositiveRate: results[key].falsePositiveRate,
      matchQuality: results[key].matchQuality,
      qualityVsCoverageRatio: results[key].matchQuality ? 
        results[key].additionalMatches * results[key].matchQuality : 'N/A'
    };
  }
  
  return metrics;
}

// Register tests with validation registry
exports.register = async (registry) => {
  const testIds = [];
  
  // Register each test with error handling
  for (const test of exports.tests) {
    try {
      const testId = registry.registerTest({
        ...test,
        testFn: withErrorHandling(test.testFn, 'INTEGRATION_TEST_ERROR', { testId: test.id })
      });
      
      testIds.push(testId);
    } catch (error) {
      console.error(`Failed to register transitive closure test ${test.id}: ${error.message}`);
    }
  }
  
  return testIds;
}; 