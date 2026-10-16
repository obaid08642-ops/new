#!/bin/bash
# Rehearsal of tools/ops/tasks/67-mail-env.sh and tools/ops/cf/41-mail-verify.sh against tools/ops/rehearsal/cf-mock.py
# (no real account, no real server). Test keys only.
#   A. production shape (public DNS of 2026-10-16): one SPF with brevo, mailjet and amazonses; DKIM for the three;
#      DMARC; Brevo and Mailjet verified; Resend verified -> 41 says OK; 67 puts the three keys, the order and the
#      quotas into the env, keeps every other line, prints no value; a second 67 changes nothing
#   B. two SPF records, Mailjet DKIM missing, Brevo not authenticated until asked again -> 41 says NOT OK, names the two
#      SPF records and the missing DKIM, asks Brevo again once and then reports it authenticated
#   C. no key file and the Resend domain pending -> 67 keeps the keys already there and asks Resend to verify again
set -uo pipefail
cd "$(dirname "$0")/../../.."
PORT=18788
python3 tools/ops/rehearsal/cf-mock.py $PORT > /tmp/cf-mock-mail.log 2>&1 &
MOCK=$!; W=$(mktemp -d); trap 'kill $MOCK; rm -rf "$W"' EXIT; sleep 1
M=http://127.0.0.1:$PORT
export CF_API=$M/client/v4 CF=rehearsal-global-key CFE=ops@rehearsal.test Z=zone-rehearsal
export BREVO_API=$M/v3 MAILJET_API=$M/v3/REST OPS_RESEND_API=$M
export BREVO_API_KEY=xkeysib-rehearsal-brevo-0001 MAILJET_API_KEY=mj-rehearsal-pub-0002 MAILJET_SECRET_KEY=mj-rehearsal-secret-0003
export OPS_DEPLOY_DIR=$W/deploy OPS_BACKUP_DIR=$W/backups OPS_MAIL_CREDS=$W/ops-mail.env
SECRETS="xkeysib-rehearsal-brevo-0001|mj-rehearsal-pub-0002|mj-rehearsal-secret-0003|re_rehearsal_resend_0004|rehearsal-global-key"
fail=0
expect() { if [ "$2" = "$3" ]; then echo "PASS $1"; else echo "FAIL $1: got $2, want $3"; fail=1; fi; }
seed() { curl -s -X POST -H 'Content-Type: application/json' $M/_mail --data "$1" > /dev/null; }
noleak() { grep -qE "$SECRETS" "$1" && { echo "FAIL a key value appeared in the output of $2"; fail=1; } || true; }
run41() { bash tools/ops/cf/41-mail-verify.sh > $W/41.txt 2>&1; rc=$?; sed 's/^/    /' $W/41.txt; noleak $W/41.txt 41
  grep -vE '^cf: ' $W/41.txt | grep -q . && { echo "FAIL 41 printed a line without the cf: prefix"; fail=1; }; return $rc; }
run67() { bash tools/ops/tasks/67-mail-env.sh > $W/67.txt 2>&1; rc=$?; sed 's/^/    /' $W/67.txt; noleak $W/67.txt 67; return $rc; }
envget() { grep -m1 "^$1=" $W/deploy/.env.production | cut -d= -f2-; }
DNS_OK='[
 {"type":"TXT","name":"nabd.plus","content":"\"v=spf1 include:spf.brevo.com include:amazonses.com include:spf.mailjet.com ~all\""},
 {"type":"TXT","name":"nabd.plus","content":"\"brevo-code:aaaa\""},
 {"type":"TXT","name":"_dmarc.nabd.plus","content":"\"v=DMARC1; p=none\""},
 {"type":"TXT","name":"resend._domainkey.nabd.plus","content":"\"p=MIGfMA0rehearsal\""},
 {"type":"TXT","name":"send.nabd.plus","content":"\"v=spf1 include:amazonses.com ~all\""},
 {"type":"MX","name":"send.nabd.plus","content":"feedback-smtp.eu-west-1.amazonses.com"},
 {"type":"CNAME","name":"brevo1._domainkey.nabd.plus","content":"b1.nabd-plus.dkim.brevo.com"},
 {"type":"CNAME","name":"brevo2._domainkey.nabd.plus","content":"b2.nabd-plus.dkim.brevo.com"},
 {"type":"TXT","name":"mailjet._domainkey.nabd.plus","content":"\"k=rsa; p=MIIBrehearsal\""},
 {"type":"A","name":"nabd.plus","content":"192.0.2.1"}]'
