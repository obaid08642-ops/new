"""Journey: mail provider rotation (owner spec 2026-10-16, PR #1583).
Starts tools/live/fake_mail.py (:9200) and two backends of this build (backend/dist) on :8012 and :8013, sharing one
fresh database, with Resend, Brevo and Mailjet keyed and pointed at the fake (RESEND_BASE_URL, BREVO_API_BASE,
MAILJET_API_BASE). The gate backend on :8002 is not touched.
  - the weekly keep-alive reaches OPS_ALERT_EMAIL once through each non-primary provider, never the primary, and not
    twice although both processes run the job every few seconds;
  - mail goes through this Riyadh month's primary ((year * 12 + month) mod 3), Brevo over its REST API with api-key;
  - the primary's daily quota is shared by both processes and survives a restart; when it is used up mail falls over
    to the next provider; when that one fails it falls over to the third and the last error is stored;
  - the counters are in mail_quota with the window start.
"""
import datetime
import json
import os
import signal
import subprocess
import time
import urllib.request

from lib import journey, step, summary

HERE = os.path.dirname(os.path.abspath(__file__))
BACKEND = os.path.join(HERE, '..', '..', 'backend')
FAKE = 'http://127.0.0.1:9200'
DB = f"nabd_mailrot_{int(time.time())}"
MONGO = os.environ.get('MONGO_URL', 'mongodb://127.0.0.1:27017/?replicaSet=rs0&directConnection=true')
ORDER = ['resend', 'brevo', 'mailjet']
OPS = 'ops-mailrot@nabd.test'
PRIMARY_QUOTA = 2
procs = {}


def http(method, url, body=None, headers=None):
    req = urllib.request.Request(url, method=method, data=json.dumps(body).encode() if body is not None else None,
                                 headers={'content-type': 'application/json', **(headers or {})})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, json.loads(r.read() or b'null')
    except urllib.error.HTTPError as e:
        return e.code, None


def node(script):
    """Runs a small mongoose script against the journey database (backend/node_modules, like seed_admin.js)."""
    code = ("const m=require('mongoose');(async()=>{await m.connect(process.env.MONGO_URL,{dbName:process.env.DB_NAME});"
            "const db=m.connection.db;const out=await (async()=>{" + script + "})();console.log(JSON.stringify(out));await m.disconnect();})()"
            ".catch(e=>{console.error(e);process.exit(1)})")
    r = subprocess.run(['node', '-e', code], cwd=BACKEND, capture_output=True, text=True, timeout=60,
                       env={**os.environ, 'MONGO_URL': MONGO, 'DB_NAME': DB})
    return json.loads(r.stdout.strip().splitlines()[-1]) if r.returncode == 0 and r.stdout.strip() else None


def start_backend(port, low_quota_for=None):
    env = {**os.environ, 'NODE_ENV': 'development', 'PORT': str(port), 'DB_NAME': DB, 'MONGO_URL': MONGO,
           'JWT_SECRET': os.environ.get('JWT_SECRET', 'live-test-secret-0123456789abcdef-0123456789'),
           'REDIS_URL': 'redis://127.0.0.1:6379', 'REDIS_HOST': '127.0.0.1', 'REDIS_PORT': '6379',
           'S3_ENDPOINT': 'http://127.0.0.1:9000', 'S3_BUCKET': 'nabd-live', 'S3_REGION': 'us-east-1',
           'S3_ACCESS_KEY_ID': 'live', 'S3_SECRET_ACCESS_KEY': 'live-secret',
           'DISABLE_RATE_LIMIT': 'true', 'THROTTLER_LIMIT': '1000000', 'OTP_ISSUE_LIMIT': '1000',
           'ADMIN_GATE_TOKEN': 'live-gate-token',
           'MAIL_PROVIDER_ORDER': ','.join(ORDER), 'MAIL_FROM': 'Nabd <no-reply@nabd.test>',
           'RESEND_API_KEY': 're_live_fake', 'RESEND_BASE_URL': f'{FAKE}/resend',
           'BREVO_API_KEY': 'xkeysib-live-fake', 'BREVO_API_BASE': f'{FAKE}/brevo/v3',
           'MAILJET_API_KEY': 'mj-pub', 'MAILJET_SECRET_KEY': 'mj-sec', 'MAILJET_API_BASE': f'{FAKE}/mailjet/v3.1',
           'OPS_ALERT_EMAIL': OPS, 'MAIL_KEEPALIVE_CRON': '*/3 * * * * *'}
    for p in ORDER:
        env.pop(f'{p.upper()}_MONTHLY_QUOTA', None)
        env[f'{p.upper()}_DAILY_QUOTA'] = str(PRIMARY_QUOTA) if p == low_quota_for else '50'
    for k in ('SES_SMTP_HOST', 'SES_SMTP_USER', 'SES_SMTP_PASS'):
        env.pop(k, None)
    procs[port] = subprocess.Popen(['node', '--max-old-space-size=900', 'dist/main.js'], cwd=BACKEND, env=env,
                                   stdout=open(f'/tmp/nabd-mailrot-{port}.log', 'w'), stderr=subprocess.STDOUT)
    for _ in range(90):
        try:
            if urllib.request.urlopen(f'http://127.0.0.1:{port}/api/v1/health/liveness', timeout=3).status == 200:
                return True
        except OSError:
            pass
        time.sleep(2)
    return False


