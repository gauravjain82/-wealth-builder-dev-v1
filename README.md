# Wealth Builder v1 - Modern Architecture

A complete redesign of Wealth Builder using modern, scalable architecture.

## Tech Stack

- **Frontend Framework**: Vite + React 18 + TypeScript
- **State Management**: 
  - TanStack Query (React Query) for server state
  - Zustand for global UI state
- **Routing**: React Router v6 with nested routes and lazy loading
- **Styling**: Tailwind CSS
- **Backend**: Firebase (Firestore, Auth, Storage, Functions)
- **Payment**: Stripe

## Architecture

### Feature-Based Structure
- Each feature is self-contained with its own components, hooks, types, and services
- Shared UI components live in `/shared`
- Core infrastructure (config, types, utils) in `/core`

### Separation of Concerns
- **UI Layer**: React components (no direct Firebase/API calls)
- **Service Layer**: Business logic and orchestration
- **Repository Layer**: Data access abstraction (Firebase SDK interactions)
- **Domain Models**: Pure TypeScript interfaces, independent of Firebase

### Data Layer Design
- All Firestore-specific types converted in repository layer
- Domain models use standard JavaScript types (Date, not Timestamp)
- Easy migration path to PostgreSQL or other databases

## Folder Structure

```
src/
├── core/                    # Core infrastructure
│   ├── config/             # App configuration
│   ├── types/              # Global TypeScript types
│   └── utils/              # Utility functions
│
├── shared/                 # Shared across features
│   ├── components/         # Reusable UI components
│   ├── hooks/              # Shared React hooks
│   ├── layouts/            # Layout components
│   └── lib/                # Shared utilities
│
├── features/              # Feature modules
│   ├── auth/
│   ├── dashboard/
│   ├── education/
│   ├── events/
│   ├── team/
│   └── ...
│
├── infrastructure/        # External service integrations
│   ├── firebase/          # Firebase setup and repositories
│   ├── stripe/            # Stripe integration
│   └── api/               # API client setup
│
├── store/                 # Global state (Zustand)
│   ├── slices/
│   └── index.ts
│
└── router/               # Routing configuration
    ├── routes.tsx
    └── guards.tsx
```

### Feature Structure

Each feature follows this pattern:

```
features/[feature-name]/
├── components/           # Feature-specific components
├── hooks/               # Feature-specific hooks
├── services/            # Business logic layer
├── repositories/        # Data access layer
├── types/              # Feature types and interfaces
├── store/              # Feature-specific state (if needed)
├── routes.tsx          # Feature routes
└── index.ts            # Public API
```

## Key Principles

1. **No styling in logic files**: CSS/Tailwind only in component files
2. **No direct API calls in components**: Use services/repositories
3. **Type safety**: Full TypeScript coverage
4. **Performance**: Code splitting, lazy loading, memoization
5. **Scalability**: Easy to add new features without affecting existing code
6. **Testability**: Pure functions, dependency injection
7. **Database agnostic**: Easy to replace Firestore

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Type check
npm run type-check
```

## Environment Variables

Create a `.env` file:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_key
```
