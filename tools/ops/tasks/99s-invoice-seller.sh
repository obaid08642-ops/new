#!/bin/bash
# Owner 2026-11-01: the invoice seller name is "منصة نبض الطبية". CR number, VAT number and address are not issued yet: left empty (the invoice says "not configured").
# Writes ONLY finance_config {key:'invoice'}.seller_name (upsert); never touches vat_number, cr_number, address. Prints the old and new value of seller_name only (public data).
# APPLY=yes writes; otherwise a dry run. ROLLBACK=yes puts back the value printed as "before" in the apply run (OLD_NAME).
set -u
APPLY=${APPLY:-yes}; ROLLBACK=${ROLLBACK:-no}; OLD_NAME=${OLD_NAME:-}
NAME='منصة نبض الطبية'
DK="sudo -n docker"
say() { echo "status: invoice-seller: $*"; }
q() { $DK exec nabdah-mongodb sh -c 'mongosh --quiet -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --eval "$1"' sh "$1" 2>/dev/null | tail -1 | tr -d '\r'; }
DB="db.getSiblingDB(process.env.DB_NAME||'nabd_nestjs')"
BEFORE=$(q "const d=$DB.finance_config.findOne({key:'invoice'}); print(d && d.seller_name ? d.seller_name : '(empty)')")
FIELDS=$(q "const d=$DB.finance_config.findOne({key:'invoice'}); print(d ? ['vat_number','cr_number','address'].map(k=>k+'='+(d[k]?'set':'empty')).join(' ') : 'no invoice config document')")
say "before: seller_name=$BEFORE; $FIELDS"
if [ "$ROLLBACK" = yes ]; then
  [ "$APPLY" = yes ] || { say "dry run: would set seller_name back to '${OLD_NAME:-(unset)}'"; exit 0; }
  if [ -n "$OLD_NAME" ]; then R=$(q "print($DB.finance_config.updateOne({key:'invoice'},{\$set:{seller_name:'$OLD_NAME'}}).modifiedCount)"); else R=$(q "print($DB.finance_config.updateOne({key:'invoice'},{\$unset:{seller_name:''}}).modifiedCount)"); fi
  say "rolled back (modified=$R)"; exit 0
fi
[ "$APPLY" = yes ] || { say "dry run: would set seller_name='$NAME'"; exit 0; }
R=$(q "const r=$DB.finance_config.updateOne({key:'invoice'},{\$set:{seller_name:'$NAME',updatedAt:new Date()},\$setOnInsert:{key:'invoice'}},{upsert:true}); print((r.modifiedCount||0)+'/'+(r.upsertedCount||0))")
AFTER=$(q "const d=$DB.finance_config.findOne({key:'invoice'}); print(d && d.seller_name ? d.seller_name : '(empty)')")
say "applied (modified/upserted=$R); after: seller_name=$AFTER"
[ "$AFTER" = "$NAME" ] && say "OK" || { say "FAILED: value not as expected"; exit 1; }