def stop_backend(port):
    p = procs.pop(port, None)
    if p:
        p.send_signal(signal.SIGTERM)
        try:
            p.wait(15)
        except subprocess.TimeoutExpired:
            p.kill()


def forgot(port, email):
    # The reset route allows 3 requests per IP per 10 minutes; each request comes from its own (proxied) address.
    n = int(email.split('@')[0][-1])
    return http('POST', f'http://127.0.0.1:{port}/api/v1/auth/password/forgot', {'identifier': email},
                {'x-forwarded-for': f'10.77.{int(time.time()) % 250}.{n + 1}'})


def delivered(email, timeout=20):
    end = time.time() + timeout
    while time.time() < end:
        _, sent = http('GET', f'{FAKE}/__sent')
        hits = [s['provider'] for s in sent or [] if s.get('to') == email]
        if hits:
            return hits
        time.sleep(0.5)
    return []


def main():
    riyadh = datetime.datetime.utcnow() + datetime.timedelta(hours=3)
    primary = ORDER[(riyadh.year * 12 + riyadh.month - 1) % 3]
    second = ORDER[(ORDER.index(primary) + 1) % 3]
    third = ORDER[(ORDER.index(primary) + 2) % 3]
    fake = subprocess.Popen(['python3', os.path.join(HERE, 'fake_mail.py'), '9200'])
    time.sleep(1)
    try:
        journey(f'mail rotation: primary this Riyadh month is {primary}')
        users = [f'mailrot{i}@nabd.test' for i in range(6)]
        node("const now=new Date();await db.collection('users').insertMany(" + json.dumps(users) +
             ".map((e,i)=>({id:'mailrot-'+i+'-'+Date.now(),email:e,full_name:'Mail Rotation',role:'patient',active:true,is_verified:true,token_version:0,createdAt:now,updatedAt:now})));"
             "await db.collection('mail_quota').insertOne({_id:'boot',provider:'none'});return 1")
        a = start_backend(8012)
        b = start_backend(8013)
        step('two backends of this build start on one database', a and b, f'{a} {b}')
        if not (a and b):
            return

        journey('weekly keep-alive: once per non-primary provider, across two processes')
        time.sleep(15)
        _, sent = http('GET', f'{FAKE}/__sent')
        keep = sorted(s['provider'] for s in sent or [] if s.get('to') == OPS)
        step('each non-primary provider sent exactly one keep-alive, the primary none', keep == sorted([second, third]), keep)
        claims = node("return (await db.collection('mail_keepalive').find().toArray()).map(d=>[d._id,d.week,!!d.sent_at])")
        step('the keep-alive week is stored per provider', sorted(c[0] for c in claims or []) == sorted([second, third]), claims)

        journey('sends go through the primary; quota shared across processes and restarts')
        node(f"await db.collection('mail_quota').deleteOne({{_id:'boot'}});return 1")
        r1 = forgot(8012, users[0]); h1 = delivered(users[0])
        r2 = forgot(8013, users[1]); h2 = delivered(users[1])
        step('the first mail (process A) went through the primary', h1 == [primary], (r1, h1))
        step('the second mail (process B) went through the primary', h2 == [primary], (r2, h2))
        if primary == 'brevo' or second == 'brevo' or third == 'brevo':
            _, sent = http('GET', f'{FAKE}/__sent')
            step('Brevo was called over REST with its api-key', any(s['provider'] == 'brevo' and s['auth'] for s in sent or []), '')
        q = node(f"return await db.collection('mail_quota').findOne({{provider:'{primary}',window:'daily'}})")
        step('the primary daily counter is 2 in mail_quota with its window start', q and q.get('count') == 2 and q.get('window_start'), q)
        # Lower the primary daily quota to what is already used by restarting process A with quota 2 (the counter
        # survives the restart); then the next mail must fall over.
        stop_backend(8012)
        step('process A restarts (primary daily quota 2)', start_backend(8012, low_quota_for=primary), '')
        forgot(8012, users[2]); h3 = delivered(users[2])
        step('after the restart the used-up primary is skipped: the mail falls over to the next provider', h3 == [second], h3)

        journey('fall-over on failure')
        http('POST', f'{FAKE}/__mode', {'fail': [second]})
        forgot(8012, users[3]); h4 = delivered(users[3])
        step('with the next provider failing, the mail goes to the third', h4 == [third], h4)
        st = node(f"return await db.collection('mail_quota').findOne({{_id:'{second}:status'}})")
        step('the failing provider last error is stored for the admin page', st and 'http_500' in str(st.get('last_error')), st)
        http('POST', f'{FAKE}/__mode', {'fail': []})
    finally:
        for port in list(procs):
            stop_backend(port)
        fake.terminate()
        node("await db.dropDatabase();return 1")


if __name__ == '__main__':
    main()
    summary()
