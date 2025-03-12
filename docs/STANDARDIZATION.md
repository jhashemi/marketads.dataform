# Field Standardization Library

## Purpose

The Field Standardization Library provides SQL templates for standardizing different field types in BigQuery to ensure consistent comparison of data across different sources. This is particularly useful for:

- Record matching and deduplication
- Data integration from multiple sources 
- Data quality and consistency checks
- Customer data unification

## Available Standardization Functions

The library offers specialized standardization for different field types:

| Function | Description |
|----------|-------------|
| `standardizeString` | Basic string standardization with options for trimming, case conversion, and character filtering |
| `standardizeName` | Name-specific standardization with prefix/suffix removal |
| `standardizeEmail` | Email-specific standardization (lowercase, trim) |
| `standardizePhone` | Phone number standardization with digit extraction and formatting |
| `standardizeAddress` | Address standardization with street type normalization and directional standardization |
| `standardizeZip` | ZIP/Postal code standardization |
| `standardizeDate` | Date standardization with format conversion |
| `standardizeField` | Unified function that applies appropriate standardization based on field type |

## Usage Examples

### Basic String Standardization

```javascript
const { standardizeString } = require('../includes/sql/standardization');

// Generate SQL to trim and uppercase a field
const sql = standardizeString('customer_name', {
  trim: true,
  uppercase: true
});
// Result: UPPER(TRIM(IFNULL(customer_name, '')))
```

### Name Standardization

```javascript
const { standardizeName } = require('../includes/sql/standardization');

// Generate SQL to standardize a name field, removing prefixes and suffixes
const sql = standardizeName('full_name', {
  removePrefix: true,  // Remove Mr, Mrs, Dr, etc.
  removeSuffix: true   // Remove Jr, Sr, III, etc.
});
```

### Address Standardization

```javascript
const { standardizeAddress } = require('../includes/sql/standardization');

// Generate SQL to standardize an address field
const sql = standardizeAddress('address_line1', {
  standardizeStreetTypes: true,     // STREET -> ST, AVENUE -> AVE, etc.
  standardizeDirectionals: true,    // NORTH -> N, SOUTHEAST -> SE, etc.
  removeApartment: true,            // Remove apartment/unit numbers
  uppercase: true                   // Convert to uppercase
});
```

### Unified Field Standardization

```javascript
const { standardizeField } = require('../includes/sql/standardization');

// Generate SQL based on field type
const nameSql = standardizeField('first_name', 'first_name');
const emailSql = standardizeField('email_address', 'email');
const phoneSql = standardizeField('phone_number', 'phone', { lastFourOnly: true });
const zipSql = standardizeField('zip_code', 'zip', { firstFiveOnly: true });
const dobSql = standardizeField('birth_date', 'date_of_birth', { format: 'DATE' });
```

## Integration with SQL Templates

The standardization functions can be integrated into SQL templates:

```javascript
const { standardizeEmail, standardizePhone } = require('../includes/sql/standardization');

function generateMatchingQuery(sourceTable, targetTable) {
  return `
    SELECT 
      s.customer_id AS source_id,
      t.customer_id AS target_id,
      -- Use standardized fields for comparison
      ${standardizeEmail('s.email')} = ${standardizeEmail('t.email')} AS email_match,
      ${standardizePhone('s.phone')} = ${standardizePhone('t.phone')} AS phone_match
    FROM ${sourceTable} s
    JOIN ${targetTable} t ON
      -- Join conditions using standardized fields
      ${standardizeEmail('s.email')} = ${standardizeEmail('t.email')}
      OR ${standardizePhone('s.phone', { lastFourOnly: true })} = ${standardizePhone('t.phone', { lastFourOnly: true })}
  `;
}
```

## Advanced Configuration

Each standardization function supports specific options:

- **standardizeString**: `trim`, `uppercase`, `lowercase`, `removeNonAlpha`, `removeNonAlphaNumeric`, `removeWhitespace`
- **standardizeName**: `removePrefix`, `removeSuffix`
- **standardizePhone**: `digitsOnly`, `lastFourOnly`
- **standardizeAddress**: `standardizeStreetTypes`, `standardizeDirectionals`, `removeApartment`, `uppercase`
- **standardizeZip**: `firstFiveOnly`, `digitsOnly`
- **standardizeDate**: `format` (options: 'DATE', 'TIMESTAMP', 'STRING')

## Implementation Notes

- All functions generate SQL strings that can be embedded in larger SQL queries
- BigQuery-specific functions and syntax are used
- NULL values are handled safely with IFNULL and SAFE_CAST functions
- Regular expressions are used for pattern matching and standardization 