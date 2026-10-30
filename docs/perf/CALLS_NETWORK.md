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
- **TURN over TLS on port 443.** On this shared server 443 is nginx's (HTTPS and QUIC for every site), and TURN/TLS needs the port to itself. Strict networks
  that allow only HTTPS out reach coturn on 5349 only if their firewall allows it. Three ways, owner's call: (a) **a second IPv4 address** for
  `turn.nabd.plus` (a provider "additional IP"), coturn `listening-ip=<it>` and `tls-listening-port=443`, `COTURN_TLS_PORT=443`: no change to nginx, the least risk;
  (b) nginx `stream` with `ssl_preread` routing the SNI `turn.nabd.plus` to coturn and everything else to the HTTP server over PROXY protocol: one address, but
  every server block, the QUIC listeners and the real-client-IP handling change (a redesign of the edge); (c) the calls server of `deploy/SCALING.md` step 2.6.
- **LiveKit's own TURN.** The browser/app LiveKit clients get their ICE servers from LiveKit; coturn's time-limited credentials are for the P2P path
  (`CoturnService`). Turning on LiveKit's embedded TURN (`turn.enabled`, its own UDP and TLS ports, the same certificate) gives the SFU path a relay too; it adds two
  ports and a certificate mount, so it goes with the 443 decision above.
- **A CI check from an IPv4-only, relay-only client.** Needs a LiveKit server with a TURN server in CI and a headless client with `iceTransportPolicy: "relay"`;
  not built yet. Until then, check by hand after the ops task: from an IPv4-only machine, `curl -4 https://live.nabd.plus` works, a room joins, and the
  LiveKit log of the join shows a candidate pair with the server's IPv4 (`docker logs nabdah-livekit | grep -i candidate`); for the UDP-blocked case block UDP out
  on the test machine (`iptables -A OUTPUT -p udp ! --dport 53 -j DROP`) and the room must still join over TCP 7881.

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
