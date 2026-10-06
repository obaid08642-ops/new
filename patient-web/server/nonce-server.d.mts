import type { IncomingMessage, ServerResponse } from "node:http";
export declare function handler(internalPort: number): (req: IncomingMessage, res: ServerResponse) => void;
