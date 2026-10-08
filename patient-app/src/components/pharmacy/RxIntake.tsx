import React, { useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

import { Button, FIcon, Input, StickyFooter } from '../../../../packages/ui-native/src';
import { Glyph, Notice, PHARMACY_TONE, PickButton } from './PharmacyKit';
import { COLUMN, step as scale, useScreenUi } from '../screen/ScreenKit';
import { apiFetch } from '../../utils/api';
import { logError } from '../../utils/logger';

/**
 * The photo and upload ways in of "order with a prescription" (board RxUpload, canvas/RxUpload.dc.html; the old
 * scan-prescription screen): the dashed zone with the picker of the chosen way (camera or photos), the chosen photo as an
 * attachment that can be removed, an optional note for the pharmacist and the sticky button. Nothing is sent until the
 * button is pressed: the photo is read (POST /ai/prescription-ocr), the prescription is saved (POST /prescriptions/upload)
 * and the screen moves to the prescription (`prescriptionId` in the URL), where the saved lines are shown. Permission
 * refusals are shown as a notice with the way to the phone's settings.
 */

type Chosen = { uri: string; base64: string };
type Problem = 'read' | 'pick' | 'save' | null;

// the tag staff read next to the patient's own note (not shown to the patient)
const OCR_TAG = 'OCR extraction; requires pharmacy review'; // i18n-ok: stored with the prescription for pharmacy staff, not UI text

export function useRxPhotoIntake(via: 'photo' | 'upload'): { body: React.ReactNode; footer: React.ReactNode } {
  const { theme, t, c, dir, flow, k } = useScreenUi();
  const [chosen, setChosen] = useState<Chosen | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<Problem>(null);
  const [denied, setDenied] = useState<'camera' | 'library' | null>(null);

  const pick = async (camera: boolean) => {
    setProblem(null);
    setDenied(null);
    try {
      const permission = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setDenied(camera ? 'camera' : 'library');
        return;
      }
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.8, base64: true };
      const result = camera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset?.uri || !asset.base64) {
        setProblem('read');
        return;
      }
      setChosen({ uri: asset.uri, base64: asset.base64 });
    } catch (e) {
      logError('pharmacy:rx-intake:pick', e);
      setProblem('pick');
    }
  };

  const save = async () => {
    if (!chosen || saving) return;
    setSaving(true);
    setProblem(null);
    try {
      const image = `data:image/jpeg;base64,${chosen.base64}`;
      const ocr = await apiFetch<{ items?: unknown[] }>('/ai/prescription-ocr', { method: 'POST', body: JSON.stringify({ image_base64: image }) });
      const typed = note.trim();
      const saved = await apiFetch<{ id?: string; data?: { id?: string } }>('/prescriptions/upload', {
        method: 'POST',
        body: JSON.stringify({ upload_image: image, items: Array.isArray(ocr?.items) ? ocr.items : [], notes: typed ? `${OCR_TAG}\n${typed}` : OCR_TAG }),
      });
      const id = saved?.data?.id || saved?.id;
      if (!id) throw new Error('prescription_id_missing');
      router.replace({ pathname: '/pharmacy/rx-order', params: { prescriptionId: String(id) } });
    } catch (e) {
      logError('pharmacy:rx-intake:save', e);
      setProblem('save');
    } finally {
      setSaving(false);
    }
  };

  const footer = (
    <StickyFooter theme={theme} direction={dir}>
      <View style={{ ...COLUMN, gap: 8 }}>
        {saving ? <Text accessibilityLiveRegion="polite" style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, textAlign: 'center' }}>{k('pharmacy.scan.saving')}</Text> : null}
        <Button label={k('pharmacy.scan.save')} size="lg" fullWidth disabled={!chosen} loading={saving} onPress={() => void save()} testID="scan-save" theme={theme} />
      </View>
    </StickyFooter>
  );

  const body = (
    <View style={{ gap: 16 }}>
      {/* the dashed upload zone */}
      <View style={{ borderRadius: 28, borderWidth: 2, borderStyle: 'dashed', borderColor: c.border.strong, backgroundColor: c.bg.surface, padding: 20, alignItems: 'center', gap: 12 }}>
        <FIcon icon="prescription" tone={PHARMACY_TONE} size={72} theme={theme} />
        <Text style={{ ...scale(t, 'bodyStrong'), color: c.text.primary, textAlign: 'center' }}>{via === 'photo' ? k('pharmacy.rx.zonePhoto') : k('pharmacy.rx.zoneUpload')}</Text>
        <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, textAlign: 'center' }}>{k('pharmacy.scan.zoneHint')}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 4 }}>
          {via === 'photo' ? (
            <PickButton name="camera" label={k('pharmacy.scan.camera')} ink disabled={saving} onPress={() => void pick(true)} />
          ) : (
            <PickButton name="image" label={k('pharmacy.scan.photos')} ink disabled={saving} onPress={() => void pick(false)} />
          )}
        </View>
      </View>

      {denied ? (
        <Notice
          tone="warning"
          icon="warning"
          title={denied === 'camera' ? k('pharmacy.scan.permCameraTitle') : k('pharmacy.scan.permPhotosTitle')}
          body={denied === 'camera' ? k('pharmacy.scan.permCameraBody') : k('pharmacy.scan.permPhotosBody')}
          actionLabel={k('pharmacy.openSettings')}
          onAction={() => void Linking.openSettings()}
        />
      ) : null}

      {problem === 'save' ? <Notice tone="danger" icon="warning" title={k('pharmacy.scan.errorTitle')} body={k('pharmacy.scan.errorBody')} /> : null}
      {problem === 'read' ? <Notice tone="danger" icon="warning" title={k('pharmacy.scan.readError')} /> : null}
      {problem === 'pick' ? <Notice tone="danger" icon="warning" title={k('pharmacy.scan.pickError')} /> : null}

      {/* the chosen photo */}
      {chosen ? (
        <View style={{ gap: 10 }}>
          <Text accessibilityRole="header" style={{ ...scale(t, 'h4'), color: c.text.primary, ...flow }}>{k('pharmacy.scan.attachments')}</Text>
          <View style={{ flexDirection: 'row' }}>
            <View style={{ width: 92, height: 112, borderRadius: 18, backgroundColor: c.bg.media, overflow: 'hidden' }}>
              <Image source={{ uri: chosen.uri }} accessibilityLabel={k('pharmacy.scan.preview')} contentFit="cover" style={{ width: '100%', height: '100%' }} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={k('pharmacy.scan.remove')}
                disabled={saving}
                onPress={() => setChosen(null)}
                hitSlop={8}
                style={{ position: 'absolute', top: 6, end: 6, width: 28, height: 28, borderRadius: 14, backgroundColor: c.bg.surface, alignItems: 'center', justifyContent: 'center' }}
              >
                <Glyph name="x-circle" size={16} color={c.icon.primary} />
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}

      <Input label={k('pharmacy.scan.noteLabel')} placeholder={k('pharmacy.scan.notePlaceholder')} value={note} onChange={setNote} multiline rows={3} disabled={saving} testID="scan-note" theme={theme} />

      <Text style={{ ...scale(t, 'meta', 'regular'), lineHeight: 20, color: c.text.secondary, textAlign: 'center' }}>{k('pharmacy.scan.privacy')}</Text>
    </View>
  );

  return { body, footer };
}
