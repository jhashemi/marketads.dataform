/**
 * Multi-Table Waterfall Strategy Edge Case Tests
 * 
 * These tests validate the Multi-Table Waterfall strategy's behavior in edge cases,
 * boundary conditions, and unusual scenarios that might cause failures if not properly handled.
 */

const { test, describe } = require('../test_framework');
const { TestType } = require('../test_types');
const { withErrorHandling } = require('../../includes/validation/test_helpers');
const { MultiTableTestFactory } = require('../helpers/multi_table_test_factory');
const { 
  validateBasicMultiTableStructure,
  validateComprehensive
} = require('../helpers/multi_table_validators');
const { validateSQL } = require('../../includes/validation/sql_validators');

// Create test factory instance
const multiTableTestFactory = new MultiTableTestFactory();

// Custom validators for edge cases
const validateEmptyReferenceTable = (sql, parameters) => {
  // Basic validation
  validateBasicMultiTableStructure(sql, parameters);
  
  // Check for proper handling of empty reference tables
  expect(sql.includes('EXISTS')).toBe(true);
  expect(sql.includes('COUNT')).toBe(true);
  
  return {
    success: true,
    message: 'Empty reference table handling validation passed'
  };
};

const validateMissingFields = (sql, parameters) => {
  // Basic validation
  validateBasicMultiTableStructure(sql, parameters);
  
  // Check for COALESCE or IFNULL usage to handle missing fields
  expect(sql.includes('COALESCE') || sql.includes('IFNULL')).toBe(true);
  
  return {
    success: true,
    message: 'Missing fields handling validation passed'
  };
};

const validateSpecialCharacters = (sql, parameters) => {
  // Basic validation
  validateBasicMultiTableStructure(sql, parameters);
  
  // Check that field names with special characters are properly quoted
  for (const tableName of Object.keys(parameters.fieldMappings || {})) {
    for (const mapping of parameters.fieldMappings[tableName] || []) {
      if (mapping.sourceField.includes('-') || mapping.targetField.includes('-')) {
        expect(sql.includes('`')).toBe(true);
      }
    }
  }
  
  return {
    success: true,
    message: 'Special character handling validation passed'
  };
};

