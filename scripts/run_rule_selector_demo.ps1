# Run the Intelligent Rule Selection System Demo
# This script executes the demo script to showcase the capabilities of the system

Write-Host "Starting Intelligent Rule Selection System Demo..." -ForegroundColor Green

# Navigate to the project root directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootPath = Split-Path -Parent $scriptPath
Set-Location $rootPath

# Check if Node.js is installed
try {
    $nodeVersion = node -v
    Write-Host "Using Node.js $nodeVersion" -ForegroundColor Cyan
} catch {
    Write-Host "Error: Node.js is not installed. Please install Node.js to run this demo." -ForegroundColor Red
    exit 1
}

# Run the demo script
Write-Host "Running demo script..." -ForegroundColor Yellow
node includes/demo/rule_selector_demo.js

Write-Host "Demo completed." -ForegroundColor Green 