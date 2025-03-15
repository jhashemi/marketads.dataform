# Intelligent Rule Selection System Documentation

## Overview

The Intelligent Rule Selection System is an advanced component that automatically recommends optimal matching rules based on table schemas, field types, and user-defined goals. It eliminates the need for manual rule configuration by analyzing data structure and content to suggest the most effective rules for entity matching.

## Architecture

The system consists of several modular components that work together to provide intelligent rule recommendations:

```
┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│                     │     │                     │     │                     │
│   Schema Analyzer   │────▶│  Field Type Inference│────▶│    Goal Analyzer    │
│                     │     │                     │     │                     │
└─────────────────────┘     └─────────────────────┘     └──────────┬──────────┘
                                                                   │
                                                                   ▼
┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│                     │     │                     │     │                     │
│ Performance Tracker │◀────│ Intelligent Selector│◀────│   Rule Optimizer    │
│                     │     │                     │     │                     │
└─────────────────────┘     └─────────────────────┘     └─────────────────────┘
```

## Components

### 1. Schema Analyzer (`schema_analyzer.js`)

Analyzes the structure of source and reference tables to identify:
- Common fields between tables
- Field statistics (uniqueness, null ratio, etc.)
- Schema similarity score
- Potential blocking fields
- Potential matching fields

```javascript
const analysis = await schemaAnalyzer.analyzeSchema(
  'source_table',
  'reference_table'
);
```

### 2. Field Type Inference (`field_type_inference.js`)

Detects semantic field types beyond basic SQL types:
- Personal information (firstName, lastName, fullName)
- Contact information (email, phone, address)
- Identifiers (customerId, accountNumber)
- Dates and times (dateOfBirth, createdAt)

```javascript
const enhancedSchema = fieldTypeInference.inferFieldTypes(
  schema,
  sampleData
);
```

### 3. Goal Analyzer (`goal_analyzer.js`)

Translates user-defined matching goals into rule configurations:
- HIGH_PRECISION: Find only high-confidence matches
- HIGH_RECALL: Find as many potential matches as possible
- BALANCED: Balance precision and recall
- PERFORMANCE: Optimize for execution speed
- CUSTOM: User-defined configuration

```javascript
const goalType = goalAnalyzer.inferGoalFromDescription(
  'Find high quality matches with good precision'
);

const configuration = goalAnalyzer.getConfigurationForGoal(goalType);
```

### 4. Rule Optimizer (`rule_optimizer.js`)

Evaluates different rule combinations to find the optimal set:
- Analyzes field compatibility and quality
- Balances effectiveness (precision/recall) with performance
- Recommends blocking strategies to improve performance
- Suggests field weights based on uniqueness and quality

```javascript
const optimizedRules = ruleOptimizer.findOptimalRuleCombination(
  availableRules,
  schemaAnalysis,
  goalType,
  options
);
```

### 5. Performance Tracker (`rule_performance_tracker.js`)

Monitors rule effectiveness and performance over time:
- Records precision, recall, and F1 scores
- Tracks execution time and match counts
- Identifies most effective fields and rules
- Provides trend analysis for continuous improvement

```javascript
const metrics = rulePerformanceTracker.recordRulePerformance(
  'email_exact',
  performanceData
);

const topRules = rulePerformanceTracker.getTopPerformingRules('f1Score');
```

### 6. Intelligent Rule Selector (`intelligent_rule_selector.js`)

Main entry point that integrates all components:
- Coordinates the analysis and recommendation process
- Applies recommended rules to perform matching
- Generates explanations for recommendations
- Provides performance reports

```javascript
const recommendation = await intelligentRuleSelector.recommendRules(
  'source_table',
  'reference_table',
  'Find high quality matches with good precision'
);
```

## API Interface

The system provides HTTP endpoints and CLI interface through `rule_selection_api.js`:

### HTTP Endpoints

- `POST /api/rules/recommend`: Recommends rules based on table schemas and goals
- `POST /api/rules/apply`: Applies recommended rules to perform matching
- `GET /api/rules/performance`: Retrieves performance metrics and trends
- `POST /api/rules/explain`: Provides detailed explanations of rule recommendations

