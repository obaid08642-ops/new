import React from 'react';
import { useLocalSearchParams } from 'expo-router';

import { VitalsView } from '../../src/components/health/VitalsView';

/** Vitals: Today, History and Trends (merge map, Batch 5). `type` opens the history of one vital. */
export default function VitalsScreen() {
  const { type } = useLocalSearchParams<{ type?: string }>();
  return <VitalsView initialType={type} />;
}
