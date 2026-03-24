# Wealth Builder v1 - Architecture Guide

## Overview

This is a complete redesign of Wealth Builder using modern, scalable, and maintainable architecture principles. The application is built with **strict separation of concerns** and designed for easy migration from Firebase to other backends (e.g., PostgreSQL).

## Core Principles

### 1. **Feature-Based Architecture**
Each feature is self-contained with its own:
- Types/Models (domain models, independent of database)
- Repository (data access layer, abstracts Firebase)
- Services (business logic layer)
- Hooks (React integration)
- Components (UI layer)
- Routes (feature routing)

### 2. **Separation of Concerns**

```
UI Layer (Components)
    ↓ uses hooks
Service Layer (Business Logic)
    ↓ calls
Repository Layer (Data Access)
    ↓ interacts with
External Service (Firebase/PostgreSQL)
```

**Rules:**
- ❌ **NO** Firebase SDK calls in components
- ❌ **NO** business logic in components
- ❌ **NO** Firestore types (Timestamp) in domain models
- ✅ **YES** - All Firebase interaction through repositories
- ✅ **YES** - All dates as JavaScript Date objects
- ✅ **YES** - Type conversions at repository boundary

### 3. **Database Agnostic Design**

The repository pattern allows easy migration:

```typescript
// Current: Firebase
export const userRepository = new FirebaseUserRepository();

// Future: PostgreSQL
export const userRepository = new PostgresUserRepository();

// Components and services remain unchanged!
```

## Project Structure

```
src/
├── core/                      # Core infrastructure
│   ├── config/               # Environment & app config
│   ├── types/                # Global TypeScript types
│   └── utils/                # Utility functions
│
├── infrastructure/           # External integrations
│   ├── firebase/            # Firebase setup & base repository
│   │   ├── config.ts        # Firebase initialization
│   │   ├── base-repository.ts  # Base CRUD operations
│   │   └── converters.ts    # Firestore ↔ Domain conversions
│   ├── query/               # TanStack Query setup
│   └── stripe/              # Stripe integration (future)
│
├── store/                   # Global UI state (Zustand)
│   ├── slices/
│   │   ├── ui-slice.ts      # UI state (sidebar, theme)
│   │   └── toast-slice.ts   # Toast notifications
│   └── index.ts
│
├── shared/                  # Shared across features
│   ├── components/          # Reusable UI components
│   │   ├── ui/              # Base components (Button, Input, Card)
│   │   └── toast/           # Toast notification system
│   ├── layouts/             # Layout components
│   │   ├── main-layout.tsx  # Authenticated app layout
│   │   └── auth-layout.tsx  # Public pages layout
│   ├── hooks/               # Shared React hooks
│   └── lib/                 # Shared utilities
│
├── features/                # Feature modules
│   ├── auth/                # Authentication feature
│   │   ├── types/           # Auth domain models
│   │   ├── repositories/    # Auth data access
│   │   ├── services/        # Auth business logic
│   │   ├── hooks/           # useAuth hook
│   │   ├── components/      # Login/Signup pages
│   │   └── index.ts         # Public API
│   ├── dashboard/
│   ├── events/
│   ├── education/
│   ├── team/
│   └── ...
│
├── router/                  # Routing configuration
│   ├── index.tsx            # Route definitions
│   └── protected-route.tsx  # Auth guard
│
├── App.tsx                  # Root component
├── main.tsx                 # Entry point
└── index.css                # Global styles
```

## Creating a New Feature

Follow this pattern for consistency and maintainability:

### Step 1: Define Types (Domain Models)

```typescript
// features/users/types/index.ts
import { BaseEntity } from '@core/types';

export interface User extends BaseEntity {
  email: string;
  displayName: string;
  accountType: 'free' | 'paid' | 'admin';
  // Use Date, not Timestamp!
  lastLogin: Date;
}
```

### Step 2: Create Repository (Data Access)

```typescript
// features/users/repositories/user-repository.ts
import { BaseRepository } from '@/infrastructure/firebase';
import { User } from '../types';

export class UserRepository extends BaseRepository<User> {
  constructor() {
    super('users'); // Firestore collection name
  }

  // Add custom queries
  async getUsersByAccountType(type: string): Promise<User[]> {
    return this.getAll([
      this.createWhereConstraint('accountType', '==', type),
      this.createOrderByConstraint('createdAt', 'desc')
    ]);
  }
}

export const userRepository = new UserRepository();
```

### Step 3: Create Service (Business Logic)

