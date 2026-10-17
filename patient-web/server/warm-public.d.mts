export type WarmSettings = { top: number; locales: string[]; api: string };
export declare function warmSettings(env?: Record<string, string | undefined>): WarmSettings | null;
export declare function warmPaths(locale: string, slugs: unknown[]): string[];
export declare function warmPublicPages(port: number, settings: WarmSettings, fetchJson?: (url: string) => Promise<unknown>): Promise<{ ok: number; failed: number }>;
