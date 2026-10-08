import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ArticleDetailView, ArticlesView } from '../../components/articles/ArticlesViews';
import { message } from '../../components/screen/ScreenKit';
import { translations } from '../../i18n';

/**
 * Batch 10: the articles list (tabs All and Saved in `?tab=`) and the article detail. Every value is a TEST value. What is
 * proved: All lists /articles and opens a card; Saved lists /articles/bookmarks/mine and says so when empty; the author is
 * plain text (the article carries no doctor id); the bookmark toggle posts to the same endpoint; a missing article shows the
 * not-found state; there is no comment field; and the new keys exist in the six locale files.
 */

const mockParams: { current: Record<string, string> } = { current: {} };
const mockPush = jest.fn();
const mockSetParams = jest.fn();
const mockApi = jest.fn();

jest.mock('expo-router', () => ({
  router: { push: (...a: unknown[]) => mockPush(...a), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true), setParams: (...a: unknown[]) => mockSetParams(...a) },
  useLocalSearchParams: () => mockParams.current,
}));
jest.mock('react-native-localize', () => ({ getLocales: () => [], findBestLanguageTag: () => undefined }));
jest.mock('../../context/AppContext', () => ({ useApp: () => ({ isDark: false, lang: 'en', isRTL: false }) }));
jest.mock('../../utils/logger', () => ({ logError: jest.fn() }));
jest.mock('../../utils/isOffline', () => ({ isOffline: jest.fn(async () => false) }));
jest.mock('../../utils/api', () => ({ BASE_URL: 'http://test.invalid/api/v1', apiFetch: (...a: unknown[]) => mockApi(...a) }));

const k = (key: string, vars?: Record<string, string | number>) => message('en', key, vars);
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };
const wrap = (ui: React.ReactElement) => <SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>;

const ARTICLE = { id: 'a1', slug: 'test-article', title_en: 'Test article', title_ar: 'مقال تجريبي', body_en: 'Test body', category: 'Test category', author_name: 'Dr Test', author_title: 'Internist', views: 12, published_at: '2026-09-20T09:00:00Z' };

beforeEach(() => {
  mockParams.current = {};
  mockPush.mockClear();
  mockSetParams.mockClear();
  mockApi.mockReset();
});

describe('ArticlesView', () => {
  it('lists the articles and opens one', async () => {
    mockApi.mockImplementation(async (path: string) => (path.startsWith('/articles/categories') ? ['Test category'] : path.startsWith('/articles?') ? { data: [ARTICLE] } : []));
    await render(wrap(<ArticlesView />));
    await waitFor(() => expect(screen.getByTestId('article-test-article')).toBeTruthy());
    expect(screen.getByLabelText(k('articles.tab.saved'))).toBeTruthy();
    await act(async () => {
      fireEvent.press(screen.getByTestId('article-test-article'));
    });
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/articles/[slug]', params: { slug: 'test-article' } });
  });

  it('shows the Saved tab from the route and its empty state', async () => {
    mockParams.current = { tab: 'saved' };
    mockApi.mockResolvedValue([]);
    await render(wrap(<ArticlesView />));
    await waitFor(() => expect(screen.getByText(k('articles.savedEmpty'))).toBeTruthy());
    expect(mockApi).toHaveBeenCalledWith('/articles/bookmarks/mine');
  });

  it('shows the retry state when the list cannot load', async () => {
    mockApi.mockRejectedValue(new Error('x'));
    await render(wrap(<ArticlesView />));
    await waitFor(() => expect(screen.getByText(k('consult.error.title'))).toBeTruthy());
  });
});

describe('ArticleDetailView', () => {
  it('draws the author as text, toggles the bookmark and has no comment field', async () => {
    mockApi.mockImplementation(async (path: string, options?: { method?: string }) => {
      if (path.endsWith('/toggle')) return { bookmarked: true };
      if (path.endsWith('/status')) return { bookmarked: false };
      if (path.startsWith('/articles?')) return [];
      return ARTICLE;
    });
    await render(wrap(<ArticleDetailView slug="test-article" />));
    await waitFor(() => expect(screen.getByText('Test article')).toBeTruthy());
    expect(screen.getByText('Dr Test · Internist')).toBeTruthy();
    expect(screen.queryByPlaceholderText(/comment/i)).toBeNull();
    await act(async () => {
      fireEvent.press(screen.getByLabelText(k('articles.save')));
    });
    expect(mockApi).toHaveBeenCalledWith('/articles/bookmarks/test-article/toggle', { method: 'POST' });
    await waitFor(() => expect(screen.getByLabelText(k('articles.unsave'))).toBeTruthy());
  });

  it('shows the not-found state for an article the server does not have', async () => {
    mockApi.mockResolvedValue({});
    await render(wrap(<ArticleDetailView slug="gone" />));
    await waitFor(() => expect(screen.getByText(k('articles.missing'))).toBeTruthy());
  });
});

describe('locale files', () => {
  it('has every articles key in the six languages', () => {
    const keys = Object.keys((translations as unknown as Record<string, Record<string, string>>).en).filter((key) => key.startsWith('articles.'));
    expect(keys.length).toBeGreaterThanOrEqual(20);
    for (const lang of ['ar', 'en', 'ur', 'hi', 'bn', 'fil']) {
      const bucket = (translations as unknown as Record<string, Record<string, string>>)[lang];
      for (const key of keys) expect(bucket[key]).toBeTruthy();
    }
  });
});
