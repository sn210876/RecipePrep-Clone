/*
  # Create Scheduled Job for Dailies Cleanup

  1. Extension Setup
    - Enable pg_cron extension if not already enabled
    - Enable pg_net extension for HTTP requests

  2. Scheduled Job
    - Create a cron job that runs every hour
    - Calls the delete-expired-dailies edge function
    - Automatically deletes dailies older than 24 hours and their storage files

  3. Notes
    - Job runs at minute 0 of every hour (e.g., 1:00, 2:00, 3:00)
    - Uses service role key for authentication
    - Logs results for monitoring
*/

-- Enable pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Drop existing job if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'delete-expired-dailies'
  ) THEN
    PERFORM cron.unschedule('delete-expired-dailies');
  END IF;
END $$;

-- Schedule the dailies cleanup job to run every hour
SELECT cron.schedule(
  'delete-expired-dailies',
  '0 * * * *', -- Run at minute 0 of every hour
  $$
    SELECT
      net.http_post(
        url:=current_setting('app.settings.supabase_url') || '/functions/v1/delete-expired-dailies',
        headers:=jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
        ),
        body:='{}'::jsonb
      ) as request_id;
  $$
);
