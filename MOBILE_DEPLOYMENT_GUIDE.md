# MealScrape Mobile Deployment Guide

Complete guide to deploying MealScrape on iOS App Store and Google Play Store.

## Prerequisites

### Required Accounts
- **Apple Developer Program**: $99/year - https://developer.apple.com
- **Google Play Console**: $25 one-time - https://play.google.com/console
- Active Supabase project with production database

### Required Software
- **macOS** (for iOS builds): Xcode 14+ from Mac App Store
- **Android Studio**: Latest version from https://developer.android.com/studio
- **Node.js**: v18+ (already installed)
- **Capacitor CLI**: Already configured in this project

---

## Part 1: Pre-Deployment Setup

### 1. Update App Version

Edit `package.json`:
```json
"version": "1.0.0"
```

### 2. Verify Environment Variables

Ensure `.env` has production Supabase credentials:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Build Web Assets

```bash
npm run build
```

This creates optimized production files in the `dist/` folder.

### 4. Sync with Native Projects

```bash
npm run cap:sync
```

This copies web assets to both iOS and Android projects.

---

## Part 2: iOS App Store Deployment

### Step 1: Apple Developer Setup

1. Join Apple Developer Program at https://developer.apple.com/programs/
2. Accept license agreements
3. Set up App Store Connect account
4. Complete tax and banking information

### Step 2: Create App in App Store Connect

1. Go to https://appstoreconnect.apple.com
2. Click "My Apps" → "+" → "New App"
3. Fill in details:
   - **Platform**: iOS
   - **Name**: MealScrape
   - **Primary Language**: English
   - **Bundle ID**: `com.mealscrape.app` (already configured)
   - **SKU**: `mealscrape-ios-001`
   - **User Access**: Full Access

### Step 3: Prepare App Metadata

Create the following assets:

**App Icon**: 1024x1024 PNG (no transparency)
- Use your existing logo/icon
- Must not have rounded corners

**Screenshots** (required sizes):
- iPhone 6.7": 1290 x 2796 px (at least 3 screenshots)
- iPhone 6.5": 1242 x 2688 px
- iPhone 5.5": 1242 x 2208 px
- iPad Pro 12.9": 2048 x 2732 px (if supporting iPad)

**App Description**:
```
Discover, save, and share delicious recipes with the MealScrape community.
Extract recipes from any cooking website, create custom meal plans, and
connect with fellow food enthusiasts.

Features:
• Extract recipes from popular cooking websites
• Create and share your own recipes
• Follow chefs and food lovers
• Organize with meal planner and grocery lists
• Save favorites to your personal collection
• Rate and review recipes
• Social feed with recipe videos and photos
• Cook mode with step-by-step instructions
```

**Keywords**: recipe,cooking,meal,food,planner,grocery,chef,cooking app

**Privacy Policy URL**: Host PRIVACY_POLICY.md and provide URL

### Step 4: Configure App in Xcode

1. Open iOS project:
```bash
npm run cap:open:ios
```

2. In Xcode:
   - Select "App" project in navigator
   - Go to "Signing & Capabilities" tab
   - Check "Automatically manage signing"
   - Select your Apple Developer Team
   - Verify Bundle Identifier: `com.mealscrape.app`

3. Set deployment target to iOS 13.0 or higher

4. Configure Info.plist permissions (already done):
   - Camera Usage: "To take photos of your recipes"
   - Photo Library Usage: "To select recipe photos"
   - Notifications: "To notify you about interactions"

### Step 5: Build and Archive

1. In Xcode, select "Any iOS Device" as destination
2. Product → Archive (takes 5-10 minutes)
3. When complete, Organizer window opens
4. Click "Distribute App"
5. Select "App Store Connect"
6. Click "Upload"
7. Wait for processing (15-30 minutes)

### Step 6: Submit for Review

1. Return to App Store Connect
2. Go to your app → "App Store" tab
3. Click "+ Version or Platform"
4. Select the uploaded build
5. Fill in "What's New in This Version"
6. Add screenshots for all required device sizes
7. Complete rating questionnaire
8. Submit for Review

**Review Timeline**: 1-3 days typically

---

## Part 3: Google Play Store Deployment

### Step 1: Google Play Console Setup

1. Create account at https://play.google.com/console
2. Pay $25 registration fee
3. Complete identity verification
4. Accept Developer Distribution Agreement

### Step 2: Create App in Play Console

