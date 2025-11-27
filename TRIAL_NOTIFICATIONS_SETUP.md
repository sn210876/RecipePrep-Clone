# Trial Expiration & Notifications System - Complete Setup Guide

## Overview

Complete automated system for:
- 6-month free trial management
- Daily email notifications (7-day countdown)
- Daily in-app DM notifications from admin account
- Grace period handling
- Feature blocking after expiration
- Payment confirmation messages

---

## 🎯 What's Implemented

### ✅ **1. Auto-Subscription on Signup**
- Every new user gets 6 months free trial
- Automatic database trigger creates subscription
- Trial ends at: signup date + 6 months

### ✅ **2. Subscription Checking & Blocking**
- Real-time subscription status checking
- Feature blocking after grace period (7 days)
- Visual warnings (14 days before, then daily)
- Detailed console logging for debugging

### ✅ **3. Notification Tracking System**
- Database table: `notification_logs`
- Prevents duplicate notifications
- Tracks email and DM delivery status
- Viewable notification history for users

### ✅ **4. Direct Message Notifications**
- Automated DMs from admin account: **mealscrapeapp@gmail.com**
- Daily DMs starting 7 days before expiration
- Messages for grace period and blocked access
- Payment confirmation messages

### ✅ **5. Email Notifications**
- Professional HTML email templates
- Daily emails starting 7 days before expiration
- Integration with Resend (optional)
- Graceful fallback if not configured

### ✅ **6. Edge Functions**
- `send-trial-notifications` - Sends DMs daily
- `send-trial-email` - Sends emails daily
- `check-trial-expiration` - Updates expired trial status

---

## 🚀 Setup Instructions

### **Step 1: Create Admin Account**

1. **Sign up** with email: **mealscrapeapp@gmail.com**
2. **Verify** the email address
3. **Get the user ID** from the auth.users table:
   ```sql
   SELECT id FROM auth.users WHERE email = 'mealscrapeapp@gmail.com';
   ```

4. **Add to admin_users table**:
   ```sql
   INSERT INTO admin_users (user_id)
   VALUES ('YOUR_USER_ID_HERE')
   ON CONFLICT (user_id) DO NOTHING;
   ```

### **Step 2: Update Profile with Email**

The admin account needs to be in the profiles table with the email:

```sql
UPDATE profiles
SET email = 'mealscrapeapp@gmail.com'
WHERE id = 'YOUR_USER_ID_HERE';
```

### **Step 3: Schedule Edge Functions (Cron Jobs)**

In Supabase Dashboard → Edge Functions → Cron Jobs:

#### a) **Daily Trial Notifications (DMs)**
- **Function:** `send-trial-notifications`
- **Schedule:** `0 9 * * *` (9 AM daily)
- **Description:** Sends daily DM notifications for trial expiration

#### b) **Daily Email Notifications** (Optional)
- **Function:** `send-trial-email`
- **Schedule:** `0 9 * * *` (9 AM daily)
- **Description:** Sends daily email notifications for trial expiration
- **Note:** Requires RESEND_API_KEY environment variable

#### c) **Update Expired Trial Status**
- **Function:** `check-trial-expiration`
- **Schedule:** `0 0 * * *` (Midnight daily)
- **Description:** Updates subscription status to 'expired'

### **Step 4: Configure Email Service (Optional)**

#### **Using Resend (Recommended)**

