/**
 * F10 (15.12) — TEST-ONLY failure switches for chaos drills.
 *
 * EXACT contract (also recorded in backend/P15_NOTES.md "Fix round 2 / F10"
 * for the gates agent that wires drills):
 * - `CHAOS_FAIL_SMS=1` → SmsService.sendOtp() returns false immediately,
 *   before the enabled-check and before any provider HTTP call. The documented
 *   fallback this forces is the OTP email+push path at callers (sendOtp false
 *   already means "fall back" everywhere it is consumed).
 * - `CHAOS_FAIL_LIVEKIT=1` → LiveKitService.roomService() returns null, i.e.
 *   the service behaves exactly as if the LiveKit server were unconfigured:
 *   getRoomParticipants() → [], muteParticipant() →
 *   { success:false, reason:'livekit_not_configured' }, removeParticipant()
 *   → NotFoundException('livekit_not_configured'). Local token minting
 *   (createToken/createBookingToken) is NOT gated — it is process-local
 *   crypto, not a LiveKit server dependency.
 * - Honoured ONLY when the variable's value is exactly the string '1'.
 *   Unset, empty, '0', 'true', or anything else → normal behavior. Never on
 *   by default; no production path sets these.
 */
export type ChaosTarget = 'sms' | 'livekit';

export function isChaosFail(target: ChaosTarget): boolean {
  if (target === 'sms') return process.env.CHAOS_FAIL_SMS === '1';
  if (target === 'livekit') return process.env.CHAOS_FAIL_LIVEKIT === '1';
  return false;
}
