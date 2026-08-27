#!/bin/bash
set -e

echo "Running Nabd Plus E2E Tests CI..."

# Install dependencies if not installed
npm install

# Build the app for testing
detox build --configuration ios.sim.release

# Run Detox tests
detox test --configuration ios.sim.release --cleanup

echo "E2E Tests completed successfully."
