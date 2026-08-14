// LocalizedAlert translates known UI strings while leaving unknown server messages intact.
import { Alert as NativeAlert, type AlertButton } from 'react-native';
import { autoTranslate } from '../i18n';
import { i18nManager } from '../i18n/LanguageManager';

const translate = (value?: string) => typeof value === 'string'
  ? autoTranslate(value, i18nManager.currentLanguage)
  : value;

export const LocalizedAlert = {
  alert: (title?: string, message?: string, buttons?: AlertButton[]) => NativeAlert.alert(
    translate(title),
    translate(message),
    buttons?.map((button) => ({ ...button, text: translate(button.text) })),
  ),
};
