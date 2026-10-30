# Calls on every network (owner 2026-10-30)

## What was wrong
`deploy/livekit/livekit.yaml` had `rtc.node_ip: 2001:41d0:…` (an IPv6 address) and coturn had `external-ip=` the same IPv6 address. Both were written by
`deploy/scripts/deploy.sh` from `curl ifconfig.me`, which answers the IPv6 address on a dual-stack host. The server therefore **advertised no IPv4
candidate**: a client on an IPv4-only network (many Wi-Fi networks and carrier-grade NAT) had nothing to connect to, with or without a relay.

## What changed (PR "calls: advertise the IPv4")
| | Before | Now |
|---|---|---|
| LiveKit public address | fixed `node_ip` = the IPv6 address | `use_external_ip: true`: STUN discovery of the public IPv4, advertised with the host addresses |
| LiveKit UDP | one mux port 7882 **and** a 100-port range 50000-50100 | the mux port only (`rtc.udp_port: 7882`); one firewall rule, no 100 docker port mappings |
| TCP fallback | 7881 | 7881 (unchanged): a client whose UDP is blocked still reaches the SFU over TCP |
| coturn `external-ip` | IPv6 only | the IPv4 first, the IPv6 second |
| `deploy.sh` | `curl ifconfig.me` | `curl -4` for the IPv4, `curl -6` for the IPv6; never writes `node_ip` again |
| Server | not changed by a deploy | `tools/ops/tasks/93-calls-network.sh` (dry run first, then APPLY at a quiet hour; refuses while a call is active; both files back on any failure) |

## Not done, and why
## TURN on 443 without a second IP: Cloudflare Realtime TURN (owner prefers free)
`turn.cloudflare.com` serves TURN over TLS on 443 and UDP/TCP on 3478; 1,000 GB a month are free (shared with the SFU), then $0.05 per GB. It replaces the
earlier recommendation of buying a second IPv4 for coturn:443 (which stays possible but is no longer needed), and nginx keeps port 443.

- **Backend.** `CloudflareTurnService` (`modules/coturn/cloudflare-turn.service.ts`) asks `POST https://rtc.live.cloudflare.com/v1/turn/keys/<CF_TURN_KEY_ID>/credentials/generate`
  with `CF_TURN_API_TOKEN` and a 1 h TTL (about a call), keeps the answer per user for 5 minutes, times out after 3 s, and on any failure (not configured, HTTP error,
  Cloudflare down) returns nothing, so the call goes on with our coturn only. Only the short-lived `urls/username/credential` leave the server; the API token never does.
- **Where clients get it.** `ice_servers` is now in every call answer, for both transports: `POST /calls/initiate`, `POST /calls/:id/join`, the fallback to LiveKit,
  `GET /unified-bookings/:id/call-token`, and `GET /calls/ice/config`. Order: Cloudflare first, our coturn (3478/5349) second.
- **Clients.** The web room (`video-room-client.tsx`) and the provider app (`VideoCallRoom.tsx`) pass them to `room.connect(url, token, { rtcConfig: { iceServers } })`.
  The patient mobile app does not open LiveKit itself in this repo (no `room.connect` there), so nothing changes in it; a P2P client, when one exists, takes the same list.
- **Owner steps (not in chat or the repo).** Create a TURN key in the Cloudflare dashboard (Realtime > TURN), put `CF_TURN_KEY_ID` and `CF_TURN_API_TOKEN` in the backend's
  environment on the server, restart the backend. For the CI check add both as repository secrets.
- **CI.** `.github/workflows/turn-relay.yml` runs `tools/live/turn-relay-check.mjs`: a real Chromium gathers ICE with `iceTransportPolicy: "relay"` using a fresh
  Cloudflare credential and passes only if a relay candidate comes back. Without the secrets it prints "skipped" and passes. Not run here (no key in this session).

## Not done, and why
- **TURN over TLS on our own coturn at 443.** Superseded by Cloudflare TURN above; the options if it is wanted anyway: (a) a second IPv4 address for `turn.nabd.plus` with
  `tls-listening-port=443` and `COTURN_TLS_PORT=443`; (b) nginx `stream` with `ssl_preread` (a redesign of the edge); (c) the calls server of `deploy/SCALING.md` step 2.6.
- **LiveKit's own TURN.** Not needed for the relay now that the SFU path gets the same ICE servers from the call answer.
- **A CI check against our own coturn and LiveKit.** Needs a TURN server in CI; the Cloudflare check above covers the relay path the clients will use first. By hand after the
  ops task: from an IPv4-only machine `curl -4 https://live.nabd.plus` works, a room joins, and `docker logs nabdah-livekit | grep -i candidate` shows the server's IPv4;
  for the UDP-blocked case block UDP out (`iptables -A OUTPUT -p udp ! --dport 53 -j DROP`) and the room must still join over TCP 7881.

## Capacity on the 3.8 GB host (from the measured ladder, not measured on production)
`docs/perf/CALLS_14.22.md` measured LiveKit 1.10.1 on a 4 vCPU machine **shared with the load testers**: 40 concurrent 1:1 video calls (720p simulcast) clean at 70 % of
one core, 1.8 Mbps of server egress per call; at 80 calls 2 % loss. On the production host LiveKit shares the cores and the memory with the API, MongoDB and the
web apps, so plan on **25 to 30 concurrent video consultations** (about 50 Mbps of egress) and **60 or more audio-only** calls (audio is a few tens of kbps per
participant). The LiveKit container is limited to 256 MB (`docs/ops/MEMORY_BUDGET_3_8GB.md`); the SFU's memory per call was not measured here, so the first busy day
decides whether the limit holds (`memory-report.sh` shows its use). The server's `CALLS_PRESSURE_ACTIVE` (300) is far above this: **lower it to 40** so the
automatic audio-only mode starts before the host is saturated.

## P2P for 1:1 calls (`CALLS_P2P_ENABLED`, off)
Saves, on a call that connects directly (assumed 75 to 90 %): all of the LiveKit CPU and egress for that call. At 75 % direct the same host carries about four times the
1:1 calls (`CALLS_SCALE.md`). Risks: about 15 to 25 % of calls need a relay (carrier NAT, corporate networks), so **TURN must work first** (the IPv4 fix above, and the
443 decision for strict networks); a call that cannot connect directly falls back to LiveKit automatically (12 s), which costs those users a delay; and a P2P call cannot be
recorded on the server (nothing records consultations today). **Recommendation:** do not enable it before (1) the ops task is applied and a real call over mobile data connects,
(2) the coturn relay path has had one rehearsal, and (3) the owner has decided about recording. Then enable it for a slice of users and read `GET /calls/admin/analytics`
(`transports_today`) to see the real direct share before widening it.
