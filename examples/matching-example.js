/**
 * Matching System Example
 * 
 * This example demonstrates how to use the matching system with external libraries.
 * It shows:
 * 1. Basic rule-based matching
 * 2. ML-based matching using dedupe
 * 3. Different matching strategies and configurations
 */

const { createMatchingSystem } = require('../includes/matching');
const { createBlockingEngine } = require('../includes/blocking');
const types = require('../includes/types');

// Sample records
const sourceRecords = [
  {
    id: 's1',
    first_name: 'John',
    last_name: 'Smith',
    email: 'john.smith@example.com',
    phone: '555-123-4567',
    address: '123 Main St, Apt 4B',
    postal_code: '10001',
    dob: '1980-05-15'
  },
  {
    id: 's2',
    first_name: 'Sarah',
    last_name: 'Johnson',
    email: 'sarah.j@company.org',
    phone: '555-987-6543',
    address: '456 Oak Avenue',
    postal_code: '90210',
    dob: '1992-11-30'
  },
  {
    id: 's3',
    first_name: 'Michael',
    last_name: 'Williams',
    email: 'mwilliams@mail.net',
    phone: '555-555-1234',
    address: '789 Pine Road',
    postal_code: '60611',
    dob: '1975-03-22'
  }
];

const targetRecords = [
  {
    id: 't1',
    firstName: 'John',
    lastName: 'Smith',
    emailAddress: 'johnsmith@example.com',
    phoneNumber: '5551234567',
    streetAddress: '123 Main Street, Apartment 4B',
    zip: '10001',
    birthDate: '1980-05-15'
  },
  {
    id: 't2',
    firstName: 'Sara',
    lastName: 'Johnson',
    emailAddress: 'sarah.j@company.org',
    phoneNumber: '5559876543',
    streetAddress: '456 Oak Ave',
    zip: '90210',
    birthDate: '1992-11-30'
  },
  {
    id: 't3',
    firstName: 'Robert',
    lastName: 'Jones',
    emailAddress: 'robert.jones@example.com',
    phoneNumber: '5557890123',
    streetAddress: '321 Elm Street',
    zip: '75001',
    birthDate: '1988-07-10'
  }
];

// Create field mappings
const sourceFieldMappings = [
  types.createMapping('firstName', 'first_name'),
  types.createMapping('lastName', 'last_name'),
  types.createMapping('email', 'email'),
  types.createMapping('phone', 'phone'),
  types.createMapping('address', 'address'),
  types.createMapping('postalCode', 'postal_code'),
  types.createMapping('dateOfBirth', 'dob')
];

const targetFieldMappings = [
  types.createMapping('firstName', 'firstName'),
  types.createMapping('lastName', 'lastName'),
  types.createMapping('email', 'emailAddress'),
  types.createMapping('phone', 'phoneNumber'),
  types.createMapping('address', 'streetAddress'),
  types.createMapping('postalCode', 'zip'),
  types.createMapping('dateOfBirth', 'birthDate')
];

// Create matching system with configuration
const matchingSystem = createMatchingSystem({
  // Enable ML-based dedupe resolver
  useDedupeResolver: true,
  dedupeModelPath: './dedupeModel.json',
  
  // Customize field weights
  matching: {
    fieldWeights: {
      email: 0.95,      // Higher weight for email
      phone: 0.9,       // Higher weight for phone
      dateOfBirth: 0.85, // Higher weight for DOB
      firstName: 0.7,
      lastName: 0.8,
      address: 0.6,
      postalCode: 0.7
    }
  }
});

// Create blocking engine
const blockingEngine = createBlockingEngine({
  blocking: {
    blockingStrategies: {
      email: ['exact', 'domain'],
      phone: ['exact', 'lastFourDigits'],
      firstName: ['exact', 'phonetic'],
      lastName: ['exact', 'phonetic'],
      postalCode: ['exact']
    }
  }
});

