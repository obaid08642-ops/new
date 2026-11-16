/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║ NABDAH PLUS – AUTH SCREENS (COMPLETE) ║
 * ║ Splash · Welcome · Login · ForgotPassword · OTP · PendingApproval ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
import React, { useRef, useEffect, useState } from 'react';
import {
 View, Text, TouchableOpacity, ScrollView, StyleSheet,
 Animated, StatusBar, useWindowDimensions, KeyboardAvoidingView,
 Platform, Vibration, Alert, Modal, ActivityIndicator, TextInput
} from 'react-native';
import { useTheme, useLang, useAuth, useToast } from '../../context';
import {
 NBtn, NCard, NInput, NPhoneInput, NPassStrength,
 NCheckbox, NOTP, NStepBar, NDivider, NScroll, NLogo, NSheet, NThemeSlider
} from '../../components/ui';
import { I } from '../../components/icons';
import { Biometric, Validate, RateLimiter, buildHeaders, Vault, SK, Tokens } from '../../security/Security';
import { SP, R, FS, FW, PROVIDER_TYPES, LIMITS, API_BASE } from '../../constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tokens } from '../../theme/tokens';
import { timedFetch } from '../../api/timedFetch';


// ══════════════════════════════════════════════════════════
// SPLASH SCREEN
// ══════════════════════════════════════════════════════════
export function SplashScreen({ onDone }: { onDone: () => void }) {
 const { theme } = useTheme();
 const sc = useRef(new Animated.Value(0.5)).current;
 const op = useRef(new Animated.Value(0)).current;
 const op2 = useRef(new Animated.Value(0)).current;

 useEffect(() => {
 Animated.sequence([
 Animated.parallel([
 Animated.spring(sc, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
 Animated.timing(op, { toValue: 1, duration: 500, useNativeDriver: true }),
 ]),
 Animated.timing(op2, { toValue: 1, duration: 400, useNativeDriver: true }),
 ]).start(() => setTimeout(onDone, 900));
 }, []);

 return (
 <View style={{ flex: 1, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' }}>
 <StatusBar barStyle="light-content" />
 <Animated.View style={{ transform: [{ scale: sc }], opacity: op, alignItems: 'center' }}>
 <View style={{
 width: 100, height: 100, borderRadius: 32,
 backgroundColor: 'rgba(255,255,255,0.2)',
 alignItems: 'center', justifyContent: 'center',
 marginBottom: SP.xl,
 }}>
 <I name="heart" size={54} color="#FFF" />
 </View>
 </Animated.View>
 <Animated.View style={{ opacity: op2, alignItems: 'center' }}>
 <Text style={{ fontSize: FS['4xl'], fontWeight: FW.xbold, color: '#FFF', letterSpacing: 1 }}>
 Nabd Plus
 </Text>
 <Text style={{ fontSize: FS.md, color: 'rgba(255,255,255,0.75)', marginTop: SP.xs }}>
 نبض بلس · مزودو الخدمة الطبية
 </Text>
 </Animated.View>
 </View>
 );
}

// ══════════════════════════════════════════════════════════
// WELCOME SCREEN — PROVIDER SELECTION
// ══════════════════════════════════════════════════════════
export function WelcomeScreen({
  onSelectType, onLogin, onGuestJobs, onGuestDrugIndex
}: { onSelectType: (type: string) => void; onLogin: () => void; onGuestJobs?: () => void; onGuestDrugIndex?: () => void }) {
 const { theme, mode, toggle: toggleTheme } = useTheme();
 const { lang, toggle: toggleLang, t: tt } = useLang();
 const insets = useSafeAreaInsets();
 const AR = lang === 'ar';
 const [selectedPt, setSelectedPt] = useState<any | null>(null);
 const [sheetOpen, setSheetOpen] = useState(false);
  const scaleAnims = useRef(PROVIDER_TYPES.map(() => new Animated.Value(1))).current;
  const headerAnim = useRef(new Animated.Value(0)).current;
  const cardsAnim = useRef(new Animated.Value(0)).current;

  const { bioLogin } = useAuth();
  const { show } = useToast();

  useEffect(() => {
    Animated.stagger(120, [
      Animated.spring(headerAnim, { toValue: 1, tension: 80, friction: 10, useNativeDriver: true }),
      Animated.spring(cardsAnim, { toValue: 1, tension: 80, friction: 10, useNativeDriver: true }),
    ]).start();

    // Auto Biometric Trigger
    Vault.get(SK.BIOENABLED).then(async (enabled) => {
      const hasRefresh = await Tokens.getRefresh();
      if (enabled === 'true' && hasRefresh) {
        try {
          const r = await bioLogin();
          if (!r.ok) {
            const msg = r.err || 'فشل تسجيل الدخول بالبصمة';
            show(msg, 'error');
          }
        } catch (err: any) {
          const msg = err.message || err.error || err;
          show(AR ? `خطأ: ${msg}` : `Error: ${msg}`, 'error');
        }
      }
    });
  }, []);

 const handleSelectCard = (pt: any, idx: number) => {
 setSelectedPt(pt);
 setSheetOpen(true);
 Vibration.vibrate(35);
 Animated.sequence([
 Animated.timing(scaleAnims[idx], { toValue: 0.95, duration: 80, useNativeDriver: true }),
 Animated.spring(scaleAnims[idx], { toValue: 1, tension: 250, friction: 8, useNativeDriver: true }),
 ]).start();
 };

 return (
 <View style={{ flex: 1, backgroundColor: theme.bg }}>
 <StatusBar barStyle={theme.statusBar} />
 <ScrollView
 contentContainerStyle={{ padding: SP.xl, paddingTop: insets.top + SP.sm, paddingBottom: SP.huge + insets.bottom }}
 showsVerticalScrollIndicator={false}
 >
 {/* Top Bar */}
 <Animated.View style={{
 opacity: headerAnim,
 transform: [{ translateY: headerAnim.interpolate({ inputRange: [0,1], outputRange: [-20,0] }) }],
 flexDirection: AR ? 'row-reverse' : 'row',
 justifyContent: 'space-between', alignItems: 'center',
 marginBottom: SP.sm,
 }}>
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', gap: SP.md }}>
 <NLogo size={46} />
 <View>
 <Text style={{ fontSize: FS.xl, fontWeight: FW.xbold, color: theme.text }}>Nabd Plus</Text>
 <Text style={{ fontSize: FS.xs, color: theme.textSub }}>نبض بلس</Text>
 </View>
 </View>
 <View style={{ flexDirection: 'row', gap: SP.sm, alignItems: 'center' }}>
 <TouchableOpacity onPress={toggleLang}
 style={{
 flexDirection: AR ? 'row-reverse' : 'row',
 alignItems: 'center',
 gap: 6,
 paddingHorizontal: SP.md,
 height: 34,
 backgroundColor: theme.surface2,
 borderRadius: 17,
 borderWidth: 1,
 borderColor: theme.border,
 }}>
 <I name="globe" size={14} color={theme.textSub} />
 <Text style={{ fontSize: FS.sm, color: theme.text, fontWeight: FW.bold }}>{AR ? 'EN' : 'العربية'}</Text>
 </TouchableOpacity>
 <NThemeSlider />
 </View>
 </Animated.View>

 {/* Title */}
 <Animated.View style={{ opacity: headerAnim, marginBottom: SP.md }}>
 <Text style={{
 fontSize: FS['3xl'], fontWeight: FW.xbold,
 color: theme.text, textAlign: AR ? 'right' : 'left', lineHeight: 38,
 }}>
 {tt('auth.8455fff1')}{'\n'}
 <Text style={{ color: theme.primary }}>Nabd Plus</Text>
 </Text>
 <Text style={{
 fontSize: FS.sm, color: theme.textSub,
 marginTop: SP.sm, textAlign: AR ? 'right' : 'left', lineHeight: 20,
 }}>
 {tt('auth.018ceba9')}
 </Text>
 </Animated.View>

 {/* Grid of Squares - 2 Columns */}
 <Animated.View style={{
 opacity: cardsAnim,
 flexDirection: AR ? 'row-reverse' : 'row',
 flexWrap: 'wrap',
 justifyContent: 'space-between',
 gap: SP.md,
 marginBottom: SP.xxl
 }}>
 {PROVIDER_TYPES.map((pt, idx) => {
 return (
 <Animated.View key={pt.key} style={{ width: '47%', transform: [{ scale: scaleAnims[idx] }] }}>
 <TouchableOpacity onPress={() => handleSelectCard(pt, idx)} activeOpacity={0.85}>
 <View style={{
 backgroundColor: theme.card,
 borderColor: theme.border,
 borderWidth: 1,
 borderRadius: R.xl,
 padding: SP.md,
 alignItems: 'center',
 justifyContent: 'center',
 minHeight: 140,
 }}>
 <View style={{
 width: 50, height: 50, borderRadius: 25,
 backgroundColor: `${pt.color}12`,
 alignItems: 'center', justifyContent: 'center',
 marginBottom: SP.sm,
 borderWidth: 1, borderColor: `${pt.color}25`
 }}>
 <I name={pt.key as any} size={26} color={pt.color} />
 </View>
 <Text style={{
 fontSize: FS.md, fontWeight: FW.bold,
 color: theme.text,
 textAlign: 'center',
 }}>
 {AR ? pt.arName : pt.enName}
 </Text>
 <Text style={{
 fontSize: 10, color: theme.textSub,
 marginTop: 4,
 textAlign: 'center',
 lineHeight: 14
 }} numberOfLines={2}>
 {AR ? pt.arDesc : pt.enDesc}
 </Text>
 </View>
 </TouchableOpacity>
 </Animated.View>
 );
 })}
 </Animated.View>

 {/* Guest Action Links */}
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', justifyContent: 'space-between', gap: SP.md, marginBottom: SP.xl }}>
 {onGuestJobs && (
 <TouchableOpacity onPress={onGuestJobs} style={{ 
 flex: 1, alignItems: 'center', padding: SP.xl,
 backgroundColor: theme.primaryLight, borderRadius: R.xl,
 borderWidth: 1, borderColor: theme.primary,
 shadowColor: theme.primary, shadowOffset: {width:0, height:4}, shadowOpacity: 0.1, shadowRadius: 8, elevation: 2
 }}>
 <I name="briefcase" size={32} color={theme.primary} />
 <Text style={{ fontSize: FS.sm, color: theme.primary, fontWeight: FW.bold, marginTop: SP.sm, textAlign: 'center' }}>
 {tt('auth.ebb9f1de')}
 </Text>
 </TouchableOpacity>
 )}

 {onGuestDrugIndex && (
 <TouchableOpacity onPress={onGuestDrugIndex} style={{ 
 flex: 1, alignItems: 'center', padding: SP.xl,
 backgroundColor: theme.successBg, borderRadius: R.xl,
 borderWidth: 1, borderColor: theme.success,
 shadowColor: theme.success, shadowOffset: {width:0, height:4}, shadowOpacity: 0.1, shadowRadius: 8, elevation: 2
 }}>
 <I name="bookOpen" size={32} color={theme.success} />
 <Text style={{ fontSize: FS.sm, color: theme.success, fontWeight: FW.bold, marginTop: SP.sm, textAlign: 'center' }}>
 {tt('auth.2a8aa329')}
 </Text>
 </TouchableOpacity>
 )}
 </View>
 <Text style={{ fontSize: FS.xs, color: theme.textSub, textAlign: 'center', marginBottom: SP.xl }}>
 {tt('auth.89c9a366')}
 </Text>

 {/* Global Login Link */}
 <TouchableOpacity onPress={onLogin} style={{ alignItems: 'center', paddingVertical: SP.sm, marginBottom: SP.lg }}>
 <Text style={{ fontSize: FS.md, color: theme.textSub }}>
 {tt('auth.931e6b41')}
 <Text style={{ color: theme.primary, fontWeight: FW.bold }}>
 {tt('auth.978f19f9')}
 </Text>
 </Text>
 </TouchableOpacity>

 {/* Trust Badges */}
 <View style={{ flexDirection: 'row', justifyContent: 'center', gap: SP.xl, marginTop: SP.lg }}>
 {[
 { icon: 'lock', color: theme.primary, ar: 'تشفير آمن', en: 'Secure Encryption' },
 { icon: 'shield', color: tokens.success, ar: 'معتمد MOH', en: 'MOH Certified' },
 { icon: 'check', color: tokens.mintDeep, ar: 'سعودي 100%', en: '100% Saudi' },
 ].map((b, i) => (
 <View key={i} style={{ alignItems: 'center', gap: 4 }}>
 <I name={b.icon as any} size={20} color={b.color} />
 <Text style={{ fontSize: FS.xs, color: theme.textSub, marginTop: 4 }}>{AR ? b.ar : b.en}</Text>
 </View>
 ))}
 </View>
 </ScrollView>

 {/* Account Option Sheet */}
 <NSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} title={tt('auth.f6b508cb')}>
 <View style={{ padding: SP.xl, gap: SP.lg, paddingBottom: 40 }}>
 <View style={{ alignItems: 'center', marginBottom: SP.md }}>
 <View style={{
 width: 60, height: 60, borderRadius: 30,
 backgroundColor: `${selectedPt?.color}12`,
 alignItems: 'center', justifyContent: 'center',
 marginBottom: SP.md,
 borderWidth: 1.5, borderColor: `${selectedPt?.color}25`
 }}>
 {selectedPt && <I name={selectedPt.key as any} size={30} color={selectedPt.color} />}
 </View>
 <Text style={{ fontSize: FS.lg, fontWeight: FW.bold, color: theme.text }}>
 {selectedPt ? (AR ? selectedPt.arName : selectedPt.enName) : ''}
 </Text>
 <Text style={{ fontSize: FS.sm, color: theme.textSub, marginTop: 4, textAlign: 'center' }}>
 {selectedPt ? (AR ? selectedPt.arDesc : selectedPt.enDesc) : ''}
 </Text>
 </View>

 <NBtn
 label={tt('auth.492ee8f8')}
 onPress={() => {
 setSheetOpen(false);
 onLogin();
 }}
 />

 <NBtn
 label={tt('auth.61d6a3b3')}
 onPress={() => {
 setSheetOpen(false);
 if (selectedPt) onSelectType(selectedPt.key);
 }}
 variant="outline"
 />
 </View>
 </NSheet>
 </View>
 );
}

// ══════════════════════════════════════════════════════════
// LOGIN SCREEN
// ══════════════════════════════════════════════════════════
export function LoginScreen({
 onSuccess, onBack, onForgot, onRegister,
}: {
 onSuccess: () => void; onBack: () => void;
 onForgot: () => void; onRegister: () => void;
}) {
 const { theme } = useTheme();
 const { lang, t: tt } = useLang();
 const { login, bioLogin } = useAuth();
 const { show } = useToast();
 const AR = lang === 'ar';
 const insets = useSafeAreaInsets();

 const [id, setId] = useState('');
 const [pass, setPass] = useState('');
 const [rem, setRem] = useState(false);
 const [loading, setLoading] = useState(false);
 const [errs, setErrs] = useState<Record<string, string>>({});
  const [bioAvail, setBio] = useState(false);
  const [bioEnabled, setBioEnabled] = useState(false);
  const [showBioPrompt, setShowBioPrompt] = useState(false);
  const [showIpModal, setShowIpModal] = useState(false);
  const [customIp, setCustomIp] = useState('');

  useEffect(() => { 
    Biometric.isAvailable().then(setBio); 
    Vault.get(SK.BIOENABLED).then(val => setBioEnabled(val === 'true'));
    Vault.get(SK.CUSTOM_API_IP).then(val => setCustomIp(val || ''));
  }, []);

  const validate = () => {
    const e: Record<string, string> = {};
    const v = id.trim();
    if (!v) e.id = tt('auth.b4bde92d');
    else if (!Validate.email(v)) e.id = tt('auth.dcfb041e');
    if (!pass) e.pass = tt('auth.b4bde92d');
    else if (pass.length < LIMITS.MIN_PASS) e.pass = tt('auth.a5b08d6a');
    setErrs(e);
    return Object.keys(e).length === 0;
  };

  const { enableBiometric } = useAuth();

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    if (rem) {
      await Vault.set(SK.REMEMBER, '1');
    } else {
      await Vault.del(SK.REMEMBER);
    }
    const r = await login(id, pass);
    setLoading(false);
    if (r.ok) {
      show(tt('auth.10be2a76'), 'success');
      if (bioAvail && !bioEnabled) {
        setShowBioPrompt(true);
      } else {
        onSuccess();
      }
    } else {
      show(r.err ?? (tt('auth.6d3e5a91')), 'error');
    }
  };

  const handleEnableBio = async () => {
    setShowBioPrompt(false);
    const ok = await enableBiometric();
    if (ok) {
      show(tt('auth.6523863f'), 'success');
    }
    onSuccess();
  };

  const handleBio = async () => {
    setLoading(true);
    const r = await bioLogin();
    setLoading(false);
    if (r.ok) {
      show(tt('auth.d6bc1124'), 'success');
      onSuccess();
    } else {
      show(r.err ?? (tt('auth.80b90f84')), 'error');
    }
  };

 return (
 <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.bg }}
 behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
 <StatusBar barStyle={theme.statusBar} />
 <ScrollView contentContainerStyle={{ flexGrow: 1, padding: SP.xl, paddingTop: insets.top + 16 }}
 keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

 <TouchableOpacity onPress={onBack} style={{ marginBottom: SP.xxxl }}>
 <Text style={{ color: theme.primary, fontSize: FS.md, fontWeight: FW.med }}>
 {tt('auth.e2994279')}
 </Text>
 </TouchableOpacity>

 <View style={{ alignItems: 'center', marginBottom: SP.xxxl }}>
  <TouchableOpacity activeOpacity={1} onLongPress={() => { if (__DEV__) setShowIpModal(true); }}>
   <NLogo size={72} />
  </TouchableOpacity>
 <Text style={{ fontSize: FS['3xl'], fontWeight: FW.xbold, color: theme.text, marginTop: SP.xl }}>
 {tt('auth.230d2f20')}
 </Text>
 <Text style={{ fontSize: FS.md, color: theme.textSub }}>
 {tt('auth.ececbd52')}
 </Text>
 </View>

 <NCard style={{ marginBottom: SP.xl }}>
 <NInput
 label={tt('auth.8605844e')}
 placeholder="example@email.com"
 value={id} onChange={setId} icon=""
 error={errs.id} caps="none" kbType="email-address"
 />
 <NInput
 label={tt('auth.password')}
 placeholder="••••••••"
 value={pass} onChange={setPass}
 secure icon="" error={errs.pass}
 />
 <NCheckbox label={tt('auth.77fabf3f')} value={rem} onChange={setRem} />
 </NCard>

  {bioAvail && (
  <>
  <TouchableOpacity onPress={handleBio}
  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
  gap: SP.md, padding: SP.md, marginBottom: SP.lg }}>
  <I name="user" size={22} color={theme.textSub} />
  <Text style={{ fontSize: FS.md, color: theme.primary, fontWeight: FW.med }}>
  {tt('auth.5446722e')}
  </Text>
  </TouchableOpacity>
  

  </>
  )}

 <NBtn
 label={tt('auth.230d2f20')}
 onPress={handleLogin} loading={loading}
 style={{ marginBottom: SP.lg }} icon=""
 />

 <TouchableOpacity onPress={onForgot} style={{ alignItems: 'center', marginBottom: SP.xl }}>
 <Text style={{ color: theme.primary, fontSize: FS.md }}>
 {tt('auth.449500e6')}
 </Text>
 </TouchableOpacity>

 <NDivider label={AR ? 'أو' : 'or'} />


 <TouchableOpacity onPress={onRegister} style={{ alignItems: 'center', paddingVertical: SP.lg }}>
 <Text style={{ fontSize: FS.md, color: theme.textSub }}>
 {tt('auth.a8253cfe')}
 <Text style={{ color: theme.primary, fontWeight: FW.bold }}>
 {tt('auth.36d048ad')}
 </Text>
 </Text>
 </TouchableOpacity>

  <Text style={{ textAlign: 'center', fontSize: FS.xs, color: theme.textSub, marginTop: SP.xl }}>
   {tt('auth.13371b0f')}
  </Text>

  <Modal visible={showBioPrompt} transparent animationType="fade">
    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: SP.xl }}>
      <View style={{ backgroundColor: theme.card, padding: SP.xl, borderRadius: R.xl, width: '100%', alignItems: 'center' }}>
        <View style={{ marginBottom: SP.md }}><I name="user" size={50} color={theme.textSub} /></View>
        <Text style={{ fontSize: FS.xl, fontWeight: FW.bold, color: theme.text, marginBottom: SP.sm, textAlign: 'center' }}>
          {tt('auth.cb93d1a7')}
        </Text>
        <Text style={{ fontSize: FS.md, color: theme.textSub, textAlign: 'center', marginBottom: SP.xl }}>
          {tt('auth.14d3e4f4')}
        </Text>
        <NBtn label={tt('auth.6fc68c23')} onPress={handleEnableBio} style={{ width: '100%', marginBottom: SP.sm }} />
        <NBtn label={tt('auth.c52ac346')} variant="outline" onPress={() => { setShowBioPrompt(false); onSuccess(); }} style={{ width: '100%' }} />
      </View>
    </View>
  </Modal>

  <TouchableOpacity onPress={() => { if (__DEV__) setShowIpModal(true); }} style={{ marginTop: 40, padding: 10 }}>
   <Text style={{ textAlign: 'center', color: theme.textSub, fontSize: 10 }}>v1.0.0</Text>
  </TouchableOpacity>
  </ScrollView>

  {/* IP OVERRIDE MODAL — dev-only debug surface, never in production */}
  <Modal visible={__DEV__ && showIpModal} transparent animationType="fade">
   <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: SP.xl }}>
     <View style={{ backgroundColor: theme.card, borderRadius: R.xl, padding: SP.xl, width: '100%' }}>
       <Text style={{ fontSize: FS.lg, fontWeight: FW.bold, color: theme.text, marginBottom: SP.sm, textAlign: 'center' }}>
         {tt('auth.1cad08fe')}
       </Text>
       <Text style={{ fontSize: FS.sm, color: theme.textSub, marginBottom: SP.lg, textAlign: 'center' }}>
         {tt('auth.0889d89b')}
       </Text>
       <TextInput
         value={customIp}
         onChangeText={setCustomIp}
         placeholder="e.g. 192.168.1.10"
         style={{ borderWidth: 1, borderColor: theme.border, borderRadius: R.md, padding: SP.md, marginBottom: SP.lg, color: theme.text, textAlign: 'left' }}
         keyboardType="numbers-and-punctuation"
       />
       <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md }}>
         <TouchableOpacity style={{ flex: 1, padding: SP.md, alignItems: 'center', backgroundColor: theme.surface3, borderRadius: R.md }} onPress={() => { setCustomIp(''); Vault.del(SK.CUSTOM_API_IP); setShowIpModal(false); alert('IP Reset. Restart App.'); }}>
           <Text style={{ color: theme.text, fontWeight: FW.bold }}>{tt('auth.35fc41df')}</Text>
         </TouchableOpacity>
         <TouchableOpacity style={{ flex: 1, padding: SP.md, alignItems: 'center', backgroundColor: theme.primary, borderRadius: R.md }} onPress={() => { Vault.set(SK.CUSTOM_API_IP, customIp); setShowIpModal(false); alert('IP Saved. Restart App.'); }}>
           <Text style={{ color: theme.bg, fontWeight: FW.bold }}>{tt('auth.0360038b')}</Text>
         </TouchableOpacity>
       </View>
       <TouchableOpacity style={{ marginTop: SP.md, alignItems: 'center', padding: SP.sm }} onPress={() => setShowIpModal(false)}>
         <Text style={{ color: theme.textSub }}>{tt('auth.210b779f')}</Text>
       </TouchableOpacity>
     </View>
   </KeyboardAvoidingView>
  </Modal>
  </KeyboardAvoidingView>
  );
}

