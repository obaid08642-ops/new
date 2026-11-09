import React, { useCallback, useEffect, useState } from 'react';
import { setStringAsync } from 'expo-clipboard';
import { Pressable, Share, Text, TextInput, View } from 'react-native';

import { Button } from '../../../../packages/ui-native/src';
import { createShareLink, listShareLinks, revokeShareLink } from '../../billing/receiptLinks';
import type { ReceiptKind, ShareLinkRow } from '../../utils/receipt';
import { useConsultFormat } from '../consult/ConsultKit';
import { step as scale, useScreenUi } from '../screen/ScreenKit';

const DAYS = [1, 7, 30] as const;

/**
 * "Share link": makes a read-only link to this receipt (the token is shown once), copies or shares it, shows when it expires,
 * and lists the links already made with their views, each revocable. Same behaviour as patient-web/components-next/receipt/receipt-links.
 */
export function ReceiptLinks({ kind, bookingId }: { kind: ReceiptKind; bookingId: string }) {
  const { k, t, c, theme, flow, lang, num } = useScreenUi();
  const fmt = useConsultFormat();
  const [days, setDays] = useState<number>(7);
  const [links, setLinks] = useState<ShareLinkRow[]>([]);
  const [fresh, setFresh] = useState<{ url: string; expiresAt: string | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const rows = await listShareLinks(kind, bookingId);
    if (rows) setLinks(rows);
  }, [kind, bookingId]);
  useEffect(() => { void load(); }, [load]);

  const create = async () => {
    if (busy) return;
    setBusy(true); setError(null); setCopied(false);
    const made = await createShareLink({ kind, bookingId, days, lang });
    setBusy(false);
    if (!made.ok) { setError(made.reason === 'limit' ? k('receipt.linkLimit') : k('receipt.linkFailed')); return; }
    setFresh({ url: made.url, expiresAt: made.expiresAt });
    await load();
  };
  const revoke = async (id: string) => {
    setError(null);
    if (!(await revokeShareLink(kind, bookingId, id))) { setError(k('receipt.linkRevokeFailed')); return; }
    await load();
  };
  const copy = async (url: string) => {
    try {
      await setStringAsync(url);
      setCopied(true);
    } catch {
      setError(k('receipt.linkFailed'));
    }
  };
  const status = { active: k('receipt.linkStatusActive'), expired: k('receipt.linkStatusExpired'), revoked: k('receipt.linkStatusRevoked') } as const;
  const hint = { ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow };
  const expires = (iso: string | null) => (iso ? k('receipt.linkExpires', { date: fmt.date(iso) ?? '' }) : '');

  return (
    <View testID="receipt-links" accessibilityLabel={k('receipt.shareLink')} style={{ width: '100%', maxWidth: 352, gap: 10, padding: 16, borderRadius: 20, backgroundColor: c.bg.surface, borderWidth: 1, borderColor: c.border.hairline }}>
      <Text style={{ ...scale(t, 'bodyStrong', 'bold'), color: c.text.primary, ...flow }}>{k('receipt.linkTitle')}</Text>
      <Text style={hint}>{k('receipt.linkBody')}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <Text style={hint}>{k('receipt.linkDays')}</Text>
        {DAYS.map((n) => (
          <Pressable key={n} accessibilityRole="button" accessibilityState={{ selected: days === n }} onPress={() => setDays(n)} style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, borderWidth: 1, borderColor: days === n ? c.action.primary.bg : c.border.strong, backgroundColor: days === n ? c.action.primary.bg : 'transparent' }}>
            <Text style={{ ...scale(t, 'meta', 'bold'), color: days === n ? c.action.primary.fg : c.text.primary }}>{num(n)}</Text>
          </Pressable>
        ))}
      </View>
      <Button theme={theme} label={k('receipt.linkCreate')} variant="outline" onPress={() => void create()} loading={busy} testID="receipt-link-create" />
      {error ? <Text accessibilityRole="alert" style={{ ...scale(t, 'meta', 'regular'), color: c.status.danger.fg, ...flow }}>{error}</Text> : null}
      {fresh ? (
        <View style={{ gap: 8 }} accessibilityLiveRegion="polite">
          <TextInput editable={false} selectTextOnFocus value={fresh.url} accessibilityLabel={k('receipt.shareLink')} style={{ ...scale(t, 'meta', 'regular'), color: c.text.primary, borderWidth: 1, borderColor: c.border.strong, borderRadius: 12, padding: 10, writingDirection: 'ltr', textAlign: 'left' }} />
          <Text style={hint}>{k('receipt.linkOnce')} {expires(fresh.expiresAt)}</Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <Button theme={theme} label={copied ? k('receipt.linkCopied') : k('receipt.linkCopy')} onPress={() => void copy(fresh.url)} testID="receipt-link-copy" />
            <Button theme={theme} label={k('receipt.share')} variant="outline" onPress={() => { Share.share({ message: fresh.url, url: fresh.url }).catch(() => undefined); }} testID="receipt-link-share" />
          </View>
        </View>
      ) : null}
      {links.length === 0 ? <Text style={hint}>{k('receipt.linkNone')}</Text> : links.map((link) => (
        <View key={link.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: c.border.hairline }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.primary, ...flow }}>{status[link.status]}{link.expiresAt ? ` · ${expires(link.expiresAt)}` : ''}</Text>
            <Text style={hint}>{k('receipt.linkViews', { n: num(link.viewCount) })}</Text>
          </View>
          {link.status === 'active' ? <Button theme={theme} label={k('receipt.linkRevoke')} variant="outline" size="sm" onPress={() => void revoke(link.id)} testID={`receipt-link-revoke-${link.id}`} /> : null}
        </View>
      ))}
    </View>
  );
}
