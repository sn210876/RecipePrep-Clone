# Trial Expiration & Subscription System

## Overview

Complete trial management system with automatic 6-month free trials for all users, grace period handling, feature blocking, and payment enforcement.

## How It Works

### 1. **Auto-Subscription on Signup** ✅

Every new user automatically receives:
- **Early Bird** subscription type
- **6 months free trial** (trial_ends_at = signup date + 6 months)
- **Full access** to all features during trial
- **Status: active** until trial expires

**Migration:** `auto_create_early_bird_subscription.sql`
- Updates `handle_new_user()` trigger
- Creates subscription when profile is created
- Backfills existing users without subscriptions

### 2. **Subscription Checking Service** ✅

**File:** `src/services/subscriptionService.ts`

**Key Functions:**
- `checkSubscriptionAccess(userId)` - Returns detailed subscription status
- `shouldShowPaymentPrompt(userId)` - Checks if user needs to pay
- `shouldShowTrialWarning(userId)` - Shows warnings 14 days before expiration

**Subscription Types Handled:**
- `early_bird` - 6 month trial, then needs payment
- `family_code` - Lifetime free access
- `referral_lifetime` - Lifetime free (50 referrals)
- `regular` - Paid subscription
- `referral_reward` - Free months from referrals

**Grace Period:** 7 days after trial expiration
- Days 1-7: Full access with warnings
- Day 8+: Features blocked, payment required

### 3. **Subscription Context** ✅

**File:** `src/context/SubscriptionContext.tsx`

Provides app-wide subscription status via React Context:
```typescript
const { subscriptionStatus, loading, refreshSubscription } = useSubscription();
```

**Status Object:**
- `hasAccess` - Can user access features?
- `subscriptionType` - Type of subscription
- `trialEndsAt` - When trial expires
- `daysRemaining` - Days left in trial
- `isTrialExpired` - Has trial ended?
- `isInGracePeriod` - In 7-day grace period?
- `needsPayment` - Does user need to pay?

### 4. **Visual Warnings** ✅

**File:** `src/components/SubscriptionBanner.tsx`

Three banner states shown at top of all pages:

#### a) **Trial Ending Soon** (14 days before expiration)
- Amber/yellow banner
- Shows days remaining
- "View Options" button → Subscription page

#### b) **Trial Expired - Grace Period** (Days 1-7 after expiration)
- Red banner with urgency
- Shows grace period days remaining
- "Choose Plan" button → Subscription page

#### c) **Access Blocked** (Day 8+ after expiration)
- Red urgent banner
- Full feature block active
- "Choose Plan Now" button → Subscription page

### 5. **Feature Blocking** ✅

**File:** `src/components/SubscriptionGate.tsx`

Wraps protected pages/features:
```typescript
<SubscriptionGate onNavigate={handleNavigate} featureName="Social Feed">
  <Discover />
</SubscriptionGate>
```

**When blocked:**
- Shows full-screen card with lock icon
- Lists all subscription benefits
- "Choose Your Plan" button
- "Browse Public Recipes" button (alternate path)

**Protected Features:**
- Social Feed (Discover)
- My Recipes
- Add Recipe
- Meal Planner
- Grocery List
- Shopping Cart
- Upload
- Profile
- Messages

**Public Features:**
- Discover Recipes (browse public recipes)
- Blog
- Subscription Page
- Settings Page

### 6. **Scheduled Expiration Checker** ✅

**Edge Function:** `check-trial-expiration`

**Purpose:**
- Runs daily to check for expired trials
- Updates subscription status from `active` to `expired`
- Batch processes all expired trials

**How to Call:**
```bash
# Manual trigger (for testing)
curl -X POST https://your-project.supabase.co/functions/v1/check-trial-expiration \
  -H "apikey: YOUR_ANON_KEY"
```

**To Schedule (Cron Job):**
Use Supabase Dashboard → Edge Functions → Cron Jobs
- Schedule: `0 0 * * *` (runs daily at midnight)
- Function: `check-trial-expiration`

**Returns:**
```json
{
  "message": "Trial expiration check completed",
  "processed": 5,
  "userIds": ["user-id-1", "user-id-2", ...]
}
```