1. Click "Create app"
2. Fill in details:
   - **App name**: MealScrape
   - **Default language**: English (United States)
   - **App or game**: App
   - **Free or paid**: Free
   - Accept declarations

### Step 3: Set Up App Content

Navigate through setup checklist:

**Privacy Policy**:
- Host PRIVACY_POLICY.md online
- Add URL in Play Console

**App Access**:
- Check "All functionality is available without restrictions"

**Ads**:
- Select "No, my app does not contain ads"

**Content Rating**:
- Complete questionnaire
- Select "Social networking and community apps"
- Answer questions honestly
- Get rating (likely E for Everyone)

**Target Audience**:
- Check age groups 13+ (not directed at children)

**Data Safety**:
- Data collected: Email, username, photos, user content
- Data shared: None
- Encryption: Yes, data encrypted in transit
- Users can request deletion: Yes

### Step 4: Prepare Store Listing

Create these assets:

**App Icon**: 512x512 PNG (32-bit)

**Feature Graphic**: 1024x500 (required)
- Promotional banner for app listing

**Screenshots**:
- Phone: At least 2 screenshots (recommended: 4-8)
- Sizes: 16:9 or 9:16 aspect ratio
- Minimum dimension: 320px

**Short Description** (max 80 chars):
```
Discover recipes, plan meals, and connect with food lovers
```

**Full Description** (max 4000 chars):
```
Transform your cooking experience with MealScrape!

🍳 DISCOVER & SAVE RECIPES
Extract recipes from any cooking website with one click. Save your favorites and access them anytime, even offline.

📅 MEAL PLANNING MADE EASY
Plan your weekly meals and automatically generate grocery lists. Never forget an ingredient again!

👥 CONNECT WITH FOOD LOVERS
Follow chefs, share your creations, and get inspired by a community passionate about food.

✨ KEY FEATURES:
• Recipe extraction from popular cooking sites
• Create and share your own recipes
• Smart meal planner with calendar view
• Auto-generated grocery lists
• Social feed with recipe videos
• Rate and review community recipes
• Cook mode with hands-free voice controls
• Save recipes to collections
• Follow your favorite chefs
• Direct messaging with other users

🔒 YOUR PRIVACY MATTERS
We never sell your data. Your recipes and personal information are secure and encrypted.

💡 PERFECT FOR:
• Home cooks looking to organize recipes
• Meal preppers planning weekly menus
• Food enthusiasts sharing culinary creations
• Anyone wanting to simplify grocery shopping

Download MealScrape today and join thousands of food lovers making cooking easier and more enjoyable!

Need help? Contact support@mealscrape.com
```

### Step 5: Generate Signed Release Build

1. Open Android Studio:
```bash
npm run cap:open:android
```

2. Generate signing key (first time only):
   - Build → Generate Signed Bundle/APK
   - Choose "Android App Bundle"
   - Click "Create new..." keystore
   - Save to safe location (NOT in project folder)
   - Remember all passwords and keystore details!
   - **CRITICAL**: Back up this keystore file - you cannot update your app without it

3. Build release:
   - Build → Generate Signed Bundle/APK
   - Select "Android App Bundle"
   - Choose your keystore
   - Build type: "release"
   - Wait for build to complete

4. Find output: `android/app/release/app-release.aab`

### Step 6: Upload to Play Console

1. In Play Console, go to "Production" → "Create new release"
2. Upload `app-release.aab` file
3. Fill in release details:
   - **Release name**: 1.0.0
   - **Release notes**: "Initial release of MealScrape"
4. Review and roll out to production

**OR** start with internal testing:
- Go to "Internal testing" track
- Upload AAB there first
- Add test users
- Get feedback before production release

**Review Timeline**: Usually 1-3 days

---

## Part 4: Continuous Updates Strategy

### How to Update Your Apps

Your app uses **Supabase as the backend**, which means:

✅ **NO App Store Submission Needed For**:
- UI changes and styling
- New features using existing permissions
- Bug fixes in React code
- Database schema changes
- Business logic updates
- Content updates

❌ **App Store Submission Required For**:
- New native permissions
- New Capacitor plugins
- Changes to app icons/splash screens
- Version number changes
- Info.plist or AndroidManifest.xml changes

### Update Workflow

**For code/feature updates** (no store submission):
```bash
# 1. Make your changes in src/
# 2. Build and sync
npm run cap:sync
# 3. Test locally
npm run cap:run:ios    # or cap:run:android
# 4. Changes are live immediately for web users
# 5. Mobile users get updates on next app restart
```

