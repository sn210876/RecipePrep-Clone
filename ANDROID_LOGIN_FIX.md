# Android Login Issue - Fixes Applied

## Changes Made

### 1. **Increased Timeout for Mobile Platforms** ✅
- **File**: `src/lib/authTimeout.ts`
- **Change**: Authentication timeout increased from 15 seconds to **30 seconds** for Android/iOS
- **Reason**: Mobile networks and emulators are slower than web browsers

### 2. **Removed Hardcoded Timeout in Sign-In** ✅
- **File**: `src/components/AuthForm.tsx`
- **Change**: Removed hardcoded 15-second timeout, now uses dynamic timeout (30s on mobile)

### 3. **Added Network Connectivity Check** ✅
- **File**: `src/components/AuthForm.tsx`
- **Feature**: Before attempting sign-in on Android, the app now checks for internet connectivity
- **Benefit**: Provides immediate feedback if there's no network connection

## Troubleshooting Android Login

### Check #1: Verify Internet Connection in Emulator

The Android emulator must have internet access to reach Supabase. Check:

```bash
# From terminal, check if emulator has internet
adb shell ping -c 3 8.8.8.8

# If ping fails, restart the emulator with proper network settings
```

**Common Issues:**
- Emulator using wrong network adapter
- Firewall blocking emulator traffic
- VPN interfering with emulator network

**Fix**: In Android Studio → AVD Manager → Edit emulator → Show Advanced Settings → Network: NAT

### Check #2: Verify Supabase URL is Accessible

Test if the emulator can reach Supabase:

```bash
adb shell
curl -I https://vohvdarghgqskzqjclux.supabase.co
```

**Expected**: HTTP 200 response
**If fails**: Network configuration issue or firewall blocking

### Check #3: Check Logcat for Detailed Errors

```bash
# View full authentication logs
adb logcat -s Capacitor/Console:* chromium:*

# Filter for auth-specific logs
adb logcat | grep -i "auth\|supabase\|sign"
```

**Look for**:
- `✅ Network connectivity confirmed` - Network is working
- `❌ Network connectivity check failed` - No internet in emulator
- `⏱️ Sign In timed out` - Still timing out (try restarting emulator)
- `❌ Sign in error` - Supabase error (check credentials)

### Check #4: Test with Physical Device

If emulator continues to fail, test on a real Android device:

1. Enable USB debugging on your Android phone
2. Connect via USB
3. Run: `npm run cap:run:android`
4. Select your physical device

Physical devices typically have better network connectivity than emulators.

### Check #5: Verify Environment Variables

The app needs these environment variables:

```bash
# Check if .env is being loaded
adb logcat | grep "VITE_SUPABASE"
```

If you don't see Supabase logs, the environment variables might not be loaded. Rebuild:

```bash
npm run build
npx cap sync
```

## Testing the Fix

### Test 1: Sign In with Existing Account

1. Open app in Android Studio emulator
2. Enter valid email/password
3. Click "Sign In"
4. Watch logcat for:
   ```
   🔌 Checking network connectivity...
   ✅ Network connectivity confirmed
   🔐 Attempting email/password sign in...
   ℹ️ [Auth] ⏳ Starting Sign In with 30000ms timeout
   ✅ [Auth] Sign In completed successfully
   ```

### Test 2: Sign In Without Network

1. Disable network in emulator:
   ```bash
   adb shell svc wifi disable
   adb shell svc data disable
   ```
2. Try to sign in
3. Should see: "No internet connection. Please check your network settings"
4. Re-enable network:
   ```bash
   adb shell svc wifi enable
   adb shell svc data enable
   ```

## Common Solutions

### Solution 1: Restart Emulator with Cold Boot

1. Android Studio → AVD Manager
2. Click dropdown next to your emulator → "Cold Boot Now"
3. Wait for full restart
4. Try login again

### Solution 2: Clear App Data

```bash
adb shell pm clear com.mealscrape.app
```

Then rebuild and reinstall:
```bash
npm run build
npx cap sync
```

### Solution 3: Use Different Emulator

Create a new emulator with:
- API Level 30 or higher
- Google Play Services
- Increased RAM (4GB+)

### Solution 4: Check Supabase Status

Visit [Supabase Status](https://status.supabase.com/) to verify services are operational.

## Still Having Issues?

If login still times out after 30 seconds:

1. **Check Logs**: Look for the exact error in logcat
2. **Test Web Version**: Try logging in at https://mealscrape.com (if web works, it's an Android config issue)
3. **Verify Credentials**: Ensure email/password are correct
4. **Check Supabase Dashboard**: Verify user exists and email is confirmed

## Success Indicators

You'll know it's working when you see:

```
🔌 Checking network connectivity...
✅ Network connectivity confirmed
🔐 Attempting email/password sign in...
ℹ️ [Auth] ⏳ Starting Sign In with 30000ms timeout
✅ [Auth] Sign In completed successfully
✅ Sign in completed
```

**Build completed successfully!** Deploy to Android and test.
