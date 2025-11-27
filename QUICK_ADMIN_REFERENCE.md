# Quick Admin Reference - Family Code Generation

## Generate a Single Family Code

```sql
SELECT public.generate_family_code('For [Name/Reason]');
```

**Examples:**
```sql
-- For family
SELECT public.generate_family_code('For Mom - Jane Smith');
SELECT public.generate_family_code('For Brother - Mike');

-- For friends
SELECT public.generate_family_code('For Friend - Sarah Johnson');
SELECT public.generate_family_code('For Beta Tester - Alex');
```

---

## Generate Multiple Codes at Once

```sql
-- Generate 10 codes
SELECT public.generate_family_code('Batch 1 - Code ' || i)
FROM generate_series(1, 10) AS i;
```

---

## View All Your Codes

```sql
SELECT
  code,
  notes,
  is_used,
  CASE
    WHEN used_by_user_id IS NOT NULL
    THEN (SELECT email FROM auth.users WHERE id = used_by_user_id)
    ELSE 'Not used'
  END as used_by_email,
  used_at,
  created_at
FROM public.family_codes
ORDER BY created_at DESC;
```

---

## Check if a Code is Valid

```sql
SELECT
  code,
  is_used,
  notes
FROM public.family_codes
WHERE code = 'FAMILY-XXXXXXXXXX';
```

---

## Where to Run These

1. Open your Supabase dashboard
2. Click **"SQL Editor"** in the left sidebar
3. Paste any query above
4. Click **"Run"** (or press Ctrl/Cmd + Enter)
5. Copy the generated code from the results

---

## What Users See

When they enter a family code in the app:
- ✅ Valid unused code → **"Success! You now have lifetime free access!"**
- ❌ Already used → **"This code has already been used"**
- ❌ Invalid code → **"Invalid family code"**

---

## Subscription Model Summary

| Type | Duration | Cost | How to Get |
|------|----------|------|------------|
| **Early Bird** | 6 months free trial | Then $1+ per month | Sign up during early bird period |
| **Family Code** | **LIFETIME** free | $0 forever | Admin generates and gives code |
| **Regular** | Monthly | $1+ per month | Choose amount and pay |
| **Referral Reward** | 1 year per 3 referrals | $0 during reward period | Share referral code |

---

## Referral System

- **3 successful signups** = 1 year free
- **Another 3 signups** = Another year free
- **Unlimited stacking** - keep earning!
- Works for **everyone** (early birds, paying users, family code users)
- Does NOT give lifetime access (only family codes do)

---

## Need Help?

See `SUBSCRIPTION_SYSTEM_GUIDE.md` for complete documentation.
