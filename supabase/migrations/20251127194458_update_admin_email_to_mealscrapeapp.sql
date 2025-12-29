/*
  # Update Admin Email to mealscrapeapp@gmail.com

  1. Purpose
    - Change admin account from snguyen7@msn.com to mealscrapeapp@gmail.com
    - This account will send automated DMs for trial notifications
    - Update admin_users table and documentation

  2. Changes
    - Remove old admin user if exists
    - Add new admin user with mealscrapeapp@gmail.com
    - NOTE: Admin user ID will be set after user creates account
*/

-- Remove old admin reference (if exists)
DELETE FROM admin_users 
WHERE user_id = '51ad04fa-6d63-4c45-9423-76183eea7b39';

-- Note: The new admin user (mealscrapeapp@gmail.com) must:
-- 1. Sign up in the app first
-- 2. Then manually insert their user_id into admin_users table
-- 3. Or update this migration with their user_id after signup

-- For now, we'll add a comment explaining the process
COMMENT ON TABLE admin_users IS 'Admin users for the platform. mealscrapeapp@gmail.com should be added here after signup. This account sends automated DMs for trial notifications.';