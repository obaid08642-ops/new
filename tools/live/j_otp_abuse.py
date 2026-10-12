"""Journey: OTP abuse (Phase 16.3).

The Gate requires the OTP-abuse journey in the live gate. What it proves, and
what it deliberately does not claim:

  * the unserved-country refusal is proven by its exact code, because the first
    request reaches the guard before anything else can mask it;
  * repeated and fan-out traffic is proven to be *bounded* — the endpoint
    refuses rather than serving without limit.

The per-limit detail (5 per number, 20 numbers per IP, daily budget) is proven
by backend/src/common/otp-abuse.service.spec.ts, because /auth/otp/request also
carries a 3-per-10-min throttle: past the third request the endpoint answers 429
from the throttle, and this journey would be measuring the wrong thing if it
claimed otherwise.
"""
import random

from lib import Client, journey, step, uniq


def sa_mobile() -> str:
    """A valid Saudi mobile in E.164 (+9665 and 8 digits); uniq() has letters, which the guard rightly refuses."""
    return '+9665' + ''.join(random.choice('0123456789') for _ in range(8))

anon = Client()
# Its own caller address (RFC 5737 test range, a new one each run, the backend trusts the
# forwarded hop), so the throttle and the per-IP fan-out limit it measures start from zero
# and are not shared with the journeys that ran before it on 127.0.0.1.
CALLER = {'X-Forwarded-For': f'198.51.100.{random.randint(1, 254)}'}


def run():
    journey('otp abuse: pumping limits hold on the live stack')

    # 16.3 — a number from a country we do not serve never gets a code. This is
    # the first request on the IP, so the exact code is ours, not a throttle's.
    r = anon.post('/auth/otp/request', headers=CALLER, b={'identifier': '+12025550143'})
    step('otp: country not served is refused (otp_country_not_served)',
         r.status == 429 and 'otp_country_not_served' in str(r.body), r)

    # 16.3 — a served country still works, so the refusal above is not simply a
    # broken endpoint.
    served = sa_mobile()
    r = anon.post('/auth/otp/request', headers=CALLER, b={'identifier': served})
    # The journeys before this one share the caller's 3-per-10-min throttle on this
    # endpoint, so a 429 from the throttle is possible here. What this step proves is
    # that the allow-list does not refuse a served country: accepted, or throttled,
    # but never otp_country_not_served / otp_invalid_identifier.
    throttled = r.status == 429 and 'ThrottlerException' in str(r.body)
    step('otp: a served country is not refused by the allow-list', r.ok or throttled, r)

    # 16.3 — repeated asks for one number stop being served.
    target = sa_mobile()
    served_count = 0
    for i in range(1, 9):
        r = anon.post('/auth/otp/request', headers=CALLER, b={'identifier': target})
        if r.ok:
            served_count += 1
            continue
        step(f'otp: request {i} for one number is refused', r.status == 429, r)
        break
    else:
        step('otp: repeated requests for one number are refused', False,
             f'{served_count} requests were all served')
    step(f'otp: one number is served at most {served_count} times', served_count < 8, None)

    # 16.3 — one caller cannot fan out over many distinct numbers.
    fan_served = 0
    for i in range(1, 26):
        n = '+9665' + str(10000000 + i)  # 8 digits after 9665: a valid Saudi mobile
        r = anon.post('/auth/otp/request', headers=CALLER, b={'identifier': n})
        if r.ok:
            fan_served += 1
        else:
            step('otp: fan-out over many numbers from one caller is refused', r.status == 429, r)
            break
    else:
        step('otp: fan-out over many numbers from one caller is refused', False,
             'every distinct number was served')
    step(f'otp: fan-out served only {fan_served} distinct numbers', fan_served < 25, None)


if __name__ == '__main__':
    from lib import summary
    run()
    summary()
