// @ts-nocheck
import React from 'react';
import { Tabs } from 'expo-router';
import BottomNavBar from '../../src/components/BottomNavBar';
import Header from '../../src/components/Header';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ 
        headerShown: true,
        header: () => <Header />,
        headerTransparent: false,
      }}
      tabBar={() => <BottomNavBar />}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="consultations/index" />
      <Tabs.Screen name="pharmacy" />
      <Tabs.Screen name="diagnostics" />
      <Tabs.Screen name="services" />
      <Tabs.Screen name="health" />
      <Tabs.Screen name="nursing" options={{ href: null }} />
    </Tabs>
  );
}
