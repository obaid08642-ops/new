import React from 'react';
import { act, fireEvent as fe, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { HeaderMenuButton, MENU_ITEMS } from '../../components/nav/HeaderMenuButton';
import { message } from '../../components/screen/ScreenKit';

const mockPush = jest.fn();
let mockRtl = false;
let mockLang = 'en';
jest.mock('expo-router', () => ({ router: { push: (...a: unknown[]) => mockPush(...a) } }));
jest.mock('react-native-localize', () => ({ getLocales: () => [], findBestLanguageTag: () => undefined }));
jest.mock('../../context/AppContext', () => ({ useApp: () => ({ isDark: false, lang: mockLang, isRTL: mockRtl }) }));

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };
const fireEvent = { press: async (el: Parameters<typeof fe.press>[0]) => { await act(async () => { fe.press(el); }); } };
const draw = async () => await render(<SafeAreaProvider initialMetrics={metrics}><HeaderMenuButton /></SafeAreaProvider>);

describe('HeaderMenuButton', () => {
  beforeEach(() => { mockPush.mockClear(); mockRtl = false; mockLang = 'en'; });

  it('opens a sheet that lists every destination and goes to the picked one', async () => {
    await draw();
    expect(screen.queryByTestId('header-menu-button-sheet')).toBeNull();
    await fireEvent.press(screen.getByLabelText(message('en', 'menu.open')));
    for (const item of MENU_ITEMS) expect(screen.getByLabelText(message('en', item.label))).toBeTruthy();
    await fireEvent.press(screen.getByTestId('header-menu-button-family'));
    expect(mockPush).toHaveBeenCalledWith('/family');
    expect(screen.queryByTestId('header-menu-button-sheet')).toBeNull();
  });

  it('closes on the scrim without navigating', async () => {
    await draw();
    await fireEvent.press(screen.getByTestId('header-menu-button'));
    await fireEvent.press(screen.getByTestId('header-menu-button-scrim'));
    expect(screen.queryByTestId('header-menu-button-sheet')).toBeNull();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('lays the items out from the end in ar (rtl)', async () => {
    mockRtl = true; mockLang = 'ar';
    await draw();
    await fireEvent.press(screen.getByTestId('header-menu-button'));
    expect(screen.getByText(message('ar', 'menu.help'))).toHaveStyle({ writingDirection: 'rtl', textAlign: 'right' });
  });

  it('lays the items out from the start in en (ltr)', async () => {
    await draw();
    await fireEvent.press(screen.getByTestId('header-menu-button'));
    expect(screen.getByText(message('en', 'menu.help'))).toHaveStyle({ writingDirection: 'ltr', textAlign: 'left' });
  });
});
