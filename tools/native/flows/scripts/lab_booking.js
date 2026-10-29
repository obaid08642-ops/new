// A new patient books a test at the seeded lab (the patient side, by the API); the provider flow finds it in the lab app.
var o = json(http.get(HELPER + '/lab/booking').body);
if (!o.ok) { throw new Error('could not book: ' + JSON.stringify(o)); }
output.bookingId = o.booking_id; output.patientToken = o.token;
