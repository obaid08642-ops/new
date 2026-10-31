import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { ResubmitDetailsScreen } from '../ResubmitDetailsScreen';

const mockGet = jest.fn();
const mockPost = jest.fn();
const mockShow = jest.fn();

jest.mock('../../../api/client', () => ({ __esModule: true, default: { get: (...a: unknown[]) => mockGet(...a), post: (...a: unknown[]) => mockPost(...a) } }));
jest.mock('../../../context', () => {
  const theme = new Proxy({}, { get: () => 'transparent' });
  return { useTheme: () => ({ theme, isDark: false }), useLang: () => ({ lang: 'en', isRTL: false }), useToast: () => ({ show: mockShow }) };
});
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

beforeEach(() => {
  mockGet.mockReset(); mockPost.mockReset(); mockShow.mockReset();
  mockGet.mockResolvedValue({ data: { name_ar: 'مختبر', license_number: '123', iban: 'SA0380000000608010167519' } });
});

describe('fix details before resubmitting', () => {
  it('saves only the changed field through step2 and goes back', async () => {
    mockPost.mockResolvedValue({ data: {} });
    const onBack = jest.fn();
    await render(<ResubmitDetailsScreen onBack={onBack} />);
    const box = await screen.findByDisplayValue('123');
    await fireEvent.changeText(box, '456');
    await fireEvent.press(screen.getByText('Save'));
    await waitFor(() => expect(mockPost).toHaveBeenCalledWith('/provider-onboarding/step2', { license_number: '456' }));
    await waitFor(() => expect(onBack).toHaveBeenCalled());
  });

  it('a bad IBAN is stopped before anything is sent', async () => {
    await render(<ResubmitDetailsScreen onBack={() => {}} />);
    await fireEvent.changeText(await screen.findByDisplayValue('SA0380000000608010167519'), 'SA12');
    await fireEvent.press(screen.getByText('Save'));
    expect(mockPost).not.toHaveBeenCalled();
    expect(mockShow).toHaveBeenCalledWith('Check the highlighted fields', 'error');
  });

  it('shows the server refusal and stays on the screen', async () => {
    mockPost.mockRejectedValue({ response: { data: { message: 'invalid_iban' } } });
    const onBack = jest.fn();
    await render(<ResubmitDetailsScreen onBack={onBack} />);
    await fireEvent.changeText(await screen.findByDisplayValue('123'), '9');
    await fireEvent.press(screen.getByText('Save'));
    await waitFor(() => expect(mockShow).toHaveBeenCalledWith('invalid_iban', 'error'));
    expect(onBack).not.toHaveBeenCalled();
  });
});
