import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { useTheme, useLang, useToast } from '../../context';
import { NHeader, NCard, NBtn, NSecHeader, NScroll, NBadge, NInput } from '../../components/ui';
import { SP, FS, FW, R } from '../../constants';
import { FacilityResource } from '../../types/FacilityTypes';

export function FacilityResourcesScreen({ onBack }: { onBack: () => void }) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const { show } = useToast();
  const AR = lang === 'ar';

  const [resources, setResources] = useState<FacilityResource[]>([
    {
      id: 'or-1',
      facility_id: 'fac-1',
      branch_id: 'branch-1',
      name_en: 'Operating Room A (Cardiology)',
      name_ar: 'غرفة عمليات أ (قلب)',
      type: 'or',
      status: 'active',
      capacity: 1
    },
    {
      id: 'clinic-1',
      facility_id: 'fac-1',
      branch_id: 'branch-1',
      name_en: 'Clinic 101 (Dental)',
      name_ar: 'عيادة 101 (أسنان)',
      type: 'consultation',
      status: 'active',
      capacity: 1
    },
    {
      id: 'mri-1',
      facility_id: 'fac-1',
      branch_id: 'branch-1',
      name_en: 'MRI Scanner - Ground Floor',
      name_ar: 'جهاز رنين مغناطيسي - الطابق الأرضي',
      type: 'other',
      status: 'maintenance',
      capacity: 1
    }
  ]);

  const [filterType, setFilterType] = useState<string>('all');
  
  const filtered = filterType === 'all' ? resources : resources.filter(r => r.type === filterType);

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={AR ? 'إدارة الموارد' : 'Resource Management'} onBack={onBack} />
      
      <View style={{ flexDirection: AR ? 'row-reverse' : 'row', padding: SP.md, gap: SP.sm, backgroundColor: theme.surface }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[
            { id: 'all', ar: 'الكل', en: 'All' },
            { id: 'or', ar: 'غرف العمليات', en: 'ORs' },
            { id: 'consultation', ar: 'العيادات', en: 'Clinics' },
            { id: 'other', ar: 'المعدات والأجهزة', en: 'Equipment' },
          ].map(f => (
            <TouchableOpacity key={f.id} onPress={() => setFilterType(f.id)}
              style={{
                paddingHorizontal: SP.md, paddingVertical: 6, borderRadius: R.full, marginRight: SP.sm,
                backgroundColor: filterType === f.id ? theme.primary : theme.surface2,
              }}>
              <Text style={{ fontSize: FS.xs, color: filterType === f.id ? '#FFF' : theme.text }}>
                {AR ? f.ar : f.en}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <NScroll>
        <View style={{ padding: SP.xl }}>
          <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SP.lg }}>
            <NSecHeader title={AR ? 'الموارد المسجلة' : 'Registered Resources'} />
            <TouchableOpacity style={{ padding: SP.xs }}>
              <Text style={{ color: theme.primary, fontWeight: FW.bold }}>{AR ? '+ إضافة مورد' : '+ Add Resource'}</Text>
            </TouchableOpacity>
          </View>

          {filtered.map(res => (
            <NCard key={res.id} style={{ marginBottom: SP.md }}>
              <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, textAlign: AR ? 'right' : 'left' }}>
                    {AR ? res.name_ar : res.name_en}
                  </Text>
                  <Text style={{ fontSize: FS.xs, color: theme.textSub, marginTop: 4, textAlign: AR ? 'right' : 'left' }}>
                    {AR 
                      ? (res.type === 'or' ? 'غرفة عمليات' : res.type === 'consultation' ? 'عيادة' : 'معدات') 
                      : (res.type === 'or' ? 'Operating Room' : res.type === 'consultation' ? 'Clinic' : 'Equipment')}
                  </Text>
                </View>
                <NBadge 
                  label={res.status === 'active' ? (AR ? 'نشط' : 'Active') : (AR ? 'صيانة' : 'Maintenance')} 
                  variant={res.status === 'active' ? 'success' : 'warning'} 
                />
              </View>
              
              <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, marginTop: SP.md, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: SP.sm }}>
                <TouchableOpacity onPress={() => show(AR ? 'جدول المواعيد والتصوير محجوز بالكامل اليوم' : 'Resource calendar: All slots active today', 'info')}>
                  <Text style={{ fontSize: FS.xs, color: theme.primary, fontWeight: FW.bold }}>{AR ? 'التقويم (التعارضات)' : 'Calendar (Conflicts)'}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => show(AR ? 'خيارات تعديل السرير/الجهاز متاحة' : 'Resource edit active', 'info')}>
                  <Text style={{ fontSize: FS.xs, color: theme.textSub }}>{AR ? 'تعديل' : 'Edit'}</Text>
                </TouchableOpacity>
              </View>
            </NCard>
          ))}
        </View>
      </NScroll>
    </View>
  );
}
