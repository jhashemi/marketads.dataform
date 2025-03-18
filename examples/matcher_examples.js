/**
 * Matching System Examples
 * 
 * This file demonstrates basic usage of the different matching strategies
 * provided by the MarketAds matching system.
 */

const { FuzzyNameMatcher } = require('../includes/matching/fuzzy_name_matcher');
const { JaccardSimilarityMatcher } = require('../includes/matching/jaccard_similarity_matcher');
const { createMatchingSystem } = require('../includes/matching');

console.log('========= MarketAds Matching System Examples =========\n');

/**
 * Example 1: Fuzzy Name Matching
 */
async function demonstrateFuzzyNameMatching() {
  console.log('\n--------- Fuzzy Name Matching Examples ---------\n');
  
  // Create a fuzzy name matcher with default configuration
  const nameMatcher = new FuzzyNameMatcher();
  
  // Example 1: Compare nicknames
  console.log('Example 1.1: Comparing first names with nicknames');
  const names = [
    ['Robert', 'Bob'],
    ['William', 'Bill'],
    ['Elizabeth', 'Beth'],
    ['Katherine', 'Kate'],
    ['Richard', 'Dick'],
    ['Michael', 'Mike']
  ];
  
  for (const [name1, name2] of names) {
    const similarity = nameMatcher.compareFirstNames(name1, name2);
    console.log(`  "${name1}" vs "${name2}": ${similarity.toFixed(2)} similarity`);
  }
  
  // Example 2: Compare full names
  console.log('\nExample 1.2: Comparing full names');
  const fullNames = [
    ['John Smith', 'Jon Smith'],
    ['Sarah Jane Wilson', 'Sarah J. Wilson'],
    ['Dr. Robert Johnson Jr.', 'Robert Johnson'],
    ['Elizabeth M. Taylor', 'Beth Taylor'],
    ['William Brown', 'Bill Brown']
  ];
  
  for (const [name1, name2] of fullNames) {
    const similarity = nameMatcher.compareFullNames(name1, name2);
    console.log(`  "${name1}" vs "${name2}": ${similarity.toFixed(2)} similarity`);
  }
  
  // Example 3: Evaluate matches between customer records
  console.log('\nExample 1.3: Evaluate customer record matches');
  
  const customers = [
    {
      firstName: 'Robert',
      lastName: 'Johnson',
      middleName: 'Michael'
    },
    {
      firstName: 'Bob',
      lastName: 'Johnson',
      middleName: 'M'
    },
    {
      firstName: 'Robert',
      lastName: 'Johnson-Smith',
      middleName: 'Michael'
    },
    {
      firstName: 'Robert',
      lastName: 'Jones',
      middleName: 'Michael'
    }
  ];
  
  for (let i = 1; i < customers.length; i++) {
    const result = nameMatcher.evaluateMatch(
      customers[0],
      customers[i],
      {
        firstNameField: 'firstName',
        lastNameField: 'lastName'
      }
    );
    
    console.log(`  Customer 1 vs Customer ${i+1}:`);
    console.log(`    Confidence: ${result.confidence.toFixed(2)}`);
    console.log(`    Tier: ${result.tier}`);
    console.log(`    Components: firstName=${result.components.firstName?.toFixed(2)}, lastName=${result.components.lastName?.toFixed(2)}`);
  }
}

/**
 * Example 2: Jaccard Similarity Matching
 */
async function demonstrateJaccardMatching() {
  console.log('\n--------- Jaccard Similarity Matching Examples ---------\n');
  
  // Create a Jaccard similarity matcher with default configuration
  const jaccardMatcher = new JaccardSimilarityMatcher();
  
  // Example 1: Compare tag sets
  console.log('Example 2.1: Comparing tag sets');
  const tagSets = [
    [['marketing', 'email', 'automation'], ['email', 'marketing', 'analytics']],
    [['red', 'green', 'blue'], ['red', 'green', 'yellow']],
    [['sports', 'basketball', 'nba'], ['football', 'sports', 'nfl']],
    [['javascript', 'react', 'node'], ['python', 'django', 'flask']],
    [['iphone', 'apple', 'ios'], ['iphone', 'apple', 'ios']]
  ];
  
  for (const [tags1, tags2] of tagSets) {
    const similarity = jaccardMatcher.compareTokenSets(tags1, tags2);
    console.log(`  [${tags1.join(', ')}] vs [${tags2.join(', ')}]: ${similarity.toFixed(2)} similarity`);
  }
  
  // Example 2: Product matching with multiple attributes
  console.log('\nExample 2.2: Product matching with multiple attributes');
  
  const products = [
    {
      name: 'Ultra HD Smart TV 55"',
      brand: 'TechBrand',
      categories: ['Electronics', 'TVs', 'Smart Home'],
      features: ['4K', 'HDR', 'Smart TV', 'Voice Control', 'WiFi']
    },
    {
      name: 'TechBrand 55-inch 4K Smart Television',
      brand: 'TechBrand',
      categories: ['TVs', 'Electronics', 'Home Theater'],
      features: ['Ultra HD', '4K Resolution', 'Smart Features', 'WiFi Enabled']
    },
    {
      name: 'Premium 4K OLED TV 55"',
      brand: 'LuxBrand',
      categories: ['Electronics', 'TVs', 'Premium'],
      features: ['OLED', '4K', 'HDR+', 'Smart TV', 'Voice Control']
    }
  ];
  
  // Compare product 0 to products 1 and 2
  for (let i = 1; i < products.length; i++) {
    const result = jaccardMatcher.evaluateMatch(
      products[0],
      products[i],
      {
        fieldMappings: {
          categories: 'categories',
          features: 'features'
        },
        fieldWeights: {
          categories: 0.4,
          features: 0.6
        }
      }
    );
    
    console.log(`  Product 1 vs Product ${i+1}:`);
    console.log(`    Confidence: ${result.confidence.toFixed(2)}`);
    console.log(`    Tier: ${result.tier}`);
    console.log(`    Categories: ${result.components.categories.toFixed(2)} similarity`);
    console.log(`    Features: ${result.components.features.toFixed(2)} similarity`);
  }
  
  // Example 3: Auto-detecting shared array fields
  console.log('\nExample 2.3: Auto-detecting shared array fields');
  
  const user1 = {
    id: 1,
    name: 'John',
    interests: ['music', 'books', 'movies'],
    skills: ['javascript', 'python', 'sql'],
    favorites: ['pizza', 'coffee', 'hiking']
  };
  
  const user2 = {
    id: 2,
    name: 'Sarah',
    interests: ['music', 'art', 'photography'],
    skills: ['javascript', 'java', 'sql'],
    hobbies: ['hiking', 'painting', 'cooking']
  };
  
  // Auto-detect shared array fields
  const result = jaccardMatcher.evaluateMatch(user1, user2);
  
  console.log('  Match result with auto-detected fields:');
  console.log(`    Confidence: ${result.confidence.toFixed(2)}`);
  console.log(`    Tier: ${result.tier}`);
  console.log('    Components:');
  
  for (const [field, score] of Object.entries(result.components)) {
    console.log(`      ${field}: ${score.toFixed(2)} similarity`);
  }
}

