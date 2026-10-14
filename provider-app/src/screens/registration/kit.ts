// Shared logic of the one registration wizard (M9): step savers, document upload, onboarding account creation.
// Nothing here changes what the backend receives: the endpoints, field names and values stay those of the six
// wizards it replaced (see __tests__/registrationPayloads.test.tsx).
import { useEffect } from 'react';
import { ProviderApi } from '../../api/provider';

export type Saver = () => boolean | Promise<boolean>;
export type SubmitRef = ((fn: Saver) => void) | { current: Saver | null };

/** The props every wizard step (a section of a merged page) receives. */
export interface StepProps<T> {
  data: T;
  update: (patch: Partial<T>) => void;
  /** The wizard runs `submitRef`'s saver when the person presses Next; false keeps them on the page. */
  submitRef?: SubmitRef;
  uploads: Uploader;
}

/** Registers the step's validate-and-save function with the page that hosts it. */
export function useStepSaver(submitRef: SubmitRef | undefined, save: Saver): void {
  useEffect(() => {
    if (!submitRef) return;
    if (typeof submitRef === 'function') submitRef(save); else submitRef.current = save;
  });
}

// ─── Documents ──────────────────────────────────────────────────────────────────

const MIME_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', heic: 'image/heic', webp: 'image/webp', pdf: 'application/pdf',
};

/** The mime type and extension of a picked file, from its name; the pickers return images unless the person chose a file. */
export function fileKind(uri: string): { mime: string; ext: string } {
  const m = /\.([a-z0-9]{2,5})(?:[?#].*)?$/i.exec(uri);
  const ext = m ? m[1].toLowerCase() : '';
  const mime = MIME_BY_EXT[ext];
  return mime ? { mime, ext } : { mime: 'image/jpeg', ext: 'jpg' };
}

export const isRemote = (uri: string) => /^https?:\/\//i.test(uri);

export interface Uploader {
  /** Uploads a picked file once. A second call for the same uri returns the first result; a remote url is returned as is. */
  file(uri: string, baseName: string): Promise<string>;
  /** Uploads the drawn signature once per distinct signature. */
  signature(dataUri: string): Promise<string>;
}

export function createUploader(): Uploader {
  const files = new Map<string, Promise<string>>();
  let signed: { src: string; url: Promise<string> } | null = null;
  const drop = (map: Map<string, Promise<string>>, key: string) => (e: unknown) => { map.delete(key); throw e; };
  return {
    file(uri, baseName) {
      if (isRemote(uri)) return Promise.resolve(uri);
      const hit = files.get(uri);
      if (hit) return hit;
      const { mime, ext } = fileKind(uri);
      const p = ProviderApi.uploadFile(uri, mime, `${baseName}.${ext}`).catch(drop(files, uri));
      files.set(uri, p);
      return p;
    },
    signature(dataUri) {
      if (signed && signed.src === dataUri) return signed.url;
      const url = ProviderApi.uploadSignature(dataUri).catch((e: unknown) => { signed = null; throw e; });
      signed = { src: dataUri, url };
      return url;
    },
  };
}

export interface RequiredDoc<T> { field: keyof T; ar: string; en: string }

/** The first required document that was not picked, or null. A missing file must stop the step before any upload starts. */
export function firstMissingDoc<T>(data: T, docs: RequiredDoc<T>[]): RequiredDoc<T> | null {
  return docs.find((d) => !data[d.field]) ?? null;
}

// ─── Account ────────────────────────────────────────────────────────────────────

export interface StartParams { phone: string; password: string; full_name: string; email: string; type: string }

/**
 * Creates the onboarding identity and signs in as it. If the identity already exists (the person came back
 * after a failed step), signing in alone is enough. Returns the failure message instead of throwing.
 */
export async function startOnboardingAccount(params: StartParams, loginType: string): Promise<{ ok: boolean; message?: string }> {
  try {
    await ProviderApi.start(params);
    await ProviderApi.onboardingLogin(params.email, params.password, loginType);
    return { ok: true };
  } catch (e) {
    try {
      await ProviderApi.onboardingLogin(params.email, params.password, loginType);
      return { ok: true };
    } catch {
      return { ok: false, message: apiMessage(e) };
    }
  }
}

export function apiMessage(e: unknown, fallback = 'Error'): string {
  const err = e as { response?: { data?: { message?: string | string[] } }; message?: string } | undefined;
  const m = err?.response?.data?.message;
  if (Array.isArray(m) && m[0]) return String(m[0]);
  if (typeof m === 'string' && m) return m;
  return err?.message || fallback;
}

// ─── Payload fragments shared by several types (same shape the wizards sent) ─────

export interface InsuranceChoice { companyId: string; plans: string[] }

export const insurancePlansOf = (list: InsuranceChoice[] | undefined) =>
  Object.fromEntries((list || []).filter((i) => Array.isArray(i.plans) && i.plans.length).map((i) => [i.companyId, i.plans]));

/** The bank step and the final submit every type ends with. */
export async function finishApplication(
  data: { iban?: string; accountHolderName?: string; signerName: string; signerRole: string },
  sigUrl: string,
  coords: { lat: number; lng: number },
  fullData: unknown,
): Promise<void> {
  await ProviderApi.step2({ iban: data.iban, bank_account_name: data.accountHolderName });
  await ProviderApi.submit({
    signer_name: data.signerName, signer_role: data.signerRole, lat: coords.lat, lng: coords.lng,
    signature_url: sigUrl, full_data: fullData,
  });
}
