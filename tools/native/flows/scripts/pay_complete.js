// The patient finishes the hosted checkout of the Moyasar test double: STATUS paid (default) or failed.
var o = json(http.get(HELPER + '/pay/complete?status=' + (typeof STATUS === 'undefined' ? 'paid' : STATUS)).body);
if (!o.ok) { throw new Error('no checkout to complete: ' + JSON.stringify(o)); }
