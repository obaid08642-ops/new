import React, { useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { router, type Href } from 'expo-router';

import { Avatar, Button, Card, Chip, EmptyState, Input, Segmented, Toggle } from '../../../../packages/ui-native/src';
import { Gate, InfoRow, Section } from '../consult/ConsultKit';
import { Glyph } from '../pharmacy/PharmacyKit';
import { showLocalizedAlert } from '../LocalizedAlert';
import { step as scale, useScreenUi } from '../screen/ScreenKit';
import { apiFetch } from '../../utils/api';
import { HealthScreen, HealthTabs, Notice, Panel, Pill, Row, SheetForm, bodyOf, rowsOf, useRemote, useTab } from './HealthKit';

/**
 * Medical profile (board HealthHub "ملفي الطبي", merge map row "Medical profile"): the tabs Basics, Conditions and Emergency.
 * Basics is the old edit-profile form (GET/PATCH /medical-profile, GET/PATCH /users/me/profile and POST /media/upload for the
 * photo) with the link to the Health ID card. Conditions is the old conditions-allergies screen (POST/DELETE
 * /medical-profile/chronic-diseases|allergies) and the chronic-disease follow-up cards (GET /health/chronic-diseases).
 * Emergency has two lists: "My contacts" (GET/POST/DELETE /health/emergency-contacts, editable) and "My family on Nabd+"
 * (GET /family/emergency-contacts, read only). /family/emergency-contacts redirects to ?tab=emergency.
 */

const TABS = ['basics', 'conditions', 'emergency'] as const;
const BLOOD = ['unknown', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;

export function ProfileView() {
  const { k } = useScreenUi();
  const [tab, setTab] = useTab(TABS, 'basics');
  return (
    <HealthScreen title={k('health.profile.title')} testID="profile-screen">
      <HealthTabs tabs={[{ key: 'basics', label: k('health.tab.basics') }, { key: 'conditions', label: k('health.tab.conditions') }, { key: 'emergency', label: k('health.tab.emergency') }]} value={tab} onChange={setTab} testID="profile-tabs" />
      {tab === 'basics' ? <BasicsTab /> : null}
      {tab === 'conditions' ? <ConditionsTab /> : null}
      {tab === 'emergency' ? <EmergencyTab /> : null}
    </HealthScreen>
  );
}

interface Draft { blood_type: string; height_cm: string; weight_kg: string; gender: string; is_pregnant: boolean; is_breastfeeding: boolean; is_smoker: boolean }
const INITIAL: Draft = { blood_type: 'unknown', height_cm: '', weight_kg: '', gender: 'unspecified', is_pregnant: false, is_breastfeeding: false, is_smoker: false };

function BasicsTab() {
  const { k, theme, t, c, flow } = useScreenUi();
  const [draft, setDraft] = useState<Draft>(INITIAL);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ tone: 'danger' | 'success'; text: string } | null>(null);
  const { status, reload } = useRemote(async () => {
    const [medical, user] = await Promise.all([apiFetch('/medical-profile'), apiFetch('/users/me/profile')]);
    const profile = bodyOf<Record<string, unknown>>(medical);
    const me = bodyOf<{ avatar_url?: string }>(user);
    setDraft({ blood_type: String(profile.blood_type || 'unknown'), height_cm: profile.height_cm == null ? '' : String(profile.height_cm), weight_kg: profile.weight_kg == null ? '' : String(profile.weight_kg), gender: String(profile.gender || 'unspecified'), is_pregnant: Boolean(profile.is_pregnant), is_breastfeeding: Boolean(profile.is_breastfeeding), is_smoker: Boolean(profile.is_smoker) });
    setAvatar(me.avatar_url || null);
    return true;
  }, [], 'health:profile');
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const save = async () => {
    const height_cm = draft.height_cm.trim() ? Number(draft.height_cm) : undefined;
    const weight_kg = draft.weight_kg.trim() ? Number(draft.weight_kg) : undefined;
    if ((height_cm !== undefined && (!Number.isFinite(height_cm) || height_cm < 40 || height_cm > 260)) || (weight_kg !== undefined && (!Number.isFinite(weight_kg) || weight_kg < 1 || weight_kg > 1000))) {
      setMessage({ tone: 'danger', text: k('health.profile.badBody') });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await apiFetch('/medical-profile', { method: 'PATCH', body: JSON.stringify({ ...draft, height_cm, weight_kg }) });
      setMessage({ tone: 'success', text: k('health.profile.saved') });
    } catch { setMessage({ tone: 'danger', text: k('health.profile.saveError') }); } finally { setSaving(false); }
  };

  const pickAvatar = async () => {
    setUploading(true);
    setMessage(null);
    try {
      const ImagePicker = await import('expo-image-picker');
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) { setMessage({ tone: 'danger', text: k('health.profile.photoPermission') }); return; }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const formData = new FormData();
      formData.append('file', { uri: asset.uri, name: asset.fileName || 'avatar.jpg', type: asset.mimeType || 'image/jpeg' } as unknown as Blob);
      formData.append('folder', 'avatars');
      const upload = await apiFetch<{ url?: string; data?: { url?: string } }>('/media/upload', { method: 'POST', body: formData });
      const url = upload?.url || upload?.data?.url;
      if (!url) throw new Error('upload_missing_url');
      await apiFetch('/users/me/profile', { method: 'PATCH', body: JSON.stringify({ avatar_url: url }) });
      setAvatar(url);
    } catch { setMessage({ tone: 'danger', text: k('health.profile.photoError') }); } finally { setUploading(false); }
  };

  return (
    <Gate status={status} onRetry={() => void reload()}>
      <Card theme={theme}>
        <View style={{ alignItems: 'center', gap: 10 }}>
          <Avatar name={k('health.profile.photo')} size="lg" src={avatar ?? undefined} theme={theme} />
          <Button label={uploading ? k('health.profile.uploading') : k('health.profile.changePhoto')} variant="outline" size="sm" loading={uploading} onPress={() => void pickAvatar()} theme={theme} testID="profile-photo" />
          <Text style={{ ...scale(t, 'tag', 'regular'), color: c.text.tertiary, textAlign: 'center' }}>{k('health.profile.photoNote')}</Text>
        </View>
      </Card>
      <Section title={k('health.profile.basics')}>
        <Card theme={theme}>
          <View style={{ gap: 14 }}>
            <View style={{ gap: 8 }}>
              <Text style={{ ...scale(t, 'meta', 'medium'), color: c.text.secondary, ...flow }}>{k('health.profile.bloodType')}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {BLOOD.map((b) => <Chip key={b} label={b === 'unknown' ? k('health.profile.unknown') : b} selected={draft.blood_type === b} onPress={() => set('blood_type', b)} theme={theme} />)}
              </View>
            </View>
            <Input label={k('health.profile.height')} value={draft.height_cm} onChange={(v) => set('height_cm', v)} keyboardType="decimal" theme={theme} />
            <Input label={k('health.profile.weight')} value={draft.weight_kg} onChange={(v) => set('weight_kg', v)} keyboardType="decimal" theme={theme} />
            <Segmented label={k('health.profile.gender')} value={draft.gender} onChange={(v) => set('gender', v)} options={[{ value: 'unspecified', label: k('health.profile.unspecified') }, { value: 'female', label: k('health.profile.female') }, { value: 'male', label: k('health.profile.male') }]} theme={theme} />
          </View>
        </Card>
      </Section>
      <Section title={k('health.profile.optional')}>
        <Card theme={theme}>
          <View style={{ gap: 12 }}>
            <Toggle label={k('health.profile.pregnant')} value={draft.is_pregnant} onChange={(v) => set('is_pregnant', v)} theme={theme} />
            <Toggle label={k('health.profile.breastfeeding')} value={draft.is_breastfeeding} onChange={(v) => set('is_breastfeeding', v)} theme={theme} />
            <Toggle label={k('health.profile.smoker')} value={draft.is_smoker} onChange={(v) => set('is_smoker', v)} theme={theme} />
          </View>
        </Card>
      </Section>
      {message ? <Notice tone={message.tone} text={message.text} /> : null}
      <Button label={k('health.profile.save')} size="lg" fullWidth loading={saving} onPress={() => void save()} theme={theme} testID="profile-save" />
      <Panel>
        <Row icon="identification-card" tone="blue" title={k('health.profile.idCard')} subtitle={k('health.profile.idCardHint')} onPress={() => router.push('/reports/passport' as Href)} last testID="profile-id-card" />
      </Panel>
    </Gate>
  );
}

