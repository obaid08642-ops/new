/**
 * My services and prices (lab, radiology, nursing): the approved catalogue with this provider's own options per service —
 * offered or not, where, insurance accepted, price. One list, one sheet, saved at once (PUT /provider/services/:vertical/:serviceId).
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, Switch, RefreshControl } from 'react-native';
import { useTheme, useLang, useToast } from '../../context';
import client from '../../api/client';
import { NBtn, NCard, NHeader, NSheet, NSearch, NToggle, NBadge, NEmpty, NPriceInput } from '../../components/ui';
import { SP, R, FS, FW } from '../../constants';
import {
  type Vertical, type Where, type ServiceOfferRow, type OfferDraft,
  buildBody, draftError, draftFromRow, matchesSearch, shownPrice, whereOptions,
} from './myServicesLogic';

const WHERE_LABEL: Record<Where, { ar: string; en: string }> = {
  premises: { ar: 'في المنشأة', en: 'At our premises' },
  home: { ar: 'عند المريض', en: 'At the patient’s home' },
  both: { ar: 'الاثنان', en: 'Both' },
};

const TITLE: Record<Vertical, { ar: string; en: string; empty_ar: string; empty_en: string }> = {
  lab: { ar: 'التحاليل والأسعار', en: 'Tests & prices', empty_ar: 'لا توجد تحاليل في الكتالوج', empty_en: 'No tests in the catalogue' },
  radiology: { ar: 'الفحوصات والأسعار', en: 'Scans & prices', empty_ar: 'لا توجد فحوصات في الكتالوج', empty_en: 'No scans in the catalogue' },
  nursing: { ar: 'الخدمات والأسعار', en: 'Services & prices', empty_ar: 'لا توجد خدمات في الكتالوج', empty_en: 'No services in the catalogue' },
};

export function MyServicesScreen({ vertical, onBack, footer }: { vertical: Vertical; onBack?: () => void; footer?: React.ReactNode }) {
  const { theme } = useTheme();
  const { lang, t: tt } = useLang();
  const { show } = useToast();
  const AR = lang === 'ar';
  const dir = AR ? 'row-reverse' : 'row';

  const [rows, setRows] = useState<ServiceOfferRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [onlyOffered, setOnlyOffered] = useState(false);
  const [editing, setEditing] = useState<ServiceOfferRow | null>(null);
  const [draft, setDraft] = useState<OfferDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [showErr, setShowErr] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await client.get(`/provider/services/${vertical}`);
      setRows(Array.isArray(res.data) ? res.data : []);
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [vertical]);
  useEffect(() => { load(); }, [load]);

  const visible = useMemo(() => rows.filter((r) => matchesSearch(r, search) && (!onlyOffered || r.offered)), [rows, search, onlyOffered]);
  const offeredCount = useMemo(() => rows.filter((r) => r.offered).length, [rows]);

  const openEdit = (row: ServiceOfferRow, offered?: boolean) => {
    setEditing(row);
    setDraft({ ...draftFromRow(vertical, row), offered: offered ?? row.offered });
    setShowErr(false);
  };

  const put = async (row: ServiceOfferRow, d: OfferDraft): Promise<boolean> => {
    setSaving(true);
    try {
      const res = await client.put(`/provider/services/${vertical}/${row.service_id}`, buildBody(vertical, row, d));
      const next: ServiceOfferRow = res.data;
      setRows((prev) => prev.map((r) => (r.service_id === row.service_id ? next : r)));
      return true;
    } catch (e: any) {
      show(e?.response?.data?.message === 'service_not_found' ? (tt('sxp.6adb2c98')) : (tt('sxp.8e645b48')), 'error');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const save = async () => {
    if (!editing || !draft) return;
    if (draftError(draft)) { setShowErr(true); return; }
    if (await put(editing, draft)) {
      show(tt('sxp.b5437442'), 'success');
      setEditing(null);
    }
  };

  // The row switch: off is one tap; on needs a price, so it opens the sheet with the switch already on.
  const onRowSwitch = async (row: ServiceOfferRow, on: boolean) => {
    if (on) { openEdit(row, true); return; }
    if (await put(row, { ...draftFromRow(vertical, row), offered: false })) show(tt('sxp.f493dd38'), 'success');
  };

  const nameOf = (r: ServiceOfferRow) => (AR ? (r.name_ar || r.name_en) : (r.name_en || r.name_ar)) || r.code;
  const t = TITLE[vertical];
  const options = editing ? whereOptions(vertical, editing) : [];

  const renderRow = ({ item }: { item: ServiceOfferRow }) => {
    const price = shownPrice(item);
    return (
      <NCard style={{ marginBottom: SP.md }} onPress={() => openEdit(item)}>
        <View style={{ flexDirection: dir, alignItems: 'center', gap: SP.md }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>{nameOf(item)}</Text>
            <View style={{ flexDirection: dir, alignItems: 'center', gap: SP.sm, marginTop: SP.xs, flexWrap: 'wrap' }}>
              <Text style={{ fontSize: FS.sm, color: item.offered ? theme.primary : theme.textSub }}>
                {price != null ? `${price} ${tt('sxp.91d5796f')}` : (tt('sxp.9bf1955b'))}
              </Text>
              {item.offered && item.where ? <NBadge label={AR ? WHERE_LABEL[item.where].ar : WHERE_LABEL[item.where].en} variant="info" size="xs" /> : null}
              {item.offered && item.insurance ? <NBadge label={tt('sxp.150549c6')} variant="success" size="xs" /> : null}
            </View>
          </View>
          <Switch value={item.offered} disabled={saving} onValueChange={(v) => onRowSwitch(item, v)}
            accessibilityLabel={`${nameOf(item)}: ${tt('sxp.b872e025')}`}
            trackColor={{ false: theme.border, true: theme.primary }} />
        </View>
      </NCard>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? t.ar : t.en} sub={rows.length ? (AR ? `${offeredCount} من ${rows.length} مُقدَّمة` : `${offeredCount} of ${rows.length} offered`) : undefined} onBack={onBack} />
      {loading ? <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: SP.xxl }} /> : failed && rows.length === 0 ? (
        <NEmpty icon="grid" title={tt('sxp.66b56683')} actionLabel={tt('sxp.96cbdad3')} onAction={() => { setLoading(true); load(); }} />
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(r) => r.service_id}
          renderItem={renderRow}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
          contentContainerStyle={{ padding: SP.lg, paddingBottom: 100 }}
          ListHeaderComponent={(
            <View style={{ marginBottom: SP.md }}>
              <NSearch value={search} onChange={setSearch} placeholder={tt('sxp.83c63445')} />
              <NToggle label={tt('sxp.f7218a84')} value={onlyOffered} onChange={setOnlyOffered} />
            </View>
          )}
          ListEmptyComponent={<NEmpty icon="grid" title={rows.length === 0 ? (AR ? t.empty_ar : t.empty_en) : (tt('sxp.593a626c'))} />}
          ListFooterComponent={footer ? <View style={{ marginTop: SP.lg }}>{footer}</View> : null}
        />
      )}

      <NSheet visible={!!editing} onClose={() => setEditing(null)} title={editing ? nameOf(editing) : ''}>
        {editing && draft ? (
          <View>
            {editing.catalogue_price != null ? (
              <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: AR ? 'right' : 'left', marginBottom: SP.md }}>
                {AR ? `سعر الكتالوج: ${editing.catalogue_price} ر.س` : `Catalogue price: ${editing.catalogue_price} SAR`}
              </Text>
            ) : null}
            <NToggle label={tt('sxp.41bae7ac')} value={draft.offered} onChange={(v) => setDraft({ ...draft, offered: v })} />
            {draft.offered ? (
              <View>
                <NPriceInput label={tt('sxp.5dc5398d')} value={draft.price} onChange={(v) => setDraft({ ...draft, price: v })}
                  error={showErr && draftError(draft) ? (tt('sxp.b0595d27')) : undefined} />
                {options.length > 1 ? (
                  <View style={{ marginVertical: SP.md }}>
                    <Text style={{ fontSize: FS.sm, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left', marginBottom: SP.sm }}>{tt('sxp.cbf2a784')}</Text>
                    <View style={{ flexDirection: dir, gap: SP.sm, flexWrap: 'wrap' }}>
                      {options.map((w) => {
                        const on = draft.where === w;
                        return (
                          <TouchableOpacity key={w} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => setDraft({ ...draft, where: w })}
                            style={{ paddingHorizontal: SP.md, paddingVertical: SP.sm, borderRadius: R.md, borderWidth: 1, borderColor: on ? theme.primary : theme.border, backgroundColor: on ? theme.primary : theme.surface }}>
                            <Text style={{ fontSize: FS.sm, color: on ? theme.surface : theme.text }}>{AR ? WHERE_LABEL[w].ar : WHERE_LABEL[w].en}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                ) : null}
                <NToggle label={tt('sxp.da097004')} value={draft.insurance} onChange={(v) => setDraft({ ...draft, insurance: v })} />
              </View>
            ) : null}
            <NBtn label={tt('sxp.0360038b')} onPress={save} loading={saving} style={{ marginTop: SP.xl }} />
          </View>
        ) : null}
      </NSheet>
    </View>
  );
}
