# Lane L inbox — admin, patient-app, patient-web (client lint ratchets, no money, no backend)
Read mailbox/L/STRICT.md FIRST (binding, overrides everything else), then mailbox/L/LOOP.md (your permanent loop, never stop), then mailbox/RULES.md. Branch prefix `l/`. Report in mailbox/L/outbox.md (newest on top).

## 2026-11-28 14:00 UTC lead — Order L1 (big queue; follow LOOP.md; up to 6 PRs open; do not wait for merges)
You are a second lane next to lane K. K owns provider-app only; you own admin, patient-app, patient-web only (see STRICT.md). Work = lowering the ratchet baselines in `tools/design/` for YOUR directories, mechanically and safely. Run each gate before and after: `node tools/design/<gate>.mjs` (and `--update` to rewrite the baseline when the number went down). Current counts on main (files under your directories): no-raw-color admin 167, patient-app 10, patient-web 13; client-token-sync admin 144; no-left-right patient-app 48, admin 1; no-emoji-in-ui admin 15; literal strings 0 for your apps (keep it 0).
Items, in this order, one PR = one gate on one app, up to ~300 changed lines (split bigger ones into several PRs):
 1. patient-web no-raw-color 13 -> 0 (nearest @nabd/design-tokens token, both light and dark).
 2. patient-app no-raw-color 10 -> 0.
 3. patient-app no-left-right 48 -> 0 (use start/end / logical properties; check RTL behaviour is preserved).
 4. admin no-emoji-in-ui 15 -> 0 (use the existing icon set; never add an icon that is not in the repo).
 5. admin no-left-right 1 -> 0.
 6. admin no-raw-color 167 -> 0 in slices by screen group.
 7. admin client-token-sync 144 -> 0 in slices (read how the gate defines it first; if it needs a token that does not exist, skip that file and list it under "needs lead").
After each PR: re-read LOOP.md step 2 (fix your own red/conflict PRs first), then take the next item. When the list is done, say so in the outbox and stop.
Visual risk: a colour swap can change how a screen looks. Pick the nearest token by meaning (text, surface, border, action, success/warn/error) not by hex distance alone; mention in the PR body the 3 riskiest swaps for the lead to eyeball.
