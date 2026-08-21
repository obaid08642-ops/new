#!/usr/bin/env python3
"""Build cleaned_catalog_v1 from canonical records plus raw fields, without changing either source."""
from __future__ import annotations

import argparse
import gzip
import hashlib
import json
import re
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_INPUT = ROOT / "data/internal/canonical_records.jsonl.gz"
DEFAULT_RAW = ROOT / "data/raw/medicines_6lang_21013.json.gz"
DEFAULT_OUTPUT = ROOT / "data/derived/cleaned_catalog_v1.jsonl.gz"
DEFAULT_REPORT = ROOT / "data/derived/reports/cleaned_catalog_v1_report.json"
WS_RE = re.compile(r"[ \t\r\f\v]+")
BLANK_LINES_RE = re.compile(r"\n{3,}")
HTML_SPACE_RE = re.compile(r"[\u00a0\u2007\u202f]")


def clean_text(value: object) -> str:
    if not isinstance(value, str):
        return ""
    s = HTML_SPACE_RE.sub(" ", value.replace("\\r", "\r").replace("\\n", "\n"))
    s = "\n".join(WS_RE.sub(" ", line).strip() for line in s.splitlines())
    return BLANK_LINES_RE.sub("\n\n", s).strip()


def norm(value: object) -> str:
    return re.sub(r"\s+", " ", clean_text(value)).casefold().strip()


def clean_list(value: object) -> list[str]:
    values = value if isinstance(value, list) else []
    out, seen = [], set()
    for item in values:
        s = clean_text(item)
        if s and norm(s) not in seen:
            out.append(s)
            seen.add(norm(s))
    return out


def first_nonempty(*values: object) -> str | None:
    for value in values:
        s = clean_text(value)
        if s:
            return s
    return None


def raw_locale_fields(raw: dict, locale_id: str) -> dict:
    suffix = {"ar-SA": "ar", "en": "en"}.get(locale_id)
    if suffix:
        return {
            "description": raw.get(f"description_{suffix}"),
            "more_info": raw.get(f"more_info_{suffix}"),
            "indications": raw.get(f"indications_{suffix}"),
            "dosage": raw.get(f"dosage_{suffix}") or raw.get(f"usage_instructions_{suffix}"),
            "warnings": raw.get(f"warnings_{suffix}") or raw.get(f"precautions_{suffix}"),
            "storage_conditions": raw.get(f"storage_conditions_{suffix}"),
        }
    translations = raw.get("translations") if isinstance(raw.get("translations"), dict) else {}
    return translations.get({"ur": "ur", "hi": "hi", "bn": "bn", "fil": "fil"}.get(locale_id, ""), {}) or {}


def content_for_locale(canonical_locale: dict, raw_fields: dict, counters: Counter) -> tuple[dict, list[str]]:
    raw_desc = clean_text(raw_fields.get("description"))
    raw_more = clean_text(raw_fields.get("more_info"))
    desc = raw_desc or clean_text(canonical_locale.get("content", {}).get("description"))
    more = raw_more
    changes = []
    if desc and more and norm(desc) == norm(more):
        counters["duplicate_more_info_collapsed"] += 1
        changes.append("duplicate_more_info_collapsed")
        more = ""
    elif more:
        counters["more_info_retained_for_review"] += 1
        changes.append("more_info_retained_for_review")
    if not desc:
        desc = more or clean_text(canonical_locale.get("content", {}).get("description"))
    if not desc:
        counters["empty_description"] += 1
    content = {
        "description": desc or None,
        "indications": clean_list(raw_fields.get("indications")) or clean_list(canonical_locale.get("content", {}).get("indications")),
        "dosage": first_nonempty(raw_fields.get("dosage"), canonical_locale.get("content", {}).get("dosage")),
        "warnings": clean_list(raw_fields.get("warnings")) or clean_list(canonical_locale.get("content", {}).get("warnings")),
        "storage_conditions": first_nonempty(raw_fields.get("storage_conditions"), canonical_locale.get("content", {}).get("storage_conditions")),
    }
    return content, changes


