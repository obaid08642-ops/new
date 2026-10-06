import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { router, type Href } from 'expo-router';

import { Button, EmptyState, FIcon } from '../../../../packages/ui-native/src';
import { Glyph } from '../pharmacy/PharmacyKit';
import { CARE_TONE, Gate, Section, Sheet, useConsultFormat } from '../consult/ConsultKit';
import { HEALTH_HUB, Notice, Panel, Pill, Row, rowsOf, useRemote } from '../health/HealthKit';
import { step as scale, useScreenUi } from '../screen/ScreenKit';
import { useGuestGuard } from '../../hooks/useGuestGuard';
import { apiFetch } from '../../utils/api';
import { logError } from '../../utils/logger';
import { FAMILY_ADD, FamilyScreen, MemberRow, loadFamily, permissionLabel, type FamilyMember } from './FamilyKit';

/**
 * The family hub (board Family, merge map row A, canonical `/family`): the add-a-member card, the pending permission
 * requests with accept and decline, the members of the group and the links to the shared calendar, the chat and the
 * emergency contacts. GET /family/my-group, GET /family/members, POST /family/create, GET /family/permissions/pending,
 * PUT /family/permissions/respond/:id. The old /health/family-hub, /family/permission-request and the group part of
 * /family/permissions redirect here (the per-member part is on the member screen).
 */

interface PermissionRequest {
  _id?: string;
  id?: string;
  requester_name?: string | null;
  createdAt?: string;
  permissions?: string[];
}
const requestId = (r: PermissionRequest) => String(r._id ?? r.id ?? '');

const roleLabelKey = (m: FamilyMember) => (m.role === 'owner' ? 'family.hub.roleOwner' : 'family.hub.roleMember');

export function FamilyHubView() {
  const { isGuest, requireAuth } = useGuestGuard();
  useEffect(() => {
    // Family is one of the two areas guests cannot use (with insurance).
    if (isGuest) requireAuth('family');
  }, [isGuest, requireAuth]);
  if (isGuest) return null;
  return <Hub />;
}

