import { CoturnService } from './coturn.service';
export declare class CoturnController {
    private readonly svc;
    constructor(svc: CoturnService);
    getIceConfig(u: any): {
        iceServers: Array<{
            urls: string[];
            username?: string;
            credential?: string;
        }>;
        realm: string;
    };
    getCredentials(u: any): import("./coturn.service").TurnCredentials;
}
