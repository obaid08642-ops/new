# Receiving and answering support mail (2026-10-18)

Goal: `info@`, `support@`, `security@`, `customer@` and `doctor@` nabd.plus arrive in the owner's Gmail, and the owner can answer **as** those addresses
from Gmail, through Brevo. Outgoing app mail (Resend, Brevo, Mailjet, SES) must not change.

## 1. Receiving: Cloudflare Email Routing (ops tasks, need the owner's Approve)

| Task (`tools/ops/RUN`) | What |
|---|---|
| `cf:44-email-routing-check` | reads only: routing state, destination status, apex MX and SPF facts |
| `cf:44-email-routing-apply` | registers the destination (Cloudflare e-mails the owner a confirmation link), then, once confirmed, enables routing and creates the three rules. Run it again after clicking the link |

Needs the GitHub secret **`OPS_FORWARD_EMAIL`** (the owner's mailbox; it is never printed). Rehearsed against a stand-in API
(`tools/ops/rehearsal/cf-scenarios.sh`, job `cloudflare-edge`): waits for the confirmation, enables, creates 3 rules.

**What it protects (sending):** outgoing mail is judged by the apex SPF (one record: `spf.brevo.com`, `spf.mailjet.com`,
`amazonses.com`), DKIM and DMARC. Enabling Email Routing adds apex **MX** records (inbound only, no effect on sending; the
Resend return path `send.nabd.plus` is a subdomain and is untouched). Cloudflare's one-click enable may also add its own SPF record,
which would make two SPF records (SPF would fail for every provider): the task removes that second record again and ends by
checking: SPF is still ONE record with the three includes, no DKIM/DMARC/return-path record is missing, the only DNS
difference is the Cloudflare MX records. It refuses to start if an apex MX of another provider exists, or if SPF is already
broken. A catch-all rule is **not** created.

## 2. Answering as support@ from Gmail: "Send mail as" through Brevo SMTP (owner)

Do section 1 first (Gmail sends a confirmation code to the address, and it must reach your inbox).

1. **Brevo:** *SMTP & API* → *SMTP* tab → note the **SMTP server** `smtp-relay.brevo.com`, port **587**, and the **login** shown there. Click *Generate a new SMTP key*, name it "Gmail send-as", copy the key once. (This is not the account password and not the `xkeysib-` API key the app uses. If the key leaks, delete it in Brevo; nothing else breaks.)
2. **Gmail (on a computer):** ⚙ → *See all settings* → *Accounts and Import* → *Send mail as* → *Add another email address*.
   - Name: for example `Nabd Plus Support`; Email: `support@nabd.plus`; keep *Treat as an alias* ticked → *Next step*.
   - SMTP Server: `smtp-relay.brevo.com`; Port: `587`; Username: the Brevo SMTP login; Password: the SMTP key; **Secured connection using TLS** → *Add Account*.
3. Gmail e-mails a **confirmation code** to `support@nabd.plus`; Email Routing forwards it to your inbox. Enter the code (or click the link).
4. Repeat for `info@nabd.plus`, `security@nabd.plus`, `customer@nabd.plus` and `doctor@nabd.plus` (same SMTP details).
5. In the same Gmail page set *When replying to a message* → **Reply from the same address the message was sent to**.
6. Test: send yourself a mail from each address; in Gmail *Show original* should show `SPF: PASS` and `DKIM: PASS` for `nabd.plus`.

Notes: Brevo's domain `nabd.plus` is already authenticated (task `cf:41-mail-verify` reports it), so any address at the domain may send. These mails count in Brevo's daily quota together with the app's mail (free plan: check the current limit in Brevo). Do not use the Mailjet key pair that was pasted in chat; it is treated as exposed.

## 3. Search suggestions at the edge (ops tasks)

`cf:43-search-suggest-cache-check` / `cf:43-search-suggest-cache-apply`. `GET api.nabd.plus/api/v1/search/suggest` already answers
`public, max-age=300, s-maxage=3600` with `Cache-Tag: search` (backend `@PublicCache`). The zone's blanket cache bypass for `/api/` hides that from the edge:
the task adds one rule after the bypass rules (the last matching rule wins): cache, edge TTL and browser TTL = **respect origin**, only for anonymous GETs of that path (no `Authorization`, no session cookie). It
checks MISS then HIT, that a request with `Authorization` or a session cookie is never a HIT, that the browser header is unchanged, and that a purge by tag `search` empties it; if a check fails it puts the old rules back. It refuses to start when
the origin does not send the public header yet (production on an older build).
Note: the request path is `/api/v1/search/suggest` (the API prefix is `/api/v1`). Removing entries on a change uses the backend purge bus, which needs its own **Cache Purge** API token (`CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ZONE_ID` in `.env.production`, owner/AntiGravity); until it exists the 1-hour TTL applies.

## 4. HSTS preload

Not submitted (postponed by the reviewer).
