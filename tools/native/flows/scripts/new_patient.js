// A patient created through the real API, for flows that change or delete the account.
var o = json(http.get(HELPER + '/patient/new').body);
output.email = o.email; output.phone = o.phone; output.password = o.password;
