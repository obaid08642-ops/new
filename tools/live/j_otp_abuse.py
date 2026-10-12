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
from lib import Client, journey, step, uniq

anon = Client()


def run():
    journey('otp abuse: pumping limits hold on the live stack')

    # 16.3 — a number from a country we do not serve never gets a code. This is
    # the first request on the IP, so the exact code is ours, not a throttle's.
    r = anon.post('/auth/otp/request', {'identifier': '+12025550143'})
    step('otp: country not served is refused (otp_country_not_served)',
         r.status == 429 and 'otp_country_not_served' in str(r.body), r)

    # 16.3 — a served country still works, so the refusal above is not simply a
    # broken endpoint.
    served = '+9665' + uniq('n')[-7:]
    r = anon.post('/auth/otp/request', {'identifier': served})
    step('otp: a served country is accepted', r.ok, r)

    # 16.3 — repeated asks for one number stop being served.
    target = '+9665' + uniq('m')[-7:]
    served_count = 0
    for i in range(1, 9):
        r = anon.post('/auth/otp/request', {'identifier': target})
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
        n = '+9665' + str(1000000 + i).zfill(7)
        r = anon.post('/auth/otp/request', {'identifier': n})
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
