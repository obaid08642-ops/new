/**
 * NABDAH PLUS — All Context Providers
 * Theme · Language · Auth · Toast
 */
import React, {
 createContext, useContext, useState, useEffect,
 useCallback, useRef, ReactNode
} from 'react';
import {
 Animated, View, Text, StyleSheet, I18nManager,
 Appearance, AppState, AppStateStatus, Platform
} from 'react-native';
import * as LocalAuth from 'expo-local-authentication';
import { getTheme, TR, type ThemeMode, type Theme, type Lang, type TKey, API_BASE } from '../constants';
import { Vault, Tokens, SessionMgr, RateLimiter, Audit, SK, Validate, Biometric, buildHeaders, DeviceId } from '../security/Security';
import apiClient from '../api/client';
import { isOnline } from '../api/online';

/** Localized message + next step for one catalog code. */
export type CatalogEntry = { message: string; nextStep: string };

// ═══════════════════════════════════════
// THEME
// ═══════════════════════════════════════
interface ThemeCtxType { mode: ThemeMode; theme: Theme; toggle: () => void; set: (m: ThemeMode) => void; }
const ThemeCtx = createContext<ThemeCtxType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
 const systemMode = (Appearance.getColorScheme() as 'light' | 'dark' | null) ?? 'light';
 const [mode, setModeState] = useState<ThemeMode>('system');
 const [systemColor, setSystemColor] = useState<'light' | 'dark'>(systemMode);

  useEffect(() => {
    Vault.get('THEME_MODE').then(saved => {
      if (saved === 'light' || saved === 'dark' || saved === 'system') setModeState(saved);
    });
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      if (colorScheme !== 'light' && colorScheme !== 'dark') return;
      setSystemColor(colorScheme);
    });
    return () => sub.remove();
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    Vault.set('THEME_MODE', next);
  }, []);

  const toggle = useCallback(() => {
    setModeState(prev => {
      const effective = prev === 'system' ? systemColor : prev;
      const next = effective === 'light' ? 'dark' : 'light';
      Vault.set('THEME_MODE', next);
      return next;
    });
  }, [systemColor]);

 const effectiveMode = mode === 'system' ? systemColor : mode;
 return (
 <ThemeCtx.Provider value={{ mode, theme: getTheme(effectiveMode), toggle, set: setMode }}>
 {children}
 </ThemeCtx.Provider>
 );
}
export const useTheme = (): ThemeCtxType => {
 const c = useContext(ThemeCtx);
 if (!c) throw new Error('useTheme outside ThemeProvider');
 return c;
};

// ═══════════════════════════════════════
// LANGUAGE
// ═══════════════════════════════════════
interface LangCtxType { lang: Lang; isRTL: boolean; toggle: () => void; set: (l: Lang) => void; t: (k: TKey) => string; }
const LangCtx = createContext<LangCtxType | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
 const deviceCode = (() => {
   try { return String(Intl.DateTimeFormat().resolvedOptions().locale || '').split('-')[0].toLowerCase(); } catch { return ''; }
 })();
 const deviceLang: Lang = deviceCode === 'ar' ? 'ar' : 'en';
 const [lang, setLangState] = useState<Lang>(deviceLang);

  useEffect(() => {
    Vault.get('APP_LANG').then(saved => {
      if (saved === 'ar' || saved === 'en') {
        setLangState(saved);
        I18nManager.forceRTL(saved === 'ar');
      } else {
        I18nManager.forceRTL(deviceLang === 'ar');
      }
    });
  }, [deviceLang]);

  const set = useCallback((l: Lang) => {
    setLangState(l);
    I18nManager.forceRTL(l === 'ar');
    Vault.set('APP_LANG', l);
  }, []);

 const toggle = useCallback(() => set(lang === 'ar' ? 'en' : 'ar'), [lang, set]);

 const t = useCallback((k: TKey): string => {
 return (TR[lang] as Record<string, string>)[k] ?? (TR.en as Record<string, string>)[k] ?? String(k);
 }, [lang]);

 return (
 <LangCtx.Provider value={{ lang, isRTL: lang === 'ar', toggle, set, t }}>
 {children}
 </LangCtx.Provider>
 );
}
export const useLang = (): LangCtxType => {
 const c = useContext(LangCtx);
 if (!c) throw new Error('useLang outside LangProvider');
 return c;
};

