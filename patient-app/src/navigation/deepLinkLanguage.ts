import type { WebLocale } from './webLinkMap';

/**
 * Hand-off of the language a deep link asks for (its /{locale}/ prefix) from expo-router's
 * redirectSystemPath (app/+native-intent.tsx, outside React) to AppProvider, which applies it with
 * the same setLang the language picker uses (state + AsyncStorage + LanguageManager).
 * A link that arrives before AppProvider is listening is kept until AppProvider takes it.
 */
type Listener = (lang: WebLocale) => void;

let pending: WebLocale | null = null;
const listeners = new Set<Listener>();

export function requestDeepLinkLanguage(lang: WebLocale): void {
  pending = lang;
  listeners.forEach((listener) => listener(lang));
}

/** Read and clear the language a deep link asked for, if one is waiting. */
export function takeDeepLinkLanguage(): WebLocale | null {
  const lang = pending;
  pending = null;
  return lang;
}

export function subscribeDeepLinkLanguage(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
