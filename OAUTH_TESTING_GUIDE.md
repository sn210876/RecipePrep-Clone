# OAuth Testing Guide

## Quick Test Checklist

### ✅ Before Testing
- [ ] Google OAuth Client ID configured in Supabase
- [ ] `https://mealscrape.com/auth/callback` added to Google Console redirect URIs
- [ ] `https://mealscrape.com/auth/callback` added to Supabase redirect URLs
- [ ] App built and synced: `npm run cap:sync`
- [ ] `/.well-known/assetlinks.json` accessible on production domain

### 📱 Test 1: First-Time Login
1. Clear app data (Settings → Apps → MealScrape → Clear Data)
2. Open app
3. Tap "Sign in with Google"
4. **Expected**: In-app browser opens (should see custom toolbar color)
5. Sign in with Google account
6. **Expected**: Browser closes automatically
7. **Expected**: App shows discover feed immediately
8. **Result**: ✅ Pass / ❌ Fail

### 🔄 Test 2: App Minimize/Resume
1. Ensure you're logged in from Test 1
2. Press home button to minimize app
3. Wait 5 seconds
4. Open app again
5. **Expected**: Brief loading screen, then discover feed
6. **Expected**: Still logged in, no login screen
7. **Result**: ✅ Pass / ❌ Fail

### 🔄 Test 3: App Close/Reopen
1. Ensure you're logged in
2. Close app completely (swipe from recent apps)
3. Wait 10 seconds
4. Open app fresh
5. **Expected**: Brief loading screen, then discover feed
6. **Expected**: Still logged in, no login screen
7. **Result**: ✅ Pass / ❌ Fail

### 🌐 Test 4: Web OAuth (Comparison)
1. Open app in Chrome browser
2. Click "Sign in with Google"
3. **Expected**: Full browser redirect to Google
4. Sign in
5. **Expected**: Redirect back to app
6. **Expected**: Logged in successfully
7. **Result**: ✅ Pass / ❌ Fail

## Debugging OAuth Issues

### Issue: "Opening Google sign in..." Stuck

**Symptoms**:
- App shows "Opening Google sign in..." forever
- No in-app browser opens

**Check**:
```bash
# Check console logs
adb logcat | grep -i oauth
```

**Look for**:
- "🔵 Opening OAuth in in-app browser"
- Check if URL is logged correctly

**Fix**:
1. Force close app
2. Clear app data
3. Try again

### Issue: External Browser Opens Instead of In-App

**Symptoms**:
- Chrome browser opens separately
- OAuth completes but doesn't return to app

**Fix**:
1. Ensure `@capacitor/browser` is installed: `npm list @capacitor/browser`
2. Re-sync: `npm run cap:sync`
3. Rebuild app

### Issue: OAuth Callback Doesn't Return to App

**Symptoms**:
- OAuth completes successfully
- Browser doesn't close
- Stuck on Google success page

**Check App Links**:
```bash
# Test deep link
adb shell am start -a android.intent.action.VIEW -d "https://mealscrape.com/auth/callback#access_token=test"
```

**Should**: Open your app, not browser

**Fix**:
1. Verify `assetlinks.json` is accessible
2. Check AndroidManifest.xml has correct intent filters
3. May need to reinstall app for App Links to update

### Issue: Session Not Persisting

**Symptoms**:
- Login successful
- After minimize, shows login screen again

**Check**:
```bash
# Check storage logs
adb logcat | grep -i session
```

**Look for**:
- "✅ Session exists, updating state"
- "⚠️ No session on resume"

**Fix**:
1. Check that session tokens are being saved
2. Verify Capacitor Preferences has storage permission
3. Clear app data and try fresh login

## Console Log Reference

### Successful OAuth Flow
```
🔵 Google login initiated
🔵 Platform: true (Mobile)
🔵 Redirect URL that will be sent to Google: https://mealscrape.com/auth/callback
🔵 OAuth URL response: { data: { url: "..." }, error: null }
🔵 Opening OAuth in in-app browser: https://...
🔵 In-app browser opened, waiting for callback...
🔗 App URL opened: https://mealscrape.com/auth/callback#access_token=...
✅ In-app browser closed
✅ OAuth tokens found in URL hash
✅ Session set successfully from OAuth callback
✅ OAuth session confirmed!
```

### Successful Session Restore
```
🚀 Initializing auth...
✅ Existing session found on init, cleaning OAuth flags
📱 App resumed - checking session in AuthContext
✅ Session exists, updating state
```

## Performance Benchmarks

### Login Time (Target)
- Click "Sign in" → In-app browser opens: **< 1 second**
- Complete Google OAuth: **User dependent**
- Browser closes → App ready: **< 2 seconds**
- **Total**: < 3 seconds after OAuth completion

### Session Restore Time (Target)
- App open → Session check: **< 500ms**
- Session restore → Ready: **< 1 second**
- **Total**: < 1.5 seconds

## Common Error Messages

### "OAuth redirect succeeded but no authentication tokens received"
- Redirect URL mismatch
- Check Google Console and Supabase settings
- Ensure URLs match exactly

### "Sign in failed: redirect_uri_mismatch"
- OAuth redirect URL not authorized
- Add to Google Console authorized redirect URIs

### "Session not found after setting tokens"
- Token parsing issue
- Check console logs for token format
- May indicate Supabase configuration issue

## Testing Best Practices

1. **Always test on real device** - Emulators may not handle App Links correctly
2. **Test with cleared data** - Ensures clean state
3. **Check console logs** - Most issues show in logs
4. **Test network conditions** - Try on WiFi and mobile data
5. **Test multiple accounts** - Different Google accounts may behave differently

## Rollback Plan

If OAuth issues persist:

1. User can still login with email/password
2. OAuth can be temporarily disabled by hiding Google button
3. Alternative: Use email magic link authentication

## Success Criteria

✅ In-app browser opens for OAuth
✅ OAuth completes and browser closes automatically
✅ User logged in after OAuth
✅ Session persists after app minimize
✅ Session persists after app close/reopen
✅ No stuck states or infinite loading
✅ Clean user experience with minimal friction
