import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Share, Text, View } from 'react-native';
import { useTheme, useLang, useToast } from '../../../context';
import client from '../../../api/client';
import { NBtn, NCard, NHeader, NScroll } from '../../../components/ui';
import { SP, FS, FW } from '../../../constants';
import { buildWebsiteBadgeSnippet, parseWebsiteBadge, WEBSITE_BADGE_REASON_TEXT, type WebsiteBadge } from '../../../utils/websiteBadge';

/**
 * d2b9874 / R17: provider-dashboard "Website badge" tab. Shows the copy-paste
 * HTML badge (linking to the provider's public Nabd Plus page) only when the
 * backend confirms the provider is verified; otherwise explains why not.
 */
export function WebsiteBadgeScreen({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const { show } = useToast();
  const AR = lang === 'ar';
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [badge, setBadge] = useState<WebsiteBadge | null>(null);

  const load = useCallback(() => {
    setStatus('loading');
    client.get('/provider/website-badge')
      .then((res) => {
        const parsed = parseWebsiteBadge(res.data);
        setBadge(parsed);
        setStatus(parsed ? 'ready' : 'error');
      })
      .catch(() => { setBadge(null); setStatus('error'); });
  }, []);

  useEffect(() => { load(); }, [load]);

  const snippet = badge ? buildWebsiteBadgeSnippet(badge, AR ? 'ar' : 'en') : null;
  const align = AR ? 'right' : 'left';

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NScroll>
        <NHeader title={AR ? 'شارة الموقع' : 'Website badge'} onBack={onBack} />
        <View style={{ padding: SP.xl, gap: SP.xl }}>
          {status === 'loading' ? <ActivityIndicator color={theme.primary} /> : null}
          {status === 'error' ? (
            <NCard>
              <Text accessibilityRole="alert" style={{ color: theme.danger, fontSize: FS.sm, textAlign: align }}>
                {AR ? 'تعذر تحميل بيانات الشارة.' : 'Could not load your badge.'}
              </Text>
              <NBtn label={AR ? 'إعادة المحاولة' : 'Retry'} variant="outline" onPress={load} style={{ marginTop: SP.md }} />
            </NCard>
          ) : null}
          {status === 'ready' && badge && !snippet ? (
            <NCard>
              <Text style={{ color: theme.text, fontSize: FS.md, fontWeight: FW.bold, textAlign: align, marginBottom: SP.sm }}>
                {AR ? 'الشارة متاحة للمزودين الموثقين فقط' : 'The badge is for verified providers only'}
              </Text>
              {badge.reasons.map((reason) => (
                <Text key={reason} style={{ color: theme.textSub, fontSize: FS.sm, textAlign: align, marginTop: SP.xs }}>
                  {AR ? WEBSITE_BADGE_REASON_TEXT[reason].ar : WEBSITE_BADGE_REASON_TEXT[reason].en}
                </Text>
              ))}
            </NCard>
          ) : null}
          {status === 'ready' && badge && snippet ? (
            <NCard>
              <Text style={{ color: theme.text, fontSize: FS.md, fontWeight: FW.bold, textAlign: align }}>
                {AR ? 'ضع هذا الكود في موقعك' : 'Paste this code on your website'}
              </Text>
              <Text style={{ color: theme.textSub, fontSize: FS.sm, textAlign: align, marginTop: SP.xs }}>
                {AR ? 'يربط الزوار بصفحتك العامة على نبض بلس:' : 'It links visitors to your public Nabd Plus page:'} {badge.profile_url}
              </Text>
              <Text selectable testID="website-badge-snippet" style={{ marginTop: SP.md, padding: SP.md, borderRadius: 8, backgroundColor: theme.surface2, color: theme.text, fontSize: FS.xs }}>
                {snippet}
              </Text>
              <NBtn
                label={AR ? 'مشاركة الكود' : 'Share code'}
                onPress={async () => {
                  try { await Share.share({ message: snippet }); } catch { show(AR ? 'تعذرت المشاركة' : 'Could not share', 'error'); }
                }}
                style={{ marginTop: SP.md }}
              />
            </NCard>
          ) : null}
        </View>
      </NScroll>
    </View>
  );
}
