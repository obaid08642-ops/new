"""Software passkey for the live gate's synthetic admin (admin@nabd.test only).

The admin dashboard asks for a fresh passkey assertion before every @StepUp
action (R23). A real browser uses a platform authenticator; the live journeys
use this one: a fixed P-256 test key derived from a public seed (synthetic test
data, never a real credential), enrolled through POST /auth/passkey/enroll/*,
and an assertion signed for each step-up ceremony (options -> sign -> issue).
"""
import base64, hashlib, json, struct, time

_last_counter = [0]


def _next_counter():
    # Strictly increasing, as the verifier requires: centiseconds since
    # 2026-01-01 (fits 32 bits for ~16 months), never repeating inside one
    # process even when two ceremonies land in the same tick.
    c = max(int((time.time() - 1767225600) * 100), _last_counter[0] + 1)
    _last_counter[0] = c
    return c

from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import ec

ORIGIN = 'http://localhost:3001'   # WEBAUTHN_ORIGIN set by tools/live/start-backend.sh
RP_ID = 'localhost'
_SEED = hashlib.sha256(b'nabd-live-gate-synthetic-passkey-v1').digest()
_KEY = ec.derive_private_key(int.from_bytes(_SEED, 'big') % (2**256 - 2**224 - 1) or 1, ec.SECP256R1())
CRED_ID = hashlib.sha256(_SEED + b'cred').digest()[:16]
# A second synthetic key for the browser's virtual authenticator (j_admin_clicks):
# CDP sign counters are int32, so it cannot share the time-based counter above.
_SEED_BROWSER = hashlib.sha256(b'nabd-live-gate-synthetic-passkey-browser-v1').digest()
_KEY_BROWSER = ec.derive_private_key(int.from_bytes(_SEED_BROWSER, 'big') % (2**256 - 2**224 - 1) or 1, ec.SECP256R1())
CRED_ID_BROWSER = hashlib.sha256(_SEED_BROWSER + b'cred').digest()[:16]


def synthetic_key(label):
    """Another fixed synthetic key + credential id (credential ids are unique per account)."""
    seed = hashlib.sha256(b'nabd-live-gate-synthetic-passkey-' + label.encode()).digest()
    return ec.derive_private_key(int.from_bytes(seed, 'big') % (2**256 - 2**224 - 1) or 1, ec.SECP256R1()), hashlib.sha256(seed + b'cred').digest()[:16]


def b64u(b):
    return base64.urlsafe_b64encode(b).rstrip(b'=').decode()


def _cbor(v):
    """Minimal CBOR encoder (ints, bytes, text, maps) for the COSE key and attestation object."""
    def head(major, n):
        if n < 24:
            return bytes([major << 5 | n])
        for ai, fmt in ((24, '>B'), (25, '>H'), (26, '>I'), (27, '>Q')):
            if n < 1 << (8 * struct.calcsize(fmt)):
                return bytes([major << 5 | ai]) + struct.pack(fmt, n)
    if isinstance(v, bool):
        return b'\xf5' if v else b'\xf4'
    if isinstance(v, int):
        return head(0, v) if v >= 0 else head(1, -1 - v)
    if isinstance(v, bytes):
        return head(2, len(v)) + v
    if isinstance(v, str):
        e = v.encode()
        return head(3, len(e)) + e
    if isinstance(v, dict):
        return head(5, len(v)) + b''.join(_cbor(k) + _cbor(x) for k, x in v.items())
    raise TypeError(type(v))


def _client_data(kind, challenge):
    return json.dumps({'type': kind, 'challenge': challenge, 'origin': ORIGIN, 'crossOrigin': False}, separators=(',', ':')).encode()


