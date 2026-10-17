# Checkout waiting room (P14.19)

**Decision (recorded in `deploy/SCALING.md`):** no Business-plan Cloudflare Waiting Room. When a campaign needs one, a
Worker queue in front of the web checkout only: `deploy/cloudflare/waiting-room-worker`. It is off by default and only
switched on for a campaign window, with the owner's Approve.

## What it does
- **Guards** the two web checkout entry pages per locale (`/{locale}/cart/checkout`, `/{locale}/pharmacy/payment`), GET
  document requests only. Payment results, the gateway's return pages, the rest of the site and the API are never queued
  (the API is protected by load shedding, P14.17; the apps call the API).
- **Admits** `ADMIT_PER_MINUTE` visitors a minute, `BURST` of them at once. A visitor beyond that gets a ticket and a
  waiting page (HTTP 200, never an error): their position and the estimated wait, in their language (`WaitingRoom` in
  `patient-web/messages`), refreshed every 15 s with no script. One Durable Object serves the tickets in arrival order.
- **Admitted** visitors carry a signed cookie for `ADMIT_MINUTES` (15) and pass every guarded page meanwhile; the cart is
  kept on the device, so waiting loses nothing.
- **Fails open:** room off, no secret, no Durable Object, or any error: the visitor goes straight to checkout, as today.

## Setting the rate
`ADMIT_PER_MINUTE` is the number of checkouts per minute the origin holds within the targets, from the latest capacity
report (`docs/perf/load-test-*.md`, P14.27): its checkout requests per second at the last step that met every target,
× 60, minus a margin for the rest of the traffic. Re-measure after each scale step.

## Switching it on for a campaign (ops, owner's Approve)
1. `wrangler secret put WAITING_ROOM_SECRET` (a random 48-character value; never in the repo).
2. Set `WAITING_ROOM = "on"` and the rate in `wrangler.toml`, then `wrangler deploy` from
   `deploy/cloudflare/waiting-room-worker` (its routes cover only the 12 checkout paths).
3. Check: `curl -sI -H 'accept: text/html' https://nabd.plus/ar/cart/checkout | grep -i x-nabd-waiting-room` answers
   `admitted` (or `queued` under load).
4. After the campaign: `WAITING_ROOM = "off"` and deploy again (or remove the routes). Admission cookies simply expire.

## Verify (plan: "a spike above capacity queues users instead of failing them")
`worker.test.mjs` (CI "Waiting room worker"): 1,000 visitors in 10 s against 120 admissions a minute (burst 60): every
answer is 200, about 80 are admitted at once and the origin sees only those, the rest get the waiting page; as time
passes every waiting visitor is admitted, in arrival order. Also: guarded paths only; room off, no secret or a broken
Durable Object pass straight through; forged admission and ticket cookies are refused; the page has no script, a CSP
allowing only its own style (by hash), and only design-token colours.

Not done here (owner): deploying it, which needs the Cloudflare API token in the ops workflow, and a campaign date.
