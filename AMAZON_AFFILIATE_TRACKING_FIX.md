# Amazon Affiliate Tracking Fix - Android App

## Problem Identified
When users clicked "Send to Amazon Cart" on Android, the system was using `target="_blank"` which allowed Android to intercept the link and open the Amazon app. **When the Amazon app opens, it strips the affiliate tags**, meaning you lose your commission.

## Solution Implemented

### 1. Force Browser Opening (NOT Amazon App)
Updated `deviceDetection.ts` to use **Capacitor Browser plugin** on native platforms:
- Opens links in an **in-app browser** (NOT the Amazon app)
- Preserves ALL affiliate tracking parameters
- URL stays in browser, Amazon can't intercept it

### 2. Enhanced Affiliate Tag Logging
Added comprehensive logging to track affiliate URLs:
- Every URL logs the affiliate tag being applied
- Shows `tag=mealscrape-20` in console
- Helps verify tracking is working

### 3. Async Browser Opening
Updated `CartEnhanced.tsx` to properly await browser opens:
- Sequential opening with delays
- Prevents browser popup blocking
- Ensures each link gets proper tracking

## How It Works Now

### Before Fix:
1. Click "Send to Amazon Cart"
2. Android intercepts the link
3. Opens Amazon app
4. **Affiliate tags stripped** ❌
5. No commission for you

### After Fix:
1. Click "Send to Amazon Cart"
2. Opens in Capacitor Browser (in-app browser)
3. Amazon website loads in browser
4. **Affiliate tags preserved** ✅
5. You get commission!

## Verification Steps

### 1. Check the Console Logs
Open **Logcat in Android Studio** and filter by `Capacitor/Console`:

```
🔗 Affiliate URL: https://www.amazon.com/dp/B00123456?tag=mealscrape-20...
🌐 Opening in Capacitor Browser (NOT Amazon app) to preserve affiliate tracking
```

### 2. Visual Verification
When you click the cart button:
- Browser overlay opens **INSIDE** the app (not Amazon app)
- Orange toolbar at top (color: #FF6B35)
- Can see the URL includes `?tag=mealscrape-20`

### 3. URL Check
Look at the address bar in the in-app browser:
- Should contain: `tag=mealscrape-20`
- Should contain: `linkCode=ll1`
- Should contain: `utm_source=mealscrape`

## Test Procedure

1. **Add items to cart** in the app
2. **Click "Send to Amazon Cart"**
3. **Verify**:
   - Browser opens INSIDE the app (not Amazon app)
   - Console shows affiliate URL logs
   - Amazon website loads with products
4. **Check the URL** in the browser bar
5. **Complete purchase** in the browser
6. **Your commission is tracked** ✅

## Important Notes

### Why Not Use Amazon App?
The Amazon mobile app does NOT preserve affiliate parameters from external links. It's designed to prevent affiliate tracking when opened from other apps. This is why we **MUST** use the browser.

### Capacitor Browser Plugin
The app uses `@capacitor/browser` which is already installed. This plugin:
- Opens web pages in an in-app browser
- Stays within your app context
- Preserves all URL parameters
- Works on both Android and iOS

### User Experience
Users will see:
- Toast message: "Opening items in browser to preserve your affiliate commission..."
- In-app browser overlay opens
- Amazon website loads
- They shop and checkout in the browser
- Browser closes when done

## Affiliate Tag Details

**Your Affiliate Tag:** `mealscrape-20`

All URLs include these parameters:
- `tag=mealscrape-20` - Your Amazon Associate ID
- `linkCode=ll1` - Link type identifier
- `ref=nosim` - No similar items redirect
- `utm_source=mealscrape` - Traffic source
- `utm_medium=mobile_cart` or `web_cart` - Traffic medium

## Tracking Your Earnings

1. Login to [Amazon Associates](https://affiliate-program.amazon.com)
2. Go to **Reports** > **Orders Report**
3. Filter by tracking ID: `mealscrape-20`
4. See all tracked orders and earnings

## Files Modified

1. **`src/lib/deviceDetection.ts`**
   - Changed `openInBrowser()` to use Capacitor Browser
   - Added logging for verification
   - Made function async

2. **`src/pages/CartEnhanced.tsx`**
   - Updated to properly await browser opens
   - Added affiliate commission messaging
   - Sequential URL opening with delays

3. **`src/services/amazonProductService.ts`**
   - Added logging for every affiliate URL
   - Shows tag being applied
   - Helps debug tracking issues

## Troubleshooting

### Issue: Amazon App Still Opens
**Solution:** Uninstall the old app version, clean project in Android Studio, and reinstall

### Issue: "Can't open browser"
**Solution:** Check Capacitor Browser is in package.json (it is: `@capacitor/browser@^7.0.3`)

### Issue: Affiliate tag missing
**Solution:** Check console logs - if URL shows tag, but Amazon doesn't track it, contact Amazon Associates support

### Issue: Multiple browser windows
**Solution:** This is intentional - each product opens separately. Users can switch between tabs.

## Commission Rates

Amazon Associates commission rates (varies by category):
- Luxury Beauty: 10%
- Digital Music: 5%
- Grocery: 1%
- Physical Books: 4.5%
- Amazon Devices: 4%

Check [Amazon's rate table](https://affiliate-program.amazon.com/help/operating/schedule) for full details.

## Next Steps

1. **Test on Android device**
2. **Verify browser opens** (not Amazon app)
3. **Check console logs** for affiliate URLs
4. **Make a test purchase** if needed
5. **Monitor Amazon Associates dashboard** for tracked orders

## Support

If affiliate tracking still isn't working:
1. Check your Amazon Associates account is approved
2. Verify `mealscrape-20` is your correct tag
3. Check Amazon Associates Operating Agreement compliance
4. Contact Amazon Associates support if needed
