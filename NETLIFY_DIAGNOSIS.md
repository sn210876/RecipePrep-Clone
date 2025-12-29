# Netlify Build Failure - Diagnosis & Fix

## Problem Summary

**Error**: `python-build: definition not found: python-3.11.9`

**Root Cause**: Netlify detected Python files (`requirements.txt`, `main.py`) in your repository and attempted to install Python 3.11.9, which doesn't exist in Netlify's build image.

**Why This Happens**: Your project is primarily a React/Node.js frontend, but contains Python files for a separate backend recipe extraction service. Netlify's auto-detection saw these files and assumed you need Python.

## The Disconnect

```
┌─────────────────────────────────────────┐
│  LOCAL ENVIRONMENT (Your Computer)      │
│  ✅ requirements.txt → python-requirements.txt │
│  ✅ main.py → python-main.py            │
│  ✅ .nvmrc created                      │
│  ✅ netlify.toml updated                │
└─────────────────────────────────────────┘
                    ↓
              NOT PUSHED YET
                    ↓
┌─────────────────────────────────────────┐
│  GITHUB REPOSITORY                      │
│  ❌ Still has requirements.txt          │
│  ❌ Still has main.py                   │
│  ❌ Missing .nvmrc                      │
│  ❌ Old netlify.toml                    │
└─────────────────────────────────────────┘
                    ↓
              NETLIFY CLONES FROM GITHUB
                    ↓
┌─────────────────────────────────────────┐
│  NETLIFY BUILD ENVIRONMENT              │
│  🔍 Sees requirements.txt               │
│  🔍 Sees main.py                        │
│  ❌ Tries to install Python 3.11.9      │
│  ❌ BUILD FAILS                         │
└─────────────────────────────────────────┘
```

## Solution

Push your local changes to GitHub so Netlify sees the updated repository:

```bash
git rm -f requirements.txt main.py
git add .nvmrc netlify.toml python-requirements.txt python-main.py
git commit -m "Fix: Remove Python files causing Netlify build failure"
git push origin main
```

## After Pushing

```
┌─────────────────────────────────────────┐
│  GITHUB REPOSITORY                      │
│  ✅ No requirements.txt                 │
│  ✅ No main.py                          │
│  ✅ Has .nvmrc (Node 20)                │
│  ✅ Updated netlify.toml                │
└─────────────────────────────────────────┘
                    ↓
              NETLIFY CLONES FROM GITHUB
                    ↓
┌─────────────────────────────────────────┐
│  NETLIFY BUILD ENVIRONMENT              │
│  🔍 Sees .nvmrc → Uses Node 20          │
│  ✅ npm install                         │
│  ✅ npm run build                       │
│  ✅ BUILD SUCCESS                       │
└─────────────────────────────────────────┘
```

## Verification Steps

### 1. Check Local Files
```bash
ls -la | grep -E "requirements.txt|main.py"
# Should show: python-requirements.txt, python-main.py
# Should NOT show: requirements.txt, main.py
```

### 2. Verify .nvmrc
```bash
cat .nvmrc
# Should show: 20
```

### 3. Check netlify.toml
```bash
cat netlify.toml | grep NODE_VERSION
# Should show: NODE_VERSION = "20"
```

### 4. Push to GitHub
```bash
git status  # See what will be committed
git add .nvmrc netlify.toml python-*
git rm -f requirements.txt main.py
git commit -m "Fix Netlify Python detection"
git push origin main
```

### 5. Verify on GitHub
Visit your repository on GitHub and confirm:
- ❌ `requirements.txt` is gone
- ❌ `main.py` is gone
- ✅ `.nvmrc` exists
- ✅ `netlify.toml` is updated
- ✅ `python-requirements.txt` exists (optional)
- ✅ `python-main.py` exists (optional)

### 6. Watch Netlify Build
Go to Netlify → Deploys → Watch the new build:
```
Building...
✅ Detected Node.js 20
✅ Installing dependencies
✅ Building production bundle
✅ Deploy succeeded
```

## Common Issues

### "Still getting Python error after pushing"
- Clear Netlify cache: Site settings → Clear cache and deploy site
- Check GitHub for hidden files: `.python-version`, `.tool-versions`, `runtime.txt`
- Verify changes are actually on GitHub (check the web interface)

### "Git says nothing to commit"
- Changes might already be staged/committed
- Run `git log -1` to see last commit
- Run `git push origin main` to push existing commits

### "Can't find requirements.txt to remove"
- Already renamed! Just add the new files:
  ```bash
  git add .nvmrc netlify.toml python-requirements.txt python-main.py
  git commit -m "Add Node.js config and rename Python files"
  git push origin main
  ```

## Files Changed

| Old State | New State | Purpose |
|-----------|-----------|---------|
| `requirements.txt` | ❌ Removed from git | Prevent Python detection |
| `main.py` | ❌ Removed from git | Prevent Python detection |
| - | ✅ `python-requirements.txt` | Reference for Python backend |
| - | ✅ `python-main.py` | Reference for Python backend |
| - | ✅ `.nvmrc` | Specify Node.js 20 |
| `netlify.toml` | ✅ Updated | Proper build config |

## Next Steps

1. **Run the commands** in DEPLOY_NOW.md
2. **Push to GitHub**
3. **Watch Netlify deploy** automatically
4. **Verify site** works at your Netlify URL

Done! Your React app will deploy successfully on Netlify.
