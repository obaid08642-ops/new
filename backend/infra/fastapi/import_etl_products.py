#!/usr/bin/env python3
"""
NabdahPlus ETL Import Script
Reads 18 JSON files (6 langs x 3 parts) from NabdahPlus_ETL,
merges by index (Index-Aligned), and uploads to AWS MongoDB.
"""
import os
import json
import sys
from pymongo import MongoClient, ASCENDING
from pymongo.errors import BulkWriteError

# ─── CONFIGURATION ─────────────────────────────────────────
ETL_DIR   = "/Users/ahmedobaid/Desktop/NabdahPlus_ETL"
MONGO_URL = "mongodb://35.159.129.187:27017"
DB_NAME   = "nabdah_db"
COLL_NAME = "pharmacy_products"

LANGS = ["AR", "EN", "UR", "HI", "BN", "TL"]
PARTS = [1, 2, 3]

LANG_KEY = {
    "AR": "ar", "EN": "en",
    "UR": "ur", "HI": "hi",
    "BN": "bn", "TL": "tl",
}

# Fields same in all languages (taken from EN)
UNIVERSAL_FIELDS = [
    "productId", "barcode", "price", "old_price",
    "is_rx", "available_online", "has_exclusive_online_label",
    "drugs_com_link", "sfda_link",
    "image_1", "image_2", "image_3", "image_4", "image_5",
]

# Fields that are translated
TRANSLATED_FIELDS = [
    "name", "main_category", "sub_category", "sub_sub_category",
    "active_ingredient", "dosage_form", "strength", "size_volume",
    "indications_uses", "dosage_instructions", "side_effects",
    "warnings_precautions", "storage_conditions", "how_to_use",
    "package_content_details", "skin_hair_type", "color_shade",
    "brand_benefits", "country_of_origin", "more_information",
]

# ─── HELPERS ───────────────────────────────────────────────
def is_empty(v):
    if v is None: return True
    if isinstance(v, str) and v.strip().lower() in ("null","0","","none","nan"): return True
    if isinstance(v, bool): return False   # keep False values
    if isinstance(v, (int, float)) and v == 0: return True
    return False

def clean(obj):
    if isinstance(obj, dict):
        result = {}
        for k, v in obj.items():
            if isinstance(v, bool):
                result[k] = v
            elif not is_empty(v):
                cleaned = clean(v)
                if cleaned is not None:
                    result[k] = cleaned
        return result if result else None
    if isinstance(obj, list):
        items = [clean(i) for i in obj if not is_empty(i)]
        return [i for i in items if i is not None] or None
    return obj

def load_json(lang, part):
    path = os.path.join(ETL_DIR, f"Part_{part}_{lang}.json")
    if not os.path.exists(path):
        print(f"  ⚠️  Not found: {path}")
        return []
    print(f"  📂 Loading Part_{part}_{lang}.json ...", end=" ", flush=True)
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    print(f"{len(data)} records")
    return data

# ─── MAIN ──────────────────────────────────────────────────
def main():
    print("\n" + "="*60)
    print("  🚀 NabdahPlus ETL Import — Starting")
    print("="*60)

    # Connect
    print(f"\n  🔌 Connecting to MongoDB at {MONGO_URL} ...")
    try:
        client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=10000)
        client.admin.command("ping")
        print("  ✅ Connected!\n")
    except Exception as e:
        print(f"  ❌ Cannot connect: {e}")
        sys.exit(1)

    db  = client[DB_NAME]
    col = db[COLL_NAME]

    # Drop existing
    existing = col.count_documents({})
    if existing:
        print(f"  🗑️  Dropping {existing:,} existing documents ...")
        col.drop()
        col = db[COLL_NAME]

    # Indexes
    print("  📊 Creating indexes ...")
    col.create_index([("productId", ASCENDING)], unique=True)
    col.create_index([("barcode",   ASCENDING)])
    col.create_index([("translations.ar.name",             ASCENDING)])
    col.create_index([("translations.en.name",             ASCENDING)])
    col.create_index([("translations.ar.main_category",    ASCENDING)])
    col.create_index([("translations.en.main_category",    ASCENDING)])
    col.create_index([("translations.ar.active_ingredient",ASCENDING)])
    print("  ✅ Indexes created\n")

    total = 0
    BATCH = 500

    for part in PARTS:
        print(f"─── Part {part} ───────────────────────────────────────")

        # Load all langs for this part
        lang_data = {}
        for lang in LANGS:
            data = load_json(lang, part)
            if data:
                lang_data[lang] = data

        if "EN" not in lang_data:
            print(f"  ⚠️  No EN data for part {part}, skipping.\n")
            continue

        en_list = lang_data["EN"]
        batch   = []

        for idx, en_item in enumerate(en_list):
            pid = en_item.get("productId")
            if not pid:
                continue

            # Base document
            doc = {"productId": pid, "translations": {}}

            # Universal fields (from EN)
            for f in UNIVERSAL_FIELDS:
                v = en_item.get(f)
                if not is_empty(v):
                    doc[f] = v

            # Translations
            for lang, data in lang_data.items():
                if idx >= len(data):
                    continue
                item     = data[idx]
                lang_key = LANG_KEY[lang]
                t        = {}
                for f in TRANSLATED_FIELDS:
                    v = item.get(f)
                    if not is_empty(v):
                        t[f] = v
                if t:
                    doc["translations"][lang_key] = t

            cleaned = clean(doc)
            if cleaned and cleaned.get("productId"):
                batch.append(cleaned)

            if len(batch) >= BATCH:
                try:
                    col.insert_many(batch, ordered=False)
                    total += len(batch)
                    print(f"  ✅ {total:,} products imported so far ...")
                except BulkWriteError as e:
                    total += e.details.get("nInserted", 0)
                batch = []

        if batch:
            try:
                col.insert_many(batch, ordered=False)
                total += len(batch)
            except BulkWriteError as e:
                total += e.details.get("nInserted", 0)

        print(f"  ✅ Part {part} done. Running total: {total:,}\n")

    # Final verification
    final = col.count_documents({})
    print("="*60)
    print(f"  🎉 Import Complete!")
    print(f"  📦 Total inserted:  {total:,}")
    print(f"  ✅ DB verification: {final:,} documents in MongoDB")
    print(f"  🗄️  {DB_NAME} → {COLL_NAME}")
    print(f"  🌐 MongoDB URL:     {MONGO_URL}")
    print("="*60 + "\n")

    client.close()

if __name__ == "__main__":
    main()
