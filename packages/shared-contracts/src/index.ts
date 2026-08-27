export * from './state-machines';
export * from './provider-contracts';

/** حارس الانتقالات — يستخدمه الباكند في StateGuard middleware */
export function assertTransition<S extends string>(
  transitions: ReadonlyArray<readonly [S, S, string, ...unknown[]]>,
  from: S,
  to: S,
  actor: string,
  ctx?: any,
): { ok: true } | { ok: false; reason: string } {
  const candidates = transitions.filter((t) => t[0] === from && t[1] === to);
  if (!candidates.length) return { ok: false, reason: `illegal_transition:${from}->${to}` };

  const actorCandidates = candidates.filter((t) => t[2] === actor);
  if (!actorCandidates.length) return { ok: false, reason: `forbidden_actor:${actor}` };

  for (const transition of actorCandidates) {
    const fourth = transition[3];
    const serviceKinds = Array.isArray(fourth) ? fourth : null;
    if (serviceKinds && (!ctx?.serviceKind || !serviceKinds.includes(ctx.serviceKind))) continue;
    const guard = typeof fourth === 'function'
      ? fourth as (input?: any) => boolean
      : transition[4] as ((input?: any) => boolean) | undefined;
    if (!guard || guard(ctx)) return { ok: true };
  }

  return { ok: false, reason: 'transition_guard_failed' };
}
