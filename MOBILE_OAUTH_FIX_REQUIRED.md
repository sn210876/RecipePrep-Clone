# URGENT: Mobile OAuth Configuration Required

## The Problem
When you click "Continue with Google", it opens DuckDuckGo browser and stays there instead of returning to the app.

## Root Cause
**Android App Links are not verified.** When OAuth redirects to `https://mealscrape.com/auth/callback`, Android doesn't know it should open your app, so it opens your default browser (DuckDuckGo) instead.

Google OAuth **only accepts http/https redirect URLs** - custom schemes like `com.mealscrape.app://` are rejected with "Invalid Redirect: must use either http or https as the scheme".

## The Fix: 3 Critical Steps

### Step 1: Configure Google Cloud Console
1. Go to https://console.cloud.google.com/
2. Select your project
3. Navigate to **APIs & Services** > **Credentials**
4. Click on your OAuth 2.0 Client ID
5. Under **Authorized redirect URIs**, add:
   ```
   https://mealscrape.com/auth/callback
   ```
6. Also add the Supabase callback:
   ```
   https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback
   ```
7. Save

### Step 2: Configure Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to **Authentication** > **URL Configuration**
4. Under **Redirect URLs**, add:
   ```
   https://mealscrape.com/auth/callback
   ```
5. Save

### Step 3: Fix Android App Links (CRITICAL!)

This is why it's opening DuckDuckGo - App Links aren't verified!

#### 3a. Upload assetlinks.json to Your Website
The file `public/.well-known/assetlinks.json` **must be accessible** at:
```
https://mealscrape.com/.well-known/assetlinks.json
```

Test it - open this URL in your browser. You should see JSON, not a 404.

#### 3b. Verify SHA256 Fingerprint
Run this command to get your app's fingerprint:
```bash
cd android
./gradlew signingReport
```

Look for **SHA256** under "Variant: debug" (for testing) or "Variant: release" (for production).

Update `public/.well-known/assetlinks.json` with the correct fingerprint:
```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.mealscrape.app",
    "sha256_cert_fingerprints": [
      "YOUR_ACTUAL_SHA256_FINGERPRINT_HERE"
    ]
  }
}]
```

Format: Use colons between hex pairs (e.g., `AB:CD:EF:12:34`)

#### 3c. Trigger App Links Verification
1. **Uninstall the app completely**
2. **Upload updated assetlinks.json** to your website
3. **Reinstall the app**
4. Android will verify App Links on install

## Expected Behavior After Fix

1. Tap "Continue with Google"
2. ✅ Chrome Custom Tabs opens (NOT DuckDuckGo)
3. Sign in with Google
4. ✅ App reopens automatically (NOT browser)
5. ✅ You're signed in immediately
6. ✅ Session persists after minimize/close

## Testing Checklist

- [ ] `https://mealscrape.com/auth/callback` added to Google Cloud Console
- [ ] `https://mealscrape.com/auth/callback` added to Supabase Dashboard
- [ ] `assetlinks.json` uploaded to `https://mealscrape.com/.well-known/assetlinks.json`
- [ ] `assetlinks.json` is accessible (test in browser - not 404)
- [ ] SHA256 fingerprint in `assetlinks.json` matches your signing certificate
- [ ] App uninstalled and reinstalled (triggers verification)

## Verification Commands

### Test assetlinks.json
```bash
curl https://mealscrape.com/.well-known/assetlinks.json
```
Should return JSON, not 404.

### Check App Links Status
```bash
adb shell dumpsys package d | grep -A 10 com.mealscrape.app
```
Should show `mealscrape.com` as verified.

## Why It Opens DuckDuckGo

Without verified App Links:
1. OAuth redirects to `https://mealscrape.com/auth/callback`
2. Android doesn't know this should open your app
3. Android opens your default browser (DuckDuckGo)
4. You're stuck in the browser

With verified App Links:
1. OAuth redirects to `https://mealscrape.com/auth/callback`
2. Android sees: "This URL belongs to com.mealscrape.app"
3. Android opens your app automatically
4. OAuth completes in the app

## Still Not Working?

Common issues:
1. **assetlinks.json returns 404** - Not uploaded correctly
2. **Wrong fingerprint** - Run `./gradlew signingReport` again
3. **Cached verification** - Uninstall app, wait 10 seconds, reinstall
4. **Host blocks .well-known** - Check your hosting provider settings
5. **Wrong package name** - Must be exactly `com.mealscrape.app`

See `ANDROID_APP_LINKS_FIX.md` for more detailed troubleshooting.
