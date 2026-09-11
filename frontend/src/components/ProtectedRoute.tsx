import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Role } from '../types';

export function ProtectedRoute({ allow }: { allow?: Role[] }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-500">
        Loading...
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (allow && allow.length > 0 && user.role !== 'ADMIN' && !allow.includes(user.role)) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-10 text-center">
        <h2 className="text-lg font-semibold text-slate-800">Access restricted</h2>
        <p className="text-sm text-slate-500">
          Your role ({user.role}) doesn't have permission to view this page.
        </p>
      </div>
    );
  }

  return <Outlet />;
}
