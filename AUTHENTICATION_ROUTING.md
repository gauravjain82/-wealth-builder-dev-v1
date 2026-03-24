# Authentication Routing Documentation

## Overview

The application implements a complete authentication routing system that automatically redirects users based on their authentication status.

## Routing Behavior

### 1. **Root Path (`/`)**

**Component:** `RootRedirect`

- **Not Authenticated** → Redirects to `/login`
- **Authenticated** → Redirects to `/dashboard`
- **Loading** → Shows loader

**Use Case:** When users visit the root URL, they are automatically directed to the appropriate page based on their login status.

### 2. **Login Page (`/login`)**

**Component:** `LoginPage` (standalone, no wrapper)

- **Not Authenticated** → Shows login form
- **Authenticated** → Redirects to intended destination
  - If coming from a protected route (e.g., user tried to access `/events` without login), redirects back to that route
  - Otherwise, redirects to `/dashboard`

**Features:**
- Preserves "from" location using React Router's `location.state`
- After successful login, navigates to the originally requested page
- Password visibility toggle
- Forgot password functionality
- Split-screen design with animated GIF

**Example Flow:**
```
User tries to access /events (not logged in)
  ↓
ProtectedRoute redirects to /login with state: { from: '/events' }
  ↓
User logs in successfully
  ↓
Redirects to /events
```

### 3. **Signup Page (`/signup`)**

**Wrapper:** `PublicRoute`

- **Not Authenticated** → Shows signup form
- **Authenticated** → Redirects to `/dashboard`
- **Loading** → Shows loader

**Features:**
- Creates new account with email/password
- Google Sign-in option
- Redirects to `/dashboard` after successful signup

### 4. **Public Home (`/home`)**

**Wrapper:** `PublicRoute`

- **Not Authenticated** → Shows public landing page
- **Authenticated** → Redirects to `/dashboard`

### 5. **Protected Routes**

**Wrapper:** `ProtectedRoute`

All these routes require authentication:
- `/dashboard`
- `/events`
- `/education`
- `/team`
- `/reports`
- `/settings`
- `/components` (UI showcase)

**Behavior:**
- **Authenticated** → Shows the requested page
- **Not Authenticated** → Redirects to `/login` with `state: { from: currentLocation }`
- **Loading** → Shows loader

### 6. **404 / Catch-All (`*`)**

Any unmatched route redirects to `/` (which then follows the root redirect logic)

## Components

### `ProtectedRoute`

**File:** `src/router/protected-route.tsx`

```tsx
<ProtectedRoute>
  <YourProtectedPage />
</ProtectedRoute>
```

**Purpose:** Wraps routes that require authentication

**Logic:**
1. Shows loader while checking auth state
2. If not authenticated, redirects to `/login` with current location
3. If authenticated, renders children

### `PublicRoute`

**File:** `src/router/public-route.tsx`

```tsx
<PublicRoute redirectTo="/dashboard">
  <YourPublicPage />
</PublicRoute>
```

**Purpose:** Wraps routes that should only be accessible to non-authenticated users

**Props:**
- `redirectTo` (optional): Where to redirect authenticated users (default: `/dashboard`)

**Logic:**
1. Shows loader while checking auth state
2. If authenticated, redirects to specified page
3. If not authenticated, renders children

### `RootRedirect`

**File:** `src/router/root-redirect.tsx`

```tsx
<Route path="/" element={<RootRedirect />} />
```

**Purpose:** Smart root route handler that redirects based on auth state

**Logic:**
1. Shows loader while checking auth state
2. If authenticated, redirects to `/dashboard`
3. If not authenticated, redirects to `/login`

## Authentication Flow

### Login Flow

```
┌─────────────┐
│ Visit /     │
└──────┬──────┘
       │
       ▼
┌─────────────────┐      No      ┌──────────────┐
│ Authenticated?  │────────────► │ /login       │
└─────────────────┘              └──────┬───────┘
       │ Yes                            │
       ▼                                │
┌─────────────────┐                     │
│ /dashboard      │                     │
└─────────────────┘                     │
                                        │
                        User enters credentials
                                        │
                                        ▼
                              ┌─────────────────┐
                              │ Sign in success │
                              └────────┬────────┘
                                       │
                                       ▼
                              ┌─────────────────┐
                              │ Navigate to     │
                              │ intended page   │
                              └─────────────────┘
```

### Protected Route Access Flow

```
┌──────────────────┐
│ Visit /events    │
└────────┬─────────┘
         │
         ▼
┌─────────────────┐      No      ┌──────────────────────┐
│ Authenticated?  │────────────► │ /login               │
└─────────────────┘              │ state: { from: url } │
         │ Yes                   └──────────┬───────────┘
         ▼                                  │
┌─────────────────┐                         │
│ Show /events    │                         │
└─────────────────┘                         │
                                            │
                            User logs in successfully
                                            │
                                            ▼
                              ┌──────────────────────┐
                              │ Redirect to /events  │
                              │ (from state.from)    │
                              └──────────────────────┘
```

### Logout Flow

```
┌─────────────────┐
│ User clicks     │
│ logout button   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Call signOut()  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Clear auth state│
│ Clear localStorage│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Navigate to /   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ RootRedirect    │
│ → /login        │
└─────────────────┘
```

