/**
 * Multi-Table Waterfall Strategy Tests
 * 
 * These tests validate the functionality of the Multi-Table Waterfall matching strategy,
 * which prioritizes matches based on reference table priority and match confidence.
 */

const { TestType, TestPriority } = require('../../includes/validation/validation_registry');
const { withErrorHandling } = require('../../includes/validation/error_handler');
const { MultiTableTestFactory, DEFAULT_TEST_PARAMETERS } = require('../helpers/multi_table_test_factory');
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
  defaultParameters: {
    ...DEFAULT_TEST_PARAMETERS,
    sourceTable: "test_customer_data",
    factoryOptions: {
      useClassBasedFactoryPattern: true
    }
  }
});

// Define tests array
const tests = [
  // Basic multi-table waterfall test
  {
    id: 'multi_table_waterfall_basic_test',
    name: 'Basic Multi-Table Waterfall Test',
    description: 'Tests the basic functionality of the multi-table waterfall strategy',
    type: TestType.INTEGRATION,
    priority: TestPriority.HIGH,
    tags: ['multi-table', 'waterfall', 'basic'],
    parameters: {
      sourceTable: "test_customer_data",
      factoryOptions: {
        useClassBasedFactoryPattern: true
      }
    },
    testFn: multiTableTestFactory.createTest({}, validateBasicMultiTableStructure)
  },
  
  // Field mapping test
  {
    id: 'multi_table_waterfall_field_mapping_test',
    name: 'Multi-Table Waterfall Field Mapping Test',
    description: 'Tests field mapping functionality in the multi-table waterfall strategy',
    type: TestType.INTEGRATION,
    priority: TestPriority.MEDIUM,
    dependencies: ['multi_table_waterfall_basic_test'],
    tags: ['multi-table', 'waterfall', 'field-mapping'],
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
    },
    testFn: multiTableTestFactory.createTest({}, validateFieldMapping)
  },
  
  // Confidence multipliers test
  {
    id: 'multi_table_waterfall_confidence_test',
    name: 'Multi-Table Waterfall Confidence Test',
    description: 'Tests confidence multipliers in the multi-table waterfall strategy',
    type: TestType.INTEGRATION,
    priority: TestPriority.MEDIUM,
    dependencies: ['multi_table_waterfall_basic_test'],
    tags: ['multi-table', 'waterfall', 'confidence'],
    parameters: {
      sourceTable: "test_customer_data",
      confidenceMultipliers: {
        verified_customers: 1.5,
        crm_customers: 0.75
      }
    },
    testFn: multiTableTestFactory.createTest({}, validateConfidenceMultipliers)
  },
  
  // Required fields test
  {
    id: 'multi_table_waterfall_required_fields_test',
    name: 'Multi-Table Waterfall Required Fields Test',
    description: 'Tests required fields functionality in the multi-table waterfall strategy',
    type: TestType.INTEGRATION,
    priority: TestPriority.MEDIUM,
    dependencies: ['multi_table_waterfall_basic_test'],
    tags: ['multi-table', 'waterfall', 'required-fields'],
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
    },
    testFn: multiTableTestFactory.createTest({}, validateRequiredFields)
  },
  
  // Multiple matches test
  {
    id: 'multi_table_waterfall_multiple_matches_test',
    name: 'Multi-Table Waterfall Multiple Matches Test',
    description: 'Tests multiple matches functionality in the multi-table waterfall strategy',
    type: TestType.INTEGRATION,
    priority: TestPriority.MEDIUM,
    dependencies: ['multi_table_waterfall_basic_test'],
    tags: ['multi-table', 'waterfall', 'multiple-matches'],
    parameters: {
      sourceTable: "test_customer_data",
      allowMultipleMatches: true,
      maxMatches: 3
    },
    testFn: multiTableTestFactory.createTest({}, validateMultipleMatches)
  },
  
  // Large scale test with all options
  {
    id: 'multi_table_waterfall_large_scale_test',
    name: 'Multi-Table Waterfall Large Scale Test',
    description: 'Tests the multi-table waterfall strategy with all options enabled',
    type: TestType.INTEGRATION,
    priority: TestPriority.LOW,
    dependencies: [
      'multi_table_waterfall_basic_test',
      'multi_table_waterfall_field_mapping_test',
      'multi_table_waterfall_confidence_test',
      'multi_table_waterfall_required_fields_test',
      'multi_table_waterfall_multiple_matches_test'
    ],
    tags: ['multi-table', 'waterfall', 'comprehensive'],
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
          { sourceField: "first_name", targetField: "first_name_mapped" },
          { sourceField: "last_name", targetField: "last_name_mapped" },
          { sourceField: "email", targetField: "email_mapped" }
        ],
        crm_customers: [
          { sourceField: "first_name", targetField: "fname_mapped" },
          { sourceField: "last_name", targetField: "lname_mapped" },
          { sourceField: "phone", targetField: "phone_mapped" }
        ],
        marketing_customers: [
          { sourceField: "first_name", targetField: "first_name_mapped" },
          { sourceField: "last_name", targetField: "last_name_mapped" },
          { sourceField: "email", targetField: "email_address_mapped" }
        ]
      },
      requiredFields: {
        verified_customers: ["email", "first_name"],
        crm_customers: ["phone", "fname"],
        marketing_customers: ["email_address"]
      },
      confidenceMultipliers: {
        verified_customers: 1.5,
        crm_customers: 0.8,
        marketing_customers: 1.2
      },
      allowMultipleMatches: true,
      maxMatches: 5,
      thresholds: {
        high: 0.9,
        medium: 0.75,
        low: 0.6
      }
    },
    testFn: multiTableTestFactory.createTest({}, validateComprehensive)
  }
];

// Export tests
module.exports = { tests };