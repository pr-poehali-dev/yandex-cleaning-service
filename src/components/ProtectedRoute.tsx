import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const isAuth = localStorage.getItem('directkit_auth') === 'true';

  if (!isAuth) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}