```typescript
// features/users/services/user-service.ts
import { userRepository } from '../repositories/user-repository';
import { User } from '../types';

export class UserService {
  async getPaidUsers(): Promise<User[]> {
    const users = await userRepository.getUsersByAccountType('paid');
    return users.filter(u => u.isActive);
  }

  async updateUserProfile(userId: string, data: Partial<User>): Promise<void> {
    // Validate data
    if (data.email && !this.isValidEmail(data.email)) {
      throw new Error('Invalid email');
    }
    
    // Update
    await userRepository.update(userId, data);
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}

export const userService = new UserService();
```

### Step 4: Create React Hook (React Integration)

```typescript
// features/users/hooks/use-users.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userService } from '../services/user-service';
import { User } from '../types';

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => userService.getPaidUsers(),
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<User> }) =>
      userService.updateUserProfile(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
```

### Step 5: Create Components (UI)

```typescript
// features/users/components/user-list.tsx
import { useUsers } from '../hooks/use-users';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/components';

export function UserList() {
  const { data: users, isLoading, error } = useUsers();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading users</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Users</CardTitle>
      </CardHeader>
      <CardContent>
        {users?.map(user => (
          <div key={user.id}>{user.displayName}</div>
        ))}
      </CardContent>
    </Card>
  );
}
```

### Step 6: Export Public API

```typescript
// features/users/index.ts
export { UserList } from './components/user-list';
export { useUsers, useUpdateUser } from './hooks/use-users';
export type { User } from './types';
```

## Migration Path: Firebase → PostgreSQL

When migrating to PostgreSQL:

### 1. Create New Repository

```typescript
// features/users/repositories/user-repository-postgres.ts
import { db } from '@/infrastructure/postgres';
import { User } from '../types';

export class PostgresUserRepository {
  async getById(id: string): Promise<User | null> {
    const result = await db.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  async getAll(): Promise<User[]> {
    const result = await db.query('SELECT * FROM users');
    return result.rows;
  }

  // Implement other methods...
}
```

### 2. Switch Repository

```typescript
// features/users/repositories/user-repository.ts
// Old:
// export const userRepository = new FirebaseUserRepository();

// New:
export const userRepository = new PostgresUserRepository();
```

### 3. No Changes Needed In:
- ✅ Components
- ✅ Services
- ✅ Hooks
- ✅ Types

**Everything else stays the same!** This is the power of proper architecture.

## State Management Strategy

### Server State (TanStack Query)
Use for data from external sources:
- User profiles
- Events
- Team members
- Reports
- Any data from Firebase/API

### Global UI State (Zustand)
Use for client-side UI state:
- Sidebar open/closed
- Theme (light/dark)
- UI version (classic/modern)
- Toast notifications
- Modal states

### Local Component State (useState)
Use for component-specific state:
- Form inputs
- Toggle states
- Local UI state

## Best Practices

### ✅ DO:
1. Keep components small and focused
2. Use TypeScript strictly (no `any`)
3. Convert Firestore types at repository boundary
4. Put business logic in services
5. Use hooks for React integration
6. Lazy load route components
7. Use proper error handling
8. Write maintainable, readable code

### ❌ DON'T:
1. Call Firebase directly from components
2. Use Firestore Timestamp in domain models
3. Put business logic in components
4. Inline styles (use Tailwind classes)
5. Ignore TypeScript errors
6. Create God components
7. Skip error handling
8. Duplicate code across features

## Performance Optimizations

### Code Splitting
- ✅ Lazy loading routes
- ✅ Dynamic imports for heavy components
- ✅ Manual chunk splitting in Vite config

### React Query
- ✅ Automatic caching
- ✅ Background refetching
- ✅ Stale-while-revalidate pattern

### React Best Practices
- ✅ Use React.memo for expensive renders
- ✅ Use useMemo/useCallback appropriately
- ✅ Avoid unnecessary re-renders

## Testing Strategy

### Unit Tests
- Test services (business logic)
- Test utility functions
- Test custom hooks

### Integration Tests
- Test feature workflows
- Test repository operations
- Test API integrations

### E2E Tests
- Test critical user flows
- Test authentication
- Test key features

## Environment Variables

Required environment variables:

```env
# Firebase
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=

# Stripe
VITE_STRIPE_PUBLISHABLE_KEY=
```

## Commands

```bash
# Development
npm run dev           # Start dev server

# Build
npm run build         # Production build
npm run preview       # Preview production build

# Type checking
npm run type-check    # Check TypeScript types

# Linting
npm run lint          # Run ESLint
```

## Summary

This architecture provides:
- ✅ **Scalability**: Easy to add new features
- ✅ **Maintainability**: Clear separation of concerns
- ✅ **Testability**: Pure functions, dependency injection
- ✅ **Performance**: Code splitting, lazy loading, caching
- ✅ **Type Safety**: Full TypeScript coverage
- ✅ **Flexibility**: Easy to swap backends
- ✅ **Developer Experience**: Clear patterns, good tooling

Built with modern best practices for production-ready applications.
