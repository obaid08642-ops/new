// UI pieces shared by the registration wizards: document picker and tiles, the approval notice, the merged page.
import React, { useRef, useState } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useLang, useTheme, useToast } from '../../context';
import { NBtn, NHeader, NScroll, WizardSection } from '../../components/ui';
import { I, IBg } from '../../components/icons';
import { FS, FW, R, SP } from '../../constants';
import { useStepSaver } from './kit';
import type { Saver, StepProps, Uploader } from './kit';

/** Camera, gallery or file picker for one document field; the picked uri goes into `data[field]`. */
export function useDocumentPicker<T>(update: (patch: Partial<T>) => void) {
  const { lang } = useLang(); const AR = lang === 'ar';
  const { show } = useToast();
  return (field: keyof T) => {
    const attach = (uri: string) => {
      update({ [field]: uri } as unknown as Partial<T>);
      show(AR ? 'تم إرفاق المستند' : 'Document attached', 'success');
    };
    Alert.alert(
      AR ? 'إرفاق مستند' : 'Attach Document',
      AR ? 'اختر طريقة الرفع' : 'Choose upload method',
      [
        {
          text: AR ? 'الكاميرا' : 'Camera',
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') { show(AR ? 'صلاحية الكاميرا مطلوبة' : 'Camera permission required', 'error'); return; }
            const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
            if (!result.canceled) attach(result.assets[0].uri);
          },
        },
        {
          text: AR ? 'معرض الصور' : 'Photo Gallery',
          onPress: async () => {
            const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
            if (!result.canceled) attach(result.assets[0].uri);
          },
        },
        {
          text: AR ? 'ملفات / PDF' : 'Files / PDF',
          onPress: async () => {
            const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
            if (!result.canceled && result.assets && result.assets.length > 0) attach(result.assets[0].uri);
          },
        },
        { text: AR ? 'إلغاء' : 'Cancel', style: 'cancel' },
      ],
    );
  };
}

/** Square upload tile (grid of 2 or 3 per row). */
export function DocCard({ label, done, onPress, required }: { label: string; done: boolean; onPress: () => void; required?: boolean }) {
  const { theme } = useTheme(); const { lang } = useLang(); const AR = lang === 'ar';
  return (
    <TouchableOpacity onPress={onPress} style={{
      flex: 1, minHeight: 90, borderRadius: R.xl, borderWidth: 2, padding: SP.lg, marginHorizontal: 2,
      alignItems: 'center', justifyContent: 'center',
      backgroundColor: done ? theme.successBg : theme.surface2, borderColor: done ? theme.success : theme.border,
      borderStyle: done ? 'solid' : 'dashed',
    }}>
      <IBg name={done ? 'check' : 'upload'} size={16} color={done ? theme.success : theme.textSub} bg={done ? theme.successBg : theme.surface3} />
      <Text style={{ fontSize: FS.sm, color: done ? theme.success : theme.text, fontWeight: FW.semi, textAlign: 'center', marginTop: SP.xs }}>
        {label}{required && !done && <Text style={{ color: theme.danger }}> *</Text>}
      </Text>
      <Text style={{ fontSize: FS.xs, color: done ? theme.success : theme.textSub, marginTop: 2 }}>
        {done ? (AR ? 'تم الرفع' : 'Uploaded') : (AR ? 'اضغط للرفع' : 'Tap to upload')}
      </Text>
    </TouchableOpacity>
  );
}

/** Full-width upload row with an optional hint. */
export function DocBtn({ label, desc, done, onPress }: { label: string; desc?: string; done: boolean; onPress: () => void }) {
  const { theme } = useTheme();
  return (
    <TouchableOpacity onPress={onPress} style={{
      padding: SP.lg, borderWidth: 2, borderStyle: 'dashed', borderRadius: R.lg, alignItems: 'center', marginBottom: SP.md,
      borderColor: done ? theme.success : theme.border, backgroundColor: done ? theme.successBg : theme.surface2,
    }}>
      <I name={done ? 'checkCircle' : 'upload'} size={24} color={done ? theme.success : theme.primary} />
      <Text style={{ fontSize: FS.sm, fontWeight: FW.bold, color: done ? theme.success : theme.text, marginTop: SP.sm }}>{label}</Text>
      {desc ? <Text style={{ fontSize: FS.xs, color: theme.textSub, marginTop: 4 }}>{desc}</Text> : null}
    </TouchableOpacity>
  );
}

