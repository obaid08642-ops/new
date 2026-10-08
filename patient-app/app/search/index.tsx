import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, Chip, EmptyState, ErrorState, FIcon, Icon, OfflineState, Screen, SectionHeader, Search, SERVICE_ICONS, Skeleton, StatusChip, type ServiceName } from '../../../packages/ui-native/src';
import PharmacyProductSearchView from '../../src/components/views/PharmacyProductSearchView';
import DoctorSearchView from '../../src/components/views/DoctorSearchView';
import { LocalizedText } from '../../src/components/LocalizedText';
import { COLUMN, FONT, tint, step as scale, useScreenUi } from '../../src/components/screen/ScreenKit';
import { apiFetch } from '../../src/utils/api';
import { isOffline } from '../../src/utils/isOffline';
import { logError } from '../../src/utils/logger';
import {
  FILTERS,
  blocksFor,
  countByFilter,
  iconFor,
  routeFor,
  type ResultBlock,
  type SearchResult,
} from '../../src/utils/searchResults';

/**
 * Search — board Search (canvas/Search.dc.html).
 *
 * A sticky glass header with the page search field and "Cancel"; with a query, the filter chips (only for kinds that
 * have results, each with its count) and the results in blocks: medicines, doctors as a row of cards, tests and
 * imaging, then the rest of what GET /home/search returns. With no query: recent searches (kept on the phone)
 * and a "browse by section" grid. Only real data is drawn: a block, a price or a line is hidden when the backend
 * does not send it.
 */

const RECENT_KEY = '@nabdah_recent_searches';
const RECENT_MAX = 8;
const DEBOUNCE_MS = 500;

/** The board's "browse by section" grid: the service-map icon of each section and where it opens. */
const BROWSE: { label: string; service: ServiceName; route: string }[] = [
  { label: 'الصيدلية', service: 'pharmacy', route: '/(tabs)/pharmacy' },
  { label: 'استشارة', service: 'consult', route: '/(tabs)/consultations' },
  { label: 'تحاليل', service: 'lab', route: '/(tabs)/diagnostics' },
  { label: 'أشعة', service: 'radiology', route: '/(tabs)/diagnostics' },
  { label: 'تمريض', service: 'nursing', route: '/(tabs)/nursing' },
  { label: 'صحة نفسية', service: 'mind', route: '/mental-health' },
  { label: 'تغذية', service: 'nutrition', route: '/nutrition/hub' },
  { label: 'العائلة', service: 'family', route: '/family' },
];

/** The text of a result in the screen's language: Arabic in Arabic, the English field otherwise. */
const pick = (lang: string, ar?: string | null, en?: string | null): string => (lang === 'ar' ? ar ?? en : en ?? ar) ?? '';

/** A price worth showing: the backend sends "0" when it has none, and a made-up 0 is never drawn. */
const priceOf = (lang: string, r: SearchResult): string | null => {
  const p = pick(lang, r.price, r.priceEn);
  return p && Number(p) > 0 ? p : null;
};

/** The matched part of the text in the bold face (the board's yellow mark is not a token colour). */
function Highlight({ text, term, style }: { text: string; term: string; style: object }) {
  const at = term ? text.toLowerCase().indexOf(term.toLowerCase()) : -1;
  if (at < 0) return <Text style={style}>{text}</Text>;
  return (
    <Text style={style}>
      {text.slice(0, at)}
      <Text style={{ fontFamily: FONT.bold }}>{text.slice(at, at + term.length)}</Text>
      {text.slice(at + term.length)}
    </Text>
  );
}