interface ProfileItem { id: string; name?: string; label?: string; description?: string }
interface CareCondition { id: string; name?: string; severity?: string; controlled?: boolean | null; diagnosedDate?: string; doctor?: string; lastCheckup?: string; nextCheckup?: string; medications?: string[]; tips?: string[] }

function ConditionsTab() {
  const { k, theme, t, c, flow } = useScreenUi();
  const [condition, setCondition] = useState('');
  const [allergy, setAllergy] = useState('');
  const [action, setAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const { status, data, reload } = useRemote(async () => {
    const [profile, care] = await Promise.all([apiFetch('/medical-profile'), apiFetch('/health/chronic-diseases').catch(() => null)]);
    const doc = bodyOf<{ chronic_diseases?: ProfileItem[]; allergies?: ProfileItem[] }>(profile);
    return { chronic: Array.isArray(doc.chronic_diseases) ? doc.chronic_diseases : [], allergies: Array.isArray(doc.allergies) ? doc.allergies : [], care: rowsOf<CareCondition>(care) };
  }, [], 'health:conditions');
  const itemText = (item: ProfileItem) => item.name || item.label || item.description || k('health.profile.unnamed');

  const add = async (list: 'chronic-diseases' | 'allergies', value: string) => {
    const name = value.trim();
    if (!name) { setError(k('health.profile.nameFirst')); return; }
    setAction(`add-${list}`);
    setError(null);
    try {
      await apiFetch(`/medical-profile/${list}`, { method: 'POST', body: JSON.stringify({ name }) });
      if (list === 'allergies') setAllergy(''); else setCondition('');
      await reload(true);
    } catch { setError(k('health.profile.addError')); } finally { setAction(null); }
  };
  const remove = async (list: 'chronic-diseases' | 'allergies', id: string) => {
    setAction(`delete-${id}`);
    setError(null);
    try {
      await apiFetch(`/medical-profile/${list}/${id}`, { method: 'DELETE' });
      await reload(true);
    } catch { setError(k('health.profile.deleteError')); } finally { setAction(null); }
  };

  const section = (title: string, list: 'chronic-diseases' | 'allergies', items: ProfileItem[], value: string, onChange: (v: string) => void, placeholder: string, addLabel: string) => (
    <Section title={title}>
      <Card theme={theme}>
        <View style={{ gap: 10 }}>
          <Input label={placeholder} value={value} onChange={onChange} theme={theme} />
          <Button label={addLabel} variant="outline" size="md" loading={action === `add-${list}`} onPress={() => void add(list, value)} theme={theme} testID={`add-${list}`} />
          {items.length === 0 ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.tertiary, ...flow }}>{k('health.profile.noItems')}</Text> : items.map((item) => (
            <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, borderTopColor: c.border.hairline, paddingTop: 8 }}>
              <Text style={{ ...scale(t, 'small', 'medium'), color: c.text.primary, flex: 1, minWidth: 0, ...flow }}>{itemText(item)}</Text>
              <Button label={k('health.profile.delete')} variant="ghost" size="sm" loading={action === `delete-${item.id}`} onPress={() => void remove(list, item.id)} theme={theme} />
            </View>
          ))}
        </View>
      </Card>
    </Section>
  );

  return (
    <Gate status={status} onRetry={() => void reload()}>
      <Notice tone="warning" text={k('health.profile.conditionsNote')} />
      {error ? <Notice tone="danger" text={error} /> : null}
      {section(k('health.profile.chronic'), 'chronic-diseases', data?.chronic ?? [], condition, setCondition, k('health.profile.conditionName'), k('health.profile.addCondition'))}
      {section(k('health.profile.allergies'), 'allergies', data?.allergies ?? [], allergy, setAllergy, k('health.profile.allergyName'), k('health.profile.addAllergy'))}
      {(data?.care.length ?? 0) > 0 ? (
        <Section title={k('health.profile.followUp')}>
          {data?.care.map((cond) => {
            const expanded = open === cond.id;
            return (
              <Card key={cond.id} theme={theme}>
                <Pressable accessibilityRole="button" accessibilityState={{ expanded }} accessibilityLabel={String(cond.name ?? '')} onPress={() => setOpen(expanded ? null : cond.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 }}>
                  <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                    <Text style={{ ...scale(t, 'bodyStrong', 'bold'), color: c.text.primary, ...flow }}>{cond.name}</Text>
                    {cond.severity ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{k('health.profile.severity', { value: cond.severity })}</Text> : null}
                  </View>
                  <Pill label={cond.controlled === true ? k('health.profile.controlled') : cond.controlled === false ? k('health.profile.needsFollowUp') : k('health.profile.recorded')} tone={cond.controlled === true ? 'success' : cond.controlled === false ? 'warning' : 'neutral'} />
                </Pressable>
                {expanded ? (
                  <View style={{ gap: 8 }}>
                    <View>
                      <InfoRow label={k('health.profile.diagnosed')} value={cond.diagnosedDate ?? ''} />
                      <InfoRow label={k('health.profile.doctor')} value={cond.doctor ?? ''} />
                      <InfoRow label={k('health.profile.lastCheckup')} value={cond.lastCheckup ?? ''} />
                      <InfoRow label={k('health.profile.nextCheckup')} value={cond.nextCheckup ?? ''} last />
                    </View>
                    {cond.medications?.length ? <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{`${k('health.profile.medicines')}: ${cond.medications.join('، ')}`}</Text> : null}
                    {cond.tips?.map((tip, i) => <Text key={i} style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{`• ${tip}`}</Text>)}
                    <Button label={k('health.profile.bookCheckup')} variant="outline" size="md" fullWidth onPress={() => router.push('/(tabs)/consultations' as Href)} theme={theme} />
                  </View>
                ) : null}
              </Card>
            );
          })}
        </Section>
      ) : null}
    </Gate>
  );
}

