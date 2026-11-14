/**
 * Calls at scale (item 4). Pure decisions, kept apart from the service so they can be tested without a database.
 *  - `CALLS_P2P_ENABLED` (default off): a 1:1 consultation call goes peer to peer; the backend only authorizes and relays
 *    the signalling (sdp/ice over the realtime gateway). TURN (coturn) carries the media only when the direct path fails.
 *  - LiveKit stays the transport for group calls, for the fallback when P2P fails, and for any call when the flag is off.
 *  - A host (the provider of the consultation) takes `CALLS_MAX_PER_HOST` calls at a time; the next one is answered `provider_busy`.
 *  - Under server pressure (`CALLS_PRESSURE_ACTIVE`) or on a weak link the call is advised audio only.
 */

export type CallTransport = 'p2p' | 'livekit';

const truthy = (v: string | undefined): boolean => ['1', 'true', 'yes', 'on'].includes(String(v || '').trim().toLowerCase());
const positiveInt = (v: string | undefined, fallback: number): number => {
  const n = Number.parseInt(String(v ?? ''), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

export function p2pEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return truthy(env.CALLS_P2P_ENABLED);
}

/** Calls one host may hold at once (initiated or active). A doctor sees one patient at a time by default. */
export function maxCallsPerHost(env: NodeJS.ProcessEnv = process.env): number {
  return positiveInt(env.CALLS_MAX_PER_HOST, 1);
}

/** Calls in progress on the platform from which new calls are advised audio only. */
export function pressureActiveCalls(env: NodeJS.ProcessEnv = process.env): number {
  return positiveInt(env.CALLS_PRESSURE_ACTIVE, 300);
}

/** P2P only for a two-person call with the flag on; anything else (group, flag off) stays on LiveKit. */
export function chooseTransport(input: { participants: number; env?: NodeJS.ProcessEnv }): CallTransport {
  return p2pEnabled(input.env) && input.participants === 2 ? 'p2p' : 'livekit';
}

export interface LinkSample { packet_loss?: number; rtt_ms?: number; bitrate_kbps?: number }

/** A weak link: a tenth of the packets lost, or a round trip over 600 ms, or less than 150 kbps getting through. */
export function isWeakLink(sample: LinkSample): boolean {
  const loss = Number(sample.packet_loss);
  const rtt = Number(sample.rtt_ms);
  const rate = Number(sample.bitrate_kbps);
  return (Number.isFinite(loss) && loss >= 0.1) || (Number.isFinite(rtt) && rtt >= 600) || (Number.isFinite(rate) && rate > 0 && rate < 150);
}

export function audioOnlyAdvice(input: { activeCalls: number; sample?: LinkSample; env?: NodeJS.ProcessEnv }): { audio_only: boolean; reason: 'server_pressure' | 'weak_link' | null } {
  if (input.activeCalls >= pressureActiveCalls(input.env)) return { audio_only: true, reason: 'server_pressure' };
  if (input.sample && isWeakLink(input.sample)) return { audio_only: true, reason: 'weak_link' };
  return { audio_only: false, reason: null };
}
