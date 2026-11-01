/**
 * The server answers every /provider/ call of a provider whose accepted contract has an older major version with 403
 * `provider_agreement_required`. The API client reports it here and the contract gate asks the legal service what is pending.
 */
type Listener = () => void;
const listeners = new Set<Listener>();

export const AGREEMENT_REQUIRED_CODE = 'provider_agreement_required';

export function onAgreementRequired(fn: Listener): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function emitAgreementRequired(): void {
  listeners.forEach((fn) => fn());
}

/** The code a failed request carried (`{code}` or `{message}` in the body). */
export function errorCode(e: unknown): string | null {
  const d = (e as { response?: { data?: { code?: unknown; message?: unknown } } })?.response?.data;
  if (typeof d?.code === 'string') return d.code;
  return typeof d?.message === 'string' ? d.message : null;
}

/** What a refused submit says to the provider, by the typed code of the server. */
export function submitErrorKey(code: string | null): 'contract.signaturePending' | 'contract.signatureUnusable' | 'contract.notPublished' | 'contract.mustAccept' | null {
  switch (code) {
    case 'signature_pending_scan': return 'contract.signaturePending';
    case 'signature_unusable': return 'contract.signatureUnusable';
    case 'provider_agreement_not_published': return 'contract.notPublished';
    case 'provider_agreement_not_accepted': return 'contract.mustAccept';
    default: return null;
  }
}
