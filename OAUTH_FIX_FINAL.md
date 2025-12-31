# Google OAuth Mobile - FINAL FIX

## The Problem
Google OAuth was failing on mobile because we were manually opening the browser with `Browser.open()` and using `skipBrowserRedirect`, which bypassed Supabase's automatic OAuth handling.

## The Solution
**Let Supabase handle everything automatically.** No manual browser opening, no skipBrowserRedirect.

## What Was Changed

### Before (Broken):
```typescript
// WRONG - Manual browser handling
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: redirectUrl,
    skipBrowserRedirect: true,  // ❌ BAD
  },
});

// Then manually opening browser
await Browser.open({ url: data.url });  // ❌ BAD
```

### After (Fixed):
```typescript
// CORRECT - Let Supabase handle it
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: Capacitor.isNativePlatform()
      ? 'com.mealscrape.app://auth/callback'  // Custom scheme for mobile
      : `${window.location.origin}/auth/callback`,  // Web URL for browser
  },
});

// That's it! Supabase opens the browser automatically
```

## What You Need to Do

### 1. Add Redirect URL to Supabase (REQUIRED)

1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to **Authentication → URL Configuration**
4. Under **Redirect URLs**, add:
   ```
   com.mealscrape.app://auth/callback
   ```
5. Click **Save**

### 2. Rebuild the App

```bash
# Sync the new build
npm run cap:sync

# Open in Android Studio
npm run cap:open:android
```

### 3. In Android Studio

1. **Build → Clean Project**
2. **Build → Rebuild Project**
3. **Uninstall old APK** from your device
4. Click **Run** to install the new build

### 4. Test Google Login

Expected flow:
1. Tap "Continue with Google"
2. **Supabase automatically opens** the system browser (or Chrome Custom Tab)
3. User signs in with Google
4. Google redirects to Supabase
5. **Supabase redirects to**: `com.mealscrape.app://auth/callback?code=...`
6. **Android opens your app** with the deep link
7. App exchanges code for tokens
8. User is logged in!

## Expected Logs

```
🔵 Google login initiated
🔵 Platform: Mobile
🔵 Redirect URL: com.mealscrape.app://auth/callback
🔵 Supabase will handle the OAuth flow automatically
✅ OAuth initiated, Supabase will handle browser opening

[User signs in with Google in browser]

🔗 App URL opened: com.mealscrape.app://auth/callback?code=...
🔍 Processing OAuth callback: {"hasCode":true,"hasAccessToken":false,"hasError":false}
✅ OAuth code found (PKCE flow)
🔑 Exchanging code for session...
✅ Sign in successful!
```

## Why This Works

1. **Supabase handles browser opening** - It knows how to properly open the browser on mobile
2. **PKCE flow** - More secure than implicit flow (uses authorization code)
3. **Custom scheme deep link** - Android intercepts `com.mealscrape.app://` URLs and opens the app
4. **Proper code exchange** - App calls `exchangeCodeForSession()` to get tokens

## Common Issues

### Issue: Browser doesn't open
- Make sure you're NOT using `skipBrowserRedirect: true`
- Let Supabase open the browser automatically

### Issue: App doesn't open after sign in
- Check that `com.mealscrape.app://auth/callback` is in Supabase Redirect URLs
- Verify Android manifest has the custom scheme intent-filter

### Issue: "No code in callback URL"
- Make sure you added the redirect URL to Supabase
- Check that the deep link is being intercepted by your app

## Key Takeaway

**Don't try to manually control the OAuth flow on mobile.** Let Supabase do its job:
- ✅ Use `signInWithOAuth()` with custom scheme redirectTo
- ✅ Let Supabase open the browser
- ✅ Listen for deep link with `App.addListener('appUrlOpen')`
- ✅ Exchange code with `exchangeCodeForSession()`
- ❌ Don't use `skipBrowserRedirect`
- ❌ Don't manually call `Browser.open()`
