#!/bin/bash
# Mail test per provider (review session, 2026-10-16 evening): after the next deploy AND after the owner rotated the Brevo /
# Mailjet keys (the old values leaked). Sends ONE mail through each provider (Resend, Brevo, Mailjet) to the owner
# (OPS_ALERT_EMAIL) with the app's own MailService, inside the running backend container, so the result is what the app does:
# the send is counted in mail_quota and written to mail_log. Prints, per provider, the result of the send and the newest
# mail_log rows (provider, ok, fallback_used, time, subject; the address is shown as <owner> or <other>, never spelled out).
#   1. refuses to run if OPS_ALERT_EMAIL is unset or a provider has no key (it says which, by name)
#   2. if .env.production is newer than the backend container (new keys written by 70-mail-env), recreates backend and worker
#      with the deploy's compose files so they read it (the same recreate 62-backups-verify does), and waits until healthy
#   3. the script below runs in the backend container with MAIL_PROVIDER_ORDER set to one provider at a time
# Sends exactly 3 mails (one per provider); each counts toward that provider's free quota. Public lines: "mail:".
set -u
D=${OPS_DEPLOY_DIR:-/opt/nabdah/deploy}
ENVF=$D/.env.production
DK="sudo -n docker"
envget() { sudo -n grep -E "^$1=" "$ENVF" | tail -1 | cut -d= -f2- | sed -E "s/^[\"']//; s/[\"']$//"; }
health() { $DK inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$1" 2>/dev/null; }
echo "## mail-test"
[ -n "$(envget OPS_ALERT_EMAIL)" ] || { echo "mail: ABORT OPS_ALERT_EMAIL is not set"; exit 1; }
MISSING=""; for n in RESEND_API_KEY BREVO_API_KEY MAILJET_API_KEY MAILJET_SECRET_KEY; do [ -n "$(envget $n)" ] || MISSING="$MISSING $n"; done
[ -z "$MISSING" ] || { echo "mail: ABORT keys not set in .env.production:$MISSING"; exit 1; }

ENV_AT=$(sudo -n stat -c %Y "$ENVF"); STARTED=$($DK inspect -f '{{.State.StartedAt}}' nabdah-backend | xargs -I{} date -d {} +%s)
if [ "$ENV_AT" -gt "$STARTED" ]; then
  F="-f $D/docker-compose.production.yml"; sudo -n test -f $D/docker-compose.release.yml && F="$F -f $D/docker-compose.release.yml"
  echo "mail: .env.production is newer than the backend container; recreating backend and worker to read it"
  $DK compose $F --project-directory $D --env-file $ENVF up -d --no-build --no-deps backend worker >/dev/null 2>&1
  for i in $(seq 1 48); do [ "$(health nabdah-backend)" = healthy ] && [ "$(health nabdah-worker)" = healthy ] && break; sleep 5; done
  [ "$(health nabdah-backend)" = healthy ] || { echo "mail: ABORT backend not healthy after the recreate"; exit 1; }
fi
echo "mail: backend running since $($DK inspect -f '{{.State.StartedAt}}' nabdah-backend | cut -c1-19), providers with keys: $($DK exec nabdah-backend sh -c 'for n in RESEND_API_KEY BREVO_API_KEY MAILJET_API_KEY MAILJET_SECRET_KEY; do eval v=\${$n:-}; [ -n "$v" ] && printf "%s " $n; done')"

$DK exec -i nabdah-backend node - <<'NODE'
const mongoose = require('mongoose');
const { EventEmitter2 } = require('@nestjs/event-emitter');
const { MailService } = require('/usr/src/app/dist/modules/mail/mail.module.js');
(async () => {
  const owner = process.env.OPS_ALERT_EMAIL;
  const conn = await mongoose.createConnection(process.env.MONGO_URL, { dbName: process.env.DB_NAME || 'nabd_nestjs', directConnection: true, serverSelectionTimeoutMS: 15000 }).asPromise();
  const svc = new MailService(new EventEmitter2(), conn);
  const stamp = new Date().toISOString().slice(0, 19) + 'Z';
  for (const p of ['resend', 'brevo', 'mailjet']) {
    process.env.MAIL_PROVIDER_ORDER = p;   // MailService reads it on every send: one provider at a time
    const subject = `Nabd+ mail test (${p}) ${stamp}`;
    const html = `<div dir="ltr" style="font-family: system-ui, sans-serif;"><p>Test mail through ${p}, sent by the build session's ops task 73 after the key rotation.</p></div>`;
    const r = await svc.send(owner, subject, html, `Test mail through ${p}.`);
    console.log(`mail: ${p}: ok=${r.ok} provider=${r.provider} fallback_used=${r.fallback_used}${r.error ? ' error=' + String(r.error).slice(0, 120) : ''}`);
  }
  await new Promise((r) => setTimeout(r, 1500));
  const rows = await conn.collection('mail_log').find({ subject: { $regex: '^Nabd\\+ mail test \\(' } }).sort({ createdAt: -1 }).limit(3).toArray();
  console.log('mail: mail_log rows (newest first):');
  for (const row of rows) console.log(`mail:   provider=${row.provider} ok=${row.ok} fallback_used=${row.fallback_used} at=${new Date(row.createdAt).toISOString()} to=${row.to === owner ? '<owner>' : '<other>'} subject="${row.subject}"`);
  const q = await conn.collection('mail_quota').find({ _id: { $regex: ':d:' } }).sort({ _id: 1 }).toArray();
  console.log('mail: today per provider: ' + q.map((d) => `${d.provider || d._id.split(':')[0]}=${d.count}`).join(' '));
  await conn.close();
  process.exit(rows.length === 3 && rows.every((x) => x.ok) ? 0 : 2);
})().catch((e) => { console.log('mail: FAIL ' + String(e && e.message || e).slice(0, 200)); process.exit(1); });
NODE
rc=$?
if [ $rc = 0 ]; then echo "mail: OK: one mail per provider delivered and logged"; else echo "mail: NOT OK (exit $rc): see the lines above"; fi
exit $rc
