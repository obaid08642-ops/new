import { getLocales } from 'react-native-localize';
import { autoTranslate } from './index';
import { pickDeviceLanguage } from './deviceLanguage';

/** A locale-file key in the device's language, for the places that draw outside the app's providers (error fallback, guards, map preview). */
export function deviceText(key: string): string {
  return String(autoTranslate(key, pickDeviceLanguage(getLocales())));
}
