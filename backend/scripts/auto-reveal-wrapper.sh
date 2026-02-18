#!/bin/bash
# Auto-Reveal Wrapper Script
# Runs the TypeScript auto-reveal script with proper environment

set -e

cd "$(dirname "$0")/../.."

# Load environment
if [ -f ".env.local" ]; then
  export $(cat .env.local | grep -v '^#' | xargs)
fi

# Get signing key
export PRIVATE_KEY=$(~/clawd/scripts/get-secret.sh signing_key 2>/dev/null || echo "")

if [ -z "$PRIVATE_KEY" ]; then
  echo "ERROR: Could not load signing key"
  exit 1
fi

# Run auto-reveal script
echo "Starting auto-reveal..."
npx tsx backend/scripts/auto-reveal-all-words.ts
