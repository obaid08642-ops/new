// The patient's side of the journey: the new order has an offer (read by the API with the patient's token).
var o = json(http.get(HELPER + '/api?path=' + encodeURIComponent('/patient/pharmacy/orders/' + ORDER + '/offers') + '&token=' + encodeURIComponent(TOKEN)).body);
var rows = Array.isArray(o.body) ? o.body : (o.body && (o.body.items || o.body.data)) || [];
if (!o.ok || rows.length < 1) { throw new Error('the patient sees no offer for the order: ' + JSON.stringify(o).slice(0, 300)); }
output.offerCount = rows.length;
