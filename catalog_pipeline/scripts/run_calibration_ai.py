#!/usr/bin/env python3
"""Run a two-model AR/EN calibration without changing production governance.

Stage 1 uses gpt-5-mini for evidence-bound structured extraction. Stage 2 uses
gpt-5 to review that extraction independently with strict structured output. Outputs are training
and calibration evidence only; no record in the canonical catalog is modified.
"""
from __future__ import annotations

import argparse
import concurrent.futures as futures
import json
import time
import traceback
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from openai import OpenAI

ROOT = Path(__file__).resolve().parents[1]
SAMPLE_DEFAULT = ROOT / "data/internal/calibration_sample_ar_en.jsonl"
EXTRACTIONS_DEFAULT = ROOT / "data/internal/calibration_extractions.jsonl"
REVIEWS_DEFAULT = ROOT / "data/internal/calibration_reviews.jsonl"
REPORT_DEFAULT = ROOT / "data/internal/calibration_ai_report.json"

EXTRACTION_SCHEMA = {
    "name": "catalog_calibration_extraction",
    "strict": True,
    "schema": {
        "type": "object",
        "additionalProperties": False,
        "required": ["record_id", "product_kind_candidate", "primary_category_candidate", "identity", "field_decisions", "content_issues", "overall_status"],
        "properties": {
            "record_id": {"type": "string"},
            "product_kind_candidate": {"enum": ["medicine", "non_medicine", "unknown"]},
            "primary_category_candidate": {"enum": ["medicines", "vitamins-supplements", "skin-care", "hair-care", "makeup-cosmetics", "bath-body-fragrance", "personal-care-hygiene", "mother-baby", "medical-devices", "oral-dental-care", "unresolved"]},
            "identity": {
                "type": "object",
                "additionalProperties": False,
                "required": ["brand_candidate", "manufacturer_candidate", "confidence"],
                "properties": {
                    "brand_candidate": {"type": "string"},
                    "manufacturer_candidate": {"type": "string"},
                    "confidence": {"enum": ["low", "medium", "high"]}
                }
            },
            "field_decisions": {
                "type": "array",
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "required": ["field", "decision", "candidate_value", "source_language", "evidence", "requires_external_verification"],
                    "properties": {
                        "field": {"enum": ["active_ingredient", "generic_name", "indications", "dosage", "warnings", "storage_conditions", "description"]},
                        "decision": {"enum": ["fill_empty", "merge", "duplicate", "conflict", "retain_in_description", "no_decision"]},
                        "candidate_value": {"type": "string"},
                        "source_language": {"enum": ["ar", "en", "both", "none"]},
                        "evidence": {"type": "string"},
                        "requires_external_verification": {"type": "boolean"}
                    }
                }
            },
            "content_issues": {
                "type": "array",
                "items": {"enum": ["description_more_info_duplicate", "warnings_precautions_duplicate", "brand_manufacturer_ambiguous", "legacy_category_invalid", "medical_claim_present", "language_mismatch", "no_issue_detected"]},

            },
            "overall_status": {"enum": ["needs_review", "needs_external_verification", "blocked_by_conflict"]}
        }
    }
}

REVIEW_SCHEMA = {
    "name": "catalog_calibration_review",
    "strict": True,
    "schema": {
        "type": "object",
        "additionalProperties": False,
        "required": ["record_id", "review_status", "supported_decision_indexes", "issues", "must_not_publish_fields"],
        "properties": {
            "record_id": {"type": "string"},
            "review_status": {"enum": ["pass_for_calibration", "needs_revision", "needs_external_verification", "blocked_by_conflict"]},
            "supported_decision_indexes": {"type": "array", "items": {"type": "integer", "minimum": 0}},
            "issues": {
                "type": "array",
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "required": ["code", "detail"],
                    "properties": {
                        "code": {"enum": ["unsupported_candidate", "evidence_missing", "ar_en_conflict", "medical_field_requires_authoritative_source", "category_not_supported", "brand_manufacturer_confusion", "duplicate_not_detected", "other"]},
                        "detail": {"type": "string"}
                    }
                }
            },
            "must_not_publish_fields": {"type": "array", "items": {"enum": ["active_ingredient", "generic_name", "indications", "dosage", "warnings", "storage_conditions", "description", "brand", "manufacturer", "category"]}}
        }
    }
}

