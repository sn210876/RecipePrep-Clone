# Error Handling & Debug Logging Guide

This document describes the comprehensive error handling and logging system added to help debug mobile crashes and production issues.

## Overview

The app now includes:
1. Centralized error logging system
2. Environment variable validation
3. Global error handlers
4. Enhanced Error Boundary with log downloads
5. Visible error banners for critical issues
6. Comprehensive console logging throughout the app

## Error Handler System

### Location
- `src/lib/errorHandler.ts` - Core error handling utilities
- `src/lib/envChecker.ts` - Environment validation

### Features

#### 1. Centralized Logging
All errors, warnings, and info messages are logged through a single handler:

```typescript
import { errorHandler } from '@/lib/errorHandler';

// Log an error
errorHandler.error('ComponentName', 'Error message', errorDetails);

// Log a warning
errorHandler.warning('ComponentName', 'Warning message', details);

// Log info
errorHandler.info('ComponentName', 'Info message', details);
```

#### 2. Error Log Storage
- Stores up to 100 most recent log entries
- Includes timestamps, context, messages, and stack traces
- Can be exported as JSON

#### 3. Helper Functions

**withErrorHandling** - Wraps functions with automatic error handling:
```typescript
const safeFn = withErrorHandling(myFunction, 'MyComponent');
```

**safeAsync** - Safely executes async functions with fallback:
```typescript
const result = await safeAsync(
  async () => fetchData(),
  'MyComponent',
  fallbackValue
);
```

**safeSync** - Safely executes sync functions with fallback:
```typescript
const result = safeSync(
  () => localStorage.getItem('key'),
  'MyComponent',
  'default'
);
```

## Environment Validation

### Automatic Checks
The app validates environment variables on startup:

**Required Variables:**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

**Optional Variables:**
- `VITE_OPENAI_API_KEY`
- `VITE_RECIPE_SERVER_URL`

### Error Display
If required environment variables are missing:
1. Console logs the missing variables
2. Shows a red error banner at the top of the app
3. Banner includes details of what's missing
4. Can be dismissed by user

## Global Error Handlers

### Window Error Handler
Catches all uncaught errors:
```javascript
window.addEventListener('error', (event) => {
  // Logs to errorHandler with full details
});
```

### Unhandled Promise Rejection Handler
Catches all unhandled promise rejections:
```javascript
window.addEventListener('unhandledrejection', (event) => {
  // Logs to errorHandler with reason
});
```

## Enhanced Error Boundary

### Location
`src/components/ErrorBoundary.tsx`

### Features

1. **Comprehensive Error Display**
   - User-friendly error message
   - Reload and Home buttons
   - Development mode shows full error details

2. **Download Error Logs**
   - Blue "Download Error Logs" button
   - Downloads complete error log as JSON file
   - Filename includes timestamp: `mealscrape-error-logs-{timestamp}.json`

3. **Development vs Production**
   - Development: Shows full stack traces and component stacks
   - Production: Hides technical details, shows user-friendly message

### Using Downloaded Logs
The downloaded JSON file contains:
- All error messages with timestamps
- Error types (error, warning, info)
- Context (which component/module)
- Full error details including stack traces
- System information

## Console Logging

### Application Lifecycle
The app logs all major lifecycle events:

**App Startup:**
- `🚀 Application starting...`
- `📅 Build timestamp`
- `📱 System Information` (device, browser, screen size, etc.)
- `✅ Root element found, rendering app...`

**Component Mounting:**
- `🎬 AppContent mounted`
- `🚀 App component mounting...`

**Mobile App:**
- `📱 Initializing mobile app...`
- `🎨 Setting status bar style...`
- `🤖 Setting Android status bar color...`
- `👋 Hiding splash screen...`

**Services:**
- `📸 Starting image monitoring service...`
- `🛑 Stopping image monitoring service...`

### Supabase Operations
All Supabase operations are logged:

- `🔧 Initializing Supabase client...`
- `✅ Supabase credentials found`
- `📱 Platform: Native/Web`
- `✅ Supabase client created successfully`
- `🔐 Checking admin status...`

### Authentication
Detailed auth state logging:

- `🚀 Initializing auth...`
- `🔗 URL hash: ...`
- `✅ Found access_token in URL`
- `📧 Processing signup verification...`
- `✅ User verified: email`
- `🔍 Auth State: {hasUser, email, etc.}`

### Error Tracking
All errors include:
- ❌ Error indicator
- Context/component name
- Error message
- Full error details
- Stack trace (if available)

