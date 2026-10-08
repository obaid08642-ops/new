import React from 'react';
import { useLocalSearchParams } from 'expo-router';

import { LogMealView } from '../../src/components/care/NutritionViews';

/** The log-meal form; `?meal_type=` preselects the meal. */
export default function LogMealScreen() {
  const { meal_type } = useLocalSearchParams<{ meal_type?: string }>();
  return <LogMealView initialType={typeof meal_type === 'string' ? meal_type : undefined} />;
}
