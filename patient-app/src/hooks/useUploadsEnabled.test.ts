import { renderHook, waitFor } from '@testing-library/react-native';

import { resetUploadsEnabledCache, useUploadsEnabled } from './useUploadsEnabled';

const mockApiFetch = jest.fn();
jest.mock('../utils/api', () => ({ apiFetch: (...a: unknown[]) => mockApiFetch(...a) }));

beforeEach(() => { resetUploadsEnabledCache(); mockApiFetch.mockReset(); });

describe('useUploadsEnabled', () => {
  it('is enabled when the field is absent', async () => {
    mockApiFetch.mockResolvedValue({ data: { features: {} } });
    const { result } = await renderHook(() => useUploadsEnabled());
    await waitFor(() => expect(mockApiFetch).toHaveBeenCalledTimes(1));
    expect(result.current).toBe(true);
  });
  it('is disabled when uploads_enabled is false', async () => {
    mockApiFetch.mockResolvedValue({ data: { features: { uploads_enabled: false } } });
    const { result } = await renderHook(() => useUploadsEnabled());
    await waitFor(() => expect(result.current).toBe(false));
  });
  it('fails open when /config cannot be read', async () => {
    mockApiFetch.mockRejectedValue(new Error('down'));
    const { result } = await renderHook(() => useUploadsEnabled());
    await waitFor(() => expect(mockApiFetch).toHaveBeenCalledTimes(1));
    expect(result.current).toBe(true);
  });
});
