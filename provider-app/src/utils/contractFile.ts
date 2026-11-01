import { Platform } from 'react-native';
import * as LegacyFS from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

/** What the signed-contract screens can do with the PDF the server returns (base64). */
export type ContractShareResult = 'shared' | 'unsupported';

/** A file name that is the same for the same contract (the hash prefix), so a second download does not pile up copies. */
export const contractFileName = (sha256?: string | null): string =>
  `nabd-contract-${String(sha256 || Date.now()).replace(/[^a-zA-Z0-9]/g, '').slice(0, 24)}.pdf`;

/** Save the PDF: Android asks for a folder (storage access framework); iOS writes to the app documents folder. Returns the file uri. */
export async function saveContractPdf(base64: string, name: string): Promise<string> {
  if (!base64) throw new Error('empty_contract');
  if (Platform.OS === 'android') {
    const perm = await LegacyFS.StorageAccessFramework.requestDirectoryPermissionsAsync();
    if (!perm.granted) throw new Error('no_permission');
    const uri = await LegacyFS.StorageAccessFramework.createFileAsync(perm.directoryUri, name.replace(/\.pdf$/, ''), 'application/pdf');
    await LegacyFS.writeAsStringAsync(uri, base64, { encoding: LegacyFS.EncodingType.Base64 });
    return uri;
  }
  const uri = `${LegacyFS.documentDirectory}${name}`;
  await LegacyFS.writeAsStringAsync(uri, base64, { encoding: LegacyFS.EncodingType.Base64 });
  return uri;
}

/** Where a PDF is written so it can be shared: the cache folder (a share does not leave a second copy in the documents folder). */
async function writeForShare(base64: string, name: string): Promise<string> {
  if (!base64) throw new Error('empty_contract');
  const dir = LegacyFS.cacheDirectory || LegacyFS.documentDirectory;
  const uri = `${dir}${name}`;
  await LegacyFS.writeAsStringAsync(uri, base64, { encoding: LegacyFS.EncodingType.Base64 });
  return uri;
}

/**
 * Share the PDF through the system share sheet (expo-sharing: needs a native rebuild of the app, it is a new native module). The
 * file goes to the cache folder first. `unsupported` when the device cannot share files; the caller then points to the download.
 */
export async function shareContractPdf(base64: string, name: string, dialogTitle?: string): Promise<ContractShareResult> {
  if (!(await Sharing.isAvailableAsync())) return 'unsupported';
  const uri = await writeForShare(base64, name);
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', ...(dialogTitle ? { dialogTitle } : {}) });
  return 'shared';
}
