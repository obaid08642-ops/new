/**
 * NABDAH PLUS — Shared UI Components (35+ components)
 * RTL · Dark/Light · Accessible · Animated
 */
import React, { useRef, useEffect, useState, ReactNode } from 'react';
import {
 View, Text, TextInput, TouchableOpacity, ScrollView,
 StyleSheet, Animated, Modal, ActivityIndicator, Image,
 Switch, Dimensions, Platform, KeyboardAvoidingView,
 TouchableWithoutFeedback, Vibration, Pressable
} from 'react-native';
import { useTheme, useLang, useToast } from '../context';
import { SP, R, FS, FW, SH_MD, C } from '../constants';
import { I, hasIcon } from './icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import client from '../api/client';

const { width: W, height: H } = Dimensions.get('window');

// ─── Logo ─────────────────────────────────────────────────────────────────────
export function NLogo({ size = 56 }: { size?: number }) {
 const { theme } = useTheme();
 return (
 <View style={{ width:size, height:size, borderRadius:size*0.26,
 backgroundColor:theme.primaryLight, alignItems:'center', justifyContent:'center', ...SH_MD }}>
 <I name="heart" size={size*0.52} color={theme.primary} />
 </View>
 );
}

// ─── Card ─────────────────────────────────────────────────────────────────────
export function NCard({ children, style, onPress, noPad, accent }:
 { children:ReactNode; style?:object; onPress?:()=>void; noPad?:boolean; accent?:string }) {
 const { theme } = useTheme();
 const inner = (
 <View style={[{
 backgroundColor:theme.card, borderRadius:R.xl,
 padding: noPad ? 0 : SP.xl,
 borderWidth:1, borderColor:theme.border,
 borderLeftWidth: accent ? 4 : 1,
 borderLeftColor: accent ?? theme.border,
 overflow:'hidden', ...SH_MD,
 }, style]}>
 {children}
 </View>
 );
 if (onPress) return <TouchableOpacity onPress={onPress} activeOpacity={0.85}>{inner}</TouchableOpacity>;
 return inner;
}

// ─── Button ───────────────────────────────────────────────────────────────────
type BtnVariant = 'primary'|'secondary'|'danger'|'outline'|'ghost';
type BtnSize = 'xs'|'sm'|'md'|'lg';

export function NBtn({
 label, onPress, variant='primary', size='md',
 icon, iconRight, loading, disabled, style, labelStyle, full=true
}: {
 label:string; onPress:()=>void; variant?:BtnVariant; size?:BtnSize;
 icon?:string; iconRight?:string; loading?:boolean; disabled?:boolean;
 style?:object; labelStyle?:object; full?:boolean;
}) {
 const { theme } = useTheme();
 const sc = useRef(new Animated.Value(1)).current;

 const press = () => {
 Vibration.vibrate(30);
 Animated.sequence([
 Animated.timing(sc, { toValue:0.96, duration:70, useNativeDriver:true }),
 Animated.spring(sc, { toValue:1, tension:250, friction:8, useNativeDriver:true }),
 ]).start();
 onPress();
 };

 const h = { xs:34, sm:42, md:52, lg:60 }[size];
 const fs = { xs:FS.xs, sm:FS.sm, md:FS.base, lg:FS.lg }[size];
 const px = { xs:SP.md, sm:SP.lg, md:SP.xl, lg:SP.xxl }[size];

 const bg = disabled ? theme.surface2 : { primary:theme.primary, secondary:theme.surface2, danger:theme.danger, outline:'transparent', ghost:'transparent' }[variant];
 const fg = disabled ? theme.textOff : { primary:'#FFF', secondary:theme.text, danger:'#FFF', outline:theme.primary, ghost:theme.primary }[variant];
 const bd = disabled ? theme.border : { primary:'transparent', secondary:theme.border, danger:'transparent', outline:theme.primary, ghost:'transparent' }[variant];

 return (
 <Animated.View style={[{ transform:[{scale:sc}] }, full ? {width:'100%'} : {}]}>
 <TouchableOpacity onPress={press} activeOpacity={0.9} disabled={disabled||loading}
 style={[{ height:h, backgroundColor:bg, borderRadius:R.lg, borderWidth:1.5, borderColor:bd,
 flexDirection:'row', alignItems:'center', justifyContent:'center', paddingHorizontal:px, gap:SP.sm,
 }, style]}>
 {loading
 ? <ActivityIndicator color={fg} size="small" />
 : <>
 {icon && (hasIcon(icon) ? <I name={icon} size={fs+2} color={fg} /> : <Text style={{ fontSize:fs+2 }}>{icon}</Text>)}
 <Text style={[{ color:fg, fontSize:fs, fontWeight:FW.semi, textAlign:'center' }, labelStyle]}>{label}</Text>
 {iconRight && (hasIcon(iconRight) ? <I name={iconRight} size={fs+2} color={fg} /> : <Text style={{ fontSize:fs+2 }}>{iconRight}</Text>)}
 </>}
 </TouchableOpacity>
 </Animated.View>
 );
}

// ─── Input ────────────────────────────────────────────────────────────────────
export function NInput({
  label, placeholder, value, onChange, secure, kbType, error, hint,
  icon, iconRight, onIconRight, multi, multiline, lines=4, maxLen, editable=true,
  caps='none', required, style, returnKey, onSubmit, autoFocus, innerRef,
}: {
  label?:string; placeholder?:string; value:string; onChange:(v:string)=>void;
  secure?:boolean; kbType?:any; error?:string; hint?:string;
  icon?:string; iconRight?:string; onIconRight?:()=>void;
  multi?:boolean; multiline?:boolean; lines?:number; maxLen?:number; editable?:boolean;
  caps?:any; required?:boolean; style?:object;
  returnKey?:any; onSubmit?:()=>void; autoFocus?:boolean; innerRef?:any;
}) {
  multi = multi ?? multiline;
  const { theme } = useTheme();
  const { isRTL } = useLang();
  const [focused, setFocused] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const localRef = useRef<any>(null);
  const inputRef = innerRef || localRef;
  const bAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(bAnim, { toValue:focused?1:0, duration:200, useNativeDriver:false }).start();
  }, [focused]);

  const borderColor = bAnim.interpolate({
    inputRange:[0,1],
    outputRange:[error ? theme.borderErr : theme.border, error ? theme.borderErr : theme.borderFocus]
  });

  return (
    <TouchableWithoutFeedback onPress={() => inputRef.current?.focus()}>
      <View style={[{ marginBottom:SP.lg }, style]}>
        <View pointerEvents="box-none">
          {label && (
            <Text style={[s.label, { color:theme.text, textAlign:isRTL?'right':'left' }]}>
              {label}{required && <Text style={{ color:theme.danger }}> *</Text>}
            </Text>
          )}
          <Animated.View style={[s.inputWrap, {
            flexDirection:isRTL?'row-reverse':'row',
            backgroundColor:theme.inputBg, borderColor,
            minHeight:multi?100:52, paddingVertical:multi?SP.md:0,
            alignItems:multi?'flex-start':'center',
            opacity:editable?1:0.6,
          }]}>
            {icon && (hasIcon(icon)
              ? <View style={{ paddingTop:multi?SP.xs:0, justifyContent:'center' }}><I name={icon} size={20} color={focused?theme.primary:theme.textHint} /></View>
              : <Text style={[s.inputIcon, { color:focused?theme.primary:theme.textHint, paddingTop:multi?SP.xs:0 }]}>{icon}</Text>)}
            <TextInput
              ref={inputRef}
              value={value} onChangeText={onChange}
              placeholder={placeholder} placeholderTextColor={theme.textHint}
              secureTextEntry={secure && !showPass}
              keyboardType={kbType} multiline={multi}
              numberOfLines={multi?lines:1} maxLength={maxLen}
              editable={editable} autoCapitalize={caps}
              autoFocus={autoFocus} returnKeyType={returnKey}
              onSubmitEditing={onSubmit}
              onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
              style={[s.textInput, { color:theme.text, textAlign:isRTL?'right':'left', writingDirection:isRTL?'rtl':'ltr', flex:1 }]}
            />
            {secure && (
              <TouchableOpacity onPress={() => setShowPass(p=>!p)}>
                {showPass
                  ? <I name="eye" size={20} color={theme.textSub} />
                  : <I name="eyeOff" size={20} color={theme.textSub} />}
              </TouchableOpacity>
            )}
            {iconRight && !secure && (
              <TouchableOpacity onPress={onIconRight}>
                <I name={iconRight} size={20} color={theme.textSub} />
              </TouchableOpacity>
            )}
          </Animated.View>
          {maxLen && <Text style={[s.hint, { color:theme.textHint, textAlign:isRTL?'right':'left' }]}>{(value || '').length}/{maxLen}</Text>}
          {(error||hint) && (
            <Text style={[s.hint, { color:error?theme.danger:theme.textSub, textAlign:isRTL?'right':'left' }]}>{error||hint}</Text>
          )}
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
}

