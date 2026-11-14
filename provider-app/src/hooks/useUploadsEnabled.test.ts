import { renderHook, waitFor } from '@testing-library/react-native';

import { resetUploadsEnabledCache, useUploadsEnabled } from './useUploadsEnabled';

const mockGet = jest.fn();
jest.mock('../api/client', () => ({ __esModule: true, default: { get: (...a: unknown[]) => mockGet(...a) } }));

beforeEach(() => { resetUploadsEnabledCache(); mockGet.mockReset(); });

describe('useUploadsEnabled', () => {
  it('is enabled when the field is absent', async () => {
    mockGet.mockResolvedValue({ data: { features: {} } });
    const { result } = await renderHook(() => useUploadsEnabled());
    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(1));
    expect(result.current).toBe(true);
  });
  it('is disabled when uploads_enabled is false', async () => {
    mockGet.mockResolvedValue({ data: { features: { uploads_enabled: false } } });
    const { result } = await renderHook(() => useUploadsEnabled());
    await waitFor(() => expect(result.current).toBe(false));
  });
  it('fails open when /config cannot be read', async () => {
    mockGet.mockRejectedValue(new Error('down'));
    const { result } = await renderHook(() => useUploadsEnabled());
    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(1));
    expect(result.current).toBe(true);
  });
});
