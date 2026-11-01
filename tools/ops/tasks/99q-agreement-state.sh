#!/bin/bash
# READ-ONLY (run 86: 99p refused because "a version 2.0 is already published"). What is the live provider_agreement row, and does it lock anyone out?
# Prints names, versions, flags, dates, counts and text hashes only; never a text.
set -u
DK="sudo -n docker"
q() { $DK exec nabdah-mongodb sh -c 'mongosh --quiet -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin --eval "$1"' sh "$1" 2>/dev/null; }
JS='const d=db.getSiblingDB(process.env.DB_NAME||"nabd_nestjs");
const h=(t)=>{if(!t)return "none";let x=0;for(const c of String(t))x=(x*31+c.charCodeAt(0))>>>0;return x.toString(16)+"/"+String(t).length};
for(const k of ["provider_agreement","provider_agreement_draft"]){const r=d.legal_policies.find({key:k}).toArray();print("rows key="+k+" n="+r.length);
 r.forEach(p=>print("  version="+p.version+" status="+(p.status||"-")+" requires_acceptance="+p.requires_acceptance+" effective="+(p.effective_date||p.effective_at||"-")+" updated="+(p.updatedAt||p.updated_at||"-")+" title_ar_len="+String(p.title_ar||"").length+" ar="+h(p.content_ar||p.text_ar||p.body_ar)+" en="+h(p.content_en||p.text_en||p.body_en)+" changelog="+((p.change_log||p.changelog||[]).length)))}
print("snapshots provider_agreement: "+d.legal_policy_snapshots.countDocuments({key:"provider_agreement"}));
print("acceptances provider_agreement by version: "+JSON.stringify(d.legal_acceptances.aggregate([{$match:{$or:[{key:"provider_agreement"},{policy_key:"provider_agreement"}]}},{$group:{_id:"$version",n:{$sum:1}}}]).toArray()));
print("provider accounts: total="+d.provider_accounts.countDocuments({})+" approved="+d.provider_accounts.countDocuments({status:{$in:["approved","active","APPROVED","ACTIVE"]}}));'
q "$JS" | sed 's/^/status: agreement-state: /'