// ══════════════════════════════════════════════════════════
// FORGOT PASSWORD — 3 STEPS
// ══════════════════════════════════════════════════════════
export function ForgotPasswordScreen({
 onBack, onSuccess,
}: { onBack: () => void; onSuccess: () => void }) {
 const { theme } = useTheme();
 const { lang, t: tt } = useLang();
 const { show } = useToast();
 const { login } = useAuth();
 const AR = lang === 'ar';
 const insets = useSafeAreaInsets();
 const { width: W } = useWindowDimensions();

 const [step, setStep] = useState<1 | 2 | 3>(1);
 const [target, setTarget] = useState('');
 const [otp, setOtp] = useState(['', '', '', '', '', '']);
 const [newPass, setNew] = useState('');
 const [confPass, setConf] = useState('');
 const [loading, setLoading] = useState(false);
 const [err, setErr] = useState('');
 const slideX = useRef(new Animated.Value(0)).current;

 const animNext = () => {
 Animated.sequence([
 Animated.timing(slideX, { toValue: -W, duration: 200, useNativeDriver: true }),
 Animated.timing(slideX, { toValue: W, duration: 0, useNativeDriver: true }),
 Animated.spring(slideX, { toValue: 0, tension: 80, friction: 10, useNativeDriver: true }),
 ]).start();
 };

 const sendOtp = async () => {
 const v = target.trim();
 if (!v) { setErr(tt('auth.b4bde92d')); return; }
 if (!Validate.email(v)) { setErr(tt('auth.0129f5a4')); return; }
 setErr(''); setLoading(true);
 try {
 const headers = await buildHeaders(false);
 const res = await timedFetch(`${API_BASE}/provider/auth/forgot-password`, {
 method: 'POST',
 headers,
 body: JSON.stringify({ email: v })
 });
 const data = await res.json();
 if (!res.ok) throw new Error(data.message || (tt('auth.aee7ce8b')));
 
 animNext(); setStep(2);
 show(tt('auth.4be2a998'), 'success');
 } catch (e: any) {
 setErr(e.message || (tt('auth.df948170')));
 } finally {
 setLoading(false);
 }
 };

 // "Resend code" asks the server again (it used to only say "Code resent" and send nothing)
 const resendCode = async () => {
 setErr('');
 try {
 const headers = await buildHeaders(false);
 const res = await timedFetch(`${API_BASE}/provider/auth/forgot-password`, { method: 'POST', headers, body: JSON.stringify({ email: target.trim() }) });
 const data = await res.json().catch(() => ({}));
 if (!res.ok) throw new Error(data?.message || (tt('auth.aee7ce8b')));
 show(tt('auth.747fa9dd'), 'success');
 } catch (e: any) {
 setErr(e?.message || (tt('auth.1eb32485')));
 }
 };

 const verifyOtp = async () => {
 if (otp.join('').length < 6) return;
 setErr(''); setLoading(true);
 try {
 const headers = await buildHeaders(false);
 const res = await timedFetch(`${API_BASE}/provider/auth/verify-reset-code`, {
 method: 'POST',
 headers,
 body: JSON.stringify({ email: target.trim(), code: otp.join('') })
 });
 const data = await res.json();
 if (!res.ok) throw new Error(data.message || (tt('auth.afd93029')));
 animNext(); setStep(3);
 } catch (e: any) {
 setErr(e.message || (tt('auth.afd93029')));
 } finally {
 setLoading(false);
 }
 };

 const resetPass = async () => {
 if (newPass !== confPass) { setErr(tt('auth.passwordsMismatch')); return; }
 const str = Validate.password(newPass);
 if (!str.valid) { setErr(AR ? str.msgAr : str.msgEn); return; }
 setErr(''); setLoading(true);
 try {
 const headers = await buildHeaders(false);
 const res = await timedFetch(`${API_BASE}/provider/auth/reset-password`, {
 method: 'POST',
 headers,
 body: JSON.stringify({
 email: target.trim(),
 code: otp.join(''),
 new_password: newPass
 })
 });
 const data = await res.json();
 if (!res.ok) {
   const msg = data.message || (tt('auth.b0a4bdb4'));
   // Code problems (wrong/expired/attempts) → send user back to the OTP step
   if (/code|رمز|expired|attempts/i.test(String(msg))) { setErr(String(msg)); setStep(2); animNext(); return; }
   throw new Error(msg);
 }

 // Auto-login with the new password so the user lands directly in the app —
 // no manual re-login, no credential-mismatch window.
 show(tt('auth.b16a1bdc'), 'success');
 const lr = await login(target.trim(), newPass);
 if (!lr.ok) {
   setErr(lr.err || (tt('auth.ff68e9d6')));
   return;
 }
 onSuccess();
 } catch (e: any) {
 setErr(e.message || (tt('auth.df948170')));
 } finally {
 setLoading(false);
 }
 };

 return (
 <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.bg }}
 behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
 <StatusBar barStyle={theme.statusBar} />
 <ScrollView contentContainerStyle={{ flexGrow: 1, padding: SP.xl, paddingTop: insets.top + 16 }}
 keyboardShouldPersistTaps="handled">

 <TouchableOpacity onPress={step === 1 ? onBack : () => setStep(s => (s - 1) as 1 | 2 | 3)}
 style={{ marginBottom: SP.xl }}>
 <Text style={{ color: theme.primary, fontSize: FS.md }}>
 {tt('auth.e2994279')}
 </Text>
 </TouchableOpacity>

 <NStepBar total={3} current={step} style={{ marginBottom: SP.xxxl }} />

 <Animated.View style={{ transform: [{ translateX: slideX }] }}>
 {step === 1 && (
 <View>
 <Text style={[styles.stepTitle, { color: theme.text, textAlign: AR ? 'right' : 'left' }]}>
 {tt('auth.e78b246e')}
 </Text>
 <Text style={[styles.stepSub, { color: theme.textSub, textAlign: AR ? 'right' : 'left' }]}>
 {tt('auth.0ae81e46')}
 </Text>
 <NInput
 label={tt('auth.3bff6660')}
 placeholder="example@email.com"
 value={target} onChange={setTarget}
 icon="" error={err} kbType="email-address"
 />
 <NBtn label={tt('auth.4990dc94')}
 onPress={sendOtp} loading={loading} />
 </View>
 )}

 {step === 2 && (
 <NOTP
 target={target} otp={otp} setOtp={setOtp}
 onVerify={verifyOtp} loading={loading}
 error={err}
 onResend={resendCode}
 />
 )}

 {step === 3 && (
 <View>
 <Text style={[styles.stepTitle, { color: theme.text, textAlign: AR ? 'right' : 'left' }]}>
 {tt('auth.0786d397')}
 </Text>
 <NInput
 label={tt('auth.10a7e435')}
 placeholder="••••••••"
 value={newPass} onChange={setNew}
 secure icon=""
 hint={tt('auth.c6f4053a')}
 />
 <NPassStrength password={newPass} />
 <NInput
 label={tt('auth.confirmPassword')}
 placeholder="••••••••"
 value={confPass} onChange={setConf}
 secure icon=""
 error={confPass && newPass !== confPass ? (tt('auth.68e2fc47')) : undefined}
 />
 {err ? (
 <Text style={{ color: theme.danger, marginBottom: SP.md, textAlign: AR ? 'right' : 'left' }}>
 {err}
 </Text>
 ) : null}
 <NBtn
 label={tt('auth.a11074f8')}
 onPress={resetPass} loading={loading}
 disabled={newPass.length < LIMITS.MIN_PASS || newPass !== confPass}
 />
 </View>
 )}
 </Animated.View>
 </ScrollView>
 </KeyboardAvoidingView>
 );
}