// Define edge case test suite
describe('Multi-Table Waterfall Strategy Edge Cases', () => {
  // Test with empty reference table
  test('Empty Reference Table Test', {
    type: TestType.INTEGRATION,
    id: 'multi_table_waterfall_empty_reference_test',
    priority: 2,
    dependencies: ['multi_table_waterfall_basic_test'],
    parameters: {
      sourceTable: "test_customer_data",
      referenceTables: [
        {
          id: "verified_customers",
          table: "verified_customers_empty",
          name: "Empty Verified Customers",
          keyField: "customer_id",
          priority: 1
        },
        {
          id: "crm_customers",
          table: "crm_customers",
          name: "CRM Customers",
          keyField: "customer_id",
          priority: 2
        }
      ]
    }
  }, multiTableTestFactory.createTest({}, validateEmptyReferenceTable));
  
  // Test with missing required fields
  test('Missing Required Fields Test', {
    type: TestType.INTEGRATION,
    id: 'multi_table_waterfall_missing_fields_test',
    priority: 2,
    dependencies: ['multi_table_waterfall_basic_test'],
    parameters: {
      sourceTable: "test_customer_data_missing_fields",
      requiredFields: {
        verified_customers: [
          "email",
          "first_name"
        ],
        crm_customers: [
          "phone",
          "lname"
        ]
      }
    }
  }, multiTableTestFactory.createTest({}, validateMissingFields));
  
  // Test with special characters in field names
  test('Special Characters in Field Names Test', {
    type: TestType.INTEGRATION,
    id: 'multi_table_waterfall_special_chars_test',
    priority: 2,
    dependencies: ['multi_table_waterfall_basic_test'],
    parameters: {
      sourceTable: "test_customer_data",
      fieldMappings: {
        verified_customers: [
          {
            sourceField: "first-name",
            targetField: "first_name_mapped"
          },
          {
            sourceField: "last_name",
            targetField: "last-name-mapped"
          }
        ],
        crm_customers: [
          {
            sourceField: "fname",
            targetField: "first-name-mapped"
          },
          {
            sourceField: "last-name",
            targetField: "last_name_mapped"
          }
        ]
      }
    }
  }, multiTableTestFactory.createTest({}, validateSpecialCharacters));
  
  // Test with extreme threshold values
  test('Extreme Threshold Values Test', {
    type: TestType.INTEGRATION,
    id: 'multi_table_waterfall_extreme_thresholds_test',
    priority: 2,
    dependencies: ['multi_table_waterfall_basic_test'],
    parameters: {
      sourceTable: "test_customer_data",
      thresholds: {
        high: 0.99,
        medium: 0.98,
        low: 0.97
      }
    }
  }, multiTableTestFactory.createTest({}, (sql, parameters) => {
    // Validate SQL has the extreme thresholds
    validateBasicMultiTableStructure(sql, parameters);
    expect(sql.includes('>= 0.99')).toBe(true);
    expect(sql.includes('>= 0.98')).toBe(true);
    expect(sql.includes('>= 0.97')).toBe(true);
    
    return {
      success: true,
      message: 'Extreme threshold validation passed'
    };
  }));
  
  // Test with extreme confidence multipliers
  test('Extreme Confidence Multipliers Test', {
    type: TestType.INTEGRATION,
    id: 'multi_table_waterfall_extreme_confidence_test',
    priority: 2,
    dependencies: ['multi_table_waterfall_basic_test'],
    parameters: {
      sourceTable: "test_customer_data",
      confidenceMultipliers: {
        verified_customers: 10.0,
        crm_customers: 0.01
      }
    }
  }, multiTableTestFactory.createTest({}, (sql, parameters) => {
    // Validate SQL has the extreme multipliers
    validateBasicMultiTableStructure(sql, parameters);
    expect(sql.includes('* 10.0')).toBe(true);
    expect(sql.includes('* 0.01')).toBe(true);
    
    return {
      success: true,
      message: 'Extreme confidence multiplier validation passed'
    };
  }));
  
  // Test with large number of reference tables
  test('Large Number of Reference Tables Test', {
    type: TestType.INTEGRATION,
    id: 'multi_table_waterfall_many_tables_test',
    priority: 3,
    dependencies: ['multi_table_waterfall_basic_test'],
    parameters: {
      sourceTable: "test_customer_data",
      referenceTables: [
        {
          id: "verified_customers",
          table: "verified_customers",
          name: "Verified Customers",
          keyField: "customer_id",
          priority: 1
        },
        {
          id: "crm_customers",
          table: "crm_customers",
          name: "CRM Customers",
          keyField: "customer_id",
          priority: 2
        },
        {
          id: "marketing_customers",
          table: "marketing_customers",
          name: "Marketing Customers",
          keyField: "lead_id",
          priority: 3
        },
        {
          id: "web_customers",
          table: "web_customers",
          name: "Web Customers",
          keyField: "user_id",
          priority: 4
        },
        {
          id: "loyalty_customers",
          table: "loyalty_customers",
          name: "Loyalty Customers",
          keyField: "member_id",
          priority: 5
        },
        {
          id: "social_customers",
          table: "social_customers",
          name: "Social Customers",
          keyField: "profile_id",
          priority: 6
        },
        {
          id: "sales_customers",
          table: "sales_customers",
          name: "Sales Customers",
          keyField: "customer_id",
          priority: 7
        }
      ],
      matchingRules: {
        verified_customers: {
          blocking: [{ sourceField: "postal_code", targetField: "postal_code", exact: true }],
          scoring: [
            { sourceField: "first_name", targetField: "first_name", method: "jaro_winkler", weight: 1.5 },
            { sourceField: "last_name", targetField: "last_name", method: "jaro_winkler", weight: 2.0 },
            { sourceField: "email", targetField: "email", method: "exact", weight: 3.0 }
          ]
        },
        crm_customers: {
          blocking: [{ sourceField: "postal_code", targetField: "zip", exact: true }],
          scoring: [
            { sourceField: "first_name", targetField: "fname", method: "jaro_winkler", weight: 1.5 },
            { sourceField: "last_name", targetField: "lname", method: "jaro_winkler", weight: 2.0 },
            { sourceField: "phone", targetField: "phone_number", method: "exact", weight: 2.5 }
          ]
        },
        marketing_customers: {
          blocking: [{ sourceField: "postal_code", targetField: "zip_code", exact: true }],
          scoring: [
            { sourceField: "first_name", targetField: "first_name", method: "jaro_winkler", weight: 1.5 },
            { sourceField: "last_name", targetField: "last_name", method: "jaro_winkler", weight: 2.0 },
            { sourceField: "email", targetField: "email_address", method: "exact", weight: 3.0 }
          ]
        },
        web_customers: {
          blocking: [{ sourceField: "postal_code", targetField: "postal_code", exact: true }],
          scoring: [
            { sourceField: "first_name", targetField: "first_name", method: "jaro_winkler", weight: 1.5 },
            { sourceField: "last_name", targetField: "last_name", method: "jaro_winkler", weight: 2.0 },
            { sourceField: "email", targetField: "email", method: "exact", weight: 3.0 }
          ]
        },
        loyalty_customers: {
          blocking: [{ sourceField: "postal_code", targetField: "zip", exact: true }],
          scoring: [
            { sourceField: "first_name", targetField: "first_name", method: "jaro_winkler", weight: 1.5 },
            { sourceField: "last_name", targetField: "last_name", method: "jaro_winkler", weight: 2.0 },
            { sourceField: "phone", targetField: "phone", method: "exact", weight: 2.5 }
          ]
        },
        social_customers: {
          blocking: [{ sourceField: "postal_code", targetField: "postal_code", exact: true }],
          scoring: [
            { sourceField: "first_name", targetField: "name", method: "jaro_winkler", weight: 1.5 },
            { sourceField: "last_name", targetField: "surname", method: "jaro_winkler", weight: 2.0 },
            { sourceField: "email", targetField: "email", method: "exact", weight: 3.0 }
          ]
        },
        sales_customers: {
          blocking: [{ sourceField: "postal_code", targetField: "postal_code", exact: true }],
          scoring: [
            { sourceField: "first_name", targetField: "first_name", method: "jaro_winkler", weight: 1.5 },
            { sourceField: "last_name", targetField: "last_name", method: "jaro_winkler", weight: 2.0 },
            { sourceField: "phone", targetField: "phone_number", method: "exact", weight: 2.5 }
          ]
        }
      }
    }
  }, multiTableTestFactory.createTest({}, (sql, parameters) => {
    // Validate SQL has all reference tables
    validateBasicMultiTableStructure(sql, parameters);
    
    // Check that all reference tables are included
    const referenceTableCount = parameters.referenceTables.length;
    expect(referenceTableCount).toBeGreaterThan(5); // Should have at least 6 tables
    
    // Verify that all tables are in the SQL
    for (const refTable of parameters.referenceTables) {
      expect(sql.includes(`FROM ${refTable.table}`)).toBe(true);
    }
    
    // Check for multiple UNION ALL statements (should be referenceTableCount - 1)
    const unionMatches = (sql.match(/UNION ALL/g) || []).length;
    expect(unionMatches).toBe(referenceTableCount - 1);
    
    return {
      success: true,
      message: 'Many reference tables validation passed'
    };
  }));
  
  // Test with no matching rules for a table (should throw error during validation)
  test('Missing Matching Rules Test', {
    type: TestType.INTEGRATION,
    id: 'multi_table_waterfall_missing_rules_test',
    priority: 2,
    dependencies: ['multi_table_waterfall_basic_test'],
    parameters: {
      sourceTable: "test_customer_data",
      referenceTables: [
        {
          id: "verified_customers",
          table: "verified_customers",
          name: "Verified Customers",
          keyField: "customer_id",
          priority: 1
        },
        {
          id: "unknown_customers",
          table: "unknown_customers",
          name: "Unknown Customers",
          keyField: "customer_id",
          priority: 2
        }
      ],
      // Only include rules for verified_customers, missing rules for unknown_customers
      matchingRules: {
        verified_customers: {
          blocking: [{ sourceField: "postal_code", targetField: "postal_code", exact: true }],
          scoring: [
            { sourceField: "first_name", targetField: "first_name", method: "jaro_winkler", weight: 1.5 },
            { sourceField: "last_name", targetField: "last_name", method: "jaro_winkler", weight: 2.0 },
            { sourceField: "email", targetField: "email", method: "exact", weight: 3.0 }
          ]
        }
      }
    }
  }, withErrorHandling(async function(context) {
    try {
      // This should throw an error during validation
      const testFn = multiTableTestFactory.createTest({}, validateBasicMultiTableStructure);
      await testFn(context);
      throw new Error('Expected validation to fail but it passed');
    } catch (error) {
      // Verify that the error is about missing matching rules
      expect(error.message).toContain('matching rules');
      return {
        success: true,
        message: 'Validation correctly identified missing matching rules'
      };
    }
  }));
});

// Export the test suite
module.exports = {}; 