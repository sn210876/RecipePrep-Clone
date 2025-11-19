# Merge "top" Branch to "main" and Delete "top"

## Option 1: Using GitHub Web Interface (Easiest)

### Step 1: Create a Pull Request
1. Go to your GitHub repository
2. Click "Pull requests" tab
3. Click "New pull request"
4. Set:
   - Base: `main`
   - Compare: `top`
5. Click "Create pull request"
6. Review the changes
7. Click "Merge pull request"
8. Click "Confirm merge"

### Step 2: Delete the "top" Branch
1. After merging, GitHub will show "Delete branch" button
2. Click "Delete branch"
3. Done!

---

## Option 2: Using Command Line (Your Local Machine)

### Prerequisites
- Make sure you have the latest code from GitHub
- Navigate to your project directory

### Commands

```bash
# 1. Make sure you're on the main branch
git checkout main

# 2. Pull latest changes from main
git pull origin main

# 3. Merge the top branch into main
git merge top

# 4. If there are conflicts, resolve them, then:
git add .
git commit -m "Merge top branch into main"

# 5. Push the merged main branch to GitHub
git push origin main

# 6. Delete the top branch locally
git branch -d top

# 7. Delete the top branch from GitHub
git push origin --delete top
```

---

## Option 3: Force Update main from top (If you want to replace main entirely)

**⚠️ WARNING: This will overwrite main with top completely!**

```bash
# 1. Checkout the top branch
git checkout top

# 2. Pull latest changes from top
git pull origin top

# 3. Force push top to main (overwrites main completely)
git push origin top:main --force

# 4. Delete the top branch
git branch -d top
git push origin --delete top

# 5. Checkout main
git checkout main
git pull origin main
```

---

## After Merging

### Verify Render Deployment
1. Check Render dashboard - it should auto-deploy from `main` branch
2. Watch the build logs for:
   ```
   ==> Using Python version 3.11.9
   ```

### Check These Critical Files Are Present
- ✅ `runtime.txt` (in project root)
- ✅ `main.py` (with TAB-separated Instagram cookies)
- ✅ `requirements.txt` (updated versions)

### Test Instagram Extraction
After Render finishes deploying:
1. Go to your app's Add Recipe page
2. Paste: `https://www.instagram.com/p/DOsQ8bMEeHM/?hl=en`
3. Should extract thumbnail successfully

---

## Troubleshooting

### If Render Still Uses Python 3.13
**Check:** Is `runtime.txt` in the **root** of your repository?
```bash
# It should be here:
your-repo/
  ├── runtime.txt    ← HERE (project root)
  ├── main.py
  ├── requirements.txt
  └── src/
      └── ...
```

### If Instagram Still Fails
**Check:** Are the cookies in `main.py` using TAB characters?
- Open `main.py` in GitHub web editor
- Lines 40-48 should have TAB characters between fields (not spaces)
- Should NOT have `.strip()` at the end

### Which Branch Does Render Deploy?
1. Go to Render dashboard
2. Click your service
3. Go to "Settings" tab
4. Check "Branch" setting - should be `main`
5. If it's `top`, change it to `main` and click "Save Changes"

---

## Quick Summary

**What to do:**
1. Merge `top` → `main` (use Option 1, 2, or 3 above)
2. Delete `top` branch
3. Verify Render deploys from `main` branch
4. Wait for deployment
5. Test Instagram extraction

**Files that must be in main:**
- `runtime.txt` → `python-3.11.9`
- `main.py` → Fixed Instagram cookies
- `requirements.txt` → Updated versions
