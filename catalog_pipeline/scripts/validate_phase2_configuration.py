#!/usr/bin/env python3
"""Validate phase-2 taxonomy, locale, and sensitive-content configuration."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LOCALES = ROOT / "config/locales.json"
TAXONOMY = ROOT / "config/taxonomy_v1_candidate.json"
SENSITIVE = ROOT / "config/sensitive_content_policy.json"

EXPECTED_LOCALES = {"ar-SA", "en", "ur", "hi", "bn", "fil"}
CURRENT_MAIN_CATEGORIES = {
    "أدوية ومكملات",
    "العناية بالبشرة",
    "المكياج والتجميل",
    "تجميل وعناية",
    "العناية بالشعر",
    "العناية الشخصية",
    "الأم والطفل",
    "العروض",
    "الأجهزة الطبية",
}
REQUIRED_SENSITIVE = {
    "active_ingredient",
    "indications",
    "dosage",
    "warnings",
    "pregnancy_lactation",
    "pediatric_use",
}


def load(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> None:
    errors: list[str] = []
    locales = load(LOCALES)
    taxonomy = load(TAXONOMY)
    sensitive = load(SENSITIVE)

    locale_rows = locales["locales"]
    locale_ids = [row["locale_id"] for row in locale_rows]
    if set(locale_ids) != EXPECTED_LOCALES or len(locale_ids) != len(EXPECTED_LOCALES):
        errors.append("Locale registry does not contain the required six unique locales")
    for row in locale_rows:
        if row["direction"] not in {"rtl", "ltr"}:
            errors.append(f"Invalid text direction for {row['locale_id']}")
        if row["publication_state"] not in {"enabled", "partial", "disabled"}:
            errors.append(f"Invalid publication state for {row['locale_id']}")

    categories = taxonomy["categories"]
    category_ids = [category["id"] for category in categories]
    if len(categories) != 10:
        errors.append(f"Taxonomy must have exactly 10 main categories, found {len(categories)}")
    if len(set(category_ids)) != len(category_ids):
        errors.append("Taxonomy category ids are not unique")
    if "oral-dental-care" not in category_ids:
        errors.append("Taxonomy is missing the approved tenth oral-dental-care category")
    valid_kinds = {kind["id"] for kind in taxonomy["product_kinds"]}
    if valid_kinds != {"medicine", "non_medicine", "unknown", "service"}:
        errors.append("product_kind contract is incomplete")
    for category in categories:
        if not set(category["allowed_product_kinds"]).issubset(valid_kinds):
            errors.append(f"Unknown product kind in {category['id']}")
        labels = category.get("labels", {})
        if not labels.get("ar-SA") or not labels.get("en"):
            errors.append(f"Missing Arabic or English label in {category['id']}")

    legacy_rules = taxonomy["legacy_category_treatment"]
    missing_legacy = CURRENT_MAIN_CATEGORIES - set(legacy_rules)
    if missing_legacy:
        errors.append(f"Missing legacy treatment for: {sorted(missing_legacy)}")
    if legacy_rules.get("العروض") != "reject_from_taxonomy":
        errors.append("Offers must be rejected from taxonomy")

    sensitive_fields = set(sensitive["sensitive_fields"])
    if not REQUIRED_SENSITIVE.issubset(sensitive_fields):
        errors.append("Sensitive content policy is missing required clinical fields")
    if not sensitive["publication_rules"].get("raw_dataset_only_is_not_verified"):
        errors.append("Raw data must not be treated as verified medical evidence")
    if not sensitive["publication_rules"].get("market_reference_cannot_verify_medical_claim"):
        errors.append("Market references must not verify medical claims")

    report = {
        "locale_count": len(locale_ids),
        "enabled_locales": [row["locale_id"] for row in locale_rows if row["publication_state"] == "enabled"],
        "partial_locales": [row["locale_id"] for row in locale_rows if row["publication_state"] == "partial"],
        "taxonomy_category_count": len(categories),
        "errors": errors,
        "passed": not errors,
    }
    print(json.dumps(report, ensure_ascii=False, indent=2))
    if errors:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
