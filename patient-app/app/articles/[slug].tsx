import React from 'react';
import { useLocalSearchParams } from 'expo-router';

import { ArticleDetailView } from '../../src/components/articles/ArticlesViews';

/** One article with the bookmark toggle (Batch 10). */
export default function ArticleDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug?: string }>();
  return <ArticleDetailView slug={String(slug ?? '')} />;
}
