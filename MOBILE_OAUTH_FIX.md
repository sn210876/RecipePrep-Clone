# Mobile Google OAuth Fix - December 28, 2024

## What Was Fixed

Added better diagnostics and error handling for mobile OAuth flow to help identify configuration issues.

### Changes Made:

1. **App.tsx** - Enhanced deep link handler:
   - Added error detection in OAuth callback URLs
   - Added specific handling for when OAuth returns without tokens
   - Better logging to diagnose configuration issues

2. **AuthForm.tsx** - Improved error messages:
   - Detects OAuth errors in URL parameters
   - Shows configuration-specific error messages
   - Better diagnostic logging

3. **GOOGLE_OAUTH_SETUP.md** - Updated with correct mobile configuration:
   - Clarified that mobile uses HTTPS URLs, not custom schemes
   - Added specific troubleshooting for mobile issues
   - Step-by-step configuration guide

## The Problem

When you click "Sign in with Google" on mobile:
1. ✅ Google page opens
2. ✅ You select your email
3. ❌ Browser opens with mealscrape.com (should reopen app instead)
4. ❌ When you manually return to app, it says "completing signing in" but fails

**Root Cause:** Google is redirecting but NOT including authentication tokens in the URL. This happens when redirect URLs aren't configured correctly.

## The Solution

You need to configure redirect URLs in **Google Cloud Console**:

### Required Redirect URIs in Google Console:

1. `https://YOUR_SUPABASE_PROJECT_ID.supabase.co/auth/v1/callback`
   - Find your project ID: `https://supabase.com/dashboard/project/YOUR_PROJECT_ID`

2. `https://mealscrape.com`

3. `https://mealscrape.com/auth/callback`

### Required Redirect URLs in Supabase Dashboard:

1. `https://mealscrape.com`
2. `https://mealscrape.com/**`

### Enable Google Provider in Supabase:

1. Go to Authentication > Providers
2. Enable Google
3. Add your Google OAuth Client ID and Secret

## How Mobile OAuth Works

1. User clicks "Sign in with Google" in app
2. App opens browser with Google OAuth URL
3. User selects Google account
4. **Google redirects to `https://mealscrape.com/auth/callback` WITH tokens in URL**
5. **Android deep linking intercepts this URL and reopens the app**
6. App extracts tokens from URL and signs in

The key is that Google MUST include tokens in the redirect URL, which only happens when redirect URLs are configured correctly.

## Testing the Fix

After configuring the redirect URLs:

1. Build and install the Android app:
   ```bash
   npm run build
   npx cap sync android
   npx cap open android
   ```

2. In Android Studio, click Run

3. In the app, click "Sign in with Google"

4. Select your Google account

5. Watch the console logs for:
   - "🔗 Deep link received" - App reopened successfully
   - "🔐 OAuth callback detected" - Tokens found
   - "✅ OAuth session set successfully" - Sign in complete

6. If you see "⚠️ OAuth in progress but NO tokens":
   - Google redirected but didn't include tokens
   - Check that ALL redirect URLs are configured correctly
   - Make sure you added the Supabase callback URL to Google Console

## Why This Happens

Google OAuth is very strict about redirect URLs. If the redirect URL requested by Supabase doesn't EXACTLY match what's configured in Google Console, Google will redirect without tokens as a security measure.

The Supabase Auth system requests a redirect to the Supabase callback URL, which then redirects to your app's URL. Both URLs must be configured.

## Next Steps

1. Go to Google Cloud Console and add the redirect URLs
2. Go to Supabase Dashboard and add the redirect URLs
3. Enable Google provider in Supabase with Client ID and Secret
4. Rebuild and test the Android app

See `GOOGLE_OAUTH_SETUP.md` for detailed step-by-step instructions.

## Diagnostic Logs

After this fix, you'll see much better logging:

```
🔵 Google login initiated
🔵 Platform: Mobile
🔵 Redirect URL that will be sent to Google: https://mealscrape.com/auth/callback
🔵 ⚠️ This URL must be configured in:
🔵    1. Google Cloud Console > Credentials > Authorized redirect URIs
🔵    2. Supabase Dashboard > Authentication > URL Configuration
```

When you return to the app:

```
🔗 Deep link received: https://mealscrape.com/auth/callback#access_token=...
🔐 OAuth callback detected in hash
✅ OAuth session set successfully!
```

Or if there's a problem:

```
🔗 Deep link received: https://mealscrape.com/auth/callback
⚠️ OAuth in progress but NO tokens in deep link URL!
⚠️ This means Google redirected without tokens.
⚠️ Check GOOGLE_OAUTH_SETUP.md for configuration steps.
```
