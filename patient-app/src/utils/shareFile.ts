import { logError } from './logger';

/**
 * Hands a downloaded file to the system share sheet. `expo-sharing` is loaded on use. A sheet that refuses (no app to share
 * with, no sharing on the device) is logged, never thrown: the file was downloaded and there is nothing else to tell the patient.
 */
export async function shareFile(uri: string, mimeType: string, dialogTitle: string): Promise<void> {
  try {
    const { shareAsync } = await import('expo-sharing');
    await shareAsync(uri, { mimeType, dialogTitle });
  } catch (e) {
    logError('share:file', e);
  }
}
