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
      useClassBasedFactoryPattern: true,
      initializeData: true,
      validateResult: true
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
        }
      ],
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
        }
      },
      thresholds: {
        high: 0.85,
        medium: 0.7,
        low: 0.55
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
      fieldMappings: {
        verified_customers: [
          {
            sourceField: "first_name",
            targetField: "first_name_custom",
            type: "firstName"
          },
          {
            sourceField: "last_name",
            targetField: "last_name_custom",
            type: "lastName"
          }
        ],
        crm_customers: [
          {
            sourceField: "fname",
            targetField: "first_name_custom",
            type: "firstName"
          },
          {
            sourceField: "lname",
            targetField: "last_name_custom",
            type: "lastName"
          }
        ]
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
              targetField: "first_name_custom",
              method: "jaro_winkler",
              weight: 1.5
            },
            {
              sourceField: "last_name",
              targetField: "last_name_custom",
              method: "jaro_winkler",
              weight: 2
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
              sourceField: "fname",
              targetField: "first_name_custom",
              method: "jaro_winkler",
              weight: 1.5
            },
            {
              sourceField: "lname",
              targetField: "last_name_custom",
              method: "jaro_winkler",
              weight: 2
            }
          ]
        }
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
            }
          ]
        }
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
              sourceField: "phone",
              targetField: "phone_number",
              method: "exact",
              weight: 2.5
            }
          ]
        }
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
      maxMatches: 3,
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
            }
          ]
        }
      }
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
        }
      },
      fieldMappings: {
        verified_customers: [
          {
            sourceField: "first_name",
            targetField: "first_name_mapped",
            type: "firstName"
          },
          {
            sourceField: "last_name",
            targetField: "last_name_mapped",
            type: "lastName"
          }
        ],
        crm_customers: [
          {
            sourceField: "fname",
            targetField: "first_name_mapped",
            type: "firstName"
          },
          {
            sourceField: "lname",
            targetField: "last_name_mapped",
            type: "lastName"
          }
        ]
      },
      requiredFields: {
        verified_customers: ["email", "first_name"],
        crm_customers: ["phone", "lname"]
      },
      confidenceMultipliers: {
        verified_customers: 1.2,
        crm_customers: 0.9
      },
      allowMultipleMatches: true,
      maxMatches: 3,
      thresholds: {
        high: 0.85,
        medium: 0.7,
        low: 0.55
      }
    },
    testFn: multiTableTestFactory.createTest({}, validateComprehensive)
  }
];

// Export tests array
module.exports = { tests };