EXTRACTION_SYSTEM = """You are a conservative bilingual catalog extractor. Use only the supplied Arabic and English raw record. Do not infer missing facts, do not diagnose, do not produce medical advice, and do not mark anything ready to publish. For each candidate decision, quote concise source evidence exactly enough to permit review. Medical fields (ingredient, indication, dosage, warnings) must require external verification whenever they are present or changed. A raw shop record is not authoritative evidence. If Arabic and English disagree, produce conflict or no_decision. For a missing string candidate, return an empty string, never null."""
REVIEW_SYSTEM = """You are an independent, conservative reviewer of a bilingual catalog extraction. Compare the proposed decision JSON against the supplied Arabic and English raw record. Accept only decisions directly supported by the text. Treat dosage, indication, active ingredients, warnings, pregnancy, pediatric content and interactions as requiring authoritative external verification. Never approve publication, never invent a missing fact, and flag uncertainty rather than resolving it."""


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def compact_raw(raw: dict[str, Any], max_field_chars: int = 2500) -> dict[str, Any]:
    compact: dict[str, Any] = {}
    for key, value in raw.items():
        if isinstance(value, str) and len(value) > max_field_chars:
            compact[key] = value[:max_field_chars] + "\n[TRUNCATED_FOR_CALIBRATION]"
        else:
            compact[key] = value
    return compact


def call_extraction(client: OpenAI, sample: dict[str, Any]) -> dict[str, Any]:
    raw = compact_raw(sample["raw"])
    record_id = str(raw.get("id") or "")
    prompt = {
        "task": "Calibrate field extraction for this one record. Return JSON only.",
        "sampling_reason": sample["sampling_reason"],
        "record": raw,
        "constraints": {
            "record_id_must_equal": record_id,
            "taxonomy_choices": ["medicines", "vitamins-supplements", "skin-care", "hair-care", "makeup-cosmetics", "bath-body-fragrance", "personal-care-hygiene", "mother-baby", "medical-devices", "oral-dental-care", "unresolved"],
            "not_publication_approval": True
        }
    }
    response = client.chat.completions.create(
        model="gpt-5-mini",
        messages=[{"role": "system", "content": EXTRACTION_SYSTEM}, {"role": "user", "content": json.dumps(prompt, ensure_ascii=False)}],
        response_format={"type": "json_schema", "json_schema": EXTRACTION_SCHEMA},
        max_completion_tokens=2200,
    )
    if not response.choices:
        raise ValueError(f"Extractor returned no choices: {response.model_dump_json()}")
    content = response.choices[0].message.content
    if not isinstance(content, str) or content.strip() in {"", "null"}:
        raise ValueError(f"Extractor returned no structured content; finish_reason={response.choices[0].finish_reason}; content={content!r}")
    output = json.loads(content)
    if not isinstance(output, dict):
        raise ValueError(f"Extractor returned non-object JSON: {output!r}")
    if output["record_id"] != record_id:
        raise ValueError(f"Extractor returned mismatched record id: {output['record_id']} != {record_id}")
    return output


def call_review(client: OpenAI, sample: dict[str, Any], extraction: dict[str, Any]) -> dict[str, Any]:
    raw = compact_raw(sample["raw"])
    record_id = str(raw.get("id") or "")
    prompt = {
        "task": "Review this proposed extraction against raw bilingual text. Return JSON only.",
        "sampling_reason": sample["sampling_reason"],
        "record": raw,
        "proposed_extraction": extraction,
        "constraints": {"record_id_must_equal": record_id, "not_publication_approval": True}
    }
    response = client.chat.completions.create(
        model="gpt-5",
        messages=[{"role": "system", "content": REVIEW_SYSTEM}, {"role": "user", "content": json.dumps(prompt, ensure_ascii=False)}],
        response_format={"type": "json_schema", "json_schema": REVIEW_SCHEMA},
        max_completion_tokens=2200,
        extra_body={"reasoning": {"effort": "low"}},
    )
    if not response.choices:
        raise ValueError(f"Reviewer returned no choices: {response.model_dump_json()}")
    content = response.choices[0].message.content
    if not isinstance(content, str) or content.strip() in {"", "null"}:
        raise ValueError(f"Reviewer returned no structured content; finish_reason={response.choices[0].finish_reason}; content={content!r}")
    try:
        output = json.loads(content)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Reviewer returned invalid JSON: {content[:1200]!r}") from exc
    if not isinstance(output, dict):
        raise ValueError(f"Reviewer returned non-object JSON: {output!r}")
    if output["record_id"] != record_id:
        raise ValueError(f"Reviewer returned mismatched record id: {output['record_id']} != {record_id}")
    return output