### CLI Commands

- `recommend`: Recommends rules for specified tables
- `apply`: Applies recommended rules to perform matching
- `explain`: Explains rule recommendations
- `performance`: Generates performance reports

## Usage Examples

### Basic Rule Recommendation

```javascript
const intelligentRuleSelector = require('./includes/rules/intelligent_rule_selector');

// Recommend rules
const recommendation = await intelligentRuleSelector.recommendRules(
  'customers',
  'customer_records',
  'Find high quality matches with good precision'
);

console.log(recommendation.recommendedRules);
```

### Applying Recommended Rules

```javascript
// Apply recommended rules
const result = await intelligentRuleSelector.applyRecommendedRules(
  recommendation
);

console.log(`Matches found: ${result.totalMatches}`);
console.log(`Precision: ${result.estimatedPrecision}`);
console.log(`Recall: ${result.estimatedRecall}`);
```

### Getting Performance Reports

```javascript
// Get performance report for the last 30 days
const report = await intelligentRuleSelector.getPerformanceReport(30);

console.log('Top performing rules:', report.topRules.f1Score);
console.log('Field effectiveness:', report.fieldEffectiveness);
console.log('Performance trends:', report.trends);
```

## Configuration Options

The system supports various configuration options:

### Rule Recommendation Options

```javascript
const options = {
  maxRuleCount: 3,           // Maximum number of rules to recommend
  minEffectiveness: 0.7,     // Minimum effectiveness threshold
  performanceWeight: 0.3,    // Weight given to performance vs. effectiveness
  includeExplanation: true,  // Include explanation in recommendation
  customParameters: {        // Custom parameters for specific goals
    thresholds: {
      high: 0.9,
      medium: 0.7,
      low: 0.5
    }
  }
};

const recommendation = await intelligentRuleSelector.recommendRules(
  'source_table',
  'reference_table',
  'Find high quality matches',
  options
);
```

## Integration with Existing Systems

The Intelligent Rule Selection System is designed to integrate with existing matching systems:

```javascript
const { MatchingSystem } = require('./includes/matching_system');
const intelligentRuleSelector = require('./includes/rules/intelligent_rule_selector');

// Get rule recommendations
const recommendation = await intelligentRuleSelector.recommendRules(
  'source_table',
  'reference_table',
  'Find high quality matches'
);

// Convert recommendations to matching system configuration
const matchingConfig = {
  rules: recommendation.recommendedRules,
  blocking: recommendation.recommendedBlocking,
  thresholds: recommendation.goal.configuration.thresholds
};

// Initialize matching system with recommended configuration
const matchingSystem = new MatchingSystem(matchingConfig);

// Execute matching
const matches = await matchingSystem.executeMatching(
  'source_table',
  'reference_table'
);
```

## Best Practices

1. **Provide Clear Goals**: The more specific the goal description, the better the recommendations.
2. **Use Sample Data**: Provide representative sample data for more accurate field type inference.
3. **Track Performance**: Regularly record performance metrics to improve future recommendations.
4. **Review Explanations**: Check the explanation for each recommendation to understand the reasoning.
5. **Adjust Parameters**: Fine-tune parameters based on domain knowledge and specific requirements.

## Troubleshooting

### Common Issues

1. **Poor Recommendations**: If recommendations seem poor, check:
   - Schema analysis results
   - Sample data quality
   - Goal description clarity

2. **Performance Issues**: If performance is slow, consider:
   - Reducing the maximum rule count
   - Increasing the performance weight
   - Using more efficient blocking strategies

3. **Integration Problems**: If integration with existing systems fails, verify:
   - API compatibility
   - Configuration format
   - Authentication settings

## Future Enhancements

1. **Machine Learning Integration**: Incorporate ML models for more accurate recommendations
2. **User Feedback Loop**: Allow users to rate recommendations to improve future suggestions
3. **Advanced Visualization**: Provide visual representations of rule effectiveness
4. **Multi-table Matching**: Support matching across multiple tables simultaneously
5. **Custom Rule Templates**: Allow users to define custom rule templates 