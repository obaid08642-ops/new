"""Setup of the patient_consultation_booking flow: every seeded doctor publishes tomorrow's clinic hours (the admin approves them).

  python3 tools/native/setup/patient_consultation_booking.py /tmp/native/accounts.json "<unused>"

The flow opens the first doctor of the consultations hub (hub-doctor-0), taps tomorrow and expects a bookable time. Run 105 showed that
doctor with the day buttons and "Choose a time to book" but no time: the live journeys publish hours for only the one doctor they register,
and the hub lists another first. Same calls as tools/live/j_consultation.py (POST /provider/schedule-slots, then the admin approves the
pending changes). Test backend only. Prints one JSON line {"BOOKING_DOCTORS": "<n>"}.
"""
import json, os, sys

LIVE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'live'))
sys.path.insert(0, LIVE)
os.chdir(LIVE)
import j_admin, j_consultation  # noqa: E402
from lib import Client  # noqa: E402


def main():
    accounts = json.load(open(sys.argv[1]))
    doctors = accounts.get('doctors') or []
    if not doctors:
        print('no seeded doctor in the accounts file', file=sys.stderr)
        sys.exit(1)
    admin, _ = j_admin.login()
    done = 0
    for doctor in doctors:
        r = Client().post('/provider/auth/login', {'email': doctor['email'], 'password': doctor['password']})
        token = r.get('access_token')
        if not r.ok or not token:
            print(f"doctor {doctor['email']} could not sign in: {r.status}", file=sys.stderr)
            continue
        j_consultation.doctor_publishes_hours(Client(token, 'doctor'), admin)
        done += 1
    if not done:
        print('no doctor could publish hours', file=sys.stderr)
        sys.exit(1)
    print(json.dumps({'BOOKING_DOCTORS': str(done)}))


main()