function ResultRow({ r, term, last, size, onOpen }: { r: SearchResult; term: string; last: boolean; size: 'media' | 'bare' | 'chip'; onOpen: (r: SearchResult) => void }) {
  const { theme, t, c, lang, flow, tr } = useScreenUi();
  const { icon, tone } = iconFor(r.type);
  const name = pick(lang, r.name, r.nameEn);
  const sub = pick(lang, r.sub, r.subEn);
  const price = priceOf(lang, r);
  const priceLine = price ? (
    <Text style={{ ...scale(t, 'bodyStrong'), color: c.text.primary }}>
      {price} <Text style={{ ...scale(t, 'tag', 'regular') }}>{tr('ر.س')}</Text>
    </Text>
  ) : null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[name, sub, price ? `${price} ${tr('ر.س')}` : ''].filter(Boolean).join('. ')}
      onPress={() => onOpen(r)}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 12,
        minHeight: 64,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: c.border.subtle,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      {size === 'media' ? (
        // medicines: the board's 64 media tile with the bare glyph
        <View style={{ width: 64, height: 64, borderRadius: 16, backgroundColor: c.bg.media, alignItems: 'center', justifyContent: 'center' }}>
          <FIcon icon={icon} tone={tone} chip="none" size={38} theme={theme} />
        </View>
      ) : size === 'bare' ? (
        <View style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}>
          <FIcon icon={icon} tone={tone} chip="none" size={34} theme={theme} />
        </View>
      ) : (
        <FIcon icon={icon} tone={tone} size={48} theme={theme} />
      )}
      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
        {r.sponsored ? <StatusChip label={tr('إعلان')} tone="amber" theme={theme} /> : null}
        <Highlight text={name} term={term} style={{ ...scale(t, 'segment', 'medium'), color: c.text.primary, ...flow }} />
        {sub ? <Text numberOfLines={2} style={{ ...scale(t, 'label', 'regular'), color: c.text.secondary, ...flow }}>{sub}</Text> : null}
        {size === 'media' ? priceLine : null}
      </View>
      {size !== 'media' ? priceLine : null}
    </Pressable>
  );
}

/** A doctor of the board's horizontal row: the filled stethoscope on its tone (the search gives no photo), name, specialty. */
function DoctorCard({ r, term, onOpen }: { r: SearchResult; term: string; onOpen: (r: SearchResult) => void }) {
  const { theme, t, c, lang, flow, tr } = useScreenUi();
  const { icon, tone } = iconFor(r.type);
  const name = pick(lang, r.name, r.nameEn);
  const sub = pick(lang, r.sub, r.subEn);
  const price = priceOf(lang, r);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[name, sub, price ? `${price} ${tr('ر.س')}` : ''].filter(Boolean).join('. ')}
      onPress={() => onOpen(r)}
      style={({ pressed }) => ({ width: 252, opacity: pressed ? 0.7 : 1 })}
    >
      <Card elevation="flat" padding="none" theme={theme}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 }}>
          <FIcon icon={icon} tone={tone} size={64} theme={theme} />
          <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
            <Highlight text={name} term={term} style={{ ...scale(t, 'segment', 'bold'), color: c.text.primary, ...flow }} />
            {sub ? <Text numberOfLines={2} style={{ ...scale(t, 'label', 'regular'), color: c.text.secondary, ...flow }}>{sub}</Text> : null}
            {price ? <Text style={{ ...scale(t, 'label', 'medium'), color: c.text.primary }}>{`${price} ${tr('ر.س')}`}</Text> : null}
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

