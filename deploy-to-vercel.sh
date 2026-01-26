#!/bin/bash
# Restaurant Task Manager - Deploy to Vercel Script
# Run this script to deploy your app to Vercel

echo "🚀 Restaurant Task Manager - Vercel Deployment"
echo "=============================================="
echo ""

# Step 1: Check if git is initialized
if [ ! -d .git ]; then
    echo "📦 Initializing Git repository..."
    git init
else
    echo "✓ Git repository already initialized"
fi

# Step 2: Check if code is committed
if [ -z "$(git status --porcelain)" ]; then
    echo "✓ Code is already committed"
else
    echo "📝 Committing code..."
    git add .
    git commit -m "Restaurant Task Manager - Ready for Vercel Deployment"
fi

# Step 3: Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo ""
    echo "⏳ Installing Vercel CLI..."
    npm install -g vercel
fi

# Step 4: Deploy
echo ""
echo "🚀 Deploying to Vercel..."
echo "Follow the prompts to:"
echo "  1. Link to GitHub (or create new project)"
echo "  2. Set project name"
echo "  3. Configure environment variables:"
echo "     - JWT_SECRET (use: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\")"
echo "     - NODE_ENV = production"
echo ""

vercel

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Your app is now live at: https://[your-project].vercel.app"
echo ""
echo "📚 Next steps:"
echo "  1. Set environment variables in Vercel dashboard"
echo "  2. Test your app"
echo "  3. Share the URL!"
echo ""
