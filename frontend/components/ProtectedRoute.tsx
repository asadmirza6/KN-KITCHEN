'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated, getCurrentUser } from '@/services/authService';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  redirectTo?: string;
}

const ProtectedRoute = ({
  children,
  allowedRoles = ['ADMIN'],
  redirectTo = '/login'
}: ProtectedRouteProps) => {
  const router = useRouter();
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = () => {
      if (!isAuthenticated()) {
        router.push(redirectTo);
        return;
      }

      const user = getCurrentUser();
      if (user && allowedRoles.includes(user.role)) {
        setAuthorized(true);
      } else {
        setAuthorized(false);
        router.push('/'); // Redirect unauthorized users to home
      }
    };

    checkAuth();
  }, [router, allowedRoles, redirectTo]);

  if (authorized === null) {
    // Loading state while checking authentication
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking authorization...</p>
        </div>
      </div>
    );
  }

  if (authorized) {
    return <>{children}</>;
  }

  // If not authorized, return nothing (redirect happens in useEffect)
  return null;
};

export default ProtectedRoute;