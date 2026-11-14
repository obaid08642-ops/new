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
  const { lang } = useLang();
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
      show(e?.response?.data?.message === 'service_not_found' ? (AR ? 'الخدمة لم تعد في الكتالوج' : 'This service is no longer in the catalogue') : (AR ? 'تعذر الحفظ، حاول مرة أخرى' : 'Could not save, try again'), 'error');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const save = async () => {
    if (!editing || !draft) return;
    if (draftError(draft)) { setShowErr(true); return; }
    if (await put(editing, draft)) {
      show(AR ? 'تم الحفظ' : 'Saved', 'success');
      setEditing(null);
    }
  };

  // The row switch: off is one tap; on needs a price, so it opens the sheet with the switch already on.
  const onRowSwitch = async (row: ServiceOfferRow, on: boolean) => {
    if (on) { openEdit(row, true); return; }
    if (await put(row, { ...draftFromRow(vertical, row), offered: false })) show(AR ? 'تم إيقاف الخدمة' : 'Service switched off', 'success');
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
                {price != null ? `${price} ${AR ? 'ر.س' : 'SAR'}` : (AR ? 'بلا سعر' : 'No price')}
              </Text>
              {item.offered && item.where ? <NBadge label={AR ? WHERE_LABEL[item.where].ar : WHERE_LABEL[item.where].en} variant="info" size="xs" /> : null}
              {item.offered && item.insurance ? <NBadge label={AR ? 'تأمين' : 'Insurance'} variant="success" size="xs" /> : null}
            </View>
          </View>
          <Switch value={item.offered} disabled={saving} onValueChange={(v) => onRowSwitch(item, v)}
            accessibilityLabel={`${nameOf(item)}: ${AR ? 'تقديم الخدمة' : 'offer this service'}`}
            trackColor={{ false: theme.border, true: theme.primary }} />
        </View>
      </NCard>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? t.ar : t.en} sub={rows.length ? (AR ? `${offeredCount} من ${rows.length} مُقدَّمة` : `${offeredCount} of ${rows.length} offered`) : undefined} onBack={onBack} />
      {loading ? <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: SP.xxl }} /> : failed && rows.length === 0 ? (
        <NEmpty icon="grid" title={AR ? 'تعذر تحميل الخدمات' : 'Could not load the services'} actionLabel={AR ? 'إعادة المحاولة' : 'Try again'} onAction={() => { setLoading(true); load(); }} />
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(r) => r.service_id}
          renderItem={renderRow}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
          contentContainerStyle={{ padding: SP.lg, paddingBottom: 100 }}
          ListHeaderComponent={(
            <View style={{ marginBottom: SP.md }}>
              <NSearch value={search} onChange={setSearch} placeholder={AR ? 'ابحث بالاسم أو الرمز' : 'Search by name or code'} />
              <NToggle label={AR ? 'المُقدَّمة فقط' : 'Offered only'} value={onlyOffered} onChange={setOnlyOffered} />
            </View>
          )}
          ListEmptyComponent={<NEmpty icon="grid" title={rows.length === 0 ? (AR ? t.empty_ar : t.empty_en) : (AR ? 'لا نتائج' : 'No results')} />}
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
            <NToggle label={AR ? 'أقدّم هذه الخدمة' : 'I offer this service'} value={draft.offered} onChange={(v) => setDraft({ ...draft, offered: v })} />
            {draft.offered ? (
              <View>
                <NPriceInput label={AR ? 'سعرك (ر.س)' : 'Your price (SAR)'} value={draft.price} onChange={(v) => setDraft({ ...draft, price: v })}
                  error={showErr && draftError(draft) ? (AR ? 'أدخل سعراً أكبر من صفر' : 'Enter a price above zero') : undefined} />
                {options.length > 1 ? (
                  <View style={{ marginVertical: SP.md }}>
                    <Text style={{ fontSize: FS.sm, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left', marginBottom: SP.sm }}>{AR ? 'مكان التنفيذ' : 'Where it is done'}</Text>
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
                <NToggle label={AR ? 'أقبل التأمين' : 'I accept insurance'} value={draft.insurance} onChange={(v) => setDraft({ ...draft, insurance: v })} />
              </View>
            ) : null}
            <NBtn label={AR ? 'حفظ' : 'Save'} onPress={save} loading={saving} style={{ marginTop: SP.xl }} />
          </View>
        ) : null}
      </NSheet>
    </View>
  );
}