## Testing the System

### Test Expired Trial (Without Waiting 6 Months)

1. **Create a test user**
2. **Manually update their trial_ends_at to past date:**
   ```sql
   UPDATE subscriptions
   SET trial_ends_at = now() - interval '1 day',
       expires_at = now() - interval '1 day'
   WHERE user_id = 'test-user-id';
   ```

3. **Run expiration checker:**
   ```bash
   curl -X POST https://your-project.supabase.co/functions/v1/check-trial-expiration \
     -H "apikey: YOUR_ANON_KEY"
   ```

4. **Refresh app** - user should see blocked message

### Test Grace Period

Update trial to expire 3 days ago:
```sql
UPDATE subscriptions
SET trial_ends_at = now() - interval '3 days',
    expires_at = now() - interval '3 days',
    status = 'expired'
WHERE user_id = 'test-user-id';
```

User should still have access with urgent red banner.

### Test Trial Warning

Update trial to expire in 7 days:
```sql
UPDATE subscriptions
SET trial_ends_at = now() + interval '7 days',
    expires_at = now() + interval '7 days'
WHERE user_id = 'test-user-id';
```

User should see yellow warning banner.

## Payment Integration (TODO)

Currently shows "Payment integration coming soon!" in Subscription page.

**Next Steps:**
1. Integrate Stripe or payment processor
2. Add webhook handler for payment events
3. Update subscription on successful payment
4. Add payment history tracking
5. Email receipts

## Email Notifications (TODO)

**Planned Notifications:**
- Trial ending in 7 days (warning)
- Trial ending in 1 day (urgent warning)
- Trial expired (blocked access)
- Payment received (confirmation)
- Subscription renewed (monthly confirmation)

**Integration Needed:**
- Email service (SendGrid, Resend, etc.)
- Email templates
- Notification tracking (avoid duplicates)

## Admin Tools (TODO)

**Needed:**
- Admin dashboard showing:
  - Total active trials
  - Trials expiring soon
  - Expired trials
  - Conversion rate (trial → paid)
- Ability to manually extend trials
- Ability to grant lifetime access
- Export user subscription data

## Database Schema

### `subscriptions` Table

```sql
CREATE TABLE subscriptions (
  id uuid PRIMARY KEY,
  user_id uuid UNIQUE NOT NULL,
  subscription_type text, -- 'early_bird', 'family_code', etc.
  status text, -- 'active', 'expired', 'cancelled', 'pending_payment'
  trial_ends_at timestamptz, -- When 6-month trial expires
  expires_at timestamptz, -- When subscription access expires
  monthly_amount integer, -- Payment amount in cents
  family_code_used text,
  referral_years_remaining integer,
  created_at timestamptz,
  updated_at timestamptz
);
```

## Key Features

✅ **Automatic trial creation** - Every signup gets 6 months free
✅ **Visual warnings** - 14 days, 7 days, and expired banners
✅ **Grace period** - 7 days of access after trial ends
✅ **Feature blocking** - Complete access control after grace period
✅ **Scheduled checking** - Daily batch processing of expired trials
✅ **Context-based** - Available throughout app via React Context
✅ **Referral rewards** - 3 referrals = 2 months free, 50 = lifetime
✅ **Family codes** - Admin-generated lifetime access codes
✅ **Pay-what-you-want** - Flexible pricing model ($1+ per month)

## Support

For issues or questions:
- Check subscription status in Supabase Dashboard → Table Editor → subscriptions
- Run edge function manually for testing
- Check browser console for subscription check errors
- Verify user has profile (required for subscription)
- 
## UPDATE subscriptions 
SET 
  status = 'expired',
  subscription_type = 'early_bird',
  monthly_amount = NULL,
  stripe_subscription_id = NULL,
  stripe_customer_id = NULL,
  trial_ends_at = '2025-11-26T19:27:41.147013+00:00',
  expires_at = '2025-11-26T19:27:41.147013+00:00'
WHERE user_id = 'f369e701-0b0a-4238-82c3-6c21c32688b1';
