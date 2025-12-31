# Google OAuth Mobile Fix - Action Steps

## What I Fixed

1. **Changed redirect URL** from `https://mealscrape.com/auth/callback` to `com.mealscrape.app://auth/callback` for mobile
2. **Added PKCE code exchange** using `supabase.auth.exchangeCodeForSession(code)`
3. **Updated Android manifest** to handle the custom scheme deep link
4. **Rebuilt the app** with the new OAuth flow

## What You Need to Do NOW

### Step 1: Add Redirect URL to Supabase

**CRITICAL - This MUST be done or OAuth won't work:**

1. Go to https://supabase.com/dashboard
2. Select your project (vohvdarghgqskzqjclux)
3. Click **Authentication** in the left sidebar
4. Click **URL Configuration**
5. Under **Redirect URLs**, add this EXACT URL:
   ```
   com.mealscrape.app://auth/callback
   ```
6. Click **Save**

### Step 2: Rebuild and Deploy the Android App

```bash
# 1. Sync the new build to Android
npm run cap:sync

# 2. Open in Android Studio
npm run cap:open:android
```

### Step 3: In Android Studio

1. **Build → Clean Project**
2. **Build → Rebuild Project**
3. Click the **Run** button (green play icon) to install on your device
4. **IMPORTANT:** Make sure you uninstall the old APK first, or the new one might not install properly

### Step 4: Test Google OAuth

1. Open the app on your device
2. Tap "Continue with Google"
3. Watch the logs in Android Studio (Logcat)

**Expected logs:**
```
🔗 Mobile redirect URL (custom scheme): com.mealscrape.app://auth/callback
🔵 Opening OAuth in Chrome Custom Tabs with PKCE
🔗 App URL opened: com.mealscrape.app://auth/callback?code=...
✅ OAuth code found in URL (PKCE flow)
🔑 Exchanging code for session with Supabase...
✅ PKCE code exchange successful!
✅ OAuth flow completed successfully!
```

## If It Still Doesn't Work

1. **Make sure you added the redirect URL to Supabase** - This is the most common issue
2. **Check the logs** - Look for error messages starting with ❌
3. **Verify the custom scheme is working**:
   - Open Chrome on your phone
   - Type: `com.mealscrape.app://auth/callback?code=test`
   - Press enter - Your app should open

## Quick Verify Checklist

- [ ] Added `com.mealscrape.app://auth/callback` to Supabase Redirect URLs
- [ ] Ran `npm run cap:sync`
- [ ] Cleaned and rebuilt project in Android Studio
- [ ] Uninstalled old APK from device
- [ ] Installed new APK on device
- [ ] Tested Google login
- [ ] Checked logs for success messages

## What Changed in the Code

### Before (Broken):
- Used HTTPS redirect URL on mobile
- No proper PKCE code exchange
- Tokens weren't being captured

### After (Fixed):
- Uses custom scheme `com.mealscrape.app://`
- Properly exchanges authorization code for tokens
- App intercepts the deep link and completes sign in

---

**Need to see the logs?**

In Android Studio:
1. View → Tool Windows → Logcat
2. Filter by: `com.mealscrape.app`
3. Look for lines with `Capacitor/Console`
