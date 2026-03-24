import { BaseEntity, Plan } from '@core/types';

// Account type options
export type AccountType = Plan;

// Auth-specific User type
export interface AuthUser extends BaseEntity {
  email: string;
  displayName: string | null;
  photoURL: string | null;
  phoneNumber: string | null;
  emailVerified: boolean;
  isActive: boolean;
}

// Extended user with profile data
export interface UserWithProfile extends AuthUser {
  accountType: AccountType;
  plan?: Plan; // Alias for accountType (from Firestore)
  firstName?: string;
  lastName?: string;
  name?: string;
  fullName?: string;
  sponsorId?: string;
  teamId?: string;
  lastLogin?: Date;
}

// Auth credentials
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials extends LoginCredentials {
  displayName: string;
}

// Auth state
export interface AuthState {
  user: UserWithProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}
