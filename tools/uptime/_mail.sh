# Mail helpers shared by external-uptime.sh and auto-reboot.sh (sourced, not run). The sourcing script defines say(). Providers in order: Resend, Brevo, Mailjet;
# secrets by NAME from the environment; UPTIME_MAIL_CMD replaces the providers in tests.
mail_json() { # provider subject body
  python3 - "$1" "${MAIL_FROM:-}" "${OPS_ALERT_EMAIL:-}" "$2" "$3" <<'PY'
import json, sys
from email.utils import parseaddr
provider, sender, to, subject, text = sys.argv[1:6]
name, addr = parseaddr(sender)
if provider == "resend":
    print(json.dumps({"from": sender, "to": [to], "subject": subject, "text": text}))
elif provider == "brevo":
    print(json.dumps({"sender": {"email": addr, **({"name": name} if name else {})}, "to": [{"email": to}], "subject": subject, "textContent": text}))
else:
    print(json.dumps({"Messages": [{"From": {"Email": addr, **({"Name": name} if name else {})}, "To": [{"Email": to}], "Subject": subject, "TextPart": text}]}))
PY
}
mail_via() { # provider subject body -> 0 sent, 1 failed, 2 not configured
  local code url
  case "$1" in
    resend) [ -n "${RESEND_API_KEY:-}" ] || return 2; url=${UPTIME_RESEND_URL:-https://api.resend.com/emails}
      code=$(mail_json resend "$2" "$3" | curl -s -o /dev/null -w '%{http_code}' --max-time 20 -X POST "$url" -H "Authorization: Bearer $RESEND_API_KEY" -H 'Content-Type: application/json' --data @-) ;;
    brevo) [ -n "${BREVO_API_KEY:-}" ] || return 2; url=${UPTIME_BREVO_URL:-https://api.brevo.com/v3/smtp/email}
      code=$(mail_json brevo "$2" "$3" | curl -s -o /dev/null -w '%{http_code}' --max-time 20 -X POST "$url" -H "api-key: $BREVO_API_KEY" -H 'Content-Type: application/json' --data @-) ;;
    mailjet) { [ -n "${MAILJET_API_KEY:-}" ] && [ -n "${MAILJET_SECRET_KEY:-}" ]; } || return 2; url=${UPTIME_MAILJET_URL:-https://api.mailjet.com/v3.1/send}
      code=$(mail_json mailjet "$2" "$3" | curl -s -o /dev/null -w '%{http_code}' --max-time 20 -X POST "$url" -u "$MAILJET_API_KEY:$MAILJET_SECRET_KEY" -H 'Content-Type: application/json' --data @-) ;;
  esac
  case "$code" in 20?) return 0 ;; *) say "mail via $1 failed (HTTP ${code:-none})"; return 1 ;; esac
}
send_mail() { # subject body
  if [ -n "${UPTIME_MAIL_CMD:-}" ]; then printf 'SUBJECT: %s\n%s\n' "$1" "$2" | $UPTIME_MAIL_CMD; return 0; fi
  [ -n "${OPS_ALERT_EMAIL:-}" ] && [ -n "${MAIL_FROM:-}" ] || { say "MAIL NOT SENT: the repository secrets OPS_ALERT_EMAIL and MAIL_FROM are not both set"; return 1; }
  local p r any=0
  for p in resend brevo mailjet; do
    mail_via "$p" "$1" "$2"; r=$?
    [ $r = 0 ] && { say "mail sent via $p"; return 0; }
    [ $r = 1 ] && any=1
  done
  [ $any = 0 ] && say "MAIL NOT SENT: no provider key is set (RESEND_API_KEY, BREVO_API_KEY, MAILJET_API_KEY + MAILJET_SECRET_KEY)"
  return 1
}
