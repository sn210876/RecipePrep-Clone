# URGENT: Mobile OAuth Configuration Required

## What Was Fixed
The app now uses a custom scheme `com.mealscrape.app://auth/callback` for mobile OAuth redirects. This ensures the redirect ALWAYS opens the MealScrape app instead of opening in DuckDuckGo or any browser.

## What You MUST Do Before Testing

### 1. Google Cloud Console
1. Go to https://console.cloud.google.com/
2. Select your project
3. Navigate to **APIs & Services** > **Credentials**
4. Click on your OAuth 2.0 Client ID
5. Under **Authorized redirect URIs**, add:
   ```
   com.mealscrape.app://auth/callback
   ```
6. Save

### 2. Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to **Authentication** > **URL Configuration**
4. Under **Redirect URLs**, add:
   ```
   com.mealscrape.app://auth/callback
   ```
5. Save

## Why This Fixes The Problem

**Before:**
- Used `https://mealscrape.com/auth/callback`
- Redirect opened in DuckDuckGo browser
- Stayed in browser, didn't open app

**After:**
- Uses `com.mealscrape.app://auth/callback`
- Custom scheme ALWAYS opens the app
- Bypasses browser completely

## Expected Behavior After Configuration

1. Tap "Continue with Google"
2. Chrome Custom Tabs (in-app browser) opens
3. Sign in with Google
4. Browser closes automatically
5. App opens immediately with you signed in
6. Session persists (even after minimize/close)

## Testing Steps

1. **Configure both services above first** (critical!)
2. Clear app data (Settings > Apps > MealScrape > Clear Data)
3. Open app
4. Tap "Continue with Google"
5. Sign in
6. ✅ Should redirect to app automatically
7. ✅ Should be signed in immediately
8. Minimize app and reopen
9. ✅ Should stay signed in

## If Still Not Working

Check the Android logs when testing:
- Look for: `🔗 Mobile redirect URL (custom scheme): com.mealscrape.app://auth/callback`
- Look for: `🔗 App URL opened: com.mealscrape.app://...`

If you see DuckDuckGo or any browser URL, the redirect URLs aren't configured correctly.
