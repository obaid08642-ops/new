#!/usr/bin/env python3
"""Import the supplied raw catalog into safe canonical JSONL records.

This importer preserves the raw source separately and deliberately assigns no
publication approval. It is a deterministic staging step, not a medical-content
cleaner or publisher.
"""
from __future__ import annotations

import argparse
import gzip
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from jsonschema import Draft202012Validator, FormatChecker

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_INPUT = ROOT / "data/raw/medicines_6lang_21013.json.gz"
DEFAULT_OUTPUT = ROOT / "data/internal/canonical_records.jsonl.gz"
DEFAULT_REPORT = ROOT / "data/internal/import_report.json"
SCHEMA_PATH = ROOT / "schemas/canonical_record.schema.json"


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def snapshot_hash(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def clean_text(value: Any) -> str | None:
    if not isinstance(value, str):
        return None
    value = value.strip()
    return value or None


def clean_list(value: Any) -> list[str]:
    if isinstance(value, list):
        return [text for item in value if (text := clean_text(item))]
    if (text := clean_text(value)):
        return [text]
    return []


def excerpt(value: Any, limit: int = 500) -> str:
    if isinstance(value, list):
        value = "\n".join(item for item in value if isinstance(item, str))
    text = clean_text(value) or ""
    return text[:limit]


def make_evidence(field: str, locale_id: str, value: Any) -> dict[str, Any] | None:
    text = excerpt(value)
    if not text:
        return None
    return {
        "field": field,
        "locale_id": locale_id,
        "source_type": "raw_dataset",
        "source_url": None,
        "raw_excerpt": text,
        "confidence": "low",
    }


def image_ids(raw: dict[str, Any]) -> tuple[str | None, list[str]]:
    candidates = [raw.get("image")] + [raw.get(f"image_{index}") for index in range(1, 6)]
    values: list[str] = []
    for candidate in candidates:
        if (image := clean_text(candidate)) and image not in values:
            values.append(image)
    primary = clean_text(raw.get("image")) or (values[0] if values else None)
    return primary, values


def locale_content(
    display_name: Any,
    official_name: Any,
    aliases: list[Any],
    description: Any,
    indications: Any,
    dosage: Any,
    warnings: Any,
    storage_conditions: Any,
    status: str,
) -> dict[str, Any]:
    return {
        "display_name": clean_text(display_name),
        "official_name": clean_text(official_name),
        "search_aliases": [alias for item in aliases if (alias := clean_text(item))],
        "slug": None,
        "content": {
            "description": clean_text(description),
            "indications": clean_list(indications),
            "dosage": clean_text(dosage),
            "warnings": clean_list(warnings),
            "storage_conditions": clean_text(storage_conditions),
        },
        "translation_status": status,
    }


def translated_content(raw_translation: Any) -> dict[str, Any]:
    translation = raw_translation if isinstance(raw_translation, dict) else {}
    display_name = translation.get("name")
    has_content = bool(clean_text(display_name) or clean_text(translation.get("description")))
    return locale_content(
        display_name=display_name,
        official_name=display_name,
        aliases=[],
        description=translation.get("description") or translation.get("more_info"),
        indications=translation.get("indications"),
        dosage=translation.get("dosage") or translation.get("usage_instructions"),
        warnings=translation.get("warnings") or translation.get("precautions"),
        storage_conditions=translation.get("storage_conditions"),
        status="partial" if has_content else "not_started",
    )


def canonicalize(raw: dict[str, Any], raw_snapshot_hash: str, imported_at: str) -> dict[str, Any]:
    raw_bytes = json.dumps(raw, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
    primary_image_id, images = image_ids(raw)
    translations = raw.get("translations") if isinstance(raw.get("translations"), dict) else {}

    ar = locale_content(
        display_name=raw.get("name_ar"),
        official_name=raw.get("name_ar"),
        aliases=[raw.get("name_en")],
        description=raw.get("description_ar") or raw.get("more_info_ar"),
        indications=raw.get("indications_ar"),
        dosage=raw.get("dosage_ar") or raw.get("usage_instructions_ar"),
        warnings=raw.get("warnings_ar") or raw.get("precautions_ar"),
        storage_conditions=raw.get("storage_conditions_ar"),
        status="review_required",
    )
    en = locale_content(
        display_name=raw.get("name_en"),
        official_name=raw.get("name_en"),
        aliases=[raw.get("name_ar")],
        description=raw.get("description_en") or raw.get("more_info_en"),
        indications=raw.get("indications_en"),
        dosage=raw.get("dosage_en") or raw.get("usage_instructions_en"),
        warnings=raw.get("warnings_en") or raw.get("precautions_en"),
        storage_conditions=raw.get("storage_conditions_en"),
        status="review_required",
    )

    locales = {
        "ar-SA": ar,
        "en": en,
        "ur": translated_content(translations.get("ur")),
        "hi": translated_content(translations.get("hi")),
        "bn": translated_content(translations.get("bn")),
        "fil": translated_content(translations.get("fil")),
    }

    evidence_candidates = [
        ("display_name", "ar-SA", raw.get("name_ar")),
        ("display_name", "en", raw.get("name_en")),
        ("description", "ar-SA", raw.get("description_ar") or raw.get("more_info_ar")),
        ("description", "en", raw.get("description_en") or raw.get("more_info_en")),
        ("brand", "ar-SA", raw.get("brand")),
        ("manufacturer", "ar-SA", raw.get("manufacturer")),
        ("active_ingredient", "ar-SA", raw.get("active_ingredient")),
    ]
    evidence = [item for field, locale, value in evidence_candidates if (item := make_evidence(field, locale, value))]

    return {
        "schema_version": "canonical-record@1",
        "id": str(raw.get("id") or ""),
        "source": {
            "source_record_id": str(raw.get("id") or ""),
            "raw_record_hash": sha256_bytes(raw_bytes),
            "raw_snapshot_hash": raw_snapshot_hash,
            "imported_at": imported_at,
        },
        "product_kind": "unknown",
        "taxonomy": {
            "primary_taxonomy_id": None,
            "secondary_taxonomy_ids": [],
            "state": "unclassified",
        },
        "identifiers": {
            "sku": clean_text(raw.get("sku")),
            "barcode": clean_text(raw.get("barcode")),
        },
        "common": {
            "brand": clean_text(raw.get("brand")),
            "manufacturer": clean_text(raw.get("manufacturer")),
            "requires_prescription": raw.get("requires_prescription") if isinstance(raw.get("requires_prescription"), bool) else None,
            "form": clean_text(raw.get("form")),
            "strength": clean_text(raw.get("strength")),
            "package_size": clean_text(raw.get("package_size")) or clean_text(raw.get("package_content_details")),
        },
        "locales": locales,
        "assets": {
            "primary_image_id": primary_image_id,
            "image_ids": images,
        },
        "governance": {
            "public_eligibility": False,
            "approval_state": "draft",
            "indexing_eligibility": False,
            "medical_claims_status": "requires_verification",
        },
        "evidence": evidence,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--report", type=Path, default=DEFAULT_REPORT)
    args = parser.parse_args()

    raw_snapshot = snapshot_hash(args.input)
    imported_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
    validator = Draft202012Validator(schema, format_checker=FormatChecker())

    with gzip.open(args.input, "rt", encoding="utf-8") as source:
        payload = json.load(source)
    rows = payload.get("medicines")
    if not isinstance(rows, list):
        raise ValueError("Expected a top-level medicines list")

    args.output.parent.mkdir(parents=True, exist_ok=True)
    rejected_path = args.output.with_name("canonical_records.rejected.jsonl")
    accepted = 0
    rejected = 0
    locale_counts = {locale: 0 for locale in ("ar-SA", "en", "ur", "hi", "bn", "fil")}
    with gzip.open(args.output, "wt", encoding="utf-8", compresslevel=9) as target, rejected_path.open("w", encoding="utf-8") as rejected_file:
        for raw in rows:
            if not isinstance(raw, dict):
                rejected += 1
                rejected_file.write(json.dumps({"reason": "record_not_object", "raw": raw}, ensure_ascii=False) + "\n")
                continue
            record = canonicalize(raw, raw_snapshot, imported_at)
            errors = sorted(validator.iter_errors(record), key=lambda error: list(error.absolute_path))
            if errors:
                rejected += 1
                rejected_file.write(json.dumps({
                    "id": record.get("id"),
                    "reason": "schema_validation_failed",
                    "errors": [error.message for error in errors],
                }, ensure_ascii=False) + "\n")
                continue
            target.write(json.dumps(record, ensure_ascii=False, separators=(",", ":")) + "\n")
            accepted += 1
            for locale_id, locale in record["locales"].items():
                if locale["display_name"]:
                    locale_counts[locale_id] += 1

    report = {
        "input": str(args.input),
        "output": str(args.output),
        "raw_snapshot_hash": raw_snapshot,
        "imported_at": imported_at,
        "source_records": len(rows),
        "accepted_records": accepted,
        "rejected_records": rejected,
        "locale_display_name_counts": locale_counts,
        "publication_defaults": {
            "public_eligibility": False,
            "approval_state": "draft",
            "indexing_eligibility": False,
        },
    }
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
