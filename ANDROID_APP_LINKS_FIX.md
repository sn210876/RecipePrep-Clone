# URGENT: Android App Links Fix

## The Problem
When you click "Continue with Google", it opens DuckDuckGo browser and stays there instead of returning to the app.

## Root Cause
Android App Links are **not verified**. When OAuth redirects to `https://mealscrape.com/auth/callback`, Android doesn't know it should open your app, so it opens the browser instead.

## The Solution: 3 Steps

### Step 1: Upload assetlinks.json to Your Website

The file `public/.well-known/assetlinks.json` must be accessible at:
```
https://mealscrape.com/.well-known/assetlinks.json
```

**Upload this file to your website NOW.**

### Step 2: Verify the SHA256 Fingerprint

The fingerprint in `assetlinks.json` must match your app's signing certificate.

#### Get Your Current Fingerprint:
```bash
cd android
./gradlew signingReport
```

Look for the **SHA256** under "Variant: debug" or "Variant: release" (depending on which build you're testing).

#### Update assetlinks.json:
Replace the fingerprint in `public/.well-known/assetlinks.json`:
```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.mealscrape.app",
    "sha256_cert_fingerprints": [
      "YOUR_ACTUAL_FINGERPRINT_HERE"
    ]
  }
}]
```

**Important:** Use colons `:` not spaces in the fingerprint (e.g., `AB:CD:EF:12:34`)

### Step 3: Clear App Defaults & Test

1. **Uninstall the app completely** (to reset App Links)
2. **Re-upload assetlinks.json** to your website
3. **Reinstall the app**
4. Android will automatically verify App Links on install
5. **Test OAuth:**
   - Tap "Continue with Google"
   - Should open Chrome Custom Tabs
   - After sign-in, should return to app (NOT DuckDuckGo)

## How to Verify It's Working

### Test the assetlinks.json URL
Open in browser:
```
https://mealscrape.com/.well-known/assetlinks.json
```

You should see the JSON file content (not a 404 error).

### Check Android Logs
When testing OAuth, watch for these logs:
```
🔗 Mobile redirect URL (App Links): https://mealscrape.com/auth/callback
🔵 Chrome Custom Tabs opened, waiting for App Links to intercept callback...
🔗 App URL opened: https://mealscrape.com/auth/callback?...
```

If you see the third log, App Links are working!

## Alternative: Test with ADB

Verify App Links are registered:
```bash
adb shell dumpsys package d
```

Look for your package `com.mealscrape.app` and verify `mealscrape.com` is listed.

## Quick Checklist

- [ ] `assetlinks.json` uploaded to `https://mealscrape.com/.well-known/assetlinks.json`
- [ ] `assetlinks.json` is accessible (not 404)
- [ ] SHA256 fingerprint matches your signing certificate
- [ ] Fingerprint format is correct (with colons)
- [ ] App uninstalled and reinstalled (to trigger verification)
- [ ] Google Cloud Console has `https://mealscrape.com/auth/callback` in redirect URIs
- [ ] Supabase Dashboard has `https://mealscrape.com/auth/callback` in redirect URLs

## Still Not Working?

If App Links still don't work:

1. **Check your hosting:** Some hosts block `.well-known` folders
2. **Check CORS:** The file must be accessible without authentication
3. **Check HTTPS:** The URL must be HTTPS (not HTTP)
4. **Wait 24 hours:** Google caches App Links verification for up to 24 hours
5. **Use the custom scheme fallback** (not recommended but works immediately)

## Why Not Use Custom Schemes?

Custom schemes like `com.mealscrape.app://` aren't supported by Google OAuth. Google only accepts `http://` or `https://` redirect URLs.
