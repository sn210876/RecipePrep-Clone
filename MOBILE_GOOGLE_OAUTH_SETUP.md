# Mobile Google OAuth Setup Guide - UPDATED 2025-12-30

## Problem
Google OAuth login on the mobile app fails because the OAuth callback doesn't properly exchange the authorization code for tokens.

## Solution
The app now uses:
1. **Custom URL scheme** (`com.mealscrape.app://`) for deep linking back to the app
2. **PKCE flow** for secure OAuth on mobile
3. **Proper code exchange** using `supabase.auth.exchangeCodeForSession()`

## Required Configuration Steps

### 1. Supabase Dashboard Configuration

You MUST add the custom scheme redirect URL to your Supabase project:

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project (vohvdarghgqskzqjclux)
3. Navigate to **Authentication** → **URL Configuration**
4. Under **Redirect URLs**, add:
   ```
   com.mealscrape.app://auth/callback
   ```
5. Click **Save**

### 2. Google Cloud Console Configuration

Make sure your Google OAuth credentials are properly configured:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to **APIs & Services** → **Credentials**
4. Edit your OAuth 2.0 Client ID
5. Under **Authorized redirect URIs**, make sure you have:
   ```
   https://vohvdarghgqskzqjclux.supabase.co/auth/v1/callback
   ```

   **Note:** This is the Supabase OAuth callback URL, NOT your app's URL. Supabase will then redirect to your custom scheme.

6. Save the changes

### 3. Testing the OAuth Flow

After making the above changes:

1. Rebuild the Android app:
   ```bash
   npm run cap:sync
   ```

2. Open the project in Android Studio:
   ```bash
   npm run cap:open:android
   ```

3. Run the app on a device or emulator

4. Try logging in with Google

5. Check the logs for these messages:
   - `🔵 Opening OAuth in Chrome Custom Tabs with PKCE`
   - `🔗 App URL opened: com.mealscrape.app://auth/callback?...`
   - `✅ OAuth code found in URL (PKCE flow)` or `✅ OAuth tokens found in URL hash (implicit flow)`
   - `✅ OAuth flow completed successfully!`

## How It Works

### OAuth Flow on Mobile (PKCE):

1. User taps "Continue with Google"
2. App generates a code_verifier and code_challenge (PKCE)
3. App opens Chrome Custom Tabs with the Google OAuth URL + code_challenge
4. User authenticates with Google
5. Google redirects to Supabase: `https://PROJECT_REF.supabase.co/auth/v1/callback?code=...`
6. Supabase validates the code and redirects to: `com.mealscrape.app://auth/callback?code=...`
7. Android intercepts the custom scheme URL and opens the app
8. App calls `supabase.auth.exchangeCodeForSession(code)` with the code_verifier
9. Supabase exchanges the code for access_token and refresh_token
10. User is logged in!

**Key Point:** The PKCE flow is more secure than implicit flow. The app receives a short-lived `code` instead of tokens directly, then exchanges it using the code_verifier that was stored locally.

## Troubleshooting

### Issue: "No OAuth code or tokens found in callback URL"

**Solution:** Make sure you added `com.mealscrape.app://auth/callback` to the Supabase Redirect URLs list.

### Issue: OAuth opens in browser but doesn't return to app

**Solution:**
1. Check that the Android manifest has the custom scheme intent-filter (already configured)
2. Make sure the app is installed on the device (not just running in emulator with outdated APK)
3. Rebuild and reinstall the app after making changes

### Issue: "redirect_uri_mismatch" error

**Solution:**
1. In Google Console, make sure the redirect URI is exactly: `https://vohvdarghgqskzqjclux.supabase.co/auth/v1/callback`
2. Double-check there are no typos or extra spaces

### Issue: Still not working after configuration

**Solution:**
1. Clear the app data on your device
2. Uninstall and reinstall the app
3. Make sure you're testing with a clean build after the configuration changes
4. Check the Android logs for any error messages:
   ```bash
   adb logcat | grep -i "mealscrape"
   ```

## What Changed in the Code

1. **Custom Scheme Redirect:** Changed from `https://mealscrape.com/auth/callback` to `com.mealscrape.app://auth/callback` for mobile
2. **PKCE Flow Support:** Added handling for OAuth code exchange (PKCE flow)
3. **Better Logging:** Enhanced debug logs to track the OAuth flow
4. **Android Manifest:** Updated intent-filters to specifically handle the auth callback

## Next Steps

After completing the Supabase configuration:

1. Sync Capacitor: `npm run cap:sync`
2. Open in Android Studio: `npm run cap:open:android`
3. Build and run the app
4. Test Google login

The OAuth flow should now work correctly on mobile!
