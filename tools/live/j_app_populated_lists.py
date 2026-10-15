"""Journey (issue 424): the patient app's lists drawn with real rows, not only their empty state.

A new patient (app signup) books and pays a clinic consultation (j_consultation.book_paid, the BookingConfirmForm calls),
adds a medication reminder (the "Add reminder" sheet of src/components/health/MedicationsView) and logs a mood
(src/components/care/MentalHealthViews MoodJournalView). The booking itself makes the server write the patient's
notifications (workflow events service.requested / service.confirmed). Nothing is written to the database directly.

Then every list is read exactly as its screen reads it, and the row must carry each field the screen draws:
  /notifications                  GET /notifications?lang=<lang>        title, body, createdAt, read, type
  /health/medications?tab=reminders GET /health/reminders               medicine_name_ar, dose, dosage_count, frequency,
                                                                         instructions_ar, today_doses[].time_key/status
  /mental-health/mood-journal     GET /mental-health/mood?days=30       mood, logged_at, notes, tags
  /consultations/appointments     GET /care/appointments                doctor_name, specialty_name_ar, slot_start,
                                                                         service_type, status, price
  / (Home)                        GET /health/reminders, /mental-health/mood?days=1, /home/upcoming-appointment
Stack: backend :8002 (smtp_sink for the signup OTP, fake_moyasar for the card).
"""
import time

from lib import Client, journey, step

# MedicationsView ReminderSheet payload (the fields the sheet sends for a new, non-chronic reminder)
REMINDER = {'medicine_name_ar': 'باراسيتامول 500 ملغ', 'dose': '500mg', 'dosage_count': 1, 'times': ['08:00', '20:00'],
            'time_zone': 'Asia/Riyadh', 'frequency': 'daily', 'duration_days': 5, 'chronic': False,
            'instructions_ar': 'بعد الأكل'}
# MoodJournalView payload (buildMoodJournalPayload: only what the patient chose)
MOOD = {'mood': 'good', 'energy_level': 4, 'stress_level': 2, 'sleep_hours': 7, 'notes': 'يوم هادئ', 'tags': ['calm']}
# the notification types the app maps to an icon and a filter group (src/utils/notificationsFeed TYPE_META)
APP_TYPES = {'appointment', 'prescription', 'medication', 'emergency', 'labs', 'promo', 'order', 'alert', 'info'}


def rows(r):
    return r.body if isinstance(r.body, list) else r.items()


def filled(row, keys):
    """The keys of `row` that are missing or empty (the screen would draw nothing for them)."""
    return [k for k in keys if row.get(k) in (None, '', [], {})]


def create_data(pat, doc):
    import j_consultation
    aid = j_consultation.book_paid(pat, doc)

    journey('populated lists: the patient adds a reminder and logs a mood (the app\'s own calls)')
    r = pat.post('/health/reminders', REMINDER)
    rid = r.get('id')
    step('the "Add reminder" sheet saves a reminder (POST /health/reminders)', r.ok and rid, r)
    r = pat.post('/mental-health/mood', MOOD)
    step('the mood journal saves an entry (POST /mental-health/mood)', r.ok and r.get('mood') == 'good', r)
    return aid, rid


def check_notifications(pat, aid):
    journey('populated lists: /notifications draws the booking\'s notifications')
    hit, r = [], None
    for _ in range(20):  # the workflow events write the rows just after the booking answers
        r = pat.get('/notifications?lang=en')
        hit = [n for n in rows(r) if aid and aid in str((n.get('action') or {}).get('route', ''))]
        if hit:
            break
        time.sleep(0.5)
    step('GET /notifications?lang=en lists a notification about the booking', r.ok and hit, r)
    for n in hit:
        miss = filled(n, ['id', 'title', 'body', 'createdAt', 'type'])
        step(f"notification {n.get('type')}: title, body, time and type are there", not miss, f'missing {miss}: {n}')
        step(f"notification {n.get('type')}: the text is resolved (not an i18n key)", not str(n.get('title', '')).startswith('notif.') and not str(n.get('body', '')).startswith('notif.'), n)
        step(f"notification {n.get('type')}: the type is one the app draws", n.get('type') in APP_TYPES, n.get('type'))
        step(f"notification {n.get('type')}: read is a boolean (the unread dot)", isinstance(n.get('read'), bool), n.get('read'))
    r = pat.get('/notifications?lang=ar')
    ar = [n for n in rows(r) if aid and aid in str((n.get('action') or {}).get('route', ''))]
    step('the Arabic feed carries the same rows with their own text', r.ok and len(ar) >= len(hit) and all(n.get('title') for n in ar), r)


