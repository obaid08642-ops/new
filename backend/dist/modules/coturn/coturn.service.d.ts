export interface TurnCredentials {
    urls: string[];
    username: string;
    credential: string;
    ttl: number;
    realm?: string;
}
export declare class CoturnService {
    private readonly logger;
    private readonly coturnHost;
    private readonly coturnSecret;
    private readonly stunPort;
    private readonly turnPort;
    private readonly turnRealm;
    private readonly customUrls;
    constructor();
    private iceUrls;
    generateCredentials(userId: string, ttlSeconds?: number): TurnCredentials;
    getIceServers(userId: string): {
        iceServers: Array<{
            urls: string[];
            username?: string;
            credential?: string;
        }>;
        realm: string;
    };
}
