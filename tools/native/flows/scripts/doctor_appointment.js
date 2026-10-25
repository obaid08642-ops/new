// A new patient books the seeded doctor (the patient side, by the API); the provider flow finds the appointment in the doctor app.
var o = json(http.get(HELPER + '/doctor/appointment').body);
if (!o.ok) { throw new Error('could not book: ' + JSON.stringify(o)); }
output.appointmentId = o.appointment_id; output.patientToken = o.token;
