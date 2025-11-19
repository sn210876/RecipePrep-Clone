# Render Deployment Checklist - Fix Instagram Extraction

## The Problem
Render is still using **Python 3.13** which causes this error:
```
cannot import name '_ALL_CLASSES' from 'yt_dlp.extractor.extractors'
```

## The Solution
Force Render to use **Python 3.11.9** by adding `runtime.txt`

## Files to Deploy (Commit & Push to GitHub)

### 1. ✅ runtime.txt (NEW FILE - CRITICAL)
**Location:** Project root
**Content:**
```
python-3.11.9
```
**Why:** Forces Render to use Python 3.11.9 instead of 3.13

### 2. ✅ main.py (UPDATED)
**Changes:**
- Fixed Instagram cookie format (added blank line after header)
- Removed `.strip()` from cookie string
- Cookies now use proper TAB delimiters

### 3. ✅ requirements.txt (UPDATED)
**Updated to your specified versions:**
- fastapi==0.115.5
- yt-dlp==2024.11.4
- etc.

## Git Commands to Deploy

```bash
# Check what files changed
git status

# Add all three files
git add runtime.txt
git add main.py
git add requirements.txt

# Commit with clear message
git commit -m "Fix Instagram extraction: Python 3.11.9 + cookie format"

# Push to trigger Render deployment
git push origin main
```

## After Pushing to GitHub

1. **Watch Render Dashboard**
   - Go to your Render dashboard
   - Watch the deployment logs
   - Look for: "Python 3.11.9" in the build logs (NOT 3.13)

2. **Wait for Deployment to Complete**
   - Usually takes 2-5 minutes
   - Status will show "Live" when ready

3. **Test Instagram URL**
   - Try: `https://www.instagram.com/p/DOsQ8bMEeHM/?hl=en`
   - Should extract thumbnail and recipe data

## What to Look for in Render Logs

**✅ Good (Success):**
```
==> Using Python version 3.11.9
==> Installing dependencies from requirements.txt
==> Successfully installed yt-dlp-2024.11.4
```

**❌ Bad (Still failing):**
```
==> Using Python version 3.13.x
```

If you still see Python 3.13, make sure:
- `runtime.txt` is in the **project root** (not in a subfolder)
- `runtime.txt` contains exactly: `python-3.11.9`
- You pushed the file to GitHub

## Why This Happens

- **yt-dlp 2024.11.4** works with Python 3.11 but NOT Python 3.13
- Python 3.13 changed internal module structure
- yt-dlp hasn't been updated to support Python 3.13 yet
- Render defaults to Python 3.13 without `runtime.txt`

## Current Status

- ✅ Frontend: All fixes applied and built successfully
- ✅ Backend files: Ready in local project
- ⏳ **Waiting for: You to push to GitHub**
- ⏳ **Then: Render will auto-deploy**

## Quick Test After Deployment

Open browser console on Add Recipe page and look for:
```
[Extractor] Raw image URL: https://...cdninstagram.com/...
[Extractor] Instagram image detected, proxying: https://...supabase.co/functions/v1/image-proxy?url=...
```

This means thumbnails are being proxied correctly!
