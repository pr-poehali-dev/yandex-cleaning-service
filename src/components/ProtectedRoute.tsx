import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const isAuth = localStorage.getItem('directkit_auth') === 'true';
  const userId = localStorage.getItem('userId');

  if (!isAuth && !userId) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}