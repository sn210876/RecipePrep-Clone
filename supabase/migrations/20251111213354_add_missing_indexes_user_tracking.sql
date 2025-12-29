/*
  # Add Missing Indexes for User Tracking

  1. Performance Improvements
    - Add index on `user_tracking.user_id` to optimize foreign key lookups
    - Add index on `user_tracking.email` to optimize email lookups
    
  2. Impact
    - Improves query performance for user lookups
    - Resolves the unindexed foreign key security warning
    - Enables efficient joins with auth.users table
*/

-- Create index on user_id for the foreign key relationship
CREATE INDEX IF NOT EXISTS idx_user_tracking_user_id ON user_tracking(user_id);

-- Create index on email for faster email lookups
CREATE INDEX IF NOT EXISTS idx_user_tracking_email ON user_tracking(email);
