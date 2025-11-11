# Security Setup Instructions

## ⚠️ CRITICAL: Leaked Password Protection (REQUIRED)

**Status:** ❌ NOT ENABLED - Manual action required

Supabase Auth can prevent users from using compromised passwords by checking against HaveIBeenPwned.org. This feature is currently **DISABLED** and must be enabled manually.

### Steps to Enable:

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **Authentication** → **Providers** → **Email**
4. Scroll down to the **Security** section
5. Enable **"Check for breached passwords"** (toggle ON)
6. Click **Save**

**Why this matters:** This prevents users from choosing passwords that have been exposed in data breaches, significantly improving account security.

**Note:** This setting cannot be changed programmatically and must be configured through the Supabase Dashboard.

## Database Security

### Indexes Added

The following indexes have been added to improve query performance:

- `idx_user_tracking_user_id` - Covers the foreign key on `user_tracking.user_id`
- `idx_user_tracking_email` - Optimizes email lookups on `user_tracking.email`

**Note about "Unused Index" warnings:** These warnings appear because the application is new with minimal data. These indexes are essential for:
- Preventing performance degradation as user base grows
- Optimizing foreign key lookups (required for data integrity)
- Enabling efficient JOIN operations with auth.users table
- Meeting database best practices for foreign key relationships

The indexes will be automatically utilized by PostgreSQL's query planner as the application scales.

### Row Level Security (RLS)

All tables have RLS enabled with appropriate policies to ensure data security:

- Users can only access their own data
- Public recipes are accessible to all authenticated users
- Shopping lists and meal plans are private to each user

## Additional Security Best Practices

1. **Never commit secrets** - All API keys and secrets are in `.env` files which are gitignored
2. **Use HTTPS only** - All API calls go through Supabase's secure endpoints
3. **Regular audits** - Review RLS policies regularly to ensure they're restrictive enough
4. **Monitor logs** - Check Supabase logs for any suspicious activity
