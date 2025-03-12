/**
 * Test Generator for Record Matching System
 * 
 * Provides functionality to generate test cases for common matching scenarios,
 * edge cases, and specific matching challenges.
 */

/**
 * Generates a name variation test case
 * @param {string} testName - Test case name
 * @param {Object} options - Test case options
 * @returns {Object} - Complete test case
 */
function generateNameVariationTestCase(testName, options = {}) {
  const baseSourceRecords = [
    { id: "s1", first_name: "John", last_name: "Smith", email: "john.smith@example.com" },
    { id: "s2", first_name: "Michael", last_name: "Johnson", email: "mjohnson@example.com" },
    { id: "s3", first_name: "Robert", last_name: "Williams", email: "rwilliams@example.com" },
    { id: "s4", first_name: "James", last_name: "Brown", email: "james.brown@example.com" },
    { id: "s5", first_name: "Mary", last_name: "Jones", email: "mary.jones@example.com" }
  ];
  
  const baseTargetRecords = [
    { id: "t1", first_name: "Johnny", last_name: "Smith", email: "john.smith@example.com" },
    { id: "t2", first_name: "Mike", last_name: "Johnson", email: "mike.johnson@example.com" },
    { id: "t3", first_name: "Bob", last_name: "Williams", email: "robert.williams@example.com" },
    { id: "t4", first_name: "Jim", last_name: "Brown", email: "j.brown@example.com" },
    { id: "t5", first_name: "Maria", last_name: "Jones", email: "m.jones@example.com" },
    { id: "t6", first_name: "Thomas", last_name: "Anderson", email: "t.anderson@example.com" }
  ];
  
  const baseExpectedMatches = [
    { source_id: "s1", target_id: "t1", confidence: 0.9 },
    { source_id: "s2", target_id: "t2", confidence: 0.85 },
    { source_id: "s3", target_id: "t3", confidence: 0.9 },
    { source_id: "s4", target_id: "t4", confidence: 0.8 },
    { source_id: "s5", target_id: "t5", confidence: 0.7 }
  ];
  
  const baseFieldMappings = [
    { sourceField: "first_name", targetField: "first_name", type: "firstName", weight: 1.5 },
    { sourceField: "last_name", targetField: "last_name", type: "lastName", weight: 2.0 },
    { sourceField: "email", targetField: "email", type: "email", weight: 2.5 }
  ];
  
  return {
    name: testName || "Name Variation Test",
    description: "Tests matching with common name variations and nicknames",
    sourceRecords: options.sourceRecords || baseSourceRecords,
    targetRecords: options.targetRecords || baseTargetRecords,
    expectedMatches: options.expectedMatches || baseExpectedMatches,
    fieldMappings: options.fieldMappings || baseFieldMappings,
    options: options.matchOptions || {}
  };
}

/**
 * Generates an address variation test case
 * @param {string} testName - Test case name
 * @param {Object} options - Test case options
 * @returns {Object} - Complete test case
 */
function generateAddressVariationTestCase(testName, options = {}) {
  const baseSourceRecords = [
    { id: "s1", street: "123 Main St", city: "New York", state: "NY", zip: "10001" },
    { id: "s2", street: "456 Oak Avenue", city: "Los Angeles", state: "CA", zip: "90001" },
    { id: "s3", street: "789 Pine Road", city: "Chicago", state: "IL", zip: "60601" },
    { id: "s4", street: "321 Maple Drive", city: "Houston", state: "TX", zip: "77001" },
    { id: "s5", street: "555 Cedar Lane", city: "Philadelphia", state: "PA", zip: "19019" }
  ];
  
  const baseTargetRecords = [
    { id: "t1", street: "123 Main Street", city: "New York", state: "NY", zip: "10001" },
    { id: "t2", street: "456 Oak Ave", city: "Los Angeles", state: "CA", zip: "90001" },
    { id: "t3", street: "789 Pine Rd", city: "Chicago", state: "IL", zip: "60601" },
    { id: "t4", street: "321 Maple Dr", city: "Houston", state: "TX", zip: "77001" },
    { id: "t5", street: "555 Cedar Ln", city: "Philadelphia", state: "PA", zip: "19019" },
    { id: "t6", street: "888 Elm Street", city: "Phoenix", state: "AZ", zip: "85001" }
  ];
  
  const baseExpectedMatches = [
    { source_id: "s1", target_id: "t1", confidence: 0.95 },
    { source_id: "s2", target_id: "t2", confidence: 0.95 },
    { source_id: "s3", target_id: "t3", confidence: 0.95 },
    { source_id: "s4", target_id: "t4", confidence: 0.95 },
    { source_id: "s5", target_id: "t5", confidence: 0.95 }
  ];
  
  const baseFieldMappings = [
    { sourceField: "street", targetField: "street", type: "streetAddress", weight: 2.0 },
    { sourceField: "city", targetField: "city", type: "city", weight: 1.0 },
    { sourceField: "state", targetField: "state", type: "state", weight: 0.5 },
    { sourceField: "zip", targetField: "zip", type: "zipCode", weight: 1.5 }
  ];
  
  return {
    name: testName || "Address Variation Test",
    description: "Tests matching with common address format variations",
    sourceRecords: options.sourceRecords || baseSourceRecords,
    targetRecords: options.targetRecords || baseTargetRecords,
    expectedMatches: options.expectedMatches || baseExpectedMatches,
    fieldMappings: options.fieldMappings || baseFieldMappings,
    options: options.matchOptions || {}
  };
}

