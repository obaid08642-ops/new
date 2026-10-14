import client from '../../api/client';

/** N1: result files a nurse attaches at the end of a home visit (max 10, the server limit of VisitReportDto). */
export const MAX_VISIT_FILES = 10;

export interface PickedVisitFile { uri: string; name: string; mime: string }
export interface VisitAttachment { storage_id: string; name?: string }

export const ALLOWED_VISIT_MIME = ['application/pdf', 'image/*'];

/** Opens the system file picker; returns null when cancelled. */
export async function pickVisitFile(): Promise<PickedVisitFile | null> {
  const DocPicker: any = await import('expo-document-picker');
  const picked = await DocPicker.getDocumentAsync({ type: ALLOWED_VISIT_MIME, copyToCacheDirectory: true });
  if (picked.canceled || !picked.assets?.length) return null;
  const a = picked.assets[0];
  return { uri: a.uri, name: a.name || 'result', mime: a.mimeType || 'application/octet-stream' };
}

/** POST /storage/upload for each file, in order; returns the ids the visit report needs. Throws on the first failure. */
export async function readBase64(uri: string): Promise<string> {
  const FSys: any = await import('expo-file-system/legacy');
  return FSys.readAsStringAsync(uri, { encoding: 'base64' });
}

export async function uploadVisitFiles(files: PickedVisitFile[], read: (uri: string) => Promise<string> = readBase64): Promise<VisitAttachment[]> {
  const out: VisitAttachment[] = [];
  for (const f of files) {
    const base64 = await read(f.uri);
    const res = await client.post('/storage/upload', { data_base64: base64, mime: f.mime, original_name: f.name });
    const id = res?.data?.id;
    if (!id) throw new Error('upload_failed');
    out.push({ storage_id: String(id), name: f.name });
  }
  return out;
}

export interface VisitReportInput {
  attachments: VisitAttachment[];
  vitals?: Record<string, unknown>;
  notes?: string;
  followUp?: string;
  signature?: string | null;
}

/** Body of POST /home-care/bookings/:id/visit-report that also completes the visit. */
export function buildVisitReportBody(i: VisitReportInput): Record<string, unknown> {
  return {
    complete: true,
    attachments: i.attachments.slice(0, MAX_VISIT_FILES),
    ...(i.vitals && Object.keys(i.vitals).length ? { vitals: i.vitals } : {}),
    ...(i.notes?.trim() ? { clinical_notes: i.notes.trim() } : {}),
    ...(i.followUp?.trim() ? { recommendations: i.followUp.trim() } : {}),
    ...(i.signature ? { signature: i.signature } : {}),
  };
}
