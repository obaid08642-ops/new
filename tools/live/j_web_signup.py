"""Journey (patient-web BFF): sign-up works once the admin has published the patient texts (issue 432, D-38).
  The web form sends the box the person ticked; the website's server attaches the CURRENT patient_terms and
  privacy_policy versions (GET /legal/policies), so a new policy version never breaks sign-up. Also: asking for a
  sign-up code for an address that already has an account is refused at once (issue 413).
  Stack: backend :8002, admin BFF :3001, patient-web :3100 (PATIENT_WEB_PORT=3100 tools/live/start-web.sh).
"""
import os
import uuid

from lib import Client, WebClient, journey, step

WEB = os.environ.get('NABD_WEB_JOURNEYS_URL', 'http://127.0.0.1:3100')


def main():
    import j_admin, j_accounts
    admin, _ = j_admin.login()
    journey('web sign-up: the admin publishes the patient texts (legal policies page)')
    for key, ar, en in (('patient_terms', 'شروط استخدام المريض', 'Patient terms'), ('privacy_policy', 'سياسة الخصوصية', 'Privacy policy')):
        r = admin.put(f'/admin/admin/legal/policy/{key}', {'title_ar': ar, 'title_en': en, 'content_ar': f'{ar} — نص الاختبار الحي {uuid.uuid4().hex[:6]}',
                                                           'content_en': f'{en} — live gate text', 'requires_acceptance': True, 'change_note': 'live gate'})
        step(f'admin publishes {key}', r.ok, r)
    r = Client().get('/legal/policies')
    keys = {p.get('key'): p.get('version') for p in (r.body if isinstance(r.body, list) else r.items())}
    step('the public policy list names both texts with a version', r.ok and keys.get('patient_terms') and keys.get('privacy_policy'), keys)

    journey('web sign-up: the form registers a new patient through the website')
    email = f'web-signup-{uuid.uuid4().hex[:8]}@nabd.test'
    form = {'name': 'اختبار تسجيل الويب', 'identifier': email, 'password': 'Str0ng!Pass-web', 'locale': 'ar',
            'consents': [{'policy_id': 'terms', 'version': 'v1'}, {'policy_id': 'privacy', 'version': 'v1'}]}  # register-form.tsx
    r = WebClient(WEB).post('/api/auth/register', form)
    step('the website creates the account with the current texts accepted (201 registered)', r.status == 201 and r.get('registered') is True, r)

    journey('sign-up code for an address that already has an account (issue 413)')
    acct = j_accounts.app_signup(label='already-registered')
    r = Client().post('/auth/send-otp', {'email': acct['email'], 'purpose': 'register'})
    step('the sign-up code request says the account exists (409 identifier_already_registered)',
         r.status == 409 and 'identifier_already_registered' in str(r.body), r)


if __name__ == '__main__':
    from lib import summary
    main()
    summary()
