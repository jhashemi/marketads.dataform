# MarketAds BigQuery-Native Record Matching System

A high-performance, SQL-based record matching and entity resolution system designed specifically for Google BigQuery and Dataform environments. This system enables efficient and accurate matching of records across different data sources using native BigQuery SQL capabilities.

## Overview

The Intelligent Rule Selection System is a sophisticated component designed to handle large-scale record matching that automatically recommends optimal matching rules based on table schemas, field types, and user-defined goals. It analyzes the structure and content of data tables to suggest the most effective rules for entity matching.

## Key Components

### 1. Field Type Inference

Automatically detects semantic field types beyond basic SQL types:
- Personal information (firstName, lastName, fullName)
- Contact information (email, phone, address)
- Identifiers (customerId, accountNumber)
- Dates and times (dateOfBirth, createdAt)

### 2. Goal Analyzer

Translates user-defined matching goals into rule configurations:
- HIGH_PRECISION: Find only high-confidence matches
- HIGH_RECALL: Find as many potential matches as possible
- BALANCED: Balance precision and recall
- PERFORMANCE: Optimize for execution speed
- CUSTOM: User-defined configuration

### 3. Rule Optimizer

Evaluates different rule combinations to find the optimal set:
- Analyzes field compatibility and quality
- Balances effectiveness (precision/recall) with performance
- Recommends blocking strategies to improve performance
- Suggests field weights based on uniqueness and quality

### 4. Performance Tracker

Monitors rule effectiveness and performance over time:
- Records precision, recall, and F1 scores
- Tracks execution time and match counts
- Identifies most effective fields and rules
- Provides trend analysis for continuous improvement

### 5. API Interface

Provides HTTP endpoints and CLI interface for:
- Recommending rules based on table schemas and goals
- Applying recommended rules to perform matching
- Retrieving performance metrics and trends
- Explaining rule recommendations in human-readable format

## Usage

### API Endpoints

```
POST /api/rules/recommend
POST /api/rules/apply
GET /api/rules/performance
POST /api/rules/explain
```

### Example

```javascript
// Recommend rules
const recommendation = await intelligentRuleSelector.recommendRules(
  'customers',
  'customer_records',
  'Find high quality matches with good precision'
);

// Apply recommended rules
const result = await intelligentRuleSelector.applyRecommendedRules(
  recommendation
);

// Get explanation
const explanation = intelligentRuleSelector.explainRecommendation(
  recommendation
);

// Get performance report
const report = await intelligentRuleSelector.getPerformanceReport(30); // last 30 days
```

## Benefits

- **Automated Intelligence**: Reduces the need for manual rule configuration
- **Adaptive Learning**: Improves recommendations based on historical performance
- **Goal-Oriented**: Tailors rules to specific matching objectives
- **Transparent Decisions**: Provides explanations for recommended rules
- **Performance Optimization**: Balances matching quality with execution speed

## Implementation Details

The system is implemented as a set of modular JavaScript components:

- `field_type_inference.js`: Semantic type detection
- `goal_analyzer.js`: User intent translation
- `rule_optimizer.js`: Rule combination evaluation
- `rule_performance_tracker.js`: Effectiveness monitoring
- `schema_analyzer.js`: Table structure analysis
- `intelligent_rule_selector.js`: Main entry point
- `rule_selection_api.js`: HTTP/CLI interface

## Testing

Run the test suite to verify functionality:

```
node includes/tests/rule_selector_test.js
```