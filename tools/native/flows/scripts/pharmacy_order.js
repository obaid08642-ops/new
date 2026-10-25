// A new patient sends a pharmacy order (the patient side of the journey, by the API); the provider flow answers it in the provider app.
var o = json(http.get(HELPER + '/pharmacy/order').body);
if (!o.ok) { throw new Error('could not send the order: ' + JSON.stringify(o)); }
output.orderId = o.order_id; output.patientToken = o.token;
