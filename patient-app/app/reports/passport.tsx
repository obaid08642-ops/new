import React from 'react';
import { Linking, Pressable, Share, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { Card } from '../../../packages/ui-native/src';
import { tokens } from '../../../packages/design-tokens/dist/ts/tokens';
import { RX_TONE, Gate, InfoRow, Section, ShareGlyph, useConsultFormat } from '../../src/components/consult/ConsultKit';
import { HealthScreen, Panel, Pill, Row, bodyOf, useRemote } from '../../src/components/health/HealthKit';
import { Glyph } from '../../src/components/pharmacy/PharmacyKit';
import { step as scale, useScreenUi } from '../../src/components/screen/ScreenKit';
import { apiFetch } from '../../src/utils/api';

/**
 * The Health ID card (restyle only; linked from the medical profile and the health hub): GET /medical-profile for the summary
 * and GET /medical-profile/passport-token for the QR. The QR holds only a short-lived opaque token, never medical data. The
 * old /health/health-id (a QR with the national id) redirects here.
 */

interface Passport {
  full_name?: string; blood_type?: string; date_of_birth?: string; gender?: string;
  allergies?: Array<{ name?: string }>; long_term_medications?: Array<{ name?: string; dosage?: string; dose?: string }>;
  emergencyContacts?: Array<{ name?: string; phone?: string }>;
}
interface PassportToken { token?: string; format?: string; version?: number; expires_at?: string }

export default function HealthPassportScreen() {
  const { k, theme, t, c, flow, num } = useScreenUi();
  const fmt = useConsultFormat();
  const { status, data, reload } = useRemote(async () => {
    const [profile, token] = await Promise.all([apiFetch('/medical-profile'), apiFetch('/medical-profile/passport-token').catch(() => null)]);
    return { profile: bodyOf<Passport>(profile), token: (token ?? null) as PassportToken | null };
  }, [], 'reports:passport');
  const profile = data?.profile;
  const token = data?.token;
  const light = tokens('light').color;
  const age = profile?.date_of_birth ? Math.floor((Date.now() - new Date(profile.date_of_birth).getTime()) / 31557600000) : null;

  const share = () => {
    if (!profile) return;
    const allergies = (profile.allergies ?? []).map((a) => a.name).filter(Boolean).join(', ') || k('health.id.noAllergies');
    Share.share({ message: `${k('health.id.shareTitle', { name: profile.full_name || k('health.id.patient') })}\n${k('health.id.bloodType')}: ${profile.blood_type || k('health.id.unknown')}\n${k('health.id.allergies')}: ${allergies}` }).catch(() => undefined);
  };

  return (
    <HealthScreen
      title={k('health.id.title')}
      actions={[{ key: 'share', label: k('health.records.share'), icon: <ShareGlyph />, onPress: share }]}
      testID="health-id-screen"
    >
      <Gate status={status} onRetry={() => void reload()}>
        <Card theme={theme}>
          <View style={{ alignItems: 'center', gap: 8 }}>
            <Text style={{ ...scale(t, 'bodyStrong', 'bold'), color: c.text.primary }}>{k('health.id.scan')}</Text>
            <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, textAlign: 'center' }}>{k('health.id.scanHint')}</Text>
            <View accessibilityLabel={k('health.id.qr')} style={{ padding: 14, borderRadius: 20, backgroundColor: light.bg.surface, borderWidth: 1, borderColor: c.border.hairline }}>
              {token?.token ? (
                <QRCode value={JSON.stringify({ t: token.format, v: token.version, token: token.token })} size={180} color={light.text.primary} backgroundColor={light.bg.surface} />
              ) : (
                <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.tertiary, textAlign: 'center', width: 180 }}>{k('health.id.noToken')}</Text>
              )}
            </View>
            <Pill label={token?.expires_at ? k('health.id.until', { time: fmt.clock(token.expires_at) }) : k('health.id.needsConnection')} tone="success" />
          </View>
        </Card>

        <Card theme={theme}>
          <View>
            <InfoRow label={k('health.id.patient')} value={profile?.full_name || ''} strong />
            <InfoRow label={k('health.id.bloodType')} value={profile?.blood_type || k('health.id.unknown')} strong />
            <InfoRow label={k('health.id.ageGender')} value={[age != null ? k('health.id.years', { n: num(age) }) : '', profile?.gender === 'female' ? k('health.profile.female') : profile?.gender === 'male' ? k('health.profile.male') : ''].filter(Boolean).join(' / ')} last />
          </View>
        </Card>

        <Section title={k('health.id.allergies')}>
          {(profile?.allergies ?? []).length === 0 ? (
            <Text style={{ ...scale(t, 'small', 'regular'), color: c.text.secondary, ...flow }}>{k('health.id.noAllergies')}</Text>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {(profile?.allergies ?? []).map((a, i) => <Pill key={i} label={a.name ?? ''} tone="warning" />)}
            </View>
          )}
        </Section>

        <Section title={k('health.id.medicines')}>
          {(profile?.long_term_medications ?? []).length === 0 ? (
            <Text style={{ ...scale(t, 'small', 'regular'), color: c.text.secondary, ...flow }}>{k('health.id.noMedicines')}</Text>
          ) : (
            <Panel>
              {(profile?.long_term_medications ?? []).map((m, i, all) => <Row key={i} icon="pill" tone={RX_TONE} title={m.name ?? ''} subtitle={m.dosage || m.dose} trailing={<Pill label={k('health.id.ongoing')} tone="success" />} last={i === all.length - 1} />)}
            </Panel>
          )}
        </Section>

        <Section title={k('health.id.contacts')}>
          {(profile?.emergencyContacts ?? []).length === 0 ? (
            <Text style={{ ...scale(t, 'small', 'regular'), color: c.text.secondary, ...flow }}>{k('health.id.noContacts')}</Text>
          ) : (
            <Panel>
              {(profile?.emergencyContacts ?? []).map((m, i, all) => (
                <Row
                  key={i}
                  icon="user"
                  tone="peach"
                  title={m.name ?? ''}
                  subtitle={m.phone}
                  trailing={m.phone ? (
                    <Pressable accessibilityRole="button" accessibilityLabel={k('health.emergency.call', { name: m.name ?? '' })} onPress={() => Linking.openURL(`tel:${m.phone}`).catch(() => undefined)} style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: c.status.success.bg }}>
                      <Glyph name="headset" size={20} color={c.status.success.fg} />
                    </Pressable>
                  ) : undefined}
                  last={i === all.length - 1}
                />
              ))}
            </Panel>
          )}
        </Section>
      </Gate>
    </HealthScreen>
  );
}
