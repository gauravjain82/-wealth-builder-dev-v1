# Migration Guide: Old → New Architecture

This guide helps you migrate code from the old Wealth Builder to the new architecture.

## Quick Reference

### Old Pattern (❌ Don't do this)

```javascript
// ❌ OLD: Direct Firebase calls in component
import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';

function EventsList() {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const fetchEvents = async () => {
      const snapshot = await getDocs(collection(db, 'events'));
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setEvents(data);
    };
    fetchEvents();
  }, []);

  return <div>{events.map(e => <div key={e.id}>{e.name}</div>)}</div>;
}
```

### New Pattern (✅ Do this)

```typescript
// ✅ NEW: Repository → Service → Hook → Component

// 1. Repository (features/events/repositories/event-repository.ts)
import { BaseRepository } from '@/infrastructure/firebase';
import { Event } from '../types';

export class EventRepository extends BaseRepository<Event> {
  constructor() {
    super('events');
  }
}

export const eventRepository = new EventRepository();

// 2. Service (features/events/services/event-service.ts)
import { eventRepository } from '../repositories/event-repository';

export class EventService {
  async getAllEvents() {
    return eventRepository.getAll();
  }
}

export const eventService = new EventService();

// 3. Hook (features/events/hooks/use-events.ts)
import { useQuery } from '@tanstack/react-query';
import { eventService } from '../services/event-service';

export function useEvents() {
  return useQuery({
    queryKey: ['events'],
    queryFn: () => eventService.getAllEvents(),
  });
}

// 4. Component (features/events/components/events-list.tsx)
import { useEvents } from '../hooks/use-events';

function EventsList() {
  const { data: events, isLoading } = useEvents();

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      {events?.map(e => <div key={e.id}>{e.name}</div>)}
    </div>
  );
}
```

## Common Migration Patterns

### 1. Firebase Timestamp → JavaScript Date

```typescript
// ❌ OLD
import { Timestamp } from 'firebase/firestore';

interface Event {
  id: string;
  name: string;
  date: Timestamp; // Firebase-specific type
}

// ✅ NEW
interface Event extends BaseEntity {
  id: string;
  name: string;
  date: Date; // Standard JavaScript type
}

// Conversion happens in repository layer automatically!
```

### 2. State Management

```typescript
// ❌ OLD: Context + useState everywhere
const [user, setUser] = useState(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);

useEffect(() => {
  // Fetch user...
}, []);

// ✅ NEW: TanStack Query for server state
const { data: user, isLoading, error } = useQuery({
  queryKey: ['user', userId],
  queryFn: () => userService.getUser(userId),
});

// ✅ NEW: Zustand for UI state
const sidebarOpen = useUIStore(state => state.sidebarOpen);
const toggleSidebar = useUIStore(state => state.toggleSidebar);
```

### 3. Routing

```typescript
// ❌ OLD: No lazy loading
import Dashboard from './pages/Dashboard';
import Events from './pages/Events';

<Route path="/dashboard" element={<Dashboard />} />
<Route path="/events" element={<Events />} />

// ✅ NEW: Lazy loading + code splitting
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Events = lazy(() => import('./pages/Events'));

<Route path="/dashboard" element={
  <Suspense fallback={<Loading />}>
    <Dashboard />
  </Suspense>
} />
```

### 4. Protected Routes

```typescript
// ❌ OLD: Check auth in every component
function Dashboard() {
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  return <div>Dashboard content</div>;
}

// ✅ NEW: Protected route wrapper
<Route path="/dashboard" element={
  <ProtectedRoute>
    <Dashboard />
  </ProtectedRoute>
} />
```

### 5. API Calls

```typescript
// ❌ OLD: Fetch in useEffect with manual state management
const [data, setData] = useState(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
  async function fetchData() {
    setLoading(true);
    try {
      const result = await someApiCall();
      setData(result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }
  fetchData();
}, []);

// ✅ NEW: TanStack Query handles everything
const { data, isLoading, error } = useQuery({
  queryKey: ['data'],
  queryFn: someApiCall,
});
```

### 6. Mutations (Updates/Creates)

```typescript
// ❌ OLD: Manual mutation handling
const handleSubmit = async (data) => {
  setLoading(true);
  try {
    await updateUser(data);
    // Manually refetch...
    const newData = await getUsers();
    setUsers(newData);
  } catch (err) {
    setError(err);
  } finally {
    setLoading(false);
  }
};

// ✅ NEW: TanStack Query mutation
const updateMutation = useMutation({
  mutationFn: (data) => userService.updateUser(data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['users'] });
    addToast({ type: 'success', message: 'Updated!' });
  },
});

const handleSubmit = (data) => {
  updateMutation.mutate(data);
};
```

## Folder Structure Mapping

### Old Structure
```
src/
├── components/         # Everything mixed together
├── pages/             # Pages with mixed concerns
├── hooks/             # Shared hooks
├── services/          # Some services
├── firebase.js        # Firebase init
└── contexts/          # Context providers
```

### New Structure
```
src/
├── core/              # Core config & types
├── infrastructure/    # External integrations
├── store/             # Global UI state
├── shared/            # Shared components & layouts
├── features/          # Self-contained features
│   └── [feature]/
│       ├── types/
│       ├── repositories/
│       ├── services/
│       ├── hooks/
│       └── components/
└── router/            # Routing config
```

## Step-by-Step Migration Process

### 1. Identify Features
Break down the app into features:
- Auth
- Dashboard
- Events
- Education
- Team
- Reports
- etc.

### 2. For Each Feature:

#### A. Define Types
```typescript
// features/[feature]/types/index.ts
export interface Feature extends BaseEntity {
  // Define domain model (no Firestore types!)
}
```

#### B. Create Repository
```typescript
// features/[feature]/repositories/[feature]-repository.ts
export class FeatureRepository extends BaseRepository<Feature> {
  constructor() {
    super('collection-name');
  }
}
```

#### C. Create Service
```typescript
// features/[feature]/services/[feature]-service.ts
export class FeatureService {
  // Business logic using repository
}
```

#### D. Create Hooks
```typescript
// features/[feature]/hooks/use-[feature].ts
export function useFeature() {
  return useQuery({
    queryKey: ['feature'],
    queryFn: () => featureService.getAll(),
  });
}
```

#### E. Create Components
```typescript
// features/[feature]/components/
// UI components using hooks
```

#### F. Export Public API
```typescript
// features/[feature]/index.ts
export { FeatureComponent } from './components/feature-component';
export { useFeature } from './hooks/use-feature';
export type { Feature } from './types';
```

### 3. Update Routes
Add feature routes to `router/index.tsx` with lazy loading.

### 4. Test
Verify each feature works independently.

## Common Pitfalls

### ❌ Don't:
1. Import Firebase SDK directly in components
2. Use `any` type
3. Skip the service layer
4. Put business logic in components
5. Forget to convert Timestamps to Dates

### ✅ Do:
1. Follow the layered architecture
2. Use proper TypeScript types
3. Keep components simple and focused
4. Use TanStack Query for server state
5. Use Zustand for UI state
6. Write readable, maintainable code

## Testing Your Migration

```bash
# 1. Install dependencies
npm install

# 2. Type check
npm run type-check

# 3. Build
npm run build

# 4. Run dev server
npm run dev
```

## Need Help?

Refer to:
- `ARCHITECTURE.md` - Complete architecture guide
- `README.md` - Getting started guide
- Example features in `src/features/` - Real code examples
