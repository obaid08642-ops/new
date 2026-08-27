import { Alert, AlertButton, AlertOptions } from 'react-native';
import { i18nManager } from '../i18n/LanguageManager';
import { autoTranslate } from '../i18n';

const translate = (value: unknown) => typeof value === 'string' ? autoTranslate(value, i18nManager.currentLanguage) : value;

/** Centralized Alert wrapper that localizes static title, message, and button labels. */
export function showLocalizedAlert(
  title: string,
  message?: string,
  buttons?: AlertButton[],
  options?: AlertOptions,
) {
  const localizedButtons = buttons?.map((button) => ({ ...button, text: translate(button.text) as string | undefined }));
  return Alert.alert(translate(title) as string, translate(message) as string | undefined, localizedButtons, options);
}