def check_reminders(pat, rid):
    journey('populated lists: Medications "All reminders" and the Home reminder card draw the reminder')
    r = pat.get('/health/reminders')
    row = next((x for x in rows(r) if x.get('id') == rid), None)
    step('GET /health/reminders lists the new reminder', r.ok and row, r)
    if not row:
        return
    miss = filled(row, ['medicine_name_ar', 'dose', 'dosage_count', 'frequency', 'instructions_ar', 'times', 'today_doses'])
    step('the reminder row has name, dose, units, frequency, instructions, times and today\'s doses', not miss, f'missing {miss}: {row}')
    doses = row.get('today_doses') or []
    step('today\'s doses are the two times, pending (the Take / Skip buttons)',
         [d.get('time_key') for d in doses] == ['08:00', '20:00'] and all(d.get('status') == 'pending' for d in doses), doses)
    step('the reminder is active (Home counts it)', row.get('active') is True, row.get('active'))


def check_mood(pat):
    journey('populated lists: the mood journal history and the Home mood record draw the entry')
    r = pat.get('/mental-health/mood?days=30')
    row = next((x for x in rows(r) if x.get('notes') == MOOD['notes']), None)
    step('GET /mental-health/mood?days=30 lists the entry', r.ok and row, r)
    if row:
        miss = filled(row, ['mood', 'logged_at', 'notes', 'tags'])
        step('the mood row has mood, date, note and tags', not miss and row.get('mood') == 'good' and row.get('tags') == ['calm'], f'missing {miss}: {row}')
    r = pat.get('/mental-health/mood?days=1')
    step('GET /mental-health/mood?days=1 (Home) has today\'s entry', r.ok and any(x.get('notes') == MOOD['notes'] and x.get('logged_at') for x in rows(r)), r)


def check_appointments(pat, aid):
    journey('populated lists: My appointments and the Home "next appointment" draw the booking')
    r = pat.get('/care/appointments')
    row = next((x for x in rows(r) if x.get('id') == aid), None)
    step('GET /care/appointments lists the booking', r.ok and row, r)
    if row:
        miss = filled(row, ['doctor_name', 'slot_start', 'service_type', 'status', 'price'])
        step('the row has doctor, start, visit type, status and price', not miss and float(row.get('price') or 0) > 0, f'missing {miss}: {row}')
        step('the row has the specialty name the card draws', bool(row.get('specialty_name_ar') or row.get('specialty_ar')), row)
        step('the paid clinic booking is on the Upcoming tab (confirmed or pending)',
             str(row.get('status')).lower() in ('confirmed', 'pending'), row.get('status'))
    r = pat.get('/home/upcoming-appointment')
    body = r.body if isinstance(r.body, dict) else {}
    step('GET /home/upcoming-appointment is this booking', r.ok and body.get('id') == aid, r)
    miss = filled(body, ['date', 'doctorName', 'type', 'time'])
    step('the Home card has date, doctor, visit type and time', not miss, f'missing {miss}: {body}')


def main():
    import j_accounts
    import j_concurrency
    acct = j_accounts.app_signup(label='populated-lists')
    pat = Client(acct['token'], 'patient')
    j_concurrency.ensure_doctor()
    doc = j_concurrency.DOCTOR_CLIENT
    if doc is None:
        step('a doctor with open clinic hours', False, 'DOCTOR_ID was given without a doctor session; unset it for this journey')
        return
    aid, rid = create_data(pat, doc)
    step('the booking was created and paid', bool(aid), aid)
    if aid:
        check_notifications(pat, aid)
        check_appointments(pat, aid)
    if rid:
        check_reminders(pat, rid)
    check_mood(pat)


if __name__ == '__main__':
    from lib import summary
    main()
    summary()
