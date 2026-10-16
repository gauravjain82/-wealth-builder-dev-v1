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

/**
 * Set when an SMD's assistant is signed in with their own login. The session then
 * behaves as the SMD (`principal`) on every endpoint; this only tells the UI so it can
 * show the assistant banner and hide personal settings.
 */
export interface ActingAs {
  assistant_id: number;
  assistant_name: string;
  principal_id: number;
  principal_name: string;
}

// Extended user with profile data
export interface UserWithProfile extends AuthUser {
  accountType: AccountType;
  roles?: string[];
  hasPromotionAccess?: boolean;
  plan?: Plan; // Alias for accountType (from Firestore)
  firstName?: string;
  lastName?: string;
  name?: string;
  fullName?: string;
  sponsorId?: string;
  teamId?: string;
  lastLogin?: Date;
  /** Assistant mode: who is really signed in, and whose account they work in. */
  actingAs?: ActingAs | null;
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