// ══════════════════════════════════════════════════════════
// PENDING APPROVAL SCREEN
// ══════════════════════════════════════════════════════════
export function PendingScreen({
 providerType, onExplore, onLogout,
}: { providerType: string; onExplore: () => void; onLogout: () => void }) {
 const { theme } = useTheme();
 const { lang, t: tt } = useLang();
 const AR = lang === 'ar';
 const insets = useSafeAreaInsets();
 const pulse = useRef(new Animated.Value(1)).current;
 const fade = useRef(new Animated.Value(0)).current;

 useEffect(() => {
 Animated.timing(fade, { toValue: 1, duration: 600, useNativeDriver: true }).start();
 Animated.loop(Animated.sequence([
 Animated.timing(pulse, { toValue: 1.06, duration: 1400, useNativeDriver: true }),
 Animated.timing(pulse, { toValue: 1, duration: 1400, useNativeDriver: true }),
 ])).start();
 }, []);

 const steps = [
 { icon: '', ar: 'تم إرسال ملفك بنجاح', en: 'File submitted successfully', done: true },
 { icon: '', ar: 'تحت المراجعة التدقيقية', en: 'Under detailed review', active: true },
 { icon: '', ar: 'قد يتواصل معك فريقنا للتأكيد', en: 'Our team may contact you', done: false },
 { icon: '', ar: 'تفعيل الحساب والبدء في العمل', en: 'Account activation & go live', done: false },
 ];

 return (
 <View style={{ flex: 1, backgroundColor: theme.bg }}>
 <StatusBar barStyle={theme.statusBar} />
 <ScrollView contentContainerStyle={{ padding: SP.xl, paddingTop: insets.top + 24, paddingBottom: 48 }}>

 <Animated.View style={{ opacity: fade, alignItems: 'center', marginBottom: SP.xxxl }}>
 <Animated.View style={{
 transform: [{ scale: pulse }],
 width: 100, height: 100, borderRadius: 50,
 backgroundColor: theme.warnBg,
 alignItems: 'center', justifyContent: 'center',
 marginBottom: SP.xl,
 }}>
 <I name="heart" size={48} color="#FFF" />
 </Animated.View>
 <Text style={{ fontSize: FS['3xl'], fontWeight: FW.bold, color: theme.text, textAlign: 'center', marginBottom: SP.md }}>
 {tt('auth.f3a609d0')}
 </Text>
 <Text style={{ fontSize: FS.md, color: theme.textSub, textAlign: 'center', lineHeight: 26 }}>
 {AR
 ? 'تم استلام ملفك الشامل بنجاح.\nسيصلك إشعار وتفعيل خلال 24 ساعة.'
 : 'Your complete file has been received.\nYou will be notified within 24 hours.'}
 </Text>
 </Animated.View>

 {/* Steps */}
 <NCard style={{ marginBottom: SP.xl }}>
 {steps.map((st, i) => (
 <View key={i} style={[styles.stepRow, {
 flexDirection: AR ? 'row-reverse' : 'row',
 borderBottomWidth: i < steps.length - 1 ? StyleSheet.hairlineWidth : 0,
 borderBottomColor: theme.border,
 }]}>
 <View style={[styles.stepDot, {
 backgroundColor: st.active ? theme.warnBg : st.done ? theme.successBg : theme.surface2,
 borderWidth: st.active ? 2 : 0, borderColor: theme.warn,
 }]}>
 <Text style={{ fontSize: 18 }}>{st.icon}</Text>
 </View>
 <Text style={{
 flex: 1, fontSize: FS.md, textAlign: AR ? 'right' : 'left',
 color: st.active ? theme.warn : st.done ? theme.success : theme.textSub,
 fontWeight: st.active ? FW.bold : FW.reg,
 }}>
 {AR ? st.ar : st.en}
 </Text>
 </View>
 ))}
 </NCard>

 {/* Notification channels */}
 <NCard style={{ marginBottom: SP.xl }}>
 <Text style={{ fontSize: FS.md, fontWeight: FW.semi, color: theme.text,
 marginBottom: SP.md, textAlign: AR ? 'right' : 'left' }}>
 {tt('auth.8d619d13')}
 </Text>
 {[
 { icon:'', ar:'البريد الإلكتروني', en:'Email' },
 { icon: '', ar: 'إشعار التطبيق Push', en: 'Push Notification' },
 ].map((ch, i) => (
 <View key={i} style={{
 flexDirection: AR ? 'row-reverse' : 'row',
 alignItems: 'center', gap: SP.md, paddingVertical: SP.xs,
 }}>
 <Text style={{ fontSize: 20 }}>{ch.icon}</Text>
 <Text style={{ fontSize: FS.md, color: theme.text }}>{AR ? ch.ar : ch.en}</Text>
 </View>
 ))}
 </NCard>

 {/* Expected time */}
 <NCard style={{ marginBottom: SP.xxl, alignItems: 'center' }}>
 <Text style={{ fontSize: FS.sm, color: theme.textSub, marginBottom: SP.xs }}>
 {tt('auth.b0fd894a')}
 </Text>
 <Text style={{ fontSize: FS['3xl'], fontWeight: FW.xbold, color: theme.primary }}>
 24 {tt('auth.d6d08c64')}
 </Text>
 </NCard>

 <NBtn label={tt('auth.b74e4979')}
 onPress={onExplore} style={{ marginBottom: SP.md }} icon="" />
 <NBtn label={tt('auth.d56d4be0')}
 variant="ghost" onPress={onLogout} icon="" />
 </ScrollView>
 </View>
 );
}

// ──────────────────────────────────────────────────────────
const styles = StyleSheet.create({
 provCard: {
 borderRadius: R.xl, padding: SP.xl, borderWidth: 1.5,
 gap: SP.lg, alignItems: 'center',
 shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
 shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
 },
 provIcon: {
 width: 58, height: 58, borderRadius: R.lg,
 alignItems: 'center', justifyContent: 'center',
 },
 selDot: {
 width: 26, height: 26, borderRadius: 13,
 alignItems: 'center', justifyContent: 'center',
 },
 stepTitle: { fontSize: FS['3xl'], fontWeight: FW.bold, marginBottom: SP.md },
 stepSub: { fontSize: FS.md, lineHeight: 24, marginBottom: SP.xxl },
 stepRow: { alignItems: 'center', gap: SP.lg, paddingVertical: SP.md },
 stepDot: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
