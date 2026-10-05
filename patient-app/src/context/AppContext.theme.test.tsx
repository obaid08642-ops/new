import React from 'react';
import * as ReactNative from 'react-native';
import { act, renderHook } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { AppProvider, useApp } from './AppContext';

jest.mock('react-native-localize', () => ({ getLocales: () => [{ languageCode: 'ar' }] }));

const wrapper = ({ children }: { children: React.ReactNode }) => <AppProvider>{children}</AppProvider>;

describe('the dark-mode switch toggles what the user SEES', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    global.fetch = jest.fn().mockRejectedValue(new Error('offline')) as unknown as typeof fetch;
  });
  afterEach(() => jest.restoreAllMocks());

  it('mode "system" on a dark device: the first press makes the screen light (it used to set "dark": no change)', async () => {
    jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue('dark');
    const { result } = await renderHook(() => useApp(), { wrapper });
    expect(result.current.themeMode).toBe('system');
    expect(result.current.isDark).toBe(true);
    await act(async () => result.current.toggleTheme());
    expect(result.current.isDark).toBe(false);
    expect(result.current.themeMode).toBe('light');
    expect(await AsyncStorage.getItem('@nabdah_theme_mode')).toBe('light');
  });

  it('mode "system" on a light device: the first press makes the screen dark', async () => {
    jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue('light');
    const { result } = await renderHook(() => useApp(), { wrapper });
    await act(async () => result.current.toggleTheme());
    expect(result.current.isDark).toBe(true);
    expect(result.current.themeMode).toBe('dark');
  });

  it('pressing twice goes back to what it was', async () => {
    jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue('dark');
    const { result } = await renderHook(() => useApp(), { wrapper });
    await act(async () => result.current.toggleTheme());
    await act(async () => result.current.toggleTheme());
    expect(result.current.isDark).toBe(true);
  });

  it('an explicit mode keeps toggling as before', async () => {
    jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue('light');
    const { result } = await renderHook(() => useApp(), { wrapper });
    await act(async () => result.current.setThemeMode('dark'));
    await act(async () => result.current.toggleTheme());
    expect(result.current.themeMode).toBe('light');
  });
});
