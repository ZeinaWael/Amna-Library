import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../store/auth';

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { token, user } = useAuth();
  const loc = useLocation();
  if (!token || user?.role !== 'Admin') {
    return <Navigate to="/admin/login" replace state={{ from: loc.pathname }} />;
  }
  return <>{children}</>;
}
