// New unused sign-up data from the helper (nothing is created on the backend).
var o = json(http.get(HELPER + '/fresh').body);
output.email = o.email; output.phone = o.phone; output.password = o.password; output.name = o.name;
