// The patient's view of a booking after the provider acted on it: its state must not be the one it was created in (STATE_WAS).
var o = json(http.get(HELPER + '/api?path=' + encodeURIComponent(PATH) + '&token=' + encodeURIComponent(TOKEN)).body);
var b = o.body && (o.body.data || o.body);
var state = b && (b.state || b.status);
if (!o.ok || !state) { throw new Error('cannot read the booking: ' + JSON.stringify(o).slice(0, 300)); }
if (String(state) === STATE_WAS) { throw new Error('the booking is still ' + state); }
output.state = state;
