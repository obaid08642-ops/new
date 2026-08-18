import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
} from 'react';
import { useColorScheme as useDeviceColorScheme } from 'react-native';
import { getLocales } from 'react-native-localize';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../theme';
import { LanguageManager } from '../i18n/LanguageManager';
import { config as appConfig } from '../core/config';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type ThemeMode = 'light' | 'dark' | 'system';
export type LangCode = 'ar' | 'en' | 'ur' | 'hi' | 'bn' | 'fil';

export const LANGUAGES: {
  code: LangCode;
  label: string;
  native: string;
  flag: string;
  rtl: boolean;
}[] = [
  { code: 'ar', label: 'Arabic', native: 'العربية', flag: 'SA', rtl: true },
  { code: 'en', label: 'English', native: 'English', flag: 'GB', rtl: false },
  { code: 'ur', label: 'Urdu', native: 'اردو', flag: 'PK', rtl: true },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी', flag: 'IN', rtl: false },
  { code: 'bn', label: 'Bengali', native: 'বাংলা', flag: 'BD', rtl: false },
  { code: 'fil', label: 'Filipino', native: 'Filipino', flag: 'PH', rtl: false },
];

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------
const STORAGE_THEME = '@nabdah_theme_mode';
const STORAGE_LANG = '@nabdah_language';

function detectDeviceLanguage(): LangCode {
  const code = String(getLocales()?.[0]?.languageCode || '').toLowerCase();
  if (code === 'ar' || code === 'en' || code === 'ur' || code === 'hi' || code === 'bn' || code === 'fil' || code === 'tl') {
    return code === 'tl' ? 'fil' : code as LangCode;
  }
  return 'ar';
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
interface AppContextValue {
  themeMode: ThemeMode;
  isDark: boolean;
  colors: typeof Colors.light;
  setThemeMode: (m: ThemeMode) => void;
  toggleTheme: () => void;
  lang: LangCode;
  isRTL: boolean;
  setLang: (l: LangCode) => void;
  config: any;
  refreshConfig: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const deviceScheme = useDeviceColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [lang, setLangState] = useState<LangCode>(() => detectDeviceLanguage());
  const [runtimeConfig, setRuntimeConfig] = useState<any>({});

  const refreshConfig = useCallback(async () => {
    try {
      const res = await fetch(`${appConfig.apiBaseUrl}/config`);
      if (res.ok) {
        const data = await res.json();
        setRuntimeConfig(data);
      }
    } catch (_err) {
      // Fail silently, keep default configurations
    }
  }, []);

  // Hydrate persisted preferences and fetch remote configuration
  useEffect(() => {
    (async () => {
      try {
        const [savedTheme, savedLang] = await Promise.all([
          AsyncStorage.getItem(STORAGE_THEME),
          AsyncStorage.getItem(STORAGE_LANG),
        ]);
        if (
          savedTheme === 'light' ||
          savedTheme === 'dark' ||
          savedTheme === 'system'
        ) {
          setThemeModeState(savedTheme);
        }
        if (savedLang && LANGUAGES.some((language) => language.code === savedLang)) {
          setLangState(savedLang as LangCode);
          // Keep the i18n engine (and every DB field picker) in sync
          try { LanguageManager.getInstance().setLanguage(savedLang as LangCode, false); } catch {}
        }
      } catch (_storageErr) {
        /* keep defaults */
      }
    })();
    refreshConfig();
  }, [refreshConfig]);

  const isDark =
    themeMode === 'system' ? deviceScheme === 'dark' : themeMode === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;
  const isRTL = LANGUAGES.find((l) => l.code === lang)?.rtl ?? true;

  const setThemeMode = useCallback((m: ThemeMode) => {
    setThemeModeState(m);
    AsyncStorage.setItem(STORAGE_THEME, m).catch((_err) => {
      /* handled */
    });
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeModeState((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      AsyncStorage.setItem(STORAGE_THEME, next).catch((_err) => {
        /* handled */
      });
      return next;
    });
  }, []);

  const setLang = useCallback((l: LangCode) => {
    setLangState(l);
    AsyncStorage.setItem(STORAGE_LANG, l).catch((_err) => {
      /* handled */
    });
    // Sync the shared i18n engine so pickDbField/currentDbLang render DB
    // content (drug names, descriptions...) in the newly selected language.
    try { LanguageManager.getInstance().setLanguage(l as any, false); } catch {}
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      themeMode,
      isDark,
      colors,
      setThemeMode,
      toggleTheme,
      lang,
      isRTL,
      setLang,
      config: runtimeConfig,
      refreshConfig,
    }),
    [themeMode, isDark, colors, setThemeMode, toggleTheme, lang, isRTL, setLang, runtimeConfig, refreshConfig],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    return {
      themeMode: 'light',
      isDark: false,
      colors: Colors.light,
      setThemeMode: () => {},
      toggleTheme: () => {},
      lang: 'ar',
      isRTL: true,
      setLang: () => {},
      config: {},
      refreshConfig: async () => {},
    };
  }
  return ctx;
}

export function useThemeColors() {
  return useApp().colors;
}
