jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('../../../context', () => {
  const theme = new Proxy({}, { get: () => 'transparent' });
  return {
    useTheme: () => ({ theme, isDark: false }),
    useLang: () => ({ lang: 'en', isRTL: false, t: (k: string, p?: Record<string, string>) => (p ? `${k}:${Object.values(p).join(',')}` : k) }),
    useAuth: () => ({ user: { displayName: 'Dr Test' } }),
    useToast: () => ({ show: jest.fn() }),
  };
});
jest.mock('../../../api/client', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn(), patch: jest.fn() } }));
// the avatar uploader loads native image modules that are not part of this check
jest.mock('../../../components/ui', () => ({ ...jest.requireActual('../../../components/ui'), NProfileImageUploader: () => null }));
jest.mock('../../../hooks/useUploadsEnabled', () => ({ useUploadsEnabled: () => false }));

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import client from '../../../api/client';
import { ProviderProfileEditor } from '../shared/ProviderProfileEditor';

describe('credential fields waiting for review', () => {
  it('marks specialty and degree as pending review with the requested value', async () => {
    (client.get as jest.Mock).mockResolvedValue({ data: { specialty: 'ENT', degree: 'MD', pending_credentials: { delta_id: 'd1', fields: { degree: 'PhD' } } } });
    render(<ProviderProfileEditor role="doctor" onBack={() => undefined} />);
    await waitFor(() => expect(screen.getByText('profile.credential.pending:PhD')).toBeTruthy());
    // the specialty has no pending change, so it carries no marker
    expect(screen.queryByText('profile.credential.pending:ENT')).toBeNull();
    expect(screen.getAllByText(/profile\.credential\.pending/)).toHaveLength(1);
  });
});
