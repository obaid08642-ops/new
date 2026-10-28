// A new patient is blocked by the seeded doctor (by the API); the provider flow finds the entry in the doctor app.
var o = json(http.get(HELPER + '/doctor/blacklist').body);
if (!o.ok) { throw new Error('could not block: ' + JSON.stringify(o)); }
output.patientId = o.patient_id; output.reason = o.reason;
