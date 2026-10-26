// The family member sees the appointment the account holder booked for them (the request carried for_member_id).
var o = json(http.get(HELPER + '/family/member-appointments').body);
if (!o.ok || !(o.count >= 1)) { throw new Error('the family member has no appointment: ' + JSON.stringify(o)); }
output.count = o.count;
