#!/usr/bin/env bash
# BoardersWatch - Quick Deploy Script
# Run this to build frontend and start the server

echo "=== BoardersWatch Deployment ==="

# Build frontend
echo "Building frontend..."
cd client
npm install
npm run build
cd ..

# Install server dependencies
echo "Installing server dependencies..."
cd server
npm install

# Seed database if empty
if [ ! -f "data/boarderswatch.db" ]; then
  echo "Seeding database..."
  node src/seed.js
fi

# Start server
echo "Starting server..."
NODE_ENV=production node src/index.js
