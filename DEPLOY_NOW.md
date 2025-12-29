# 🚀 Deploy to Netlify - Quick Fix

## Current Status
✅ Files renamed locally (requirements.txt → python-requirements.txt, main.py → python-main.py)
✅ .nvmrc created with Node.js 20
✅ netlify.toml updated
❌ Changes NOT on GitHub yet → Netlify still seeing old files

## Fix in 3 Commands

```bash
# 1. Navigate to your project (if not already there)
cd RecipePrep-Clone

# 2. Remove old Python files from Git and stage new files
git rm -f requirements.txt main.py
git add .nvmrc netlify.toml python-requirements.txt python-main.py NETLIFY_DEPLOYMENT_FIX.md

# 3. Commit and push
git commit -m "Fix: Remove Python files causing Netlify build failure"
git push origin main
```

## What This Does

1. **Removes** `requirements.txt` and `main.py` from Git tracking
2. **Adds** the renamed Python files (now ignored by Netlify)
3. **Adds** `.nvmrc` to specify Node.js 20
4. **Updates** `netlify.toml` for correct build settings
5. **Pushes** to GitHub → triggers automatic Netlify rebuild

## Expected Result

Netlify build log will show:
```
✅ Detected Node.js version 20 from .nvmrc
✅ Running npm install
✅ Running npm run build
✅ Build completed successfully
```

## If Build Still Fails

1. **Check GitHub**: Visit your repo and verify `requirements.txt` and `main.py` are gone
2. **Clear Netlify cache**: Site settings → Build & deploy → Clear cache and deploy site
3. **Check for hidden files**: Look for `.python-version`, `.tool-versions`, or `runtime.txt` on GitHub

## Python Backend Service

Your Python recipe extraction API (`python-main.py`) is a **separate service**:
- ✅ Kept in repo for reference
- ✅ Renamed so Netlify ignores it
- 📝 Deploy separately to Render/Railway if needed
- 📝 Update frontend to point to Python backend URL

---

**Ready to deploy? Run the 3 commands above! 🚀**
