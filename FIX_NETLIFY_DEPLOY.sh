#!/bin/bash
# Fix Netlify Python Detection Issue

echo "🔧 Fixing Netlify deployment..."

# Remove Python files that trigger Python detection
echo "📝 Removing Python files from git..."
git rm -f requirements.txt main.py 2>/dev/null || echo "Files already removed or don't exist"

# Make sure renamed files exist
if [ ! -f "python-requirements.txt" ]; then
    echo "⚠️  python-requirements.txt not found"
fi

if [ ! -f "python-main.py" ]; then
    echo "⚠️  python-main.py not found"
fi

# Create/verify .nvmrc
echo "20" > .nvmrc
echo "✅ Created .nvmrc with Node.js 20"

# Check for any hidden Python version files
for file in .python-version .tool-versions .mise.toml mise.toml .rtx.toml runtime.txt; do
    if [ -f "$file" ]; then
        echo "⚠️  Found $file - this may cause Python detection"
        echo "   Consider removing it: git rm $file"
    fi
done

# Stage changes
git add .nvmrc netlify.toml python-requirements.txt python-main.py NETLIFY_DEPLOYMENT_FIX.md FIX_NETLIFY_DEPLOY.sh 2>/dev/null

echo ""
echo "✅ Changes staged. Next steps:"
echo "1. Review changes: git status"
echo "2. Commit: git commit -m 'Fix Netlify Python detection issue'"
echo "3. Push: git push origin main"
echo ""
echo "After pushing, Netlify will rebuild automatically."
