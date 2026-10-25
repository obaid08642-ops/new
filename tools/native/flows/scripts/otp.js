// The newest 6-digit code mailed to TO (the test mail sink).
var o = json(http.get(HELPER + '/otp?to=' + encodeURIComponent(TO)).body);
if (!o.code) { throw new Error('no OTP mail for ' + TO); }
output.code = o.code;
