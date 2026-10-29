// The medicines the seeded pharmacy stocks (created by the seed journeys): TAG is the unique suffix of the first one, to search for it.
var meds = json(http.get(HELPER + '/meds').body);
if (!meds.length) { throw new Error('no seeded medicines'); }
var parts = meds[0].name_ar.split(' ');
output.medTag = parts[parts.length - 1];
output.medName = meds[0].name_ar;