function Hub() {
  const { k, theme, t, c, flow } = useScreenUi();
  const fmt = useConsultFormat();
  const family = useRemote(loadFamily, [], 'family:hub');
  const pending = useRemote(async () => rowsOf<PermissionRequest>(await apiFetch('/family/permissions/pending')), [], 'family:requests');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<PermissionRequest | null>(null);
  const [granted, setGranted] = useState<string[]>([]);
  const [replying, setReplying] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [replied, setReplied] = useState(false);

  const group = family.data?.group ?? null;
  const members = family.data?.members ?? [];
  const permissionsOf = (id: string) => (group?.members ?? []).find((m) => m.user_id === id)?.permissions;

  const createGroup = async () => {
    setCreating(true);
    setError(null);
    try {
      await apiFetch('/family/create', { method: 'POST', body: JSON.stringify({ name: k('family.hub.defaultName') }) });
      await family.reload();
    } catch (e) {
      logError('family:create', e);
      setError(k('family.hub.createFailed'));
    } finally {
      setCreating(false);
    }
  };

  const review = (request: PermissionRequest) => {
    setOpen(request);
    setGranted([...(request.permissions ?? [])]);
    setReplyError(null);
  };
  const toggle = (key: string) => setGranted((g) => (g.includes(key) ? g.filter((x) => x !== key) : [...g, key]));

  const respond = async (decision: 'approved' | 'rejected') => {
    if (!open) return;
    setReplying(true);
    setReplyError(null);
    try {
      await apiFetch(`/family/permissions/respond/${requestId(open)}`, {
        method: 'PUT',
        body: JSON.stringify({ decision, note: '', permissions: decision === 'approved' ? granted : [] }),
      });
      setOpen(null);
      setReplied(true);
      await pending.reload(true);
    } catch (e) {
      logError('family:permission-request', e);
      setReplyError(k('family.requests.failed'));
    } finally {
      setReplying(false);
    }
  };

  const requests = pending.data ?? [];

  return (
    <FamilyScreen
      title={k('family.hub.title')}
      onBack={() => (router.canGoBack() ? router.back() : router.replace(HEALTH_HUB))}
      actions={group ? [{ key: 'add', label: k('family.hub.addMember'), icon: <Glyph name="plus" size={20} color={c.icon.primary} />, onPress: () => router.push(FAMILY_ADD as Href) }] : undefined}
      testID="family-hub"
    >
      <Gate status={family.status} onRetry={() => void family.reload()}>
        {!group ? (
          <View style={{ gap: 12 }}>
            <EmptyState icon="users-three" tone="peach" title={k('family.hub.emptyTitle')} body={k('family.hub.emptyBody')} actionLabel={k('family.hub.create')} onAction={() => void createGroup()} secondaryActionLabel={k('family.hub.joinExisting')} onSecondaryAction={() => router.push({ pathname: FAMILY_ADD, params: { tab: 'join' } } as unknown as Href)} theme={theme} testID="family-empty" />
            {error ? <Notice tone="danger" text={error} /> : null}
            {creating ? <Notice tone="info" text={k('family.hub.creating')} /> : null}
          </View>
        ) : (
          <>
            <View style={{ borderRadius: 26, padding: 16, gap: 12, backgroundColor: c.bg.surface, borderWidth: 1, borderColor: c.border.hairline }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <FIcon icon="users-three" tone="peach" size={52} chip="solid" theme={theme} />
                <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  <Text style={{ ...scale(t, 'bodyStrong', 'bold'), color: c.text.primary, ...flow }}>{k('family.hub.heroTitle')}</Text>
                  <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{k('family.hub.heroBody')}</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Button label={k('family.hub.addMember')} fullWidth onPress={() => router.push({ pathname: FAMILY_ADD, params: { tab: 'invite' } } as unknown as Href)} theme={theme} testID="family-add" />
                </View>
                <View style={{ flex: 1 }}>
                  <Button label={k('family.hub.joinCode')} variant="outline" fullWidth onPress={() => router.push({ pathname: FAMILY_ADD, params: { tab: 'join' } } as unknown as Href)} theme={theme} testID="family-join" />
                </View>
              </View>
            </View>

            {replied ? <Notice tone="success" text={k('family.requests.replied')} testID="family-replied" /> : null}
            {requests.length > 0 ? (
              <Section title={k('family.requests.title')}>
                <Panel testID="family-requests">
                  {requests.map((r, i) => (
                    <Row
                      key={requestId(r) || String(i)}
                      icon="lock"
                      tone="blue"
                      title={r.requester_name || k('family.requests.someone')}
                      subtitle={k('family.requests.asks', { n: (r.permissions ?? []).length })}
                      caption={fmt.date(r.createdAt)}
                      trailing={<Pill label={k('family.requests.new')} tone="warning" />}
                      onPress={() => review(r)}
                      last={i === requests.length - 1}
                      testID={`request-${requestId(r)}`}
                    />
                  ))}
                </Panel>
              </Section>
            ) : null}
            {pending.status === 'error' || pending.status === 'offline' ? <Notice tone="warning" text={k('family.requests.loadFailed')} /> : null}

            <Section title={k('family.hub.members')}>
              {members.length === 0 ? (
                <EmptyState icon="users-three" tone={CARE_TONE} title={k('family.hub.noMembers')} body={k('family.hub.noMembersBody')} theme={theme} />
              ) : (
                <Panel testID="family-members">
                  {members.map((m, i) => {
                    const owner = m.role === 'owner';
                    const name = m.display_name || (owner ? k('family.hub.ownerName') : k('family.hub.memberName'));
                    const perms = permissionsOf(m.user_id);
                    return (
                      <MemberRow
                        key={m.user_id}
                        name={name}
                        relation={[k(roleLabelKey(m)), m.relation].filter(Boolean).join(' · ')}
                        pill={!owner && perms ? { label: k('family.hub.permCount', { n: perms.length }), tone: 'neutral' } : undefined}
                        last={i === members.length - 1}
                        onPress={() => router.push({ pathname: '/family/member-health', params: { id: m.user_id, name, relation: m.relation || '' } } as unknown as Href)}
                        testID={`member-${m.user_id}`}
                      />
                    );
                  })}
                </Panel>
              )}
            </Section>

            <Panel testID="family-links">
              <Row icon="calendar-dots" tone="coral" title={k('family.hub.calendar')} subtitle={k('family.hub.calendarHint')} onPress={() => router.push('/family/calendar' as Href)} testID="family-link-calendar" />
              <Row icon="chat-circle-text" tone="blue" title={k('family.hub.chat')} subtitle={k('family.hub.chatHint')} onPress={() => router.push('/family/chat' as Href)} testID="family-link-chat" />
              <Row icon="address-book" tone="amber" title={k('family.hub.emergency')} subtitle={k('family.hub.emergencyHint')} onPress={() => router.push('/family/emergency-contacts' as Href)} last testID="family-link-emergency" />
            </Panel>
          </>
        )}
      </Gate>

      <Sheet open={open !== null} title={k('family.requests.sheetTitle')} onClose={() => setOpen(null)} closeLabel={k('consult.close')}>
        {open ? (
          <View style={{ gap: 14 }} testID="request-sheet">
            <Text style={{ ...scale(t, 'small', 'regular'), color: c.text.secondary, ...flow }}>{k('family.requests.body', { name: open.requester_name || k('family.requests.someone') })}</Text>
            <Text accessibilityRole="header" style={{ ...scale(t, 'bodyStrong', 'bold'), color: c.text.primary, ...flow }}>{k('family.requests.requested')}</Text>
            <RequestedPermissions keys={open.permissions ?? []} granted={granted} onToggle={toggle} />
            <Notice tone="info" text={k('family.requests.note')} />
            {replyError ? <Notice tone="danger" text={replyError} /> : null}
            <Button label={k('family.requests.accept')} size="lg" fullWidth loading={replying} onPress={() => void respond('approved')} theme={theme} testID="request-accept" />
            <Button label={k('family.requests.decline')} variant="outline" size="lg" fullWidth disabled={replying} onPress={() => void respond('rejected')} theme={theme} testID="request-decline" />
          </View>
        ) : null}
      </Sheet>
    </FamilyScreen>
  );
}

/** The permissions one request asks for, each allowed or refused on its own (the old screen's "مسموح / مرفوض"). */
function RequestedPermissions({ keys, granted, onToggle }: { keys: string[]; granted: string[]; onToggle: (key: string) => void }) {
  const { k, theme, t, c, flow } = useScreenUi();
  return (
    <Panel testID="request-permissions">
      {keys.map((key, i) => {
        const on = granted.includes(key);
        return (
          <View key={key} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 14, minHeight: 56, borderBottomWidth: i === keys.length - 1 ? 0 : 1, borderBottomColor: c.border.hairline }}>
            <Text style={{ ...scale(t, 'body', 'medium'), color: c.text.primary, flex: 1, ...flow }}>{permissionLabel(k, key)}</Text>
            <Button label={on ? k('family.requests.allowed') : k('family.requests.refused')} variant={on ? 'primary' : 'outline'} size="sm" onPress={() => onToggle(key)} theme={theme} testID={`request-perm-${key}`} />
          </View>
        );
      })}
    </Panel>
  );
}
