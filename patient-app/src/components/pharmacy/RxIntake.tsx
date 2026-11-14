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
import { useUploadsEnabled } from '../../hooks/useUploadsEnabled';
import { UploadsUnavailable } from '../UploadsUnavailable';

/**
 * The photo and upload ways in of "order with a prescription" (board RxUpload, canvas/RxUpload.dc.html; the old
 * scan-prescription screen): the dashed zone with the picker of the chosen way (camera or photos), the chosen photo as an
 * attachment that can be removed, an optional note for the pharmacist and the sticky button. Nothing is sent until the
 * button is pressed: the photo is read (POST /ai/prescription-ocr), the prescription is saved (POST /prescriptions/upload)
 * and the screen moves to the prescription (`prescriptionId` in the URL), where the saved lines are shown. Permission
 * refusals are shown as a notice with the way to the phone's settings.
 */

type Chosen = { uri: string; base64: string };
type Line = { name: string; quantity: string };
type Problem = 'read' | 'pick' | 'save' | 'unreadable' | null;

// the tag staff read next to the patient's own note (not shown to the patient)
const OCR_TAG = 'OCR extraction; requires pharmacy review'; // i18n-ok: stored with the prescription for pharmacy staff, not UI text

/** The OCR answers `{ raw_name_string, requested_quantity }` lines (needs-review #497); the review edits name and quantity. */
function ocrLines(items: unknown): Line[] {
  if (!Array.isArray(items)) return [];
  return items.slice(0, 50).flatMap((entry) => {
    const it = (entry && typeof entry === 'object' ? entry : {}) as Record<string, unknown>;
    const name = [it.raw_name_string, it.name, it.medicine_name, it.name_ar, it.name_en].find((v): v is string => typeof v === 'string' && v.trim().length > 0);
    if (!name) return [];
    const qty = Math.floor(Number(it.requested_quantity ?? it.quantity));
    return [{ name: name.trim().slice(0, 240), quantity: String(Number.isFinite(qty) && qty >= 1 ? Math.min(qty, 100) : 1) }];
  });
}

/** What is sent: trimmed, nameless lines dropped, quantity a whole number from 1 to 100 (the web does the same). */
export function cleanLines(lines: Line[]): Array<{ name: string; quantity: number }> {
  return lines.slice(0, 50).flatMap((line) => {
    const name = line.name.trim().slice(0, 240);
    if (!name) return [];
    const qty = Math.floor(Number(line.quantity));
    return [{ name, quantity: Number.isFinite(qty) && qty >= 1 ? Math.min(qty, 100) : 1 }];
  });
}

