import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { useAppSelector } from '../../store/hooks';
export interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireGuest?: boolean;
}

export function AuthGuard({ children, requireAuth = true, requireGuest = false }: AuthGuardProps) {
  const router = useRouter();
  const segments = useSegments();
  const [isReady, setIsReady] = useState(false);

  const isAuthenticated = useAppSelector(state => state.auth.isAuthenticated);

  useEffect(() => {
    // Basic navigation guard logic
    const checkAuth = async () => {
      const inAuthGroup = segments[0] === '(auth)';

      if (requireAuth && !isAuthenticated && !inAuthGroup) {
        // Redirect to login if auth is required but user is not authenticated
        router.replace('/(auth)/login');
      } else if (requireGuest && isAuthenticated) {
        // Redirect to home if guest access is required but user is authenticated
        router.replace('/');
      } else {
        setIsReady(true);
      }
    };

    checkAuth();
  }, [isAuthenticated, segments, requireAuth, requireGuest, router]);

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0284c7" />
      </View>
    );
  }

  return <>{children}</>;
}
