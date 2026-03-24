import { Plan } from '@core/types';
import { roleToPlan } from '@core/constants/roles';
import type { UserWithProfile, AccountType, SignupCredentials } from '../types';

const DEFAULT_ACCOUNT_TYPE: AccountType = Plan.NewAgent;

const AUTH_STORAGE_KEY = 'wb.auth';
const TOKEN_STORAGE_KEY = 'wb.authToken';

interface LoginResponse {
  token: string;
  user_id: number;
  username: string;
}

interface BackendUserProfile {
  id: number;
  username?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  roles?: string[];
  plan?: unknown;
  accountType?: unknown;
  role?: unknown;
  type?: unknown;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

interface StoredAuthSession {
  token: string;
  user: UserWithProfile;
}

function getApiBaseUrl(): string {
  return (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');
}

function buildApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getApiBaseUrl()}${normalizedPath}`;
}

function normalizeAccountType(raw: unknown): AccountType {
  if (!raw) return DEFAULT_ACCOUNT_TYPE;

  // If it's an array, use the first element (e.g., roles[0])
  if (Array.isArray(raw) && raw.length > 0) {
    return normalizeAccountType(raw[0]);
  }

  // If it's an object, check for roles array first
  if (typeof raw === 'object' && raw !== null) {
    const nested = raw as Record<string, unknown>;
    if (Array.isArray(nested.roles) && nested.roles.length > 0) {
      return normalizeAccountType(nested.roles[0]);
    }
  }

  // If it's a string, validate against known roles
  if (typeof raw === 'string') {
    return roleToPlan(raw);
  }

  return DEFAULT_ACCOUNT_TYPE;
}

function toDate(value?: string): Date {
  if (!value) return new Date();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function mapBackendUserToProfile(
  backendUser: Partial<BackendUserProfile>,
  fallbackEmail: string,
  fallbackUsername: string,
  fallbackId: number
): UserWithProfile {
  // Prioritize roles array from backend
  const accountType = normalizeAccountType(
    backendUser.roles ?? backendUser.plan ?? backendUser.accountType ?? backendUser.role ?? backendUser.type
  );

  const firstName = backendUser.first_name || '';
  const lastName = backendUser.last_name || '';
  const fullName = backendUser.full_name || `${firstName} ${lastName}`.trim() || backendUser.username || fallbackUsername;

  return {
    id: String(backendUser.id ?? fallbackId),
    email: backendUser.email || fallbackEmail,
    displayName: fullName || fallbackEmail,
    photoURL: null,
    phoneNumber: null,
    emailVerified: true,
    accountType,
    plan: accountType,
    firstName: firstName || undefined,
    lastName: lastName || undefined,
    fullName: fullName || undefined,
    name: fullName || backendUser.username || undefined,
    isActive: backendUser.is_active !== false,
    createdAt: toDate(backendUser.created_at),
    updatedAt: toDate(backendUser.updated_at),
    lastLogin: new Date(),
  };
}

async function parseError(response: Response): Promise<string> {
  try {
    const data = await response.json();
    return data?.detail || data?.message || 'Authentication failed';
  } catch {
    return 'Authentication failed';
  }
}

async function fetchUserProfile(userId: number, token: string): Promise<Partial<BackendUserProfile> | null> {
  try {
    const response = await fetch(buildApiUrl(`/api/accounts/users/${userId}/`), {
      headers: {
        Authorization: `Token ${token}`,
      },
    });

    if (!response.ok) return null;
    return (await response.json()) as BackendUserProfile;
  } catch {
    return null;
  }
}

/**
 * Auth Repository
 * Handles mlm_platform token authentication operations
 */
export class AuthRepository {
  async signIn(email: string, password: string): Promise<UserWithProfile> {
    const response = await fetch(buildApiUrl('/api/accounts/login/'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: email,
        password,
      }),
    });

    if (!response.ok) {
      throw new Error(await parseError(response));
    }

    const loginData = (await response.json()) as LoginResponse;
    const backendProfile = await fetchUserProfile(loginData.user_id, loginData.token);

    const userProfile = mapBackendUserToProfile(
      backendProfile || { id: loginData.user_id, username: loginData.username },
      email,
      loginData.username,
      loginData.user_id
    );

    this.persistSession({ token: loginData.token, user: userProfile });
    this.persistToLocalStorage(userProfile);

    return userProfile;
  }

  async signUp(_credentials: SignupCredentials): Promise<UserWithProfile> {
    throw new Error('Sign up is not available in this app. Please contact an administrator.');
  }

  async signInWithGoogle(): Promise<UserWithProfile> {
    throw new Error('Google sign in is not available for mlm_platform authentication.');
  }

  async signOut(): Promise<void> {
    this.clearSession();
    this.clearLocalStorage();
  }

  getCurrentUser(): UserWithProfile | null {
    const session = this.getStoredSession();
    return session?.user ?? null;
  }

  onAuthStateChange(callback: (user: UserWithProfile | null) => void) {
    callback(this.getCurrentUser());
    return () => {
      // No-op for API-token auth
    };
  }

  private getStoredSession(): StoredAuthSession | null {
    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as StoredAuthSession;
      if (!parsed?.token || !parsed?.user) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  private persistSession(session: StoredAuthSession): void {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    localStorage.setItem(TOKEN_STORAGE_KEY, session.token);
  }

  private clearSession(): void {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }

  private persistToLocalStorage(user: UserWithProfile): void {
    localStorage.setItem('wb.plan', user.accountType);
    localStorage.setItem('wb.accountType', user.accountType);
    localStorage.setItem('wb.userId', user.id);
    localStorage.setItem('wb.userEmail', user.email);
    localStorage.setItem('wb.userName', user.name || user.displayName || user.email);
    localStorage.setItem(
      'authUser',
      JSON.stringify({
        uid: user.id,
        email: user.email,
        name: user.name || user.displayName,
        displayName: user.displayName,
        fullName: user.fullName || user.name,
        photoURL: user.photoURL,
        accountType: user.accountType,
      })
    );
  }

  private clearLocalStorage(): void {
    localStorage.removeItem('authUser');
    localStorage.removeItem('wb.plan');
    localStorage.removeItem('wb.accountType');
    localStorage.removeItem('wb.userId');
    localStorage.removeItem('wb.userEmail');
    localStorage.removeItem('wb.userName');
  }
}

export const authRepository = new AuthRepository();
