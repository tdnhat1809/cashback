import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  ApiError,
  authApi,
  type AuthUser,
} from '../services/apiClient';
import { AuthContext, type AuthContextValue, type AuthStatus } from './auth-context';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [error, setError] = useState<ApiError | null>(null);

  const refreshSession = useCallback(async () => {
    setStatus('loading');
    setError(null);

    try {
      const currentUser = await authApi.me();
      setUser(currentUser);
      setStatus('authenticated');
    } catch (caught) {
      if (caught instanceof ApiError && (caught.status === 401 || caught.status === 403)) {
        setUser(null);
        setStatus('unauthenticated');
        return;
      }

      const apiError = caught instanceof ApiError
        ? caught
        : new ApiError({
            status: 0,
            code: 'AUTH_STATE_ERROR',
            message: 'Không thể kiểm tra phiên đăng nhập.',
          });
      setUser(null);
      setError(apiError);
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  const register = useCallback(async (input: { name: string; email: string; password: string }) => {
    const session = await authApi.register(input);
    setUser(session.user);
    setError(null);
    setStatus('authenticated');
    return session;
  }, []);

  const login = useCallback(async (input: { email: string; password: string }) => {
    const session = await authApi.login(input);
    setUser(session.user);
    setError(null);
    setStatus('authenticated');
    return session;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
      setError(null);
      setStatus('unauthenticated');
    }
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    status,
    error,
    register,
    login,
    refreshSession,
    logout,
  }), [error, login, logout, refreshSession, register, status, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
