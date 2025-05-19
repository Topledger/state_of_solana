#!/bin/bash

# Script to manage deployment to GitHub Pages while handling API routes
set -e

echo "📦 Starting deployment process..."

# Create backup directory if it doesn't exist
mkdir -p app/_api_disabled

echo "🚫 Temporarily disabling chart API routes for static export..."
# Move chart API routes to disabled directory
if [ -d "app/api/charts" ]; then
  mv app/api/charts app/_api_disabled/
  echo "✅ API routes moved to disabled directory"
fi

# Run the build and deploy process
echo "🏗️ Building static site..."
npm run build:static

echo "📝 Creating .nojekyll file..."
mkdir -p out
touch out/.nojekyll

echo "🚀 Deploying to GitHub Pages..."
npx gh-pages -d out

# Move the API routes back for local development
echo "🔄 Restoring API routes for development..."
if [ -d "app/_api_disabled/charts" ]; then
  mv app/_api_disabled/charts app/api/
  echo "✅ API routes restored"
fi

echo "✨ Deployment completed successfully!" 