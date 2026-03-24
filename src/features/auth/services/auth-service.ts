import { authRepository } from '../repositories/auth-repository';
import { LoginCredentials, SignupCredentials, UserWithProfile } from '../types';

/**
 * Auth Service
 * Business logic layer for authentication
 */
export class AuthService {
  /**
   * Sign in user
   */
  async signIn(credentials: LoginCredentials): Promise<UserWithProfile> {
    try {
      const user = await authRepository.signIn(credentials.email, credentials.password);
      return user;
    } catch (error) {
      console.error('Sign in error:', error);
      throw new Error('Invalid email or password');
    }
  }

  /**
   * Sign up new user
   */
  async signUp(credentials: SignupCredentials): Promise<UserWithProfile> {
    try {
      const user = await authRepository.signUp(credentials);
      return user;
    } catch (error: any) {
      console.error('Sign up error:', error);
      
      if (error.code === 'auth/email-already-in-use') {
        throw new Error('Email already in use');
      } else if (error.code === 'auth/weak-password') {
        throw new Error('Password should be at least 6 characters');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('Invalid email address');
      }
      
      throw new Error('Failed to create account');
    }
  }

  /**
   * Sign in with Google
   */
  async signInWithGoogle(): Promise<UserWithProfile> {
    try {
      const user = await authRepository.signInWithGoogle();
      return user;
    } catch (error) {
      console.error('Google sign in error:', error);
      throw new Error('Failed to sign in with Google');
    }
  }

  /**
   * Sign out user
   */
  async signOut(): Promise<void> {
    try {
      await authRepository.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
      throw new Error('Failed to sign out');
    }
  }

  /**
   * Get current user
   */
  getCurrentUser() {
    return authRepository.getCurrentUser();
  }

  /**
   * Subscribe to auth state changes
   */
  onAuthStateChange(callback: (user: UserWithProfile | null) => void) {
    return authRepository.onAuthStateChange(callback);
  }
}

// Export singleton instance
export const authService = new AuthService();