// ═══════════════════════════════════════
// TOAST
// ═══════════════════════════════════════
export type ToastType = 'success' | 'error' | 'warning' | 'info';
interface ToastCtxType {
  show: (msg: string, type?: ToastType, dur?: number) => void;
  /** 13.R5: resolve a backend `code` through the catalog and toast it. */
  showCode: (code: string, lang?: Lang, type?: ToastType) => void;
  /** 13.R5: extract backend code from any thrown value and toast catalog text. */
  showBackendError: (err: unknown, lang?: Lang) => void;
}
const ToastCtx = createContext<ToastCtxType | null>(null);

// ─── 13.R5 backend error catalog ───────────────────────────────────────────
// P15.1: the table moved to `src/api/errorCatalog.ts` so the single HTTP client
// and the toast resolve codes through exactly the same source. Re-exported here
// because existing screens import these names from this module.
import {
  CATALOG as BACKEND_ERROR_CATALOG_TABLE,
  extractCatalogCode as extractToastBackendCode,
  lookupCatalogError,
  normalizeCatalogCode as normalizeToastBackendCode,
} from '../api/errorCatalog';

export const BACKEND_ERROR_CATALOG = BACKEND_ERROR_CATALOG_TABLE;

export function resolveBackendErrorText(code: unknown, lang: Lang = 'ar'): CatalogEntry {
  const resolved = lookupCatalogError(code, lang === 'en' ? 'en' : 'ar');
  return { message: resolved.message, nextStep: resolved.nextStep };
}

function ToastItem({ msg, type, onDone }: { msg: string; type: ToastType; onDone: () => void }) {
 const y = useRef(new Animated.Value(-100)).current;
 const op = useRef(new Animated.Value(0)).current;
 const cfg: Record<ToastType,{bg:string;icon:string}> = {
 success:{ bg:'#1B5E20', icon:'' },
 error: { bg:'#B71C1C', icon:'' },
 warning:{ bg:'#E65100', icon:'' },
 info: { bg:'#0D47A1', icon:'' },
 };
 const { bg, icon } = cfg[type];

 useEffect(() => {
 Animated.parallel([
 Animated.spring(y, { toValue:0, tension:80, friction:10, useNativeDriver:true }),
 Animated.timing(op, { toValue:1, duration:200, useNativeDriver:true }),
 ]).start();
 const t = setTimeout(() => {
 Animated.parallel([
 Animated.timing(y, { toValue:-100, duration:280, useNativeDriver:true }),
 Animated.timing(op, { toValue:0, duration:280, useNativeDriver:true }),
 ]).start(onDone);
 }, 3200);
 return () => clearTimeout(t);
 }, []);

 return (
 <Animated.View style={[tStyles.toast, { backgroundColor:bg, transform:[{translateY:y}], opacity:op }]}>
 <Text style={{ fontSize:20 }}>{icon}</Text>
 <Text style={tStyles.toastTxt} numberOfLines={2}>{msg}</Text>
 </Animated.View>
 );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [item, setItem] = useState<{ msg:string; type:ToastType; id:number } | null>(null);
  const counter = useRef(0);
  const show = useCallback((msg: string, type: ToastType = 'success') => {
  counter.current++;
  setItem({ msg, type, id: counter.current });
  }, []);
  const showCode = useCallback((code: string, lang: Lang = 'ar', type: ToastType = 'error') => {
  const entry = resolveBackendErrorText(code, lang);
  show(`${entry.message} ${entry.nextStep}`, type);
  }, [show]);
  const showBackendError = useCallback((err: unknown, lang: Lang = 'ar') => {
  const code = extractToastBackendCode(err) ?? 'UNKNOWN_ERROR';
  showCode(code, lang, 'error');
  }, [showCode]);
  return (
  <ToastCtx.Provider value={{ show, showCode, showBackendError }}>
  {children}
  {item && <ToastItem key={item.id} msg={item.msg} type={item.type} onDone={() => setItem(null)} />}
  </ToastCtx.Provider>
  );
}
export const useToast = (): ToastCtxType => {
 const c = useContext(ToastCtx);
 if (!c) throw new Error('useToast outside ToastProvider');
 return c;
};

// ═══════════════════════════════════════
// AUTH
// ═══════════════════════════════════════
export type AppStateStatusType = 'checking' | 'logged_out' | 'logged_in' | 'suspended' | 'pending' | 'rejected' | 'offline';

