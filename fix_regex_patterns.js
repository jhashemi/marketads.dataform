/**
 * Script to fix regex patterns in JavaScript files
 * 
 * This script searches for Python-style raw string patterns (r'pattern')
 * and replaces them with proper JavaScript string literals ('pattern').
 */

const fs = require('fs');
const path = require('path');

// Files to process
const filesToProcess = [
  'includes/sql/phonetic_functions.js',
  'includes/sql/similarity_functions.js'
];

// Process each file
filesToProcess.forEach(filePath => {
  console.log(`Processing ${filePath}...`);
  
  try {
    // Read the file
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Count occurrences of r'pattern'
    const matches = content.match(/r'([^']+)'/g) || [];
    console.log(`Found ${matches.length} regex patterns to fix`);
    
    if (matches.length > 0) {
      // Log some of the patterns being fixed
      console.log('Sample patterns:');
      matches.slice(0, 5).forEach(match => console.log(`  - ${match}`));
      
      // Replace r'pattern' with 'pattern'
      const fixedContent = content.replace(/r'([^']+)'/g, "'$1'");
      
      // Write the fixed content back to the file
      fs.writeFileSync(filePath, fixedContent, 'utf8');
      
      console.log(`✓ Fixed ${filePath} (${matches.length} patterns replaced)`);
    } else {
      console.log(`No patterns to fix in ${filePath}`);
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
});

console.log('Done!'); 