import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
} from 'react';
import { useColorScheme as useDeviceColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../theme';
import { i18nManager } from '../i18n/LanguageManager';

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
  const [themeMode, setThemeModeState] = useState<ThemeMode>('light');
  const [lang, setLangState] = useState<LangCode>('ar');
  const [config] = useState<any>(null);

  const refreshConfig = useCallback(async () => undefined, []);

  // Hydrate persisted display preferences. Operational remote configuration
  // remains unavailable until a protected, versioned contract is published.
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
        const normalizedLang = savedLang === 'tl' ? 'fil' : savedLang;
        if (normalizedLang && LANGUAGES.some((language) => language.code === normalizedLang)) {
          setLangState(normalizedLang);
          i18nManager.setLanguage(normalizedLang as LangCode, false).catch(() => undefined);
          if (normalizedLang !== savedLang) {
            AsyncStorage.setItem(STORAGE_LANG, normalizedLang).catch(() => undefined);
          }
        }
      } catch (_storageErr) {
        /* keep defaults */
      }
    })();
  }, []);

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
    i18nManager.setLanguage(l, false).catch(() => undefined);
    AsyncStorage.setItem(STORAGE_LANG, l).catch((_err) => {
      /* handled */
    });
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
      config,
      refreshConfig,
    }),
    [themeMode, isDark, colors, setThemeMode, toggleTheme, lang, isRTL, setLang, config, refreshConfig],
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
      config: null,
      refreshConfig: async () => {},
    };
  }
  return ctx;
}

export function useThemeColors() {
  return useApp().colors;
}
