"""Setup of the patient_chat flow: the doctor of one of the seeded patient's appointments writes a message through the real provider API.

  python3 tools/native/setup/patient_chat.py /tmp/native/accounts.json "<message>"

Reads the accounts seed.py wrote (the patient and every approved doctor), signs the patient in, lists the patient's appointments, and for
each doctor looks for the appointment whose chat that doctor can open (GET /provider/chat/appointment/:id, the endpoint the provider app's
PreVisitChatScreen uses); then posts the message with POST /provider/chat/send (the same call as tools/live/j_chat.py). Prints one JSON line
{"APPT_ID": "<appointment id>"} that run_job.sh / run_job_ios.sh hand to Maestro as -e variables. Test backend only (NABD_API).
"""
import json, os, sys, urllib.request, urllib.error, uuid

BASE = os.environ.get('NABD_API', 'http://127.0.0.1:8002/api/v1')


def call(method, path, body=None, token=None):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    if method != 'GET':
        headers['Idempotency-Key'] = str(uuid.uuid4())
    req = urllib.request.Request(BASE + path, data=None if body is None else json.dumps(body).encode(), headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            raw = r.read().decode() or 'null'
            return r.status, json.loads(raw)
    except urllib.error.HTTPError as e:
        raw = e.read().decode() or 'null'
        try:
            return e.code, json.loads(raw)
        except ValueError:
            return e.code, raw


def rows(body):
    if isinstance(body, list):
        return body
    if isinstance(body, dict):
        for key in ('items', 'data', 'appointments'):
            if isinstance(body.get(key), list):
                return body[key]
            if isinstance(body.get(key), dict):
                inner = rows(body[key])
                if inner:
                    return inner
    return []


def fail(msg):
    print(msg, file=sys.stderr)
    sys.exit(1)


def main():
    accounts = json.load(open(sys.argv[1]))
    message = sys.argv[2]
    patient = accounts['patient']
    status, body = call('POST', '/auth/login', {'identifier': patient['email'], 'password': patient['password']})
    token = (body or {}).get('token') if isinstance(body, dict) else None
    token = token.get('accessToken') if isinstance(token, dict) else token
    if status >= 300 or not token:
        fail(f'patient sign-in failed: {status} {str(body)[:200]}')
    status, body = call('GET', '/care/appointments', token=token)
    appointments = [a.get('id') for a in rows(body) if isinstance(a, dict) and a.get('id')]
    if status >= 300 or not appointments:
        fail(f'the seeded patient has no appointments: {status} {str(body)[:200]}')
    doctors = accounts.get('doctors') or ([accounts['providers']['doctor']] if 'doctor' in accounts.get('providers', {}) else [])
    for doctor in doctors:
        status, body = call('POST', '/provider/auth/login', {'email': doctor['email'], 'password': doctor['password']})
        provider_token = (body or {}).get('access_token') if isinstance(body, dict) else None
        if status >= 300 or not provider_token:
            continue
        for appointment_id in appointments:
            status, body = call('GET', f'/provider/chat/appointment/{appointment_id}', token=provider_token)
            if status >= 300 or not isinstance(body, dict) or not body.get('thread_id'):
                continue
            status, body = call('POST', '/provider/chat/send', {'appointment_id': appointment_id, 'message': message}, token=provider_token)
            if status >= 300:
                fail(f'the doctor could not post to appointment {appointment_id}: {status} {str(body)[:200]}')
            print(json.dumps({'APPT_ID': appointment_id}))
            return
    fail(f'no seeded doctor has a chat thread with an appointment of the patient ({len(doctors)} doctors, {len(appointments)} appointments)')


main()
