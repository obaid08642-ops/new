"""Journey (backend): the one contact phone and the address at checkout, and the cash-on-delivery rules (21.5).

  1. POST /auth/checkout-contact takes one phone field in every format a patient types (05…, 5…, +9665…, 009665…, Arabic
     digits) and answers the E.164 number plus the formatted form for "is this right?"; a bad number is refused (400).
  2. The address lands in the profile's address book (GET /users/me/addresses), once however often it is sent.
  3. GET /auth/checkout-contact/cash-limits shows the limits for an unverified phone (a new account is not verified).
  4. A new patient cannot register cash on delivery on an order that was never selected (no mock success), and the
     phone is still unverified after saving the contact (only a confirmed channel marks it).
  Stack: backend :8002. TEST database only.
"""
from lib import Client, journey, step, summary
import j_accounts

FORMATS = ['0501234567', '501234567', '+966501234567', '00966501234567', '٠٥٠١٢٣٤٥٦٧', '+٩٦٦٥٠١٢٣٤٥٦٧', '050 123 4567']


def run():
    journey('checkout contact: sign up')
    p = j_accounts.app_signup(label='contact')
    pat = Client(p['token'], 'patient')

    journey('checkout contact: one phone field, every format')
    for raw in FORMATS:
        r = pat.post('/auth/checkout-contact', {'phone': raw})
        e164 = ((r.get('phone') or {}) if isinstance(r.get('phone'), dict) else {}).get('e164')
        step(f'{raw!r} -> +966501234567', r.ok and e164 == '+966501234567', r)
    r = pat.post('/auth/checkout-contact', {'phone': '0501234567'})
    step('the answer carries the formatted number to confirm', (r.get('phone') or {}).get('display') == '+966 50 123 4567', r)
    step('the phone is not verified by saving it', r.get('phone_verified') is False, r)
    for bad in ['12345', 'abc', '+9665']:
        r = pat.post('/auth/checkout-contact', {'phone': bad})
        step(f'{bad!r} is refused (400 contact_phone_invalid)', r.status == 400 and 'contact_phone_invalid' in str(r.body), r)

    journey('checkout contact: the address goes to the profile once')
    line = 'الرياض، العليا، شارع التخصصي 12'
    for _ in range(2):
        r = pat.post('/auth/checkout-contact', {'phone': '0501234567', 'address': line})
        step('contact with an address saved', r.ok and r.get('address_stored') is True, r)
    r = pat.get('/users/me/addresses')
    rows = [a for a in (r.body if isinstance(r.body, list) else r.items()) if (a.get('street') or a.get('line1')) == line]
    step('the address book holds the line exactly once, with street and line1', r.ok and len(rows) == 1 and rows[0].get('line1') == line, r)

    journey('checkout contact: cash on delivery limits for an unverified phone')
    r = pat.get('/auth/checkout-contact/cash-limits')
    step('limits are shown (value cap and open-order cap) and the phone is unverified',
         r.ok and r.get('phone_verified') is False and (r.get('limits') or {}).get('max_value', 0) > 0
         and (r.get('limits') or {}).get('max_open_orders', 0) > 0, r)
    r = pat.post('/patient/pharmacy/orders/not-an-order/cod/register', None, headers={'Idempotency-Key': 'live-contact-cod-0123456789'})
    step('cash on delivery on an order that does not exist is refused (404)', r.status == 404, r)


if __name__ == '__main__':
    run()
    raise SystemExit(1 if summary() else 0)
