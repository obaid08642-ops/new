export * from './state-machines';
export * from './provider-contracts';
/** حارس الانتقالات — يستخدمه الباكند في StateGuard middleware */
export declare function assertTransition<S extends string>(transitions: ReadonlyArray<readonly [S, S, string, ...unknown[]]>, from: S, to: S, actor: string, ctx?: any): {
    ok: true;
} | {
    ok: false;
    reason: string;
};
