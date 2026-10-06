// @ts-nocheck
// app/pharmacy/wishlist-share.tsx — P22.2 shareable wishlist (open link, no data leak).
// Owner side: create/list/revoke shares. Recipient side: resolve a token and
// render ONLY the public snapshot fields (sanitized by wishlist-share.ts).
import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/context/AppContext';
import { AppText, Card, Button } from '../../src/components/ui';
import { ScreenState } from '../../src/components/ScreenStates';
import { showLocalizedAlert } from '../../src/components/LocalizedAlert';
import { apiFetch } from '../../src/utils/api';
import {
  buildShareIds,
  resolveWishlistShare,
  sanitizeSharedItems,
  type SharedWishlistItem,
  type WishlistShare,
} from '../../src/utils/p22/wishlist-share';

export default function WishlistShareScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useApp();
  const params = useLocalSearchParams<{ token?: string }>();
  const openToken = Array.isArray(params.token) ? params.token[0] : params.token;

  const [shares, setShares] = useState<Array<{ token: string; items_count: number; created_at: string | Date }>>([]);
  const [itemIds, setItemIds] = useState('');
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(!openToken);
  const [error, setError] = useState<string | null>(null);

  // Recipient view state (public resolve, no auth assumed).
  const [shared, setShared] = useState<WishlistShare | null>(null);
  const [resolving, setResolving] = useState(!!openToken);

  const loadMine = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res: any = await apiFetch('/wishlist/shares');
      setShares(Array.isArray(res) ? res : res?.data || []);
    } catch (e: any) {
      setError(e?.message || 'تعذر تحميل روابط المشاركة');
    } finally {
      setLoading(false);
    }
  }, []);

  const resolve = useCallback(async (token: string) => {
    setResolving(true);
    setError(null);
    try {
      const res: any = await apiFetch(`/wishlist/shared/${token}`);
      const obj = res?.data ?? res;
      setShared({ token: String(obj.token), items: sanitizeSharedItems(obj.items), created_at: obj.created_at });
    } catch (e: any) {
      setError(e?.message || 'تعذر فتح رابط المشاركة');
    } finally {
      setResolving(false);
    }
  }, []);

  useEffect(() => {
    if (openToken) void resolve(openToken);
    else void loadMine();
  }, [openToken, resolve, loadMine]);

  async function create() {
    let ids: string[];
    try {
      ids = buildShareIds(itemIds.split(/[,\s]+/));
    } catch {
      showLocalizedAlert('تحقق من البيانات', 'أدخل معرّف منتج واحد على الأقل (بحد أقصى 50).');
      return;
    }
    setCreating(true);
    try {
      const res: any = await apiFetch('/wishlist/share', {
        method: 'POST',
        headers: { 'Idempotency-Key': `wl-share-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}` },
        body: JSON.stringify({ item_ids: ids }),
      });
      const obj = res?.data ?? res;
      showLocalizedAlert('تم إنشاء الرابط', `رمز المشاركة: ${String(obj.token)}`);
      setItemIds('');
      await loadMine();
    } catch (e: any) {
      showLocalizedAlert('تعذر إنشاء الرابط', e?.message || 'حاول مرة أخرى لاحقاً.');
    } finally {
      setCreating(false);
    }
  }

  async function revoke(token: string) {
    try {
      await apiFetch(`/wishlist/shares/${token}`, { method: 'DELETE' });
      await loadMine();
    } catch (e: any) {
      showLocalizedAlert('تعذر إلغاء المشاركة', e?.message || 'حاول مرة أخرى لاحقاً.');
    }
  }

  const renderItem = (item: SharedWishlistItem) => (
    <Card key={item.id} style={{ padding: 12 }}>
      <AppText variant="labelMD">{item.name_ar || item.name_en || item.id}</AppText>
      <AppText variant="caption" color={colors.textTertiary}>
        {Number(item.price || 0).toFixed(2)} ر.س
      </AppText>
    </Card>
  );

  return (
    <View style={[st.c, { backgroundColor: colors.background }]}>
      <View style={[st.hdr, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={st.hBtn}>
          <AppText variant="bodySM">رجوع</AppText>
        </TouchableOpacity>
        <AppText variant="h4">{openToken ? 'قائمة مشتركة' : 'مشاركة قائمة الأمنيات'}</AppText>
        <View style={{ width: 60 }} />
      </View>
      <ScreenState loading={loading || resolving} error={error} empty={false} emptyTitle="" onRetry={() => (openToken ? resolve(openToken) : loadMine())}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 100 }}>
          {openToken ? (
            <>
              <AppText variant="caption" color={colors.textTertiary} align="center">
                تعرض هذه الصفحة المنتجات المشتركة فقط — لا تظهر أي بيانات عن صاحب القائمة.
              </AppText>
              {(shared?.items || []).map(renderItem)}
            </>
          ) : (
            <>
              <Card style={{ padding: 14, gap: 10 }}>
                <AppText variant="labelMD">رابط مشاركة جديد</AppText>
                <TextInput
                  value={itemIds}
                  onChangeText={setItemIds}
                  placeholder="معرّفات المنتجات مفصولة بفواصل"
                  placeholderTextColor={colors.textTertiary}
                  style={[st.input, { color: colors.textPrimary, borderColor: colors.border }]}
                />
                <Button label="إنشاء رابط مشاركة" onPress={create} loading={creating} disabled={creating} />
              </Card>
              {shares.map((s) => (
                <Card key={s.token} style={{ padding: 14, gap: 8 }}>
                  <AppText variant="labelMD">{s.items_count} منتجات</AppText>
                  <AppText variant="caption" color={colors.textTertiary}>
                    الرمز: {s.token}
                  </AppText>
                  <View style={{ flexDirection: 'row-reverse', gap: 10 }}>
                    <Button label="فتح" size="sm" full={false} onPress={() => router.push({ pathname: '/pharmacy/wishlist-share', params: { token: s.token } })} />
                    <Button label="إلغاء المشاركة" variant="outline" size="sm" full={false} onPress={() => void revoke(s.token)} />
                  </View>
                  <TouchableOpacity
                    accessibilityRole="button"
                    onPress={() => void resolveWishlistShare(apiFetch, s.token).then((r) => setShared(r))}
                  >
                    <AppText variant="caption" color={colors.primary}>
                      معاينة (تتحقق من عدم تسرب البيانات)
                    </AppText>
                  </TouchableOpacity>
                </Card>
              ))}
              {shared ? (
                <>
                  <AppText variant="labelMD" align="center">
                    معاينة
                  </AppText>
                  {shared.items.map(renderItem)}
                </>
              ) : null}
            </>
          )}
        </ScrollView>
      </ScreenState>
    </View>
  );
}

const st = StyleSheet.create({
  c: { flex: 1 },
  hdr: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  hBtn: { minWidth: 60 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, textAlign: 'right' },
});
