# 🚀 Quick Setup Checklist for Trial Notifications

## ⚡ 5-Minute Setup

### **1. Create Admin Account** ✓
```
Email: mealscrapeapp@gmail.com
Action: Sign up in your app
```

### **2. Get User ID**
Run in Supabase SQL Editor:
```sql
SELECT id FROM auth.users WHERE email = 'mealscrapeapp@gmail.com';
```
Copy the ID (looks like: `abc123-def456-...`)

### **3. Add to Admin Table**
```sql
INSERT INTO admin_users (user_id)
VALUES ('PASTE_YOUR_ID_HERE')
ON CONFLICT DO NOTHING;
```

### **4. Update Profile Email**
```sql
UPDATE profiles
SET email = 'mealscrapeapp@gmail.com'
WHERE id = 'PASTE_YOUR_ID_HERE';
```

### **5. Setup Cron Jobs**
Go to: Supabase Dashboard → Edge Functions → Cron Jobs

**Create 3 cron jobs:**

#### Job 1: Daily DM Notifications
- Function: `send-trial-notifications`
- Schedule: `0 9 * * *`
- Description: Send daily trial DMs

#### Job 2: Daily Email Notifications
- Function: `send-trial-email`
- Schedule: `0 9 * * *`
- Description: Send daily trial emails

#### Job 3: Update Expired Status
- Function: `check-trial-expiration`
- Schedule: `0 0 * * *`
- Description: Update expired trial status

### **6. Test It!**

#### Quick Test (DMs):
```sql
-- Set trial to expire in 7 days
UPDATE subscriptions
SET trial_ends_at = now() + interval '7 days',
    expires_at = now() + interval '7 days'
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'YOUR_TEST_EMAIL@example.com');
```

Then trigger manually:
```bash
curl -X POST https://your-project.supabase.co/functions/v1/send-trial-notifications \
  -H "apikey: YOUR_ANON_KEY"
```

Check Messages → Should see DM from mealscrapeapp@gmail.com ✅

---

## 🎯 What Happens Now?

- ✅ New users get 6-month trial automatically
- ✅ DMs sent daily starting 7 days before expiration
- ✅ Users blocked after 7-day grace period
- ✅ "You are subscribed for another month" after payment (manual for now)

---

## 📧 Optional: Email Setup (10 minutes)

### **1. Sign up for Resend**
- Go to [resend.com](https://resend.com)
- Free tier: 3,000 emails/month
- Get API key

### **2. Add to Supabase**
- Project Settings → Edge Functions → Environment Variables
- Add: `RESEND_API_KEY` = your-api-key

### **3. Done!**
Emails will now send automatically with DMs.

---

## 🐛 Quick Troubleshooting

**DMs not working?**
1. Verify admin account exists: `SELECT * FROM admin_users;`
2. Check profile email: `SELECT id, email FROM profiles WHERE email = 'mealscrapeapp@gmail.com';`
3. View edge function logs in Supabase Dashboard

**Blocking not working?**
1. Open browser console (F12)
2. Look for `[SubscriptionService]` logs
3. Check if `hasAccess: false` is showing
4. Verify subscription expired: `SELECT * FROM subscriptions WHERE user_id = 'test-user-id';`

**Need to test blocking?**
```sql
-- Set trial to 8 days ago (past grace period)
UPDATE subscriptions
SET trial_ends_at = now() - interval '8 days',
    expires_at = now() - interval '8 days',
    status = 'expired'
WHERE user_id = 'YOUR_TEST_USER_ID';
```
Refresh app → Features should be blocked ✅

---

## ✅ You're Done!

The system is now:
- Automatically creating trials for new users
- Sending daily notifications
- Blocking expired trials
- Ready for payments (when integrated)

Monitor via:
- `notification_logs` table (see what was sent)
- Edge function logs (see processing)
- Browser console (see blocking logic)
