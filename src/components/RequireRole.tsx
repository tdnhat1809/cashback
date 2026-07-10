import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import type { UserRole } from '../services/apiClient';
import { useAuth } from '../state/auth-context';

interface RequireRoleProps {
  children: React.ReactNode;
  allowedRoles: readonly UserRole[];
}

export const RequireRole: React.FC<RequireRoleProps> = ({ children, allowedRoles }) => {
  const { user, status, error, refreshSession } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <div
        className="min-h-screen bg-background flex items-center justify-center px-6"
        role="status"
        aria-live="polite"
      >
        <div className="w-full max-w-sm rounded-2xl border border-outline-variant/30 bg-white p-6 shadow-soft">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
          <p className="mt-4 text-center text-sm font-semibold text-on-surface-variant">
            Đang kiểm tra phiên đăng nhập…
          </p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div
          className="w-full max-w-md rounded-2xl border border-error/20 bg-white p-7 text-center shadow-soft"
          role="alert"
        >
          <h1 className="text-lg font-black text-on-surface">Chưa thể kiểm tra phiên đăng nhập</h1>
          <p className="mt-2 text-sm text-on-surface-variant">
            {error?.message ?? 'Máy chủ xác thực hiện không phản hồi.'}
          </p>
          <button
            type="button"
            onClick={() => void refreshSession()}
            className="mt-5 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white transition hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated' || !user) {
    const redirect = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirect)}`} replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
};
