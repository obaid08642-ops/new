# Phase 0D semantic evidence

- **Surface:** Provider
- **Archive:** `NabdProvider-provider.zip`
- **Member path:** `src/components/ui.tsx`
- **Member SHA-256:** `4d987e9f56bd3f88939f5e8b14ba604b8127a676d32f60f95113acf8112cd4ac`
- **Line count:** 1379
- **Read range:** `1-1379`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `33: export function NCard({ children, style, onPress, noPad, accent }:`
- `34: { children:ReactNode; style?:object; onPress?:()=>void; noPad?:boolean; accent?:string }) {`
- `48: if (onPress) return <TouchableOpacity onPress={onPress} activeOpacity={0.85}>{inner}</TouchableOpacity>;`
- `57: label, onPress, variant='primary', size='md',`
- `60: label:string; onPress:()=>void; variant?:BtnVariant; size?:BtnSize;`
- `73: onPress();`
- `86: <TouchableOpacity onPress={press} activeOpacity={0.9} disabled={disabled||loading}`
- `106: caps='none', required, style, returnKey, onSubmit, autoFocus, innerRef,`
- `113: returnKey?:any; onSubmit?:()=>void; autoFocus?:boolean; innerRef?:any;`
- `134: <TouchableWithoutFeedback onPress={() => inputRef.current?.focus()}>`
- `161: onSubmitEditing={onSubmit}`
- `166: <TouchableOpacity onPress={() => setShowPass(p=>!p)}>`
### backend_consumers_or_contracts
- `17: import client from '../api/client';`
### auth_ownership
- `524: // ─── OTP Input ────────────────────────────────────────────────────────────────`
- `525: export function NOTP({ target, otp, setOtp, onVerify, loading, onResend }:`
- `526: { target:string; otp:string[]; setOtp:(v:string[])=>void; onVerify:()=>void; loading?:boolean; onResend?:()=>void }) {`
- `537: const n = [...otp]; n[i]=text.slice(-1); setOtp(n);`
- `543: <Text style={{ fontSize:FS['3xl'], fontWeight:FW.bold, color:theme.text, marginBottom:SP.md }}>{t('otpTitle')}</Text>`
- `545: {t('otpSentTo')} <Text style={{ color:theme.primary, fontWeight:FW.semi }}>{target}</Text>`
- `548: {otp.map((d,i) => (`
- `552: style={[s.otpBox, { backgroundColor:theme.inputBg, borderColor:d?theme.primary:theme.border, color:theme.text }]} />`
- `555: <NBtn label={t('otpVerify')} onPress={onVerify} loading={loading} disabled={otp.join('').length<6} />`
- `559: {cd>0 ? `${t('otpResend')} (${cd}s)` : t('otpResend')}`
- `668: export function NScroll({ children, style, pad=true, refreshControl }:{ children:ReactNode; style?:object; pad?:boolean; refreshControl?:any }) {`
- `675: refreshControl={refreshControl}>`
### state_transitions
- `5: import React, { useRef, useEffect, useState, ReactNode } from 'react';`
- `58: icon, iconRight, loading, disabled, style, labelStyle, full=true`
- `61: icon?:string; iconRight?:string; loading?:boolean; disabled?:boolean;`
- `86: <TouchableOpacity onPress={press} activeOpacity={0.9} disabled={disabled||loading}`
- `90: {loading`
- `104: label, placeholder, value, onChange, secure, kbType, error, hint,`
- `109: secure?:boolean; kbType?:any; error?:string; hint?:string;`
- `118: const [focused, setFocused] = useState(false);`
- `119: const [showPass, setShowPass] = useState(false);`
- `130: outputRange:[error ? theme.borderErr : theme.border, error ? theme.borderErr : theme.borderFocus]`
- `179: {(error||hint) && (`
- `180: <Text style={[s.hint, { color:error?theme.danger:theme.textSub, textAlign:isRTL?'right':'left' }]}>{error||hint}</Text>`
### payment_insurance_relevance
- `32: // ─── Card ─────────────────────────────────────────────────────────────────────`
- `33: export function NCard({ children, style, onPress, noPad, accent }:`
- `38: backgroundColor:theme.card, borderRadius:R.xl,`
- `346: borderRadius:size*0.14, backgroundColor:online?theme.success:theme.danger, borderWidth:2, borderColor:theme.card }} />`
- `365: export function NStepBar({ total, current, style }:{ total:number; current:number; style?:object }) {`
- `369: {Array.from({length:total}).map((_,i) => (`
- `378: export function NHeader({ title, sub, step, total, onBack, right, style }:`
- `379: { title?:string; sub?:string; step?:number; total?:number; onBack?:()=>void; right?:ReactNode; style?:object }) {`
- `393: <Text style={{ fontSize:FS.xs, color:theme.textSub, fontWeight:FW.med }}>{step} / {total}</Text>`
- `398: {total !== undefined && step !== undefined && <NStepBar total={total} current={step} style={{ marginBottom:SP.xs }} />}`
- `444: <NCard style={{ width:W-48, padding:SP.xxl }}>`
- `451: </NCard>`
### error_empty_loading_retry_cancel
- `58: icon, iconRight, loading, disabled, style, labelStyle, full=true`
- `61: icon?:string; iconRight?:string; loading?:boolean; disabled?:boolean;`
- `86: <TouchableOpacity onPress={press} activeOpacity={0.9} disabled={disabled||loading}`
- `90: {loading`
- `104: label, placeholder, value, onChange, secure, kbType, error, hint,`
- `109: secure?:boolean; kbType?:any; error?:string; hint?:string;`
- `130: outputRange:[error ? theme.borderErr : theme.border, error ? theme.borderErr : theme.borderFocus]`
- `179: {(error||hint) && (`
- `180: <Text style={[s.hint, { color:error?theme.danger:theme.textSub, textAlign:isRTL?'right':'left' }]}>{error||hint}</Text>`
- `189: export function NPhoneInput({ value, onChange, error, label, required, innerRef }:`
- `190: { value:string; onChange:(v:string)=>void; error?:string; label?:string; required?:boolean; innerRef?:any }) {`
- `206: borderColor:error?theme.borderErr:focused?theme.borderFocus:theme.border, height:52, paddingVertical:0 }]}>`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
