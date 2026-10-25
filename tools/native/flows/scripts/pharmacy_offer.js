// The seeded pharmacy answers the patient's new broadcast with an offer for every item (the provider side of the journey, by the API).
var o = json(http.get(HELPER + '/pharmacy/offer').body);
if (!o.ok) { throw new Error('pharmacy could not offer: ' + JSON.stringify(o)); }
output.orderId = o.order_id;