## Implementation Details

### Router Configuration

**File:** `src/router/index.tsx`

```tsx
const router = createBrowserRouter([
  // Root - Smart redirect
  {
    path: '/',
    element: <RootRedirect />,
  },

  // Login - Standalone (handles own redirect)
  {
    path: '/login',
    element: <LoginPage />,
  },

  // Signup - Public route
  {
    path: '/signup',
    element: (
      <PublicRoute>
        <SignupPage />
      </PublicRoute>
    ),
  },

  // Protected routes
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'events', element: <EventsPage /> },
      // ... other protected routes
    ],
  },

  // 404
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
```

### Authentication Context

**File:** `src/features/auth/hooks/use-auth.tsx`

The `AuthProvider` component wraps the entire app and provides:

- `user`: Current user object or null
- `isLoading`: Boolean indicating auth state is being determined
- `isAuthenticated`: Boolean indicating if user is logged in
- `signIn()`: Login function
- `signUp()`: Signup function
- `signInWithGoogle()`: Google OAuth login
- `signOut()`: Logout function
- `error`: Error message if any

**Usage in components:**

```tsx
import { useAuth } from '@/features/auth';

function MyComponent() {
  const { user, isAuthenticated, isLoading, signOut } = useAuth();

  if (isLoading) return <div>Loading...</div>;
  
  return (
    <div>
      {isAuthenticated && <p>Welcome, {user?.displayName}</p>}
      <button onClick={signOut}>Logout</button>
    </div>
  );
}
```

## Testing Scenarios

### Scenario 1: Direct URL Access (Not Logged In)

```
User enters: http://localhost:5173/events
Expected: Redirected to /login
After login: Redirected back to /events
```

### Scenario 2: Direct URL Access (Logged In)

```
User enters: http://localhost:5173/events
Expected: Shows /events page directly
```

### Scenario 3: Accessing Login While Authenticated

```
User enters: http://localhost:5173/login
User is logged in
Expected: Redirected to /dashboard
```

### Scenario 4: Root Access (Not Logged In)

```
User enters: http://localhost:5173/
Expected: Redirected to /login
```

### Scenario 5: Root Access (Logged In)

```
User enters: http://localhost:5173/
Expected: Redirected to /dashboard
```

### Scenario 6: Invalid Route

```
User enters: http://localhost:5173/invalid-page
Expected: Redirected to / (then follows root redirect logic)
```

### Scenario 7: Logout

```
User clicks logout from /dashboard
Expected: 
  1. Auth state cleared
  2. Redirected to /
  3. RootRedirect sends to /login
```

## Best Practices

### 1. **Always Use Route Guards**

```tsx
// ✅ Correct - Protected route
<Route 
  path="/dashboard" 
  element={
    <ProtectedRoute>
      <DashboardPage />
    </ProtectedRoute>
  } 
/>

// ❌ Wrong - No protection
<Route path="/dashboard" element={<DashboardPage />} />
```

### 2. **Public Pages for Auth Users**

```tsx
// ✅ Correct - Redirects authenticated users
<Route 
  path="/signup" 
  element={
    <PublicRoute>
      <SignupPage />
    </PublicRoute>
  } 
/>

// ❌ Wrong - Authenticated users can access signup
<Route path="/signup" element={<SignupPage />} />
```

### 3. **Preserve Navigation Intent**

The login page automatically preserves where the user was trying to go:

```tsx
// In ProtectedRoute.tsx
<Navigate to="/login" state={{ from: location }} replace />

// In LoginPage.tsx
const from = (location.state as any)?.from || '/dashboard';
// After login, navigate to 'from'
```

### 4. **Loading States**

Always show a loader while determining auth state:

```tsx
if (isLoading) {
  return <div className="flex h-screen items-center justify-center">
    <div className="text-lg">Loading...</div>
  </div>;
}
```

## Troubleshooting

### Issue: Infinite Redirect Loop

**Symptom:** Browser keeps redirecting between pages

**Causes:**
1. Auth state not properly initialized
2. Circular redirect logic
3. Missing loading state check

**Solution:**
- Ensure `isLoading` is checked before making redirect decisions
- Use `replace` prop in Navigate to avoid history buildup

### Issue: Lost Navigation Context

**Symptom:** After login, user goes to dashboard instead of intended page

**Cause:** Not preserving `location.state.from`

**Solution:** 
- Ensure ProtectedRoute passes `state: { from: location }`
- Ensure LoginPage reads and uses the `from` state

### Issue: Public Route Still Accessible

**Symptom:** Logged-in users can access /login or /signup

**Cause:** Route not wrapped in PublicRoute

**Solution:** Wrap route in PublicRoute component

## Summary

The authentication routing system provides:

✅ **Automatic redirects** based on authentication status
✅ **Preserved navigation intent** - users return to requested page after login
✅ **Protected routes** - unauthorized access automatically redirects to login
✅ **Public routes** - authenticated users can't access login/signup
✅ **Smart root handling** - "/" redirects appropriately based on auth state
✅ **Loading states** - smooth UX while checking authentication
✅ **Type-safe** - Full TypeScript support
✅ **Clean architecture** - Reusable route guards

This ensures a seamless user experience where authentication is handled transparently and users are always directed to the appropriate page based on their login status.