interface User {
 id: string; name: string; displayName: string;
 email: string; phone: string; providerType: string;
 status: string; avatar?: string; isOnline: boolean;
 subId?: string; role?: string; permissions?: string[];
}
interface AuthCtxType {
 user: User | null; isLoading: boolean; isLoggedIn: boolean; appState: AppStateStatusType;
 login: (id: string, pass: string) => Promise<{ ok: boolean; err?: string }>;
 bioLogin: () => Promise<{ ok: boolean; err?: string }>;
 enableBiometric: () => Promise<boolean>;
 logout: () => Promise<void>;
 updateUser: (d: Partial<User>) => void;
 toggleOnline: () => void;
 refreshSession: () => Promise<void>;
}
const AuthCtx = createContext<AuthCtxType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [appState, setAppState] = useState<AppStateStatusType>('checking');
  const { t, lang } = useLang();
  const { showBackendError } = useToast();

  useEffect(() => { refreshSession(); }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s: AppStateStatus) => {
      if (s === 'active' && user) refreshSession();
    });
    return () => sub.remove();
  }, [user]);

  const refreshSession = async () => {
    try {
      const isBio = await Vault.get(SK.BIOENABLED);
      if (isBio === 'true') {
        const refresh = await Tokens.getRefresh();
        if (refresh) {
          // Do not silently refresh; leave appState as 'logged_out' to prompt biometric
          setAppState('logged_out');
          setLoading(false);
          return;
        }
      }
      const refreshed = await tryRefresh();
      if (!refreshed) { await logout(); return; }
    } catch (e) {
      if (__DEV__) console.warn('[Auth] refreshSession error', e);
      // P15.1: a transport failure means the device is offline — the client records
      // this, and the app shows the offline state instead of a logged-out spinner.
      if (!isOnline()) {
        setAppState('offline');
        setLoading(false);
        return;
      }
      setAppState('logged_out');
    } finally {
      setLoading(false);
    }
  };

  const mapBackendResponseToUser = (data: any): User => ({
    id: data.provider_id,
    name: data.profile?.display_name_en || data.profile?.display_name_ar || data.account?.email || 'Nabd Provider',
    displayName: data.profile?.display_name_en || data.profile?.display_name_ar || data.account?.email || 'Nabd Provider',
    email: data.account?.email || '',
    phone: data.profile?.phones?.[0]?.number || '',
    providerType: data.provider_type,
    status: data.profile_status,
    // Availability is operational state, not a profile default; it is updated only by the availability endpoint.
    isOnline: false,
    subId: data.provider_id.substring(0, 8).toUpperCase(),
    role: data.role,
    permissions: data.permissions
  });

  const checkAppStatus = (status: string) => {
    const s = String(status || '').toLowerCase();
    if (s === 'suspended') { setAppState('suspended'); return false; }
    if (s === 'rejected') { setAppState('rejected'); return false; }
    if (s === 'pending' || s === 'under_review' || s === 'submitted') { setAppState('pending'); return false; }
    setAppState('logged_in');
    return true;
  };

  const tryRefresh = async (): Promise<boolean> => {
    const refresh = await Tokens.getRefresh();
    const sessionId = await Tokens.getSessionId();
    if (!refresh || !sessionId) return false;
    try {
      const deviceId = await DeviceId.get();
      const data: any = await apiClient.post('/provider/auth/refresh', {
        refresh_token: refresh,
        session_id: sessionId,
        device_identifier: deviceId,
      });
      await Tokens.save(data.access_token, data.refresh_token, sessionId, data.provider_id, data.provider_type);
      const u = mapBackendResponseToUser(data);
      if (!checkAppStatus(u.status)) return false;
      setUser(u);
      return true;
    } catch {
      return false;
    }
  };

  const login = async (identifier: string, password: string): Promise<{ ok: boolean; err?: string }> => {
    const key = `login_${identifier}`;
    if (!RateLimiter.check(key, 5, 15 * 60 * 1000)) {
      const min = Math.ceil(RateLimiter.remaining(key) / 60000);
      return { ok: false, err: `محاولات كثيرة جداً. حاول بعد ${min} دقيقة.` };
    }
    try {
      const deviceId = await DeviceId.get();
      // P15.1: the client supplies the device id in its secure headers, and rejects
      // with a catalog-mapped error that already carries message + next step.
      const data: any = await apiClient.post('/provider/auth/login', {
        email: identifier,
        password,
        meta: { device_identifier: deviceId },
      });

      await Tokens.save(data.access_token, data.refresh_token, data.session_id, data.provider_id, data.provider_type);
      const u = mapBackendResponseToUser(data);
      if (!checkAppStatus(u.status)) return { ok: false, err: 'الحساب موقوف' };
      setUser(u);
      RateLimiter.reset(key);
      Audit.log('login', true, { provider: u.providerType });
      return { ok: true };
    } catch (e: any) {
      Audit.log('login_fail', false, { identifier });
      // 13.R5: the client already mapped this to a catalog code with localized text.
      return { ok: false, err: `${e?.message || ''} ${e?.nextStep || ''}`.trim() || t('serverErr') };
    }
  };

  const enableBiometric = async () => {
    const bioAvailable = await Biometric.isAvailable();
    if (!bioAvailable) return false;
    const { success } = await LocalAuth.authenticateAsync({ promptMessage: 'Enable Biometric Login' });
    if (success) {
      await Vault.set(SK.BIOENABLED, 'true');
      Audit.log('biometric_enabled', true);
      return true;
    }
    return false;
  };

  const bioLogin = async (): Promise<{ ok: boolean; err?: string }> => {
    try {
      const refresh = await Tokens.getRefresh();
      const bioEnabled = await Vault.get(SK.BIOENABLED);
      if (!refresh || bioEnabled !== 'true') {
        return { ok: false, err: 'يرجى تسجيل الدخول وإعداد البصمة أولاً' };
      }
      
      const { success } = await LocalAuth.authenticateAsync({ promptMessage: 'Unlock Nabd+ Plus' });
      if (!success) return { ok: false, err: 'فشل التحقق من البصمة' };

      const ok = await tryRefresh();
      if (ok) {
        Audit.log('biometric_login', true);
        return { ok: true };
      }
      return { ok: false, err: 'فشل تحديث الجلسة. يرجى تسجيل الدخول مرة أخرى.' };
    } catch (e: any) {
      return { ok: false, err: t('serverErr') };
    }
  };

