#!/bin/sh

# Make sure all unit tests pass before starting.
# Error out if they don't!
set -e
npm test

# Use a .env file for test environment variables.
set -a
. .env
set +a

# Start the express server.
npm start
