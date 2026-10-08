import React, { useEffect, useState } from 'react';
import { Image, Pressable, Share, Text, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

import { Button, Card, EmptyState, FIcon, Search } from '../../../../packages/ui-native/src';
import { CONSULT_TONE, Gate, Section, goBack, useConsultFormat, type GateStatus } from '../consult/ConsultKit';
import { HealthScreen, HealthTabs, Pill, rowsOf, useRemote, useTab } from '../health/HealthKit';
import { step as scale, useScreenUi } from '../screen/ScreenKit';
import { apiFetch } from '../../utils/api';
import { pickLocalized } from '../../utils/localize';

/**
 * Health articles (Batch 10, merge map row "Articles"; no board, the card and list language of CareHub). The list has the tabs
 * All and Saved (`?tab=`, and `?category=` for a category); the old /articles/bookmarks redirects to ?tab=saved. All is
 * GET /articles (+ /articles/categories), Saved is GET /articles/bookmarks/mine. The detail is GET /articles/:slug with the
 * bookmark status and toggle (/articles/bookmarks/:slug/status and /toggle). There are no comments (owner decision 1).
 * An article carries only the author's name and title today (no doctor id), so the author is text, not a link.
 */

export const ARTICLES_HOME = '/articles' as Href;
const ARTICLES_BACK = '/(tabs)/health' as Href;
const TABS = ['all', 'saved'] as const;

export interface ArticleRow {
  id?: string;
  slug: string;
  title_ar?: string;
  title_en?: string;
  excerpt_ar?: string;
  excerpt_en?: string;
  body_ar?: string;
  body_en?: string;
  cover_image?: string;
  category?: string;
  author_name?: string;
  author_title?: string;
  views?: number;
  published_at?: string;
  tags?: string[];
}

const openArticle = (slug: string) => router.push({ pathname: '/articles/[slug]', params: { slug } } as unknown as Href);

/** The bookmark glyph of the header and of a saved card, in the header's stroke; filled when saved. */
function BookmarkGlyph({ saved, size = 20 }: { saved: boolean; size?: number }) {
  const { c } = useScreenUi();
  const color = saved ? c.action.primary.bg : c.icon.primary;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={saved ? color : 'none'} stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" accessibilityElementsHidden importantForAccessibility="no">
      <Path d="M6 3h12v18l-6-4-6 4z" />
    </Svg>
  );
}

function ShareIcon() {
  const { c } = useScreenUi();
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={c.icon.primary} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 15V3 M7 8l5-5 5 5 M5 13v7h14v-7" />
    </Svg>
  );
}

