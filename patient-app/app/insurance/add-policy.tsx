import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { router, type Href } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

import { Button, Chip, Input } from '../../../packages/ui-native/src';
import { Section } from '../../src/components/consult/ConsultKit';
import { Notice, rowsOf } from '../../src/components/health/HealthKit';
import { InsuranceScreen, INSURANCE_HUB } from '../../src/components/insurance/InsuranceKit';
import { useScreenUi } from '../../src/components/screen/ScreenKit';
import { apiFetch } from '../../src/utils/api';
import { logError } from '../../src/utils/logger';
import { pickLocalized } from '../../src/utils/localize';

interface Company { id: string; code?: string; name_ar?: string; name_en?: string }

/**
 * Add a policy (board Insurance, merge map 2 keeps this screen): the insurer from the catalog, the policy details and the
 * optional scan of the card (POST /insurance/ocr-extract fills the fields, the patient reviews them). POST
 * /insurance/save-policy with the body this screen always sent; the policy is never marked verified here.
 */
export default function AddPolicyScreen() {
  const { k, theme } = useScreenUi();
  const [company, setCompany] = useState('');
  const [policyNum, setPolicyNum] = useState('');
  const [memberId, setMemberId] = useState('');
  const [memberName, setMemberName] = useState('');
  const [expiry, setExpiry] = useState('');
  const [ocrUsed, setOcrUsed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [notice, setNotice] = useState<{ tone: 'danger' | 'success'; text: string } | null>(null);

  useEffect(() => {
    apiFetch('/insurance/companies')
      .then((res) => setCompanies(rowsOf<Company>(res)))
      .catch((e) => { logError('insurance:add-policy:companies', e); setCompanies([]); });
  }, []);

  const handleScanCard = async () => {
    setNotice(null);
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        setNotice({ tone: 'danger', text: k('insurance.add.cameraDenied') });
        return;
      }
      const shot = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.7 });
      if (shot.canceled || !shot.assets?.[0]?.base64) return;
      setIsScanning(true);
      const res = await apiFetch<{ success?: boolean; extracted_data?: Record<string, string> }>('/insurance/ocr-extract', {
        method: 'POST',
        body: JSON.stringify({ image_base64: shot.assets[0].base64, mime_type: 'image/jpeg' }),
      });
      if (res.success && res.extracted_data) {
        const data = res.extracted_data;
        if (data.policy_number) setPolicyNum(data.policy_number);
        if (data.national_id) setMemberId(data.national_id);
        if (data.member_name) setMemberName(data.member_name);
        if (data.expiry_date) setExpiry(data.expiry_date);
        if (data.provider) {
          const needle = String(data.provider).toLowerCase();
          const match = companies.find((c) =>
            String(c.name_ar || '').toLowerCase().includes(needle) ||
            String(c.name_en || '').toLowerCase().includes(needle) ||
            needle.includes(String(c.code || '').toLowerCase()));
          if (match) setCompany(match.id);
        }
        setOcrUsed(true);
        setNotice({ tone: 'success', text: k('insurance.add.scanned') });
      }
    } catch (err) {
      logError('insurance:add-policy:ocr', err);
      setNotice({ tone: 'danger', text: k('insurance.add.scanFailed') });
    } finally {
      setIsScanning(false);
    }
  };

  const handleSave = async () => {
    if (!company || !policyNum || isSaving) return;
    setIsSaving(true);
    setNotice(null);
    try {
      const compObj = companies.find((c) => c.id === company);
      await apiFetch('/insurance/save-policy', {
        method: 'POST',
        body: JSON.stringify({
          provider: pickLocalized(compObj?.name_ar, compObj?.name_en) || compObj?.code,
          company_id: compObj?.code,
          policy_number: policyNum,
          ...(expiry ? { expiry_date: expiry } : {}),
          ...(memberName ? { member_name: memberName } : {}),
          national_id: memberId || undefined,
          verified: false,
          ocr_extracted: ocrUsed,
        }),
      });
      router.replace(INSURANCE_HUB as Href);
    } catch (err) {
      logError('insurance:add-policy:save', err);
      setNotice({ tone: 'danger', text: k('insurance.add.saveFailed') });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <InsuranceScreen
      title={k('insurance.add.title')}
      footer={<Button label={k('insurance.add.save')} size="lg" fullWidth loading={isSaving} disabled={!company || !policyNum} onPress={() => void handleSave()} theme={theme} testID="add-save" />}
      testID="insurance-add-policy"
    >
      <Button label={k('insurance.add.scan')} variant="outline" fullWidth loading={isScanning} onPress={() => void handleScanCard()} theme={theme} testID="add-scan" />
      {notice ? <Notice tone={notice.tone} text={notice.text} testID="add-notice" /> : null}
      <Section title={k('insurance.add.company')}>
        {companies.length === 0 ? <Notice tone="info" text={k('insurance.add.noCompanies')} /> : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {companies.map((c) => (
            <Chip key={c.id} label={pickLocalized(c.name_ar, c.name_en) || c.code || ''} selected={company === c.id} onPress={() => setCompany(c.id)} theme={theme} testID={`add-company-${c.id}`} />
          ))}
        </View>
      </Section>
      <Section title={k('insurance.add.details')}>
        <Input label={k('insurance.add.policyNumber')} placeholder={k('insurance.add.policyNumberHint')} value={policyNum} onChange={setPolicyNum} theme={theme} testID="add-policy-number" />
        <Input label={k('insurance.add.memberId')} placeholder={k('insurance.add.memberIdHint')} value={memberId} onChange={setMemberId} theme={theme} testID="add-member-id" />
        <Input label={k('insurance.add.memberName')} placeholder={k('insurance.add.memberNameHint')} value={memberName} onChange={setMemberName} theme={theme} testID="add-member-name" />
        <Input label={k('insurance.add.expiry')} placeholder={k('insurance.add.expiryHint')} value={expiry} onChange={setExpiry} theme={theme} testID="add-expiry" />
      </Section>
    </InsuranceScreen>
  );
}
