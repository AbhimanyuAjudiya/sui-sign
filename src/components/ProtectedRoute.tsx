<<<<<<< HEAD
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAccount } from '../context/AccountProvider';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { account } = useAccount();
  if (!account) {
    return <Navigate to="/" replace />;
  }
  return children;
};

export default ProtectedRoute;
=======
import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useUser } from '../context/UserContext';

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated } = useUser();
  const location = useLocation();

  if (!isAuthenticated) {
    // Redirect to login page but save the location they were trying to access
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
>>>>>>> ef9de5f (added most of the frontend part)
