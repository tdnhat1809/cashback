import React from 'react';
import { Navigate } from 'react-router-dom';

interface RequireRoleProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

export const RequireRole: React.FC<RequireRoleProps> = ({ children, allowedRoles }) => {
  // Mock role check. Checks localStorage first, default to 'admin' to allow navigation,
  // but can be changed by the user to test the 403 route redirection.
  const currentRole = localStorage.getItem('mockRole') || 'admin';

  if (!allowedRoles.includes(currentRole)) {
    return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
};
