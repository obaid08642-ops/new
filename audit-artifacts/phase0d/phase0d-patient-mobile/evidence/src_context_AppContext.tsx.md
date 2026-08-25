# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/context/AppContext.tsx`
- **Member SHA-256:** `2ea646c4c009a2736244c00dc901b0cccdd97e59cbf7c84228d4d53797735c1e`
- **Line count:** 186
- **Read range:** `1-186`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- `77: const res = await fetch(`${appConfig.apiBaseUrl}/config`);`
### auth_ownership
- `64: refreshConfig: () => Promise<void>;`
- `75: const refreshConfig = useCallback(async () => {`
- `111: refreshConfig();`
- `112: }, [refreshConfig]);`
- `157: refreshConfig,`
- `159: [themeMode, isDark, colors, setThemeMode, toggleTheme, lang, isRTL, setLang, runtimeConfig, refreshConfig],`
- `178: refreshConfig: async () => {},`
### state_transitions
- `4: useState,`
- `71: const [themeMode, setThemeModeState] = useState<ThemeMode>('system');`
- `72: const [lang, setLangState] = useState<LangCode>(() => detectDeviceLanguage());`
- `73: const [runtimeConfig, setRuntimeConfig] = useState<any>({});`
- `100: setThemeModeState(savedTheme);`
- `103: setLangState(savedLang as LangCode);`
- `120: setThemeModeState(m);`
- `127: setThemeModeState((prev) => {`
- `137: setLangState(l);`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `82: } catch (_err) {`
- `105: try { LanguageManager.getInstance().setLanguage(savedLang as LangCode, false); } catch {}`
- `107: } catch (_storageErr) {`
- `121: AsyncStorage.setItem(STORAGE_THEME, m).catch((_err) => {`
- `129: AsyncStorage.setItem(STORAGE_THEME, next).catch((_err) => {`
- `138: AsyncStorage.setItem(STORAGE_LANG, l).catch((_err) => {`
- `143: try { LanguageManager.getInstance().setLanguage(l as any, false); } catch {}`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
