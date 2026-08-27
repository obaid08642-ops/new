export * from './state-machines';
export * from './provider-contracts';

/** حارس الانتقالات — يستخدمه الباكند في StateGuard middleware */
export function assertTransition<S extends string>(
  transitions: ReadonlyArray<readonly [S, S, string, any, ((ctx?: any) => boolean)?]>,
  from: S,
  to: S,
  actor: string,
  ctx?: any,
): { ok: true } | { ok: false; reason: string } {
  const match = transitions.find((t: any) => t[0] === from && t[1] === to);
  if (!match) return { ok: false, reason: `illegal_transition:${from}->${to}` };
  if (match[2] !== actor) return { ok: false, reason: `forbidden_actor:${actor}_required:${match[2]}` };
  if (match[4] && !match[4](ctx)) return { ok: false, reason: 'transition_guard_failed' };
  return { ok: true };
}
