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
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  avatar_url?: string | null;
  profile?: {
    photo_url?: string | null;
    photo_url_thumb?: string | null;
  } | null;
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

function normalizeAccountTypeFromRoles(raw: unknown): AccountType {
  if (!raw) return DEFAULT_ACCOUNT_TYPE;

  // If it's an array, use the first element (e.g., roles[0])
  if (Array.isArray(raw) && raw.length > 0) {
    return normalizeAccountTypeFromRoles(raw[0]);
  }

  // If it's an object, check for roles array first
  if (typeof raw === 'object' && raw !== null) {
    const nested = raw as Record<string, unknown>;
    if (Array.isArray(nested.roles) && nested.roles.length > 0) {
      return normalizeAccountTypeFromRoles(nested.roles[0]);
    }
  }

  // If it's a string, validate against known roles
  if (typeof raw === 'string') {
    const normalized = raw.trim();
    if (!normalized) return DEFAULT_ACCOUNT_TYPE;

    // Handle backend role constants (e.g., LEADER) and common variants (e.g., Leader, leader, Senior Broker)
    const backendStyle = normalized.toUpperCase().replace(/[\s-]+/g, '_');
    const mappedRole = roleToPlan(backendStyle);
    if (mappedRole !== DEFAULT_ACCOUNT_TYPE || backendStyle === 'NEW_AGENT') {
      return mappedRole;
    }

    // Handle direct plan labels from frontend style values
    const lower = normalized.toLowerCase();
    if (lower === Plan.NewAgent.toLowerCase()) return Plan.NewAgent;
    if (lower === Plan.Agent.toLowerCase()) return Plan.Agent;
    if (lower === Plan.Leader.toLowerCase()) return Plan.Leader;
    if (lower === Plan.Broker.toLowerCase()) return Plan.Broker;
    if (lower === Plan.SeniorBroker.toLowerCase()) return Plan.SeniorBroker;
    if (lower === Plan.Admin.toLowerCase()) return Plan.Admin;
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
  // Roles are the single source of truth for account type.
  const roles = (backendUser.roles || []).filter(
    (entry): entry is string => typeof entry === 'string' && entry.trim().length > 0
  );
  const primaryRole = roles[0];
  const accountType = normalizeAccountTypeFromRoles(primaryRole);

  const firstName = backendUser.first_name || '';
  const lastName = backendUser.last_name || '';
  const fullName = backendUser.full_name || `${firstName} ${lastName}`.trim() || backendUser.username || fallbackUsername;

  const photoURL =
    backendUser.profile?.photo_url_thumb ||
    backendUser.profile?.photo_url ||
    backendUser.avatar_url ||
    null;

  return {
    id: String(backendUser.id ?? fallbackId),
    email: backendUser.email || fallbackEmail,
    displayName: fullName || fallbackEmail,
    photoURL,
    phoneNumber: null,
    emailVerified: true,
    accountType,
    roles,
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

  async refreshPhotoURL(): Promise<UserWithProfile | null> {
    const session = this.getStoredSession();
    if (!session?.token || !session?.user) return null;

    try {
      const response = await fetch(buildApiUrl('/api/accounts/users/me/'), {
        headers: { Authorization: `Token ${session.token}` },
      });
      if (!response.ok) return null;

      const data = (await response.json()) as {
        profile?: { photo_url_thumb?: string | null; photo_url?: string | null } | null;
        avatar_url?: string | null;
      };

      const photoURL =
        data.profile?.photo_url_thumb ||
        data.profile?.photo_url ||
        data.avatar_url ||
        null;

      if (photoURL === session.user.photoURL) return session.user;

      const updatedUser: UserWithProfile = { ...session.user, photoURL };
      this.persistSession({ token: session.token, user: updatedUser });
      this.persistToLocalStorage(updatedUser);
      return updatedUser;
    } catch {
      return null;
    }
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
    localStorage.setItem('wb.roles', JSON.stringify(user.roles || []));
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
        roles: user.roles || [],
      })
    );
  }

  private clearLocalStorage(): void {
    localStorage.removeItem('authUser');
    localStorage.removeItem('wb.roles');
    localStorage.removeItem('wb.plan');
    localStorage.removeItem('wb.accountType');
    localStorage.removeItem('wb.userId');
    localStorage.removeItem('wb.userEmail');
    localStorage.removeItem('wb.userName');
  }
}

export const authRepository = new AuthRepository();
