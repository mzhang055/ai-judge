#!/bin/bash
# User prompt submit hook - runs before each message to Claude

# Read the user's prompt from stdin
USER_PROMPT=$(cat)

# Check for common issues and add context

# If prompt mentions tests, check if test setup exists
if echo "$USER_PROMPT" | grep -qi "test"; then
  if [ ! -f "package.json" ] || ! grep -q "vitest" package.json; then
    echo "ℹ️  Note: Test framework not yet configured"
    echo ""
  fi
fi

# If prompt mentions supabase, check connection
if echo "$USER_PROMPT" | grep -qi "supabase"; then
  if [ ! -f "src/lib/supabase.ts" ]; then
    echo "ℹ️  Note: Supabase client not yet created at src/lib/supabase.ts"
    echo ""
  fi
fi

# Output the original prompt (required to pass it through)
echo "$USER_PROMPT"
