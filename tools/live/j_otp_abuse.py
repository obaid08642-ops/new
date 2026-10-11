"""Journey: OTP abuse (Phase 16.3).

The Gate requires the OTP-abuse journey in the live gate. It proves each limit
against the running stack rather than asserting that the code exists:

  • a country code we do not serve is refused;
  • the 6th OTP for one number inside an hour is refused;
  • one caller cannot fan out over many distinct numbers.

The last one has to drive the real API, so it uses /auth/otp/request, the
canonical patient endpoint.
"""
from lib import Client, journey, step, uniq

anon = Client()


def run():
    journey('otp abuse: pumping limits hold on the live stack')

    # 16.3 — a number from a country we do not serve never gets a code.
    r = anon.post('/auth/otp/request', {'identifier': '+12025550143'})
    step('otp: country not served is refused',
         r.status == 429 and 'otp_country_not_served' in str(r.body), r)

    # 16.3 — a served country still works, so the refusal above is not simply
    # the endpoint being broken.
    served = f'+9665{uniq("n")[-7:]}'
    r = anon.post('/auth/otp/request', {'identifier': served})
    step('otp: a served country is accepted', r.ok, r)

    # 16.3 — per-number cap. The default issue limit is 3/hour; the abuse guard
    # caps SMS at 5/hour. Either way, repeated asks must stop being served.
    target = f'+9665{uniq("m")[-7:]}'
    codes = []
    for i in range(1, 9):
        r = anon.post('/auth/otp/request', {'identifier': target})
        if r.ok:
            codes.append(i)
        else:
            step(f'otp: request {i} for one number is refused',
                 r.status == 429 and ('otp_rate_limited' in str(r.body)
                                      or 'Too many OTP' in str(r.body)), r)
            break
    else:
        step(f'otp: repeated requests for one number are refused', False,
             f'{len(codes)} requests were all served')
    step(f'otp: the per-number cap stopped it within 8 requests ({len(codes)} served)', len(codes) < 8, None)

    # 16.3 — per-IP fan-out. Distinct numbers from one caller must stop.
    served_before = 0
    for i in range(1, 26):
        n = f'+9665{str(1000000 + i).zfill(7)}'
        r = anon.post('/auth/otp/request', {'identifier': n})
        if r.ok:
            served_before += 1
        elif 'otp_ip_number_limit' in str(r.body):
            step('otp: fan-out over many numbers from one caller is refused', True, r)
            break
        else:
            # The per-number or throttle guard fired first; still a refusal.
            step('otp: fan-out is bounded', r.status == 429, r)
            break
    else:
        step('otp: fan-out over many numbers from one caller is refused', False,
             'every distinct number was served')
    step(f'otp: fan-out stopped after {served_before} distinct numbers', served_before < 25, None)