export interface NoticeText { titleAr: string; titleEn: string; p1Ar: string; p1En: string; p2Ar: string; p2En: string }

/** "Nothing goes live before the admin approves it": the notice every registration shows once. */
export function ApprovalNotice({ text }: { text: NoticeText }) {
  const { theme } = useTheme(); const { lang } = useLang(); const AR = lang === 'ar';
  const align = AR ? 'right' : 'left';
  return (
    <View style={{ backgroundColor: theme.dangerBg, padding: SP.xl, borderRadius: R.lg, borderWidth: 1, borderColor: theme.danger, marginTop: SP.lg }}>
      <View style={{ alignSelf: 'center', marginBottom: SP.md }}><I name="info" size={40} color={theme.danger} /></View>
      <Text style={{ fontSize: FS.lg, fontWeight: FW.bold, color: theme.danger, textAlign: 'center', marginBottom: SP.md }}>{AR ? text.titleAr : text.titleEn}</Text>
      <Text style={{ fontSize: FS.md, color: theme.text, textAlign: align, lineHeight: 24, marginBottom: SP.md }}>{AR ? text.p1Ar : text.p1En}</Text>
      {(AR ? text.p2Ar : text.p2En) ? <Text style={{ fontSize: FS.md, color: theme.text, textAlign: align, lineHeight: 24 }}>{AR ? text.p2Ar : text.p2En}</Text> : null}
    </View>
  );
}

/** The notice as a wizard section (nothing to save). */
export function NoticeSection<T>({ text, submitRef }: { text: NoticeText } & Pick<StepProps<T>, 'submitRef'>) {
  useStepSaver(submitRef, () => true);
  return <ApprovalNotice text={text} />;
}

// ─── Merged page ────────────────────────────────────────────────────────────────

export interface PageSection<T> {
  comp: React.ComponentType<StepProps<T>>;
  titleAr: string; titleEn: string;
}
export interface WizardPage<T> {
  titleAr: string; titleEn: string; subAr: string; subEn: string;
  sections: PageSection<T>[];
}

/** Stacks a page's sections and runs their savers in order; the first one that returns false keeps the person here. */
export function MergedPage<T>({ page, step, total, onBack, onNext, data, update, uploads }: {
  page: WizardPage<T>; step: number; total: number; onBack: () => void; onNext: () => void;
  data: T; update: (patch: Partial<T>) => void; uploads: Uploader;
}) {
  const { lang } = useLang(); const AR = lang === 'ar';
  const savers = useRef<Saver[]>([]);
  const [busy, setBusy] = useState(false);
  const go = async () => {
    if (busy) return;
    setBusy(true);
    try {
      for (let i = 0; i < page.sections.length; i++) {
        const ok = await savers.current[i]?.();
        if (ok === false) return; // the section already showed what is wrong
      }
      onNext();
    } finally { setBusy(false); }
  };
  return (
    <NScroll>
      <NHeader title={AR ? page.titleAr : page.titleEn} sub={AR ? page.subAr : page.subEn} step={step} total={total} onBack={onBack} />
      {page.sections.map((s, idx) => {
        const Comp = s.comp;
        return (
          <WizardSection key={idx} title={AR ? s.titleAr : s.titleEn}>
            <Comp submitRef={(fn: Saver) => { savers.current[idx] = fn; }} data={data} update={update} uploads={uploads} />
          </WizardSection>
        );
      })}
      <NBtn label={AR ? 'متابعة' : 'Next'} onPress={go} loading={busy} style={{ marginTop: SP.sm }} />
    </NScroll>
  );
}
