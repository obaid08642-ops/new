import React from 'react';
import { Redirect, useLocalSearchParams, type Href } from 'expo-router';

/** Redirect to another route keeping the query string of the old link (merged screens, sections 2 and 3 of MERGE_MAP_2). `extra` adds fixed params. */
export function RedirectKeepQuery({ to, extra }: { to: string; extra?: Record<string, string> }) {
  const params = useLocalSearchParams() as Record<string, string | string[] | undefined>;
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    const v = Array.isArray(value) ? value[0] : value;
    if (v !== undefined) q.set(key, v);
  }
  for (const [key, value] of Object.entries(extra ?? {})) q.set(key, value);
  const qs = q.toString();
  return <Redirect href={`${to}${qs ? `?${qs}` : ''}` as Href} />;
}