// ─── Phone Input ──────────────────────────────────────────────────────────────
export function NPhoneInput({ value, onChange, error, label, required, innerRef }:
  { value:string; onChange:(v:string)=>void; error?:string; label?:string; required?:boolean; innerRef?:any }) {
  const { theme } = useTheme();
  const { isRTL, t } = useLang();
  const [focused, setFocused] = useState(false);
  const localRef = useRef<any>(null);
  const inputRef = innerRef || localRef;
  return (
    <TouchableWithoutFeedback onPress={() => inputRef.current?.focus()}>
      <View style={{ marginBottom:SP.lg }}>
        <View pointerEvents="box-none">
          {label && (
            <Text style={[s.label, { color:theme.text, textAlign:isRTL?'right':'left' }]}>
              {label}{required && <Text style={{ color:theme.danger }}> *</Text>}
            </Text>
          )}
          <View style={[s.inputWrap, { flexDirection:isRTL?'row-reverse':'row', backgroundColor:theme.inputBg,
            borderColor:error?theme.borderErr:focused?theme.borderFocus:theme.border, height:52, paddingVertical:0 }]}>
            <View style={[s.phonePrefix, { borderRightWidth:isRTL?0:1, borderLeftWidth:isRTL?1:0, borderColor:theme.border }]}>
              <Text style={{ fontSize:FS.md, color:theme.text, fontWeight:FW.semi }}> +966</Text>
            </View>
            <TextInput ref={inputRef} value={value} onChangeText={onChange} placeholder="5X XXX XXXX"
              placeholderTextColor={theme.textHint} keyboardType="phone-pad" maxLength={10}
              onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
              style={[s.textInput, { color:theme.text, paddingHorizontal:SP.lg, flex:1 }]} />
          </View>
          {error && <Text style={[s.hint, { color:theme.danger, textAlign:isRTL?'right':'left' }]}>{error}</Text>}
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
}

// ─── Password Strength ────────────────────────────────────────────────────────
export function NPassStrength({ password }: { password: string }) {
 const { theme } = useTheme();
 const { isRTL } = useLang();
 if (!password) return null;
 const score = [/.{8,}/, /[A-Z]/, /[a-z]/, /[0-9]/, /[^A-Za-z0-9]/].filter(r=>r.test(password)).length;
 const cols = [C.red500, '#FF7043', C.yellow500, '#8BC34A', C.green500];
 const labAr = ['ضعيفة جداً','ضعيفة','متوسطة','جيدة','قوية'];
 const labEn = ['Very Weak','Weak','Fair','Good','Strong'];
 const col = cols[Math.min(score-1,4)] ?? cols[0];
 return (
 <View style={{ marginTop:-SP.md, marginBottom:SP.md }}>
 <View style={{ flexDirection:'row', gap:4, marginBottom:4 }}>
 {[1,2,3,4,5].map(i => (
 <View key={i} style={{ flex:1, height:4, borderRadius:R.full, backgroundColor:i<=score?col:theme.border }} />
 ))}
 </View>
 <Text style={{ fontSize:FS.xs, color:col, fontWeight:FW.semi, textAlign:isRTL?'right':'left' }}>
 {isRTL ? labAr[score-1]??labAr[0] : labEn[score-1]??labEn[0]}
 </Text>
 </View>
 );
}

// ─── Checkbox ─────────────────────────────────────────────────────────────────
export function NCheckbox({ label, value, onChange, style }:
 { label?:string; value:boolean; onChange:(v:boolean)=>void; style?:object }) {
 const { theme } = useTheme();
 const { isRTL } = useLang();
 const sc = useRef(new Animated.Value(1)).current;
 const press = () => {
 Animated.sequence([
 Animated.timing(sc, { toValue:0.85, duration:70, useNativeDriver:true }),
 Animated.spring(sc, { toValue:1, tension:300, friction:10, useNativeDriver:true }),
 ]).start();
 onChange(!value);
 };
 return (
 <TouchableOpacity onPress={press}
 style={[{ flexDirection:isRTL?'row-reverse':'row', alignItems:'center', gap:SP.md, marginVertical:SP.xs }, style]}>
 <Animated.View style={[s.checkbox, {
 borderColor:value?theme.primary:theme.border,
 backgroundColor:value?theme.primary:'transparent',
 transform:[{scale:sc}],
 }]}>
 {value && <I name="check" size={11} color="#FFF" />}
 </Animated.View>
 {label && <Text style={{ flex:1, fontSize:FS.md, color:theme.text, textAlign:isRTL?'right':'left' }}>{label}</Text>}
 </TouchableOpacity>
 );
}

// ─── Radio ────────────────────────────────────────────────────────────────────
export function NRadio({ opts, value, onSelect, style }:
 { opts:{value:string;label:string}[]; value:string; onSelect:(v:string)=>void; style?:object }) {
 const { theme } = useTheme();
 const { isRTL } = useLang();
 return (
 <View style={style}>
 {opts.map(o => (
 <TouchableOpacity key={o.value} onPress={() => onSelect(o.value)}
 style={{ flexDirection:isRTL?'row-reverse':'row', alignItems:'center', gap:SP.md, paddingVertical:SP.sm }}>
 <View style={[s.radioOuter, { borderColor:value===o.value?theme.primary:theme.border }]}>
 {value===o.value && <View style={[s.radioInner, { backgroundColor:theme.primary }]} />}
 </View>
 <Text style={{ fontSize:FS.md, color:theme.text }}>{o.label}</Text>
 </TouchableOpacity>
 ))}
 </View>
 );
}

// ─── Toggle ───────────────────────────────────────────────────────────────────
export function NToggle({ label, sub, value, onChange, style }:
 { label:string; sub?:string; value:boolean; onChange:(v:boolean)=>void; style?:object }) {
 const { theme } = useTheme();
 const { isRTL } = useLang();
 return (
 <View style={[{ flexDirection:isRTL?'row-reverse':'row', alignItems:'center',
 justifyContent:'space-between', paddingVertical:SP.md,
 borderBottomWidth:StyleSheet.hairlineWidth, borderBottomColor:theme.border }, style]}>
 <View style={{ flex:1, marginHorizontal:SP.md }}>
 <Text style={{ fontSize:FS.md, color:theme.text, fontWeight:FW.med, textAlign:isRTL?'right':'left' }}>{label}</Text>
 {sub && <Text style={{ fontSize:FS.sm, color:theme.textSub, marginTop:2, textAlign:isRTL?'right':'left' }}>{sub}</Text>}
 </View>
 <Switch value={value} onValueChange={onChange} trackColor={{ false:theme.border, true:theme.primary }} thumbColor="#FFF" />
 </View>
 );
}

// ─── Badge ────────────────────────────────────────────────────────────────────
type BadgeV = 'success'|'danger'|'warning'|'info'|'default'|'primary';
export function NBadge({ label, variant='success', size='sm', style }:
 { label:string; variant?:BadgeV; size?:'xs'|'sm'|'md'; style?:object }) {
 const { theme } = useTheme();
 const cfg: Record<BadgeV,{bg:string;fg:string}> = {
 success:{ bg:theme.successBg, fg:theme.success }, danger:{ bg:theme.dangerBg, fg:theme.danger },
 warning:{ bg:theme.warnBg, fg:theme.warn }, info:{ bg:theme.infoBg, fg:theme.info },
 default:{ bg:theme.surface2, fg:theme.textSub }, primary:{ bg:theme.primaryLight, fg:theme.primary },
 };
 const { bg, fg } = cfg[variant];
 const sz = { xs:{px:6,py:2,fs:FS.xs}, sm:{px:10,py:4,fs:FS.xs}, md:{px:12,py:6,fs:FS.sm} }[size];
 return (
 <View style={[{ backgroundColor:bg, borderRadius:R.full, paddingHorizontal:sz.px, paddingVertical:sz.py, alignSelf:'flex-start' }, style]}>
 <Text style={{ fontSize:sz.fs, color:fg, fontWeight:FW.semi }}>{label}</Text>
 </View>
 );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
export function NAvatar({ name, size=44, uri, online, style }:
 { name?:string; size?:number; uri?:string; online?:boolean; style?:object }) {
 const { theme } = useTheme();
 const initials = name?.trim().split(/\s+/).slice(0,2).map(w=>w[0]).join('').toUpperCase() ?? '?';
 return (
 <View style={[{ width:size, height:size, position:'relative' }, style]}>
 <View style={{ width:size, height:size, borderRadius:size/2, backgroundColor:theme.primaryLight,
 alignItems:'center', justifyContent:'center', overflow:'hidden', borderWidth:2, borderColor:theme.border }}>
 {uri
 ? <Image source={{ uri }} style={{ width:size, height:size, borderRadius:size/2 }} />
 : <Text style={{ fontSize:size*0.36, color:theme.primary, fontWeight:FW.bold }}>{initials}</Text>}
 </View>
 {online !== undefined && (
 <View style={{ position:'absolute', bottom:1, right:1, width:size*0.28, height:size*0.28,
 borderRadius:size*0.14, backgroundColor:online?theme.success:theme.danger, borderWidth:2, borderColor:theme.card }} />
 )}
 </View>
 );
}

// ─── Divider ──────────────────────────────────────────────────────────────────
export function NDivider({ label, style }:{ label?:string; style?:object }) {
 const { theme } = useTheme();
 return (
 <View style={[{ flexDirection:'row', alignItems:'center', gap:SP.md, marginVertical:SP.md }, style]}>
 <View style={{ flex:1, height:StyleSheet.hairlineWidth, backgroundColor:theme.border }} />
 {label && <Text style={{ fontSize:FS.sm, color:theme.textSub }}>{label}</Text>}
 <View style={{ flex:1, height:StyleSheet.hairlineWidth, backgroundColor:theme.border }} />
 </View>
 );
}

// ─── Step Bar ─────────────────────────────────────────────────────────────────
export function NStepBar({ total, current, style }:{ total:number; current:number; style?:object }) {
 const { theme } = useTheme();
 return (
 <View style={[{ flexDirection:'row', gap:SP.xs }, style]}>
 {Array.from({length:total}).map((_,i) => (
 <View key={i} style={{ flex:i===current-1?3:1, height:4, borderRadius:R.full,
 backgroundColor:i<current?theme.primary:theme.border }} />
 ))}
 </View>
 );
}

// ─── Screen Header ────────────────────────────────────────────────────────────
export function NHeader({ title, sub, step, total, onBack, right, style }:
 { title?:string; sub?:string; step?:number; total?:number; onBack?:()=>void; right?:ReactNode; style?:object }) {
 const { theme } = useTheme();
 const { isRTL } = useLang();
 const insets = useSafeAreaInsets();
 return (
 <View style={[{ paddingBottom: SP.xs, paddingTop: Math.max(insets.top, 0) }, style]}>
 {(onBack||step) && (
 <View style={{ flexDirection:isRTL?'row-reverse':'row', alignItems:'center', justifyContent:'space-between', marginBottom:SP.xs }}>
 {onBack
 ? <TouchableOpacity onPress={onBack} style={[s.backBtn, { backgroundColor:theme.surface2 }]}>
 <Text style={{ fontSize:FS.md, color:theme.text }}>{isRTL?'→':'←'}</Text>
 </TouchableOpacity>
 : <View style={{ width:40 }} />}
 {step !== undefined && (
 <Text style={{ fontSize:FS.xs, color:theme.textSub, fontWeight:FW.med }}>{step} / {total}</Text>
 )}
 {right ?? <View style={{ width:40 }} />}
 </View>
 )}
 {total !== undefined && step !== undefined && <NStepBar total={total} current={step} style={{ marginBottom:SP.xs }} />}
 {title && <Text style={{ fontSize:FS.lg, fontWeight:FW.bold, color:theme.text, textAlign:isRTL?'right':'left' }}>{title}</Text>}
 {sub && <Text style={{ fontSize:FS.xs, color:theme.textSub, textAlign:isRTL?'right':'left', lineHeight:18 }}>{sub}</Text>}
 </View>
 );
}

// ─── Bottom Sheet ─────────────────────────────────────────────────────────────
export function NSheet({ visible, onClose, title, children, height }:
 { visible:boolean; onClose:()=>void; title?:string; children:ReactNode; height?:number }) {
 const { theme } = useTheme();
 const { isRTL } = useLang();
 const ty = useRef(new Animated.Value(H)).current;
 useEffect(() => {
 Animated.spring(ty, { toValue:visible?0:H, tension:65, friction:12, useNativeDriver:true }).start();
 }, [visible]);
 if (!visible) return null;
 return (
 <Modal transparent animationType="none" visible={visible} onRequestClose={onClose}>
 <TouchableWithoutFeedback onPress={onClose}>
 <View style={[StyleSheet.absoluteFill, { backgroundColor:theme.overlay }]} />
 </TouchableWithoutFeedback>
 <Animated.View style={[s.sheet, {
 height: height ?? H*0.65, backgroundColor:theme.surface2,
 borderTopLeftRadius:R.xxxl, borderTopRightRadius:R.xxxl,
 transform:[{translateY:ty}],
 }]}>
 <View style={[s.sheetHandle, { backgroundColor:theme.border }]} />
 {title && <Text style={[s.sheetTitle, { color:theme.text, textAlign:isRTL?'right':'left' }]}>{title}</Text>}
 <ScrollView showsVerticalScrollIndicator={false}>{children}</ScrollView>
 </Animated.View>
 </Modal>
 );
}

// ─── Confirm Modal ────────────────────────────────────────────────────────────
export function NConfirm({ visible, title, msg, onOk, onCancel, okLabel, cancelLabel, variant='danger' }:
 { visible:boolean; title:string; msg:string; onOk:()=>void; onCancel:()=>void;
 okLabel?:string; cancelLabel?:string; variant?:'danger'|'primary' }) {
 const { t } = useLang();
 return (
 <Modal transparent visible={visible} animationType="fade">
 <TouchableWithoutFeedback onPress={onCancel}>
 <View style={[StyleSheet.absoluteFill, { backgroundColor:'rgba(0,0,0,0.55)' }]} />
 </TouchableWithoutFeedback>
 <View style={s.confirmCenter}>
 <NCard style={{ width:W-48, padding:SP.xxl }}>
 <Text style={s.confirmTitle}>{title}</Text>
 <Text style={s.confirmMsg}>{msg}</Text>
 <View style={{ flexDirection:'row', gap:SP.md }}>
 <View style={{ flex:1 }}><NBtn label={cancelLabel??t('cancel')} variant="secondary" onPress={onCancel} /></View>
 <View style={{ flex:1 }}><NBtn label={okLabel??t('confirm')} variant={variant} onPress={onOk} /></View>
 </View>
 </NCard>
 </View>
 </Modal>
 );
}

// ─── Loading Overlay ──────────────────────────────────────────────────────────
export function NLoading({ visible, msg }:{ visible:boolean; msg?:string }) {
 const { theme } = useTheme();
 const { t } = useLang();
 if (!visible) return null;
 return (
 <Modal transparent visible animationType="fade">
 <View style={[StyleSheet.absoluteFill, { backgroundColor:theme.overlay, justifyContent:'center', alignItems:'center' }]}>
 <NCard style={{ alignItems:'center', padding:SP.xxxl, minWidth:200 }}>
 <ActivityIndicator size="large" color={theme.primary} />
 <Text style={{ marginTop:SP.lg, color:theme.text, fontSize:FS.md, fontWeight:FW.med }}>{msg??t('loading')}</Text>
 </NCard>
 </View>
 </Modal>
 );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
export function NSkeleton({ w, h, br=R.md, style }:{ w:number|string; h:number; br?:number; style?:object }) {
 const { theme } = useTheme();
 const anim = useRef(new Animated.Value(0.4)).current;
 useEffect(() => {
 Animated.loop(Animated.sequence([
 Animated.timing(anim, { toValue:1, duration:800, useNativeDriver:true }),
 Animated.timing(anim, { toValue:0.4, duration:800, useNativeDriver:true }),
 ])).start();
 }, []);
 return <Animated.View style={[{ width:w as number, height:h, borderRadius:br, backgroundColor:theme.surface2, opacity:anim }, style]} />;
}

// ─── Empty State ──────────────────────────────────────────────────────────────
export function NEmpty({ icon='', title, sub, subtitle, actionLabel, onAction }:
 { icon?:string; title:string; sub?:string; subtitle?:string; actionLabel?:string; onAction?:()=>void }) {
 sub = sub ?? subtitle;
 const { theme } = useTheme();
 return (
 <View style={{ flex:1, alignItems:'center', justifyContent:'center', padding:SP.xxxl }}>
 <Text style={{ fontSize:56, marginBottom:SP.xl }}>{icon}</Text>
 <Text style={{ fontSize:FS.xl, fontWeight:FW.bold, color:theme.text, textAlign:'center', marginBottom:SP.md }}>{title}</Text>
 {sub && <Text style={{ fontSize:FS.md, color:theme.textSub, textAlign:'center', lineHeight:22, marginBottom:SP.xxl }}>{sub}</Text>}
 {onAction && actionLabel && <NBtn label={actionLabel} onPress={onAction} full={false} style={{ paddingHorizontal:SP.xxxl }} />}
 </View>
 );
}

// ─── Success Screen ───────────────────────────────────────────────────────────
export function NSuccess({ icon='', title, sub, primaryLabel, onPrimary, secLabel, onSec }:
 { icon?:string; title:string; sub?:string; primaryLabel?:string; onPrimary?:()=>void; secLabel?:string; onSec?:()=>void }) {
 const { theme } = useTheme();
 const { t } = useLang();
 const sc = useRef(new Animated.Value(0)).current;
 useEffect(() => { Animated.spring(sc, { toValue:1, tension:50, friction:5, useNativeDriver:true }).start(); }, []);
 return (
 <View style={{ flex:1, alignItems:'center', justifyContent:'center', padding:SP.xxxl, backgroundColor:theme.bg }}>
 <Animated.View style={[s.successIcon, { backgroundColor:theme.successBg, transform:[{scale:sc}] }]}>
 <Text style={{ fontSize:44 }}>{icon}</Text>
 </Animated.View>
 <Text style={{ fontSize:FS['3xl'], fontWeight:FW.bold, color:theme.text, textAlign:'center', marginBottom:SP.md }}>{title}</Text>
 {sub && <Text style={{ fontSize:FS.md, color:theme.textSub, textAlign:'center', lineHeight:24, marginBottom:SP.xxxl }}>{sub}</Text>}
 <View style={{ width:'100%', gap:SP.md }}>
 {onPrimary && <NBtn label={primaryLabel??t('done')} onPress={onPrimary} />}
 {onSec && <NBtn label={secLabel??t('back')} variant="ghost" onPress={onSec} />}
 </View>
 </View>
 );
}

// ─── OTP Input ────────────────────────────────────────────────────────────────
export function NOTP({ target, otp, setOtp, onVerify, loading, onResend }:
 { target:string; otp:string[]; setOtp:(v:string[])=>void; onVerify:()=>void; loading?:boolean; onResend?:()=>void }) {
 const { theme } = useTheme();
 const { isRTL, t } = useLang();
 const refs = useRef<(TextInput|null)[]>([]);
 const [cd, setCd] = useState(60);
 useEffect(() => {
 if (cd<=0) return;
 const timer = setTimeout(() => setCd(c=>c-1), 1000);
 return () => clearTimeout(timer);
 }, [cd]);
 const handleChange = (text:string, i:number) => {
 const n = [...otp]; n[i]=text.slice(-1); setOtp(n);
 if (text && i<5) refs.current[i+1]?.focus();
 if (!text && i>0) refs.current[i-1]?.focus();
 };
 return (
 <View>
 <Text style={{ fontSize:FS['3xl'], fontWeight:FW.bold, color:theme.text, marginBottom:SP.md }}>{t('otpTitle')}</Text>
 <Text style={{ fontSize:FS.md, color:theme.textSub, marginBottom:SP.xxl, textAlign:isRTL?'right':'left' }}>
 {t('otpSentTo')} <Text style={{ color:theme.primary, fontWeight:FW.semi }}>{target}</Text>
 </Text>
 <View style={{ flexDirection:'row', justifyContent:'center', gap:SP.md, marginBottom:SP.xxl }}>
 {otp.map((d,i) => (
 <TextInput key={i} ref={r => { refs.current[i] = r; }} value={d}
 onChangeText={t2 => handleChange(t2,i)}
 keyboardType="numeric" maxLength={1}
 style={[s.otpBox, { backgroundColor:theme.inputBg, borderColor:d?theme.primary:theme.border, color:theme.text }]} />
 ))}
 </View>
 <NBtn label={t('otpVerify')} onPress={onVerify} loading={loading} disabled={otp.join('').length<6} />
 <TouchableOpacity onPress={cd<=0?()=>{setCd(60);onResend?.()}:undefined}
 style={{ alignItems:'center', padding:SP.md, marginTop:SP.sm }}>
 <Text style={{ color:cd>0?theme.textSub:theme.primary, fontSize:FS.md }}>
 {cd>0 ? `${t('otpResend')} (${cd}s)` : t('otpResend')}
 </Text>
 </TouchableOpacity>
 </View>
 );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
export function NStatCard({ icon, label, value, color, unit, style }:
 { icon:string; label:string; value:string; color?:string; unit?:string; style?:object }) {
 const { theme } = useTheme();
 const { isRTL } = useLang();
 return (
 <NCard style={[{ padding:SP.lg }, style]}>
 <Text style={{ fontSize:24, marginBottom:SP.xs }}>{icon}</Text>
 <View style={{ flexDirection:isRTL?'row-reverse':'row', alignItems:'baseline', gap:4 }}>
 <Text style={{ fontSize:FS['2xl'], fontWeight:FW.xbold, color:color??theme.primary }}>{value}</Text>
 {unit && <Text style={{ fontSize:FS.sm, color:theme.textSub }}>{unit}</Text>}
 </View>
 <Text style={{ fontSize:FS.xs, color:theme.textSub, marginTop:2, textAlign:isRTL?'right':'left' }}>{label}</Text>
 </NCard>
 );
}

// ─── Section Header ───────────────────────────────────────────────────────────
export function NSecHeader({ title, action, onAction }:{ title:string; action?:string; onAction?:()=>void }) {
 const { theme } = useTheme();
 const { isRTL } = useLang();
 return (
 <View style={{ flexDirection:isRTL?'row-reverse':'row', justifyContent:'space-between',
 alignItems:'center', marginBottom:SP.md, marginTop:SP.md }}>
 <Text style={{ fontSize:FS.sm, fontWeight:FW.bold, color:theme.textSub, textTransform:'uppercase', letterSpacing:isRTL?undefined:0.5 }}>{title}</Text>
 {action && onAction && (
 <TouchableOpacity onPress={onAction}><Text style={{ fontSize:FS.sm, color:theme.primary, fontWeight:FW.semi }}>{action}</Text></TouchableOpacity>
 )}
 </View>
 );
}

// ─── Settings Row ─────────────────────────────────────────────────────────────
export function NSettingsRow({ icon, label, sub, onPress, right, danger }:
 { icon:string; label:string; sub?:string; onPress?:()=>void; right?:ReactNode; danger?:boolean }) {
 const { theme } = useTheme();
 const { isRTL } = useLang();
 return (
 <TouchableOpacity onPress={onPress} activeOpacity={0.7}
 style={{ flexDirection:isRTL?'row-reverse':'row', alignItems:'center', gap:SP.lg,
 paddingVertical:SP.md, borderBottomWidth:StyleSheet.hairlineWidth, borderBottomColor:theme.border }}>
 <View style={{ width:40, height:40, borderRadius:R.md,
 backgroundColor:danger?theme.dangerBg:theme.primaryLight, alignItems:'center', justifyContent:'center' }}>
 <I name={icon} size={18} color={danger ? theme.danger : theme.primary} />
 </View>
 <View style={{ flex:1 }}>
 <Text style={{ fontSize:FS.md, color:danger?theme.danger:theme.text, fontWeight:FW.med, textAlign:isRTL?'right':'left' }}>{label}</Text>
 {sub && <Text style={{ fontSize:FS.sm, color:theme.textSub, marginTop:2, textAlign:isRTL?'right':'left' }}>{sub}</Text>}
 </View>
 {right ?? <Text style={{ color:theme.textSub, fontSize:FS.lg }}>{isRTL?'‹':'›'}</Text>}
 </TouchableOpacity>
 );
}

// ─── Online Toggle ────────────────────────────────────────────────────────────
export function NOnlineToggle({ value, onToggle }:{ value:boolean; onToggle:()=>void }) {
 const { theme } = useTheme();
 const { isRTL } = useLang();
 const pulse = useRef(new Animated.Value(1)).current;
 useEffect(() => {
 if (!value) return;
 const loop = Animated.loop(Animated.sequence([
 Animated.timing(pulse, { toValue:1.2, duration:1000, useNativeDriver:true }),
 Animated.timing(pulse, { toValue:1, duration:1000, useNativeDriver:true }),
 ]));
 loop.start();
 return () => loop.stop();
 }, [value]);
 return (
 <TouchableOpacity onPress={onToggle}
 style={{ flexDirection:isRTL?'row-reverse':'row', alignItems:'center', gap:SP.sm }}>
 <View style={[s.onlineTrack, { backgroundColor:value?theme.successBg:theme.surface2, borderColor:value?theme.success:theme.border }]}>
 <Animated.View style={[s.onlineDot, { backgroundColor:value?theme.success:theme.textSub, transform:[{scale:value?pulse:1}] }]} />
 </View>
 <Text style={{ fontSize:FS.sm, color:value?theme.success:theme.textSub, fontWeight:FW.semi }}>
 {value ? (isRTL?'متاح الآن':'Online') : (isRTL?'غير متاح':'Offline')}
 </Text>
 </TouchableOpacity>
 );
}

// ─── Search Bar ───────────────────────────────────────────────────────────────
export function NSearch({ value, onChange, placeholder, style }:
 { value:string; onChange:(v:string)=>void; placeholder?:string; style?:object }) {
 const { theme } = useTheme();
 const { isRTL, t } = useLang();
 return (
 <View style={[{ flexDirection:isRTL?'row-reverse':'row', alignItems:'center', gap:SP.md,
 backgroundColor:theme.inputBg, borderRadius:R.xl, paddingHorizontal:SP.lg, height:48,
 borderWidth:1, borderColor:theme.border }, style]}>
 <I name="search" size={18} color={theme.textHint} />
 <TextInput value={value} onChangeText={onChange}
 placeholder={placeholder??t('search')} placeholderTextColor={theme.textHint}
 style={{ flex:1, fontSize:FS.base, color:theme.text, textAlign:isRTL?'right':'left' }} />
 {value.length>0 && (
 <TouchableOpacity onPress={()=>onChange('')}><I name="close" size={14} color={theme.textHint} /></TouchableOpacity>
 )}
 </View>
 );
}

// ─── Keyboard Scroll ──────────────────────────────────────────────────────────
export function NScroll({ children, style, pad=true, refreshControl }:{ children:ReactNode; style?:object; pad?:boolean; refreshControl?:any }) {
 const insets = useSafeAreaInsets();
 return (
 <KeyboardAvoidingView style={{ flex:1 }} behavior={Platform.OS==='ios'?'padding':undefined}>
 <ScrollView style={[{flex:1},style]}
 contentContainerStyle={pad ? { padding:SP.xl, paddingTop: Math.max(insets.top, SP.xl), paddingBottom:48 } : undefined}
 keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
 refreshControl={refreshControl}>
 {children}
 </ScrollView>
 </KeyboardAvoidingView>
 );
}

// ─── Price Input ──────────────────────────────────────────────────────────────
export function NPriceInput({ label, value, onChange, error, required, innerRef }:
  { label:string; value:string; onChange:(v:string)=>void; error?:string; required?:boolean; innerRef?:any }) {
  const { theme } = useTheme();
  const { isRTL } = useLang();
  const localRef = useRef<any>(null);
  const inputRef = innerRef || localRef;
  return (
    <TouchableWithoutFeedback onPress={() => inputRef.current?.focus()}>
      <View style={{ marginBottom:SP.lg }}>
        <View pointerEvents="box-none">
          <Text style={[s.label, { color:theme.text, textAlign:isRTL?'right':'left' }]}>
            {label}{required && <Text style={{ color:theme.danger }}> *</Text>}
          </Text>
          <View style={[s.inputWrap, { backgroundColor:theme.inputBg, borderColor:error?theme.borderErr:theme.border,
            flexDirection:isRTL?'row-reverse':'row', height:52, paddingVertical:0 }]}>
            <TextInput ref={inputRef} value={value} onChangeText={v=>onChange(v.replace(/[^0-9.]/g,''))}
              placeholder="0" placeholderTextColor={theme.textHint} keyboardType="numeric"
              style={[s.textInput, { flex:1, color:theme.text, paddingHorizontal:SP.lg }]} />
            <View style={[s.priceSuffix, { borderColor:theme.border, borderLeftWidth:isRTL?0:1, borderRightWidth:isRTL?1:0 }]}>
              <Text style={{ color:theme.textSub, fontSize:FS.sm, fontWeight:FW.semi }}>ريال</Text>
            </View>
          </View>
          {error && <Text style={[s.hint, { color:theme.danger }]}>{error}</Text>}
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
}

// ─── Bottom Nav ───────────────────────────────────────────────────────────────
export function NBottomNav({ tabs, active, onPress }:
 { tabs:{key:string;icon:string;label:string;badge?:number}[]; active:string; onPress:(k:string)=>void }) {
 const { theme } = useTheme();
 const { isRTL } = useLang();
 return (
 <View style={[s.bottomNav, { backgroundColor:theme.navBg, borderTopColor:theme.border, flexDirection:isRTL?'row-reverse':'row' }]}>
 {tabs.map(tab => {
 const isActive = active===tab.key;
 return (
 <TouchableOpacity key={tab.key} onPress={()=>onPress(tab.key)} style={s.navTab}>
 <View style={[s.navIconWrap, { backgroundColor:isActive?theme.primaryLight:'transparent' }]}>
 <I name={tab.icon} size={20} color={isActive ? theme.primary : theme.navOff} />
 {tab.badge && tab.badge>0
 ? <View style={[s.navBadge, { backgroundColor:theme.danger }]}>
 <Text style={s.navBadgeTxt}>{tab.badge>9?'9+':tab.badge}</Text>
 </View>
 : null}
 </View>
 <Text style={{ fontSize:FS.xs, color:isActive?theme.primary:theme.navOff, fontWeight:isActive?FW.semi:FW.reg, marginTop:2 }}>{tab.label}</Text>
 </TouchableOpacity>
 );
 })}
 </View>
 );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
 label: { fontSize:FS.sm, fontWeight:FW.semi, marginBottom:SP.xs },
 inputWrap: { borderRadius:R.lg, borderWidth:1.5, paddingHorizontal:SP.lg, gap:SP.sm },
 textInput: { flex:1, fontSize:FS.base, paddingVertical:0 },
 inputIcon: { fontSize:FS.lg },
 hint: { fontSize:FS.xs, marginTop:SP.xs },
 phonePrefix: { paddingHorizontal:SP.md, height:'100%', justifyContent:'center', alignItems:'center' },
 checkbox: { width:22, height:22, borderRadius:R.sm, borderWidth:2, alignItems:'center', justifyContent:'center' },
 radioOuter: { width:22, height:22, borderRadius:11, borderWidth:2, alignItems:'center', justifyContent:'center' },
 radioInner: { width:10, height:10, borderRadius:5 },
 backBtn: { width:40, height:40, borderRadius:R.md, alignItems:'center', justifyContent:'center' },
 sheet: { position:'absolute', bottom:0, left:0, right:0, padding:SP.xl },
 sheetHandle: { width:40, height:4, borderRadius:R.full, alignSelf:'center', marginBottom:SP.xl },
 sheetTitle: { fontSize:FS.xl, fontWeight:FW.bold, marginBottom:SP.xl },
 confirmCenter: { ...StyleSheet.absoluteFillObject as object, justifyContent:'center', alignItems:'center', padding:SP.xxl },
 confirmTitle: { fontSize:FS.xl, fontWeight:FW.bold, textAlign:'center', marginBottom:SP.md },
 confirmMsg: { fontSize:FS.md, textAlign:'center', lineHeight:22, marginBottom:SP.xxl },
 successIcon: { width:100, height:100, borderRadius:50, alignItems:'center', justifyContent:'center', marginBottom:SP.xxl, shadowColor:'#4CAF50', shadowOffset:{width:0,height:0}, shadowOpacity:0.3, shadowRadius:20, elevation:10 },
 otpBox: { width:52, height:60, borderRadius:R.lg, borderWidth:2, textAlign:'center', fontSize:FS.xl, fontWeight:FW.bold },
 onlineTrack: { width:52, height:28, borderRadius:14, borderWidth:1.5, justifyContent:'center', paddingHorizontal:3, alignItems:'flex-start' },
 onlineDot: { width:20, height:20, borderRadius:10 },
 bottomNav: { borderTopWidth:StyleSheet.hairlineWidth, paddingBottom:Platform.OS==='ios'?24:10, paddingTop:SP.sm },
 navTab: { flex:1, alignItems:'center' },
 navIconWrap: { width:44, height:30, borderRadius:R.md, alignItems:'center', justifyContent:'center', marginBottom:2, position:'relative' },
 navBadge: { position:'absolute', top:-4, right:-4, minWidth:16, height:16, borderRadius:8, alignItems:'center', justifyContent:'center', paddingHorizontal:3 },
 navBadgeTxt: { color:'#FFF', fontSize:9, fontWeight:'700' },
 priceSuffix: { paddingHorizontal:SP.md, height:'100%', justifyContent:'center', alignItems:'center' },
});

// ─── Interactive Map Radius Component ─────────────────────────────────────────
export function NInteractiveMap({ radius, baseLabel = 'الرياض' }: { radius: number; baseLabel?: string }) {
  const { theme } = useTheme();
  const { isRTL } = useLang();
  
  // Scale the coverage circle from the radius prop (1–50 KM)
  const baseSize = 80;
  const maxRadiusVal = 50;
  const circleSize = baseSize + (radius / maxRadiusVal) * 120;
  
  return (
    <View style={{
      height: 200, width: '100%', borderRadius: R.lg, overflow: 'hidden',
      borderWidth: 1.5, borderColor: theme.border, position: 'relative',
      backgroundColor: theme.surface3, marginTop: SP.md, justifyContent: 'center', alignItems: 'center'
    }}>
      {/* Grid Pattern Background Mocking a Map */}
      <View style={{ position: 'absolute', opacity: 0.1, width: '100%', height: '100%', flexDirection: 'row', flexWrap: 'wrap' }}>
        {Array.from({ length: 48 }).map((_, i) => (
          <View key={i} style={{ width: '16.6%', height: 40, borderWidth: 0.5, borderColor: theme.text }} />
        ))}
      </View>
      
      {/* Base location label (prop-driven) */}
      <View style={{ position: 'absolute', top: 12, left: 16, opacity: 0.7 }}>
        <Text style={{ color: theme.textSub, fontSize: 10 }}>📍 {baseLabel}</Text>
      </View>
      {/* Base Location Marker */}
      <View style={{ position: 'absolute', zIndex: 10, alignItems: 'center' }}>
        <I name="pin" size={28} color={theme.primary || '#0E7A5F'} />
        <View style={{ backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 2 }}>
          <Text style={{ color: '#FFF', fontSize: 10, fontWeight: 'bold' }}>{baseLabel}</Text>
        </View>
      </View>
      
      {/* Dynamic Glowing Circle for Radius */}
      <View style={{
        width: circleSize, height: circleSize, borderRadius: circleSize / 2,
        borderWidth: 2, borderColor: theme.primary,
        backgroundColor: `${theme.primary}15`,
        justifyContent: 'center', alignItems: 'center',
        position: 'absolute'
      }}>
        {/* Animated Inner Pulse */}
        <View style={{
          width: circleSize - 12, height: circleSize - 12, borderRadius: (circleSize - 12) / 2,
          borderWidth: 1, borderColor: `${theme.primary}50`, borderStyle: 'dashed',
          position: 'absolute'
        }} />
      </View>
      
      {/* Radius Badge Overlay */}
      <View style={{
        position: 'absolute', bottom: SP.md, left: SP.md,
        backgroundColor: theme.surface, paddingHorizontal: SP.md, paddingVertical: SP.xs,
        borderRadius: R.sm, borderWidth: 1, borderColor: theme.border
      }}>
        <Text style={{ color: theme.text, fontSize: FS.xs, fontWeight: FW.bold }}>
          {isRTL ? `التغطية: ${radius} كم` : `Radius: ${radius} KM`}
        </Text>
      </View>
    </View>
  );
}

// ─── Profile Photo Image Uploader & WebView Optimizer ──────────────────────────
import { WebView } from 'react-native-webview';

export function NImageOptimizerWebView({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { lang } = useLang();
  const AR = lang === 'ar';
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#000', paddingTop: insets.top }}>
        <View style={{ height: 60, backgroundColor: '#111', flexDirection: AR ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 }}>
          <Text style={{ color: '#FFF', fontSize: 16, fontWeight: 'bold' }}>
            {AR ? ' تحسين وتفريغ الصورة' : ' Remove Background'}
          </Text>
          <TouchableOpacity onPress={onClose} style={{ padding: 8 }}>
            <Text style={{ color: '#FF3B30', fontSize: 16, fontWeight: 'bold' }}>
              {AR ? 'إغلاق' : 'Close'}
            </Text>
          </TouchableOpacity>
        </View>
        <WebView 
          source={{ uri: 'https://www.remove.bg/upload' }} 
          style={{ flex: 1 }} 
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          renderLoading={() => (
            <ActivityIndicator size="large" color="#EC4899" style={{ position: 'absolute', top: '50%', left: '50%', transform: [{ translateX: -15 }, { translateY: -15 }] }} />
          )}
        />
      </View>
    </Modal>
  );
}

export function NProfileImageUploader({
 currentImageId,
 onImageUploaded,
 onProcessComplete,
 ownerType
}: {
 currentImageId?: string;
 onImageUploaded?: () => void;
 onProcessComplete?: (urls: { original: string; processed: string; thumbnail: string }) => void;
 ownerType: 'doctor' | 'nurse' | 'pharmacy';
}) {
 const { theme } = useTheme();
 const { lang } = useLang();
 const { show } = useToast();
 const AR = lang === 'ar';

 const [imageUri, setImageUri] = useState<string | null>(null);
 const [status, setStatus] = useState<'idle' | 'pending' | 'processing' | 'completed' | 'failed'>('idle');
 const [errorMsg, setErrorMsg] = useState('');
 const [showWebView, setShowWebView] = useState(false);
 const pollInterval = useRef<any>(null);

 useEffect(() => {
 checkCurrentStatus();
 return () => stopPolling();
 }, []);

 const checkCurrentStatus = async () => {
 try {
 const res = await client.get('/provider/profile/image/status');
 if (res.data) {
 const s = res.data.processingStatus;
 setStatus(s);
 if (s === 'processing' || s === 'pending') {
 startPolling();
 } else if (s === 'completed' && onProcessComplete) {
 onProcessComplete({
 original: res.data.originalImageUrl,
 processed: res.data.processedImageUrl,
 thumbnail: res.data.thumbnailImageUrl,
 });
 }
 }
 } catch (e) {
 // Non-blocking status check failure
 }
 };

 const startPolling = () => {
 stopPolling();
 pollInterval.current = setInterval(async () => {
 try {
 const res = await client.get('/provider/profile/image/status');
 const s = res.data.processingStatus;
 setStatus(s);
 if (s === 'completed') {
 stopPolling();
 show(AR ? 'تم تحسين وتحديث الصورة بنجاح! ' : 'Profile photo optimized successfully! ', 'success');
 if (onProcessComplete) {
 onProcessComplete({
 original: res.data.originalImageUrl,
 processed: res.data.processedImageUrl,
 thumbnail: res.data.thumbnailImageUrl,
 });
 }
 } else if (s === 'failed') {
 stopPolling();
 setErrorMsg(res.data.error || 'Processing failed');
 show(AR ? 'فشلت معالجة الصورة' : 'Image processing failed', 'error');
 }
 } catch (e: any) {
 stopPolling();
 setStatus('failed');
 setErrorMsg(e.message || 'Network error');
 }
 }, 3000);
 };

 const stopPolling = () => {
 if (pollInterval.current) {
 clearInterval(pollInterval.current);
 pollInterval.current = null;
 }
 };

 const pickImage = async () => {
 const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
 if (!permission.granted) {
 show(AR ? 'مطلوب إذن الوصول للاستوديو' : 'Permission to access gallery is required', 'warning');
 return;
 }

 const result = await ImagePicker.launchImageLibraryAsync({
 mediaTypes: ['images'],
 allowsEditing: true,
 aspect: [1, 1],
 quality: 0.8,
 base64: true,
 });

 if (!result.canceled && result.assets && result.assets[0]) {
 const asset = result.assets[0];
 setImageUri(asset.uri);
 uploadImage(asset.base64 || '', asset.mimeType || 'image/jpeg');
 }
 };

 const uploadImage = async (base64: string, mime: string) => {
 setStatus('pending');
 setErrorMsg('');
 if (onImageUploaded) onImageUploaded();

 try {
 await client.post('/provider/profile/image/upload', {
 data_base64: base64,
 mime,
 original_name: 'profile_photo.jpg',
 });
 setStatus('processing');
 startPolling();
 } catch (e: any) {
 setStatus('failed');
 setErrorMsg(e.message || 'Upload failed');
 show(AR ? 'فشل رفع الصورة' : 'Photo upload failed', 'error');
 }
 };

 const renderStatus = () => {
 if (status === 'pending') {
 return (
 <View style={st.statusRow}>
 <ActivityIndicator size="small" color={theme.primary} />
 <Text style={[st.statusTxt, { color: theme.textSub }]}>
 {AR ? 'جاري تهيئة الصورة...' : 'Preparing photo...'}
 </Text>
 </View>
 );
 }
 if (status === 'processing') {
 return (
 <View style={st.statusRow}>
 <ActivityIndicator size="small" color={theme.primary} />
 <Text style={[st.statusTxt, { color: theme.textSub }]}>
 {AR ? 'جاري معالجة إزالة الخلفية والضغط...' : 'Removing background & optimizing...'}
 </Text>
 </View>
 );
 }
 if (status === 'failed') {
 return (
 <View style={st.statusRow}>
 <Text style={[st.statusTxt, { color: theme.danger }]}>
 {AR ? 'فشلت المعالجة: ' : 'Failed: '} {errorMsg}
 </Text>
 </View>
 );
 }
 if (status === 'completed') {
 return (
 <View style={st.statusRow}>
 <Text style={[st.statusTxt, { color: theme.success }]}>
 {AR ? 'تم التحسين والجاهزية' : 'Optimized & Ready'}
 </Text>
 </View>
 );
 }
 return null;
 };

 return (
 <View style={st.container}>
 <Text style={[st.helperTxt, { color: theme.textSub, textAlign: AR ? 'right' : 'left' }]}>
 {AR
 ? ' لتحسين مظهر البروفايل وزيادة ثقة المرضى، يفضل استخدام صورة بخلفية شفافة.'
 : ' For a professional look and patient trust, it is recommended to use a photo with a transparent background.'}
 </Text>
 
 <View style={{ flexDirection: AR ? 'row-reverse' : 'row', gap: SP.md, marginTop: SP.md, alignItems: 'center' }}>
 <TouchableOpacity onPress={pickImage} style={[st.actionBtn, { backgroundColor: theme.primary }]}>
 <Text style={st.actionBtnTxt}> {AR ? 'تحميل صورة' : 'Upload Photo'}</Text>
 </TouchableOpacity>
 
 <TouchableOpacity onPress={() => setShowWebView(true)} style={[st.actionBtn, { backgroundColor: theme.surface2, borderColor: theme.border, borderWidth: 1 }]}>
 <Text style={[st.actionBtnTxt, { color: theme.text }]}> {AR ? 'تحسين الصورة' : 'Improve Photo'}</Text>
 </TouchableOpacity>
 </View>

 {renderStatus()}

 <NImageOptimizerWebView visible={showWebView} onClose={() => setShowWebView(false)} />
 </View>
 );
}

// ─── Dropdown Picker ──────────────────────────────────────────────────────────
export function NDropdown({
 label, value, options, onChange, placeholder = 'Select...'
}: {
 label?: string;
 value: string;
 options: { val: string; label: string }[];
 onChange: (v: string) => void;
 placeholder?: string;
}) {
 const { theme } = useTheme();
 const { isRTL } = useLang();
 const [open, setOpen] = useState(false);

 const selectedOpt = options.find(o => o.val === value);

 return (
 <View style={{ flex: 1 }}>
 {label && (
 <Text style={{ fontSize: FS.xs, color: theme.textSub, marginBottom: SP.xs, textAlign: isRTL ? 'right' : 'left' }}>
 {label}
 </Text>
 )}
 <TouchableOpacity
 onPress={() => setOpen(true)}
 style={{
 height: 48,
 borderRadius: R.md,
 borderWidth: 1,
 borderColor: theme.border,
 backgroundColor: theme.card,
 flexDirection: isRTL ? 'row-reverse' : 'row',
 alignItems: 'center',
 justifyContent: 'space-between',
 paddingHorizontal: SP.md,
 }}
 >
 <Text style={{ fontSize: FS.sm, color: value ? theme.text : theme.textHint }}>
 {selectedOpt ? selectedOpt.label : placeholder}
 </Text>
 <Text style={{ fontSize: FS.xs, color: theme.textSub }}>▼</Text>
 </TouchableOpacity>

 <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
 <TouchableWithoutFeedback onPress={() => setOpen(false)}>
 <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
 <View style={{
 width: '80%',
 maxHeight: '50%',
 backgroundColor: theme.surface,
 borderRadius: R.lg,
 padding: SP.md,
 shadowColor: '#000',
 shadowOffset: { width: 0, height: 4 },
 shadowOpacity: 0.1,
 shadowRadius: 8,
 elevation: 5,
 }}>
 <ScrollView showsVerticalScrollIndicator={false}>
 {options.map(item => (
 <TouchableOpacity
 key={item.val}
 onPress={() => {
 onChange(item.val);
 setOpen(false);
 }}
 style={{
 paddingVertical: SP.md,
 borderBottomWidth: 1,
 borderBottomColor: theme.border,
 alignItems: isRTL ? 'flex-end' : 'flex-start',
 }}
 >
 <Text style={{
 fontSize: FS.md,
 color: value === item.val ? theme.primary : theme.text,
 fontWeight: value === item.val ? FW.bold : FW.reg
 }}>
 {item.label}
 </Text>
 </TouchableOpacity>
 ))}
 </ScrollView>
 </View>
 </View>
 </TouchableWithoutFeedback>
 </Modal>
 </View>
 );
}

// ─── Theme Slider Switch ──────────────────────────────────────────────────────
export function NThemeSlider() {
 const { theme, mode, toggle } = useTheme();
 const anim = React.useRef(new Animated.Value(mode === 'dark' ? 1 : 0)).current;

 React.useEffect(() => {
 Animated.spring(anim, {
 toValue: mode === 'dark' ? 1 : 0,
 useNativeDriver: true,
 tension: 60,
 friction: 8,
 }).start();
 }, [mode]);

 const translateX = anim.interpolate({
 inputRange: [0, 1],
 outputRange: [2, 34], // Container: 68 wide, Thumb: 28 wide, Padding: 2. Max: 68 - 28 - 4 = 36. 2 to 34 is perfect.
 });

 return (
 <TouchableOpacity
 activeOpacity={0.85}
 onPress={toggle}
 style={{
 width: 68,
 height: 34,
 borderRadius: 17,
 backgroundColor: theme.surface2,
 borderWidth: 1,
 borderColor: theme.border,
 justifyContent: 'center',
 paddingHorizontal: 2,
 }}
 >
 <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 8, position: 'absolute', width: '100%', alignItems: 'center' }}>
 <I name="moon" size={14} color={mode === 'dark' ? theme.text : theme.textSub} />
 <I name="sun" size={14} color={mode === 'light' ? theme.text : theme.textSub} />
 </View>
 <Animated.View
 style={{
 width: 28,
 height: 28,
 borderRadius: 14,
 backgroundColor: theme.card,
 alignItems: 'center',
 justifyContent: 'center',
 transform: [{ translateX }],
 shadowColor: '#000',
 shadowOffset: { width: 0, height: 2 },
 shadowOpacity: 0.15,
 shadowRadius: 2.5,
 elevation: 3,
 }}
 >
 <I
 name={mode === 'dark' ? 'sun' : 'moon'}
 size={14}
 color={mode === 'dark' ? '#FFB300' : '#7E57C2'}
 />
 </Animated.View>
 </TouchableOpacity>
 );
}

const st = StyleSheet.create({
 container: { marginTop: SP.sm, width: '100%' },
 helperTxt: { fontSize: FS.sm, lineHeight: 20 },
 actionBtn: { paddingVertical: SP.sm, paddingHorizontal: SP.lg, borderRadius: R.md, alignItems: 'center', justifyContent: 'center' },
 actionBtnTxt: { color: '#FFF', fontWeight: FW.bold, fontSize: FS.sm },
 statusRow: { flexDirection: 'row', alignItems: 'center', gap: SP.sm, marginTop: SP.md },
 statusTxt: { fontSize: FS.xs, fontWeight: FW.semi },
});

// ─── Date Picker Sheet / Calendar ─────────────────────────────────────────────
export function NDatePickerSheet({
 visible, value, onChange, onClose, title
}: {
 visible: boolean;
 value: string;
 onChange: (v: string) => void;
 onClose: () => void;
 title?: string;
}) {
 const { theme } = useTheme();
 const { isRTL } = useLang();
 
 // Initial date parse or fallback to today
 const initialDate = value ? new Date(value) : new Date();
 const [year, setYear] = useState(initialDate.getFullYear() || 2026);
 const [month, setMonth] = useState(initialDate.getMonth() !== undefined ? initialDate.getMonth() : 6); // 0-indexed

 // Month names
 const MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
 const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
 const DAYS_AR = ['أح', 'اث', 'ثلا', 'أر', 'خم', 'جم', 'سب'];
 const DAYS_EN = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

 // Days calculations
 const daysInMonth = new Date(year, month + 1, 0).getDate();
 const firstDayIndex = new Date(year, month, 1).getDay();

 const daysArray = [];
 // Fill empty slots for previous month padding
 for (let i = 0; i < firstDayIndex; i++) {
 daysArray.push(null);
 }
 // Fill actual month days
 for (let d = 1; d <= daysInMonth; d++) {
 daysArray.push(d);
 }

 const handlePrevMonth = () => {
 if (month === 0) {
 setMonth(11);
 setYear(y => y - 1);
 } else {
 setMonth(m => m - 1);
 }
 };

 const handleNextMonth = () => {
 if (month === 11) {
 setMonth(0);
 setYear(y => y + 1);
 } else {
 setMonth(m => m + 1);
 }
 };

 const selectDay = (day: number) => {
 const dStr = String(day).padStart(2, '0');
 const mStr = String(month + 1).padStart(2, '0');
 onChange(`${year}-${mStr}-${dStr}`);
 onClose();
 };

 return (
 <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
 <TouchableWithoutFeedback onPress={onClose}>
 <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
 <TouchableWithoutFeedback>
 <View style={{
 backgroundColor: theme.surface,
 borderTopLeftRadius: R.xl,
 borderTopRightRadius: R.xl,
 padding: SP.xl,
 paddingBottom: Platform.OS === 'ios' ? 40 : SP.xl,
 borderWidth: 1,
 borderColor: theme.border,
 }}>
 {/* Header */}
 <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SP.lg }}>
 <Text style={{ fontSize: FS.lg, fontWeight: FW.bold, color: theme.text }}>
 {title || (isRTL ? 'اختر التاريخ' : 'Select Date')}
 </Text>
 <TouchableOpacity onPress={onClose}>
 <I name="close" size={24} color={theme.textSub} />
 </TouchableOpacity>
 </View>

 {/* Month Selector */}
 <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SP.md }}>
 <TouchableOpacity onPress={handlePrevMonth} style={{ padding: SP.sm }}>
 <Text style={{ fontSize: FS.lg, color: theme.primary }}>◀</Text>
 </TouchableOpacity>
 <Text style={{ fontSize: FS.md, fontWeight: FW.bold, color: theme.text }}>
 {isRTL ? MONTHS_AR[month] : MONTHS_EN[month]} {year}
 </Text>
 <TouchableOpacity onPress={handleNextMonth} style={{ padding: SP.sm }}>
 <Text style={{ fontSize: FS.lg, color: theme.primary }}>▶</Text>
 </TouchableOpacity>
 </View>

 {/* Day names */}
 <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', marginBottom: SP.sm }}>
 {(isRTL ? DAYS_AR : DAYS_EN).map((day, idx) => (
 <View key={idx} style={{ flex: 1, alignItems: 'center' }}>
 <Text style={{ fontSize: FS.xs, color: theme.textSub, fontWeight: FW.bold }}>{day}</Text>
 </View>
 ))}
 </View>

 {/* Days grid */}
 <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' }}>
 {daysArray.map((day, index) => {
 if (day === null) {
 return <View key={index} style={{ width: '14.28%', height: 40 }} />;
 }
 
 const dStr = String(day).padStart(2, '0');
 const mStr = String(month + 1).padStart(2, '0');
 const curDateStr = `${year}-${mStr}-${dStr}`;
 const isSelected = value === curDateStr;

 return (
 <TouchableOpacity
 key={index}
 onPress={() => selectDay(day)}
 style={{
 width: '14.28%',
 height: 40,
 alignItems: 'center',
 // paddingVertical: SP.sm,
 justifyContent: 'center',
 borderRadius: R.sm,
 backgroundColor: isSelected ? theme.primary : 'transparent',
 }}
 >
 <Text style={{
 fontSize: FS.sm,
 fontWeight: isSelected ? FW.bold : FW.reg,
 color: isSelected ? '#FFF' : theme.text,
 }}>
 {day}
 </Text>
 </TouchableOpacity>
 );
 })}
 </View>
 </View>
 </TouchableWithoutFeedback>
 </View>
 </TouchableWithoutFeedback>
 </Modal>
 );
}
