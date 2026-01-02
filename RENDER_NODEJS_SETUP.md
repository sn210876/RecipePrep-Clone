# Render Node.js Server Setup Guide

## Problem Fixed
The recipe extraction from Instagram/TikTok/YouTube was failing with:
```
/bin/sh: 1: yt-dlp: not found
```

## Solution
Created `build.sh` script that automatically installs `yt-dlp` during deployment.

## Render Configuration

### In your Render Dashboard:

1. **Build Command:**
   ```bash
   ./build.sh
   ```

2. **Start Command:**
   ```bash
   node server.js
   ```

3. **Environment Variables:**
   Make sure these are set in Render:
   - `OPENAI_API_KEY` - Your OpenAI API key for recipe extraction

## Files Added/Modified

### ✅ build.sh (NEW)
- Downloads and installs `yt-dlp`
- Installs npm dependencies
- Builds the frontend
- Makes yt-dlp available at `/usr/local/bin/yt-dlp` or `./bin/yt-dlp`

### ✅ server.js (UPDATED)
- Now checks for yt-dlp in both system path and local `./bin` directory
- Automatically uses whichever is available
- Logs which yt-dlp binary is being used on startup

## Deployment Steps

1. **Commit the changes:**
   ```bash
   git add build.sh server.js RENDER_NODEJS_SETUP.md
   git commit -m "Fix: Install yt-dlp for recipe extraction"
   git push origin main
   ```

2. **Render will automatically:**
   - Run `./build.sh`
   - Install yt-dlp
   - Install npm packages
   - Build the frontend
   - Start the server with `node server.js`

3. **Verify in Render logs:**
   Look for:
   ```
   ✅ yt-dlp installed successfully
   🔍 Using yt-dlp at: /usr/local/bin/yt-dlp
   ```

## Testing

After deployment, try extracting a recipe from:
- Instagram: `https://www.instagram.com/reel/...`
- TikTok: `https://www.tiktok.com/@.../video/...`
- YouTube: `https://www.youtube.com/watch?v=...`

The extraction should now work without the "yt-dlp: not found" error!

## Troubleshooting

### If yt-dlp still not found:

1. Check Render build logs for errors
2. Verify `build.sh` has execute permissions: `chmod +x build.sh`
3. Make sure Build Command in Render is: `./build.sh` (with the `./`)

### If extraction still fails:

Check server logs for:
- `🔍 Using yt-dlp at: ...` - Shows where yt-dlp was found
- Any `yt-dlp` command errors

## What Changed

**Before:**
- Server tried to run `yt-dlp` but it wasn't installed
- Render didn't know to install yt-dlp
- Recipe extraction from social media failed

**After:**
- `build.sh` installs yt-dlp during deployment
- Server checks both system and local paths for yt-dlp
- Recipe extraction works for Instagram, TikTok, YouTube

## Status
✅ Ready to deploy! Just commit and push to trigger Render deployment.
