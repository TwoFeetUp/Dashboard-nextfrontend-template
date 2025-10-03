// Authentication related type definitions

export interface User {
  id: string;
  email: string;
  username?: string;
  name?: string;
  avatar?: string;
  verified: boolean;
  created: string;
  updated: string;
  emailVisibility?: boolean;
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

export interface LoginFormData {
  email: string;
  password: string;
}

export interface SignupFormData {
  email: string;
  username?: string;
  name?: string;
  password: string;
  passwordConfirm: string;
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  login: (data: LoginFormData) => Promise<void>;
  signup: (data: SignupFormData) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  clearError: () => void;
}

export interface AuthProviderProps {
  children: React.ReactNode;
}

// Response types from PocketBase
export interface AuthResponse {
  token: string;
  record: User;
}

export interface ValidationError {
  code: string;
  message: string;
  data?: Record<string, any>;
}