def derive_kind(raw: dict, canonical: dict) -> tuple[str, str]:
    name = norm(raw.get("name_ar") or raw.get("name_en"))
    category = norm(raw.get("category"))
    if "استشارة" in name or "consultation" in name or "altibbi" in name:
        return "service", "consultation_service_signal"
    if category in {"العروض", "offers"}:
        return "unknown", "offer_layer_requires_product_reclassification"
    if any(clean_text(raw.get(key)) for key in ("active_ingredient", "generic_name", "form", "strength")) or "دواء" in category or "medicine" in category:
        return "medicine", "medicine_identity_signal"
    return canonical.get("product_kind", "unknown"), "insufficient_identity_evidence"


def clean_record(canonical: dict, raw: dict, now: str, counters: Counter) -> dict:
    out = json.loads(json.dumps(canonical, ensure_ascii=False))
    metadata = out.setdefault("cleaning_metadata", {})
    metadata.update({"cleaning_version": "cleaned-catalog@1", "cleaned_at": now, "raw_record_unchanged": True, "changes": [], "review_queue": []})
    for locale_id, locale in out.get("locales", {}).items():
        content, changes = content_for_locale(locale, raw_locale_fields(raw, locale_id), counters)
        locale["content"] = content
        locale["display_name"] = first_nonempty(locale.get("display_name"), raw.get("name_ar") if locale_id == "ar-SA" else raw.get("name_en") if locale_id == "en" else locale.get("display_name"))
        locale["official_name"] = first_nonempty(locale.get("official_name"), locale.get("display_name"))
        locale["search_aliases"] = clean_list(locale.get("search_aliases"))
        locale["slug"] = first_nonempty(locale.get("slug"))
        if changes:
            metadata["changes"].extend({"locale": locale_id, "code": code} for code in changes)
    kind, reason = derive_kind(raw, canonical)
    metadata["product_kind_candidate"] = kind
    metadata["product_kind_reason"] = reason
    if kind in {"unknown", "service"}:
        metadata["review_queue"].append("product_kind_review")
    if norm(raw.get("category")) in {"العروض", "offers"}:
        metadata["review_queue"].append("promotion_layer_reclassification")
    if out.get("governance"):
        out["governance"].update({"public_eligibility": False, "indexing_eligibility": False, "approval_state": "needs_review", "medical_claims_status": "requires_verification"})
    counters["records"] += 1
    counters["review_queue_records"] += bool(metadata["review_queue"])
    return out


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT)
    parser.add_argument("--raw-input", type=Path, default=DEFAULT_RAW)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--report", type=Path, default=DEFAULT_REPORT)
    args = parser.parse_args()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.report.parent.mkdir(parents=True, exist_ok=True)
    with gzip.open(args.raw_input, "rt", encoding="utf-8") as f:
        raw_rows = json.load(f).get("medicines", [])
    raw_map = {str(row.get("id")): row for row in raw_rows if isinstance(row, dict)}
    counters = Counter()
    now = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    with gzip.open(args.input, "rt", encoding="utf-8") as src, gzip.open(args.output, "wt", encoding="utf-8", compresslevel=9) as dst:
        for line in src:
            if not line.strip():
                continue
            canonical = json.loads(line)
            raw = raw_map.get(str(canonical.get("id")), {})
            if not raw:
                counters["raw_record_missing"] += 1
            dst.write(json.dumps(clean_record(canonical, raw, now, counters), ensure_ascii=False, separators=(",", ":")) + "\n")
    report = {"cleaning_version": "cleaned-catalog@1", "input": str(args.input), "raw_input": str(args.raw_input), "output": str(args.output), "input_sha256": hashlib.sha256(args.input.read_bytes()).hexdigest(), "output_sha256": hashlib.sha256(args.output.read_bytes()).hexdigest(), "metrics": dict(counters), "publication_flags_forced_closed": True, "source_modified": False}
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
