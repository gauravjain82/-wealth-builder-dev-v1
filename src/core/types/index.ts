// Global Type Definitions

// Base Entity
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum Plan {
  NewAgent = 'New Agent',
  Agent = 'Agent',
  Leader = 'Leader',
  Broker = 'Broker',
  SeniorBroker = 'Senior Broker',
  Admin = 'Admin',
}

// User Types
export interface User extends BaseEntity {
  email: string;
  displayName: string | null;
  photoURL: string | null;
  phoneNumber: string | null;
  accountType: 'free' | 'paid' | 'admin';
  isActive: boolean;
  metadata?: Record<string, unknown>;
}

export interface UserProfile extends BaseEntity {
  userId: string;
  firstName: string;
  lastName: string;
  bio?: string;
  location?: string;
  website?: string;
  socialLinks?: {
    linkedin?: string;
    twitter?: string;
    facebook?: string;
  };
}

// Auth Types
export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
}

// API Response Types
export interface ApiResponse<T> {
  data: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// Query Keys
export const QueryKeys = {
  user: ['user'] as const,
  userProfile: (userId: string) => ['user', 'profile', userId] as const,
  events: ['events'] as const,
  event: (eventId: string) => ['events', eventId] as const,
  team: ['team'] as const,
  orgChart: ['orgChart'] as const,
} as const;
