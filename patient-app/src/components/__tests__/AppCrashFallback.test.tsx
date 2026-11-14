// 15.5: the root crash card has its words in the device's language, a retry that calls the handler, and an alert role.
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { getLocales } from 'react-native-localize';

jest.mock('react-native-localize', () => ({ getLocales: () => [], findBestLanguageTag: () => undefined }));

import { AppCrashFallback } from '../AppCrashFallback';
import { autoTranslate } from '../../i18n';
import { pickDeviceLanguage } from '../../i18n/deviceLanguage';

describe('AppCrashFallback', () => {
  it('shows the title and body in the device language, and a retry that calls the handler', async () => {
    const lang = pickDeviceLanguage(getLocales());
    const onRetry = jest.fn();
    const screen = await render(<AppCrashFallback onRetry={onRetry} />);
    const { getByText } = screen;
    expect(screen.toJSON()).toMatchObject({ props: { accessibilityRole: 'alert' } });
    expect(getByText(autoTranslate('errors.crashTitle', lang))).toBeTruthy();
    expect(getByText(autoTranslate('errors.crashBody', lang))).toBeTruthy();
    fireEvent.press(getByText(autoTranslate('common.retry', lang)));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