export function useRxPhotoIntake(via: 'photo' | 'upload'): { body: React.ReactNode; footer: React.ReactNode } {
  const { theme, t, c, dir, flow, k } = useScreenUi();
  const uploadsOn = useUploadsEnabled();
  const [chosen, setChosen] = useState<Chosen | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  // PT-27: the lines the OCR read, shown for correction; nothing is saved until the patient confirms them
  const [review, setReview] = useState<Line[] | null>(null);
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
      setReview(null);
      setChosen({ uri: asset.uri, base64: asset.base64 });
    } catch (e) {
      logError('pharmacy:rx-intake:pick', e);
      setProblem('pick');
    }
  };

  /** Step 1: read the photo. The lines go to the review below; nothing is saved yet (#1027: no lines, nothing to review). */
  const read = async () => {
    if (!chosen || saving) return;
    setSaving(true);
    setProblem(null);
    try {
      const image = `data:image/jpeg;base64,${chosen.base64}`;
      const ocr = await apiFetch<{ items?: unknown[] }>('/ai/prescription-ocr', { method: 'POST', body: JSON.stringify({ image_base64: image }) });
      const lines = ocrLines(ocr?.items);
      if (lines.length === 0) {
        setProblem('unreadable');
        return;
      }
      setReview(lines);
    } catch (e) {
      logError('pharmacy:rx-intake:read', e);
      setProblem('save');
    } finally {
      setSaving(false);
    }
  };

  /** Step 2: the corrected lines are what is saved for the pharmacist and the order. */
  const save = async () => {
    if (!chosen || !review || saving) return;
    const items = cleanLines(review);
    if (items.length === 0) return;
    setSaving(true);
    setProblem(null);
    try {
      const image = `data:image/jpeg;base64,${chosen.base64}`;
      const typed = note.trim();
      const saved = await apiFetch<{ id?: string; data?: { id?: string } }>('/prescriptions/upload', {
        method: 'POST',
        body: JSON.stringify({ upload_image: image, items, notes: typed ? `${OCR_TAG}\n${typed}` : OCR_TAG }),
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
        {review ? (
          <Button label={k('pharmacy.scan.confirm')} size="lg" fullWidth disabled={cleanLines(review).length === 0} loading={saving} onPress={() => void save()} testID="scan-confirm" theme={theme} />
        ) : (
          <Button label={k('pharmacy.scan.save')} size="lg" fullWidth disabled={!chosen} loading={saving} onPress={() => void read()} testID="scan-save" theme={theme} />
        )}
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
          {!uploadsOn ? <UploadsUnavailable /> : via === 'photo' ? (
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
      {problem === 'unreadable' ? <Notice tone="danger" icon="warning" title={k('pharmacy.scan.unreadable')} /> : null}
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
                onPress={() => { setChosen(null); setReview(null); }}
                hitSlop={8}
                style={{ position: 'absolute', top: 6, end: 6, width: 28, height: 28, borderRadius: 14, backgroundColor: c.bg.surface, alignItems: 'center', justifyContent: 'center' }}
              >
                <Glyph name="x-circle" size={16} color={c.icon.primary} />
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}

      {review ? (
        <View style={{ gap: 10 }}>
          <Text accessibilityRole="header" style={{ ...scale(t, 'h4'), color: c.text.primary, ...flow }}>{k('pharmacy.scan.linesTitle')}</Text>
          <Text style={{ ...scale(t, 'meta', 'regular'), color: c.text.secondary, ...flow }}>{k('pharmacy.scan.linesHint')}</Text>
          {review.map((line, index) => (
            <View key={index} style={{ gap: 8, padding: 12, borderRadius: 18, backgroundColor: c.bg.surface }}>
              <Input label={k('pharmacy.scan.lineName')} value={line.name} onChange={(value) => setReview(review.map((l, i) => (i === index ? { ...l, name: value.slice(0, 240) } : l)))} disabled={saving} testID={`scan-line-name-${index}`} theme={theme} />
              <Input label={k('pharmacy.scan.lineQuantity')} value={line.quantity} keyboardType="number" onChange={(value) => setReview(review.map((l, i) => (i === index ? { ...l, quantity: value.replace(/\D/g, '').slice(0, 3) } : l)))} disabled={saving} testID={`scan-line-qty-${index}`} theme={theme} />
              <Button label={k('pharmacy.scan.lineRemove')} size="sm" disabled={saving} onPress={() => setReview(review.filter((_, i) => i !== index))} testID={`scan-line-remove-${index}`} theme={theme} />
            </View>
          ))}
          {review.length < 50 ? <Button label={k('pharmacy.scan.lineAdd')} size="md" disabled={saving} onPress={() => setReview([...review, { name: '', quantity: '1' }])} testID="scan-line-add" theme={theme} /> : null}
          {cleanLines(review).length === 0 ? <Notice tone="danger" icon="warning" title={k('pharmacy.scan.linesEmpty')} /> : null}
        </View>
      ) : null}

      <Input label={k('pharmacy.scan.noteLabel')} placeholder={k('pharmacy.scan.notePlaceholder')} value={note} onChange={setNote} multiline rows={3} disabled={saving} testID="scan-note" theme={theme} />

      <Text style={{ ...scale(t, 'meta', 'regular'), lineHeight: 20, color: c.text.secondary, textAlign: 'center' }}>{k('pharmacy.scan.privacy')}</Text>
    </View>
  );

  return { body, footer };
}