def registration(options, key=None, cred_id=None):
    """RegistrationResponseJSON for POST /auth/passkey/enroll/verify."""
    key, CRED_ID = key or _KEY, cred_id or globals()['CRED_ID']
    nums = key.public_key().public_numbers()
    cose = _cbor({1: 2, 3: -7, -1: 1, -2: nums.x.to_bytes(32, 'big'), -3: nums.y.to_bytes(32, 'big')})
    auth = hashlib.sha256(RP_ID.encode()).digest() + bytes([0x45]) + struct.pack('>I', 0) + b'\x00' * 16 + struct.pack('>H', len(CRED_ID)) + CRED_ID + cose
    cd = _client_data('webauthn.create', options['challenge'])
    att = _cbor({'fmt': 'none', 'attStmt': {}, 'authData': auth})
    return {'id': b64u(CRED_ID), 'rawId': b64u(CRED_ID), 'type': 'public-key', 'clientExtensionResults': {},
            'response': {'clientDataJSON': b64u(cd), 'attestationObject': b64u(att), 'transports': ['internal']}}


def assertion(options, key=None, cred_id=None):
    """AuthenticationResponseJSON for a step-up (or passkey login) challenge."""
    key, CRED_ID = key or _KEY, cred_id or globals()['CRED_ID']
    counter = _next_counter()
    auth = hashlib.sha256(RP_ID.encode()).digest() + bytes([0x05]) + struct.pack('>I', counter)
    cd = _client_data('webauthn.get', options['challenge'])
    sig = key.sign(auth + hashlib.sha256(cd).digest(), ec.ECDSA(hashes.SHA256()))
    return {'id': b64u(CRED_ID), 'rawId': b64u(CRED_ID), 'type': 'public-key', 'clientExtensionResults': {},
            'response': {'clientDataJSON': b64u(cd), 'authenticatorData': b64u(auth), 'signature': b64u(sig), 'userHandle': None}}


def ensure_enrolled(post, get, browser=False):
    """Enroll the synthetic key (or the browser's) for the signed-in admin once (idempotent across runs)."""
    key, cred = (_KEY_BROWSER, CRED_ID_BROWSER) if browser else (_KEY, CRED_ID)
    devices = get('/auth/passkey/devices')
    rows = devices.body if isinstance(devices.body, list) else (devices.body or {}).get('data', []) if isinstance(devices.body, dict) else []
    if any(str(d.get('credential_id')) == b64u(cred) for d in rows if isinstance(d, dict)):
        return True
    opts = post('/auth/passkey/enroll/options', {})
    if not opts.ok:
        return False
    r = post('/auth/passkey/enroll/verify', {'response': registration(opts.body, key, cred),
                                             'device_name': 'live-gate browser key' if browser else 'live-gate software key'})
    return r.ok


def step_up_token(post, action):
    """options -> sign -> issue: a single-use token for `METHOD:/api/v1/...`."""
    opts = post('/auth/step-up/options', {})
    if not opts.ok:
        return None
    r = post('/auth/step-up/issue', {'action': action, 'response': assertion(opts.body.get('options', opts.body))})
    return r.body.get('token') if r.ok and isinstance(r.body, dict) else None


def add_virtual_authenticator(context, page):
    """Give a Playwright Chromium page a WebAuthn virtual authenticator holding
    the browser's synthetic credential (enroll it first: ensure_enrolled(..., browser=True)), so the dashboard's own passkey login and step-up
    prompts run in the browser exactly as with a real platform authenticator."""
    from cryptography.hazmat.primitives import serialization
    cdp = context.new_cdp_session(page)
    cdp.send('WebAuthn.enable')
    auth = cdp.send('WebAuthn.addVirtualAuthenticator', {'options': {
        'protocol': 'ctap2', 'transport': 'internal', 'hasResidentKey': True,
        'hasUserVerification': True, 'isUserVerified': True, 'automaticPresenceSimulation': True}})
    pkcs8 = _KEY_BROWSER.private_bytes(serialization.Encoding.DER, serialization.PrivateFormat.PKCS8, serialization.NoEncryption())
    # int32 counter that still rises across runs: deciseconds since 2026-01-01.
    cdp.send('WebAuthn.addCredential', {'authenticatorId': auth['authenticatorId'], 'credential': {
        'credentialId': base64.b64encode(CRED_ID_BROWSER).decode(), 'isResidentCredential': False, 'rpId': RP_ID,
        'privateKey': base64.b64encode(pkcs8).decode(), 'signCount': int((time.time() - 1767225600) * 10)}})
    return cdp
