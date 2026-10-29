// A new patient whose pharmacy order is already DELIVERED and not yet rated (all by the API, helper.py /pharmacy/delivered).
var o = json(http.get(HELPER + '/pharmacy/delivered').body);
if (!o.ok) { throw new Error('could not deliver an order: ' + JSON.stringify(o)); }
output.orderId = o.order_id; output.email = o.email; output.password = o.password;
