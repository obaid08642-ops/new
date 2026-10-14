# Build session log

One line per merged PR (build brief 2026-10-14 §6): date, PR, item, result.

| Date | PR | Item | Result |
|---|---|---|---|
| 2026-10-14 | #308 | 1 — 14.1/14.9 public pages static/ISR | Merged. The browsers smoke reads the public read-only API (staging answers 302). The package card text uses `text-primary` (it was 4.496:1). CI green except Lighthouse, which is red on main too. |
| 2026-10-14 | #1417 | 2 — outage diagnosis | Merged. `docs/deploy/INCIDENT_2026-10-14.md`: the host was powered off from the provider side (qemu guest agent `guest-shutdown`, 2026-10-13 21:48:55 UTC) and was off for 17 h 38 min. |
| 2026-10-14 | #1419 | 3 — deploy of main (prerequisite) | Merged. `patient-web/.dockerignore` keeps the tests out of the image build context. Before this, `next build` failed in Docker on `../packages` imports. |
