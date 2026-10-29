// A new patient books the seeded provider (the patient side, by the API); the provider flow finds it in the provider app.
var o = json(http.get(HELPER + '/radiology/booking').body);
if (!o.ok) { throw new Error('could not book: ' + JSON.stringify(o)); }
output.bookingId = o.booking_id; output.patientToken = o.token;
