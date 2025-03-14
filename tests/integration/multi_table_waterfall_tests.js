/**
 * Multi-Table Waterfall Strategy Tests
 * 
 * These tests validate the functionality of the Multi-Table Waterfall matching strategy,
 * which prioritizes matches based on reference table priority and match confidence.
 */

const { test, describe } = require('../test_framework');
const { TestType } = require('../test_types');
const { withErrorHandling } = require('../../includes/validation/test_helpers');
const { MultiTableTestFactory } = require('../helpers/multi_table_test_factory');
const { 
  validateBasicMultiTableStructure,
  validateFieldMapping,
  validateConfidenceMultipliers,
  validateRequiredFields,
  validateMultipleMatches,
  validateComprehensive
} = require('../helpers/multi_table_validators');

// Create test factory instance with standardized options
const multiTableTestFactory = new MultiTableTestFactory({
  defaultSourceTable: "test_customer_data",
  defaultReferenceTables: [
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
    }
  ],
  defaultOptions: {
    confidenceThreshold: 0.75,
    allowMultipleMatches: false,
    maxMatches: 1
  }
});

// Define test suite
describe('Multi-Table Waterfall Strategy Tests', () => {
  // Basic multi-table waterfall test
  test('Basic Multi-Table Waterfall Test', {
    type: TestType.INTEGRATION,
    id: 'multi_table_waterfall_basic_test',
    priority: 1,
    parameters: {
      sourceTable: "test_customer_data",
      factoryOptions: {
        useClassBasedFactoryPattern: true
      }
    }
  }, multiTableTestFactory.createTest({}, validateBasicMultiTableStructure));
  
  // Field mapping test
  test('Multi-Table Waterfall Field Mapping Test', {
    type: TestType.INTEGRATION,
    id: 'multi_table_waterfall_field_mapping_test',
    priority: 2,
    dependencies: ['multi_table_waterfall_basic_test'],
    parameters: {
      sourceTable: "test_customer_data",
      factoryOptions: {
        useClassBasedFactoryPattern: true
      },
      fieldMappings: {
        verified_customers: [
          {
            sourceField: "first_name",
            targetField: "first_name_custom"
          },
          {
            sourceField: "last_name",
            targetField: "last_name_custom"
          }
        ],
        crm_customers: [
          {
            sourceField: "fname",
            targetField: "first_name_custom"
          },
          {
            sourceField: "lname",
            targetField: "last_name_custom"
          }
        ]
      }
    }
  }, multiTableTestFactory.createTest({}, validateFieldMapping));
  
  // Confidence multipliers test
  test('Multi-Table Waterfall Confidence Test', {
    type: TestType.INTEGRATION,
    id: 'multi_table_waterfall_confidence_test',
    priority: 2,
    dependencies: ['multi_table_waterfall_basic_test'],
    parameters: {
      sourceTable: "test_customer_data",
      confidenceMultipliers: {
        verified_customers: 1.5,
        crm_customers: 0.75
      }
    }
  }, multiTableTestFactory.createTest({}, validateConfidenceMultipliers));
  
  // Required fields test
  test('Multi-Table Waterfall Required Fields Test', {
    type: TestType.INTEGRATION,
    id: 'multi_table_waterfall_required_fields_test',
    priority: 2,
    dependencies: ['multi_table_waterfall_basic_test'],
    parameters: {
      sourceTable: "test_customer_data",
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
  }, multiTableTestFactory.createTest({}, validateRequiredFields));
  
  // Multiple matches test
  test('Multi-Table Waterfall Multiple Matches Test', {
    type: TestType.INTEGRATION,
    id: 'multi_table_waterfall_multiple_matches_test',
    priority: 2,
    dependencies: ['multi_table_waterfall_basic_test'],
    parameters: {
      sourceTable: "test_customer_data",
      allowMultipleMatches: true,
      maxMatches: 3
    }
  }, multiTableTestFactory.createTest({}, validateMultipleMatches));
  
  // Large scale test with all options
  test('Multi-Table Waterfall Large Scale Test', {
    type: TestType.INTEGRATION,
    id: 'multi_table_waterfall_large_scale_test',
    priority: 3,
    dependencies: [
      'multi_table_waterfall_basic_test',
      'multi_table_waterfall_field_mapping_test',
      'multi_table_waterfall_confidence_test',
      'multi_table_waterfall_required_fields_test',
      'multi_table_waterfall_multiple_matches_test'
    ],
    parameters: {
      sourceTable: "test_customers_combined",
      factoryOptions: {
        useClassBasedFactoryPattern: true,
        initializeData: true,
        validateResult: true
      },
      matchingRules: {
        verified_customers: {
          blocking: [
            {
              sourceField: "postal_code",
              targetField: "postal_code",
              exact: true
            }
          ],
          scoring: [
            {
              sourceField: "first_name",
              targetField: "first_name",
              method: "jaro_winkler",
              weight: 1.5
            },
            {
              sourceField: "last_name",
              targetField: "last_name",
              method: "jaro_winkler",
              weight: 2
            },
            {
              sourceField: "email",
              targetField: "email",
              method: "exact",
              weight: 3
            }
          ]
        },
        crm_customers: {
          blocking: [
            {
              sourceField: "postal_code",
              targetField: "zip",
              exact: true
            }
          ],
          scoring: [
            {
              sourceField: "first_name",
              targetField: "fname",
              method: "jaro_winkler",
              weight: 1.5
            },
            {
              sourceField: "last_name",
              targetField: "lname",
              method: "jaro_winkler",
              weight: 2
            },
            {
              sourceField: "phone",
              targetField: "phone_number",
              method: "exact",
              weight: 2.5
            }
          ]
        },
        marketing_customers: {
          blocking: [
            {
              sourceField: "postal_code",
              targetField: "zip_code",
              exact: true
            }
          ],
          scoring: [
            {
              sourceField: "first_name",
              targetField: "first_name",
              method: "jaro_winkler",
              weight: 1.5
            },
            {
              sourceField: "last_name",
              targetField: "last_name",
              method: "jaro_winkler",
              weight: 2
            },
            {
              sourceField: "email",
              targetField: "email_address",
              method: "exact",
              weight: 3
            }
          ]
        }
      },
      fieldMappings: {
        verified_customers: [
          {
            sourceField: "first_name",
            targetField: "first_name_mapped"
          },
          {
            sourceField: "last_name",
            targetField: "last_name_mapped"
          },
          {
            sourceField: "email",
            targetField: "email_mapped"
          }
        ],
        crm_customers: [
          {
            sourceField: "fname",
            targetField: "first_name_mapped"
          },
          {
            sourceField: "lname",
            targetField: "last_name_mapped"
          },
          {
            sourceField: "phone_number",
            targetField: "phone_mapped"
          }
        ],
        marketing_customers: [
          {
            sourceField: "first_name",
            targetField: "first_name_mapped"
          },
          {
            sourceField: "last_name",
            targetField: "last_name_mapped"
          },
          {
            sourceField: "email_address",
            targetField: "email_mapped"
          }
        ]
      },
      requiredFields: {
        verified_customers: [
          "email"
        ],
        crm_customers: [
          "phone"
        ],
        marketing_customers: [
          "email_address"
        ]
      },
      confidenceMultipliers: {
        verified_customers: 1.2,
        crm_customers: 0.9,
        marketing_customers: 0.8
      },
      allowMultipleMatches: true,
      maxMatches: 2,
      confidenceField: "match_confidence",
      thresholds: {
        high: 0.9,
        medium: 0.75,
        low: 0.6
      }
    }
  }, multiTableTestFactory.createTest({
    beforeTest: (context) => {
      // Initialize test data for all reference tables
      if (context.parameters.factoryOptions?.initializeData) {
        return multiTableTestFactory.initializeTestData(context);
      }
      return context;
    },
    afterTest: (context, result) => {
      // Perform additional validation on test results
      if (context.parameters.factoryOptions?.validateResult) {
        return multiTableTestFactory.validateTestResults(context, result);
      }
      return result;
    }
  }, validateComprehensive));
  
  // Custom validation test with specific assertions
  test('Multi-Table Waterfall Custom Validation Test', {
    type: TestType.INTEGRATION,
    id: 'multi_table_waterfall_custom_validation_test',
    priority: 2,
    dependencies: ['multi_table_waterfall_basic_test'],
    parameters: {
      sourceTable: "test_customer_data_custom"
    }
  }, withErrorHandling(async function(context) {
    const { parameters } = context;
    
    // Create test with custom validation
    const testFn = multiTableTestFactory.createTest({}, (sql, params) => {
      // Basic validation
      validateBasicMultiTableStructure(sql, params);
      
      // Custom validations
      expect(sql.includes('test_customer_data_custom')).toBe(true);
      expect(sql.includes('ORDER BY')).toBe(true);
      expect(sql.includes('match_rank = 1')).toBe(true);
      
      return {
        success: true,
        message: 'Custom validation passed'
      };
    });
    
    // Execute the test function
    return testFn(context);
  }));
});

// Export test suite
module.exports = {};