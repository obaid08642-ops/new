/**
 * 15.11 / 15.12 — TEST-ONLY failure switches for the chaos drills.
 *
 * EXACT contract, so the drills that drive them are not vacuous:
 * - `CHAOS_FAIL_LIVEKIT=1` → LiveKitService.roomService() is null, i.e. the
 *   service behaves exactly as if the LiveKit server were unconfigured:
 *   getRoomParticipants() → [], muteParticipant() →
 *   { success:false, reason:'livekit_not_configured' }. Local token minting
 *   (createToken/createBookingToken) is NOT gated — it is process-local crypto,
 *   not a LiveKit server dependency.
 * - Honoured ONLY when the variable's value is exactly the string '1'.
 *
 * PRODUCTION GUARD (the review's top defect on the old tree, c9f6368c): the old
 * version gated on the env var alone, so one stray variable in production
 * silently disabled all LiveKit room control. These switches
 * are chaos-drill tooling, never an operational kill switch — the operational
 * ones are the admin kill switches (15.12 feature flags). Production therefore
 * refuses the variable outright: `isChaosFail` is always false there, and
 * `validateEnvironment` fails the boot if one is present.
 */
export type ChaosTarget = 'livekit';

export function isChaosFail(target: ChaosTarget): boolean {
  if (process.env.NODE_ENV === 'production') return false;
  if (target === 'livekit') return process.env.CHAOS_FAIL_LIVEKIT === '1';
  return false;
}