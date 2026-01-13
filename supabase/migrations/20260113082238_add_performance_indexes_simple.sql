/*
  # Performance Optimization Indexes

  1. Additional Indexes
    - Add index on profiles for username lookups
    - Add optimized indexes for common query patterns
    - Add composite indexes for frequently joined tables

  2. Performance
    - Improves search performance
    - Speeds up profile lookups
    - Faster query execution
*/

-- Add index for profiles username search (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_profiles_username_lower 
ON profiles (LOWER(username));

-- Optimize frequently queried columns on public_recipes
CREATE INDEX IF NOT EXISTS idx_public_recipes_user_created 
ON public_recipes (user_id, created_at DESC);

-- Optimize dailies queries
CREATE INDEX IF NOT EXISTS idx_dailies_created_at 
ON dailies (created_at DESC);

-- Add index for follows table
CREATE INDEX IF NOT EXISTS idx_follows_follower_id 
ON follows (follower_id);

-- Optimize comments queries
CREATE INDEX IF NOT EXISTS idx_comments_created_at 
ON comments (created_at DESC);

-- Add index for recipe title searches (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_public_recipes_title_lower 
ON public_recipes (LOWER(title));

-- Add composite index for posts queries
CREATE INDEX IF NOT EXISTS idx_posts_user_created 
ON posts (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_posts_created_at 
ON posts (created_at DESC);

-- Add index for profile email lookup
CREATE INDEX IF NOT EXISTS idx_profiles_email_lower 
ON profiles (LOWER(email));

-- Optimize notifications lookup
CREATE INDEX IF NOT EXISTS idx_notifications_created_at 
ON notifications (created_at DESC);