// Example usage function
async function runExample() {
  console.log('===== RECORD MATCHING EXAMPLE =====\n');
  
  console.log('Source Records:');
  console.log(JSON.stringify(sourceRecords, null, 2));
  console.log('\nTarget Records:');
  console.log(JSON.stringify(targetRecords, null, 2));
  
  console.log('\n===== RULE-BASED MATCHING =====');
  
  // Match source record 1 with target record 1
  console.log('\nMatching source record 1 with target record 1:');
  const match1 = await matchingSystem.evaluateMatch(
    sourceRecords[0],
    targetRecords[0],
    {
      sourceFieldMappings,
      targetFieldMappings
    }
  );
  
  console.log(`Confidence: ${match1.confidence.toFixed(4)}`);
  console.log(`Tier: ${match1.tier}`);
  console.log('Field Similarities:');
  for (const [field, score] of Object.entries(match1.components)) {
    console.log(`  ${field}: ${score.toFixed(4)}`);
  }
  
  // Match source record 2 with target record 2
  console.log('\nMatching source record 2 with target record 2:');
  const match2 = await matchingSystem.evaluateMatch(
    sourceRecords[1],
    targetRecords[1],
    {
      sourceFieldMappings,
      targetFieldMappings
    }
  );
  
  console.log(`Confidence: ${match2.confidence.toFixed(4)}`);
  console.log(`Tier: ${match2.tier}`);
  
  // Match source record 1 with target record 3 (should be low confidence)
  console.log('\nMatching source record 1 with target record 3 (non-match):');
  const match3 = await matchingSystem.evaluateMatch(
    sourceRecords[0],
    targetRecords[2],
    {
      sourceFieldMappings,
      targetFieldMappings
    }
  );
  
  console.log(`Confidence: ${match3.confidence.toFixed(4)}`);
  console.log(`Tier: ${match3.tier}`);
  
  console.log('\n===== BLOCKING DEMONSTRATION =====');
  
  // Generate blocking keys for a record
  console.log('\nBlocking keys for source record 1:');
  const blockingKeys = blockingEngine.generateKeys(sourceRecords[0], sourceFieldMappings);
  console.log(blockingKeys);
  
  // Generate SQL for blocking
  console.log('\nSQL for join condition using blocking:');
  const joinCondition = blockingEngine.createJoinCondition(
    'source_table',
    'target_table',
    sourceFieldMappings,
    targetFieldMappings
  );
  console.log(joinCondition);
  
  console.log('\n===== FIND MATCHES DEMONSTRATION =====');
  
  // Find matches for a source record
  console.log('\nFinding matches for source record 1:');
  const matches = await matchingSystem.findMatches(
    sourceRecords[0],
    targetRecords,
    {
      sourceFieldMappings,
      targetFieldMappings,
      threshold: 0.5
    }
  );
  
  console.log(`Found ${matches.length} matches:`);
  for (const match of matches) {
    console.log(`  Match with ${match.targetRecord.id}: Confidence ${match.score.confidence.toFixed(4)}, Tier: ${match.score.tier}`);
  }
  
  console.log('\n===== CLUSTERING DEMONSTRATION =====');
  
  // Combine records for clustering
  const allRecords = [
    // Convert source records to common format
    ...sourceRecords.map(record => ({
      id: record.id,
      firstName: record.first_name,
      lastName: record.last_name,
      email: record.email,
      phone: record.phone
    })),
    // Convert target records to common format
    ...targetRecords.map(record => ({
      id: record.id,
      firstName: record.firstName,
      lastName: record.lastName,
      email: record.emailAddress,
      phone: record.phoneNumber
    }))
  ];
  
  // Define common field mappings for the merged format
  const clusterFieldMappings = [
    types.createMapping('firstName', 'firstName'),
    types.createMapping('lastName', 'lastName'),
    types.createMapping('email', 'email'),
    types.createMapping('phone', 'phone')
  ];
  
  // Cluster records
  console.log('\nClustering all records:');
  const clusters = await matchingSystem.clusterRecords(
    allRecords,
    clusterFieldMappings,
    { threshold: 0.7 }
  );
  
  console.log(`Found ${clusters.length} clusters:`);
  clusters.forEach((cluster, i) => {
    console.log(`\nCluster ${i+1} (${cluster.length} records):`);
    cluster.forEach(record => {
      console.log(`  ${record.id}: ${record.firstName} ${record.lastName}, ${record.email}`);
    });
  });
  
  console.log('\n===== EXAMPLE COMPLETE =====');
}

// Run the example
runExample().catch(error => {
  console.error('Error in example:', error);
}); 