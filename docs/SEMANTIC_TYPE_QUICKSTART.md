# Semantic Type Detection and Field Mapping Quick Start Guide

This guide provides a quick introduction to using the semantic type detection and field mapping system for standardizing data in your Dataform projects.

## Table of Contents

1. [Introduction](#introduction)
2. [Basic Usage](#basic-usage)
3. [Advanced Usage](#advanced-usage)
4. [Common Patterns](#common-patterns)
5. [Troubleshooting](#troubleshooting)

## Introduction

The semantic type detection and field mapping system automatically identifies field types (email, phone, name, etc.) and applies standardization rules. It also helps map fields between source and target tables based on semantic similarity.

### Key Components

- **Semantic Types Module**: Detects and standardizes field types
- **Field Mapping Factory**: Maps fields between source and target tables
- **Error Logging**: Tracks issues in type detection and mapping

## Basic Usage

### Importing Required Modules

```javascript
const semanticTypes = require("../includes/semantic_types");
const fieldMappingFactory = require("../includes/field_mapping_factory");
```

### Detecting and Standardizing a Field

```sql
-- Standardize an email field
SELECT ${semanticTypes.getStandardizationExpression("email", "email_address")} AS standardized_email
FROM your_table
```

### Mapping Fields Between Tables

```sql
-- Map source fields to target fields
WITH mapped_data AS (
  SELECT
    ${fieldMappingFactory.createFieldMappings(
      ['customer_name', 'email_addr', 'phone_number'], 
      ['name', 'email', 'phone'],
      {useSemantic: true}
    )}
  FROM source_table
)

SELECT * FROM mapped_data
```

## Advanced Usage

### Custom Mapping with Semantic Type Detection

```sql
WITH source_data AS (
  SELECT * FROM ${ref("source_table")}
),

mapped_data AS (
  SELECT
    id,
    ${semanticTypes.getStandardizationExpression("email", "email_field")} AS email,
    ${semanticTypes.getStandardizationExpression("phone", "phone_field")} AS phone,
    ${semanticTypes.getStandardizationExpression("name", "customer_name")} AS name,
    ${semanticTypes.getStandardizationExpression("date", "dob")} AS date_of_birth
  FROM source_data
)

SELECT * FROM mapped_data
```

### Incremental Processing with Standardization

```sql
config {
  type: "incremental",
  uniqueKey: ["id"]
}

SELECT
  id,
  ${semanticTypes.getStandardizationExpression("email", "email")} AS standardized_email,
  ${semanticTypes.getStandardizationExpression("phone", "phone")} AS standardized_phone,
  current_timestamp() as processed_at
FROM ${ref("source_table")}
WHERE true
${when(incremental(), `AND updated_at > (SELECT MAX(processed_at) FROM ${self()})`)}
```

### Creating Optimized Materialized Views

```sql
config {
  type: "table",
  bigquery: {
    partitionBy: "date",
    clusterBy: ["region"]
  }
}

WITH standardized_data AS (
  SELECT
    customer_id,
    ${semanticTypes.getStandardizationExpression("email", "email")} AS email,
    ${semanticTypes.getStandardizationExpression("phone", "phone")} AS phone,
    date,
    region
  FROM ${ref("source_table")}
)

SELECT * FROM standardized_data
```

## Common Patterns

### Standardizing a Set of Common Fields

```sql
WITH source_data AS (
  SELECT * FROM ${ref("source_table")}
),

standardized_data AS (
  SELECT
    -- Standard fields with semantic type detection
    ${semanticTypes.getStandardizationExpression("email", "email")} AS email,
    ${semanticTypes.getStandardizationExpression("phone", "phone")} AS phone,
    ${semanticTypes.getStandardizationExpression("name", "customer_name")} AS name,
    ${semanticTypes.getStandardizationExpression("address", "address")} AS address,
    ${semanticTypes.getStandardizationExpression("postal_code", "zip")} AS postal_code,
    ${semanticTypes.getStandardizationExpression("city", "city")} AS city,
    ${semanticTypes.getStandardizationExpression("state_code", "state")} AS state_code,
    
    -- Other fields (unchanged)
    customer_id,
    account_number,
    create_date
  FROM source_data
)

SELECT * FROM standardized_data
```

### Automated Field Mapping for Different Source Systems

```sql
-- Map fields from source system A
WITH system_a_data AS (
  SELECT
    ${fieldMappingFactory.createFieldMappings(
      sourceFields = ['cust_id', 'cust_email', 'cust_phone', 'cust_name'],
      targetFields = ['customer_id', 'email', 'phone', 'name'],
      {useSemantic: true, sourceTable: 'system_a'}
    )}
  FROM ${ref("system_a_table")}
),

-- Map fields from source system B
system_b_data AS (
  SELECT
    ${fieldMappingFactory.createFieldMappings(
      sourceFields = ['id', 'email_address', 'telephone', 'full_name'],
      targetFields = ['customer_id', 'email', 'phone', 'name'],
      {useSemantic: true, sourceTable: 'system_b'}
    )}
  FROM ${ref("system_b_table")}
),

-- Combine data from both systems
combined_data AS (
  SELECT *, 'system_a' as source_system FROM system_a_data
  UNION ALL
  SELECT *, 'system_b' as source_system FROM system_b_data
)

SELECT * FROM combined_data
```

## Troubleshooting

### Common Issues

1. **Incorrect Type Detection**: If fields are detected as the wrong type, use explicit type specification:

```sql
-- Force a specific semantic type
${semanticTypes.getStandardizationExpression("email", "contact_info")} AS email
```

2. **Low Mapping Accuracy**: If field mapping produces incorrect results, check the mapping telemetry:

```sql
SELECT * FROM ${ref("mapping_telemetry")}
WHERE mapping_accuracy < 0.8
ORDER BY timestamp DESC
LIMIT 10
```

3. **Error Tracking**: Review error logs for issues:

```sql
SELECT * FROM ${ref("error_log")}
WHERE error_type = 'semantic_type_detection'
ORDER BY timestamp DESC
LIMIT 10
```

### Performance Optimization

For frequently used standardization patterns, consider creating materialized views to improve performance:

```sql
config {
  type: "table",
  bigquery: {
    partitionBy: "process_date"
  }
}

SELECT
  id,
  ${semanticTypes.getStandardizationExpression("email", "email")} AS email,
  ${semanticTypes.getStandardizationExpression("phone", "phone")} AS phone,
  CURRENT_DATE() as process_date
FROM ${ref("source_table")}
``` 