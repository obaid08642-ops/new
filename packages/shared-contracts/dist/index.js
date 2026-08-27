"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertTransition = assertTransition;
__exportStar(require("./state-machines"), exports);
__exportStar(require("./provider-contracts"), exports);
/** حارس الانتقالات — يستخدمه الباكند في StateGuard middleware */
function assertTransition(transitions, from, to, actor, ctx) {
    const candidates = transitions.filter((t) => t[0] === from && t[1] === to);
    if (!candidates.length)
        return { ok: false, reason: `illegal_transition:${from}->${to}` };
    const actorCandidates = candidates.filter((t) => t[2] === actor);
    if (!actorCandidates.length)
        return { ok: false, reason: `forbidden_actor:${actor}` };
    for (const transition of actorCandidates) {
        const fourth = transition[3];
        const serviceKinds = Array.isArray(fourth) ? fourth : null;
        if (serviceKinds && (!ctx?.serviceKind || !serviceKinds.includes(ctx.serviceKind)))
            continue;
        const guard = typeof fourth === 'function'
            ? fourth
            : transition[4];
        if (!guard || guard(ctx))
            return { ok: true };
    }
    return { ok: false, reason: 'transition_guard_failed' };
}
