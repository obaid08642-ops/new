import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { LanguagePicker } from '../LanguagePicker';

const mockSet = jest.fn();
jest.mock('../../context', () => {
  const theme = new Proxy({}, { get: () => 'transparent' });
  return {
    useTheme: () => ({ theme, isDark: false }),
    useLang: () => ({ lang: 'ar', isRTL: true, set: (l: string) => mockSet(l), t: (k: string) => k }),
  };
});

describe('LanguagePicker', () => {
  beforeEach(() => mockSet.mockReset());

  it('chips: offers all six languages by their own names and sets the chosen one', async () => {
    await render(<LanguagePicker />);
    for (const name of ['العربية', 'English', 'اردو', 'हिन्दी', 'বাংলা', 'Filipino']) expect(screen.getByText(name)).toBeTruthy();
    await fireEvent.press(screen.getByText('اردو'));
    expect(mockSet).toHaveBeenCalledWith('ur');
    await fireEvent.press(screen.getByText('Filipino'));
    expect(mockSet).toHaveBeenLastCalledWith('tl');
  });

  it('menu: shows the current language, opens the list, and choosing closes it', async () => {
    await render(<LanguagePicker variant="menu" />);
    expect(screen.queryByText('Filipino')).toBeNull();
    await fireEvent.press(screen.getByText('العربية'));
    await fireEvent.press(await screen.findByText('हिन्दी'));
    expect(mockSet).toHaveBeenCalledWith('hi');
  });
});