/** One article of a list: the cover when it has one, the category, the title, two lines of the excerpt, the author, the views and the date. */
export function ArticleCard({ article, saved = false, testID }: { article: ArticleRow; saved?: boolean; testID?: string }) {
  const { theme, t, c, flow, k, num } = useScreenUi();
  const fmt = useConsultFormat();
  const title = pickLocalized(article.title_ar, article.title_en);
  const excerpt = pickLocalized(article.excerpt_ar, article.excerpt_en);
  const meta = [article.author_name, article.views != null ? k('articles.views', { count: num(article.views) }) : '', fmt.date(article.published_at)].filter(Boolean).join(' · ');
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={() => openArticle(article.slug)} testID={testID} style={{ minHeight: 44 }}>
      <Card theme={theme} padding="none">
        {article.cover_image ? <Image source={{ uri: article.cover_image }} accessibilityIgnoresInvertColors style={{ width: '100%', height: 150, borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: c.bg.sunken }} resizeMode="cover" /> : null}
        <View style={{ padding: 14, gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            {article.category ? <Pill label={article.category} tone="info" /> : <View />}
            {saved ? <BookmarkGlyph saved size={18} /> : null}
          </View>
          <Text style={{ ...scale(t, 'h4'), color: c.text.primary, ...flow }}>{title}</Text>
          {excerpt ? <Text numberOfLines={2} style={{ ...scale(t, 'small', 'regular'), color: c.text.secondary, ...flow }}>{excerpt}</Text> : null}
          {meta ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{meta}</Text> : null}
        </View>
      </Card>
    </Pressable>
  );
}

function AllTab() {
  const { k, theme } = useScreenUi();
  const params = useLocalSearchParams<{ category?: string }>();
  const category = typeof params.category === 'string' ? params.category : '';
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setQuery(text.trim()), 400);
    return () => clearTimeout(id);
  }, [text]);
  const cats = useRemote(async () => rowsOf<string>(await apiFetch('/articles/categories')).filter(Boolean), [], 'articles:categories');
  const list = useRemote(
    async () => {
      const qs = new URLSearchParams();
      if (category) qs.set('category', category);
      if (query) qs.set('q', query);
      qs.set('limit', '30');
      return rowsOf<ArticleRow>(await apiFetch(`/articles?${qs.toString()}`));
    },
    [category, query],
    'articles:list',
  );
  const names = cats.data ?? [];
  const rows = list.data ?? [];
  const filtered = Boolean(query || category);
  return (
    <>
      <Search value={text} onChange={setText} onClear={() => setText('')} clearLabel={k('articles.clearSearch')} placeholder={k('articles.search')} variant="page" theme={theme} testID="articles-search" />
      {names.length > 0 ? (
        <HealthTabs tabs={[{ key: '', label: k('articles.allCategories') }, ...names.map((n) => ({ key: n, label: n }))]} value={category} onChange={(next) => router.setParams({ category: next })} testID="article-categories" />
      ) : null}
      <Gate status={list.status} onRetry={() => void list.reload()}>
        {rows.length === 0 ? (
          <EmptyState icon="file-text" tone={CONSULT_TONE} title={k(filtered ? 'articles.noMatch' : 'articles.empty')} body={k(filtered ? 'articles.noMatchBody' : 'articles.emptyBody')} theme={theme} />
        ) : (
          rows.map((a) => <ArticleCard key={a.id || a.slug} article={a} testID={`article-${a.slug}`} />)
        )}
      </Gate>
    </>
  );
}

function SavedTab() {
  const { k, theme } = useScreenUi();
  const { status, data, reload } = useRemote(async () => rowsOf<ArticleRow>(await apiFetch('/articles/bookmarks/mine')), [], 'articles:saved');
  const rows = data ?? [];
  return (
    <Gate status={status} onRetry={() => void reload()}>
      {rows.length === 0 ? (
        <EmptyState icon="file-text" tone={CONSULT_TONE} title={k('articles.savedEmpty')} body={k('articles.savedEmptyBody')} actionLabel={k('articles.browse')} onAction={() => router.setParams({ tab: 'all' })} theme={theme} />
      ) : (
        rows.map((a) => <ArticleCard key={a.id || a.slug} article={a} saved testID={`saved-${a.slug}`} />)
      )}
    </Gate>
  );
}

/** The articles list: All and Saved. */
export function ArticlesView() {
  const { k } = useScreenUi();
  const [tab, setTab] = useTab(TABS, 'all');
  return (
    <HealthScreen title={k('articles.title')} onBack={() => goBack(ARTICLES_BACK)} testID="articles-screen">
      <HealthTabs tabs={[{ key: 'all', label: k('articles.tab.all') }, { key: 'saved', label: k('articles.tab.saved') }]} value={tab} onChange={setTab} testID="articles-tabs" />
      {tab === 'saved' ? <SavedTab /> : <AllTab />}
    </HealthScreen>
  );
}

