"""Journey (19.7): a patient saves an address by its Saudi National Address short code (patient-app picker, patient-web address book).
GET /national-address/lookup?code=  ->  POST/PATCH /users/me/addresses {short_address}  ->  it travels with a nursing booking.
Saudi Post is stood in for by tools/live/fake_spl.py (RRRD2929 and JEDA1234 exist)."""
import uuid
from lib import Client, journey, step
import j_accounts

GOOD = 'RRRD2929'


def rows(r):
    return r.body if isinstance(r.body, list) else r.items()


def run(pat):
    journey('national address: look a short code up')
    r = pat.get(f'/national-address/lookup?code={GOOD}')
    step('a known code returns the address from Saudi Post', r.ok and r.get('city') == 'Riyadh' and r.get('post_code') == '12611'
         and r.get('building_number') == '8228' and r.get('short_address') == GOOD and abs(float(r.get('lat') or 0) - 24.6908) < 1e-6, r)
    r = pat.get('/national-address/lookup?code=rrrd%202929')
    step('the code may be typed in lower case with a space', r.ok and r.get('short_address') == GOOD, r)
    r = pat.get('/national-address/lookup?code=not-a-code')
    step('a malformed code is refused (400 short_address_invalid)', r.status == 400 and 'short_address_invalid' in str(r.body), r)
    r = pat.get('/national-address/lookup?code=ZZZZ0000')
    step('a well-formed code Saudi Post does not know is 404 short_address_not_found', r.status == 404 and 'short_address_not_found' in str(r.body), r)
    r = Client(None, 'anon').get(f'/national-address/lookup?code={GOOD}')
    step('the lookup needs a signed-in user', r.status in (401, 403), r)

    journey('national address: save an address with only its short code')
    r = pat.post('/users/me/addresses', {'label': 'Home', 'short_address': 'rrrd 2929'})
    aid = r.get('id')
    step('a code alone is enough to add an address', r.ok and aid, r)
    mine = next((a for a in rows(pat.get('/users/me/addresses')) if a.get('id') == aid), {})
    step('the saved address is filled in from Saudi Post and marked verified',
         mine.get('short_address') == GOOD and mine.get('national_address_verified') is True and mine.get('city') == 'Riyadh'
         and mine.get('street') == 'King Fahd Road' and mine.get('post_code') == '12611' and mine.get('building_number') == '8228'
         and mine.get('additional_number') == '2929' and abs(float(mine.get('lat') or 0) - 24.6908) < 1e-6, mine)

    r = pat.post('/users/me/addresses', {'label': 'Nowhere', 'short_address': 'ZZZZ0000', 'street': 'Typed street'})
    step('a code Saudi Post does not know is refused, and nothing is saved', r.status == 400 and 'short_address_not_found' in str(r.body), r)
    r = pat.post('/users/me/addresses', {'label': 'Bad', 'short_address': 'nope', 'street': 'Typed street'})
    step('a malformed code is refused when saving', r.status == 400 and 'short_address_invalid' in str(r.body), r)
    step('only the one good address exists', len(rows(pat.get('/users/me/addresses'))) == 1, rows(pat.get('/users/me/addresses')))

    r = pat.post('/users/me/addresses', {'label': 'Typed', 'short_address': GOOD, 'street': 'My own street', 'city': 'Jeddah', 'lat': 21.5, 'lng': 39.2})
    typed = next((a for a in rows(pat.get('/users/me/addresses')) if a.get('id') == r.get('id')), {})
    step('what the patient typed stays; Saudi Post owns the building and post code',
         typed.get('street') == 'My own street' and typed.get('city') == 'Jeddah' and typed.get('lat') == 21.5 and typed.get('post_code') == '12611', typed)

    journey('national address: change and clear the code')
    r = pat.patch(f'/users/me/addresses/{aid}', {'short_address': 'JEDA1234'})
    step('a new code is looked up again', r.ok, r)
    mine = next((a for a in rows(pat.get('/users/me/addresses')) if a.get('id') == aid), {})
    step('the building and post code now come from the new code', mine.get('short_address') == 'JEDA1234' and mine.get('post_code') == '23434' and mine.get('building_number') == '3011', mine)
    r = pat.patch(f'/users/me/addresses/{aid}', {'short_address': ''})
    mine = next((a for a in rows(pat.get('/users/me/addresses')) if a.get('id') == aid), {})
    step('an empty code removes it and its verification', r.ok and not mine.get('short_address') and not mine.get('national_address_verified'), mine)
    r = pat.patch(f'/users/me/addresses/{aid}', {'short_address': 'nope'})
    step('a malformed code is refused when editing', r.status == 400 and 'short_address_invalid' in str(r.body), r)


if __name__ == '__main__':
    from lib import summary
    acct = j_accounts.app_signup(label='national-address')
    run(Client(acct['token'], 'patient'))
    summary()
