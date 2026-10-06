import React from 'react';
import { router } from 'expo-router';

import { AppHeader, Screen } from '../../../packages/ui-native/src';
import { HUB_COLUMN, useScreenUi } from '../../src/components/home/homeKit';
import { ServiceGroup } from '../../src/components/home/ServiceRows';
import { View } from 'react-native';
import { SERVICE_GROUPS } from '../../src/features/services/catalog';

/**
 * All services — the guide to every section of the app (board ServiceHub, canvas/ServiceHub.dc.html: section
 * titles over white cards of rows with the service icons). A pushed page, so it has the shell header with a
 * back button and no tab bar.
 */
export default function ServicesHubScreen() {
  const { theme, tr } = useScreenUi();
  return (
    <Screen
      scroll
      theme={theme}
      header={({ scrolled }) => (
        <AppHeader title={tr('كل الخدمات')} onBack={() => router.back()} backLabel={tr('رجوع')} scrolled={scrolled} theme={theme} />
      )}
    >
      <View style={{ ...HUB_COLUMN, paddingTop: 8, paddingBottom: 24, gap: 16 }}>
        {SERVICE_GROUPS.map((group) => (
          <ServiceGroup key={group.title} title={group.title} items={group.items} />
        ))}
      </View>
    </Screen>
  );
}
