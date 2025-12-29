# Netlify Deployment Fix

## Problem
Netlify was detecting Python files (`requirements.txt`, `main.py`) and attempting to install Python 3.11.9, which doesn't exist in their build image. This caused the build to fail with:
```
python-build: definition not found: python-3.11.9
```

## Solution
The Python files are for a **separate backend service** (recipe extraction API), not for the Netlify frontend build.

### Changes Made:
1. **Renamed Python files** to prevent auto-detection:
   - `requirements.txt` → `python-requirements.txt`
   - `main.py` → `python-main.py`

2. **Created `.nvmrc`** with Node.js version 20 to explicitly specify the runtime

3. **Updated `netlify.toml`** with:
   - Explicit Node.js 20 configuration
   - Optimized cache headers for assets
   - SPA routing for React Router

## Important Notes
- The Python backend service should be deployed separately (e.g., on Render, Railway, or a VPS)
- The Netlify build is **Node.js only** and builds the React frontend
- If you need to use the Python files, restore their original names in a separate deployment

## Deployment Checklist
- [ ] Push updated code to GitHub
- [ ] Set environment variables in Netlify:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - Any other `VITE_` prefixed variables
- [ ] Trigger a new deploy in Netlify dashboard
- [ ] Verify the build completes successfully

## Python Backend Deployment
If you need the recipe extraction service:
1. Rename `python-main.py` back to `main.py`
2. Rename `python-requirements.txt` back to `requirements.txt`
3. Deploy to a Python hosting service with Python 3.11+ support
4. Update frontend to point to the Python backend URL
