# OAuth Configuration Checklist

This guide provides a complete checklist for configuring Google OAuth authentication for both web and mobile platforms.

## Overview

The app uses **PKCE (Proof Key for Code Exchange)** OAuth flow, which is more secure than the implicit flow. Here's how it works:

1. User clicks "Sign in with Google"
2. Supabase redirects to Google OAuth page
3. User signs in with Google
4. Google redirects to Supabase with authorization code
5. Supabase redirects to app with authorization code
6. App exchanges code for access/refresh tokens
7. User is logged in

## Required Redirect URL

**Critical:** All OAuth providers must use this exact redirect URL:

```
https://mealscrape.com/auth/callback
```

## Configuration Steps

### 1. Google Cloud Console Setup

1. Go to https://console.cloud.google.com/
2. Select your project (or create one)
3. Navigate to **APIs & Services** → **Credentials**
4. Find your OAuth 2.0 Client ID (or create one)
5. Click on it to edit
6. Under **Authorized redirect URIs**, add **BOTH**:
   ```
   https://mealscrape.com/auth/callback
   https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback
   ```
7. Click **Save**

**Why two URLs?**
- The Supabase URL is where Google redirects first
- The mealscrape.com URL is where Supabase redirects with the authorization code

### 2. Supabase Dashboard Setup

1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to **Authentication** → **URL Configuration**
4. Under **Redirect URLs**, add:
   ```
   https://mealscrape.com/auth/callback
   ```
5. Click **Save**

6. Navigate to **Authentication** → **Providers**
7. Find **Google** provider
8. Ensure it's enabled
9. Verify your Google Client ID and Secret are set
10. Click **Save**

### 3. Android App Links (Mobile Only)

For mobile OAuth to work, Android App Links must be verified. This allows the app to intercept `https://mealscrape.com/auth/callback` URLs.

#### 3a. Generate SHA256 Fingerprint

```bash
cd android
./gradlew signingReport
```

Look for the **SHA256** fingerprint under:
- **Variant: debug** (for testing)
- **Variant: release** (for production)

Copy the SHA256 fingerprint (format: `AB:CD:EF:12:34:...`)

#### 3b. Create assetlinks.json

The file should already exist at `public/.well-known/assetlinks.json`:

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.mealscrape.app",
    "sha256_cert_fingerprints": [
      "YOUR_SHA256_FINGERPRINT_HERE"
    ]
  }
}]
```

Replace `YOUR_SHA256_FINGERPRINT_HERE` with your actual fingerprint from step 3a.

#### 3c. Deploy assetlinks.json

The file **must be accessible** at:
```
https://mealscrape.com/.well-known/assetlinks.json
```

Test it:
```bash
curl https://mealscrape.com/.well-known/assetlinks.json
```

You should see the JSON content, not a 404 error.

#### 3d. Trigger App Links Verification

Android verifies App Links on installation:

1. **Uninstall** the app completely from your device
2. **Ensure** assetlinks.json is deployed and accessible
3. **Reinstall** the app
4. Android will verify the App Links automatically

Verify it worked:
```bash
adb shell dumpsys package d | grep -A 10 com.mealscrape.app
```

Look for `mealscrape.com` with status `verified`.

## Testing OAuth Flow

### Web Testing

1. Open https://mealscrape.com in browser
2. Click "Sign in with Google"
3. **Expected:** Google sign-in page opens
4. Sign in with your Google account
5. **Expected:** Redirected back to mealscrape.com
6. **Expected:** Logged in successfully

**If it fails:**
- Check browser console for error messages
- Look for redirect_uri_mismatch errors
- Verify redirect URLs match exactly in Google Console and Supabase

### Mobile Testing

1. Open the MealScrape app on your Android device
2. Click "Continue with Google"
3. **Expected:** Chrome Custom Tab opens with Google sign-in
4. Sign in with your Google account
5. **Expected:** Chrome Custom Tab closes automatically
6. **Expected:** App opens and you're logged in

**If it opens browser instead:**
- App Links are not verified
- Check assetlinks.json is accessible
- Verify SHA256 fingerprint matches
- Uninstall and reinstall the app

**If it stays in browser:**
- Same as above - App Links verification failed

## Troubleshooting

### Error: "redirect_uri_mismatch"

**Problem:** The redirect URL in the OAuth request doesn't match what's configured in Google Console.

**Solution:**
1. Go to Google Console → Credentials
2. Verify both URLs are added:
   - `https://mealscrape.com/auth/callback`
   - `https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback`