function Block({ block, term, filter, count, onOpen, onSeeAll }: { block: ResultBlock; term: string; filter: string; count: number; onOpen: (r: SearchResult) => void; onSeeAll: (key: string) => void }) {
  const { theme, tr } = useScreenUi();
  const { section, rows } = block;
  const all = filter === 'all';
  const shown = all ? rows.slice(0, section.preview) : rows;
  // "See all (n)" jumps to that kind's chip, whose count is the same n; blocks that mix two kinds never show it
  const seeAll = all && rows.length > shown.length ? FILTERS.find((f) => f.types && f.types.length === section.types.length && f.types.every((x) => section.types.includes(x))) : undefined;
  return (
    <View style={{ gap: 10 }}>
      <SectionHeader
        title={tr(section.title)}
        actionLabel={seeAll ? `${tr('الكل')} (${count})` : undefined}
        onActionPress={seeAll ? () => onSeeAll(seeAll.key) : undefined}
        theme={theme}
      />
      {section.layout === 'cards' ? (
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={shown}
          keyExtractor={(r, i) => `${r.type}-${r.id ?? i}`}
          renderItem={({ item }) => <DoctorCard r={item} term={term} onOpen={onOpen} />}
          contentContainerStyle={{ gap: 10 }}
          style={{ flexGrow: 0 }}
        />
      ) : (
        <Card elevation="flat" padding="none" theme={theme}>
          <View>
            {shown.map((r, i) => (
              <ResultRow
                key={`${r.type}-${r.id ?? i}`}
                r={r}
                term={term}
                last={i === shown.length - 1}
                size={section.key === 'meds' ? 'media' : section.key === 'tests' ? 'bare' : 'chip'}
                onOpen={onOpen}
              />
            ))}
          </View>
        </Card>
      )}
    </View>
  );
}

/** "Didn't find what you wanted? Upload the prescription": the board's dashed card, opening the real upload. */
function UploadCard() {
  const { theme, t, c, flow } = useScreenUi();
  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => router.push('/pharmacy/rx-order?via=photo' as Href)}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 22, borderWidth: 1, borderStyle: 'dashed', borderColor: c.border.strong }}
    >
      <FIcon icon="prescription" tone="ink" chip="none" size={24} theme={theme} />
      <LocalizedText style={{ flex: 1, ...scale(t, 'small', 'regular'), color: c.text.primary, ...flow }}>
        لم تجد ما تبحث عنه؟ ارفع الوصفة وتبحث الصيدليات عنه لك
      </LocalizedText>
      <LocalizedText style={{ ...scale(t, 'small', 'bold'), color: c.text.link }}>رفع الوصفة</LocalizedText>
    </Pressable>
  );
}

function ResultsSkeleton() {
  const { theme, c, tr } = useScreenUi();
  return (
    <View accessibilityLabel={tr('جاري التحميل...')} accessibilityState={{ busy: true }} style={{ gap: 10 }}>
      <Skeleton variant="title" width="half" theme={theme} />
      <View style={{ borderRadius: 24, backgroundColor: c.bg.surface, borderWidth: 1, borderColor: c.border.hairline }}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderBottomWidth: i === 2 ? 0 : 1, borderBottomColor: c.border.subtle }}>
            <Skeleton variant="circle" theme={theme} />
            <View style={{ flex: 1 }}>
              <Skeleton lines={2} theme={theme} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

