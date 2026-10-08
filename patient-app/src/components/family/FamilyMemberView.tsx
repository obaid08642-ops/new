import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';

import { Avatar, Button, EmptyState } from '../../../../packages/ui-native/src';
import { CARE_TONE, Gate, Section, useConsultFormat } from '../consult/ConsultKit';
import { HealthTabs, MetricGrid, MetricTile, Notice, Panel, Pill, Row, bodyOf, rowsOf, useRemote, useTab, vitalLook } from '../health/HealthKit';
import { step as scale, useScreenUi } from '../screen/ScreenKit';
import { showLocalizedAlert } from '../LocalizedAlert';
import { apiFetch } from '../../utils/api';
import { logError } from '../../utils/logger';
import { pickLocalized } from '../../utils/localize';
import { FAMILY_HUB, FamilyScreen, PermissionList, loadFamily } from './FamilyKit';

/**
 * One member (merge map row B, `/family/member-health?id=&name=&relation=&tab=`): the tabs Health and Permissions.
 * Health is GET /family/member-records/:id (the vitals, medicines and next appointment the member allowed). Permissions
 * is the member's switches: PATCH /family/member/:id/permissions (the owner), or POST /family/permissions/request when
 * the person is not the owner, and DELETE /family/remove-member/:id. /family/permissions and /health/family-member-detail
 * redirect here. The id, name and relation in the route are not health data.
 */

const TABS = ['health', 'permissions'] as const;
const VITALS = ['heart_rate', 'bp', 'weight'] as const;

interface Vital { type?: string; value?: string | number; unit?: string }
interface Medicine { medicine_name_ar?: string; medicine_name_en?: string; dose?: string; frequency?: string }
interface NextAppointment { doctor_name?: string; specialty?: string; scheduled_at?: string }
interface MemberRecords { vitals?: Vital[]; meds?: Medicine[]; next_appointment?: NextAppointment | null; profile?: { birth_date?: string | null } }

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? '';

export function FamilyMemberView() {
  const { k, t, c, theme, num } = useScreenUi();
  const params = useLocalSearchParams<{ id?: string; name?: string; relation?: string }>();
  const id = one(params.id);
  const name = one(params.name) || k('family.hub.memberName');
  const relation = one(params.relation);
  const [tab, setTab] = useTab(TABS, 'health');
  const records = useRemote(async () => bodyOf<MemberRecords>(await apiFetch(`/family/member-records/${id}`)), [id], 'family:member-health');
  const birth = records.data?.profile?.birth_date;
  const age = birth ? Math.max(0, Math.floor((Date.now() - new Date(birth).getTime()) / (365.25 * 24 * 3600 * 1000))) : null;

  return (
    <FamilyScreen title={k('family.member.title')} testID="family-member">
      <View style={{ alignItems: 'center', gap: 8, paddingVertical: 4 }}>
        <Avatar name={name} size="lg" theme={theme} />
        <Text accessibilityRole="header" style={{ ...scale(t, 'h3'), color: c.text.primary, textAlign: 'center' }}>{name}</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {relation ? <Pill label={relation} tone="neutral" /> : null}
          {age !== null && !Number.isNaN(age) ? <Pill label={k('family.member.age', { n: num(age, { useGrouping: false }) })} tone="neutral" /> : null}
        </View>
      </View>
      <HealthTabs tabs={[{ key: 'health', label: k('family.member.tabHealth') }, { key: 'permissions', label: k('family.member.tabPermissions') }]} value={tab} onChange={setTab} testID="member-tabs" />
      {tab === 'health' ? <HealthTab status={records.status} data={records.data} reload={() => void records.reload()} /> : <PermissionsTab id={id} name={name} />}
    </FamilyScreen>
  );
}