/**
 * Generates a challenging edge case test
 * @param {string} testName - Test case name
 * @param {Object} options - Test case options
 * @returns {Object} - Complete test case
 */
function generateEdgeCaseTestCase(testName, options = {}) {
  const baseSourceRecords = [
    { id: "s1", first_name: "John", last_name: "Smith-Johnson", email: "john@example.com", dob: "1980-01-15" },
    { id: "s2", first_name: "Mary", last_name: "O'Brien", email: "mary.obrien@example.com", dob: "1975-05-20" },
    { id: "s3", first_name: "Jane", last_name: "Doe", email: "jane.doe@example.com", dob: "1990-11-30" },
    { id: "s4", first_name: "", last_name: "Unknown", email: "unknown@example.com", dob: null },
    { id: "s5", first_name: "Robert", last_name: "Lee", email: "robert.lee@example.com", dob: "1982-07-04" }
  ];
  
  const baseTargetRecords = [
    { id: "t1", first_name: "J", last_name: "Smith", email: "johnsmith@example.com", dob: "1980-01-15" },
    { id: "t2", first_name: "Mary", last_name: "O Brien", email: "mary.obrien@example.com", dob: "1975-05-20" },
    { id: "t3", first_name: "Jane", last_name: "Doe-Smith", email: "j.doe@example.com", dob: "1990-11-30" },
    { id: "t4", first_name: null, last_name: "Unknown", email: "unknown.person@example.com", dob: "1965-12-25" },
    { id: "t5", first_name: "Bobby", last_name: "Lee", email: "bobby.lee@example.com", dob: "1982-07-04" },
    { id: "t6", first_name: "John", last_name: "Smith", email: "john.smith.2@example.com", dob: "1980-01-16" }
  ];
  
  const baseExpectedMatches = [
    { source_id: "s1", target_id: "t1", confidence: 0.7 },
    { source_id: "s2", target_id: "t2", confidence: 0.9 },
    { source_id: "s3", target_id: "t3", confidence: 0.75 },
    { source_id: "s5", target_id: "t5", confidence: 0.8 }
  ];
  
  const baseFieldMappings = [
    { sourceField: "first_name", targetField: "first_name", type: "firstName", weight: 1.5 },
    { sourceField: "last_name", targetField: "last_name", type: "lastName", weight: 2.0 },
    { sourceField: "email", targetField: "email", type: "email", weight: 2.5 },
    { sourceField: "dob", targetField: "dob", type: "dateOfBirth", weight: 3.0 }
  ];
  
  return {
    name: testName || "Edge Case Test",
    description: "Tests challenging matching scenarios with missing data, special characters, and edge cases",
    sourceRecords: options.sourceRecords || baseSourceRecords,
    targetRecords: options.targetRecords || baseTargetRecords,
    expectedMatches: options.expectedMatches || baseExpectedMatches,
    fieldMappings: options.fieldMappings || baseFieldMappings,
    options: options.matchOptions || {}
  };
}

/**
 * Generates a comprehensive test suite with multiple test cases
 * @returns {Array} - Array of test cases
 */
function generateComprehensiveTestSuite() {
  return [
    generateNameVariationTestCase("Basic Name Variations"),
    generateAddressVariationTestCase("Basic Address Variations"),
    generateEdgeCaseTestCase("Challenging Edge Cases"),
    
    // Additional specialized test cases
    generateNameVariationTestCase("International Names", {
      sourceRecords: [
        { id: "s1", first_name: "José", last_name: "García", email: "jose.garcia@example.com" },
        { id: "s2", first_name: "François", last_name: "Dubois", email: "f.dubois@example.com" },
        { id: "s3", first_name: "Hans", last_name: "Müller", email: "hans.mueller@example.com" },
        { id: "s4", first_name: "Søren", last_name: "Jørgensen", email: "soren.j@example.com" },
        { id: "s5", first_name: "Björn", last_name: "Larsson", email: "bjorn.l@example.com" }
      ],
      targetRecords: [
        { id: "t1", first_name: "Jose", last_name: "Garcia", email: "jose.garcia@example.com" },
        { id: "t2", first_name: "Francois", last_name: "Dubois", email: "francois.dubois@example.com" },
        { id: "t3", first_name: "Hans", last_name: "Mueller", email: "hans.mueller@example.com" },
        { id: "t4", first_name: "Soren", last_name: "Jorgensen", email: "soren.jorgensen@example.com" },
        { id: "t5", first_name: "Bjorn", last_name: "Larsson", email: "bjorn.larsson@example.com" },
        { id: "t6", first_name: "Akira", last_name: "Tanaka", email: "a.tanaka@example.com" }
      ],
      expectedMatches: [
        { source_id: "s1", target_id: "t1", confidence: 0.9 },
        { source_id: "s2", target_id: "t2", confidence: 0.85 },
        { source_id: "s3", target_id: "t3", confidence: 0.9 },
        { source_id: "s4", target_id: "t4", confidence: 0.8 },
        { source_id: "s5", target_id: "t5", confidence: 0.9 }
      ]
    })
  ];
}

module.exports = {
  generateNameVariationTestCase,
  generateAddressVariationTestCase,
  generateEdgeCaseTestCase,
  generateComprehensiveTestSuite
}; 