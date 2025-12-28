# Google OAuth Setup Guide

Google OAuth is currently failing because the redirect URLs aren't properly configured. Follow these steps to fix it.

## 🚀 Quick Checklist

Before Google OAuth will work, you must:

- [ ] Add redirect URIs to **Google Cloud Console**
  - [ ] `https://YOUR_SUPABASE_PROJECT_ID.supabase.co/auth/v1/callback`
  - [ ] `https://mealscrape.com` (your production URL)
  - [ ] `https://mealscrape.com/auth/callback` (for mobile deep linking)

- [ ] Add redirect URLs to **Supabase Dashboard**
  - [ ] `https://mealscrape.com`
  - [ ] `https://mealscrape.com/**`

- [ ] Enable Google provider in **Supabase Dashboard**
  - [ ] Add Client ID
  - [ ] Add Client Secret

- [ ] Test on the correct environments:
  - [ ] ❌ **NOT** bolt.new (OAuth blocked by security)
  - [ ] ✅ Production deployment
  - [ ] ✅ Android app
  - [ ] ✅ localhost:5174 (for development)

---

## ⚠️ Current Issue

**Problem:** Google redirects back to your app but doesn't include authentication tokens in the URL.

**Cause:** Redirect URLs must be EXACTLY matching in:
1. Google Cloud Console
2. Supabase Dashboard

---

## 🔧 Step 1: Configure Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create one)
3. Navigate to **APIs & Services** > **Credentials**
4. Click on your OAuth 2.0 Client ID (or create one)
5. Add these **Authorized redirect URIs**:

### For Web:
```
https://YOUR_SUPABASE_PROJECT_ID.supabase.co/auth/v1/callback
https://yourdomain.com
```
*(Replace `YOUR_SUPABASE_PROJECT_ID` with your actual Supabase project ID)*
*(Replace `yourdomain.com` with your actual production domain)*

**Important:** You MUST include the Supabase callback URL. Find your project ID in your Supabase Dashboard URL: `https://supabase.com/dashboard/project/YOUR_PROJECT_ID`

### For Mobile (Android):
```
https://mealscrape.com
https://mealscrape.com/auth/callback
```

**IMPORTANT FOR MOBILE:** You must use the HTTPS URL (not a custom scheme) because:
1. Google redirects to `https://mealscrape.com/auth/callback`
2. Android deep linking intercepts this URL and reopens your app
3. The app then extracts the OAuth tokens from the URL

6. **Save** the changes

---

## 🔧 Step 2: Configure Supabase Dashboard

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Authentication** > **URL Configuration**
4. Add these **Redirect URLs**:

### For Web & Mobile:
```
https://mealscrape.com
https://mealscrape.com/**
https://yourdomain.com
https://yourdomain.com/**
```

**Note:** Mobile uses the same HTTPS URLs as web because deep linking intercepts the URL and reopens the app.

5. Navigate to **Authentication** > **Providers**
6. Enable **Google** provider
7. Add your Google OAuth credentials:
   - **Client ID** (from Google Cloud Console)
   - **Client Secret** (from Google Cloud Console)
8. **Save** the changes

---

## 🔧 Step 3: Android Deep Linking (Already Configured)

The following is already set up in your `AndroidManifest.xml`:

```xml
<intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="com.mealscrape.app" android:host="oauth-callback" />
</intent-filter>
```

✅ No action needed here.

---

## 📱 Testing Instructions

### Test on Web (Production):
1. Deploy your app to production
2. Navigate to the login page
3. Click "Sign in with Google"
4. Complete Google sign in
5. You should be redirected back and logged in automatically

### Test on Android:
1. Build and install the APK:
   ```bash
   npm run build
   npx cap sync android
   npx cap open android
   ```
2. In Android Studio, click "Run"
3. On the device, open the app
4. Click "Sign in with Google"
5. Complete Google sign in
6. You should be redirected back to the app and logged in

---

## 🐛 Troubleshooting

### Issue: "Sign in completed but session not found"
**Solution:** Check that redirect URLs in Supabase match EXACTLY what's in Google Console.

### Issue: "redirect_uri_mismatch" error from Google
**Solution:** The redirect URL doesn't match. Add the exact URL from the error message to Google Console.

### Issue: Mobile - Opens browser instead of returning to app
**Problem:** After selecting Google account, browser opens with mealscrape.com instead of returning to the app.

**Cause:** Deep linking is not configured correctly or Google OAuth redirect URLs don't match.

**Solution:**
1. Make sure `https://mealscrape.com` is added to **Google Console** Authorized redirect URIs
2. Make sure `https://mealscrape.com/**` is added to **Supabase Dashboard** Redirect URLs
3. Verify AndroidManifest.xml has deep linking configured (already done in your app):
   ```xml
   <intent-filter android:autoVerify="true">
       <action android:name="android.intent.action.VIEW" />
       <category android:name="android.intent.category.DEFAULT" />
       <category android:name="android.intent.category.BROWSABLE" />
       <data android:scheme="https" android:host="mealscrape.com" />
   </intent-filter>
   ```
4. Check the console logs when you return to the app - you should see "🔗 Deep link received"
5. If the deep link is received but has NO tokens, the error will say "OAuth callback received but no authentication tokens found"

### Issue: Mobile - App says "completing signing in" but nothing happens
**Cause:** The app received the OAuth callback but Google didn't include authentication tokens in the URL.

**Solution:**
1. Open the app and trigger Google OAuth again
2. Check the console logs for:
   - "🔗 Deep link received" - confirms the app reopened
   - "📋 Deep link URL" - shows the exact URL received
   - "⚠️ OAuth in progress but NO tokens" - confirms tokens are missing
3. The most common cause is redirect URL mismatch:
   - Google Console must have: `https://YOUR_SUPABASE_PROJECT_ID.supabase.co/auth/v1/callback`
   - Google Console must have: `https://mealscrape.com/auth/callback`
   - Supabase Dashboard must have: `https://mealscrape.com` and `https://mealscrape.com/**`

### Issue: Works on web but not on mobile
**Solution:** Make sure `https://mealscrape.com` is added to both Google Console and Supabase, not `com.mealscrape.app://oauth-callback`.

### Issue: Works on mobile but not on web
**Solution:** Add your production domain to both Google Console and Supabase.

---

## ✅ Verification

After configuration, you should see:
1. ✅ Google redirects to your app
2. ✅ URL contains tokens (or app reopens on mobile)
3. ✅ Session is automatically established
4. ✅ User is logged in and redirected to home page

---

## 📝 Important Notes

- **bolt.new**: Google OAuth will NOT work in bolt.new's preview environment due to `local-credentialless` security restrictions. Use email/password for testing in bolt.new.
- **localhost**: OAuth works on `http://localhost:5174` for local testing
- **Production**: OAuth works on your deployed production URL
- **Mobile**: OAuth works on Android/iOS apps

---

## 🔐 Security Best Practices

1. Never commit Google Client Secret to Git
2. Use environment variables for sensitive credentials
3. Restrict OAuth consent screen to your domain only (optional)
4. Enable Google Cloud Console API restrictions (optional)
5. Monitor suspicious OAuth activity in Supabase logs

---

## 📋 Recent Changes

The following improvements were made to help diagnose OAuth issues:

1. **Better error detection** - Now detects and displays OAuth errors from URL parameters
2. **Redirect URI mismatch handling** - Specific error message for configuration mismatches
3. **Diagnostic logging** - Added console logs showing:
   - Current platform (web/mobile)
   - Redirect URL being used
   - Configuration requirements
4. **Improved error messages** - Clear guidance on where to check configuration

These changes will help you identify configuration issues faster.
