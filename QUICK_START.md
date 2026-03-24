# Quick Start Guide

## Prerequisites

- Node.js 18+ installed
- npm or pnpm
- Firebase project (already configured)
- Git

## Installation

```bash
# Navigate to project
cd wealth-builder-dev-v1

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your Firebase credentials (already configured)
```

## Development

```bash
# Start development server (http://localhost:3000)
npm run dev

# In another terminal, watch TypeScript errors
npm run type-check
```

## Project Structure Overview

```
src/
├── features/           # Your application features
│   ├── auth/          # ✅ Complete - Authentication
│   ├── dashboard/     # ✅ Complete - Dashboard page
│   ├── events/        # ✅ Placeholder - Events management
│   ├── education/     # ✅ Placeholder - Training center
│   ├── team/          # ✅ Placeholder - Team management
│   └── ...            # Add more features here
│
├── shared/            # Reusable UI components
│   ├── components/    # Button, Input, Card, etc.
│   └── layouts/       # MainLayout, AuthLayout
│
├── infrastructure/    # External services
│   ├── firebase/      # ✅ Complete - Firebase setup
│   └── query/         # ✅ Complete - TanStack Query
│
└── router/            # ✅ Complete - App routing
```

## Adding a New Feature

Let's create a "Contacts" feature as an example:

### 1. Create Feature Structure

```bash
src/features/contacts/
├── types/
│   └── index.ts
├── repositories/
│   └── contact-repository.ts
├── services/
│   └── contact-service.ts
├── hooks/
│   └── use-contacts.ts
├── components/
│   └── contacts-list.tsx
├── pages/
│   └── contacts-page.tsx
└── index.ts
```

### 2. Define Types

```typescript
// src/features/contacts/types/index.ts
import { BaseEntity } from '@core/types';

export interface Contact extends BaseEntity {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  notes?: string;
}
```

### 3. Create Repository

```typescript
// src/features/contacts/repositories/contact-repository.ts
import { BaseRepository } from '@/infrastructure/firebase';
import { Contact } from '../types';

export class ContactRepository extends BaseRepository<Contact> {
  constructor() {
    super('contacts');
  }

  async searchByName(searchTerm: string): Promise<Contact[]> {
    const contacts = await this.getAll();
    return contacts.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }
}

export const contactRepository = new ContactRepository();
```

### 4. Create Service

```typescript
// src/features/contacts/services/contact-service.ts
import { contactRepository } from '../repositories/contact-repository';
import { Contact } from '../types';

export class ContactService {
  async getAllContacts(): Promise<Contact[]> {
    return contactRepository.getAll();
  }

  async searchContacts(searchTerm: string): Promise<Contact[]> {
    if (!searchTerm) return this.getAllContacts();
    return contactRepository.searchByName(searchTerm);
  }

  async createContact(data: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>): Promise<Contact> {
    // Validation
    if (!this.isValidEmail(data.email)) {
      throw new Error('Invalid email address');
    }

    return contactRepository.create(data);
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}

export const contactService = new ContactService();
```

### 5. Create Hook

```typescript
// src/features/contacts/hooks/use-contacts.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contactService } from '../services/contact-service';
import { Contact } from '../types';
import { useToastStore } from '@/store';

export function useContacts() {
  return useQuery({
    queryKey: ['contacts'],
    queryFn: () => contactService.getAllContacts(),
  });
}

export function useCreateContact() {
  const queryClient = useQueryClient();
  const addToast = useToastStore(state => state.addToast);

  return useMutation({
    mutationFn: (data: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>) =>
      contactService.createContact(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      addToast({ type: 'success', message: 'Contact created!' });
    },
    onError: (error: Error) => {
      addToast({ type: 'error', message: error.message });
    },
  });
}
```

### 6. Create Component

