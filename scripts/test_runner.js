/**
 * Test Runner Script
 * 
 * This script provides a wrapper around Jest to solve console integration
 * issues and improve test output handling.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Parse command line arguments
const args = process.argv.slice(2);
const jestArgs = [];
let testPattern = null;
let outputFile = null;

// Process arguments
args.forEach(arg => {
  if (arg.startsWith('--pattern=')) {
    testPattern = arg.split('=')[1];
  } else if (arg.startsWith('--output=')) {
    outputFile = arg.split('=')[1];
  } else {
    jestArgs.push(arg);
  }
});

// Add test pattern if specified
if (testPattern) {
  jestArgs.push(testPattern);
}

// Set NODE_ENV to test
process.env.NODE_ENV = 'test';

console.log('Starting tests with the following configuration:');
console.log('- Jest arguments:', jestArgs.join(' ') || 'none');
console.log('- Environment:', process.env.NODE_ENV);
console.log('- Output file:', outputFile || 'console only');
console.log('\n--------------------------------------------------\n');

// Run Jest as a child process
const jest = spawn('node', [
  path.join(__dirname, '../node_modules/jest/bin/jest.js'),
  '--colors',
  ...jestArgs
], {
  stdio: outputFile ? 'pipe' : 'inherit'
});

// If outputting to a file, capture stdout and stderr
if (outputFile) {
  const output = fs.createWriteStream(outputFile);
  
  jest.stdout.pipe(output);
  jest.stderr.pipe(output);
  
  // Also print to console
  jest.stdout.pipe(process.stdout);
  jest.stderr.pipe(process.stderr);
}

// Handle process exit
jest.on('close', code => {
  console.log(`\n--------------------------------------------------`);
  console.log(`Test process exited with code ${code}`);
  
  if (code !== 0) {
    console.error('Tests failed!');
  } else {
    console.log('All tests passed!');
  }
  
  process.exit(code);
}); 