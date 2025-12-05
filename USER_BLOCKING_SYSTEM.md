# User Blocking System

## Overview

A comprehensive user blocking system has been implemented, allowing users to block other users they don't want to interact with, similar to Instagram's blocking feature.

## Features

### 1. Block/Unblock Users

Users can block and unblock other users from their profile pages.

- Click the three-dot menu button next to the Message button on any user's profile
- Select "Block User" to block them or "Unblock User" to unblock
- Blocking a user automatically unfollows them

### 2. Effects of Blocking

When you block a user:

- **Their posts won't appear in your feed** - Blocked users' posts are filtered out from the Social Feed
- **They can't see your profile** - Future enhancement (would require profile access check)
- **You can't see their content** - All their posts are hidden from you
- **Automatic unfollow** - You automatically unfollow them when blocking

### 3. Conversation Management

Users can now delete entire conversations:

- Open any conversation in Messages
- Click the three-dot menu button in the top-right corner
- Select "Delete Conversation"
- Confirm the deletion
- The conversation and all messages will be permanently deleted

### 4. Clickable Profiles in Messages

- Click on any user's avatar or username in the Messages chat header
- It will navigate to their profile page
- Makes it easy to view someone's profile while chatting

## Database Structure

### blocked_users Table

```sql
CREATE TABLE blocked_users (
  id uuid PRIMARY KEY,
  blocker_id uuid NOT NULL,  -- User who is blocking
  blocked_id uuid NOT NULL,  -- User who is blocked
  created_at timestamptz NOT NULL,
  UNIQUE(blocker_id, blocked_id)
);
```

### Security

- Row Level Security (RLS) is enabled
- Users can only insert, view, and delete their own blocks
- Blocked users cannot see that they are blocked
- Unique constraint prevents duplicate blocks

## Implementation Details

### Block Service

A new `blockService` provides helper functions:

- `getBlockedUserIds(userId)` - Get list of users you've blocked
- `getUsersWhoBlockedMe(userId)` - Get list of users who blocked you
- `isUserBlocked(currentUserId, targetUserId)` - Check if you blocked a user
- `amIBlockedBy(currentUserId, targetUserId)` - Check if a user blocked you
- `filterBlockedUsers(items, blockedIds, blockersIds)` - Filter arrays of users

### Content Filtering

#### Social Feed (Discover page)

- Fetches list of blocked users and users who blocked you
- Filters out posts from these users before displaying
- Ensures you never see content from blocked users

#### Profile Access

- Checks blocking status when viewing profiles
- Blocked users' profiles show limited information (future enhancement)

#### Messages

- Can delete entire conversations
- Profile links work from chat headers

## Usage

### For Users

1. **To block someone:**
   - Visit their profile
   - Click the three-dot menu
   - Select "Block User"
   - Confirm

2. **To unblock someone:**
   - Visit their profile
   - Click the three-dot menu
   - Select "Unblock User"

3. **To delete a conversation:**
   - Open the conversation
   - Click the three-dot menu in the top-right
   - Select "Delete Conversation"
   - Confirm deletion

### For Developers

To check if a user is blocked:

```typescript
import { blockService } from '../services/blockService';

const isBlocked = await blockService.isUserBlocked(currentUserId, targetUserId);
const amIBlocked = await blockService.amIBlockedBy(currentUserId, targetUserId);
```

To filter content:

```typescript
const blockedUserIds = await blockService.getBlockedUserIds(userId);
const usersWhoBlockedMe = await blockService.getUsersWhoBlockedMe(userId);

const filteredPosts = posts.filter(post => {
  return !blockedUserIds.includes(post.user_id) &&
         !usersWhoBlockedMe.includes(post.user_id);
});
```

## Privacy & Safety

- Blocking is one-way (if A blocks B, B doesn't automatically block A)
- Users cannot block themselves
- Blocked users are not notified
- Block status is private and secure
- All block operations are logged in the database

## Future Enhancements

Potential improvements:

- Prevent blocked users from viewing your profile completely
- Hide mutual blocks from follower/following lists
- Block users from search results
- Prevent blocked users from commenting on mutual posts
- Export/import block lists
- Bulk block management
