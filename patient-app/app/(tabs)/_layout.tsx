// @ts-nocheck
import React from 'react';
import { Tabs } from 'expo-router';
import MainTabBar from '../../src/components/navigation/MainTabBar';
import Header from '../../src/components/Header';

// Home, Services, the Pharmacy hub and the Diagnostics hub draw their own top row (the HomeApp / ServiceHub / PharmacyHub boards), so they
// turn the shared header off; the other tabs keep it until their own batch.
const OWN_HEADER = { headerShown: false };

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        header: () => <Header />,
        headerTransparent: false,
      }}
      tabBar={() => <MainTabBar />}
    >
      <Tabs.Screen name="index" options={OWN_HEADER} />
      <Tabs.Screen name="consultations/index" options={OWN_HEADER} />
      <Tabs.Screen name="pharmacy" options={OWN_HEADER} />
      <Tabs.Screen name="diagnostics" options={OWN_HEADER} />
      <Tabs.Screen name="services" options={OWN_HEADER} />
      <Tabs.Screen name="health" />
      <Tabs.Screen name="nursing" />
    </Tabs>
  );
}
