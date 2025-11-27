# Subscription & Referral System Guide

## Overview

This app uses a flexible subscription model with three main tiers:

### 1. **Early Bird** (6-Month Free Trial)
- Users get 6 months completely free
- After trial expires, they must choose their payment amount
- Minimum: $1/month
- No maximum - pay what you want!

### 2. **Family/Friend Code** (Lifetime Free)
- Admin-generated codes for family and friends
- One-time use codes
- Grant **lifetime free access** (never expires)
- Can be combined with referral rewards

### 3. **Regular** (Pay-What-You-Want)
- Users choose their monthly amount
- Minimum: $1/month
- Immediate access after payment

### 4. **Referral Rewards** (Stackable)
- Get 3 successful signups → Earn 1 year free
- Get another 3 signups → Earn another year free
- **Unlimited stacking** - keep earning years!
- Available to ALL users (early birds, paying users, everyone)
- Does NOT grant lifetime unless using family code

---

## How to Generate Family Codes (Admin)

### Method 1: Using Supabase SQL Editor

1. **Open Supabase Dashboard**
   - Go to your Supabase project
   - Click "SQL Editor" in the left sidebar

2. **Run This Query** to generate a single code:
   ```sql
   SELECT public.generate_family_code('Generated for [Name/Reason]');
   ```

3. **Example**:
   ```sql
   -- Generate code for your mom
   SELECT public.generate_family_code('Generated for Mom - Jane Smith');

   -- Generate code for a friend
   SELECT public.generate_family_code('Generated for Friend - John Doe');
   ```

4. **The Result** will be something like:
   ```
   FAMILY-A3F9D8E2C1
   ```

5. **Copy the code** and send it to your family/friend

### Method 2: Generate Multiple Codes at Once

```sql
-- Generate 5 codes at once
SELECT public.generate_family_code('Batch 1 - Code ' || i)
FROM generate_series(1, 5) AS i;
```

### Method 3: View All Family Codes

```sql
-- See all codes you've generated
SELECT
  code,
  notes,
  is_used,
  used_by_user_id,
  used_at,
  created_at
FROM public.family_codes
ORDER BY created_at DESC;
```

---

## User Flows

### Flow 1: Early Bird Converts to Paid

1. User signs up → Gets 6-month free trial automatically
2. Trial expires after 6 months
3. App shows payment selection screen
4. User chooses amount (minimum $1/month)
5. Payment processes → Subscription becomes active

### Flow 2: Friend Uses Family Code

1. User signs up or is already registered
2. Goes to Settings → Subscription
3. Enters family code: `FAMILY-A3F9D8E2C1`
4. Code validates → User gets lifetime free access
5. Code marked as "used" and can't be reused

### Flow 3: User Earns Referral Rewards

1. User shares their referral code (e.g., `A3F9D8E2`)
2. 3 friends sign up using that code
3. System automatically grants 1 year free
4. Another 3 friends sign up
5. System grants another year (now 2 years total)
6. Process repeats indefinitely!

### Flow 4: Paying User Gets Referrals

1. User is currently paying $5/month
2. Gets 3 successful referrals
3. System grants 1 year free (pauses billing)
4. After 1 year, billing resumes at $5/month
5. Can earn more years anytime through more referrals

---

## Database Schema

### `subscriptions` Table
```
- user_id: Who this subscription is for
- subscription_type: 'early_bird' | 'family_code' | 'regular' | 'referral_reward'
- status: 'active' | 'expired' | 'cancelled' | 'pending_payment'
- monthly_amount: Amount in cents (null for free tiers)
- trial_ends_at: When early bird trial ends
- expires_at: When subscription expires (null = lifetime)
- family_code_used: Which family code was used
- referral_years_remaining: Years of free access from referrals
```

### `referral_codes` Table
```
- user_id: Who owns this referral code
- code: Unique 8-character code (e.g., 'A3F9D8E2')
- successful_signups: Count of successful referrals
- years_earned: Total years earned through referrals
```

