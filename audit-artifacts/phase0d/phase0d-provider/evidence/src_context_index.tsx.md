# Phase 0D semantic evidence

- **Surface:** Provider
- **Archive:** `NabdProvider-provider.zip`
- **Member path:** `src/context/index.tsx`
- **Member SHA-256:** `3c288ab0a29efb1f9e8fefe4088224ea3c5d4ff8de5130308f44a6205130c42d`
- **Line count:** 449
- **Read range:** `1-449`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `187: login: (id: string, pass: string) => Promise<{ ok: boolean; err?: string }>;`
- `188: bioLogin: () => Promise<{ ok: boolean; err?: string }>;`
- `190: logout: () => Promise<void>;`
- `232: if (!refreshed) { await logout(); return; }`
- `290: const login = async (identifier: string, password: string): Promise<{ ok: boolean; err?: string }> => {`
- `291: const key = `login_${identifier}`;`
- `301: const res = await fetch(`${baseUrl}/provider/auth/login`, {`
- `314: Audit.log('login', true, { provider: u.providerType });`
- `317: Audit.log('login_fail', false, { identifier });`
- `325: const { success } = await LocalAuth.authenticateAsync({ promptMessage: 'Enable Biometric Login' });`
- `334: const bioLogin = async (): Promise<{ ok: boolean; err?: string }> => {`
- `347: Audit.log('biometric_login', true);`
### backend_consumers_or_contracts
- `215: const isOnline = await fetch('https://1.1.1.1', { method: 'HEAD' }).then(() => true).catch(() => false);`
- `272: const baseUrl = customIp ? `http://${customIp}:8002/api/v1` : API_BASE;`
- `273: const res = await fetch(`${baseUrl}/provider/auth/refresh`, {`
- `300: const baseUrl = customIp ? `http://${customIp}:8002/api/v1` : API_BASE;`
- `301: const res = await fetch(`${baseUrl}/provider/auth/login`, {`
- `361: await fetch(`${API_BASE}/provider/auth/logout`, { method: 'POST', headers, body: JSON.stringify({ session_id: sessionId }) });`
- `386: const res = await fetch(`${API_BASE}/provider/ops/availability/toggle-instant`, {`
- `415: </AuthCtx.Provider>`
- `432: <AuthProvider>{children}</AuthProvider>`
### auth_ownership
- `15: import { Vault, Tokens, SessionMgr, RateLimiter, Audit, SK, Validate, Biometric, buildHeaders, DeviceId } from '../security/Security';`
- `183: subId?: string; role?: string; permissions?: string[];`
- `187: login: (id: string, pass: string) => Promise<{ ok: boolean; err?: string }>;`
- `188: bioLogin: () => Promise<{ ok: boolean; err?: string }>;`
- `190: logout: () => Promise<void>;`
- `193: refreshSession: () => Promise<void>;`
- `204: useEffect(() => { refreshSession(); }, []);`
- `208: if (s === 'active' && user) refreshSession();`
- `213: const refreshSession = async () => {`
- `223: const refresh = await Tokens.getRefresh();`
- `224: if (refresh) {`
- `225: // Do not silently refresh; leave appState as 'logged_out' to prompt biometric`
### state_transitions
- `6: createContext, useContext, useState, useEffect,`
- `11: Appearance, AppState, AppStateStatus, Platform`
- `25: const [mode, setModeState] = useState<ThemeMode>('system');`
- `26: const [systemColor, setSystemColor] = useState<'light' | 'dark'>(systemMode);`
- `30: if (saved === 'light' || saved === 'dark' || saved === 'system') setModeState(saved);`
- `40: setModeState(next);`
- `45: setModeState(prev => {`
- `62: if (!c) throw new Error('useTheme outside ThemeProvider');`
- `77: const [lang, setLangState] = useState<Lang>(deviceLang);`
- `82: setLangState(saved);`
- `91: setLangState(l);`
- `110: if (!c) throw new Error('useLang outside LangProvider');`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `62: if (!c) throw new Error('useTheme outside ThemeProvider');`
- `74: try { return String(Intl.DateTimeFormat().resolvedOptions().locale || '').split('-')[0].toLowerCase(); } catch { return ''; }`
- `110: if (!c) throw new Error('useLang outside LangProvider');`
- `117: export type ToastType = 'success' | 'error' | 'warning' | 'info';`
- `126: error: { bg:'#B71C1C', icon:'' },`
- `137: const t = setTimeout(() => {`
- `143: return () => clearTimeout(t);`
- `170: if (!c) throw new Error('useToast outside ToastProvider');`
- `177: export type AppStateStatusType = 'checking' | 'logged_out' | 'logged_in' | 'suspended' | 'pending' | 'rejected' | 'offline';`
- `186: user: User | null; isLoading: boolean; isLoggedIn: boolean; appState: AppStateStatusType;`
- `199: const [loading, setLoading] = useState(true);`
- `215: const isOnline = await fetch('https://1.1.1.1', { method: 'HEAD' }).then(() => true).catch(() => false);`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