3. Make sure there are no typos or extra spaces
4. Save and try again

### Error: "No session received after OAuth redirect"

**Problem:** OAuth completes but no authorization code is received.

**Solutions:**
1. Check Supabase redirect URLs include `https://mealscrape.com/auth/callback`
2. Look in browser console for more specific errors
3. Verify Google OAuth provider is enabled in Supabase
4. Check that Client ID and Secret are correct

### Mobile: Opens DuckDuckGo/Chrome instead of app

**Problem:** Android App Links are not verified.

**Solutions:**
1. Ensure `assetlinks.json` is accessible at `https://mealscrape.com/.well-known/assetlinks.json`
2. Verify SHA256 fingerprint matches your signing key
3. Uninstall app completely
4. Reinstall app (triggers verification)
5. Check verification status: `adb shell dumpsys package d | grep -A 10 com.mealscrape.app`

### Mobile: Chrome Custom Tab doesn't close after sign in

**Problem:** The deep link isn't being intercepted by the app.

**Solutions:**
- Same as above - App Links verification issue
- Check that `com.mealscrape.app` package name is correct in assetlinks.json
- Ensure Android manifest has the correct intent-filters

## Verification Commands

### Test assetlinks.json accessibility
```bash
curl https://mealscrape.com/.well-known/assetlinks.json
```
Should return JSON, not 404.

### Check Android App Links verification
```bash
adb shell dumpsys package d | grep -A 10 com.mealscrape.app
```
Should show `mealscrape.com` with status `verified`.

### Get SHA256 fingerprint
```bash
cd android
./gradlew signingReport
```
Look for SHA256 under "Variant: debug" or "Variant: release".

## Code Flow Reference

### Web Flow
1. User clicks "Sign in with Google"
2. `AuthForm.tsx` calls `supabase.auth.signInWithOAuth()`
3. Supabase redirects to Google OAuth page
4. User signs in
5. Google redirects to `https://YOUR_PROJECT.supabase.co/auth/v1/callback?code=...`
6. Supabase redirects to `https://mealscrape.com/auth/callback?code=...`
7. `AuthContext.tsx` detects code and calls `exchangeCodeForSession()`
8. Session is established

### Mobile Flow
1. User clicks "Continue with Google"
2. `AuthForm.tsx` calls `supabase.auth.signInWithOAuth()`
3. Supabase opens Chrome Custom Tab with Google OAuth page
4. User signs in
5. Google redirects to `https://YOUR_PROJECT.supabase.co/auth/v1/callback?code=...`
6. Supabase redirects to `https://mealscrape.com/auth/callback?code=...`
7. Android App Links intercepts URL and opens app
8. `App.tsx` deep link handler detects code and calls `exchangeCodeForSession()`
9. Session is established
10. Chrome Custom Tab closes automatically

## Success Indicators

### Console Logs (Web)
```
🔵 Google login initiated
🔵 Platform: Web
🔵 Redirect URL: https://mealscrape.com/auth/callback
✅ OAuth initiated, Supabase will handle browser opening
[User signs in]
🔑 PKCE authorization code detected in URL
🔄 Exchanging code for session...
✅ Code exchanged successfully!
```

### Console Logs (Mobile)
```
🔵 Google login initiated
🔵 Platform: Mobile
🔵 Redirect URL: https://mealscrape.com/auth/callback
✅ OAuth initiated, Supabase will handle browser opening
[User signs in]
🔗 Deep link received: https://mealscrape.com/auth/callback?code=...
🔑 PKCE authorization code detected!
🔄 Exchanging code for session...
✅ Code exchanged successfully!
📢 Dispatching oauth-callback-complete event
✅ OAuth session established successfully!
```

## Important Notes

1. **NEVER use custom URL schemes** (like `com.mealscrape.app://`) for Google OAuth - they're not supported
2. **Always use HTTPS** - Google OAuth requires secure redirect URLs
3. **App Links must be verified** on Android for mobile OAuth to work
4. **assetlinks.json must be publicly accessible** - no authentication required
5. **Exact URL match required** - trailing slashes, http vs https, etc. all matter

## Need Help?

If OAuth still isn't working after following this guide:

1. Check browser/app console for specific error messages
2. Verify all URLs match exactly (copy/paste to avoid typos)
3. Test assetlinks.json accessibility with curl
4. Check App Links verification status with adb
5. Try completely uninstalling and reinstalling the mobile app
