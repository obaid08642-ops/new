import { Platform, Share } from 'react-native';
import { contractFileName, saveContractPdf, shareContractPdf } from '../contractFile';

const mockWrite = jest.fn();
jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///docs/',
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
  it('iOS writes to the documents folder and shares the file', async () => {
    (Platform as any).OS = 'ios';
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' } as any);
    expect(await shareContractPdf('QUJD', 'a.pdf')).toBe('shared');
    expect(mockWrite).toHaveBeenCalledWith('file:///docs/a.pdf', 'QUJD', { encoding: 'base64' });
    expect(share).toHaveBeenCalledWith({ url: 'file:///docs/a.pdf' });
  });
  it('Android saves through the folder picker and says sharing a file is not available', async () => {
    (Platform as any).OS = 'android';
    expect(await saveContractPdf('QUJD', 'a.pdf')).toBe('content://tree/nabd.pdf');
    expect(await shareContractPdf('QUJD', 'a.pdf')).toBe('unsupported');
  });
  it('an empty PDF is refused before anything is written', async () => {
    await expect(saveContractPdf('', 'a.pdf')).rejects.toThrow('empty_contract');
    expect(mockWrite).not.toHaveBeenCalled();
  });
});
