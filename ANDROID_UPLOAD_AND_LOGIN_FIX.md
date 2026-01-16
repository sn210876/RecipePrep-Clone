# Android Upload & Login Issues - Complete Fix

## Issues Fixed

### 1. ✅ Login Timeout Issue
**Problem**: Authentication failing with "Failed to fetch" and network connectivity check failure

**Root Cause**: Network connectivity check was trying to fetch Google's favicon which was being blocked on Android emulator

**Solution**: Changed connectivity check to test Supabase endpoint directly instead of external URL

### 2. ✅ Photo/Video Upload Not Loading Issue
**Problem**: After selecting photo/video from gallery, content doesn't show up in the app

**Root Cause**:
- Missing MIME type detection on Android
- Insufficient error logging
- No proper error handling for fetch failures

**Solutions Applied**:
- Added comprehensive logging at every step
- Fixed MIME type detection for Android (handles empty/generic blob types)
- Added error handling for fetch failures
- Improved state updates with preview URLs

## Changes Made

### File: `src/components/AuthForm.tsx`
- Changed network connectivity check from Google favicon to Supabase REST API endpoint
- More reliable for testing actual backend connectivity

### File: `src/pages/Upload.tsx`
- Added detailed console logging throughout upload process
- Fixed blob type detection (Android often returns empty/generic types)
- Added fetch response validation
- Improved error messages with specific failure points
- Added platform detection logging

## Testing the Fixes

### Test 1: Login on Android

1. Rebuild and deploy:
   ```bash
   npm run build
   npx cap sync android
   ```

2. Open in Android Studio and run

3. Try to login - watch logcat for:
   ```
   🔌 Checking network connectivity...
   ✅ Network connectivity confirmed
   🔐 Attempting email/password sign in...
   ℹ️ [Auth] ⏳ Starting Sign In with 30000ms timeout
   ✅ [Auth] Sign In completed successfully
   ```

### Test 2: Upload Photo from Gallery

1. Open the app
2. Navigate to Upload/New Post page
3. Click "From Gallery"
4. Select a photo from your device

5. Watch logcat for this flow:
   ```
   📷 From Gallery button clicked
   📱 Platform: android
   📱 Is Native: true
   ✅ On native platform - using Capacitor Camera with Photos source
   📸 handleCapacitorCamera called with source: photos
   ✅ Camera.getPhoto succeeded
   🔄 Fetching image from webPath: file://...
   ✅ Blob created: { size: xxxxx, type: 'image/jpeg' }
   ✅ File created: { name: 'photo-xxx.jpg', size: xxxxx, type: 'image/jpeg' }
   🗜️ Starting compression...
   ✅ Compression complete
   ✅ Preview URL created
   ✅ State updated with image
   ```

6. You should see the image preview in the app
7. Fill in title/caption and submit

## Common Issues & Solutions

### Issue: "Network connectivity check failed"

**Diagnosis**: Check if emulator has internet access
```bash
# Test internet from emulator
adb shell ping -c 3 8.8.8.8

# Test Supabase specifically
adb shell "curl -I https://vohvdarghgqskzqjclux.supabase.co"
```

**Solutions**:
1. Restart emulator with cold boot
2. Check emulator network settings (should be NAT)
3. Disable any VPN that might block emulator traffic
4. Try on real device instead

### Issue: "Failed to get image path" or no webPath

**Diagnosis**: Capacitor Camera plugin issue

**Solutions**:
1. Verify Android permissions in `AndroidManifest.xml`:
   - `READ_EXTERNAL_STORAGE` ✅
   - `READ_MEDIA_IMAGES` ✅
   - `READ_MEDIA_VIDEO` ✅

2. Check runtime permissions - app should request permissions on first use

3. Try clearing app data:
   ```bash
   adb shell pm clear com.mealscrape.app
   ```

4. Reinstall app:
   ```bash
   npm run build
   npx cap sync android
   ```

### Issue: Image selected but preview doesn't show

**Check Logcat For**:
- `❌ Fetch failed` - Problem loading image from device
- `❌ Compression error` - Problem compressing image
- `❌ Blob type was empty/generic` - Type detection issue (should be auto-fixed now)

**Solutions**:
1. Try with a smaller image (< 10MB)
2. Try with different image format (JPEG works best)
3. Check if image is corrupted
4. Try taking new photo with camera instead of selecting from gallery

### Issue: Video upload not working

**Check**:
1. Video size (must be < 100MB)
2. Video format (MP4 works best)
3. Check logcat for specific error

**Note**: Video upload uses same flow as images but with different validation

## Debugging Commands

### View All Capacitor Logs
```bash
adb logcat -s Capacitor/Console:*
```

### View Upload-Specific Logs
```bash
adb logcat | grep -E "📷|📸|🔄|✅|❌"
```

### View Auth Logs
```bash
adb logcat | grep -E "🔌|🔐|Auth"
```

### Clear App Data & Restart
```bash
adb shell pm clear com.mealscrape.app
adb shell am start -n com.mealscrape.app/.MainActivity
```

## Expected Behavior

### ✅ Successful Upload Flow
1. User clicks "From Gallery"
2. Android photo picker opens
3. User selects photo
4. Photo appears with "Compressing image..." toast
5. Toast changes to "Image ready!"
6. Preview shows in app
7. User can add title/caption
8. Submit button becomes enabled
9. Upload succeeds

### ✅ Successful Login Flow
1. User enters email/password
2. Connectivity check passes (< 5 seconds)
3. Sign in request sent to Supabase
4. Response received within 30 seconds
5. Session established
6. User redirected to home

## Android Emulator Recommendations

For best testing experience, use emulator with:
- **API Level**: 30 or higher (Android 11+)
- **System Image**: Google Play (not Google APIs)
- **RAM**: 4GB minimum
- **Storage**: 2GB minimum
- **Graphics**: Hardware acceleration enabled

## Physical Device Testing

If emulator continues to have issues, test on physical device:

1. Enable USB debugging on phone
2. Connect via USB
3. Run: `npm run cap:run:android`
4. Select your device
5. Test upload and login

Physical devices typically have better:
- Camera/gallery access
- Network connectivity
- Storage permissions
- Overall performance

## Next Steps

After deploying these fixes:

1. **Rebuild**: `npm run build`
2. **Sync**: `npx cap sync android`
3. **Test Login**: Verify 30-second timeout and connectivity check
4. **Test Upload**: Select photo from gallery and verify preview appears
5. **Monitor Logs**: Keep logcat open to catch any new issues

All logging is comprehensive now, so any issues will be clearly visible in logcat with emoji indicators:
- 📷 📸 = Camera/Gallery operations
- 🔄 = Loading/Processing
- ✅ = Success
- ❌ = Error
- ⚠️ = Warning
- 🔌 = Network operations
- 🔐 = Authentication operations
