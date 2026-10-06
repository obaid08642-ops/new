import React, { useEffect, useState } from 'react';
import { Linking, Pressable, View } from 'react-native';
import { router, type Href } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Button, Card, FIcon, Screen, SERVICE_ICONS, StatusChip, StickyFooter, type FillIconName, type ServiceTone } from '../../../packages/ui-native/src';
import { AuthBody, AuthFooter, AuthTitle, AuthTopBar, useAuthUi } from '../../src/components/auth/AuthKit';
import { LocalizedText } from '../../src/components/LocalizedText';
import { step as scale } from '../../src/components/screen/ScreenKit';
import { STORAGE_KEYS } from '../../src/constants';
import { BELL } from '../../src/utils/notificationsFeed';
import { permissions, type PermissionKey, type PermissionStatus } from '../../src/services/PermissionsManager';

/**
 * Onboarding, permissions — the sign-in kit's look; each permission is a card row (its filled icon on a soft tone,
 * the name, what it is for, and "Allow"). "Allow" asks the phone's own permission dialog through PermissionsManager
 * (the one place that talks to the OS); the row then shows the answer: "Allowed", or "Open settings" when the phone
 * has refused (the dialog cannot be shown a second time). The row's state is read from the phone when the screen
 * opens, so a permission already given shows as allowed.
 */

type AskedKey = Extract<PermissionKey, 'notifications' | 'camera' | 'location'>;

const PERMS: { key: AskedKey; title: string; desc: string; icon: FillIconName; tone: ServiceTone }[] = [
  { key: 'notifications', title: 'الإشعارات', desc: 'تذكيرات الأدوية والمواعيد والعروض', ...BELL },
  { key: 'camera', title: 'الكاميرا', desc: 'مسح الوصفات والباركود وتصوير الأدوية', icon: 'camera', tone: 'violet' },
  { key: 'location', title: 'الموقع', desc: 'البحث عن أقرب صيدلية ومختبر وطبيب', ...SERVICE_ICONS.map },
];

export default function OnboardingPermissions() {
  const { theme, t, c, tr } = useAuthUi();
  const [status, setStatus] = useState<Partial<Record<AskedKey, PermissionStatus>>>({});
  const [asking, setAsking] = useState<AskedKey | null>(null);
  const [leaving, setLeaving] = useState(false);

  // what the phone already says (never asks)
  useEffect(() => {
    let live = true;
    PERMS.forEach(({ key }) => {
      permissions
        .check(key)
        .then((s) => {
          if (live) setStatus((prev) => ({ ...prev, [key]: s }));
        })
        .catch(() => {});
    });
    return () => {
      live = false;
    };
  }, []);

  const allow = async (key: AskedKey) => {
    setAsking(key);
    const answer = await permissions.request(key);
    setStatus((prev) => ({ ...prev, [key]: answer }));
    setAsking(null);
  };

  const finish = async () => {
    setLeaving(true);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_DONE, 'true');
    } catch {
      // storage failure is not worth stopping the user for
    }
    setLeaving(false);
    router.replace('/(auth)/welcome' as Href);
  };

  const back = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(onboarding)/language' as Href);
  };

  const footer = (
    <StickyFooter theme={theme}>
      <AuthFooter>
        <Button label={tr('متابعة')} variant="primary" size="lg" fullWidth loading={leaving} theme={theme} onPress={() => void finish()} testID="permissions-continue" />
        <Pressable accessibilityRole="button" accessibilityLabel={tr('تخطي الآن')} onPress={() => void finish()} disabled={leaving} testID="permissions-skip" style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
          <LocalizedText style={{ ...scale(t, 'body', 'medium'), color: c.text.primary }}>تخطي الآن</LocalizedText>
        </Pressable>
      </AuthFooter>
    </StickyFooter>
  );

  return (
    <Screen theme={theme} edges={['top', 'start', 'end']} scroll footer={footer} testID="onboarding-permissions">
      <AuthBody>
        <AuthTopBar onBack={back} />
        <AuthTitle title="الصلاحيات المطلوبة" sub="نحتاج بعض الأذونات لتقديم أفضل تجربة" />
        <View style={{ marginTop: 24, gap: 12 }}>
          {PERMS.map((p) => {
            const s = status[p.key] ?? 'undetermined';
            return (
              <Card key={p.key} padding="sm" theme={theme}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <FIcon icon={p.icon} tone={p.tone} size={44} theme={theme} />
                  <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                    <LocalizedText accessibilityRole="header" style={{ ...scale(t, 'bodyStrong'), color: c.text.primary, textAlign: 'auto' }}>{p.title}</LocalizedText>
                    <LocalizedText style={{ ...scale(t, 'label', 'regular'), color: c.text.secondary, textAlign: 'auto' }}>{p.desc}</LocalizedText>
                  </View>
                  {s === 'granted' ? (
                    <StatusChip label={tr('تم السماح')} tone="mint" theme={theme} />
                  ) : s === 'denied' || s === 'restricted' ? (
                    <Button label={tr('فتح الإعدادات')} variant="outline" size="sm" theme={theme} onPress={() => void Linking.openSettings()} testID={`permission-${p.key}-settings`} />
                  ) : (
                    <Button label={tr('السماح')} variant="outline" size="sm" loading={asking === p.key} disabled={asking !== null} theme={theme} onPress={() => void allow(p.key)} testID={`permission-${p.key}-allow`} />
                  )}
                </View>
              </Card>
            );
          })}
        </View>
      </AuthBody>
    </Screen>
  );
}
