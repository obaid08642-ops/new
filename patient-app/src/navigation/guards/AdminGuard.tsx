import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppSelector } from '../../store/hooks';
import { tokens } from '../../../../packages/design-tokens/dist/ts/tokens';
const T = tokens('light').color;

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
        <ActivityIndicator size="large" color={T.action.primary.bg} />
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ fontSize: 18, color: T.status.danger.fg, textAlign: 'center' }}>
          Access Denied. Admin privileges required.
        </Text>
      </View>
    );
  }

  return <>{children}</>;
}
