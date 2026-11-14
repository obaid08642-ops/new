import { shareFile } from './shareFile';

const mockLog = jest.fn();
jest.mock('./logger', () => ({ logError: (...a: unknown[]) => mockLog(...a) }));

/**
 * PT-09: the share step never throws. In jest the dynamic import of expo-sharing itself fails (no vm-modules flag), which is
 * the same failure class as a share sheet that refuses on a device: the helper must log it and resolve.
 */
describe('shareFile', () => {
  it('resolves and logs when the share cannot happen', async () => {
    await expect(shareFile('file:///cache/x.pdf', 'application/pdf', 'PDF')).resolves.toBeUndefined();
    expect(mockLog).toHaveBeenCalledWith('share:file', expect.anything());
  });
});
