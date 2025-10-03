'use client';

import { useContext, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthContext } from '@/providers/auth-provider';
import type { AuthContextType } from '@/types/auth';

/**
 * Hook to access the authentication context
 * @throws {Error} If used outside of AuthProvider
 * @returns {AuthContextType} The authentication context
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}

/**
 * Hook that requires authentication and redirects to login if not authenticated
 * @param redirectTo - The path to redirect to after login (default: current path)
 * @returns {AuthContextType} The authentication context
 */
export function useRequireAuth(redirectTo?: string): AuthContextType {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!auth.isLoading && !auth.isAuthenticated) {
      // Store the intended destination
      if (redirectTo) {
        sessionStorage.setItem('redirectAfterLogin', redirectTo);
      } else if (typeof window !== 'undefined') {
        sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
      }

      // Redirect to login
      router.replace('/');
    }
  }, [auth.isLoading, auth.isAuthenticated, router, redirectTo]);

  return auth;
}

/**
 * Hook to check if user has specific role or permission
 * @param role - The role to check for
 * @returns {boolean} Whether the user has the specified role
 */
export function useHasRole(role: string): boolean {
  const { user } = useAuth();
  
  if (!user) return false;
  
  // This assumes you have a 'role' field in your user model
  // Adjust according to your PocketBase schema
  return (user as any).role === role;
}

/**
 * Hook to get the redirect path after login and clear it
 * @returns {string | null} The redirect path or null
 */
export function useLoginRedirect(): string | null {
  if (typeof window === 'undefined') return null;
  
  const redirectPath = sessionStorage.getItem('redirectAfterLogin');
  
  if (redirectPath) {
    sessionStorage.removeItem('redirectAfterLogin');
  }
  
  return redirectPath;
}