/**
 * Example 3: Combining Matchers with the Matching System
 */
async function demonstrateMatchingSystem() {
  console.log('\n--------- Complete Matching System Examples ---------\n');
  
  // Create the full matching system
  const matchingSystem = createMatchingSystem({
    confidenceThresholds: {
      HIGH: 0.85,
      MEDIUM: 0.65,
      LOW: 0.45,
      MINIMUM: 0.25
    }
  });
  
  // Example: Customer matching between databases
  console.log('Example 3.1: Customer matching between databases');
  
  // CRM database record
  const crmCustomer = {
    email: 'sarah.johnson@example.com',
    first_name: 'Sarah',
    last_name: 'Johnson',
    phone: '555-123-4567',
    address: '789 Oak Avenue, Apt 123',
    zip: '67890',
    tags: ['premium', 'newsletter', 'referral']
  };
  
  // Marketing database records
  const marketingCustomers = [
    {
      email_address: 'sarah.johnson@example.com',
      fname: 'Sarah',
      lname: 'Johnson',
      phone_number: '(555) 123-4567',
      street: '789 Oak Ave Apt 123',
      postal_code: '67890',
      segments: ['premium', 'active', 'high-value']
    },
    {
      email_address: 'sjohnson@example.net',
      fname: 'Sarah',
      lname: 'Johnson',
      phone_number: '555-123-9999',
      street: '123 Main Street',
      postal_code: '12345',
      segments: ['new-user', 'newsletter']
    },
    {
      email_address: 'sarah.jones@example.com',
      fname: 'Sarah',
      lname: 'Jones',
      phone_number: '555-123-4567',
      street: '789 Oak Avenue, Apartment 123',
      postal_code: '67890',
      segments: ['premium', 'newsletter']
    }
  ];
  
  // Define field mappings
  const sourceFieldMappings = [
    { fieldName: 'email', semanticType: 'email' },
    { fieldName: 'first_name', semanticType: 'firstName' },
    { fieldName: 'last_name', semanticType: 'lastName' },
    { fieldName: 'phone', semanticType: 'phone' },
    { fieldName: 'address', semanticType: 'address' },
    { fieldName: 'zip', semanticType: 'postalCode' },
    { fieldName: 'tags', semanticType: 'tags' }
  ];
  
  const targetFieldMappings = [
    { fieldName: 'email_address', semanticType: 'email' },
    { fieldName: 'fname', semanticType: 'firstName' },
    { fieldName: 'lname', semanticType: 'lastName' },
    { fieldName: 'phone_number', semanticType: 'phone' },
    { fieldName: 'street', semanticType: 'address' },
    { fieldName: 'postal_code', semanticType: 'postalCode' },
    { fieldName: 'segments', semanticType: 'tags' }
  ];
  
  // Evaluate matches for each marketing customer
  for (let i = 0; i < marketingCustomers.length; i++) {
    const result = await matchingSystem.evaluateMatch(
      crmCustomer,
      marketingCustomers[i],
      {
        sourceFieldMappings,
        targetFieldMappings,
        priorityFields: ['email', 'phone']
      }
    );
    
    console.log(`\n  CRM Customer vs Marketing Customer ${i+1}:`);
    console.log(`    Confidence: ${result.confidence.toFixed(2)}`);
    console.log(`    Tier: ${result.tier}`);
    console.log('    Component Scores:');
    
    for (const [field, score] of Object.entries(result.components)) {
      console.log(`      ${field}: ${score.toFixed(2)}`);
    }
    
    // Check if records can be merged
    const canMerge = matchingSystem.canMergeRecords(result);
    console.log(`    Can merge records: ${canMerge}`);
  }
}

// Run the examples
async function runExamples() {
  console.log('Starting examples...\n');
  
  await demonstrateFuzzyNameMatching();
  await demonstrateJaccardMatching();
  await demonstrateMatchingSystem();
  
  console.log('\nAll examples completed.');
}

// Run if this file is executed directly
if (require.main === module) {
  runExamples().catch(error => {
    console.error('Error running examples:', error);
  });
}

module.exports = {
  demonstrateFuzzyNameMatching,
  demonstrateJaccardMatching,
  demonstrateMatchingSystem
};