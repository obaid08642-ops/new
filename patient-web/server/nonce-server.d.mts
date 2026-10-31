import type { IncomingMessage, ServerResponse } from "node:http";
export declare const EDGE_STAMP_HEADER: string;
/** `staticDir`: where the build's precompressed `.br` assets are (default: .next/static next to the server); null turns it off. */
export declare function handler(internalPort: number, options?: { edgeToken?: string; staticDir?: string | null }): (req: IncomingMessage, res: ServerResponse) => void;
export declare function pickEncoding(acceptEncoding: string | string[] | undefined): "br" | "gzip" | null;
export declare function precompressedAsset(staticDir: string | null | undefined, url: string | undefined): { file: string; size: number } | null;
/** The Cache-Tag of a shared public page (html plus medicines, doctors or articles by path), for a purge by tag. */
export declare function htmlCacheTags(pathname: string | undefined): string;
