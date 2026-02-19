#!/bin/bash
# Wrapper to run social scripts with proper PATH

# Set up environment
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$HOME/.foundry/bin:$PATH"
export NODE_PATH="/opt/homebrew/lib/node_modules"

# Run the script passed as argument
exec "$@"
