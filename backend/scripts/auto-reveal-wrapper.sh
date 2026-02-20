#!/bin/bash
# Auto-Reveal Wrapper Script
# Runs the TypeScript auto-reveal script with proper environment

set -e

cd "$(dirname "$0")/../.."

# Load environment from keychain (primary) with .env.local fallback
export DATABASE_URL=$(~/clawd/scripts/get-secret.sh DATABASE_URL 2>/dev/null || echo "")
export SPELLBLOCK_ENCRYPTION_KEY=$(~/clawd/scripts/get-secret.sh spellblock_encryption_key 2>/dev/null || echo "")
export PRIVATE_KEY=$(~/clawd/scripts/get-secret.sh signing_key 2>/dev/null || echo "")

# Fallback: load from .env.local if keychain values missing
if [ -z "$DATABASE_URL" ] || [ -z "$SPELLBLOCK_ENCRYPTION_KEY" ]; then
  if [ -f ".env.local" ]; then
    export $(cat .env.local | grep -v '^#' | xargs 2>/dev/null)
  fi
fi

if [ -z "$PRIVATE_KEY" ]; then
  echo "ERROR: Could not load signing key"
  exit 1
fi

# Run auto-reveal script
echo "Starting auto-reveal..."
npx tsx backend/scripts/auto-reveal-all-words.ts
