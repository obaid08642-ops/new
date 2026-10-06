import type { IncomingMessage, ServerResponse } from "node:http";
export declare function handler(internalPort: number): (req: IncomingMessage, res: ServerResponse) => void;
export declare function pickEncoding(acceptEncoding: string | string[] | undefined): "br" | "gzip" | null;