def run_one(sample: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any]]:
    client = OpenAI(timeout=120.0, max_retries=1)
    extraction = call_extraction(client, sample)
    review = call_review(client, sample, extraction)
    record_id = str(sample["raw"]["id"])
    extracted_row = {
        "record_id": record_id,
        "sampling_reason": sample["sampling_reason"],
        "stage": "extraction",
        "model": "gpt-5-mini",
        "prompt_version": "calibration-extraction@1",
        "created_at": now_iso(),
        "result": extraction,
    }
    review_row = {
        "record_id": record_id,
        "sampling_reason": sample["sampling_reason"],
        "stage": "independent_review",
        "model": "gpt-5",
        "prompt_version": "calibration-review@1",
        "created_at": now_iso(),
        "result": review,
    }
    return extracted_row, review_row


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sample", type=Path, default=SAMPLE_DEFAULT)
    parser.add_argument("--extractions", type=Path, default=EXTRACTIONS_DEFAULT)
    parser.add_argument("--reviews", type=Path, default=REVIEWS_DEFAULT)
    parser.add_argument("--report", type=Path, default=REPORT_DEFAULT)
    parser.add_argument("--max-workers", type=int, default=4)
    parser.add_argument("--limit", type=int, default=0, help="0 means all selected records")
    args = parser.parse_args()

    samples = [json.loads(line) for line in args.sample.read_text(encoding="utf-8").splitlines() if line.strip()]
    if args.limit:
        samples = samples[:args.limit]
    extraction_rows: list[dict[str, Any]] = []
    review_rows: list[dict[str, Any]] = []
    failures: list[dict[str, Any]] = []
    started_at = now_iso()
    with futures.ThreadPoolExecutor(max_workers=args.max_workers) as executor:
        pending = {executor.submit(run_one, sample): sample for sample in samples}
        for future in futures.as_completed(pending):
            sample = pending[future]
            record_id = str(sample["raw"].get("id") or "")
            try:
                extraction, review = future.result()
                extraction_rows.append(extraction)
                review_rows.append(review)
            except Exception as exc:  # Keep the calibration resumable and expose exact failures.
                failures.append({
                    "record_id": record_id,
                    "sampling_reason": sample["sampling_reason"],
                    "error": str(exc),
                    "traceback": traceback.format_exc(),
                })

    extraction_rows.sort(key=lambda row: row["record_id"])
    review_rows.sort(key=lambda row: row["record_id"])
    args.extractions.write_text("".join(json.dumps(row, ensure_ascii=False) + "\n" for row in extraction_rows), encoding="utf-8")
    args.reviews.write_text("".join(json.dumps(row, ensure_ascii=False) + "\n" for row in review_rows), encoding="utf-8")
    status_counts: dict[str, int] = {}
    for row in review_rows:
        status = row["result"]["review_status"]
        status_counts[status] = status_counts.get(status, 0) + 1
    report = {
        "started_at": started_at,
        "finished_at": now_iso(),
        "sample_requested": len(samples),
        "extractions_completed": len(extraction_rows),
        "reviews_completed": len(review_rows),
        "failures": failures,
        "review_status_counts": status_counts,
        "models": {"extraction": "gpt-5-mini", "independent_review": "gpt-5"},
        "publication_changes": 0,
    }
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