1. Sign up at [resend.com](https://resend.com) (Free tier: 3,000 emails/month)
2. Get your API key
3. Add environment variable in Supabase:
   - Go to Project Settings → Edge Functions → Environment Variables
   - Add: `RESEND_API_KEY` = your-api-key

4. **Verify domain** (for production):
   - Add your domain in Resend dashboard
   - Add DNS records as instructed
   - Update email "from" address in edge function

**Without Resend configured:**
- Email function will skip sending (graceful fallback)
- DM notifications will still work
- Console will log: "Email service not configured"

---

## 📱 Notification Schedule

### **Trial Active (Days 180-8)**
- No notifications

### **Warning Period (Days 7-1)**
- **Day 7:** DM + Email: "7 days left in your trial"
- **Day 6:** DM + Email: "6 days left in your trial"
- **Day 5:** DM + Email: "5 days left in your trial"
- **Day 4:** DM + Email: "4 days left in your trial"
- **Day 3:** DM + Email: "3 days left in your trial"
- **Day 2:** DM + Email: "2 days left in your trial"
- **Day 1:** DM + Email: "1 day left in your trial"

### **Expiration Day (Day 0)**
- **DM + Email:** "Your trial expires today!"
- Trial status updated to 'expired'
- Grace period begins (7 days)

### **Grace Period (Days -1 to -7)**
- **Each day:** DM + Email with grace period countdown
- User still has access
- Urgent warnings

### **Access Blocked (Day -8 onwards)**
- **Day -8:** Final DM + Email: "Subscription required"
- Features blocked via SubscriptionGate
- User cannot access protected features

### **After Payment**
- **DM:** "You are subscribed for another month"
- Payment confirmation message
- Full access restored

---

## 🧪 Testing Instructions

### **Test 1: Simulate Expired Trial (Manual)**

1. **Create test user** or use existing account

2. **Update trial to expire yesterday:**
   ```sql
   UPDATE subscriptions
   SET trial_ends_at = now() - interval '1 day',
       expires_at = now() - interval '1 day',
       status = 'active'
   WHERE user_id = 'test-user-id';
   ```

3. **Run expiration checker:**
   ```bash
   curl -X POST https://your-project.supabase.co/functions/v1/check-trial-expiration \
     -H "apikey: YOUR_ANON_KEY"
   ```

4. **Check status updated:**
   ```sql
   SELECT status, trial_ends_at FROM subscriptions WHERE user_id = 'test-user-id';
   ```
   Should show: `status = 'expired'`

5. **Refresh app** - user should see red grace period banner

6. **Try to access protected feature** - should still work (grace period)

### **Test 2: Grace Period Expiration**

1. **Set trial to 8 days ago:**
   ```sql
   UPDATE subscriptions
   SET trial_ends_at = now() - interval '8 days',
       expires_at = now() - interval '8 days',
       status = 'expired'
   WHERE user_id = 'test-user-id';
   ```

2. **Refresh app**

3. **Try to access protected feature** - should see blocked screen with lock icon

### **Test 3: DM Notifications**

1. **Set trial to expire in 7 days:**
   ```sql
   UPDATE subscriptions
   SET trial_ends_at = now() + interval '7 days',
       expires_at = now() + interval '7 days',
       status = 'active'
   WHERE user_id = 'test-user-id';
   ```

2. **Manually trigger notification function:**
   ```bash
   curl -X POST https://your-project.supabase.co/functions/v1/send-trial-notifications \
     -H "apikey: YOUR_ANON_KEY"
   ```

3. **Check Messages page** - should see DM from mealscrapeapp@gmail.com

4. **Verify in database:**
   ```sql
   SELECT * FROM notification_logs
   WHERE user_id = 'test-user-id'
   ORDER BY created_at DESC
   LIMIT 5;
   ```

### **Test 4: Email Notifications** (if configured)

1. **Same setup as Test 3**

2. **Trigger email function:**
   ```bash
   curl -X POST https://your-project.supabase.co/functions/v1/send-trial-email \
     -H "apikey: YOUR_ANON_KEY"
   ```

3. **Check email inbox** for test user

4. **Verify in notification_logs table**

---

## 🐛 Debugging

### **Check Subscription Status**

```sql
SELECT
  u.email,
  s.subscription_type,
  s.status,
  s.trial_ends_at,
  s.expires_at,
  EXTRACT(DAY FROM (s.trial_ends_at - now())) as days_remaining
FROM subscriptions s
JOIN auth.users u ON u.id = s.user_id
WHERE s.subscription_type = 'early_bird'
ORDER BY s.trial_ends_at;
```

### **Check Notification History**

```sql
SELECT
  u.email,
  nl.notification_type,
  nl.notification_category,
  nl.days_until_expiration,
  nl.status,
  nl.sent_at
FROM notification_logs nl
JOIN auth.users u ON u.id = nl.user_id
ORDER BY nl.sent_at DESC
LIMIT 20;
```

### **View Console Logs**

1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for tags:
   - `[SubscriptionContext]` - Context loading
   - `[SubscriptionService]` - Access checking
   - `[NotificationService]` - DM sending

### **Check Edge Function Logs**

In Supabase Dashboard → Edge Functions → Select function → Logs

Look for:
- Number of subscriptions processed
- DMs sent count
- Errors (if any)

### **Common Issues**

**Issue:** "Admin user not found"
- **Fix:** Create mealscrapeapp@gmail.com account and add to admin_users table

**Issue:** DMs not appearing
- **Fix:** Check conversations table, verify admin_id and user_id

**Issue:** Blocking not working
- **Fix:** Check console logs for subscription status, verify hasAccess is false

**Issue:** Email not sending
- **Fix:** Verify RESEND_API_KEY is set, check Resend dashboard for errors

---

## 📊 Database Schema

### **notification_logs Table**

```sql
CREATE TABLE notification_logs (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users,
  notification_type text, -- 'email' or 'dm'
  notification_category text, -- 'trial_warning', 'trial_expired', 'grace_period', 'access_blocked', 'payment_confirmed'
  days_until_expiration integer,
  message_content text,
  status text, -- 'sent', 'failed', 'pending'
  error_message text,
  sent_at timestamptz,
  created_at timestamptz
);
```

### **Helper Functions**

- `was_notification_sent_today(user_id, type, category, days)` - Check if notification already sent
- `log_notification(user_id, type, category, days, message, status, error)` - Log notification attempt

---

## 🎨 User Experience

### **Visual Warnings**

1. **Yellow Banner (14-8 days before):** "Trial ending soon! X days remaining"
2. **Orange Banner (7-1 days before):** "Trial ending soon! X days remaining"
3. **Red Banner (Grace Period):** "Trial expired - Grace period: X days left"
4. **Red Alert (Blocked):** "Subscription Required" with lock icon

### **Blocked Screen**

When access is blocked, users see:
- Full-screen card with lock icon
- List of subscription benefits
- "Choose Your Plan" button
- "Browse Public Recipes" alternate option

### **Messages**

Users receive DMs from mealscrapeapp@gmail.com:
- Professional, friendly tone
- Clear call-to-action
- Emphasizes "pay what you want" pricing
- Direct link to subscription page (via navigation)

---

## 💰 Pricing Model

- **First 6 months:** FREE (automatic trial)
- **After trial:** Pay what you want
- **Minimum:** $1/month
- **No maximum:** Users choose their own price

---

## 🔄 Subscription Flow

1. **User signs up** → Auto 6-month trial created
2. **Day 7 before expiration** → Daily DM + Email begins
3. **Trial expires** → 7-day grace period with access
4. **Grace period ends** → Features blocked
5. **User subscribes** → Confirmation DM + Full access restored

---

## 📝 Notes

- Admin account must exist and be properly configured
- DMs work immediately after admin setup
- Emails require Resend API key (optional)
- Notifications sent once per day maximum (prevents spam)
- All times in UTC (adjust cron schedules for your timezone)
- Notification logs kept permanently (for analytics)

---

## 🎯 Next Steps

1. Create mealscrapeapp@gmail.com account
2. Add to admin_users table
3. Set up cron jobs
4. (Optional) Configure Resend for emails
5. Test with a dummy account
6. Monitor notification logs

---

## Support

For issues:
- Check edge function logs in Supabase
- Review notification_logs table
- Check browser console for client-side logs
- Verify admin account setup
