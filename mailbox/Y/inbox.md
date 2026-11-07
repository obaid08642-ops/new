# Lane Y — medical ordering engine (backend), spec PR #1750
## 2026-11-07 order 1
1. Read AGENTS.md and the ordering spec (#1750, docs referenced there) and `docs/design/needs-review/m6-blocked.json`.
2. Build M3 (ordering engine) on the backend with unit + journey tests, then M4 (ASAP timer), M5 (coverage), M7 (arrival code, staff profile), M8 (discuss with a doctor), one PR each.
Gate before every push: the commands in AGENTS.md "Gate before every push". Branch prefix `y/`. Write results to `mailbox/Y/outbox.md`.
