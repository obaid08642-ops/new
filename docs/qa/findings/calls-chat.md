# Calls and chat findings (2026-10-30)

No product defect has been confirmed in calls or chat yet. The matrix is in `docs/qa/calls-chat-matrix.md`.

## Test-stack notes (not product defects)

- **H-1: the call journey books a slot that may already have passed.** `tools/live/j_web_call.py` books the doctor's
  earliest slot. On the third run (2026-10-30, after 14:30 UTC) "doctor listed" returned 200 but no started video appointment
  came back. Fix: run with a window in the future, or make the journey pick a slot that is still ahead of now.
  Evidence: `/tmp/claude-0-scratch/calls_baseline3.log`.
- **H-2: the call journey uses `http://127.0.0.1:3100` by default, but the local patient web is on :3000.** Set
  `NABD_WEB_JOURNEYS_URL=http://127.0.0.1:3000`. Evidence: `/tmp/claude-0-scratch/calls_baseline2.log`.
- **H-3: the default Python has no Playwright.** `python3` on the runner lacks it; use `/home/user/claude-0-venv/bin/python3`.
  Evidence: `/tmp/claude-0-scratch/calls_baseline.log`.
- **H-4: only Chromium is installed.** Firefox and WebKit cells cannot run until the runner installs them.

When a call or chat cell fails for a product reason, add it here as `file:line` with the failing step output.
