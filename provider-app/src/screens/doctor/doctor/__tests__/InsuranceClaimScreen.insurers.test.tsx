import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

// Q51: the claim form's insurer chips come from the admin-managed catalog
// (GET /insurance/companies) and must show loading, error (with retry) and
// empty states instead of a silent empty row. Boundaries mocked: the HTTP
// client, app context, and the screen's heavy sibling imports.
const mockGet = jest.fn();
jest.mock('../../../../api/client', () => ({ __esModule: true, default: { get: (...a: unknown[]) => mockGet(...a) } }));
jest.mock('../../../../context', () => {
  const { tokens } = jest.requireActual('../../../../theme/tokens');
  const theme = new Proxy({}, { get: () => tokens.text });
  return {
    useTheme: () => ({ theme, isDark: false }),
    useLang: () => ({ lang: 'ar', setLang: jest.fn() }),
    useAuth: () => ({ user: null }),
    useToast: () => ({ show: jest.fn() }),
  };
});
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('socket.io-client', () => ({ io: jest.fn() }));
jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');
jest.mock('../../../shared/VideoCallRoom', () => ({ VideoCallRoom: () => null }));
jest.mock('../../../shared/InsuranceRequestsScreen', () => ({ InsuranceRequestsScreen: () => null }));
jest.mock('../../../shared/SharedScreens', () => ({}));
jest.mock('../../../shared/BlueprintScreens', () => ({}));
jest.mock('../../components/DoctorStatsRow', () => ({}));
jest.mock('../../components/DoctorUrgentRequests', () => ({}));
jest.mock('../../components/DoctorQueueList', () => ({}));
jest.mock('../../FacilityInvitationsScreen', () => ({}));
jest.mock('@react-navigation/native-stack', () => ({ createNativeStackNavigator: jest.fn() }));

import { InsuranceClaimScreen } from '../InsuranceClaimScreen';
import { invalidateCatalogs } from '../../../../api/catalogs';

const apt = { id: 'apt-1', patient: { insurance: {} } };

beforeEach(() => {
  mockGet.mockReset();
  invalidateCatalogs();
});

describe('InsuranceClaimScreen insurer catalog states (Q51)', () => {
  it('shows a loading state, then the catalog companies', async () => {
    let resolve: (v: unknown) => void = () => {};
    mockGet.mockReturnValueOnce(new Promise((r) => { resolve = r; }));
    await render(<InsuranceClaimScreen apt={apt} onBack={jest.fn()} />);
    expect(screen.getByText('جارٍ تحميل شركات التأمين…')).toBeTruthy();
    resolve({ data: [{ code: 'bupa', name_ar: 'بوبا العربية', name_en: 'Bupa Arabia', plans: [] }] });
    expect(await screen.findByText('بوبا العربية')).toBeTruthy();
    expect(screen.queryByText('جارٍ تحميل شركات التأمين…')).toBeNull();
    expect(mockGet).toHaveBeenCalledWith('/insurance/companies');
  });

  it('shows an error with a retry that reloads the catalog', async () => {
    mockGet.mockRejectedValueOnce(new Error('Network Error'));
    await render(<InsuranceClaimScreen apt={apt} onBack={jest.fn()} />);
    expect(await screen.findByText('تعذر تحميل شركات التأمين')).toBeTruthy();
    mockGet.mockResolvedValueOnce({ data: { data: [{ code: 'tawuniya', name_ar: 'التعاونية', name_en: 'Tawuniya', plans: [] }] } });
    await fireEvent.press(screen.getByText('إعادة المحاولة'));
    expect(await screen.findByText('التعاونية')).toBeTruthy();
    expect(mockGet).toHaveBeenCalledTimes(2);
  });

  it('shows an empty state when the catalog has no companies', async () => {
    mockGet.mockResolvedValueOnce({ data: [] });
    await render(<InsuranceClaimScreen apt={apt} onBack={jest.fn()} />);
    await waitFor(() => expect(screen.getByText('لا توجد شركات تأمين متاحة حالياً')).toBeTruthy());
  });
});
