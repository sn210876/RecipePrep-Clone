# Android App Links Setup Guide

## Implementation Complete!

The Android App Links configuration has been set up. Follow these steps to complete the setup:

## Step 1: Get Your SHA256 Fingerprints

You need to get the SHA256 fingerprints from your Android keystores.

### Debug Keystore (for development/testing)

Run this command in your terminal:

```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

Look for the line that starts with `SHA256:` - it will look like this:
```
SHA256: AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99
```

**IMPORTANT:** Remove the colons and the "SHA256:" prefix. The final format should be:
```
AABBCCDDEEFF00112233445566778899AABBCCDDEEFF00112233445566778899
```

### Release Keystore (for production)

If you have a release keystore, run:

```bash
keytool -list -v -keystore /path/to/your/release.keystore -alias your-alias-name
```

You'll be prompted for the keystore password. Then copy the SHA256 fingerprint in the same format (without colons).

### On Windows

If you're on Windows, the debug keystore is typically located at:
```
C:\Users\YourUsername\.android\debug.keystore
```

Use this command:
```bash
keytool -list -v -keystore "%USERPROFILE%\.android\debug.keystore" -alias androiddebugkey -storepass android -keypass android
```

## Step 2: Update assetlinks.json

Once you have your SHA256 fingerprints, update the file:

`public/.well-known/assetlinks.json`

Replace:
- `REPLACE_WITH_YOUR_DEBUG_SHA256` with your debug SHA256 (no colons)
- `REPLACE_WITH_YOUR_RELEASE_SHA256` with your release SHA256 (no colons)

Example:
```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.mealscrape.app",
    "sha256_cert_fingerprints": [
      "14F9D3B7C8A2E5F1D4B9A6C3E8F2D5B7C9A4E6F1D8B3A5C7E9F2D4B6A8C1E3F5",
      "A1B2C3D4E5F6A7B8C9D0E1F2A3B4C5D6E7F8A9B0C1D2E3F4A5B6C7D8E9F0A1B2"
    ]
  }
}]
```

## Step 3: Build and Deploy

Run:
```bash
npm run build
npm run cap:sync
```

This will:
1. Build your web app (including the .well-known directory)
2. Sync the build to your Android project

## Step 4: Deploy to Production

Make sure the assetlinks.json file is accessible at:
```
https://mealscrape.com/.well-known/assetlinks.json
```

The _redirects file has already been configured to serve this correctly.

## Step 5: Verify with Google's Tool

Use Google's Digital Asset Links Tool to verify:
https://developers.google.com/digital-asset-links/tools/generator

Enter:
- **Hosting site:** https://mealscrape.com
- **App package name:** com.mealscrape.app
- **App package fingerprint (SHA256):** Your SHA256 fingerprints

Click "Generate Statement" and verify it matches your assetlinks.json file.

## Step 6: Test Deep Links

After rebuilding and reinstalling the app, test with ADB:

```bash
adb shell am start -a android.intent.action.VIEW -c android.intent.category.BROWSABLE -d "https://mealscrape.com/auth/callback"
```

This should open your app directly, not the browser.

You can also test by:
1. Sending yourself an email with a link to https://mealscrape.com/auth/callback
2. Clicking the link in your email app on Android
3. The app should open directly without showing a browser chooser

## Troubleshooting

### App Links not working?

1. **Uninstall and reinstall the app** - Android only checks for App Links on fresh installs
2. **Check logcat** for verification errors:
   ```bash
   adb logcat | grep -i "digital asset"
   ```
3. **Verify the assetlinks.json file** is accessible in a browser
4. **Check the SHA256 fingerprints** match exactly (no colons, correct case)
5. **Wait a few minutes** - verification can take time

### Temporary Testing

If you want to test immediately without waiting for verification, you can temporarily set `android:autoVerify="false"` in AndroidManifest.xml line 37, but remember to set it back to `true` before production release.

## What's Been Configured

✅ Created `public/.well-known/assetlinks.json` with placeholder fingerprints
✅ Updated `public/_redirects` to serve .well-known files
✅ Updated `dist/_redirects` for production
✅ Verified AndroidManifest.xml has correct intent-filter with autoVerify="true"
✅ Configured deep links for https://mealscrape.com

## Next Steps

1. Get your SHA256 fingerprints using the commands above
2. Update the assetlinks.json file with your actual fingerprints
3. Build and deploy
4. Test!
