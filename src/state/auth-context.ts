import { createContext, useContext } from 'react';
import type {
  ApiError,
  AuthUser,
  OtpChallenge,
  VerifiedSession,
} from '../services/apiClient';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'error';

export interface AuthContextValue {
  user: AuthUser | null;
  status: AuthStatus;
  error: ApiError | null;
  requestOtp: (phone: string) => Promise<OtpChallenge>;
  verifyOtp: (input: { challengeId: string; phone: string; code: string }) => Promise<VerifiedSession>;
  refreshSession: () => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
};
