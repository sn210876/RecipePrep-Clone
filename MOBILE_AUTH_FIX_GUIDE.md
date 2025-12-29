# Mobile App Authentication Fix Guide

## Overview
This guide documents the fixes implemented to resolve authentication issues in the mobile app (Android/iOS), specifically addressing:
1. Email/password login showing "invalid credentials" error
2. Google OAuth opening in browser instead of staying in-app
3. Proper session persistence across app restarts

## What Was Fixed

### 1. Deep Linking Configuration

#### Android (AndroidManifest.xml)
Added two intent filters to handle deep links:

```xml
<!-- HTTPS App Links (for universal links) -->
<intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="https" android:host="mealscrape.com" />
</intent-filter>

<!-- Custom URL Scheme (for OAuth callbacks) -->
<intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="com.mealscrape.newapp" />
</intent-filter>
```

#### iOS (Info.plist)
Added URL scheme configuration:

```xml
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLName</key>
        <string>com.mealscrape.newapp</string>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>com.mealscrape.newapp</string>
        </array>
    </dict>
</array>
```

### 2. OAuth Redirect URL Update

Updated the `AuthForm.tsx` component to use custom URL schemes for mobile:
- **Mobile**: `com.mealscrape.newapp://`
- **Web**: Original domain (https://mealscrape.com)

This ensures OAuth callbacks redirect back to the app instead of opening in the browser.

### 3. Deep Link Handler in App.tsx

Added comprehensive deep link handling that:
- Listens for incoming deep links via `appUrlOpen` event
- Extracts OAuth tokens from URL hash or query parameters
- Automatically sets the session using `supabase.auth.setSession()`
- Handles both access_token and refresh_token
- Redirects to the home page after successful authentication

### 4. Enhanced Error Handling

Improved error messages for email/password authentication:
- ✅ "Invalid email or password" - for incorrect credentials
- ✅ "Please verify your email address" - for unverified accounts
- ✅ "No account found" - for non-existent users
- ✅ Email verification check before allowing sign-in

### 5. Supabase Client Configuration

Updated authentication settings:
- Set `detectSessionInUrl: false` - prevents automatic URL detection (handled manually via deep links)
- Maintained PKCE flow for security
- Optimized for mobile session management

## Required Supabase Dashboard Setup

You **MUST** add the following redirect URLs to your Supabase project:

### Steps:
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Authentication** → **URL Configuration**
4. Add these to **Additional Redirect URLs**:

```
com.mealscrape.newapp://
com.mealscrape.newapp://**
https://mealscrape.com
https://mealscrape.com/**
https://mealscrape.com/*
```

⚠️ **CRITICAL**: The custom scheme `com.mealscrape.newapp://` MUST be added or OAuth will not work in the mobile app.

## Testing Instructions

### Email/Password Login
1. Open the mobile app
2. Enter your verified email and password
3. Click "Sign In"
4. ✅ You should now be logged in successfully
5. Close and reopen the app - you should remain logged in

### Google OAuth Login
1. Open the mobile app
2. Click "Continue with Google"
3. ✅ Authentication should happen within the app (not browser)
4. After selecting your Google account, you should be redirected back to the app
5. ✅ You should be logged in and see the home screen

### Common Issues & Solutions

#### Issue: "Invalid login credentials"
**Solution**:
- Verify your email address by clicking the link sent to your inbox
- Make sure you're using the correct password
- Try resetting your password if needed

#### Issue: OAuth still opens in browser
**Solution**:
- Verify `com.mealscrape.newapp://` is added to Supabase redirect URLs
- Rebuild the app: `npm run cap:sync` and reinstall on device
- Check Android Studio/Xcode logs for deep link errors

#### Issue: Session doesn't persist
**Solution**:
- Check that CapacitorStorage is working properly
- Look for errors in the app logs
- Try signing out and signing in again

## Building and Deploying

After these changes, you need to rebuild and reinstall the app:

### Android
```bash
npm run build
npx cap sync android
npx cap open android
```
Then build and run from Android Studio.

### iOS
```bash
npm run build
npx cap sync ios
npx cap open ios
```
Then build and run from Xcode.

## Technical Details

### Authentication Flow (OAuth)

1. User clicks "Continue with Google" in mobile app
2. AuthForm detects it's a mobile platform and uses `com.mealscrape.newapp://` as redirect URL
3. Supabase initiates OAuth flow with Google
4. User authenticates with Google
5. Google redirects to `com.mealscrape.newapp://#access_token=...&refresh_token=...`
6. Android/iOS system routes this URL to the app via deep linking
7. App.tsx `appUrlOpen` listener catches the URL
8. Tokens are extracted and passed to `supabase.auth.setSession()`
9. User is now logged in with session persisted in CapacitorStorage

### Authentication Flow (Email/Password)

1. User enters email and password
2. App calls `supabase.auth.signInWithPassword()`
3. Enhanced error handling provides clear feedback
4. Checks if email is verified before allowing access
5. Session is automatically stored in CapacitorStorage
6. AuthContext manages the session state globally

## Debugging

Enable detailed logging by checking:
- Browser/Device console for log messages
- Look for messages prefixed with:
  - 🔗 (deep links)
  - 🔐 (authentication)
  - ✅ (success)
  - ❌ (errors)

### Android Logcat
```bash
adb logcat | grep -i "mealscrape\|supabase\|auth"
```

### iOS Console
Open Xcode → Window → Devices and Simulators → Select your device → Open Console

## Files Modified

1. `/android/app/src/main/AndroidManifest.xml` - Added deep link intent filters
2. `/ios/App/App/Info.plist` - Added URL scheme configuration
3. `/src/App.tsx` - Enhanced appUrlOpen listener for OAuth callbacks
4. `/src/components/AuthForm.tsx` - Updated redirect URLs and error handling
5. `/src/lib/supabase.ts` - Optimized auth configuration for mobile

## Support

If you continue to experience issues:
1. Check that all Supabase redirect URLs are correctly configured
2. Verify the app was rebuilt and reinstalled after code changes
3. Clear app data and try again
4. Check device logs for specific error messages