function HealthTab({ status, data, reload }: { status: React.ComponentProps<typeof Gate>['status']; data: MemberRecords | null; reload: () => void }) {
  const { k, theme } = useScreenUi();
  const fmt = useConsultFormat();
  const readings = Array.isArray(data?.vitals) ? data!.vitals! : [];
  const vitals = VITALS.map((type) => readings.find((r) => r.type === type)).filter((r): r is Vital => Boolean(r));
  const meds = rowsOf<Medicine>(data?.meds).slice(0, 5);
  const next = data?.next_appointment;
  return (
    <Gate status={status} onRetry={reload}>
      <Section title={k('family.member.vitals')}>
        {vitals.length === 0 ? (
          <Notice tone="info" text={k('family.member.noVitals')} />
        ) : (
          <MetricGrid>
            {vitals.map((v) => {
              const look = vitalLook(v.type);
              return <MetricTile key={v.type} label={k(look.label)} value={String(v.value ?? '')} unit={v.unit} icon={look.icon} tone={look.tone} testID={`member-vital-${v.type}`} />;
            })}
          </MetricGrid>
        )}
      </Section>
      <Section title={k('family.member.meds')}>
        {meds.length === 0 ? (
          <Notice tone="info" text={k('family.member.noMeds')} />
        ) : (
          <Panel>
            {meds.map((m, i) => (
              <Row key={i} icon="pill" tone="mint" title={pickLocalized(m.medicine_name_ar, m.medicine_name_en) ?? ''} subtitle={[m.dose, m.frequency].filter(Boolean).join(' · ')} last={i === meds.length - 1} />
            ))}
          </Panel>
        )}
      </Section>
      {next ? (
        <Section title={k('family.member.next')}>
          <Panel>
            <Row icon="stethoscope" tone={CARE_TONE} title={next.doctor_name || k('family.member.doctor')} subtitle={[next.specialty, fmt.date(next.scheduled_at)].filter(Boolean).join(' · ')} last testID="member-next" />
          </Panel>
        </Section>
      ) : null}
      <View style={{ gap: 10 }}>
        <Button label={k('family.member.chat')} variant="outline" fullWidth onPress={() => router.push('/family/chat' as Href)} theme={theme} testID="member-chat" />
        <Button label={k('family.member.book')} fullWidth onPress={() => router.push('/(tabs)/consultations' as Href)} theme={theme} testID="member-book" />
      </View>
    </Gate>
  );
}

function PermissionsTab({ id, name }: { id: string; name: string }) {
  const { k, theme } = useScreenUi();
  const family = useRemote(loadFamily, [], 'family:permissions:load');
  const member = (family.data?.group?.members ?? []).find((m) => m.user_id === id);
  const [granted, setGranted] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);

  // The member's CURRENT grants, so the switches show what is true.
  useEffect(() => {
    setGranted(member?.permissions ?? []);
  }, [member]);

  const toggle = (key: string) => setGranted((g) => (g.includes(key) ? g.filter((x) => x !== key) : [...g, key]));

  const save = async () => {
    setSaving(true);
    setNotice(null);
    try {
      try {
        // The owner replaces the member's permission set directly (grant and revoke).
        await apiFetch(`/family/member/${id}/permissions`, { method: 'PATCH', body: JSON.stringify({ permissions: granted }) });
        setNotice({ tone: 'success', text: k('family.perms.saved') });
      } catch {
        // Not the owner: the change is a request the member approves.
        await apiFetch('/family/permissions/request', { method: 'POST', body: JSON.stringify({ target_member_id: id, permissions: granted }) });
        setNotice({ tone: 'success', text: k('family.perms.requested') });
      }
    } catch (e) {
      logError('family:permissions', e);
      setNotice({ tone: 'danger', text: k('family.perms.failed') });
    } finally {
      setSaving(false);
    }
  };

  const remove = () => {
    showLocalizedAlert(k('family.perms.removeTitle'), k('family.perms.removeBody', { name }), [
      { text: k('family.perms.cancel'), style: 'cancel' },
      {
        text: k('family.perms.remove'),
        style: 'destructive',
        onPress: async () => {
          setRemoving(true);
          try {
            await apiFetch(`/family/remove-member/${id}`, { method: 'DELETE' });
            router.replace(FAMILY_HUB);
          } catch (e) {
            logError('family:permissions', e);
            setNotice({ tone: 'danger', text: k('family.perms.removeFailed') });
          } finally {
            setRemoving(false);
          }
        },
      },
    ]);
  };

  return (
    <Gate status={family.status} onRetry={() => void family.reload()}>
      {member?.role === 'owner' ? (
        <EmptyState icon="lock" tone="blue" title={k('family.perms.ownerTitle')} body={k('family.perms.ownerBody')} theme={theme} />
      ) : (
        <>
          <PermissionList granted={granted} onToggle={toggle} disabled={saving} testID="member-perms" />
          <Notice tone="info" text={k('family.perms.note')} />
          {notice ? <Notice tone={notice.tone} text={notice.text} testID="member-perms-notice" /> : null}
          <Button label={k('family.perms.save')} size="lg" fullWidth loading={saving} onPress={() => void save()} theme={theme} testID="member-perms-save" />
          <Button label={k('family.perms.removeMember')} variant="danger" size="lg" fullWidth loading={removing} onPress={remove} startIcon="trash" theme={theme} testID="member-remove" />
        </>
      )}
    </Gate>
  );
}
