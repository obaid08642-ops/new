export declare const CSP_NONCE_PLACEHOLDER: string;
export declare const CSP_INJECT_HEADER: string;
export declare const UNAVAILABLE_FALLBACK_HEADER: string;
export declare function freshNonce(): string;
export declare function policyWithNonce(policy: string | null | undefined, nonce: string): string;
export declare function stampTags(html: string, nonce: string): string;
export declare function createStamper(nonce: string): { push(chunk: string): string; end(): string };
