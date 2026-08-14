import { I18n } from 'i18n-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager } from 'react-native';

import ar from './locales/ar.json';
import en from './locales/en.json';
import ur from './locales/ur.json';
import hi from './locales/hi.json';
import bn from './locales/bn.json';
import tl from './locales/tl.json';

const translations = { ar, en, ur, hi, bn, tl };

export type SupportedLanguage = keyof typeof translations;

const i18n = new I18n(translations);
i18n.enableFallback = true;
i18n.defaultLocale = 'ar';

export class LanguageManager {
  private static instance: LanguageManager;
  public i18n = i18n;

  private constructor() {}

  public static getInstance(): LanguageManager {
    if (!LanguageManager.instance) {
      LanguageManager.instance = new LanguageManager();
    }
    return LanguageManager.instance;
  }

  public async initialize(): Promise<void> {
    const savedLang = await AsyncStorage.getItem('app_language');
    if (savedLang && (savedLang in translations)) {
      this.setLanguage(savedLang as SupportedLanguage, false);
    } else {
      this.setLanguage('ar', false);
    }
  }

  public async setLanguage(lang: SupportedLanguage, restartRequired: boolean = true): Promise<void> {
    this.i18n.locale = lang;
    await AsyncStorage.setItem('app_language', lang);

    const isRTL = lang === 'ar' || lang === 'ur';
    if (I18nManager.isRTL !== isRTL) {
      I18nManager.allowRTL(isRTL);
      I18nManager.forceRTL(isRTL);
      // In a real app we might use expo-updates to reload the app here
    }
  }

  public t(key: string, options?: any): string {
    return this.i18n.t(key, options);
  }

  public get currentLanguage(): SupportedLanguage {
    return this.i18n.locale as SupportedLanguage;
  }

  public get isRTL(): boolean {
    return this.currentLanguage === 'ar' || this.currentLanguage === 'ur';
  }
}

export const i18nManager = LanguageManager.getInstance();
