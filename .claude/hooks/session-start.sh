#!/bin/bash
# Session start hook - runs when Claude Code session begins

echo "🚀 AI Judge session started"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo "⚠️  node_modules not found. Run: npm install"
fi

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
  echo "⚠️  .env.local not found. Create it with Supabase credentials"
fi

# Show git status
echo "📊 Git status:"
git status --short

# Show current branch
BRANCH=$(git branch --show-current)
echo "🌿 Current branch: $BRANCH"

echo ""
echo "✅ Ready to build AI Judge!"
