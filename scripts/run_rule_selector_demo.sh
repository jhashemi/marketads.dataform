#!/bin/bash

# Run the Intelligent Rule Selection System Demo
# This script executes the demo script to showcase the capabilities of the system

echo "Starting Intelligent Rule Selection System Demo..."

# Navigate to the project root directory
cd "$(dirname "$0")/.."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed. Please install Node.js to run this demo."
    exit 1
fi

# Run the demo script
node includes/demo/rule_selector_demo.js

echo "Demo completed." 