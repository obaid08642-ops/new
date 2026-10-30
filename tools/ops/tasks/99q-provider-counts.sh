#!/bin/bash
# Why labs, radiology and nursing show no providers (owner, 2026-10-30: "nursing says no services available"), READ-ONLY.
# The public API answers providers_count=0 for every lab test (120), scan (23) and nursing service (36). This counts provider profiles by
# type x status x medical_review_status x public_eligibility, the per-service offers by vertical, and the accounts behind the profiles.
# Counts and type names only: no id, name, email or phone. Public lines start with "status:".
set -u
DK="sudo -n docker"
say() { echo "status: provider-counts: $*"; }
$DK exec nabdah-mongodb sh -c 'mongosh --quiet -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --eval "
const d = db.getSiblingDB(\"nabd_nestjs\");
d.provider_profiles.aggregate([{\$group:{_id:{t:\"\$type\",s:\"\$status\",m:\"\$medical_review_status\",p:\"\$public_eligibility\",a:{\$cond:[{\$ifNull:[\"\$account_id\",false]},\"acct\",\"no_acct\"]}},n:{\$sum:1}}},{\$sort:{\"_id.t\":1}}]).forEach(r=>print(\"profiles type=\"+r._id.t+\" status=\"+r._id.s+\" review=\"+r._id.m+\" public=\"+r._id.p+\" \"+r._id.a+\" n=\"+r.n));
print(\"profiles total=\"+d.provider_profiles.countDocuments({}));
if (d.getCollectionNames().includes(\"provider_service_offers\")) d.provider_service_offers.aggregate([{\$group:{_id:{v:\"\$vertical\",o:\"\$offered\"},n:{\$sum:1}}}]).forEach(r=>print(\"offers vertical=\"+r._id.v+\" offered=\"+r._id.o+\" n=\"+r.n));
for (const c of [\"provider_capabilities_lab\",\"provider_capabilities_radiology\"]) if (d.getCollectionNames().includes(c)) print(c+\" n=\"+d[c].countDocuments({}));
print(\"provider accounts: \"+JSON.stringify(d.users.aggregate([{\$match:{role:{\$in:[\"provider\",\"doctor\",\"nurse\",\"lab\",\"radiology\",\"pharmacy\"]}}},{\$group:{_id:\"\$role\",n:{\$sum:1}}}]).toArray().map(r=>r._id+\"=\"+r.n)));
"' 2>/dev/null | sed 's/^/status: provider-counts: /'
say "done"
exit 0