```typescript
// src/features/contacts/components/contacts-list.tsx
import { useContacts } from '../hooks/use-contacts';
import { Card, CardContent, CardHeader, CardTitle } from '@shared/components';

export function ContactsList() {
  const { data: contacts, isLoading, error } = useContacts();

  if (isLoading) return <div>Loading contacts...</div>;
  if (error) return <div>Error loading contacts</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contacts ({contacts?.length || 0})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {contacts?.map(contact => (
            <div key={contact.id} className="p-4 border rounded-lg">
              <h3 className="font-semibold">{contact.name}</h3>
              <p className="text-sm text-muted-foreground">{contact.email}</p>
              {contact.phone && (
                <p className="text-sm text-muted-foreground">{contact.phone}</p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

### 7. Create Page

```typescript
// src/features/contacts/pages/contacts-page.tsx
import { ContactsList } from '../components/contacts-list';

export default function ContactsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Contacts</h1>
        <p className="text-muted-foreground">Manage your contacts</p>
      </div>
      
      <ContactsList />
    </div>
  );
}
```

### 8. Export Public API

```typescript
// src/features/contacts/index.ts
export { ContactsList } from './components/contacts-list';
export { useContacts, useCreateContact } from './hooks/use-contacts';
export type { Contact } from './types';
```

### 9. Add Route

```typescript
// src/router/index.tsx
import { lazy } from 'react';

const ContactsPage = lazy(() => import('@/features/contacts/pages/contacts-page'));

// Add to protected routes:
{
  path: 'contacts',
  element: lazyLoad(ContactsPage),
}
```

### 10. Add to Sidebar

```typescript
// src/shared/layouts/sidebar.tsx
import { Users } from 'lucide-react';

const navigationItems = [
  // ...existing items
  { to: '/contacts', label: 'Contacts', icon: Users },
];
```

## Common Tasks

### Adding a UI Component

```typescript
// src/shared/components/ui/my-component.tsx
import * as React from 'react';
import { cn } from '@core/utils';

export function MyComponent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('my-base-classes', className)} {...props} />
  );
}
```

### Adding Global State

```typescript
// src/store/slices/my-slice.ts
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface MyState {
  value: string;
  setValue: (value: string) => void;
}

export const useMyStore = create<MyState>()(
  devtools(
    persist(
      (set) => ({
        value: '',
        setValue: (value) => set({ value }),
      }),
      { name: 'my-store' }
    ),
    { name: 'My Store' }
  )
);
```

### Using Toasts

```typescript
import { useToastStore } from '@/store';

function MyComponent() {
  const addToast = useToastStore(state => state.addToast);

  const handleSuccess = () => {
    addToast({
      type: 'success',
      message: 'Operation completed!',
      duration: 3000, // optional, default 5000ms
    });
  };

  const handleError = () => {
    addToast({
      type: 'error',
      message: 'Something went wrong!',
    });
  };
}
```

## Build & Deploy

```bash
# Type check
npm run type-check

# Build for production
npm run build

# Preview production build
npm run preview

# Deploy to Firebase (if configured)
firebase deploy
```

## Tips

1. **Follow the Pattern**: Always use Repository → Service → Hook → Component
2. **Type Everything**: Use TypeScript strictly, avoid `any`
3. **Keep Components Small**: If a component is > 200 lines, split it
4. **Use Shared Components**: Don't reinvent the wheel
5. **Test As You Go**: Verify each feature works before moving on

## Debugging

### TypeScript Errors
```bash
npm run type-check
```

### Runtime Errors
- Check browser console
- Check React Query DevTools (bottom left in dev mode)
- Check Zustand DevTools (Redux DevTools extension)

### Build Errors
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Try building again
npm run build
```

## Next Steps

1. ✅ You're ready to develop!
2. Read `ARCHITECTURE.md` for deep dive
3. Read `MIGRATION_GUIDE.md` to migrate old code
4. Start building features!

## Resources

- [React Query Docs](https://tanstack.com/query/latest)
- [Zustand Docs](https://docs.pmnd.rs/zustand)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [React Router Docs](https://reactrouter.com)
- [Vite Docs](https://vitejs.dev)

Happy coding! 🚀
