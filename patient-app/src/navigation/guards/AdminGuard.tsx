import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppSelector } from '../../store/hooks';

export interface AdminGuardProps {
  children: React.ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const user = useAppSelector(state => state.auth.user);
  
  useEffect(() => {
    const userRole = user?.role || 'user';
    
    if (userRole !== 'admin') {
      setIsAdmin(false);
      // Could redirect or just show an error state
      setIsReady(true);
    } else {
      setIsAdmin(true);
      setIsReady(true);
    }
  }, [user, router]);

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0284c7" />
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ fontSize: 18, color: '#ef4444', textAlign: 'center' }}>
          Access Denied. Admin privileges required.
        </Text>
      </View>
    );
  }

  return <>{children}</>;
}
