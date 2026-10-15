#!/usr/bin/env python3
"""Rehearsal test data (throwaway CI database only): catalog collections shaped like production on 2026-10-15, when
2026-09-catalog-json-to-db failed with E11000 on labservices.id_1, plus a medicine catalogue of production size.
  labservices:       seed docs with the JSON's id and no short_code/test_code (the failing case); legacy docs with
                     short_code only (70, backfilled by the migration)
  radiologyservices: seed docs with the JSON's id and no short_code; others with short_code only
  nursing_catalog:   seed docs with the JSON's id
  medicines:         21,000 docs with image / images[] / image_1 fields
Usage: seed-prod-shape.py <release checkout> <out dir>  ->  <out>/<collection>.ndjson"""
import json, os, sys, uuid

src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
seed = lambda f: json.load(open(os.path.join(src, "backend/src/modules/catalogs/seed-data", f), encoding="utf-8"))


def write(name, docs):
    with open(os.path.join(out, name + ".ndjson"), "w", encoding="utf-8") as f:
        for d in docs:
            f.write(json.dumps(d, ensure_ascii=False) + "\n")
    print(f"{name}: {len(docs)}")


labs, seen, legacy = [], set(), 0
for x in seed("labs.json"):
    if x.get("id") and not x.get("short_code"):
        if x["id"] not in seen:
            seen.add(x["id"]); labs.append({"id": x["id"], "name_en": x.get("name_en"), "name_ar": x.get("name_ar"), "price": 100})
    elif x.get("short_code") and legacy < 70:
        legacy += 1; labs.append({"id": str(uuid.uuid4()), "short_code": x["short_code"], "name_en": x.get("name_en")})
write("labservices", labs)
rad, seen = [], set()
for x in seed("radiology.json"):
    if x.get("id") and x["id"] not in seen:
        seen.add(x["id"]); rad.append({"id": x["id"], "name_en": x.get("name_en")})
    elif x.get("short_code"):
        rad.append({"id": str(uuid.uuid4()), "short_code": x["short_code"], "name_en": x.get("name_en")})
write("radiologyservices", rad)
nur, seen = [], set()
for x in seed("nursing.json"):
    if x.get("id") and x["id"] not in seen:
        seen.add(x["id"]); nur.append({"id": x["id"], "name_en": x.get("name_en")})
write("nursing_catalog", nur)
meds = []
for i in range(21000):
    m = {"id": f"med-{i:05d}", "name_ar": f"دواء تجريبي {i}", "name_en": f"Test medicine {i}", "price": 10 + i % 500,
         "provenance": "rehearsal-test-data", "image": f"https://cdn.example.test/medicines/{i}.jpg"}
    if i % 3 == 0:
        m["images"] = [f"https://cdn.example.test/medicines/{i}a.jpg", f"https://cdn.example.test/medicines/{i}b.jpg"]
    if i % 7 == 0:
        m["image_1"] = f"https://cdn.example.test/medicines/{i}c.jpg"
    meds.append(m)
write("medicines", meds)
