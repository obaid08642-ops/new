# Restarting a stalled catalogue translation (ar/en)

Symptom: `98b-translate-progress` says "task still running" but `LIVENESS` says the stats file is older than 15 min (a live run writes it every 30 s). Answers stop; providers show `retired`.

What the code now does by itself (no operator step needed after the release is deployed):
- A provider retired for a daily budget or repeated limits comes back at its next daily reset (`retired_until` in the stats; gemini resets at Pacific midnight, the others at UTC midnight). A rejected key stays retired.
- A run that answers nothing for `TRANSLATE_STALL_MINUTES` (default 20) stops cleanly with exit 3 (`stalled`), so the daily resume starts a fresh one.
- cerebras uses `llama-4-scout-17b-16e-instruct` first (the old `llama3.1-8b` is retired, 404); a 404/402 tries up to 5 listed models, and a model list that could not be read is asked again.

Operator steps after deploying the release:
1. Run `98b-translate-progress`: if `LIVENESS` says DEAD or hung, the old detached run is gone; go on.
2. Pause the old detached task with `98c` (pause) so two runs never write the same responses file.
3. Run `97-translate-content` with `STEP=gaps` (dry run; note the requests hash), then `STEP=run EXPECT_REQUESTS_SHA=<hash>`. Answers already written are kept and not asked again.
4. Or leave it to `99-translate-resume-cron` (daily 00:30 UTC, pinned hash): it restarts the run on its own.
5. When `remaining=0`: `STEP=plan`, then the catalogue apply as before.

Providers without balance or quota (deepseek 402, openai quota) stay out until the account is topped up; the run does not wait for them.
