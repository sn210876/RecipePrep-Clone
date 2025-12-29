# Dailies Auto-Deletion System

## Overview

Daily posts (Dailies) are designed to automatically expire and be deleted after 24 hours, similar to Instagram Stories or Snapchat.

## How It Works

### Edge Function: `delete-expired-dailies`

A Supabase Edge Function has been deployed that:

1. **Queries** the database for all dailies older than 24 hours
2. **Deletes storage files** (images and videos) from the `dailies` storage bucket
3. **Removes database records** from the `dailies` table

### Scheduled Execution

The function is set up to run automatically every hour via a database cron job. This ensures that expired dailies are cleaned up promptly.

### Manual Execution

You can also manually trigger the cleanup by calling the edge function:

```bash
curl -X POST https://YOUR_SUPABASE_URL/functions/v1/delete-expired-dailies \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

Replace `YOUR_SUPABASE_URL` and `YOUR_SERVICE_ROLE_KEY` with your actual Supabase credentials.

## What Gets Deleted

When a daily expires (24+ hours old):
- **Image files** stored in `/dailies` bucket
- **Video files** stored in `/dailies` bucket
- **Database record** in the `dailies` table

## Monitoring

The edge function returns a detailed response:

```json
{
  "message": "Expired dailies deletion completed",
  "storageDeleted": 5,
  "storageFailed": 0,
  "recordsDeleted": 5
}
```

- `storageDeleted`: Number of storage files successfully deleted
- `storageFailed`: Number of storage files that failed to delete
- `recordsDeleted`: Number of database records deleted

## Testing

To test the auto-deletion:

1. Create a daily post
2. Wait 24+ hours (or manually update the `created_at` timestamp in the database for testing)
3. Trigger the edge function manually or wait for the scheduled run
4. Verify the daily is no longer visible and storage files are removed

## Troubleshooting

If dailies are not being deleted:

1. Check the edge function logs in Supabase Dashboard
2. Verify the cron job is running: Query `SELECT * FROM cron.job WHERE jobname = 'delete-expired-dailies';`
3. Manually trigger the function to test it works
4. Check storage bucket permissions

## Database Migration

The scheduled job was created in migration: `create_dailies_cleanup_schedule.sql`

The cron job runs at minute 0 of every hour (e.g., 1:00 AM, 2:00 AM, etc.).