interface Contact { id: string; name?: string; phone?: string; relation?: string; isPrimary?: boolean }
interface FamilyContact { user_id: string; display_name: string | null; phone: string | null; relation: string | null }

function EmergencyTab() {
  const { k, theme, t, c, flow } = useScreenUi();
  const [sheet, setSheet] = useState(false);
  const [name, setName] = useState('');
  const [relation, setRelation] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mine = useRemote(async () => rowsOf<Contact>(await apiFetch('/health/emergency-contacts')), [], 'health:emergency-contacts');
  const family = useRemote(async () => { const rows = await apiFetch<FamilyContact[]>('/family/emergency-contacts'); return Array.isArray(rows) ? rows : []; }, [], 'family:emergency-contacts');
  const contacts = mine.data ?? [];
  const call = (number?: string | null) => { if (number) Linking.openURL(`tel:${number}`).catch(() => undefined); };

  const add = async () => {
    if (!name.trim() || !phone.trim()) { setError(k('health.emergency.required')); return; }
    setSaving(true);
    setError(null);
    try {
      await apiFetch('/health/emergency-contacts', { method: 'POST', body: JSON.stringify({ name: name.trim(), phone: phone.trim(), relation: relation.trim() || undefined, isPrimary: contacts.length === 0 }) });
      setSheet(false);
      setName(''); setRelation(''); setPhone('');
      await mine.reload(true);
    } catch { setError(k('health.emergency.saveError')); } finally { setSaving(false); }
  };
  const remove = (contact: Contact) => {
    showLocalizedAlert(k('health.emergency.deleteTitle'), k('health.emergency.deleteBody', { name: contact.name ?? '' }), [
      { text: k('health.refill.cancel'), style: 'cancel' },
      {
        text: k('health.profile.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await apiFetch(`/health/emergency-contacts/${contact.id}`, { method: 'DELETE' });
            await mine.reload(true);
          } catch { showLocalizedAlert(k('health.emergency.deleteFailed'), k('health.emergency.tryAgain')); }
        },
      },
    ]);
  };

  const callButton = (number?: string | null, label?: string) => (number ? (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={() => call(number)} style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: c.status.success.bg }}>
      <Glyph name="headset" size={20} color={c.status.success.fg} />
    </Pressable>
  ) : null);

  return (
    <>
      <Section title={k('health.emergency.mine')} actionLabel={k('health.emergency.add')} onAction={() => setSheet(true)}>
        <Gate status={mine.status} onRetry={() => void mine.reload()}>
          {contacts.length === 0 ? (
            <EmptyState icon="address-book" tone="peach" title={k('health.emergency.empty')} body={k('health.emergency.emptyBody')} actionLabel={k('health.emergency.add')} onAction={() => setSheet(true)} theme={theme} />
          ) : (
            <Panel>
              {contacts.map((contact, i) => (
                <Row
                  key={contact.id}
                  icon="user"
                  tone="peach"
                  title={contact.name ?? ''}
                  subtitle={[contact.relation, contact.phone].filter(Boolean).join(' · ')}
                  trailing={
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      {contact.isPrimary ? <Pill label={k('health.emergency.primary')} tone="info" /> : null}
                      {callButton(contact.phone, k('health.emergency.call', { name: contact.name ?? '' }))}
                      <Pressable accessibilityRole="button" accessibilityLabel={k('health.emergency.deleteTitle')} onPress={() => remove(contact)} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                        <Glyph name="trash" size={20} color={c.status.danger.fg} />
                      </Pressable>
                    </View>
                  }
                  last={i === contacts.length - 1}
                />
              ))}
            </Panel>
          )}
        </Gate>
      </Section>

      <Section title={k('health.emergency.family')} actionLabel={k('health.emergency.invite')} onAction={() => router.push('/family/invite' as Href)}>
        <Notice tone="info" text={k('health.emergency.familyNote')} />
        <Gate status={family.status} onRetry={() => void family.reload()}>
          {(family.data ?? []).length === 0 ? (
            <Text style={{ ...scale(t, 'small', 'regular'), color: c.text.secondary, ...flow }}>{k('health.emergency.familyEmpty')}</Text>
          ) : (
            <Panel>
              {(family.data ?? []).map((member, i, all) => (
                <Row
                  key={member.user_id}
                  icon="users-three"
                  tone="peach"
                  title={member.display_name || k('health.emergency.member')}
                  subtitle={member.phone || k('health.emergency.noPhone')}
                  trailing={callButton(member.phone, k('health.emergency.call', { name: member.display_name ?? '' }))}
                  last={i === all.length - 1}
                />
              ))}
            </Panel>
          )}
        </Gate>
      </Section>

      <SheetForm open={sheet} title={k('health.emergency.addTitle')} onClose={() => setSheet(false)} onSave={() => void add()} saving={saving} error={error} saveLabel={k('health.emergency.save')} testID="contact-sheet">
        <Input label={k('health.emergency.name')} value={name} onChange={setName} theme={theme} />
        <Input label={k('health.emergency.relation')} value={relation} onChange={setRelation} theme={theme} />
        <Input label={k('health.emergency.phone')} value={phone} onChange={setPhone} keyboardType="phone" theme={theme} />
      </SheetForm>
    </>
  );
}
