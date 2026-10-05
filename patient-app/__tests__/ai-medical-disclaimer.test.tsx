import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { aiDisclaimerText } from '../src/utils/aiDisclaimer';

// a95be9a: the AI triage and skin self-check results show the medical
// disclaimer the server returns ({ ar, en }), in the user's language.
const mockApiFetch = jest.fn();
jest.mock('../src/utils/api', () => ({ apiFetch: (...a: unknown[]) => mockApiFetch(...a) }));
jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() } }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('../src/context/AppContext', () => {
  const colors = new Proxy({}, { get: () => '#111111' });
  const useApp = () => ({ colors, isDark: false, lang: 'ar' });
  return { useApp, useThemeColors: () => colors };
});

import GuidedTriageScreen from '../app/ai/triage';
import SkinAnalysisScreen from '../app/ai/skin-analysis';

const DISCLAIMER = { ar: 'هذه النتيجة مولّدة بالذكاء الاصطناعي وليست استشارة طبية.', en: 'This output is NOT medical advice.' };

beforeEach(() => mockApiFetch.mockReset());

describe('aiDisclaimerText', () => {
  it('picks the user language and falls back to the other one', () => {
    expect(aiDisclaimerText({ disclaimer: DISCLAIMER }, 'ar')).toBe(DISCLAIMER.ar);
    expect(aiDisclaimerText({ disclaimer: DISCLAIMER }, 'en')).toBe(DISCLAIMER.en);
    expect(aiDisclaimerText({ data: { disclaimer: { en: 'only en' } } }, 'ar')).toBe('only en');
    expect(aiDisclaimerText({ disclaimer: {} }, 'ar')).toBeNull();
    expect(aiDisclaimerText(null, 'ar')).toBeNull();
  });
});

describe('AI health result screens render the server disclaimer', () => {
  it('triage result shows it', async () => {
    mockApiFetch.mockResolvedValueOnce({ care_level: 'consultation', selected_red_flags: ['none'], diagnosis: null, treatment: null, notice: 'x', disclaimer: DISCLAIMER });
    await render(<GuidedTriageScreen />);
    await fireEvent.changeText(screen.getByPlaceholderText('اكتب وصفاً مختصراً للأعراض كما تراها'), 'صداع');
    await fireEvent.press(screen.getByText('عرض التوجيه'));
    expect(await screen.findByText(DISCLAIMER.ar)).toBeTruthy();
    expect(mockApiFetch).toHaveBeenCalledWith('/ai/triage', expect.objectContaining({ method: 'POST' }));
  });

  it('skin self-check result shows it', async () => {
    mockApiFetch.mockResolvedValueOnce({ care_level: 'self_observation', selected_areas: ['face'], selected_observations: ['none'], image_analysis: false, diagnosis: null, treatment: null, notice: 'x', disclaimer: DISCLAIMER });
    await render(<SkinAnalysisScreen />);
    await fireEvent.press(screen.getByText('الوجه'));
    await fireEvent.press(screen.getByText('أفهم أن هذه القائمة لا تشخص حالة جلدية ولا تحلل صورة.'));
    await fireEvent.press(screen.getByText('عرض التوجيه'));
    expect(await screen.findByText(DISCLAIMER.ar)).toBeTruthy();
    expect(mockApiFetch).toHaveBeenCalledWith('/ai/skin-analysis', expect.objectContaining({ method: 'POST' }));
  });
});
