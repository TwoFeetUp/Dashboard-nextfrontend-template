'use client';

import React, { createContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import pb, { isAuthenticated, clearAuthStore, subscribeToAuthChanges, type AuthRecord } from '@/lib/pocketbase';
import type { AuthContextType, AuthProviderProps, User, LoginFormData, SignupFormData } from '@/types/auth';

// Create the authentication context
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const mapRecordToUser = (record: AuthRecord): User => ({
  id: record.id,
  email: record.email || '',
  username: record.username,
  name: record.name,
  avatar: record.avatar,
  verified: record.verified || false,
  created: record.created,
  updated: record.updated,
  emailVisibility: record.emailVisibility,
});

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Initialize auth state on mount
  useEffect(() => {
    let isMounted = true;

    const redirectToLogin = () => {
      if (typeof window !== 'undefined' && window.location.pathname !== '/') {
        router.replace('/');
      }
    };

    const initAuth = async () => {
      const hasStoredSession = pb.authStore.isValid && !!pb.authStore.token;

      if (!hasStoredSession) {
        clearAuthStore();
        if (!isMounted) return;
        setUser(null);
        setIsLoading(false);
        redirectToLogin();
        return;
      }

      try {
        const authData = await pb.collection('users').authRefresh();
        if (!isMounted) return;
        if (authData?.record) {
          setUser(mapRecordToUser(authData.record as AuthRecord));
        } else {
          clearAuthStore();
          setUser(null);
          redirectToLogin();
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        clearAuthStore();
        if (!isMounted) return;
        setUser(null);
        redirectToLogin();
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initAuth();

    const unsubscribe = subscribeToAuthChanges((token, model) => {
      if (!isMounted) {
        return;
      }

      if (model) {
        setUser(mapRecordToUser(model));
      } else {
        setUser(null);
        redirectToLogin();
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [router]);

  // Login function
  const login = useCallback(async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const authData = await pb.collection('users').authWithPassword(
        data.email,
        data.password
      );

      setUser(mapRecordToUser(authData.record as AuthRecord));

      router.push('/');
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to login. Please check your credentials.';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  // Signup function
  const signup = useCallback(async (data: SignupFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      // Create new user
      const user = await pb.collection('users').create({
        email: data.email,
        emailVisibility: true,
        password: data.password,
        passwordConfirm: data.passwordConfirm,
        username: data.username,
        name: data.name,
      });

      // Auto-login after successful signup
      await login({
        email: data.email,
        password: data.password,
      });

      // Optionally send verification email
      await pb.collection('users').requestVerification(data.email);
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to create account. Please try again.';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [login]);

  // Logout function
  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      clearAuthStore();
      setUser(null);
      router.push('/');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  // Refresh session function
  const refreshSession = useCallback(async () => {
    if (!isAuthenticated()) {
      return;
    }

    setIsLoading(true);
    try {
      const authData = await pb.collection('users').authRefresh();
      
      setUser(mapRecordToUser(authData.record as AuthRecord));
    } catch (err) {
      console.error('Session refresh failed:', err);
      clearAuthStore();
      setUser(null);
      router.push('/');
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  // Clear error function
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
    login,
    signup,
    logout,
    refreshSession,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
