"""Journey (scenario PT-31, language switch): the patient changes the app language (PATCH /users/me {locale}), the new
language reads back on the profile, an unsupported language is refused (400 invalid_locale), and the old one is restored.
  Supported: ar, en, ur, hi, bn, fil (users.service.ts).
  Stack: backend :8002. TEST database only.
"""
from lib import Client, journey, step, summary


def run():
    import j_accounts
    pat = Client(j_accounts.app_signup(label='settings-language')['token'], 'patient')
    start = (pat.get('/users/me/display').body or {}).get('locale') or 'ar'

    journey('language switch: the patient changes the language (PT-31)')
    r = pat.patch('/users/me', {'locale': 'en'})
    step('the patient switches to English (PATCH /users/me)', r.ok, r)
    step('English reads back on the display profile', (pat.get('/users/me/display').body or {}).get('locale') == 'en', pat.get('/users/me/display').body)

    journey('language switch: an unsupported language is refused (PT-31)')
    r = pat.patch('/users/me', {'locale': 'xx'})
    step('an unsupported language is refused (400 invalid_locale)', r.status == 400 and 'invalid_locale' in str(r.body), r)

    journey('language switch: the previous language is restored (PT-31)')
    pat.patch('/users/me', {'locale': start if start in ('ar', 'en', 'ur', 'hi', 'bn', 'fil') else 'ar'})
    step('the previous language reads back again', (pat.get('/users/me/display').body or {}).get('locale') == (start if start in ('ar', 'en', 'ur', 'hi', 'bn', 'fil') else 'ar'), '')
    summary()


if __name__ == '__main__':
    run()
