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