**For native updates** (requires submission):
```bash
# 1. Update version in package.json
# 2. Build and sync
npm run cap:sync
# 3. Open native projects
npm run cap:open:ios
npm run cap:open:android
# 4. Archive and submit as described above
```

### Version Numbering

Use semantic versioning:
- **1.0.0** → **1.0.1**: Bug fixes (patch)
- **1.0.1** → **1.1.0**: New features (minor)
- **1.1.0** → **2.0.0**: Breaking changes (major)

Update version in:
- `package.json`
- iOS: Xcode → Target → General → Version
- Android: `android/app/build.gradle` → `versionName`

---

## Part 5: Testing Checklist

Before submitting, test thoroughly:

### Functionality Tests
- [ ] User registration and login
- [ ] Recipe creation and editing
- [ ] Recipe extraction from websites
- [ ] Photo upload (camera and gallery)
- [ ] Social features (follow, like, comment)
- [ ] Meal planner and calendar
- [ ] Grocery list generation
- [ ] Push notifications
- [ ] Offline mode functionality
- [ ] Search and filters
- [ ] User profile editing
- [ ] Direct messaging
- [ ] Share functionality

### Platform-Specific Tests
- [ ] Test on iPhone (various sizes)
- [ ] Test on iPad if supporting
- [ ] Test on Android phones (various brands)
- [ ] Test on Android tablets if supporting
- [ ] Verify camera permissions
- [ ] Verify notification permissions
- [ ] Test deep linking
- [ ] Test app backgrounding/foregrounding
- [ ] Verify splash screen displays correctly
- [ ] Test status bar appearance

### Performance Tests
- [ ] App launches in under 3 seconds
- [ ] Smooth scrolling and animations
- [ ] Images load efficiently
- [ ] No memory leaks during extended use
- [ ] Battery usage is reasonable

---

## Part 6: Common Issues and Solutions

### iOS Issues

**Problem**: "Provisioning profile doesn't match"
- Solution: In Xcode, delete old profiles and regenerate

**Problem**: Archive option grayed out
- Solution: Select "Any iOS Device" not simulator

**Problem**: App crashes on physical device
- Solution: Check Info.plist permissions are configured

### Android Issues

**Problem**: Build fails with "SDK not found"
- Solution: Open Android Studio → Tools → SDK Manager → Install latest SDK

**Problem**: Can't upload to Play Console
- Solution: Ensure you created App Bundle (.aab) not APK

**Problem**: App not installing on device
- Solution: Enable USB debugging and "Install via USB" in device settings

### General Issues

**Problem**: White screen on app launch
- Solution: Run `npm run cap:sync` to update web assets

**Problem**: Environment variables not working
- Solution: Rebuild app completely after changing .env file

**Problem**: Images not loading
- Solution: Check Supabase storage policies and CORS settings

---

## Part 7: Post-Launch Checklist

After launching on stores:

### Day 1
- [ ] Verify app appears in search results
- [ ] Download app on your own device
- [ ] Monitor crash reports
- [ ] Check user reviews
- [ ] Monitor backend errors in Supabase

### Week 1
- [ ] Respond to user reviews (both positive and negative)
- [ ] Monitor download numbers
- [ ] Track key metrics (registrations, active users)
- [ ] Fix critical bugs if reported
- [ ] Collect user feedback

### Ongoing
- [ ] Weekly review monitoring
- [ ] Monthly analytics review
- [ ] Regular feature updates
- [ ] Security updates for dependencies
- [ ] OS compatibility updates

---

## Quick Reference Commands

```bash
# Build web assets
npm run build

# Sync with native projects
npm run cap:sync

# Open in IDE
npm run cap:open:ios
npm run cap:open:android

# Build and run on device
npm run cap:run:ios
npm run cap:run:android

# Update Capacitor
npm install @capacitor/core@latest @capacitor/cli@latest
npm install @capacitor/ios@latest @capacitor/android@latest
```

---

## Support Resources

- **Capacitor Docs**: https://capacitorjs.com/docs
- **Apple Developer**: https://developer.apple.com/support/
- **Play Console Help**: https://support.google.com/googleplay/android-developer
- **Supabase Docs**: https://supabase.com/docs

---

## Contact & Support

For deployment assistance:
- GitHub Issues: [Your repo URL]
- Email: dev@mealscrape.com

---

**Good luck with your app launch! 🚀**

Remember: The first submission takes the longest. Updates are much faster!
