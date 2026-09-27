"""Local SMTP sink for live tests: accepts any AUTH, stores every message as a JSON line.
   python3 tools/live/smtp_sink.py [port=2525] [out=/tmp/nabd-mail.jsonl]
Point the backend at it: SES_SMTP_HOST=127.0.0.1 SES_SMTP_PORT=2525 SES_SMTP_USER=x SES_SMTP_PASS=x"""
import sys, json, time, email
from email import policy
from aiosmtpd.controller import Controller
from aiosmtpd.smtp import AuthResult

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 2525
OUT = sys.argv[2] if len(sys.argv) > 2 else '/tmp/nabd-mail.jsonl'

class Handler:
    async def handle_DATA(self, server, session, envelope):
        msg = email.message_from_bytes(envelope.content, policy=policy.default)
        parts = [p.get_content() for p in msg.walk() if p.get_content_type() in ('text/plain', 'text/html')]
        with open(OUT, 'a', encoding='utf8') as f:
            f.write(json.dumps({'at': time.time(), 'to': envelope.rcpt_tos, 'subject': str(msg['subject']), 'body': '\n'.join(parts)}, ensure_ascii=False) + '\n')
        return '250 OK'

def accept_any(server, session, envelope, mechanism, auth_data):
    return AuthResult(success=True)

c = Controller(Handler(), hostname='127.0.0.1', port=PORT, authenticator=accept_any, auth_require_tls=False)
c.start()
print(f'smtp sink on {PORT} -> {OUT}', flush=True)
while True:
    time.sleep(3600)
