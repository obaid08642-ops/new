import type { IncomingMessage, ServerResponse } from "node:http";
export declare const EDGE_STAMP_HEADER: string;
export declare function handler(internalPort: number, options?: { edgeToken?: string }): (req: IncomingMessage, res: ServerResponse) => void;
