import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import client from '../../api/client';
import { useTheme, useLang } from '../../context';
import { NToggle, NInput, NPriceInput } from '../../components/ui';
import { SP, R, FS, FW } from '../../constants';
import type { OwnDeliveryForm as Form } from './ownDelivery';

type District = { code: string; name_ar: string; name_en: string };

/**
 * "I deliver with my own couriers" with its zone (a radius, or districts of the pharmacy's city), fee and free-delivery threshold.
 * Used in the pharmacy onboarding and in the pharmacy settings; the districts are the same location data as the GeoPicker.
 */
export function OwnDeliveryFields({ value, onChange, cityCode }: { value: Form; onChange: (patch: Partial<Form>) => void; cityCode?: string }) {
  const { theme } = useTheme();
  const { lang, t } = useLang();
  const AR = lang === 'ar';
  const [districts, setDistricts] = useState<District[]>([]);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    if (!value.enabled || value.zoneType !== 'districts' || !cityCode) { setDistricts([]); return; }
    let live = true;
    setLoadFailed(false);
    client.get('/locations/districts', { params: { city: cityCode } })
      .then((r: any) => { const d = r?.data; if (live) setDistricts(Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : []); })
      .catch(() => { if (live) setLoadFailed(true); });
    return () => { live = false; };
  }, [value.enabled, value.zoneType, cityCode]);

  const toggleDistrict = (code: string) =>
    onChange({ districts: value.districts.includes(code) ? value.districts.filter((c) => c !== code) : [...value.districts, code] });
  const row = { flexDirection: AR ? 'row-reverse' : 'row', gap: SP.sm, flexWrap: 'wrap' } as const;
  const txt = { textAlign: AR ? 'right' : 'left' } as const;
  const chip = (on: boolean) => ({ paddingVertical: SP.sm, paddingHorizontal: SP.md, borderRadius: R.md, borderWidth: 1, borderColor: on ? theme.primary : theme.border, backgroundColor: on ? theme.primaryLight : theme.bg });

  return (
    <View style={{ gap: SP.md }}>
      <NToggle label={t('pharmacy.ownDelivery.toggle')} sub={t('pharmacy.ownDelivery.toggleSub')} value={value.enabled} onChange={(v: boolean) => onChange({ enabled: v })} />
      {value.enabled ? (
        <View style={{ gap: SP.md }}>
          <Text style={[{ fontSize: FS.sm, fontWeight: FW.bold, color: theme.text }, txt]}>{t('pharmacy.ownDelivery.zone')}</Text>
          <View style={row}>
            {(['radius', 'districts'] as const).map((z) => (
              <TouchableOpacity key={z} accessibilityRole="button" accessibilityState={{ selected: value.zoneType === z }} onPress={() => onChange({ zoneType: z })} style={chip(value.zoneType === z)}>
                <Text style={{ color: value.zoneType === z ? theme.primary : theme.text }}>{t(z === 'radius' ? 'pharmacy.ownDelivery.zoneRadius' : 'pharmacy.ownDelivery.zoneDistricts')}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {value.zoneType === 'radius' ? (
            <NInput label={t('pharmacy.ownDelivery.radius')} value={value.radius} onChange={(v: string) => onChange({ radius: v.replace(/[^0-9.]/g, '') })} kbType="numeric" />
          ) : !cityCode ? (
            <Text style={[{ fontSize: FS.xs, color: theme.textSub }, txt]}>{t('pharmacy.ownDelivery.needCity')}</Text>
          ) : loadFailed ? (
            <Text style={[{ fontSize: FS.xs, color: theme.danger }, txt]}>{t('pharmacy.ownDelivery.districtsFailed')}</Text>
          ) : (
            <View style={row}>
              {districts.map((d) => {
                const on = value.districts.includes(d.code);
                return (
                  <TouchableOpacity key={d.code} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => toggleDistrict(d.code)} style={chip(on)}>
                    <Text style={{ color: on ? theme.primary : theme.text }}>{AR ? d.name_ar : d.name_en}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
          <NPriceInput label={t('pharmacy.ownDelivery.fee')} value={value.fee} onChange={(v: string) => onChange({ fee: v })} />
          <NPriceInput label={t('pharmacy.ownDelivery.freeOver')} value={value.freeOver} onChange={(v: string) => onChange({ freeOver: v })} />
          <Text style={[{ fontSize: FS.xs, color: theme.textSub }, txt]}>{t('pharmacy.ownDelivery.note')}</Text>
        </View>
      ) : (
        <Text style={[{ fontSize: FS.xs, color: theme.textSub }, txt]}>{t('pharmacy.ownDelivery.platformNote')}</Text>
      )}
    </View>
  );
}