### `referrals` Table
```
- referrer_id: Who referred
- referred_user_id: Who was referred
- status: 'pending' | 'completed' | 'cancelled'
- reward_granted: Has this referral earned a reward?
- reward_batch: Which group of 3 (1st, 2nd, 3rd, etc)
```

### `family_codes` Table
```
- code: The unique family code
- is_used: Has it been redeemed?
- used_by_user_id: Who used it
- notes: Admin notes about who it's for
```

---

## Key Functions Available

### For Users (via app UI):
- `generate_referral_code(user_id)` - Get their referral code
- `use_family_code(user_id, code)` - Redeem a family code
- `check_referral_rewards(user_id)` - Process earned rewards

### For Admins (via SQL):
- `generate_family_code(notes)` - Create a new family code

---

## Important Rules

### ✅ DO:
- Users can stack referral rewards infinitely
- Family codes grant lifetime free (never expires)
- Early birds must choose amount after trial
- Minimum payment is $1/month
- Paying users can still earn referral years

### ❌ DON'T:
- Family codes are one-time use only
- Referral rewards don't grant lifetime (just years)
- Can't go below $1/month minimum
- Early bird trial is exactly 6 months

---

## Admin Checklist

### To Generate a Family Code:
1. ✅ Login to Supabase dashboard
2. ✅ Go to SQL Editor
3. ✅ Run: `SELECT public.generate_family_code('For [Name]');`
4. ✅ Copy the returned code
5. ✅ Send to family/friend
6. ✅ They enter it in Settings → Subscription

### To Check Code Status:
```sql
SELECT code, is_used, notes, used_at
FROM public.family_codes
WHERE code = 'FAMILY-XXXXXXXXXX';
```

### To See Who Has Lifetime Access:
```sql
SELECT
  u.email,
  s.subscription_type,
  s.family_code_used,
  s.created_at
FROM public.subscriptions s
JOIN auth.users u ON u.id = s.user_id
WHERE s.subscription_type = 'family_code'
ORDER BY s.created_at DESC;
```

---

## Example Scenarios

### Scenario 1: Your Brother Wants Access
```sql
-- Generate code
SELECT public.generate_family_code('For my brother Mike');
-- Returns: FAMILY-A3F9D8E2C1

-- Send him: "Hey Mike, use code FAMILY-A3F9D8E2C1 for lifetime free access!"
```

### Scenario 2: Friend Gets 10 Referrals
- Referral 1-3 → +1 year free (expires in 1 year)
- Referral 4-6 → +1 year free (expires in 2 years)
- Referral 7-9 → +1 year free (expires in 3 years)
- Referral 10 → Waiting for 2 more to get another year

### Scenario 3: Early Bird Trial Expires
1. Day 1: User signs up → Trial ends in 6 months
2. Month 6, Day 180: Trial expires
3. App blocks access, shows payment screen
4. User chooses $3/month
5. Access restored immediately

---

## Testing the System

### Test Family Code:
```sql
-- Generate a test code
SELECT public.generate_family_code('TEST CODE');

-- Try to use it (replace USER_ID with actual ID)
SELECT public.use_family_code('USER_ID_HERE', 'FAMILY-XXXXXXXXXX');

-- Verify it's marked as used
SELECT * FROM public.family_codes WHERE code = 'FAMILY-XXXXXXXXXX';
```

### Test Referrals:
```sql
-- Check user's referral code
SELECT * FROM public.referral_codes WHERE user_id = 'USER_ID_HERE';

-- See all their referrals
SELECT * FROM public.referrals WHERE referrer_id = 'USER_ID_HERE';

-- Manually grant rewards (for testing)
SELECT public.check_referral_rewards('USER_ID_HERE');
```

---

## Support & Questions

If you need to:
- **Reset a used family code**: Update `is_used = false` in database
- **Give someone free time**: Add years to `referral_years_remaining`
- **Check subscription status**: Query `subscriptions` table
- **See referral stats**: Query `referral_codes` and `referrals` tables

All admin operations require you to be logged in as an admin user (in the `admin_users` table).