## Error Banner Component

### Location
`src/components/ErrorBanner.tsx`

### Usage
```tsx
<ErrorBanner
  title="Configuration Error"
  message="Critical services failed to initialize"
  details={['Missing: VITE_SUPABASE_URL', 'Missing: VITE_SUPABASE_ANON_KEY']}
  severity="error"
  onDismiss={() => setError(null)}
/>
```

### Features
- Fixed position at top of screen (z-index: 9999)
- Red for errors, yellow for warnings
- Expandable details section
- Dismissible with X button
- Mobile responsive

## Debugging Mobile Crashes

### Step 1: Reproduce the Crash
1. Open the app on mobile
2. Open the browser's dev tools (if possible)
3. Perform the action that causes the crash

### Step 2: Check Console Logs
Look for the last successful log message before the crash. Common patterns:

**App failed to start:**
```
❌ Environment validation failed!
❌ Missing Supabase environment variables
```

**Auth failure:**
```
❌ Session error: ...
❌ Admin check error: ...
```

**Component crash:**
```
❌ ErrorBoundary caught error
❌ Component did catch
```

### Step 3: Download Error Logs
If the app crashes but the Error Boundary catches it:
1. Click "Download Error Logs" button
2. Send the JSON file for analysis
3. File contains all errors leading up to the crash

### Step 4: Check System Info
The logs include system information:
- User agent (browser/device)
- Platform
- Screen size
- Online/offline status
- Timezone
- Current URL

## Adding Error Handling to New Code

### For New Components
```typescript
import { errorHandler } from '@/lib/errorHandler';

function MyComponent() {
  useEffect(() => {
    errorHandler.info('MyComponent', 'Component mounted');

    return () => {
      errorHandler.info('MyComponent', 'Component unmounting');
    };
  }, []);

  const handleAction = async () => {
    try {
      errorHandler.info('MyComponent', 'Starting action...');
      await performAction();
      errorHandler.info('MyComponent', '✅ Action completed');
    } catch (error) {
      errorHandler.error('MyComponent', 'Action failed', error);
    }
  };
}
```

### For Supabase Calls
```typescript
try {
  const { data, error } = await supabase
    .from('table')
    .select('*');

  if (error) {
    errorHandler.error('MyComponent', 'Database query failed', error);
    return;
  }

  errorHandler.info('MyComponent', `✅ Retrieved ${data.length} records`);
} catch (error) {
  errorHandler.error('MyComponent', 'Exception in database call', error);
}
```

### For Storage Access
```typescript
try {
  const value = localStorage.getItem('key');
  errorHandler.info('MyComponent', 'Retrieved from localStorage');
} catch (error) {
  errorHandler.error('MyComponent', 'localStorage access failed', error);
}
```

## Tips for Production Debugging

1. **Always check console first** - Most issues are logged before they crash
2. **Look for error patterns** - Similar errors often indicate the root cause
3. **Check timestamps** - Understand the sequence of events
4. **Monitor environment** - Ensure all required env vars are present
5. **Use error banner** - Critical issues show at top of screen
6. **Download logs** - Send to developers for detailed analysis

## Error Log Format

```json
[
  {
    "timestamp": "2024-01-15T10:30:45.123Z",
    "type": "error",
    "context": "Supabase",
    "message": "Failed to check admin status",
    "details": {
      "error": "NetworkError",
      "code": "NETWORK_ERROR"
    },
    "stack": "Error: NetworkError\n    at ..."
  }
]
```

## Common Error Scenarios

### 1. Missing Environment Variables
**Symptoms:** Red error banner on app load
**Logs:** `❌ Environment validation failed!`
**Solution:** Check .env file has required variables

### 2. Supabase Connection Failure
**Symptoms:** App loads but data doesn't appear
**Logs:** `❌ Failed to create Supabase client`
**Solution:** Verify Supabase URL and keys are correct

### 3. Auth Issues
**Symptoms:** Can't log in or session expires
**Logs:** `❌ Session error`, `❌ getUser error`
**Solution:** Check Supabase auth settings

### 4. Component Render Errors
**Symptoms:** Error Boundary screen appears
**Logs:** `❌ ErrorBoundary caught error`
**Solution:** Download logs and check component stack

## Future Improvements

Consider adding:
1. Remote error logging (Sentry, LogRocket, etc.)
2. User feedback form on error screen
3. Automatic crash reports
4. Performance monitoring
5. Network request logging
6. State snapshot on error
