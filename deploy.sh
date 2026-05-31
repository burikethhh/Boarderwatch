#!/usr/bin/env bash
set -e
echo "=== BoardersWatch Deployment ==="

# Build frontend
echo "Building frontend..."
cd client
npm install --silent
npm run build
cd ..

# Install server dependencies
echo "Installing server dependencies..."
cd server
npm install --silent
npm rebuild better-sqlite3 2>/dev/null || true

# Seed database if empty
if [ ! -f "data/boarderswatch.db" ]; then
  echo "Seeding database..."
  node src/seed.js
fi

# Start server
echo "Starting server..."
NODE_ENV=production node src/index.js