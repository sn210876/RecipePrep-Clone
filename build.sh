#!/usr/bin/env bash
set -e  # Exit on any error

echo "================================================"
echo "📦 Starting Recipe Extractor Build Process"
echo "================================================"

# Create bin directory
echo "📁 Creating bin directory..."
mkdir -p ./bin

# Install ffmpeg check (Render should have this in their base image)
echo "🔍 Checking for ffmpeg..."
if command -v ffmpeg &> /dev/null; then
    echo "✅ ffmpeg is available: $(ffmpeg -version | head -n 1)"
else
    echo "⚠️  ffmpeg not found. Audio extraction may fail."
    echo "   Note: Render should provide ffmpeg in their environment."
fi

# Download yt-dlp to local bin directory (no sudo needed)
echo "📦 Downloading yt-dlp to ./bin/yt-dlp..."
curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o ./bin/yt-dlp

# Make it executable
echo "🔧 Making yt-dlp executable..."
chmod +x ./bin/yt-dlp

# Verify installation
if [ -f "./bin/yt-dlp" ]; then
    echo "✅ yt-dlp installed successfully at: $(pwd)/bin/yt-dlp"
    # Test it works
    ./bin/yt-dlp --version && echo "✅ yt-dlp version check passed"
else
    echo "❌ ERROR: yt-dlp installation failed"
    exit 1
fi

# Install npm dependencies
echo "📦 Installing npm dependencies..."
npm ci --only=production

# Build frontend
echo "🏗️  Building frontend..."
npm run build

echo "================================================"
echo "✅ Build Complete!"
echo "================================================"
echo "yt-dlp location: $(pwd)/bin/yt-dlp"
echo "Node modules installed: $([ -d node_modules ] && echo 'YES' || echo 'NO')"
echo "Dist folder created: $([ -d dist ] && echo 'YES' || echo 'NO')"
echo "================================================"