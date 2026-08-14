import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, TextInput, Switch, Image, Linking } from 'react-native';
import client from '../../api/client';
import { NHeader, NCard, NBtn, NScroll } from '../../components/ui';
import { useTheme, useLang, useToast } from '../../context';
import { FS, FW, R, SP } from '../../constants';
import { I } from '../../components/icons';

export function NursingFieldOps({ order, onBack, onRefresh }: { order: any, onBack: () => void, onRefresh: () => void }) {
  const { theme } = useTheme();
  const { lang } = useLang();
  const { show } = useToast();
  const AR = lang === 'ar';

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'map' | 'vitals' | 'notes' | 'emergency'>('map');

  // Visit states
  const [currentState, setCurrentState] = useState(order?.state || 'CONFIRMED');
  const [distance, setDistance] = useState(order?.distance || 1.2); // distance in km
  
  // Checklist (Module 9)
  const [checklist, setChecklist] = useState({ meds: false, supplies: false, reachable: false, location: false });
  const checklistComplete = Object.values(checklist).every(v => v);

  // No-Show Timer
  const [noShowMinutesLeft, setNoShowMinutesLeft] = useState(10);

  // Vitals (Module 14)
  const [vitals, setVitals] = useState({ bp: '', hr: '', rr: '', temp: '', spo2: '', blood_sugar: '', pain_scale: '' });

  // Clinical Notes (Module 10)
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [recommendations, setRecommendations] = useState('');

  // Signature
  const [signature, setSignature] = useState(false);

  // Emergency (Pillar 5)
  const [emergencyReason, setEmergencyReason] = useState('');

  useEffect(() => {
    // Dynamic distance tracking if in transit
    let interval: any;
    if (currentState === 'IN_TRANSIT') {
      interval = setInterval(() => {
        setDistance((d: number) => Math.max(0.1, d - 0.1));
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [currentState]);

  useEffect(() => {
    // Patient wait timer
    let interval: any;
    if (currentState === 'ARRIVED' && noShowMinutesLeft > 0) {
      interval = setInterval(() => {
        setNoShowMinutesLeft(prev => prev - 1);
      }, 60000); // every minute
    }
    return () => clearInterval(interval);
  }, [currentState, noShowMinutesLeft]);

  const updateState = async (endpoint: string, payload: any = {}) => {
    setLoading(true);
    try {
      const res = await client.post(`/nursing/visits/${order.id}/${endpoint}`, payload);
      setCurrentState(res.data.state);
      show(AR ? 'تم تحديث الحالة بنجاح' : 'State updated successfully', 'success');
      onRefresh();
      if (['COMPLETED', 'NO_SHOW', 'ESCALATED_EMERGENCY'].includes(res.data.state)) {
        onBack();
      }
    } catch (err: any) {
      show(err.response?.data?.message || err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleStartTransit = () => {
    if (!checklistComplete) {
      show(AR ? 'يرجى إكمال القائمة المرجعية أولاً' : 'Please complete the pre-visit checklist', 'error');
      return;
    }
    updateState('transit');
  };

  const handleArrive = () => {
    if (distance > 0.5) {
      show(AR ? 'أنت بعيد عن الموقع (يجب أن تكون المسافة أقل من 500 متر)' : 'You are too far from the location (< 500m required)', 'error');
      return;
    }
    updateState('arrive', { lat: 24.71, lng: 46.67 });
  };

  const renderChecklist = () => (
    <NCard style={{ marginBottom: SP.lg }}>
      <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text, marginBottom: SP.md, textAlign: AR ? 'right' : 'left' }}>
        {AR ? 'قائمة ما قبل التحرك (Checklist)' : 'Pre-Visit Checklist'}
      </Text>
      {[
        { key: 'meds', ar: 'الأدوية متوفرة عند المريض', en: 'Medications available at patient' },
        { key: 'supplies', ar: 'المستلزمات الطبية جاهزة معي', en: 'Medical supplies ready with me' },
        { key: 'reachable', ar: 'المريض يتجاوب على الهاتف', en: 'Patient is reachable' },
        { key: 'location', ar: 'تم تأكيد الموقع والبوابة', en: 'Location and gate confirmed' },
      ].map(item => (
        <View key={item.key} style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SP.sm }}>
          <Text style={{ color: theme.text, fontSize: FS.sm }}>{AR ? item.ar : item.en}</Text>
          <Switch 
            value={(checklist as any)[item.key]} 
            onValueChange={(val) => setChecklist(prev => ({ ...prev, [item.key]: val }))} 
            trackColor={{ true: theme.primary }} 
          />
        </View>
      ))}
    </NCard>
  );

  const renderMapAndOps = () => (
    <View>
      {currentState === 'CONFIRMED' && renderChecklist()}
      
      <NCard style={{ marginBottom: SP.lg, padding: 0, overflow: 'hidden' }}>
        <View style={{ height: 250, backgroundColor: theme.surface2, alignItems: 'center', justifyContent: 'center' }}>
          <I name="map" size={64} color={theme.textSub} />
          <Text style={{ color: theme.textSub, marginTop: SP.md }}>{AR ? 'خريطة التتبع المباشر (GPS)' : 'Live GPS Map'}</Text>
          <Text style={{ color: theme.primary, fontSize: FS.lg, fontWeight: FW.bold, marginTop: SP.sm }}>
            {distance.toFixed(2)} {AR ? 'كم متبقي' : 'km remaining'}
          </Text>
        </View>
        <View style={{ padding: SP.md, flexDirection: AR ? 'row-reverse' : 'row', gap: SP.sm }}>
          <NBtn 
            label={AR ? 'فتح في خرائط جوجل' : 'Open Google Maps'} 
            variant="outline" 
            onPress={() => { Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order?.address || 'Riyadh')}`); }}
            style={{ flex: 1 }} 
          />
        </View>
      </NCard>

      {currentState === 'CONFIRMED' && (
        <NBtn label={AR ? 'بدء التحرك' : 'Start Transit'} loading={loading} onPress={handleStartTransit} disabled={!checklistComplete} />
      )}

      {currentState === 'IN_TRANSIT' && (
        <NBtn 
          label={AR ? 'تم الوصول للموقع' : 'Arrived at Location'} 
          loading={loading} 
          onPress={handleArrive} 
          disabled={distance > 0.5} 
          style={{ backgroundColor: distance > 0.5 ? theme.surface2 : theme.success }}
        />
      )}

      {currentState === 'ARRIVED' && (
        <View style={{ gap: SP.md }}>
          <NBtn label={AR ? 'بدء تقديم الرعاية' : 'Start Care'} loading={loading} onPress={() => updateState('start-care')} />
          <NCard style={{ backgroundColor: theme.danger + '20', borderColor: theme.danger }}>
            <Text style={{ color: theme.danger, textAlign: AR ? 'right' : 'left', marginBottom: SP.sm, fontWeight: FW.bold }}>
              {AR ? 'مؤقت عدم الحضور: ' : 'No-Show Timer: '} {noShowMinutesLeft} {AR ? 'دقيقة متبقية' : 'min left'}
            </Text>
            <NBtn 
              label={AR ? 'تسجيل عدم حضور المريض' : 'Mark Patient No-Show'} 
              variant="danger" 
              loading={loading} 
              onPress={() => updateState('no-show')} 
              disabled={noShowMinutesLeft > 0} 
            />
          </NCard>
        </View>
      )}

      {currentState === 'CARE_IN_PROGRESS' && (
        <NCard style={{ backgroundColor: theme.primaryLight, borderColor: theme.primary }}>
          <Text style={{ color: theme.text, textAlign: AR ? 'right' : 'left', fontWeight: FW.bold, fontSize: FS.md }}>
            {AR ? 'الرعاية قيد التنفيذ الآن.' : 'Care is in progress.'}
          </Text>
          <Text style={{ color: theme.textSub, textAlign: AR ? 'right' : 'left', marginTop: SP.sm }}>
            {AR ? 'يرجى توثيق العلامات الحيوية والملاحظات في التبويبات أعلاه قبل الإنهاء.' : 'Please document vitals and notes before completing.'}
          </Text>
        </NCard>
      )}
    </View>
  );

  const renderVitals = () => (
    <View style={{ gap: SP.md }}>
      <Text style={{ color: theme.text, fontWeight: FW.bold, fontSize: FS.md, textAlign: AR ? 'right' : 'left', marginBottom: SP.sm }}>
        {AR ? 'العلامات الحيوية (Vitals)' : 'Vitals'}
      </Text>
      <TextInput placeholder="Blood Pressure (e.g. 120/80)" value={vitals.bp} onChangeText={t => setVitals({...vitals, bp: t})} style={[styles.input, { borderColor: theme.border, color: theme.text, textAlign: AR ? 'right' : 'left' }]} placeholderTextColor={theme.textSub} />
      <TextInput placeholder="Heart Rate (bpm)" value={vitals.hr} onChangeText={t => setVitals({...vitals, hr: t})} keyboardType="numeric" style={[styles.input, { borderColor: theme.border, color: theme.text, textAlign: AR ? 'right' : 'left' }]} placeholderTextColor={theme.textSub} />
      <TextInput placeholder="Temperature (°C)" value={vitals.temp} onChangeText={t => setVitals({...vitals, temp: t})} keyboardType="numeric" style={[styles.input, { borderColor: theme.border, color: theme.text, textAlign: AR ? 'right' : 'left' }]} placeholderTextColor={theme.textSub} />
      <TextInput placeholder="SpO2 (%)" value={vitals.spo2} onChangeText={t => setVitals({...vitals, spo2: t})} keyboardType="numeric" style={[styles.input, { borderColor: theme.border, color: theme.text, textAlign: AR ? 'right' : 'left' }]} placeholderTextColor={theme.textSub} />
      <TextInput placeholder="Pain Scale (0-10)" value={vitals.pain_scale} onChangeText={t => setVitals({...vitals, pain_scale: t})} keyboardType="numeric" style={[styles.input, { borderColor: theme.border, color: theme.text, textAlign: AR ? 'right' : 'left' }]} placeholderTextColor={theme.textSub} />
    </View>
  );

  const renderNotes = () => (
    <View style={{ gap: SP.md }}>
      <Text style={{ color: theme.text, fontWeight: FW.bold, fontSize: FS.md, textAlign: AR ? 'right' : 'left', marginBottom: SP.sm }}>
        {AR ? 'الملاحظات السريرية (Clinical Notes)' : 'Clinical Notes'}
      </Text>
      <TextInput 
        placeholder={AR ? "ملاحظات الإجراء وما تم تنفيذه..." : "Procedure notes..."} 
        value={clinicalNotes} onChangeText={setClinicalNotes} 
        multiline style={[styles.input, { height: 100, borderColor: theme.border, color: theme.text, textAlign: AR ? 'right' : 'left' }]} 
        placeholderTextColor={theme.textSub} 
      />
      <TextInput 
        placeholder={AR ? "التوصيات وخطة المتابعة..." : "Recommendations and follow-up..."} 
        value={recommendations} onChangeText={setRecommendations} 
        multiline style={[styles.input, { height: 80, borderColor: theme.border, color: theme.text, textAlign: AR ? 'right' : 'left' }]} 
        placeholderTextColor={theme.textSub} 
      />
      
      <NCard style={{ alignItems: 'center', padding: SP.xl, borderStyle: 'dashed' }}>
        <I name="camera-outline" size={32} color={theme.textSub} />
        <Text style={{ color: theme.textSub, marginTop: SP.sm }}>{AR ? 'التقاط صور التوثيق المشفرة' : 'Capture Encrypted Documentation'}</Text>
      </NCard>

      <Text style={{ color: theme.text, fontWeight: FW.bold, fontSize: FS.md, textAlign: AR ? 'right' : 'left', marginTop: SP.lg }}>
        {AR ? 'توقيع المريض' : 'Patient Signature'}
      </Text>
      <View style={{ height: 150, backgroundColor: theme.surface2, borderRadius: R.md, borderWidth: 1, borderColor: theme.border, alignItems: 'center', justifyContent: 'center' }}>
        {signature ? (
           <Text style={{ color: theme.success, fontWeight: FW.bold }}>{AR ? 'تم التوقيع ✓' : 'Signed ✓'}</Text>
        ) : (
          <TouchableOpacity onPress={() => setSignature(true)} style={{ padding: SP.md }}>
             <Text style={{ color: theme.primary }}>{AR ? 'اضغط هنا لفتح لوحة التوقيع' : 'Tap to open signature canvas'}</Text>
          </TouchableOpacity>
        )}
      </View>

      <NBtn 
        label={AR ? 'إنهاء الزيارة وحفظ التقرير' : 'Complete Visit & Save Report'} 
        loading={loading} 
        onPress={() => updateState('complete', { vitals, clinical_notes: clinicalNotes, recommendations, signature_base64: 'signed' })} 
        disabled={!signature} 
        style={{ marginTop: SP.xl }}
      />
    </View>
  );

  const renderEmergency = () => (
    <View style={{ gap: SP.md }}>
      <NCard style={{ backgroundColor: theme.danger + '10', borderColor: theme.danger, borderWidth: 2 }}>
        <Text style={{ color: theme.danger, fontWeight: FW.bold, fontSize: FS.lg, textAlign: AR ? 'right' : 'left', marginBottom: SP.sm }}>
          🚨 {AR ? 'تصعيد طبي طارئ' : 'Emergency Escalation'}
        </Text>
        <Text style={{ color: theme.text, textAlign: AR ? 'right' : 'left', marginBottom: SP.md, lineHeight: 22 }}>
          {AR ? 'استخدم هذا الخيار فقط في حال العثور على المريض في حالة صحية حرجة تستدعي النقل للمستشفى وتتجاوز الرعاية المنزلية. سيتم إيقاف الزيارة ورد المبلغ تلقائياً للمريض.' 
             : 'Use this ONLY if patient is found in a critical condition requiring hospital transfer. Visit will be aborted and patient fully refunded.'}
        </Text>
        <TextInput 
          placeholder={AR ? "سبب الإلغاء الطارئ..." : "Reason for emergency abort..."} 
          value={emergencyReason} onChangeText={setEmergencyReason} 
          multiline style={[styles.input, { height: 80, borderColor: theme.danger, color: theme.text, textAlign: AR ? 'right' : 'left', backgroundColor: theme.bg }]} 
          placeholderTextColor={theme.textSub} 
        />
        <NBtn 
          label={AR ? 'تأكيد الإلغاء الطارئ' : 'Confirm Emergency Abort'} 
          variant="danger" 
          loading={loading} 
          onPress={() => updateState('emergency-abort', { reason: emergencyReason })} 
          disabled={!emergencyReason} 
          style={{ marginTop: SP.md }}
        />
      </NCard>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <NHeader title={`${AR ? 'العمليات الميدانية:' : 'Field Ops:'} ${order.id || 'ORD'}`} onBack={onBack} />
      
      {/* Tabs */}
      <View style={{ flexDirection: AR ? 'row-reverse' : 'row', borderBottomWidth: 1, borderBottomColor: theme.border, backgroundColor: theme.surface }}>
        {[
          { key: 'map', icon: 'navigate', label: AR ? 'التتبع' : 'Map' },
          { key: 'vitals', icon: 'pulse', label: AR ? 'العلامات' : 'Vitals' },
          { key: 'notes', icon: 'document-text', label: AR ? 'التقرير' : 'Notes' },
          { key: 'emergency', icon: 'warning', label: AR ? 'طوارئ' : 'SOS' },
        ].map(t => {
          const isActive = activeTab === t.key;
          return (
            <TouchableOpacity 
              key={t.key} 
              onPress={() => setActiveTab(t.key as any)}
              style={{ flex: 1, alignItems: 'center', paddingVertical: SP.md, borderBottomWidth: 2, borderBottomColor: isActive ? theme.primary : 'transparent' }}
            >
              <I name={t.icon} size={20} color={isActive ? theme.primary : theme.textSub} />
              <Text style={{ fontSize: FS.xs, color: isActive ? theme.primary : theme.textSub, marginTop: 4, fontWeight: isActive ? FW.bold : FW.reg }}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={{ padding: SP.lg, paddingBottom: 100 }}>
        {activeTab === 'map' && renderMapAndOps()}
        {activeTab === 'vitals' && renderVitals()}
        {activeTab === 'notes' && renderNotes()}
        {activeTab === 'emergency' && renderEmergency()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderRadius: R.md,
    padding: SP.md,
    fontSize: FS.md,
  }
});
