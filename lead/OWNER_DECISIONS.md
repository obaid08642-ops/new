# Owner decisions and agreements (history from the old lead session, sanitized for a public repo)
No secrets, server names or personal data here. The full old chat is NOT published (the repo is public).

## Working rules
- Reply to the owner in short Egyptian Arabic. Act as if the owner is present; follow every session until the work is done.
- Never skip/disable/quarantine tests; never raise performance budgets; never --no-verify.
- Secrets never pass through chat, GitHub text, the repo or sessions; the owner sets them on the server or in GitHub settings.
- Server changes only through ops runs on branch review/server-inspect that the owner approves; production checks are GET only; ops tasks print names and counts only.
- DB changes: dry run → plan → owner approve → backup → verify → rollback path. No volume deletion without explicit approval; never delete running images.
- Never serve unscanned uploads; never cache private pages.
- The lead never approves or merges its own PRs. No model names in commits/PRs.
- Token budget (2026-11-07): small contexts; state files on GitHub; sessions woken every 3–4 h.

## Product / infra decisions
- One bigger VPS at launch (now 4 GB to save cost); RAM upgrade at launch; standby VPS and KSA hosting pending owner decision.
- LiveKit stays self-hosted; no paid managed services without price approval; no external free-API routers (code/data must not go to unknown providers).
- Red "under construction / trial version" notice on every website page: informational only, six languages, design tokens only, admin flag `site_notice_enabled` default ON, no noindex (PR #2424).
- Public pages keep the last good cached copy during outages (stale-if-error); private pages never cached. Edge cache verified HIT 2026-11-07.
- Design identity and translation rules: see AGENTS.md (binding).
- Earlyoom: dry run done (run 97); apply only after owner approval.
- External uptime check exists; auto-reboot (R15) stays in dry-run until the owner enables it.
- Plugins (2026-11-07): no claude-mem, no free-API router; automation recommender maybe later on the owner's Mac.

## History in brief
- 11-01 OVH renewal failed → outage 11-02; owner paid; site back 11-03.
- 11-03: runs 97–100 deployed (incl. admin passkey fix #2438). 11-03→11-07 subscription stopped all sessions.
- 11-07: run 101 deployed main@641bbe2f. Heavy sessions replaced: lanes X/Y on two other accounts (mailbox branch), Lead 2 / F3 / P3 here.

## Owner to-dos
GitHub secrets for uptime alert mail; Moyasar/APNs/social login keys; decisions above; test admin passkey login and report.