BREVO_OK='{"domain_name":"nabd.plus","verified":true,"authenticated":true,"dns_records":{"dkim_record":{"type":"CNAME","host_name":"brevo1._domainkey","status":true},"brevo_code":{"type":"TXT","host_name":"@","status":true},"dmarc_record":{"type":"TXT","host_name":"_dmarc","status":true}}}'
MJ_OK='{"ID":42,"Domain":"nabd.plus","DKIMStatus":"OK","SPFStatus":"OK"}'
RS_OK='{"id":"rs1","name":"nabd.plus","status":"verified","region":"eu-west-1","records":[{"record":"SPF","type":"MX","name":"send","status":"verified","value":"feedback-smtp.eu-west-1.amazonses.com"},{"record":"DKIM","type":"TXT","name":"resend._domainkey","status":"verified","value":"p=MIGf"}]}'

mkdir -p $W/deploy
printf 'NODE_ENV=production\nRESEND_API_KEY=re_rehearsal_resend_0004\nMAIL_FROM=Nabd Plus <no-reply@nabd.plus>\nSES_SMTP_HOST=email-smtp.eu-west-1.amazonaws.com\nJWT_SECRET=keep-me\n' > $W/deploy/.env.production
chmod 600 $W/deploy/.env.production

echo "== A: production shape"
seed "{\"dns\":$DNS_OK,\"brevo\":$BREVO_OK,\"mailjet\":$MJ_OK,\"resend\":$RS_OK}"
run41; expect "A 41 exit" $? 0
grep -q '^cf: mail spf records on nabd.plus: 1$' $W/41.txt; expect "A one SPF record" $? 0
grep -q '^cf: mail OK' $W/41.txt; expect "A 41 OK line" $? 0
grep -q '^cf: mail dns TXT _dmarc.nabd.plus (DMARC)$' $W/41.txt; expect "A DMARC listed by name" $? 0
grep -q '^cf: mail dns A ' $W/41.txt; expect "A unrelated records not listed" $? 1
printf 'BREVO_API_KEY=%s\nMAILJET_API_KEY=%s\nMAILJET_SECRET_KEY=%s\n' "$BREVO_API_KEY" "$MAILJET_API_KEY" "$MAILJET_SECRET_KEY" > $W/ops-mail.env
run67; expect "A 67 exit" $? 0
expect "A brevo key in env" "$(envget BREVO_API_KEY)" "$BREVO_API_KEY"
expect "A mailjet secret in env" "$(envget MAILJET_SECRET_KEY)" "$MAILJET_SECRET_KEY"
expect "A order" "$(envget MAIL_PROVIDER_ORDER)" resend,brevo,mailjet
expect "A alert e-mail set when missing" "$(envget OPS_ALERT_EMAIL)" obaid08642@gmail.com
grep -q '^mail: env present: RESEND_API_KEY BREVO_API_KEY MAILJET_API_KEY MAILJET_SECRET_KEY MAIL_FROM OPS_ALERT_EMAIL$' $W/67.txt; expect "A every needed name present" $? 0
expect "A quotas" "$(envget RESEND_DAILY_QUOTA)/$(envget RESEND_MONTHLY_QUOTA) $(envget BREVO_DAILY_QUOTA) $(envget MAILJET_DAILY_QUOTA)/$(envget MAILJET_MONTHLY_QUOTA)" "100/3000 300 200/6000"
expect "A no SMTP relay names (Brevo uses its REST API)" "$(envget BREVO_SMTP_HOST)" ""
expect "A other lines kept" "$(envget JWT_SECRET) $(envget RESEND_API_KEY)" "keep-me re_rehearsal_resend_0004"
expect "A env mode 600" "$(stat -c %a $W/deploy/.env.production)" 600
expect "A key file shredded" "$(test -e $W/ops-mail.env; echo $?)" 1
expect "A one env copy kept" "$(ls $W/backups | grep -c env-pre-mail)" 1
grep -q '^mail: env note: SES names still in the env (SES_SMTP_HOST)' $W/67.txt; expect "A SES left unused and named" $? 0
grep -q '^mail: resend: domain nabd.plus status=verified' $W/67.txt; expect "A resend verified" $? 0
grep -q '^mail: resend:   DKIM TXT resend._domainkey status=verified$' $W/67.txt; expect "A resend records without values" $? 0
grep -q 'p=MIGf\|feedback-smtp' $W/67.txt; expect "A no record values printed" $? 1
cp $W/deploy/.env.production $W/env-after-a
run67; expect "A second 67 exit" $? 0
grep -q '^mail: env names set: none$' $W/67.txt; expect "A second 67 sets nothing" $? 0
cmp -s $W/deploy/.env.production $W/env-after-a; expect "A second 67 leaves the env as it was" $? 0
expect "A second 67 keeps no extra copy" "$(ls $W/backups | grep -c env-pre-mail)" 1

