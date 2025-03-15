/**
 * Intelligent Rule Selection System Demo
 * 
 * This script demonstrates the capabilities of the Intelligent Rule Selection System
 * by showing how it recommends rules based on table schemas and user goals.
 */

const intelligentRuleSelector = require('../rules/intelligent_rule_selector');

// Demo tables
const DEMO_SOURCE_TABLE = 'customers';
const DEMO_REFERENCE_TABLE = 'customer_records';

// Demo goals to showcase different recommendation types
const DEMO_GOALS = [
  {
    description: 'Find high quality matches with high precision',
    explanation: 'This goal prioritizes precision over recall, recommending rules that minimize false positives'
  },
  {
    description: 'Find as many potential matches as possible',
    explanation: 'This goal prioritizes recall over precision, recommending rules that minimize false negatives'
  },
  {
    description: 'Balance precision and recall for optimal results',
    explanation: 'This goal seeks a balance between precision and recall, recommending rules that provide the best F1 score'
  },
  {
    description: 'Optimize for performance with reasonable accuracy',
    explanation: 'This goal prioritizes execution speed, recommending rules that are computationally efficient'
  }
];

/**
 * Run the demo
 */
async function runDemo() {
  console.log('='.repeat(80));
  console.log('INTELLIGENT RULE SELECTION SYSTEM DEMO');
  console.log('='.repeat(80));
  console.log('\nThis demo shows how the system recommends different rules based on user goals.\n');
  
  // Run recommendations for each goal
  for (const [index, goal] of DEMO_GOALS.entries()) {
    console.log('-'.repeat(80));
    console.log(`GOAL ${index + 1}: ${goal.description}`);
    console.log(goal.explanation);
    console.log('-'.repeat(80));
    
    try {
      // Get recommendations for this goal
      console.log(`\nAnalyzing tables and generating recommendations...`);
      const recommendation = await intelligentRuleSelector.recommendRules(
        DEMO_SOURCE_TABLE,
        DEMO_REFERENCE_TABLE,
        goal.description
      );
      
      // Display the inferred goal type
      console.log(`\nInferred Goal Type: ${recommendation.goal.inferredType.toUpperCase()}`);
      
      // Display recommended rules
      console.log('\nRecommended Rules:');
      recommendation.recommendedRules.forEach((rule, i) => {
        console.log(`  ${i + 1}. ${rule.name} (${rule.type})`);
        console.log(`     Fields: ${rule.fields.map(f => f.name).join(', ')}`);
        console.log(`     Algorithm: ${rule.algorithm}`);
        console.log(`     Confidence: ${rule.confidence}`);
        console.log(`     Threshold: ${rule.threshold}`);
      });
      
      // Display recommended blocking strategies
      console.log('\nRecommended Blocking Strategies:');
      recommendation.recommendedBlocking.forEach((strategy, i) => {
        console.log(`  ${i + 1}. ${strategy.name}`);
        console.log(`     Fields: ${strategy.fields.join(', ')}`);
      });
      
      // Get and display explanation
      console.log('\nExplanation:');
      const explanation = intelligentRuleSelector.explainRecommendation(recommendation);
      console.log(explanation);
      
      // Simulate applying the rules
      console.log('\nSimulating rule application...');
      const result = await intelligentRuleSelector.applyRecommendedRules(recommendation);
      
      // Display results
      console.log('\nMatching Results:');
      console.log(`  Total Matches: ${result.totalMatches}`);
      console.log(`  Total Comparisons: ${result.totalComparisons}`);
      console.log(`  Execution Time: ${result.executionTime}ms`);
      console.log(`  Estimated Precision: ${result.estimatedPrecision.toFixed(2)}`);
      console.log(`  Estimated Recall: ${result.estimatedRecall.toFixed(2)}`);
      console.log(`  F1 Score: ${result.f1Score.toFixed(2)}`);
      
      // Display performance metrics for each rule
      console.log('\nRule Performance:');
      result.ruleResults.forEach((ruleResult, i) => {
        console.log(`  ${i + 1}. ${ruleResult.ruleName}`);
        console.log(`     Matches: ${ruleResult.matchCount}`);
        console.log(`     Execution Time: ${ruleResult.executionTimeMs}ms`);
      });
      
    } catch (error) {
      console.error(`Error demonstrating goal "${goal.description}":`, error);
    }
    
    console.log('\n');
  }
  
  // Show performance report
  try {
    console.log('='.repeat(80));
    console.log('PERFORMANCE REPORT (LAST 30 DAYS)');
    console.log('='.repeat(80));
    
    const report = await intelligentRuleSelector.getPerformanceReport(30);
    
    // Display top performing rules
    console.log('\nTop Performing Rules (by F1 Score):');
    report.topRules.f1Score.forEach((rule, i) => {
      console.log(`  ${i + 1}. ${rule.ruleName} (${rule.ruleType})`);
      console.log(`     Precision: ${rule.avgPrecision.toFixed(2)}`);
      console.log(`     Recall: ${rule.avgRecall.toFixed(2)}`);
      console.log(`     F1 Score: ${rule.f1Score.toFixed(2)}`);
    });
    
    // Display most effective fields
    console.log('\nMost Effective Fields:');
    Object.entries(report.fieldEffectiveness)
      .sort((a, b) => b[1].effectiveness - a[1].effectiveness)
      .slice(0, 5)
      .forEach(([field, stats], i) => {
        console.log(`  ${i + 1}. ${field}`);
        console.log(`     Effectiveness: ${stats.effectiveness.toFixed(2)}`);
        console.log(`     Match Contribution: ${stats.matchContribution.toFixed(2)}`);
      });
    
    // Display performance trends
    console.log('\nPerformance Trends (Last 30 Days):');
    console.log('  Precision: ' + (report.trends.precision[0] < report.trends.precision[report.trends.precision.length - 1] ? '↑ Improving' : '↓ Declining'));
    console.log('  Recall: ' + (report.trends.recall[0] < report.trends.recall[report.trends.recall.length - 1] ? '↑ Improving' : '↓ Declining'));
    console.log('  Execution Time: ' + (report.trends.executionTime[0] > report.trends.executionTime[report.trends.executionTime.length - 1] ? '↑ Improving' : '↓ Declining'));
    
  } catch (error) {
    console.error('Error generating performance report:', error);
  }
  
  console.log('\n='.repeat(80));
  console.log('DEMO COMPLETE');
  console.log('='.repeat(80));
}

// Run the demo if this file is executed directly
if (require.main === module) {
  runDemo().catch(console.error);
}

module.exports = {
  runDemo
}; 