# Market Ads Dataform Package Documentation

## Architecture

The Market Ads Dataform package follows a modular design optimized for reuse across multiple projects. The architecture separates concerns between:

1. **Data Processing Utilities** - JavaScript functions for standardized data manipulation
2. **Data Structure Definitions** - Schemas and semantic type mappings
3. **Workflow Patterns** - Standardized SQL workflows for common tasks

## Core Modules

### Data Processing Utilities

Located in `includes/functions.js`, these utilities provide standardized approaches to:

- String transformation and standardization
- Data type conversion and casting
- Geospatial processing
- Hash-based identifiers

#### Key Functions

| Function | Description | Example Usage |
|----------|-------------|---------------|
| `transformStringColumn` | Cleans and standardizes string values | `${functions.transformStringColumn("email")}` |
| `dataCastInt` | Safely casts values to integers | `${functions.dataCastInt("age")}` |
| `cleanEmail` | Standardizes and validates email addresses | `${functions.cleanEmail("contact_email")}` |
| `toH3IndexPartitionKey` | Creates H3 geospatial indexes for efficient querying | `${functions.toH3IndexPartitionKey("lat", "lng")}` |

### Semantic Type System

Located in `includes/semantic_types.js`, this module provides consistent field type mappings across disparate data sources.

#### Benefits

- Consistently identifies fields across different naming conventions
- Enables automatic field detection and matching
- Simplifies integration of new data sources

#### Example

```javascript
// Check if a field is an email type
const isEmail = semanticTypes.isSemanticType("email_address", "email");

// Get the standardized type for a field
const fieldType = semanticTypes.getSemanticType("phone");
```

### Record Matching System

Located in `includes/matching_functions.js`, this system provides configurable and extensible record matching capabilities.

#### Features

- Multiple matching algorithms (exact, fuzzy, phonetic)
- Configurable matching thresholds
- Blocking strategies for performance
- Scoring models for match confidence

#### Example

```sql
-- Match customers across data sources
SELECT 
  source.*,
  target.*,
  ${matchingFunctions.jaroWinkler("source.name", "target.name")} AS name_similarity,
  ${matchingFunctions.phoneticCode("source.name")} = ${matchingFunctions.phoneticCode("target.name")} AS phonetic_match
FROM ${ref("source_customers")} source
JOIN ${ref("target_customers")} target
  ON ${matchingFunctions.generateBlockingKeys("source.zip", "exact")} = 
     ${matchingFunctions.generateBlockingKeys("target.zip", "exact")}
```

## Best Practices

### Package Usage

1. **Use Named Imports** - Import only what you need:
   ```javascript
   const { functions, semanticTypes } = require("marketads.dataform");
   ```

2. **Leverage Type System** - Use semantic types for consistency:
   ```javascript
   // Better than hard-coding field names
   if (semanticTypes.isSemanticType(fieldName, "email")) {
     // Process email
   }
   ```

3. **Follow Directory Structure** - Maintain the sources/intermediate/outputs pattern

### SQL Workflow Structure

1. **Sources** - Declare and minimally filter raw data:
   ```sql
   config { type: "declaration" }
   ```

2. **Intermediate** - Transform and clean data:
   ```sql
   config { type: "view" }
   
   SELECT
     ${functions.transformStringColumn("field")},
     ...
   FROM ${ref("source")}
   ```

3. **Outputs** - Create analytics-ready tables:
   ```sql
   config { 
     type: "table",
     bigquery: {
       partitionBy: "date_column",
       clusterBy: ["dimension1", "dimension2"]
     }
   }
   
   SELECT
     dimensions,
     metrics
   FROM ${ref("intermediate")}
   GROUP BY dimensions
   ```

## Extension

To extend this package:

1. Add new utility functions to appropriate modules
2. Ensure thorough documentation
3. Update the main `index.js` exports
4. Include examples in README.md 