const logout = async () => {
    try {
      const sessionId = await Tokens.getSessionId();
      if (sessionId) {
        // P15.1: through the single client. Best-effort — a failed logout must not
        // strand the user in a signed-in state, so the rejection is swallowed.
        await apiClient.post('/provider/auth/logout', { session_id: sessionId });
      }
    } catch (e) {}
    Audit.log('logout', true);
    SessionMgr.stop();
    await Tokens.clear();
    setAppState('logged_out');
    setUser(null);
  };

 const updateUser = (data: Partial<User>) => {
 setUser(prev => {
 if (!prev) return null;
 const next = { ...prev, ...data };
 return next;
 });
 };

const toggleOnline = async () => {
  const next = !user?.isOnline;
  // Optimistic update
  updateUser({ isOnline: next });
  Audit.log('toggle_online', next);
  try {
  const data: any = await apiClient.post('/provider/ops/availability/toggle-instant');
  updateUser({ isOnline: data.instant_available });
  } catch (err) {
  // Revert optimistic update on failure
  updateUser({ isOnline: !next });
  // 13.R5: toast the backend catalog entry (message + next step).
  showBackendError(err, lang);
  }
 };

 return (
 <AuthCtx.Provider value={{
  user,
   isLoading: loading,
   isLoggedIn: !!user && appState === 'logged_in',
   appState,
   login,
   bioLogin,
   enableBiometric,
   logout,
   updateUser,
   toggleOnline,
   refreshSession,
  }}>
 {children}
 </AuthCtx.Provider>
 );
}
export const useAuth = (): AuthCtxType => {
 const c = useContext(AuthCtx);
 if (!c) throw new Error('useAuth outside AuthProvider');
 return c;
};

// ═══════════════════════════════════════
// ROOT PROVIDER
// ═══════════════════════════════════════
export function RootProvider({ children }: { children: ReactNode }) {
 return (
 <ThemeProvider>
 <LangProvider>
 <ToastProvider>
 <AuthProvider>{children}</AuthProvider>
 </ToastProvider>
 </LangProvider>
 </ThemeProvider>
 );
}

// ─── Toast styles ─────────────────────────────────────────────────────────────
const tStyles = StyleSheet.create({
 toast: {
 position: 'absolute', top: 55, left: 16, right: 16, zIndex: 9999,
 flexDirection: 'row', alignItems: 'center', gap: 12,
 borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14,
 shadowColor: '#000', shadowOffset:{width:0,height:6},
 shadowOpacity:0.35, shadowRadius:10, elevation:12,
 },
 toastTxt: { flex:1, color:'#FFF', fontSize:15, fontWeight:'500', lineHeight:20 },
});
