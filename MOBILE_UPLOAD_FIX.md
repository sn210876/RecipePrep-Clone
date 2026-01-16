# Mobile Upload Fix - Complete Guide

## Problem
Photos and videos could not be uploaded in the mobile app from Play Store for both Posts and Dailies.

## Root Cause
The previous implementation was using Capacitor's Camera API (`CameraSource.Photos`) which only allows selecting photos, not videos. Additionally, it didn't use the native file picker properly.

## Solution Implemented

### 1. Added Video Permission
**File:** `android/app/src/main/AndroidManifest.xml`
- Added `READ_MEDIA_VIDEO` permission for Android 13+ video access

### 2. Replaced Camera API with Native File Picker
**File:** `src/pages/Upload.tsx`

**Changes:**
- Added `useRef` hook to reliably reference the file input element
- Modified `handlePickFromGallery()` to trigger the native HTML file input instead of Camera API
- The file input accepts both `image/*` and `video/*`, allowing users to select:
  - Photos from gallery
  - Videos from gallery
  - Any media files from device storage

**Key Technical Details:**
```typescript
// Old approach (broken for videos):
handleCapacitorCamera(CameraSource.Photos); // Only photos

// New approach (works for all media):
fileInputRef.current.click(); // Opens native file picker
```

### 3. Enhanced Debugging
Added comprehensive console logging to track the upload flow:
- `📷 From Gallery button clicked` - Button click detected
- `✅ On native platform` - Confirmed running on mobile
- `📂 Triggering file input` - File picker being opened
- `🔍 File select triggered` - Files selection started
- `📁 Selected files count` - Number of files selected
- `🎯 Media files after filter` - Valid media files found
- `📝 File types` - Types of files selected
- `✅ Processing X media files` - Files being processed

## Testing the Fix

### Important Note
**The current Play Store version has the OLD code.** To test these fixes:

1. **Rebuild the Android app:**
   ```bash
   npm run build
   npx cap sync android
   npx cap open android
   ```

2. **In Android Studio:**
   - Build the APK (Build > Build Bundle(s) / APK(s) > Build APK(s))
   - Or create a signed release bundle for Play Store

3. **Upload to Play Store:**
   - Create a new release in Play Store Console
   - Upload the new APK/AAB
   - Wait for approval (usually 1-3 days)

4. **Test on device:**
   - Update the app from Play Store
   - Or sideload the APK directly for immediate testing

### How to Test Upload Feature

1. **Open the app**
2. **Go to Upload page** (Plus icon in navigation)
3. **Select Post Type:**
   - "Post" for regular posts (videos up to 100MB, any length)
   - "Daily" for 24-hour stories (videos max 30 seconds)

4. **Choose Upload Method:**
   - **Take Photo** - Opens camera for new photo
   - **From Gallery** - Opens file picker for photos AND videos ✨
   - **Or select files** - Main file input (also works for both)

5. **Watch Console Logs:**
   - Connect phone via USB
   - Open `chrome://inspect` in Chrome desktop
   - Select your device/app
   - View console for debug messages

### What Should Work

✅ Select single photo from gallery
✅ Select single video from gallery
✅ Select multiple photos (up to 4)
✅ Select mix of photos and videos (up to 4)
✅ Videos up to 100MB for Posts
✅ Videos up to 30 seconds for Dailies
✅ Automatic image compression
✅ Preview before uploading

### What to Check

1. **File Picker Opens:** When clicking "From Gallery" or main input
2. **Can Select Videos:** Video files are visible and selectable
3. **File Type Detection:** App correctly identifies images vs videos
4. **Validation Works:** Shows errors for invalid files
5. **Preview Shows:** Selected files appear as preview
6. **Upload Succeeds:** Files upload to Supabase storage

## Files Modified

1. `android/app/src/main/AndroidManifest.xml` - Added READ_MEDIA_VIDEO permission
2. `src/pages/Upload.tsx` - Replaced Camera API with file input for gallery
3. Built and synced to `android/app/src/main/assets/` - Ready for packaging

## Next Steps

1. **Immediate Testing (Recommended):**
   - Build APK in Android Studio
   - Sideload to your phone
   - Test immediately without Play Store approval

2. **Play Store Release:**
   - Build signed release bundle
   - Upload to Play Store
   - Submit for review
   - Wait for approval
   - Users update from Play Store

3. **Verify Fix:**
   - Check console logs
   - Test all upload scenarios
   - Confirm both photos and videos work
   - Verify posts and dailies both work

## Troubleshooting

If uploads still don't work:

1. **Check Logs:** Use `chrome://inspect` to see console messages
2. **Verify Permissions:** Ensure app has media permissions in phone settings
3. **Test File Types:** Try different image/video formats
4. **Check File Sizes:** Ensure within limits (10MB images, 100MB videos)
5. **Clear App Data:** Sometimes cached data causes issues

## Technical Notes

- The file input uses `accept="image/*,video/*"` which tells Android to show media picker
- On Android 13+, the native photo/video picker is used automatically
- The `multiple` attribute allows selecting up to 4 files at once
- Files are validated for type, size, and duration before upload
- Images are automatically compressed before upload