/** With no query: recent searches, then the browse grid. */
function Discover({ recent, onPick, onClear }: { recent: string[]; onPick: (q: string) => void; onClear: () => void }) {
  const { theme, t, c, flow, tr } = useScreenUi();
  const rows: (typeof BROWSE)[] = [];
  for (let i = 0; i < BROWSE.length; i += 4) rows.push(BROWSE.slice(i, i + 4));
  return (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ ...COLUMN, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40, gap: 24 }}>
      {recent.length ? (
        <View style={{ gap: 6 }}>
          <SectionHeader title={tr('عمليات البحث الأخيرة')} actionLabel={tr('مسح')} onActionPress={onClear} theme={theme} />
          {recent.map((q) => (
            <Pressable
              key={q}
              accessibilityRole="button"
              accessibilityLabel={q}
              onPress={() => onPick(q)}
              style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12 }}
            >
              <Icon name="clock" size={18} theme={theme} color={c.text.secondary} />
              <Text numberOfLines={1} style={{ flex: 1, ...scale(t, 'body', 'regular'), color: c.text.primary, ...flow }}>{q}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      <View style={{ gap: 12 }}>
        <SectionHeader title={tr('تصفّح حسب القسم')} theme={theme} />
        <View style={{ gap: 14 }}>
          {rows.map((row, ri) => (
            <View key={ri} style={{ flexDirection: 'row', gap: 10 }}>
              {row.map((b) => {
                const { icon, tone } = SERVICE_ICONS[b.service];
                return (
                  <Pressable key={b.label} accessibilityRole="button" accessibilityLabel={tr(b.label)} onPress={() => router.push(b.route as Href)} style={{ flex: 1, minWidth: 0, alignItems: 'center', gap: 8 }}>
                    <View style={{ width: 72, height: 72, borderRadius: 22, backgroundColor: c.bg.surface, boxShadow: t.shadow.tile, alignItems: 'center', justifyContent: 'center' }}>
                      <FIcon icon={icon} tone={tone} chip="none" size={46} theme={theme} />
                    </View>
                    <LocalizedText numberOfLines={2} style={{ ...scale(t, 'label', 'medium'), color: c.text.primary, textAlign: 'center' }}>{b.label}</LocalizedText>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

function SearchScreen({ initialQuery }: { initialQuery: string }) {
  const { theme, t, c, dir, tr } = useScreenUi();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState(initialQuery);
  const [filter, setFilter] = useState('all');
  const [rows, setRows] = useState<SearchResult[]>([]);
  /** The term `rows` answer: results are only "none" once the term typed has been answered. */
  const [answered, setAnswered] = useState<string | null>(null);
  const [failed, setFailed] = useState<'error' | 'offline' | null>(null);
  const [recent, setRecent] = useState<string[]>([]);
  const [nonce, setNonce] = useState(0);
  const term = query.trim();

  // the user's real recent searches, kept on the phone
  useEffect(() => {
    AsyncStorage.getItem(RECENT_KEY)
      .then((raw) => {
        if (raw) setRecent(JSON.parse(raw) as string[]);
      })
      .catch(() => {});
  }, []);

  const saveRecent = useCallback((value: string) => {
    if (value.length < 2) return;
    setRecent((prev) => {
      const next = [value, ...prev.filter((x) => x !== value)].slice(0, RECENT_MAX);
      AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const clearRecent = () => {
    setRecent([]);
    AsyncStorage.removeItem(RECENT_KEY).catch(() => {});
  };

  // debounced search; an answer for a term that is no longer typed is dropped
  useEffect(() => {
    setFailed(null);
    if (!term) {
      setRows([]);
      setAnswered(null);
      return;
    }
    let stale = false;
    const timer = setTimeout(() => {
      apiFetch<SearchResult[] | { data?: SearchResult[] }>(`/home/search?q=${encodeURIComponent(term)}`)
        .then((res) => {
          if (stale) return;
          setRows(Array.isArray(res) ? res : res?.data ?? []);
          setAnswered(term);
          saveRecent(term);
        })
        .catch(async (e: unknown) => {
          logError('search', e);
          const offline = await isOffline();
          if (!stale) setFailed(offline ? 'offline' : 'error');
        });
    }, DEBOUNCE_MS);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [term, nonce, saveRecent]);

  const counts = useMemo(() => countByFilter(rows), [rows]);
  // a chip whose kind is gone from the new results falls back to "All"
  useEffect(() => {
    if (filter !== 'all' && !counts[filter]) setFilter('all');
  }, [counts, filter]);
  const blocks = useMemo(() => blocksFor(rows, filter), [rows, filter]);
  const chips = FILTERS.filter((f) => f.key === 'all' || counts[f.key] > 0);

  const open = (r: SearchResult) => {
    const target = routeFor(r);
    if (target) router.push(target as Href);
  };
  const leave = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)' as Href);
  };

  const startInset = dir === 'rtl' ? insets.right : insets.left;
  const endInset = dir === 'rtl' ? insets.left : insets.right;
  const header = (
    <View style={{ paddingTop: insets.top + 7, paddingBottom: 10, gap: 12, backgroundColor: tint(c.bg.canvas, 0.86), zIndex: t.z.appBar }}>
      <View style={{ ...COLUMN, paddingStart: 16 + startInset, paddingEnd: 16 + endInset, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Search
            variant="page"
            value={query}
            onChange={setQuery}
            placeholder={tr('ابحث عن دواء، طبيب، تحليل…')}
            label={tr('بحث')}
            onClear={() => setQuery('')}
            clearLabel={tr('مسح')}
            onScanPress={() => router.push('/pharmacy/barcode-scanner' as Href)}
            scanLabel={tr('ماسح الأدوية')}
            testID="search-field"
            theme={theme}
          />
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={tr('إلغاء')} onPress={leave} hitSlop={8} style={{ minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' }}>
          <LocalizedText style={{ ...scale(t, 'body', 'regular'), color: c.text.primary }}>إلغاء</LocalizedText>
        </Pressable>
      </View>
      {term && answered === term && rows.length && !failed ? (
        <View style={COLUMN}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 8, paddingStart: 16 + startInset, paddingEnd: 16 + endInset }}>
            {chips.map((f) => (
              <Chip key={f.key} label={tr(f.label)} count={counts[f.key]} selected={filter === f.key} onPress={() => setFilter(f.key)} theme={theme} />
            ))}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );

  const centred = { ...COLUMN, flexGrow: 1, justifyContent: 'center', paddingHorizontal: 16, paddingBottom: 40 } as const;
  let body: React.ReactNode;
  if (!term) {
    body = <Discover recent={recent} onPick={setQuery} onClear={clearRecent} />;
  } else if (failed === 'offline') {
    body = (
      <ScrollView contentContainerStyle={centred}>
        <OfflineState title={tr('لا يوجد اتصال بالإنترنت')} body={tr('اتصل بالشبكة ثم حاول مرة أخرى.')} retryLabel={tr('إعادة المحاولة')} onRetry={() => setNonce((n) => n + 1)} theme={theme} />
      </ScrollView>
    );
  } else if (failed === 'error') {
    body = (
      <ScrollView contentContainerStyle={centred}>
        <ErrorState title={tr('تعذر تنفيذ البحث')} body={tr('تحقق من اتصالك ثم حاول مرة أخرى.')} retryLabel={tr('إعادة المحاولة')} onRetry={() => setNonce((n) => n + 1)} theme={theme} />
      </ScrollView>
    );
  } else if (answered !== term) {
    body = (
      <ScrollView contentContainerStyle={{ ...COLUMN, paddingHorizontal: 16, paddingTop: 12 }}>
        <ResultsSkeleton />
      </ScrollView>
    );
  } else if (!rows.length) {
    body = (
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ ...COLUMN, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40, gap: 22 }}>
        <EmptyState icon="magnifying-glass" tone="blue" title={tr('لا توجد نتائج')} body={tr('جرّب كلمة أخرى أو تحقق من الإملاء.')} theme={theme} />
        <UploadCard />
      </ScrollView>
    );
  } else {
    body = (
      <FlatList
        style={{ flex: 1 }}
        data={blocks}
        keyExtractor={(b) => b.section.key}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ ...COLUMN, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40, gap: 22 }}
        renderItem={({ item }) => (
          <Block
            block={item}
            term={term}
            filter={filter}
            count={item.rows.length}
            onOpen={open}
            onSeeAll={setFilter}
          />
        )}
        ListFooterComponent={<UploadCard />}
      />
    );
  }

  return (
    <Screen theme={theme} direction={dir} header={header} keyboard testID="search-screen">
      {body}
    </Screen>
  );
}

// Route guard (Phase 2.8 global search): ?view=pharmacy and ?view=doctors open their own search views.
export default function SearchRoute() {
  const params = useLocalSearchParams<{ view?: string; q?: string }>();
  if (params?.view === 'pharmacy') return <PharmacyProductSearchView />;
  if (params?.view === 'doctors') return <DoctorSearchView />;
  return <SearchScreen initialQuery={typeof params?.q === 'string' ? params.q : ''} />;
}
