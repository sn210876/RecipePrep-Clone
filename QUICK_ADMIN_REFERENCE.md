# Quick Admin Reference - Family Code Generation

## ✅ WORKING METHOD: Direct INSERT (Easiest!)

### Generate a Single Family Code

```sql
INSERT INTO public.family_codes (code, notes)
VALUES (
  'FAMILY-' || upper(encode(gen_random_bytes(6), 'hex')),
  'For Mom - Jane Smith'
)
RETURNING code, notes;
```

**More Examples:**
```sql
-- For family
INSERT INTO public.family_codes (code, notes)
VALUES ('FAMILY-' || upper(encode(gen_random_bytes(6), 'hex')), 'For Brother Mike')
RETURNING code;

-- For a friend
INSERT INTO public.family_codes (code, notes)
VALUES ('FAMILY-' || upper(encode(gen_random_bytes(6), 'hex')), 'For Friend Sarah')
RETURNING code;

-- Without notes
INSERT INTO public.family_codes (code)
VALUES ('FAMILY-' || upper(encode(gen_random_bytes(6), 'hex')))
RETURNING code;
```

---

## Generate Multiple Codes at Once

```sql
-- Generate 5 codes
INSERT INTO public.family_codes (code, notes)
SELECT
  'FAMILY-' || upper(encode(gen_random_bytes(6), 'hex')),
  'Batch 1 - Code ' || i
FROM generate_series(1, 5) AS i
RETURNING code, notes;

-- Generate 10 codes
INSERT INTO public.family_codes (code, notes)
SELECT
  'FAMILY-' || upper(encode(gen_random_bytes(6), 'hex')),
  'Code #' || i
FROM generate_series(1, 10) AS i
RETURNING code, notes;
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
