# Mobile OAuth Implementation Guide

## Overview
The app now uses **in-app browser (Chrome Custom Tabs on Android)** for OAuth authentication. This provides a seamless user experience without leaving the app.

## How It Works

### 1. OAuth Initiation
When a user clicks "Sign in with Google":
- On **mobile**: Opens an in-app browser (Chrome Custom Tab) with the OAuth URL
- On **web**: Uses standard browser redirect

### 2. In-App Browser
- Uses `@capacitor/browser` plugin
- Opens as a popup overlay with custom toolbar color (#FF6B35)
- User completes Google sign-in within the app
- No external browser navigation needed

### 3. Deep Link Callback
When OAuth completes:
1. Google redirects to `https://mealscrape.com/auth/callback` with tokens
2. Android App Links catches the redirect (configured in AndroidManifest.xml)
3. The app receives the URL through `App.addListener('appUrlOpen')`
4. In-app browser closes automatically
5. Tokens are extracted and session is established
6. User is logged in seamlessly

## Configuration

### Deep Links (Already Configured)
In `AndroidManifest.xml`:
```xml
<intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="https" android:host="mealscrape.com" />
    <data android:scheme="https" android:host="mealscrape.com" android:pathPrefix="/auth/callback" />
</intent-filter>
```

### App Links Verification
Ensure `/.well-known/assetlinks.json` is accessible at:
- https://mealscrape.com/.well-known/assetlinks.json

### Redirect URLs
**Mobile redirect URL**: `https://mealscrape.com/auth/callback`

This must be configured in:
1. **Google Cloud Console** → Credentials → OAuth 2.0 Client IDs → Authorized redirect URIs
2. **Supabase Dashboard** → Authentication → URL Configuration → Redirect URLs

## Session Persistence

The app now properly handles session persistence:

### On App Start
1. Checks for existing session before showing login screen
2. Cleans up stale OAuth flags if session exists
3. Shows loading screen while checking session

### On App Resume/Minimize
1. Sets loading state
2. Checks for valid session in storage
3. Restores user state
4. Never shows login screen if session is valid

### Session Storage
- Sessions are stored in **Capacitor Preferences** (native secure storage)
- Persist across app restarts
- Automatic refresh token handling by Supabase

## User Experience Flow

### First-Time Login
1. User clicks "Sign in with Google"
2. In-app browser opens with Google OAuth
3. User signs in with Google account
4. Browser closes automatically
5. User is immediately logged into the app

### Subsequent App Opens
1. User opens app
2. Sees loading screen briefly
3. Automatically logged in (no login screen shown)
4. Can use app immediately

### After Minimizing App
1. User minimizes app
2. Reopens app
3. Sees loading screen briefly
4. Session restored automatically
5. No re-login required

## Troubleshooting

### "Opening Google sign in..." Stuck
**Fixed** - The app now checks for existing session before showing OAuth state

### OAuth Opens External Browser
**Fixed** - Now uses `@capacitor/browser` with in-app browser

### Session Lost After Minimize
**Fixed** - Proper session persistence with Capacitor Preferences

### OAuth Callback Doesn't Return to App
- Verify App Links are configured correctly in AndroidManifest.xml
- Check that assetlinks.json is accessible
- Ensure redirect URL matches exactly in Google Console and Supabase

## Testing

### Test OAuth Flow
1. Clear app data/cache
2. Open app
3. Click "Sign in with Google"
4. Verify in-app browser opens
5. Sign in with Google
6. Verify browser closes automatically
7. Verify you're logged into the app

### Test Session Persistence
1. Log in successfully
2. Minimize the app
3. Reopen the app
4. Verify you're still logged in (no login screen)
5. Close the app completely
6. Reopen the app
7. Verify you're still logged in

## Code Changes

### Files Modified
1. **AuthForm.tsx**
   - Added `@capacitor/browser` import
   - Modified `handleGoogleLogin()` to use in-app browser on mobile
   - Added `appUrlOpen` listener for OAuth callbacks
   - Added session check on mount to clean OAuth flags

2. **AuthContext.tsx**
   - Improved session restoration on app resume
   - Added OAuth flag cleanup on init
   - Better loading state management

3. **App.tsx**
   - Fixed logic to not show AuthForm while loading session

### New Dependencies
- `@capacitor/browser@^7.0.0` - For in-app browser functionality

## Security Notes

- OAuth tokens are never stored in localStorage
- Supabase handles token storage in secure native storage
- In-app browser provides same security as external browser
- Chrome Custom Tabs on Android have full security features
- Session tokens auto-refresh before expiration

## Benefits

✅ Seamless OAuth experience within the app
✅ No external browser navigation
✅ Persistent sessions across app restarts
✅ Automatic session restoration
✅ Clean, modern user experience
✅ Proper deep link handling
✅ Secure token management
