#!/usr/bin/env bash
# Install yt-dlp for recipe extraction from Instagram/TikTok/YouTube

echo "📦 Installing yt-dlp..."

# Install yt-dlp using curl (works on Render's environment)
curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp || {
    echo "⚠️  Failed to install to /usr/local/bin, trying local directory..."
    mkdir -p ./bin
    curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o ./bin/yt-dlp
    chmod a+rx ./bin/yt-dlp
    export PATH="$PATH:$(pwd)/bin"
    echo "✅ yt-dlp installed to ./bin"
}

# Make it executable
chmod a+rx /usr/local/bin/yt-dlp 2>/dev/null || chmod a+rx ./bin/yt-dlp

# Verify installation
if command -v yt-dlp &> /dev/null; then
    echo "✅ yt-dlp installed successfully: $(yt-dlp --version)"
else
    if [ -f "./bin/yt-dlp" ]; then
        echo "✅ yt-dlp available at: ./bin/yt-dlp"
    else
        echo "❌ yt-dlp installation failed"
        exit 1
    fi
fi

echo "📦 Installing npm dependencies..."
npm install

echo "🏗️  Building frontend..."
npm run build

echo "✅ Build complete!"
