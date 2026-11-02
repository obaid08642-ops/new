import { Platform } from 'react-native';
import * as Sharing from 'expo-sharing';
import { contractFileName, saveContractPdf, shareContractPdf } from '../contractFile';

const mockWrite = jest.fn();
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(async () => true), shareAsync: jest.fn(async () => undefined) }));
jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///docs/',
  cacheDirectory: 'file:///cache/',
  EncodingType: { Base64: 'base64' },
  writeAsStringAsync: (...a: unknown[]) => mockWrite(...a),
  StorageAccessFramework: {
    requestDirectoryPermissionsAsync: jest.fn(async () => ({ granted: true, directoryUri: 'content://tree' })),
    createFileAsync: jest.fn(async () => 'content://tree/nabd.pdf'),
  },
}));

beforeEach(() => mockWrite.mockReset());

describe('contract file', () => {
  it('names the file after the document fingerprint', () => {
    expect(contractFileName('ab12-CD!34')).toBe('nabd-contract-ab12CD34.pdf');
  });
  it('sharing writes the PDF to the cache folder and opens the share sheet, on both platforms', async () => {
    for (const os of ['ios', 'android']) {
      (Platform as any).OS = os;
      mockWrite.mockClear(); (Sharing.shareAsync as jest.Mock).mockClear();
      expect(await shareContractPdf('QUJD', 'a.pdf', 'Contract')).toBe('shared');
      expect(mockWrite).toHaveBeenCalledWith('file:///cache/a.pdf', 'QUJD', { encoding: 'base64' });
      expect(Sharing.shareAsync).toHaveBeenCalledWith('file:///cache/a.pdf', expect.objectContaining({ mimeType: 'application/pdf', dialogTitle: 'Contract' }));
    }
  });
  it('a device that cannot share files says so and writes nothing', async () => {
    (Sharing.isAvailableAsync as jest.Mock).mockResolvedValueOnce(false);
    expect(await shareContractPdf('QUJD', 'a.pdf')).toBe('unsupported');
    expect(mockWrite).not.toHaveBeenCalled();
  });
  it('Android saves through the folder picker', async () => {
    (Platform as any).OS = 'android';
    expect(await saveContractPdf('QUJD', 'a.pdf')).toBe('content://tree/nabd.pdf');
  });
  it('an empty PDF is refused before anything is written', async () => {
    await expect(saveContractPdf('', 'a.pdf')).rejects.toThrow('empty_contract');
    expect(mockWrite).not.toHaveBeenCalled();
  });
});