echo "== B: two SPF records, Mailjet DKIM missing, Brevo authenticated only after asking again"
B_DNS=$(echo "$DNS_OK" | jq -c 'map(select(.name != "mailjet._domainkey.nabd.plus")) + [{"type":"TXT","name":"nabd.plus","content":"\"v=spf1 include:spf.mailjet.com ~all\""}]')
B_BREVO=$(echo "$BREVO_OK" | jq -c '.authenticated=false | .verified=false | .fix_on_check=true | .dns_records.dkim_record.status=false')
seed "{\"dns\":$B_DNS,\"brevo\":$B_BREVO,\"mailjet\":$(echo "$MJ_OK" | jq -c '.DKIMStatus="Not Checked" | .fix_on_check=false'),\"resend\":$RS_OK}"
run41; expect "B 41 exit" $? 1
grep -q '^cf: mail NOT OK: 2 SPF records on nabd.plus' $W/41.txt; expect "B two SPF records named" $? 0
grep -q '^cf: mail dkim mailjet: MISSING$' $W/41.txt; expect "B missing Mailjet DKIM named" $? 0
grep -q '^cf: mail brevo: authentication asked again$' $W/41.txt; expect "B Brevo asked again" $? 0
grep -q '^cf: mail brevo: domain verified=true authenticated=true$' $W/41.txt; expect "B Brevo authenticated after asking" $? 0
grep -q '^cf: mail mailjet: check run again$' $W/41.txt; expect "B Mailjet checked again" $? 0
grep -q '^cf: mail mailjet: domain dkim=Not Checked spf=OK$' $W/41.txt; expect "B Mailjet state reported" $? 0

echo "== C: no key file, Resend pending"
seed "{\"dns\":$DNS_OK,\"brevo\":$BREVO_OK,\"mailjet\":$MJ_OK,\"resend\":$(echo "$RS_OK" | jq -c '.status="pending"')}"
run67; expect "C 67 exit" $? 0
grep -q '^mail: no key file' $W/67.txt; expect "C no key file reported" $? 0
expect "C keys kept" "$(envget BREVO_API_KEY)" "$BREVO_API_KEY"
grep -q '^mail: resend: verification asked again$' $W/67.txt; expect "C Resend asked again" $? 0
expect "C Resend verify called once" "$(curl -s $M/_mail | jq -r .result.resend.checks)" 1

echo "== D: secrets not passed to the step"
( unset BREVO_API_KEY MAILJET_API_KEY MAILJET_SECRET_KEY; bash tools/ops/cf/41-mail-verify.sh > $W/41.txt 2>&1 ); expect "D 41 exit" $? 1
grep -q '^cf: mail brevo: BLOCKED secret BREVO_API_KEY not passed' $W/41.txt; expect "D Brevo blocked named" $? 0

[ $fail = 0 ] && echo "mail rehearsal: PASS" || { echo "mail rehearsal: FAIL"; exit 1; }
