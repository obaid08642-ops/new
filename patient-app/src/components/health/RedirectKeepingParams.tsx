import React from 'react';
import { Redirect, useLocalSearchParams, type Href } from 'expo-router';

/**
 * An old route that became a tab or a section of a merged screen (merge map, Batch 5): it sends the reader to the
 * new route and keeps the query it was opened with. `params` are the new route's own (the tab).
 */
export function RedirectKeepingParams({ to, params }: { to: string; params?: Record<string, string> }) {
  const incoming = useLocalSearchParams<Record<string, string | string[]>>();
  const kept: Record<string, string> = {};
  for (const [key, value] of Object.entries(incoming)) {
    const text = Array.isArray(value) ? value[0] : value;
    if (typeof text === 'string') kept[key] = text;
  }
  return <Redirect href={{ pathname: to, params: { ...kept, ...params } } as unknown as Href} />;
}