/** One article: cover, category, title, author, date, views, body, tags, related, with share and bookmark in the header. */
export function ArticleDetailView({ slug }: { slug: string }) {
  const { k, theme, t, c, flow } = useScreenUi();
  const fmt = useConsultFormat();
  const [saved, setSaved] = useState(false);
  const { status, data, reload } = useRemote(
    async () => {
      const article = await apiFetch<ArticleRow>(`/articles/${encodeURIComponent(slug)}`);
      const related = article?.category ? rowsOf<ArticleRow>(await apiFetch(`/articles?category=${encodeURIComponent(article.category)}&limit=4`).catch(() => [])).filter((r) => r.slug !== article.slug).slice(0, 3) : [];
      // The bookmark status needs a signed-in patient; a failure only means "not saved".
      const mark = await apiFetch<{ bookmarked?: boolean }>(`/articles/bookmarks/${encodeURIComponent(slug)}/status`).catch(() => null);
      return { article, related, bookmarked: !!mark?.bookmarked };
    },
    [slug],
    'articles:detail',
  );
  useEffect(() => {
    if (data) setSaved(data.bookmarked);
  }, [data]);
  const article = data?.article;
  const gate: GateStatus = status === 'ready' && !article?.slug ? 'missing' : status;
  const toggle = async () => {
    try {
      const res = await apiFetch<{ bookmarked?: boolean }>(`/articles/bookmarks/${encodeURIComponent(slug)}/toggle`, { method: 'POST' });
      setSaved(!!res?.bookmarked);
    } catch {
      /* a guest or a network failure keeps the state shown */
    }
  };
  const share = async () => {
    if (!article) return;
    try {
      await Share.share({ message: `${pickLocalized(article.title_ar, article.title_en)}\nhttps://nabdahplus.com/articles/${article.slug}` });
    } catch {
      /* the share sheet was closed */
    }
  };
  const actions = article
    ? [
        { key: 'share', label: k('articles.share'), icon: <ShareIcon />, onPress: () => void share() },
        { key: 'save', label: k(saved ? 'articles.unsave' : 'articles.save'), icon: <BookmarkGlyph saved={saved} />, onPress: () => void toggle() },
      ]
    : undefined;
  const author = article ? [article.author_name, article.author_title].filter(Boolean).join(' · ') : '';
  return (
    <HealthScreen title={k('articles.detailTitle')} onBack={() => goBack(ARTICLES_HOME)} actions={actions} testID="article-screen">
      <Gate status={gate} onRetry={() => void reload()} missingTitle={k('articles.missing')} missingBody={k('articles.missingBody')}>
        {article ? (
          <>
            {article.cover_image ? <Image source={{ uri: article.cover_image }} accessibilityIgnoresInvertColors style={{ width: '100%', height: 200, borderRadius: 24, backgroundColor: c.bg.sunken }} resizeMode="cover" /> : null}
            {article.category ? <Pill label={article.category} tone="info" /> : null}
            <Text accessibilityRole="header" style={{ ...scale(t, 'h2'), color: c.text.primary, ...flow }}>{pickLocalized(article.title_ar, article.title_en)}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
              {author ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <FIcon icon="stethoscope" tone={CONSULT_TONE} size={20} chip="soft" theme={theme} />
                  <Text style={{ ...scale(t, 'small', 'medium'), color: c.text.secondary, ...flow }}>{author}</Text>
                </View>
              ) : null}
              <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>
                {[fmt.date(article.published_at), article.views != null ? k('articles.views', { count: fmt.num(article.views) }) : ''].filter(Boolean).join(' · ')}
              </Text>
            </View>
            <Text style={{ ...scale(t, 'body', 'regular'), color: c.text.primary, ...flow }}>{pickLocalized(article.body_ar, article.body_en) || pickLocalized(article.excerpt_ar, article.excerpt_en)}</Text>
            {Array.isArray(article.tags) && article.tags.length > 0 ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {article.tags.map((tag) => (
                  <Pill key={tag} label={`#${tag}`} tone="neutral" />
                ))}
              </View>
            ) : null}
            {(data?.related ?? []).length > 0 ? (
              <Section title={k('articles.related')}>
                {(data?.related ?? []).map((r) => (
                  <ArticleCard key={r.slug} article={r} testID={`related-${r.slug}`} />
                ))}
              </Section>
            ) : null}
            <Button label={k('articles.allArticles')} variant="secondary" size="lg" fullWidth onPress={() => router.replace(ARTICLES_HOME)} theme={theme} testID="article-all" />
          </>
        ) : null}
      </Gate>
    </HealthScreen>
  );
}
