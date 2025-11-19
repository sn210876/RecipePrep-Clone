# Instagram Thumbnail Fix - Deployment Instructions

## Problem Identified
1. **Cookie Format Issue**: Instagram cookies in `main.py` were using spaces instead of TAB delimiters
2. **Python Version Issue**: Render was using Python 3.13 instead of 3.11.9, causing yt-dlp compatibility errors
3. **Duplicate Files**: Had two `recipeExtractor.ts` files causing confusion

## Files Changed

### Backend Files (Deploy to Render):
1. **`main.py`** - Fixed Instagram cookie format (spaces → tabs)
2. **`requirements.txt`** - Updated to match your specified versions
3. **`runtime.txt`** (NEW FILE) - Forces Python 3.11.9 on Render

### Frontend Files (Already fixed locally):
1. **`src/lib/recipeExtractor.ts`** - DELETED (duplicate file removed)
2. **`src/services/recipeExtractor.ts`** - Now contains all extraction logic
3. **`src/pages/Settings.tsx`** - Updated import path
4. **`src/App.tsx`** - Fixed TypeScript errors

## Next Steps

### 1. Deploy Backend to Render
Push these files to your GitHub repository connected to Render:
- `main.py` (updated cookie format)
- `requirements.txt` (updated versions)
- `runtime.txt` (NEW - forces Python 3.11.9)

### 2. Wait for Render Deployment
- Render will automatically detect the changes
- It will rebuild using Python 3.11.9 (from runtime.txt)
- This fixes the yt-dlp import error

### 3. Test Instagram Extraction
Once deployed, test with an Instagram URL like:
```
https://www.instagram.com/p/DOsQ8bMEeHM/?hl=en
```

## What Was Fixed

### Cookie Format (main.py line 62-74)
**Before:**
```python
.instagram.com TRUE / FALSE 1733875200 csrftoken abxvXW3Nl1NZES5GKhSebmYt7chBhJcK
```

**After:**
```python
.instagram.com	TRUE	/	FALSE	1733875200	csrftoken	abxvXW3Nl1NZES5GKhSebmYt7chBhJcK
```
(Note: Those are actual TAB characters between fields)

### Python Version (runtime.txt)
Created new file in project root:
```
python-3.11.9
```

### File Consolidation
- Removed: `src/lib/recipeExtractor.ts`
- Kept: `src/services/recipeExtractor.ts` (single source of truth)
- Updated: `Settings.tsx` to import from services

## Expected Behavior After Fix

1. ✅ Instagram video thumbnails will extract correctly
2. ✅ Thumbnails will proxy through Supabase image-proxy
3. ✅ AllRecipes and other sites continue working
4. ✅ No more yt-dlp import errors
5. ✅ No more "does not look like Netscape format cookies" errors

## Files You Need to Commit to Git

```bash
git add main.py
git add requirements.txt
git add runtime.txt
git commit -m "Fix Instagram extraction: cookies format + Python 3.11.9"
git push origin main
```

Render will auto-deploy after push.
