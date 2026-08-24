import React, { useCallback, useMemo } from 'react';
import {
  FlatList,
  FlatListProps,
  ViewToken,
  View,
  Platform,
} from 'react-native';

// ---------------------------------------------------------------------------
// Optimized FlatList wrapper
// Applies best practices: windowSize, maxToRenderPerBatch, memoization
// ---------------------------------------------------------------------------

interface OptimizedListProps<T> extends Omit<FlatListProps<T>, 'keyExtractor'> {
  keyExtractor: (item: T, index: number) => string;
}

export function OptimizedList<T>(props: OptimizedListProps<T>) {
  const {
    data,
    renderItem,
    keyExtractor,
    onEndReachedThreshold = 0.5,
    ...rest
  } = props;

  return (
    <FlatList
      data={data}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      windowSize={5}
      maxToRenderPerBatch={10}
      updateCellsBatchingPeriod={50}
      initialNumToRender={10}
      removeClippedSubviews={Platform.OS !== 'web'}
      onEndReachedThreshold={onEndReachedThreshold}
      showsVerticalScrollIndicator={false}
      {...rest}
    />
  );
}

// ---------------------------------------------------------------------------
// Pagination helper
// ---------------------------------------------------------------------------

export interface PaginationState<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalPages: number;
  isLoading: boolean;
  hasMore: boolean;
}

export function createPaginationState<T>(pageSize = 20): PaginationState<T> {
  return {
    items: [],
    page: 1,
    pageSize,
    totalPages: 1,
    isLoading: false,
    hasMore: true,
  };
}

// ---------------------------------------------------------------------------
// Debounce helper (for search inputs, API calls)
// ---------------------------------------------------------------------------

export function debounce<T extends (...args: unknown[]) => void>(
  func: T,
  delay: number,
): T & { cancel: () => void } {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const debounced = (...args: unknown[]) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };

  debounced.cancel = () => {
    if (timeoutId) clearTimeout(timeoutId);
  };

  return debounced as T & { cancel: () => void };
}

// ---------------------------------------------------------------------------
// Throttle helper
// ---------------------------------------------------------------------------

export function throttle<T extends (...args: unknown[]) => void>(
  func: T,
  delay: number,
): T {
  let lastCall = 0;

  const throttled = (...args: unknown[]) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      func(...args);
    }
  };

  return throttled as T;
}

// ---------------------------------------------------------------------------
// Image optimization helper
// ---------------------------------------------------------------------------

export function getOptimizedImageUrl(
  url: string,
  width: number,
  quality = 80,
): string {
  if (!url) return '';
  // CDN image optimization params
  if (url.includes('cdn.nabdahplus.com')) {
    return `${url}?w=${width}&q=${quality}&f=webp`;
  }
  return url;
}

// ---------------------------------------------------------------------------
// Memoization utilities
// ---------------------------------------------------------------------------

export function shallowEqual(
  obj1: Record<string, unknown>,
  obj2: Record<string, unknown>,
): boolean {
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) return false;

  return keys1.every(
    (key) => obj2.hasOwnProperty(key) && obj1[key] === obj2[key],
  );
}

// ---------------------------------------------------------------------------
// Lazy component wrapper with code splitting
// ---------------------------------------------------------------------------

export function createLazyComponent<T extends React.ComponentType<object>>(
  importFn: () => Promise<{ default: T }>,
) {
  return React.lazy(importFn);
}
